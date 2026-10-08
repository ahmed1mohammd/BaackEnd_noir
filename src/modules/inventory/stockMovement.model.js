const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      required: true,
      enum: ['RawMaterial', 'ProductVariant'],
      index: true
    },
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      default: null,
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true
    },
    variantSKU: {
      type: String,
      default: '',
      trim: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    movementType: {
      type: String,
      required: true,
      enum: [
        'PURCHASE',
        'BATCH_PRODUCTION',
        'FINISHED_PRODUCT_CREATED',
        'SALE',
        'RETURN',
        'DAMAGED',
        'TESTER',
        'MANUAL_ADJUSTMENT'
      ],
      index: true
    },
    quantityBefore: {
      type: Number,
      required: true
    },
    quantityChange: {
      type: Number,
      required: true
    },
    quantityAfter: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'gram'
    },
    unitCost: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      default: '',
      trim: true
    },
    referenceId: {
      type: String,
      default: null,
      index: true
    },
    referenceType: {
      type: String,
      default: null
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

stockMovementSchema.index({ createdAt: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

module.exports = StockMovement;
