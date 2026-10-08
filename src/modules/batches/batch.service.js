const ProductionBatch = require('./batch.model');
const Formula = require('../formulas/formula.model');
const Product = require('../products/product.model');
const RawMaterial = require('../inventory/rawMaterial.model');
const StockMovement = require('../inventory/stockMovement.model');
const AppError = require('../../utils/errors/appError');

const getAllBatches = async (query = {}) => {
  const filter = {};
  if (query.fragrance) filter.fragrance = query.fragrance;
  if (query.status) filter.status = query.status;

  const batches = await ProductionBatch.find(filter)
    .sort({ createdAt: -1 })
    .populate('fragrance', 'name slug gender fragranceFamily variants')
    .populate('formula', 'version notes')
    .populate('createdBy', 'name phone email');

  return batches;
};

const getBatchById = async (id) => {
  const batch = await ProductionBatch.findById(id)
    .populate('fragrance', 'name slug gender fragranceFamily variants')
    .populate('formula')
    .populate('ingredientSnapshots.rawMaterial')
    .populate('createdBy', 'name phone email');

  if (!batch) {
    throw new AppError('Production batch not found', 404);
  }
  return batch;
};

const generateBatchNumber = async () => {
  const count = await ProductionBatch.countDocuments();
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, '0');
  return `BATCH-${year}-${seq}`;
};

/**
 * Preview Batch Calculation before creation:
 * - Calculates required fragrance oils, alcohol, and packaging.
 * - Checks stock availability and reports exact shortage amounts.
 * - Computes total batch cost & estimated unit costs for 30ml, 50ml, 100ml.
 */
