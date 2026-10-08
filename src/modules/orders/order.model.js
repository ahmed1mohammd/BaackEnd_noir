const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantSKU: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    productName: {
      type: String,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: {
      type: [orderItemSchema],
      validate: [(val) => val && val.length > 0, 'Order must contain at least one item.']
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    couponCode: {
      type: String,
      default: null
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    metroPickupFee: {
      type: Number,
      default: 0,
      min: 0
    },
    deliveryMethod: {
      type: String,
      enum: ['metro_pickup', 'home_delivery'],
      default: 'home_delivery',
      required: true
    },
    metroPickup: {
      stationId: { type: String, default: null },
      stationNameEn: { type: String, default: null },
      stationNameAr: { type: String, default: null },
      line: { type: String, default: null },
      pickupNote: { type: String, default: 'Pickup date and time will be confirmed after your order is reviewed.' },
      fee: { type: Number, default: 0 }
    },
    customerPhone: {
      type: String,
      default: ''
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['vodafone_cash', 'instapay', 'cod', 'cash_on_delivery', 'fawaterk', 'card'],
      default: 'cod',
      index: true
    },
    paymentSenderPhone: {
      type: String,
      default: null
    },
    paymentProofUrl: {
      type: String,
      default: null
    },
    paymentReference: {
      type: String,
      default: null
    },
    shippingAddress: {
      governorate: { type: String, default: '' },
      city: { type: String, default: '' },
      street: { type: String, default: '' },
      buildingNumber: { type: String, default: '' },
      floor: { type: String, default: '' },
      apartment: { type: String, default: '' },
      landmark: { type: String, default: '' },
      deliveryNotes: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'Egypt' }
    },
    customerPhone2: {
      type: String,
      default: null
    },
    customerEmail: {
      type: String,
      default: null
    },
    paymentFee: {
      type: Number,
      default: 0
    },
    realShippingCost: {
      type: Number,
      default: 0
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    cashAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashAccount',
      default: null
    },
    adminNotes: {
      type: String,
      default: null
    },
    processedFirst100: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
