const Purchase = require('./purchase.model');
const RawMaterial = require('../inventory/rawMaterial.model');
const StockMovement = require('../inventory/stockMovement.model');
const CashAccount = require('../finance/cashAccount.model');
const AppError = require('../../utils/errors/appError');

const getAllPurchases = async (query = {}) => {
  const purchases = await Purchase.find(query)
    .sort({ createdAt: -1 })
    .populate('items.rawMaterial', 'name category unit')
    .populate('paymentAccount', 'name type')
    .populate('createdBy', 'name phone email');

  return purchases;
};

const getPurchaseById = async (id) => {
  const purchase = await Purchase.findById(id)
    .populate('items.rawMaterial')
    .populate('paymentAccount')
    .populate('createdBy', 'name phone email');

  if (!purchase) {
    throw new AppError('Purchase record not found', 404);
  }
  return purchase;
};

const generatePurchaseNumber = async () => {
  const count = await Purchase.countDocuments();
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, '0');
  return `PUR-${year}-${seq}`;
};

const createPurchase = async (data, userId) => {
  const {
    supplier,
    invoiceNumber,
    purchaseDate,
    items,
    paymentAccountId,
    paymentAccount,
    shippingFee = 0,
    transportCost = 0,
    taxFee = 0,
    attachmentUrl,
    notes
  } = data;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Purchase must contain at least one raw material item', 400);
  }

  const extraAcquisitionCosts = (Number(shippingFee) || 0) + (Number(transportCost) || 0) + (Number(taxFee) || 0);

  // Calculate base total items cost to apportion extra acquisition costs proportionally
  const baseItemsTotal = items.reduce((sum, item) => {
    const itemQty = Number(item.quantityGrams || item.quantity) || 0;
    const itemCost = Number(item.totalCost) || (itemQty * (Number(item.unitCost) || 0));
    return sum + itemCost;
  }, 0);

  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    let rawMaterial = null;

    if (item.rawMaterial) {
      rawMaterial = await RawMaterial.findById(item.rawMaterial);
    } else if (item.name) {
      // Find or create
      rawMaterial = await RawMaterial.findOne({ name: item.name.trim() });
      if (!rawMaterial) {
        rawMaterial = await RawMaterial.create({
          name: item.name.trim(),
          category: item.category || 'fragrance_oil',
          unit: item.unit || 'gram',
          currentStock: 0,
          costPerGram: 0,
          supplier: supplier || '',
          lowStockThreshold: Number(item.lowStockThreshold) || 100
        });
      }
    }

    if (!rawMaterial) {
      throw new AppError(`Raw material reference or name is missing.`, 400);
    }

    const qty = Number(item.quantityGrams || item.quantity);
    let itemBaseCost = Number(item.totalCost);
    if (isNaN(itemBaseCost) || itemBaseCost <= 0) {
      itemBaseCost = qty * (Number(item.unitCost) || 0);
    }

    if (!qty || qty <= 0) {
      throw new AppError(`Invalid quantity for ${rawMaterial.name}. Must be greater than 0.`, 400);
    }

    // Apportion extra transport/acquisition cost proportionally
    const costRatio = baseItemsTotal > 0 ? itemBaseCost / baseItemsTotal : 1 / items.length;
    const itemTransportShare = extraAcquisitionCosts * costRatio;
    const itemEffectiveTotalCost = itemBaseCost + itemTransportShare;
    const costPerGram = itemEffectiveTotalCost / qty;

    totalAmount += itemEffectiveTotalCost;

    const previousStock = rawMaterial.currentStock || 0;
    const previousCostPerGram = rawMaterial.costPerGram || 0;

    // Weighted Average Cost Formula:
    // (PreviousStock * PreviousCost + NewQty * NewCost) / (PreviousStock + NewQty)
    let newWeightedCostPerGram = costPerGram;
    const newTotalStock = previousStock + qty;

    if (newTotalStock > 0) {
      const previousTotalValue = previousStock * previousCostPerGram;
      newWeightedCostPerGram = Number(((previousTotalValue + itemEffectiveTotalCost) / newTotalStock).toFixed(4));
    }

    // Update raw material inventory and weighted average cost
    rawMaterial.currentStock = newTotalStock;
    rawMaterial.costPerGram = newWeightedCostPerGram;
    if (supplier) rawMaterial.supplier = supplier.trim();
    await rawMaterial.save();

    processedItems.push({
      rawMaterial: rawMaterial._id,
      rawMaterialName: rawMaterial.name,
      quantityGrams: qty,
      totalCost: Number(itemEffectiveTotalCost.toFixed(2)),
      costPerGram: Number(costPerGram.toFixed(4)),
      previousStock,
      previousCostPerGram,
      newWeightedCostPerGram
    });

    // Record Stock Movement
    await StockMovement.create({
      itemType: 'RawMaterial',
      rawMaterial: rawMaterial._id,
      itemName: rawMaterial.name,
      movementType: 'PURCHASE',
      quantityBefore: previousStock,
      quantityChange: qty,
      quantityAfter: newTotalStock,
      unit: rawMaterial.unit || 'gram',
      unitCost: costPerGram,
      totalValue: itemEffectiveTotalCost,
      reason: `Purchased from ${supplier || 'supplier'} (Invoice: ${invoiceNumber || 'N/A'})${extraAcquisitionCosts > 0 ? ` incl. transport share: ${itemTransportShare.toFixed(2)}` : ''}`,
      referenceType: 'Purchase',
      createdBy: userId
    });
  }

  // Handle cash/payment account deduction if selected
  const accountId = paymentAccountId || paymentAccount;
  let paymentAccountDoc = null;
  if (accountId) {
    paymentAccountDoc = await CashAccount.findById(accountId);
    if (paymentAccountDoc) {
      paymentAccountDoc.balance -= totalAmount;
      paymentAccountDoc.transactions.push({
        type: 'PURCHASE',
        amount: -totalAmount,
        balanceAfter: paymentAccountDoc.balance,
        description: `Raw material purchase from ${supplier || 'supplier'} (Invoice: ${invoiceNumber || 'N/A'})`,
        date: purchaseDate || new Date(),
        createdBy: userId
      });
      await paymentAccountDoc.save();
    }
  }

  const purchaseNumber = await generatePurchaseNumber();

  const purchase = await Purchase.create({
    purchaseNumber,
    supplier: supplier || '',
    invoiceNumber: invoiceNumber || '',
    purchaseDate: purchaseDate || new Date(),
    items: processedItems,
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentAccount: paymentAccountDoc ? paymentAccountDoc._id : null,
    paymentAccountName: paymentAccountDoc ? paymentAccountDoc.name : '',
    attachmentUrl: attachmentUrl || null,
    notes: notes || '',
    createdBy: userId
  });

  return purchase;
};

const deletePurchase = async (id) => {
  const purchase = await Purchase.findById(id);
  if (!purchase) {
    throw new AppError('Purchase not found', 404);
  }

  // Revert cash account balance if was deducted
  if (purchase.paymentAccount) {
    const account = await CashAccount.findById(purchase.paymentAccount);
    if (account) {
      account.balance += purchase.totalAmount;
      account.transactions.push({
        type: 'MANUAL_ADJUSTMENT',
        amount: purchase.totalAmount,
        balanceAfter: account.balance,
        description: `Reversal of deleted purchase ${purchase.purchaseNumber}`,
        date: new Date()
      });
      await account.save();
    }
  }

  await Purchase.findByIdAndDelete(id);
  return { success: true };
};

module.exports = {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  deletePurchase
};
