const RawMaterial = require('./rawMaterial.model');
const StockMovement = require('./stockMovement.model');
const AppError = require('../../utils/errors/appError');

const getAllRawMaterials = async (query = {}) => {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.active !== undefined) filter.active = query.active === 'true' || query.active === true;
  if (query.search) {
    filter.name = { $regex: query.search.trim(), $options: 'i' };
  }

  const rawMaterials = await RawMaterial.find(filter).sort({ category: 1, name: 1 });
  return rawMaterials;
};

const getRawMaterialById = async (id) => {
  const material = await RawMaterial.findById(id);
  if (!material) {
    throw new AppError('Raw material not found', 404);
  }
  return material;
};

const createRawMaterial = async (data, userId) => {
  const existing = await RawMaterial.findOne({ name: data.name.trim() });
  if (existing) {
    throw new AppError(`Raw material with name "${data.name}" already exists.`, 400);
  }

  const initialStock = Number(data.currentStock) || 0;
  const costPerGram = Number(data.costPerGram) || 0;

  const rawMaterial = await RawMaterial.create({
    name: data.name.trim(),
    category: data.category || 'fragrance_oil',
    unit: 'gram',
    currentStock: initialStock,
    costPerGram: costPerGram,
    lowStockThreshold: Number(data.lowStockThreshold) || 100,
    supplier: data.supplier || '',
    notes: data.notes || '',
    active: data.active !== undefined ? data.active : true
  });

  if (initialStock > 0) {
    await StockMovement.create({
      itemType: 'RawMaterial',
      rawMaterial: rawMaterial._id,
      itemName: rawMaterial.name,
      movementType: 'MANUAL_ADJUSTMENT',
      quantityBefore: 0,
      quantityChange: initialStock,
      quantityAfter: initialStock,
      unit: 'gram',
      unitCost: costPerGram,
      totalValue: initialStock * costPerGram,
      reason: 'Initial stock on creation',
      referenceId: rawMaterial._id.toString(),
      referenceType: 'RawMaterialCreation',
      createdBy: userId
    });
  }

  return rawMaterial;
};

const updateRawMaterial = async (id, data, userId) => {
  const material = await RawMaterial.findById(id);
  if (!material) {
    throw new AppError('Raw material not found', 404);
  }

  if (data.name) material.name = data.name.trim();
  if (data.category) material.category = data.category;
  if (data.unit) material.unit = data.unit;
  if (data.costPerGram !== undefined) material.costPerGram = Math.max(0, Number(data.costPerGram));
  if (data.lowStockThreshold !== undefined) material.lowStockThreshold = Math.max(0, Number(data.lowStockThreshold));
  if (data.supplier !== undefined) material.supplier = data.supplier;
  if (data.notes !== undefined) material.notes = data.notes;
  if (data.active !== undefined) material.active = data.active;

  if (data.currentStock !== undefined && data.currentStock !== '' && !isNaN(Number(data.currentStock))) {
    const newStock = Math.max(0, Number(data.currentStock));
    const oldStock = material.currentStock || 0;
    if (newStock !== oldStock) {
      material.currentStock = newStock;
      await StockMovement.create({
        itemType: 'RawMaterial',
        rawMaterial: material._id,
        itemName: material.name,
        movementType: 'MANUAL_ADJUSTMENT',
        quantityBefore: oldStock,
        quantityChange: newStock - oldStock,
        quantityAfter: newStock,
        unit: material.unit || 'gram',
        unitCost: material.costPerGram || 0,
        totalValue: (newStock - oldStock) * (material.costPerGram || 0),
        reason: 'Direct edit in raw material form',
        referenceId: material._id.toString(),
        referenceType: 'RawMaterialEdit',
        createdBy: userId || null
      });
    }
  }

  await material.save();
  return material;
};

const adjustStock = async (id, { quantityChange, type = 'MANUAL_ADJUSTMENT', reason = '' }, userId) => {
  const material = await RawMaterial.findById(id);
  if (!material) {
    throw new AppError('Raw material not found', 404);
  }

  const change = Number(quantityChange);
  if (isNaN(change) || change === 0) {
    throw new AppError('Quantity change must be a non-zero number in grams', 400);
  }

  const before = material.currentStock || 0;
  const after = before + change;

  if (after < 0) {
    throw new AppError(`Cannot subtract ${Math.abs(change)}g. Current stock is only ${before}g.`, 400);
  }

  material.currentStock = after;
  await material.save();

  const movement = await StockMovement.create({
    itemType: 'RawMaterial',
    rawMaterial: material._id,
    itemName: material.name,
    movementType: type,
    quantityBefore: before,
    quantityChange: change,
    quantityAfter: after,
    unit: 'gram',
    unitCost: material.costPerGram,
    totalValue: Math.abs(change) * material.costPerGram,
    reason: reason || 'Manual stock adjustment',
    referenceId: material._id.toString(),
    referenceType: 'RawMaterialAdjustment',
    createdBy: userId
  });

  return { material, movement };
};

const getLowStockAlerts = async () => {
  const materials = await RawMaterial.find({ active: true });
  const lowStock = materials.filter((m) => (m.currentStock || 0) <= (m.lowStockThreshold || 0));
  return lowStock;
};

const getStockHistory = async (id) => {
  const history = await StockMovement.find({ rawMaterial: id })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name phone email');
  return history;
};

const deleteRawMaterial = async (id) => {
  const material = await RawMaterial.findById(id);
  if (!material) {
    throw new AppError('Raw material not found', 404);
  }
  await RawMaterial.findByIdAndDelete(id);
  return { id };
};

const getStockMovements = async (query = {}) => {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.movementType) filter.movementType = query.movementType;
  const movements = await StockMovement.find(filter)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name phone email');
  return movements;
};

module.exports = {
  getAllRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  adjustStock,
  getLowStockAlerts,
  getStockHistory,
  getStockMovements
};

