const mongoose = require('mongoose');

const formulaIngredientSchema = new mongoose.Schema(
  {
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: [true, 'Raw material reference is required']
    },
    rawMaterialName: {
      type: String,
      required: true,
      trim: true
    },
    percentage: {
      type: Number,
      required: [true, 'Ingredient percentage is required'],
      min: [0.01, 'Percentage must be greater than 0'],
      max: [100, 'Percentage cannot exceed 100']
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);

const formulaSchema = new mongoose.Schema(
  {
    fragrance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Fragrance product reference is required'],
      index: true
    },
    fragranceName: {
      type: String,
      required: true,
      trim: true
    },
    version: {
      type: Number,
      required: true,
      default: 1
    },
    ingredients: {
      type: [formulaIngredientSchema],
      validate: [
        function (val) {
          if (!val || val.length === 0) return false;
          const total = val.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
          return Math.abs(total - 100) < 0.01;
        },
        'Total ingredient percentages must equal exactly 100% of fragrance oil portion.'
      ]
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

formulaSchema.index({ fragrance: 1, version: 1 }, { unique: true });

const Formula = mongoose.model('Formula', formulaSchema);

module.exports = Formula;
