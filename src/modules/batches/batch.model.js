const mongoose = require('mongoose');

const batchIngredientSnapshotSchema = new mongoose.Schema(
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
    percentage: {
      type: Number,
      required: true
    },
    gramsUsed: {
      type: Number,
      required: true
    },
    costPerGramAtTime: {
      type: Number,
      required: true
    },
    totalCost: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const finishedProductEntrySchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    size: {
      type: String,
      required: true
    },
    targetWeightGrams: {
      type: Number,
      required: true,
      default: 50
    },
    quantityProduced: {
      type: Number,
      required: true,
      min: [0, 'Quantity produced cannot be negative']
    },
    damagedCount: {
      type: Number,
      default: 0
    },
    testerCount: {
      type: Number,
      default: 0
    },
    packagingCostPerUnit: {
      type: Number,
      default: 0
    },
    liquidCostPerUnit: {
      type: Number,
      default: 0
    },
    totalUnitCost: {
      type: Number,
      required: true
    },
    totalCost: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fragrance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Fragrance reference is required'],
      index: true
    },
    fragranceName: {
      type: String,
      required: true
    },
    formula: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Formula',
      required: true
    },
    formulaVersion: {
      type: Number,
      required: true
    },
    finalBatchWeight: {
      type: Number,
      required: [true, 'Final batch weight in grams is required'],
      min: [1, 'Batch weight must be at least 1 gram']
    },
    concentration: {
      type: Number,
      required: [true, 'Fragrance concentration percentage is required'],
      min: [1, 'Concentration must be at least 1%'],
      max: [100, 'Concentration cannot exceed 100%']
    },
    fragranceOilWeight: {
      type: Number,
      required: true
    },
    alcoholWeight: {
      type: Number,
      required: true
    },
    alcoholRawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      default: null
    },
    alcoholCostPerGramAtTime: {
      type: Number,
      default: 0
    },
    alcoholTotalCost: {
      type: Number,
      default: 0
    },
    ingredientSnapshots: [batchIngredientSnapshotSchema],
    totalOilsCost: {
      type: Number,
      required: true
    },
    totalBatchCost: {
      type: Number,
      required: true
    },
    costPerGram: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'bottled', 'cancelled'],
      default: 'confirmed',
      index: true
    },
    bottledProducts: [finishedProductEntrySchema],
    productionLossGrams: {
      type: Number,
      default: 0
    },
    productionDate: {
      type: Date,
      default: Date.now
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

batchSchema.index({ createdAt: -1 });

const ProductionBatch = mongoose.model('ProductionBatch', batchSchema);

module.exports = ProductionBatch;
