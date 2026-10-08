const Order = require('./order.model');
const Product = require('../products/product.model');
const User = require('../users/user.model');
const CashAccount = require('../finance/cashAccount.model');
const SettingsService = require('../settings/settings.service');
const EmailService = require('../../utils/email/emailService');
const { generateOrderNumber, generateUserId } = require('../../utils/helpers/orderNumber');
const { normalizePhone } = require('../../utils/helpers/phoneNormalizer');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');

class OrderService {
  /**
   * Server-controlled order creation with strict stock & price validation.
   * Supports both authenticated customers and guest checkouts.
   */
  static async createOrder(customerId, payload = {}) {
    const {
      items = [],
      deliveryMethod = 'home_delivery',
      metroPickup = null,
      shippingAddress = {},
      customerPhone = '',
      customerPhone2 = null,
      customerEmail = null,
      customerName = '',
      paymentMethod = 'cash_on_delivery',
      paymentScreenshot = null,
      paymentProofUrl = null,
      paymentSenderPhone = null,
      paymentReference = null,
      couponCode = null
    } = payload;

    let finalCustomerId = customerId;
    if (!finalCustomerId && customerPhone) {
      const normPhone = normalizePhone(customerPhone) || customerPhone;
      let user = await User.findOne({ phone: normPhone });
      if (!user) {
        const userId = generateUserId();
        user = await User.create({
          userId,
          name: customerName ? customerName.trim() : 'Valued Customer',
          phone: normPhone,
          email: customerEmail || undefined,
          role: 'customer'
        });
      } else if (customerEmail && !user.email) {
        user.email = customerEmail;
        await user.save();
      }
      finalCustomerId = user._id;
    }

    let calculatedSubtotal = 0;
    const validatedItems = [];

    // Server-side validation of stock and current price for every item
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.active) {
        throw new AppError(`Product not available for purchase.`, 400, ErrorCodes.PRODUCT_NOT_FOUND, 'OrderService.createOrder');
      }

      const variant = product.variants.find((v) => v.SKU.toUpperCase() === item.variantSKU.toUpperCase());
      if (!variant) {
        throw new AppError(`Variant SKU '${item.variantSKU}' not found on product '${product.name}'.`, 400, ErrorCodes.VARIANT_NOT_FOUND, 'OrderService.createOrder');
      }