const previewBatchCalculation = async (data) => {
  const { fragranceId, formulaId, finalBatchWeight, concentration } = data;

  const batchWeight = Number(finalBatchWeight) || 0;
  const concPercent = Number(concentration) || 25;

  if (!batchWeight || batchWeight <= 0) {
    throw new AppError('Final batch weight in grams must be greater than 0', 400);
  }

  const fragrance = await Product.findById(fragranceId);
  if (!fragrance) {
    throw new AppError('Fragrance product not found', 404);
  }

  let formula = null;
  if (formulaId) {
    formula = await Formula.findById(formulaId);
  } else {
    formula = await Formula.findOne({ fragrance: fragrance._id, active: true });
  }

  if (!formula || !Array.isArray(formula.ingredients) || formula.ingredients.length === 0) {
    throw new AppError('Active formula not found for this fragrance', 404);
  }

  const fragranceOilWeight = batchWeight * (concPercent / 100);
  const alcoholWeight = batchWeight - fragranceOilWeight;

  const alcoholMaterial = await RawMaterial.findOne({ category: 'alcohol', active: true });
  const alcoholCostPerGram = alcoholMaterial ? (alcoholMaterial.costPerGram || 0) : 0;
  const alcoholTotalCost = alcoholWeight * alcoholCostPerGram;

  const ingredientsPreview = [];
  const shortages = [];
  let totalOilsCost = 0;

  for (const item of formula.ingredients) {
    const raw = await RawMaterial.findById(item.rawMaterial);
    if (!raw) continue;

    const gramsNeeded = fragranceOilWeight * (item.percentage / 100);
    const costPerGram = raw.costPerGram || 0;
    const itemTotalCost = gramsNeeded * costPerGram;
    totalOilsCost += itemTotalCost;

    const available = raw.currentStock || 0;
    const isShort = available < gramsNeeded;

    if (isShort) {
      shortages.push({
        rawMaterialId: raw._id,
        name: raw.name,
        category: raw.category,
        requiredGrams: Number(gramsNeeded.toFixed(2)),
        availableGrams: Number(available.toFixed(2)),
        missingGrams: Number((gramsNeeded - available).toFixed(2))
      });
    }

    ingredientsPreview.push({
      rawMaterial: raw._id,
      rawMaterialName: raw.name,
      percentage: item.percentage,
      gramsNeeded: Number(gramsNeeded.toFixed(2)),
      availableGrams: Number(available.toFixed(2)),
      costPerGram: Number(costPerGram.toFixed(4)),
      totalCost: Number(itemTotalCost.toFixed(2)),
      isShort
    });
  }

  // Check alcohol shortage
  if (alcoholMaterial) {
    const alcoholAvailable = alcoholMaterial.currentStock || 0;
    if (alcoholAvailable < alcoholWeight) {
      shortages.push({
        rawMaterialId: alcoholMaterial._id,
        name: alcoholMaterial.name,
        category: 'alcohol',
        requiredGrams: Number(alcoholWeight.toFixed(2)),
        availableGrams: Number(alcoholAvailable.toFixed(2)),
        missingGrams: Number((alcoholWeight - alcoholAvailable).toFixed(2))
      });
    }
  }

  const totalBatchCost = totalOilsCost + alcoholTotalCost;
  const costPerGram = batchWeight > 0 ? totalBatchCost / batchWeight : 0;

  // Estimated unit costs for 30ml, 50ml, 100ml
  const sizeEstimations = [
    { size: '30ml', targetWeight: 28 },
    { size: '50ml', targetWeight: 45 },
    { size: '100ml', targetWeight: 90 }
  ].map(s => {
    const liquidCost = s.targetWeight * costPerGram;
    const variant = fragrance.variants?.find(v => v.size.toLowerCase() === s.size.toLowerCase());
    const pkg = variant?.packagingCosts || { bottle: 18, sticker: 3, box: 15, bag: 5, other: 2 };
    const pkgCost = (pkg.bottle || 0) + (pkg.sticker || 0) + (pkg.box || 0) + (pkg.bag || 0) + (pkg.other || 0);
    return {
      size: s.size,
      targetWeightGrams: s.targetWeight,
      liquidCost: Number(liquidCost.toFixed(2)),
      packagingCost: Number(pkgCost.toFixed(2)),
      totalUnitCost: Number((liquidCost + pkgCost).toFixed(2)),
      sellingPrice: variant?.price || 0,
      estimatedProfitMargin: variant?.price ? Number((((variant.price - (liquidCost + pkgCost)) / variant.price) * 100).toFixed(1)) : 0
    };
  });

  return {
    fragranceId: fragrance._id,
    fragranceName: fragrance.name,
    formulaId: formula._id,
    formulaVersion: formula.version,
    batchWeight,
    concentration: concPercent,
    fragranceOilWeight: Number(fragranceOilWeight.toFixed(2)),
    alcoholWeight: Number(alcoholWeight.toFixed(2)),
    ingredients: ingredientsPreview,
    totalOilsCost: Number(totalOilsCost.toFixed(2)),
    alcoholTotalCost: Number(alcoholTotalCost.toFixed(2)),
    totalBatchCost: Number(totalBatchCost.toFixed(2)),
    costPerGram: Number(costPerGram.toFixed(4)),
    hasShortage: shortages.length > 0,
    shortages,
    sizeEstimations
  };
};

