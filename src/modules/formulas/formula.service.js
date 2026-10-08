const Formula = require('./formula.model');
const Product = require('../products/product.model');
const RawMaterial = require('../inventory/rawMaterial.model');
const AppError = require('../../utils/errors/appError');

const getAllFormulas = async (query = {}) => {
  const filter = {};
  if (query.fragrance) filter.fragrance = query.fragrance;
  if (query.active !== undefined) filter.active = query.active === 'true' || query.active === true;

  const formulas = await Formula.find(filter)
    .sort({ fragranceName: 1, version: -1 })
    .populate('fragrance', 'name slug gender fragranceFamily')
    .populate('ingredients.rawMaterial', 'name currentStock costPerGram category');

  return formulas;
};

const getFormulaById = async (id) => {
  const formula = await Formula.findById(id)
    .populate('fragrance', 'name slug gender fragranceFamily variants')
    .populate('ingredients.rawMaterial', 'name currentStock costPerGram category unit');

  if (!formula) {
    throw new AppError('Formula not found', 404);
  }
  return formula;
};

const createFormula = async (data, userId) => {
  const fragrance = await Product.findById(data.fragrance);
  if (!fragrance) {
    throw new AppError('Fragrance product not found', 404);
  }

  if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
    throw new AppError('Formula must contain at least one ingredient', 400);
  }

  // Validate ingredient percentages sum to 100%
  const totalPercentage = data.ingredients.reduce(
    (sum, item) => sum + (Number(item.percentage) || 0),
    0
  );

  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new AppError(
      `Total ingredient percentages must equal exactly 100%. Current total is ${totalPercentage}%.`,
      400
    );
  }

  // Validate raw materials
  const enrichedIngredients = [];
  for (const item of data.ingredients) {
    const rawMaterial = await RawMaterial.findById(item.rawMaterial);
    if (!rawMaterial) {
      throw new AppError(`Raw material ID ${item.rawMaterial} not found`, 404);
    }
    enrichedIngredients.push({
      rawMaterial: rawMaterial._id,
      rawMaterialName: rawMaterial.name,
      percentage: Number(item.percentage),
      notes: item.notes || ''
    });
  }

  // Find existing version count for this fragrance
  const latestFormula = await Formula.findOne({ fragrance: fragrance._id }).sort({ version: -1 });
  const nextVersion = latestFormula ? latestFormula.version + 1 : 1;

  // Set any previous formulas for this fragrance to inactive (archived for history)
  await Formula.updateMany({ fragrance: fragrance._id }, { active: false });

  const formula = await Formula.create({
    fragrance: fragrance._id,
    fragranceName: fragrance.name,
    version: nextVersion,
    ingredients: enrichedIngredients,
    notes: data.notes || '',
    active: true,
    createdBy: userId
  });

  // Link as current formula in Product
  fragrance.currentFormula = formula._id;
  await fragrance.save();

  return formula;
};

const calculateBatchPreview = async ({ fragranceId, formulaId, finalBatchWeight, concentration }) => {
  const batchWeight = Number(finalBatchWeight);
  const concPercent = Number(concentration);

  if (!batchWeight || batchWeight <= 0) {
    throw new AppError('Final batch weight in grams must be greater than 0', 400);
  }

  if (!concPercent || concPercent <= 0 || concPercent > 100) {
    throw new AppError('Concentration must be between 1% and 100%', 400);
  }

  let formula;
  if (formulaId) {
    formula = await Formula.findById(formulaId).populate('ingredients.rawMaterial');
  } else if (fragranceId) {
    formula = await Formula.findOne({ fragrance: fragranceId, active: true }).populate('ingredients.rawMaterial');
  }

  if (!formula) {
    throw new AppError('Active formula not found for this fragrance', 404);
  }

  // 1. Calculate weights in Grams
  const fragranceOilWeight = batchWeight * (concPercent / 100);
  const alcoholWeight = batchWeight - fragranceOilWeight;

  // 2. Find alcohol raw material for costing
  const alcoholMaterial = await RawMaterial.findOne({ category: 'alcohol', active: true });
  const alcoholCostPerGram = alcoholMaterial ? (alcoholMaterial.costPerGram || 0) : 0;
  const alcoholTotalCost = alcoholWeight * alcoholCostPerGram;

  // 3. Break down each oil ingredient
  let totalOilsCost = 0;
  const ingredientBreakdown = [];
  const insufficientMaterials = [];

  for (const item of formula.ingredients) {
    const raw = item.rawMaterial;
    const ingredientGrams = fragranceOilWeight * (item.percentage / 100);
    const costPerGram = raw ? (raw.costPerGram || 0) : 0;
    const ingredientCost = ingredientGrams * costPerGram;
    totalOilsCost += ingredientCost;

    const availableStock = raw ? (raw.currentStock || 0) : 0;
    const isSufficient = availableStock >= ingredientGrams;

    if (!isSufficient) {
      insufficientMaterials.push({
        rawMaterialId: raw ? raw._id : null,
        name: item.rawMaterialName,
        requiredGrams: ingredientGrams,
        availableGrams: availableStock,
        missingGrams: ingredientGrams - availableStock
      });
    }

    ingredientBreakdown.push({
      rawMaterialId: raw ? raw._id : null,
      name: item.rawMaterialName,
      percentage: item.percentage,
      grams: Number(ingredientGrams.toFixed(3)),
      costPerGram: costPerGram,
      totalCost: Number(ingredientCost.toFixed(2)),
      availableStock: availableStock,
      isSufficient: isSufficient
    });
  }

  // Check alcohol stock sufficiency
  const alcoholAvailable = alcoholMaterial ? (alcoholMaterial.currentStock || 0) : 0;
  const isAlcoholSufficient = alcoholAvailable >= alcoholWeight;
  if (alcoholMaterial && !isAlcoholSufficient) {
    insufficientMaterials.push({
      rawMaterialId: alcoholMaterial._id,
      name: alcoholMaterial.name,
      requiredGrams: alcoholWeight,
      availableGrams: alcoholAvailable,
      missingGrams: alcoholWeight - alcoholAvailable
    });
  }

  const totalBatchCost = totalOilsCost + alcoholTotalCost;
  const costPerGram = totalBatchCost / batchWeight;

  return {
    fragranceId: formula.fragrance,
    fragranceName: formula.fragranceName,
    formulaId: formula._id,
    formulaVersion: formula.version,
    finalBatchWeight: batchWeight,
    concentration: concPercent,
    fragranceOilWeight: Number(fragranceOilWeight.toFixed(3)),
    alcoholWeight: Number(alcoholWeight.toFixed(3)),
    alcoholCostPerGram: alcoholCostPerGram,
    alcoholTotalCost: Number(alcoholTotalCost.toFixed(2)),
    ingredients: ingredientBreakdown,
    totalOilsCost: Number(totalOilsCost.toFixed(2)),
    totalBatchCost: Number(totalBatchCost.toFixed(2)),
    costPerGram: Number(costPerGram.toFixed(4)),
    canProduce: insufficientMaterials.length === 0,
    insufficientMaterials: insufficientMaterials
  };
};

module.exports = {
  getAllFormulas,
  getFormulaById,
  createFormula,
  calculateBatchPreview
};
