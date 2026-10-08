const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Raw material name is required'],
      trim: true,
      unique: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'fragrance_oil',
        'alcohol',
        'bottle',
        'sticker',
        'box',
        'bag',
        'tester',
        'other'
      ],
      default: 'fragrance_oil',
      index: true
    },
    unit: {
      type: String,
      required: true,
      default: 'gram',
      trim: true
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock quantity cannot be negative']
    },
    costPerGram: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Cost per gram cannot be negative']
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      default: 100,
      min: [0, 'Low stock threshold cannot be negative']
    },
    supplier: {
      type: String,
      default: '',
      trim: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual property for total current value
rawMaterialSchema.virtual('totalValue').get(function () {
  return (this.currentStock || 0) * (this.costPerGram || 0);
});

rawMaterialSchema.set('toJSON', { virtuals: true });
rawMaterialSchema.set('toObject', { virtuals: true });

const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);

module.exports = RawMaterial;