const createAndConfirmBatch = async (data, userId) => {
  const { fragranceId, formulaId, finalBatchWeight, concentration, productionDate, notes } = data;

  const batchWeight = Number(finalBatchWeight);
  const concPercent = Number(concentration);

  if (!batchWeight || batchWeight <= 0) {
    throw new AppError('Final batch weight in grams must be greater than 0', 400);
  }

  if (!concPercent || concPercent <= 0 || concPercent > 100) {
    throw new AppError('Concentration must be between 1% and 100%', 400);
  }

  const fragrance = await Product.findById(fragranceId);
  if (!fragrance) {
    throw new AppError('Fragrance product not found', 404);
  }

  let formula;
  if (formulaId) {
    formula = await Formula.findById(formulaId);
  } else {
    formula = await Formula.findOne({ fragrance: fragrance._id, active: true });
  }

  if (!formula) {
    throw new AppError('Active formula not found for this fragrance', 404);
  }

  // 1. Calculate weights in Grams
  const fragranceOilWeight = batchWeight * (concPercent / 100);
  const alcoholWeight = batchWeight - fragranceOilWeight;

  // 2. Check and load all raw materials
  const alcoholMaterial = await RawMaterial.findOne({ category: 'alcohol', active: true });
  const alcoholCostPerGram = alcoholMaterial ? (alcoholMaterial.costPerGram || 0) : 0;
  const alcoholTotalCost = alcoholWeight * alcoholCostPerGram;

  const ingredientSnapshots = [];
  const materialsToDeduct = [];
  const insufficientMaterials = [];
  let totalOilsCost = 0;

  for (const item of formula.ingredients) {
    const raw = await RawMaterial.findById(item.rawMaterial);
    if (!raw) {
      throw new AppError(`Raw material ${item.rawMaterialName} not found`, 404);
    }

    const gramsUsed = fragranceOilWeight * (item.percentage / 100);
    const costPerGram = raw.costPerGram || 0;
    const totalCost = gramsUsed * costPerGram;
    totalOilsCost += totalCost;

    const availableStock = raw.currentStock || 0;
    if (availableStock < gramsUsed) {
      insufficientMaterials.push({
        rawMaterialId: raw._id,
        name: raw.name,
        requiredGrams: Number(gramsUsed.toFixed(2)),
        availableGrams: Number(availableStock.toFixed(2)),
        missingGrams: Number((gramsUsed - availableStock).toFixed(2))
      });
    }

    ingredientSnapshots.push({
      rawMaterial: raw._id,
      rawMaterialName: raw.name,
      percentage: item.percentage,
      gramsUsed: Number(gramsUsed.toFixed(3)),
      costPerGramAtTime: costPerGram,
      totalCost: Number(totalCost.toFixed(2))
    });

    materialsToDeduct.push({
      material: raw,
      gramsUsed: gramsUsed,
      costPerGram: costPerGram
    });
  }

  // Check alcohol stock
  if (alcoholMaterial) {
    const alcoholAvailable = alcoholMaterial.currentStock || 0;
    if (alcoholAvailable < alcoholWeight) {
      insufficientMaterials.push({
        rawMaterialId: alcoholMaterial._id,
        name: alcoholMaterial.name,
        requiredGrams: Number(alcoholWeight.toFixed(2)),
        availableGrams: Number(alcoholAvailable.toFixed(2)),
        missingGrams: Number((alcoholWeight - alcoholAvailable).toFixed(2))
      });
    }
  }

  // If any material is missing, fail batch confirmation
  if (insufficientMaterials.length > 0) {
    const missingDesc = insufficientMaterials
      .map(m => `${m.name}: need ${m.requiredGrams}g, available ${m.availableGrams}g (missing ${m.missingGrams}g)`)
      .join('; ');
    throw new AppError(`Cannot create batch due to insufficient materials: ${missingDesc}`, 400);
  }

  // 3. All materials available -> Perform Atomic Deductions & StockMovements
  const batchNumber = await generateBatchNumber();
  const totalBatchCost = totalOilsCost + alcoholTotalCost;
  const costPerGram = totalBatchCost / batchWeight;

  // Deduct each fragrance oil
  for (const item of materialsToDeduct) {
    const mat = item.material;
    const before = mat.currentStock;
    const after = before - item.gramsUsed;
    mat.currentStock = Math.max(0, after);
    await mat.save();

    await StockMovement.create({
      itemType: 'RawMaterial',
      rawMaterial: mat._id,
      itemName: mat.name,
      movementType: 'BATCH_PRODUCTION',
      quantityBefore: before,
      quantityChange: -item.gramsUsed,
      quantityAfter: mat.currentStock,
      unit: 'gram',
      unitCost: item.costPerGram,
      totalValue: item.gramsUsed * item.costPerGram,
      reason: `Consumed in batch ${batchNumber} (${fragrance.name})`,
      referenceId: batchNumber,
      referenceType: 'ProductionBatch',
      createdBy: userId
    });
  }

  // Deduct alcohol
  if (alcoholMaterial) {
    const before = alcoholMaterial.currentStock;
    const after = before - alcoholWeight;
    alcoholMaterial.currentStock = Math.max(0, after);
    await alcoholMaterial.save();

    await StockMovement.create({
      itemType: 'RawMaterial',
      rawMaterial: alcoholMaterial._id,
      itemName: alcoholMaterial.name,
      movementType: 'BATCH_PRODUCTION',
      quantityBefore: before,
      quantityChange: -alcoholWeight,
      quantityAfter: alcoholMaterial.currentStock,
      unit: 'gram',
      unitCost: alcoholCostPerGram,
      totalValue: alcoholWeight * alcoholCostPerGram,
      reason: `Alcohol consumed in batch ${batchNumber} (${fragrance.name})`,
      referenceId: batchNumber,
      referenceType: 'ProductionBatch',
      createdBy: userId
    });
  }

  // 4. Save Confirmed Batch with frozen historical snapshots
  const batch = await ProductionBatch.create({
    batchNumber,
    fragrance: fragrance._id,
    fragranceName: fragrance.name,
    formula: formula._id,
    formulaVersion: formula.version,
    finalBatchWeight: batchWeight,
    concentration: concPercent,
    fragranceOilWeight: Number(fragranceOilWeight.toFixed(3)),
    alcoholWeight: Number(alcoholWeight.toFixed(3)),
    alcoholRawMaterial: alcoholMaterial ? alcoholMaterial._id : null,
    alcoholCostPerGramAtTime: alcoholCostPerGram,
    alcoholTotalCost: Number(alcoholTotalCost.toFixed(2)),
    ingredientSnapshots,
    totalOilsCost: Number(totalOilsCost.toFixed(2)),
    totalBatchCost: Number(totalBatchCost.toFixed(2)),
    costPerGram: Number(costPerGram.toFixed(4)),
    status: 'confirmed',
    productionDate: productionDate || new Date(),
    notes: notes || '',
    createdBy: userId
  });

  return batch;
};

