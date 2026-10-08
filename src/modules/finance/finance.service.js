const CashAccount = require('./cashAccount.model');
const StockMovement = require('../inventory/stockMovement.model');
const RawMaterial = require('../inventory/rawMaterial.model');
const Product = require('../products/product.model');
const Order = require('../orders/order.model');
const Expense = require('../expenses/expense.model');
const Purchase = require('../purchases/purchase.model');
const ProductionBatch = require('../batches/batch.model');
const AppError = require('../../utils/errors/appError');

// Ensure default cash accounts exist
const ensureDefaultAccounts = async () => {
  const count = await CashAccount.countDocuments();
  if (count === 0) {
    await CashAccount.create([
      { name: 'Vodafone Cash', type: 'digital_wallet', accountIdentifier: '01012345678', balance: 0 },
      { name: 'InstaPay', type: 'digital_wallet', accountIdentifier: 'elan.perfumes@instapay', balance: 0 },
      { name: 'Cash on Hand', type: 'cash', accountIdentifier: 'Main Safe', balance: 0 },
      { name: 'Bank Account', type: 'bank', accountIdentifier: 'CIB - Main', balance: 0 },
      { name: 'Payment Gateway', type: 'online_gateway', accountIdentifier: 'Fawaterk Gateway', balance: 0 }
    ]);
  }
};

const getCashAccounts = async () => {
  await ensureDefaultAccounts();
  const accounts = await CashAccount.find().sort({ name: 1 });
  return accounts;
};

const getCashAccountById = async (id) => {
  const account = await CashAccount.findById(id);
  if (!account) {
    throw new AppError('Cash account not found', 404);
  }
  return account;
};

const createCashAccount = async (data) => {
  const existing = await CashAccount.findOne({ name: data.name.trim() });
  if (existing) {
    throw new AppError(`Account with name "${data.name}" already exists.`, 400);
  }

  const account = await CashAccount.create({
    name: data.name.trim(),
    type: data.type || 'cash',
    accountIdentifier: data.accountIdentifier || '',
    balance: Number(data.initialBalance) || 0,
    notes: data.notes || '',
    active: data.active !== undefined ? data.active : true
  });

  return account;
};

const updateCashAccount = async (id, data) => {
  const account = await CashAccount.findById(id);
  if (!account) {
    throw new AppError('Account not found', 404);
  }

  if (data.name) account.name = data.name.trim();
  if (data.type) account.type = data.type;
  if (data.accountIdentifier !== undefined) account.accountIdentifier = data.accountIdentifier;
  if (data.notes !== undefined) account.notes = data.notes;
  if (data.active !== undefined) account.active = data.active;

  await account.save();
  return account;
};

const adjustAccountBalance = async (id, { amount, type = 'MANUAL_ADJUSTMENT', description = '' }, userId) => {
  const account = await CashAccount.findById(id);
  if (!account) {
    throw new AppError('Cash account not found', 404);
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt === 0) {
    throw new AppError('Adjustment amount must be non-zero', 400);
  }

  account.balance += amt;
  account.transactions.push({
    type,
    amount: amt,
    balanceAfter: account.balance,
    description: description || 'Manual balance adjustment',
    date: new Date(),
    createdBy: userId
  });

  await account.save();
  return account;
};

const getStockMovements = async (query = {}) => {
  const filter = {};
  if (query.itemType) filter.itemType = query.itemType;
  if (query.movementType) filter.movementType = query.movementType;
  if (query.rawMaterial) filter.rawMaterial = query.rawMaterial;
  if (query.product) filter.product = query.product;
  if (query.startDate && query.endDate) {
    filter.createdAt = {
      $gte: new Date(query.startDate),
      $lte: new Date(query.endDate)
    };
  }

  const limit = Math.min(100, Number(query.limit) || 50);
  const page = Math.max(1, Number(query.page) || 1);
  const skip = (page - 1) * limit;

  const [total, movements] = await Promise.all([
    StockMovement.countDocuments(filter),
    StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name phone email')
  ]);

  return {
    total,
    page,
    pages: Math.ceil(total / limit),
    movements
  };
};

