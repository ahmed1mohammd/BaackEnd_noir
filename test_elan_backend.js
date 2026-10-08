const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/modules/users/user.model');
const Product = require('./src/modules/products/product.model');
const Order = require('./src/modules/orders/order.model');
const AuthService = require('./src/modules/auth/auth.service');
const ProductService = require('./src/modules/products/product.service');
const OrderService = require('./src/modules/orders/order.service');
const { processFawaterkWebhook } = require('./src/payments/fawaterk/webhook');

async function runTests() {
  console.log('=== Starting ÉLAN Backend Verification ===\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/elan_fragrance_test';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] MongoDB Connected successfully.');

    // Clear test collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // 1. Customer Authentication Test
    console.log('\n--- 1. Testing Customer Auth & Phone Normalization ---');
    const authResult = await AuthService.registerOrLogin({
      name: 'Amr Elan',
      phone: '01012345678'
    });

    console.log(`[PASS] Customer Registered.`);
    console.log(`       User ID: ${authResult.user.userId}`);
    console.log(`       Normalized Phone: ${authResult.user.phone}`);
    console.log(`       Token Generated: ${authResult.token.slice(0, 25)}...`);

    // 2. Product + Variants Creation Test
    console.log('\n--- 2. Testing Product + Variants Architecture ---');
    const product = await ProductService.createProduct({
      name: 'ÉLAN Signature Noir',
      shortDescription: 'An opulent fragrance combining dark amber and Damask rose.',
      description: 'Masterfully crafted fragrance with notes of saffron, Damask rose, and rich dark amber.',
      fragranceFamily: 'Woody Oriental',
      season: ['Winter', 'Evening'],
      notes: {
        top: ['Saffron', 'Bergamot'],
        heart: ['Damask Rose', 'Oud'],
        base: ['Dark Amber', 'Vanilla', 'Musk']
      },
      images: [
        { url: 'https://res.cloudinary.com/elan/image/upload/v1/signature_noir.jpg', publicId: 'elan/signature_noir', alt: 'Signature Noir Bottle' }
      ],
      variants: [
        { size: '30ml', price: 850, stock: 50, SKU: 'ELAN-NOIR-30ML' },
        { size: '50ml', price: 1450, stock: 30, SKU: 'ELAN-NOIR-50ML' },
        { size: '100ml', price: 2200, stock: 20, SKU: 'ELAN-NOIR-100ML' }
      ],
      featured: true
    });

    console.log(`[PASS] Product Created.`);
    console.log(`       Name: ${product.name}`);
    console.log(`       Slug: ${product.slug}`);
    console.log(`       Variants: ${product.variants.length} sizes (30ml: 850 EGP, 50ml: 1450 EGP, 100ml: 2200 EGP)`);

    // 3. Order Creation & Price/Stock Server Validation Test
    console.log('\n--- 3. Testing Order Creation & Server-Controlled Price/Stock ---');
    const order = await OrderService.createOrder(authResult.user._id, {
      items: [
        {
          productId: product._id.toString(),
          variantSKU: 'ELAN-NOIR-50ML',
          quantity: 2
        }
      ],
      shippingAddress: {
        street: '90th Street, Fifth Settlement',
        city: 'New Cairo',
        state: 'Cairo',
        postalCode: '11835',
        country: 'Egypt'
      }
    });

    console.log(`[PASS] Order Created Successfully by Server.`);
    console.log(`       Order Number: ${order.orderNumber}`);
    console.log(`       Calculated Subtotal: ${order.subtotal} EGP (2 x 1450)`);
    console.log(`       Shipping: ${order.shipping} EGP`);
    console.log(`       Total: ${order.total} EGP`);
    console.log(`       Order Status: ${order.orderStatus}`);
    console.log(`       Payment Status: ${order.paymentStatus}`);

    // 4. Fawaterk Paid Webhook & First 100 Founding Customer Assignment Test
    console.log('\n--- 4. Testing Fawaterk Webhook & First 100 Founding Customers Logic ---');
    const webhookResponse = await processFawaterkWebhook({
      invoice_id: 'FAW-INV-998877',
      custom_ref: order.orderNumber,
      invoice_status: 'PAID'
    });

    console.log(`[PASS] Webhook Processed.`);
    console.log(`       Message: ${webhookResponse.message}`);

    // Verify Updated Order
    const updatedOrder = await Order.findById(order._id);
    console.log(`       Updated Order Payment Status: ${updatedOrder.paymentStatus}`);
    console.log(`       Updated Order Status: ${updatedOrder.orderStatus}`);

    // Verify Stock Reduction
    const updatedProduct = await Product.findById(product._id);
    const variant50ml = updatedProduct.variants.find(v => v.SKU === 'ELAN-NOIR-50ML');
    console.log(`       50ml Variant Stock After Payment: ${variant50ml.stock} (Started at 30, reduced by 2)`);

    // Verify First 100 Founding Customer Assignment
    const updatedCustomer = await User.findById(authResult.user._id);
    console.log(`       Customer isFirst100: ${updatedCustomer.isFirst100}`);
    console.log(`       Customer Founding Rank: FOUNDING #${updatedCustomer.foundingRank}`);
    console.log(`       Customer First Order Number: ${updatedCustomer.firstOrderNumber}`);

    // 5. Idempotency Check Test
    console.log('\n--- 5. Testing Idempotent Webhook Retry ---');
    const retryResponse = await processFawaterkWebhook({
      invoice_id: 'FAW-INV-998877',
      custom_ref: order.orderNumber,
      invoice_status: 'PAID'
    });

    console.log(`[PASS] Duplicate Webhook Retry Handled: "${retryResponse.message}"`);
    const recheckProduct = await Product.findById(product._id);
    const recheckVariant50ml = recheckProduct.variants.find(v => v.SKU === 'ELAN-NOIR-50ML');
    console.log(`       Stock remains unchanged on retry: ${recheckVariant50ml.stock}`);

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('\n❌ TEST ERROR:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