const convertBatchToFinishedProducts = async (batchId, payload, userId) => {
  const batch = await ProductionBatch.findById(batchId);
  if (!batch) {
    throw new AppError('Production batch not found', 404);
  }

  if (batch.status === 'bottled') {
    throw new AppError('This batch has already been fully bottled and converted to finished goods.', 400);
  }

  // Support both single bottling object or productsToBottle array
  let productsToBottle = payload.productsToBottle;
  if (!productsToBottle && payload.productId) {
    productsToBottle = [{
      productId: payload.productId,
      size: payload.variantSize || payload.size || '50ml',
      sku: payload.sku || `${batch.fragranceName}-${payload.variantSize || '50ml'}`.toUpperCase(),
      quantityProduced: payload.unitsBottled || payload.quantityProduced || 1,
      targetWeightGrams: payload.targetWeightGramsPerUnit || payload.targetWeightGrams || 45,
      packagingCosts: payload.packagingCosts || {},
      packagingMaterialsUsed: payload.packagingMaterialsUsed || []
    }];
  }

  if (!Array.isArray(productsToBottle) || productsToBottle.length === 0) {
    throw new AppError('Please provide at least one product size/SKU to bottle', 400);
  }

  const fragrance = await Product.findById(batch.fragrance);
  if (!fragrance) {
    throw new AppError('Associated fragrance product not found', 404);
  }

  let totalRequiredLiquidGrams = Number(payload.lossGrams) || 0;
  const bottledEntries = [];

  for (const item of productsToBottle) {
    const qty = Number(item.quantityProduced || item.unitsBottled) || 0;
    const damaged = Number(item.damagedCount) || 0;
    const testers = Number(item.testerCount) || 0;
    const targetWeight = Number(item.targetWeightGrams || item.targetWeightGramsPerUnit) || (parseInt(item.size) || 50);

    const totalUnits = qty + damaged + testers;
    const liquidUsed = totalUnits * targetWeight;
    totalRequiredLiquidGrams += liquidUsed;

    const liquidCostPerUnit = targetWeight * batch.costPerGram;

    // Packaging costs
    const packagingCosts = item.packagingCosts || {};
    const bottleCost = Number(packagingCosts.bottle) || 0;
    const stickerCost = Number(packagingCosts.sticker) || 0;
    const boxCost = Number(packagingCosts.box) || 0;
    const bagCost = Number(packagingCosts.bag) || 0;
    const otherCost = Number(packagingCosts.other) || 0;
    const packagingCostPerUnit = bottleCost + stickerCost + boxCost + bagCost + otherCost;

    const totalUnitCost = liquidCostPerUnit + packagingCostPerUnit;
    const totalEntryCost = (liquidCostPerUnit * totalUnits) + (packagingCostPerUnit * qty);

    const itemSku = item.sku || `${fragrance.name}-${item.size}`.toUpperCase();

    bottledEntries.push({
      sku: itemSku,
      size: item.size || '50ml',
      targetWeightGrams: targetWeight,
      quantityProduced: qty,
      damagedCount: damaged,
      testerCount: testers,
      packagingCostPerUnit: Number(packagingCostPerUnit.toFixed(2)),
      liquidCostPerUnit: Number(liquidCostPerUnit.toFixed(2)),
      totalUnitCost: Number(totalUnitCost.toFixed(2)),
      totalCost: Number(totalEntryCost.toFixed(2))
    });

    // Update finished goods inventory on Product.variants
    let variant = fragrance.variants.find(v => v.SKU === itemSku || v.size?.toLowerCase() === (item.size || '').toLowerCase());
    
    if (!variant) {
      // Create variant if does not exist yet
      fragrance.variants.push({
        size: item.size || '50ml',
        price: (parseInt(item.size) || 50) > 50 ? 1200 : 750,
        costPrice: Number(totalUnitCost.toFixed(2)),
        targetWeightGrams: targetWeight,
        packagingCosts: {
          bottle: bottleCost,
          sticker: stickerCost,
          box: boxCost,
          bag: bagCost,
          other: otherCost
        },
        stock: qty,
        SKU: itemSku
      });
      variant = fragrance.variants[fragrance.variants.length - 1];
    } else {
      const beforeStock = variant.stock || 0;
      const newStock = beforeStock + qty;
      variant.stock = newStock;

      // Update variant costPrice using Weighted Average if previous stock existed
      if (beforeStock > 0 && variant.costPrice > 0) {
        const totalPreviousValue = beforeStock * variant.costPrice;
        const totalNewValue = qty * totalUnitCost;
        variant.costPrice = Number(((totalPreviousValue + totalNewValue) / newStock).toFixed(2));
      } else {
        variant.costPrice = Number(totalUnitCost.toFixed(2));
      }
    }

    await StockMovement.create({
      itemType: 'ProductVariant',
      product: fragrance._id,
      variantSKU: variant.SKU,
      itemName: `${fragrance.name} (${variant.size})`,
      movementType: 'FINISHED_PRODUCT_CREATED',
      quantityBefore: variant.stock - qty,
      quantityChange: qty,
      quantityAfter: variant.stock,
      unit: 'bottle',
      unitCost: Number(totalUnitCost.toFixed(2)),
      totalValue: qty * totalUnitCost,
      reason: `Bottled from batch ${batch.batchNumber}`,
      referenceId: batch.batchNumber,
      referenceType: 'ProductionBatch',
      createdBy: userId
    });

    // Deduct packaging materials if explicit IDs were passed
    if (Array.isArray(item.packagingMaterialsUsed)) {
      for (const pMat of item.packagingMaterialsUsed) {
        if (pMat.rawMaterialId && pMat.quantity > 0) {
          const rawMat = await RawMaterial.findById(pMat.rawMaterialId);
          if (rawMat) {
            const beforeStock = rawMat.currentStock || 0;
            rawMat.currentStock = Math.max(0, beforeStock - pMat.quantity);
            await rawMat.save();

            await StockMovement.create({
              itemType: 'RawMaterial',
              rawMaterial: rawMat._id,
              itemName: rawMat.name,
              movementType: 'BATCH_PRODUCTION',
              quantityBefore: beforeStock,
              quantityChange: -pMat.quantity,
              quantityAfter: rawMat.currentStock,
              unit: rawMat.unit || 'pcs',
              unitCost: rawMat.costPerGram,
              totalValue: pMat.quantity * (rawMat.costPerGram || 0),
              reason: `Packaging consumed for bottling batch ${batch.batchNumber}`,
              referenceId: batch.batchNumber,
              referenceType: 'ProductionBatch',
              createdBy: userId
            });
          }
        }
      }
    }
  }

  await fragrance.save();

  batch.bottledProducts = bottledEntries;
  batch.productionLossGrams = Number(payload.lossGrams) || 0;
  batch.status = 'bottled';
  await batch.save();

  return batch;
};

