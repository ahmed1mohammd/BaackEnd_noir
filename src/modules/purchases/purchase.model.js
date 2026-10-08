const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: true
    },
    rawMaterialName: {
      type: String,
      required: true
    },
    quantityGrams: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be positive']
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost cannot be negative']
    },
    costPerGram: {
      type: Number,
      required: true
    },
    previousStock: {
      type: Number,
      default: 0
    },
    previousCostPerGram: {
      type: Number,
      default: 0
    },
    newWeightedCostPerGram: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    supplier: {
      type: String,
      default: '',
      trim: true
    },
    invoiceNumber: {
      type: String,
      default: '',
      trim: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    items: [purchaseItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashAccount',
      default: null
    },
    paymentAccountName: {
      type: String,
      default: ''
    },
    attachmentUrl: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

purchaseSchema.index({ createdAt: -1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;