      if (variant.stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for '${product.name}' (${variant.size}). Available: ${variant.stock}, Requested: ${item.quantity}`,
          400,
          ErrorCodes.INSUFFICIENT_STOCK,
          'OrderService.createOrder'
        );
      }

      const itemTotal = variant.price * item.quantity;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        product: product._id,
        variantSKU: variant.SKU,
        productName: product.name,
        size: variant.size,
        price: variant.price, // Server price strictly enforced
        quantity: item.quantity
      });
    }

    // Get settings for dynamic shipping, payment fees, and internal real costs
    const settings = await SettingsService.getSettings();
    const { shippingFee, metroPickupFee, realShippingCost } = this.calculateShippingFromSettings(
      settings,
      deliveryMethod,
      shippingAddress.governorate,
      calculatedSubtotal
    );

    let discount = 0;
    const totalShippingOrMetro = deliveryMethod === 'metro_pickup' ? metroPickupFee : shippingFee;

    // Calculate dynamic payment fee (e.g. 1% for Vodafone Cash / InstaPay)
    let paymentFee = 0;
    const normPaymentMethod = (paymentMethod || 'cod').toLowerCase();
    if (normPaymentMethod === 'vodafone_cash' && settings.payments?.vodafoneCash?.enabled) {
      const feePct = settings.payments.vodafoneCash.feePercent || 0;
      paymentFee = Math.round((calculatedSubtotal * feePct) / 100);
    } else if (normPaymentMethod === 'instapay' && settings.payments?.instaPay?.enabled) {
      const feePct = settings.payments.instaPay.feePercent || 0;
      paymentFee = Math.round((calculatedSubtotal * feePct) / 100);
    }

    const calculatedTotal = Math.max(0, calculatedSubtotal - discount + totalShippingOrMetro + paymentFee);
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer: finalCustomerId,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount,
      couponCode: couponCode || null,
      deliveryMethod,
      metroPickup: deliveryMethod === 'metro_pickup' ? metroPickup : null,
      metroPickupFee: deliveryMethod === 'metro_pickup' ? metroPickupFee : 0,
      shipping: deliveryMethod === 'home_delivery' ? shippingFee : 0,
      paymentFee,
      realShippingCost,
      total: calculatedTotal,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      paymentMethod: normPaymentMethod,
      paymentScreenshot: paymentScreenshot || paymentProofUrl || null,
      paymentProofUrl: paymentProofUrl || paymentScreenshot || null,
      paymentSenderPhone: paymentSenderPhone || null,
      paymentReference: paymentReference || null,
      shippingAddress: deliveryMethod === 'home_delivery' ? shippingAddress : {},
      customerPhone: customerPhone || '',
      customerPhone2: customerPhone2 || null,
      customerEmail: customerEmail || null
    });

    return order;
  }

  /**
   * Helper to calculate shipping fee and real internal shipping cost from Settings
   */
  static calculateShippingFromSettings(settings, deliveryMethod, governorate, subtotal) {
    if (deliveryMethod === 'metro_pickup') {
      const customerFee = settings.shipping?.metroPickupCustomerFee ?? 0;
      const realCost = settings.shipping?.metroPickupRealCost ?? 15;
      return { shippingFee: 0, metroPickupFee: customerFee, realShippingCost: realCost };
    }

    const freeGovs = settings.shipping?.freeShippingGovernorates || ['Cairo', 'القاهرة', 'Giza', 'الجيزة'];
    const govRates = settings.shipping?.governorateRates || new Map();
    const realCostMap = settings.shipping?.realCostMap || new Map();

    const isFree = governorate && freeGovs.some(g => g.toLowerCase() === governorate.toLowerCase());
    
    let shippingFee = 0;
    if (!isFree) {
      const rateVal = govRates instanceof Map ? govRates.get(governorate) : govRates[governorate];
      shippingFee = rateVal !== undefined ? rateVal : (settings.shipping?.defaultCustomerRate || 55);
    }

    let realShippingCost = 35; // Cairo/Giza default real cost
    if (governorate) {
      const realVal = realCostMap instanceof Map ? realCostMap.get(governorate) : realCostMap[governorate];
      if (realVal !== undefined) {
        realShippingCost = realVal;
      } else if (!isFree) {
        realShippingCost = 45;
      }
    }

    return { shippingFee, metroPickupFee: 0, realShippingCost };
  }

  /**
   * Helper / Static method to calculate shipping fee based on backend rules / pricing config
   */
  static getShippingFee({ deliveryMethod, governorate, city, subtotal }) {
    if (deliveryMethod === 'metro_pickup') {
      const metroFee = process.env.METRO_PICKUP_FEE ? parseFloat(process.env.METRO_PICKUP_FEE) : 0;
      return { shippingFee: 0, metroPickupFee: metroFee };
    }

    const governorateRates = {
      'Cairo': 40,
      'القاهرة': 40,
      'Giza': 40,
      'الجيزة': 40,
      'Alexandria': 55,
      'الإسكندرية': 55,
      'Qalyubia': 50,
      'القليوبية': 50,
      'Sharqia': 60,
      'الشرقية': 60,
      'Dakahlia': 60,
      'الدقهلية': 60,
      'Gharbia': 60,
      'الغربية': 60,
      'Monufia': 60,
      'المنوفية': 60,
      'Beheira': 65,
      'البحيرة': 65,
      'Ismailia': 65,
      'الإسماعيلية': 65,
      'Suez': 65,
      'السويس': 65,
      'Port Said': 65,
      'بور سعيد': 65,
      'Faiyum': 70,
      'الفيوم': 70,
      'Beni Suef': 75,
      'بني سويف': 75,
      'Minya': 80,
      'المنيا': 80,
      'Assiut': 85,
      'أسيوط': 85,
      'Sohag': 85,
      'سوهاج': 85,
      'Qena': 90,
      'قنا': 90,
      'Luxor': 95,
      'الأقصر': 95,
      'Aswan': 100,
      'أسوان': 100,
      'Red Sea': 110,
      'البحر الأحمر': 110,
      'South Sinai': 110,
      'جنوب سيناء': 110,
      'North Sinai': 110,
      'شمال سيناء': 110,
      'Matrouh': 110,
      'مطروح': 110,
      'New Valley': 120,
      'الوادي الجديد': 120
    };

    let shippingFee = 0;
    if (governorate && governorateRates[governorate] !== undefined) {
      shippingFee = governorateRates[governorate];
    } else {
      shippingFee = subtotal > 1500 ? 0 : 50;
    }

    return { shippingFee, metroPickupFee: 0 };
  }

  /**
   * Track order by order number or phone
   */
  static async trackOrder(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) {
      throw new AppError('Order number or phone number is required.', 400, ErrorCodes.VALIDATION_ERROR, 'OrderService.trackOrder');
    }
    const term = searchTerm.trim();
    const normalizedPhone = normalizePhone(term);

    let orders = await Order.find({
      $or: [
        { orderNumber: { $regex: `^${term}$`, $options: 'i' } },
        { customerPhone: term },
        ...(normalizedPhone ? [{ customerPhone: normalizedPhone }] : []),
        ...(term.length === 24 && /^[0-9a-fA-F]{24}$/.test(term) ? [{ _id: term }] : [])
      ]
    })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      throw new AppError('No order found matching this reference. Please check your order number or phone.', 404, ErrorCodes.ORDER_NOT_FOUND, 'OrderService.trackOrder');
    }

    return orders;
  }

  /**
   * Get order by ID or orderNumber
   */
  static async getOrderById(orderId, customerId = null) {
    const filter = orderId.startsWith('ELAN-') ? { orderNumber: orderId } : { _id: orderId };
    if (customerId) {
      filter.customer = customerId;
    }

    const order = await Order.findOne(filter).populate('customer', 'name phone userId isFirst100 foundingRank');
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND, 'OrderService.getOrderById');
    }
    return order;
  }

  /**
   * Customer: Get my orders
   */
  static async getCustomerOrders(customerId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ customer: customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ customer: customerId })
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin: Get all orders with filter
   */
  static async getAllOrders(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.orderStatus) {
      filter.orderStatus = query.orderStatus;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.search) {
      filter.$or = [
        { orderNumber: { $regex: query.search, $options: 'i' } },
        { paymentReference: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name phone userId isFirst100 foundingRank')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin: Update order status manually
   */
  static async updateOrderStatus(orderId, { orderStatus, paymentStatus }) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND, 'OrderService.updateOrderStatus');
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    return order;
  }

  /**
   * Admin: One-click verify order payment, deposit to CashAccount, and notify customer
   */
  static async verifyOrderPayment(orderId, { cashAccountId = null, notes = null, amountReceived = null } = {}, adminUser = null) {
    const order = await Order.findById(orderId).populate('customer', 'name email phone');
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND, 'OrderService.verifyOrderPayment');
    }

    order.paymentStatus = 'paid';
    if (order.orderStatus === 'pending') {
      order.orderStatus = 'confirmed';
    }
    order.verifiedBy = adminUser?._id || null;
    order.verifiedAt = new Date();
    if (notes) order.adminNotes = notes;

    // Credit Cash Account if selected or if a default digital wallet / cash account exists
    let selectedCashAccount = null;
    if (cashAccountId) {
      selectedCashAccount = await CashAccount.findById(cashAccountId);
    } else {
      // Find matching cash account by payment method or first active account
      if (order.paymentMethod === 'vodafone_cash') {
        selectedCashAccount = await CashAccount.findOne({
          active: true,
          $or: [{ type: 'digital_wallet' }, { name: /vodafone/i }, { name: /فودافون/i }]
        });
      } else if (order.paymentMethod === 'instapay') {
        selectedCashAccount = await CashAccount.findOne({
          active: true,
          $or: [{ type: 'bank' }, { name: /instapay/i }, { name: /انستاباي/i }, { name: /إنستاباي/i }]
        });
      }

      if (!selectedCashAccount) {
        selectedCashAccount = await CashAccount.findOne({ active: true });
      }
    }

    const finalAmount = amountReceived !== null && amountReceived !== undefined ? Number(amountReceived) : order.total;

    if (selectedCashAccount) {
      order.cashAccount = selectedCashAccount._id;
      selectedCashAccount.balance = (selectedCashAccount.balance || 0) + finalAmount;
      selectedCashAccount.transactions.push({
        type: 'SALE',
        amount: finalAmount,
        balanceAfter: selectedCashAccount.balance,
        referenceId: order.orderNumber,
        referenceType: 'ORDER',
        description: `Payment verified for Order #${order.orderNumber} (${order.paymentMethod})`,
        createdBy: adminUser?._id || null,
        date: new Date()
      });
      await selectedCashAccount.save();
    }

    await order.save();

    // Send confirmation email if customer email exists
    const customerEmail = order.customerEmail || order.customer?.email;
    if (customerEmail) {
      try {
        const settings = await SettingsService.getSettings();
        const trackingUrl = `${settings.storeUrl || 'https://elan.online'}/track-order?order=${order.orderNumber}`;
        await EmailService.sendOrderConfirmation({
          to: customerEmail,
          name: order.customer?.name || 'Valued Customer',
          orderNumber: order.orderNumber,
          total: order.total,
          items: order.items,
          deliveryMethod: order.deliveryMethod,
          shippingAddress: order.shippingAddress,
          trackingUrl
        });
      } catch (err) {
        console.error('[OrderService.verifyOrderPayment] Email dispatch error:', err);
      }
    }

    return order;
  }

  /**
   * Public Safe QR Verification for Invoices & Customers
   */
  static async getPublicVerification(orderNumber) {
    if (!orderNumber) {
      throw new AppError('Order number is required for verification.', 400, ErrorCodes.VALIDATION_ERROR, 'OrderService.getPublicVerification');
    }

    const order = await Order.findOne({ orderNumber: orderNumber.trim() })
      .populate('customer', 'name')
      .select('orderNumber orderStatus paymentStatus deliveryMethod metroPickup createdAt items customer');

    if (!order) {
      throw new AppError('Order not found or invalid verification code.', 404, ErrorCodes.ORDER_NOT_FOUND, 'OrderService.getPublicVerification');
    }

    // Mask customer name for privacy e.g. "Ah*** M***"
    const rawName = order.customer?.name || 'Guest Customer';
    const maskedName = rawName
      .split(' ')
      .map(part => (part.length > 2 ? `${part[0]}***${part[part.length - 1]}` : part))
      .join(' ');

    return {
      orderNumber: order.orderNumber,
      isVerified: order.paymentStatus === 'paid',
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      deliveryMethod: order.deliveryMethod,
      customerName: maskedName,
      itemCount: order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0,
      items: order.items?.map(i => ({
        name: i.productName,
        size: i.size,
        quantity: i.quantity
      })),
      createdAt: order.createdAt
    };
  }

  /**
   * Admin: Create manual order directly from Dashboard
   */
  static async createAdminOrder(payload = {}, adminUser = null) {
    const {
      items = [],
      deliveryMethod = 'home_delivery',
      metroPickup = null,
      shippingAddress = {},
      customerPhone = '',
      customerPhone2 = null,
      customerEmail = null,
      customerName = '',
      paymentMethod = 'cash_on_delivery',
      paymentStatus = 'pending',
      orderStatus = 'confirmed',
      shipping = 50,
      discount = 0,
      cashAccountId = null,
      adminNotes = ''
    } = payload;

    if (!customerPhone || !customerPhone.trim()) {
      throw new AppError('Customer phone number is required.', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('At least one item is required in the order.', 400);
    }

    const normPhone = normalizePhone(customerPhone) || customerPhone.trim();
    let user = await User.findOne({ phone: normPhone });
    if (!user) {
      const userId = generateUserId();
      user = await User.create({
        userId,
        name: customerName ? customerName.trim() : 'Valued Customer',
        phone: normPhone,
        email: customerEmail || undefined,
        role: 'customer'
      });
    } else {
      if (customerName && customerName.trim()) user.name = customerName.trim();
      if (customerEmail && !user.email) user.email = customerEmail;
      await user.save();
    }

    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product || item._id);
      if (!product) {
        throw new AppError(`Product ID '${item.productId}' not found.`, 404);
      }

      // Find variant by size or SKU
      const variant = product.variants?.find(
        (v) => (item.variantSKU && v.SKU?.toUpperCase() === item.variantSKU?.toUpperCase()) ||
               (item.size && v.size?.toLowerCase() === item.size?.toLowerCase())
      ) || product.variants?.[0];

      const itemPrice = item.price !== undefined && item.price !== null && item.price !== '' 
        ? Number(item.price) 
        : (variant?.price || 0);
      const itemQty = Math.max(1, Number(item.quantity) || 1);
      const itemTotal = itemPrice * itemQty;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        product: product._id,
        variantSKU: variant?.SKU || `ELN-${product.slug}-${item.size || '50ml'}`,
        productName: product.name,
        size: item.size || variant?.size || '50ml',
        price: itemPrice,
        quantity: itemQty
      });
    }

    const numShipping = Math.max(0, Number(shipping) || 0);
    const numDiscount = Math.max(0, Number(discount) || 0);
    const calculatedTotal = Math.max(0, calculatedSubtotal - numDiscount + numShipping);
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer: user._id,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount: numDiscount,
      deliveryMethod,
      metroPickup: deliveryMethod === 'metro_pickup' ? metroPickup : null,
      metroPickupFee: deliveryMethod === 'metro_pickup' ? numShipping : 0,
      shipping: deliveryMethod === 'home_delivery' ? numShipping : 0,
      paymentFee: 0,
      realShippingCost: deliveryMethod === 'metro_pickup' ? 15 : 35,
      total: calculatedTotal,
      orderStatus: orderStatus || 'confirmed',
      paymentStatus: paymentStatus || 'pending',
      paymentMethod: (paymentMethod || 'cash_on_delivery').toLowerCase(),
      shippingAddress: deliveryMethod === 'home_delivery' ? shippingAddress : {},
      customerPhone: normPhone,
      customerPhone2: customerPhone2 || null,
      customerEmail: customerEmail || null,
      adminNotes: adminNotes || 'Created manually from Dashboard'
    });

    // If marked paid upon creation, credit selected cash account
    if (paymentStatus === 'paid') {
      let selectedAccount = null;
      if (cashAccountId) {
        selectedAccount = await CashAccount.findById(cashAccountId);
      } else {
        selectedAccount = await CashAccount.findOne({ active: true });
      }

      if (selectedAccount) {
        order.cashAccount = selectedAccount._id;
        order.verifiedBy = adminUser?._id || null;
        order.verifiedAt = new Date();
        selectedAccount.balance = (selectedAccount.balance || 0) + calculatedTotal;
        selectedAccount.transactions.push({
          type: 'SALE',
          amount: calculatedTotal,
          balanceAfter: selectedAccount.balance,
          referenceId: order.orderNumber,
          referenceType: 'ORDER',
          description: `Manual order created and marked paid #${order.orderNumber}`,
          createdBy: adminUser?._id || null,
          date: new Date()
        });
        await selectedAccount.save();
        await order.save();
      }
    }

    return order;
  }
}

module.exports = OrderService;