const getFinanceOverview = async (query = {}) => {
  await ensureDefaultAccounts();

  // Date filter setup
  const dateFilter = {};
  if (query.startDate && query.endDate) {
    dateFilter.createdAt = {
      $gte: new Date(query.startDate),
      $lte: new Date(query.endDate)
    };
  }

  // 1. Orders Revenue & COGS
  const orderFilter = {
    orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
    ...dateFilter
  };

  const [orders, products, rawMaterials, expenses, purchases, cashAccounts] = await Promise.all([
    Order.find(orderFilter),
    Product.find(),
    RawMaterial.find(),
    Expense.find(query.startDate && query.endDate ? { date: { $gte: new Date(query.startDate), $lte: new Date(query.endDate) } } : {}),
    Purchase.find(query.startDate && query.endDate ? { purchaseDate: { $gte: new Date(query.startDate), $lte: new Date(query.endDate) } } : {}),
    CashAccount.find()
  ]);

  // Build a fast lookup for variant costPrice
  const skuCostMap = {};
  products.forEach(p => {
    (p.variants || []).forEach(v => {
      skuCostMap[v.SKU] = v.costPrice || 0;
    });
  });

  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalDeliveredOrdersCount = 0;

  orders.forEach(order => {
    totalRevenue += order.total || 0;
    if (order.orderStatus === 'delivered' || order.paymentStatus === 'paid') {
      totalDeliveredOrdersCount++;
    }

    (order.items || []).forEach(item => {
      const unitCost = skuCostMap[item.variantSKU] || (item.price * 0.35); // fallback to 35% if cost not set
      totalCOGS += unitCost * (item.quantity || 1);
    });
  });

  const grossProfit = totalRevenue - totalCOGS;
  const grossMarginPercent = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;

  // 2. Operating Expenses
  let totalOperatingExpenses = 0;
  const expensesByCategory = {};

  expenses.forEach(exp => {
    const amt = exp.amount || 0;
    totalOperatingExpenses += amt;
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + amt;
  });

  // Net Profit = Gross Profit - Operating Expenses (Purchases are inventory, NOT subtracted again)
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  // 3. Purchases & Inventory Valuation
  let totalPurchasesAmount = 0;
  purchases.forEach(p => {
    totalPurchasesAmount += p.totalAmount || 0;
  });

  // Raw Materials Inventory Value: currentStock * costPerGram
  let rawMaterialInventoryValue = 0;
  let fragranceOilsValue = 0;
  let alcoholValue = 0;
  let packagingValue = 0;

  rawMaterials.forEach(rm => {
    const val = (rm.currentStock || 0) * (rm.costPerGram || 0);
    rawMaterialInventoryValue += val;
    if (rm.category === 'fragrance_oil') fragranceOilsValue += val;
    else if (rm.category === 'alcohol') alcoholValue += val;
    else packagingValue += val;
  });

  // Finished Goods Inventory Value: stock * costPrice
  let finishedGoodsInventoryValue = 0;
  let finishedGoodsRetailValue = 0;
  let totalFinishedUnits = 0;

  products.forEach(p => {
    (p.variants || []).forEach(v => {
      const stock = v.stock || 0;
      totalFinishedUnits += stock;
      finishedGoodsInventoryValue += stock * (v.costPrice || 0);
      finishedGoodsRetailValue += stock * (v.price || 0);
    });
  });

  const totalInventoryValue = rawMaterialInventoryValue + finishedGoodsInventoryValue;

  // 4. Cash / Liquid Balances
  let totalCashBalance = 0;
  const accountBalances = cashAccounts.map(acc => {
    totalCashBalance += acc.balance || 0;
    return {
      id: acc._id,
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      identifier: acc.accountIdentifier
    };
  });

  return {
    revenue: Number(totalRevenue.toFixed(2)),
    cogs: Number(totalCOGS.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossMarginPercent,
    operatingExpenses: Number(totalOperatingExpenses.toFixed(2)),
    expensesByCategory,
    netProfit: Number(netProfit.toFixed(2)),
    netMarginPercent,
    purchasesTotal: Number(totalPurchasesAmount.toFixed(2)),
    inventoryValuation: {
      rawMaterialsValue: Number(rawMaterialInventoryValue.toFixed(2)),
      fragranceOilsValue: Number(fragranceOilsValue.toFixed(2)),
      alcoholValue: Number(alcoholValue.toFixed(2)),
      packagingValue: Number(packagingValue.toFixed(2)),
      finishedGoodsCostValue: Number(finishedGoodsInventoryValue.toFixed(2)),
      finishedGoodsRetailValue: Number(finishedGoodsRetailValue.toFixed(2)),
      totalFinishedUnits,
      totalInventoryValue: Number(totalInventoryValue.toFixed(2))
    },
    cashBalances: {
      total: Number(totalCashBalance.toFixed(2)),
      accounts: accountBalances
    }
  };
};

const getReports = async (reportType, query = {}) => {
  const dateFilter = {};
  if (query.startDate && query.endDate) {
    dateFilter.createdAt = {
      $gte: new Date(query.startDate),
      $lte: new Date(query.endDate)
    };
  }

  switch (reportType) {
    case 'sales-by-fragrance': {
      const orders = await Order.find({
        orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
        ...dateFilter
      });

      const fragranceSales = {};
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          const name = item.productName || 'Unknown Fragrance';
          if (!fragranceSales[name]) {
            fragranceSales[name] = { name, unitsSold: 0, revenue: 0, cogs: 0, grossProfit: 0 };
          }
          const units = item.quantity || 1;
          const rev = (item.price || 0) * units;
          const unitCost = (item.price || 0) * 0.35;
          const cogs = unitCost * units;

          fragranceSales[name].unitsSold += units;
          fragranceSales[name].revenue += rev;
          fragranceSales[name].cogs += cogs;
          fragranceSales[name].grossProfit += rev - cogs;
        });
      });

      return Object.values(fragranceSales).sort((a, b) => b.revenue - a.revenue);
    }

    case 'sales-by-size': {
      const orders = await Order.find({
        orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
        ...dateFilter
      });

      const sizeSales = {};
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          const size = item.size || '50ml';
          if (!sizeSales[size]) {
            sizeSales[size] = { size, unitsSold: 0, revenue: 0 };
          }
          const units = item.quantity || 1;
          sizeSales[size].unitsSold += units;
          sizeSales[size].revenue += (item.price || 0) * units;
        });
      });

      return Object.values(sizeSales).sort((a, b) => b.unitsSold - a.unitsSold);
    }

    case 'batch-cost-history': {
      const batches = await ProductionBatch.find(dateFilter)
        .sort({ createdAt: -1 })
        .populate('fragrance', 'name')
        .populate('formula', 'version');
      return batches;
    }

    default:
      return await getFinanceOverview(query);
  }
};

module.exports = {
  getCashAccounts,
  getCashAccountById,
  createCashAccount,
  updateCashAccount,
  adjustAccountBalance,
  getStockMovements,
  getFinanceOverview,
  getReports
};