const cancelBatch = async (batchId, reason = '', userId) => {
  const batch = await ProductionBatch.findById(batchId);
  if (!batch) {
    throw new AppError('Production batch not found', 404);
  }

  if (batch.status === 'bottled') {
    throw new AppError('Cannot cancel a batch that has already been bottled into finished goods.', 400);
  }

  if (batch.status === 'confirmed') {
    // Revert raw materials consumed
    for (const snap of batch.ingredientSnapshots) {
      const mat = await RawMaterial.findById(snap.rawMaterial);
      if (mat) {
        const before = mat.currentStock || 0;
        mat.currentStock = before + snap.gramsUsed;
        await mat.save();

        await StockMovement.create({
          itemType: 'RawMaterial',
          rawMaterial: mat._id,
          itemName: mat.name,
          movementType: 'MANUAL_ADJUSTMENT',
          quantityBefore: before,
          quantityChange: snap.gramsUsed,
          quantityAfter: mat.currentStock,
          unit: 'gram',
          unitCost: snap.costPerGramAtTime,
          totalValue: snap.totalCost,
          reason: `Reversal of cancelled batch ${batch.batchNumber}: ${reason}`,
          referenceId: batch.batchNumber,
          referenceType: 'ProductionBatch',
          createdBy: userId
        });
      }
    }

    // Revert alcohol
    if (batch.alcoholRawMaterial && batch.alcoholWeight > 0) {
      const alcMat = await RawMaterial.findById(batch.alcoholRawMaterial);
      if (alcMat) {
        const before = alcMat.currentStock || 0;
        alcMat.currentStock = before + batch.alcoholWeight;
        await alcMat.save();

        await StockMovement.create({
          itemType: 'RawMaterial',
          rawMaterial: alcMat._id,
          itemName: alcMat.name,
          movementType: 'MANUAL_ADJUSTMENT',
          quantityBefore: before,
          quantityChange: batch.alcoholWeight,
          quantityAfter: alcMat.currentStock,
          unit: 'gram',
          unitCost: batch.alcoholCostPerGramAtTime,
          totalValue: batch.alcoholTotalCost,
          reason: `Reversal of alcohol in cancelled batch ${batch.batchNumber}: ${reason}`,
          referenceId: batch.batchNumber,
          referenceType: 'ProductionBatch',
          createdBy: userId
        });
      }
    }
  }

  batch.status = 'cancelled';
  batch.notes = `${batch.notes || ''} [CANCELLED: ${reason}]`.trim();
  await batch.save();

  return batch;
};

module.exports = {
  getAllBatches,
  getBatchById,
  previewBatchCalculation,
  createAndConfirmBatch,
  convertBatchToFinishedProducts,
  cancelBatch
};
