const Expense = require('./expense.model');
const CashAccount = require('../finance/cashAccount.model');
const AppError = require('../../utils/errors/appError');

const getAllExpenses = async (query = {}) => {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.startDate && query.endDate) {
    filter.date = {
      $gte: new Date(query.startDate),
      $lte: new Date(query.endDate)
    };
  }

  const expenses = await Expense.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate('paymentAccount', 'name type')
    .populate('createdBy', 'name phone email');

  return expenses;
};

const getExpenseById = async (id) => {
  const expense = await Expense.findById(id)
    .populate('paymentAccount')
    .populate('createdBy', 'name phone email');

  if (!expense) {
    throw new AppError('Expense record not found', 404);
  }
  return expense;
};

const generateExpenseNumber = async () => {
  const count = await Expense.countDocuments();
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, '0');
  return `EXP-${year}-${seq}`;
};

const createExpense = async (data, userId) => {
  const { title, category, amount, paymentAccountId, date, attachmentUrl, notes } = data;

  const expAmount = Number(amount);
  if (!expAmount || expAmount <= 0) {
    throw new AppError('Expense amount must be greater than 0', 400);
  }

  let paymentAccountDoc = null;
  if (paymentAccountId) {
    paymentAccountDoc = await CashAccount.findById(paymentAccountId);
    if (paymentAccountDoc) {
      paymentAccountDoc.balance -= expAmount;
      paymentAccountDoc.transactions.push({
        type: 'EXPENSE',
        amount: -expAmount,
        balanceAfter: paymentAccountDoc.balance,
        description: `Operating expense: ${title} (${category})`,
        date: date || new Date(),
        createdBy: userId
      });
      await paymentAccountDoc.save();
    }
  }

  const expenseNumber = await generateExpenseNumber();

  const expense = await Expense.create({
    expenseNumber,
    title: title.trim(),
    category: category || 'Other',
    amount: expAmount,
    paymentAccount: paymentAccountDoc ? paymentAccountDoc._id : null,
    paymentAccountName: paymentAccountDoc ? paymentAccountDoc.name : '',
    date: date || new Date(),
    attachmentUrl: attachmentUrl || null,
    notes: notes || '',
    createdBy: userId
  });

  return expense;
};

const deleteExpense = async (id) => {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Revert payment account if applicable
  if (expense.paymentAccount) {
    const account = await CashAccount.findById(expense.paymentAccount);
    if (account) {
      account.balance += expense.amount;
      account.transactions.push({
        type: 'MANUAL_ADJUSTMENT',
        amount: expense.amount,
        balanceAfter: account.balance,
        description: `Reversal of deleted expense ${expense.expenseNumber} (${expense.title})`,
        date: new Date()
      });
      await account.save();
    }
  }

  await Expense.findByIdAndDelete(id);
  return { success: true };
};

const getExpensesSummary = async (query = {}) => {
  const filter = {};
  if (query.startDate && query.endDate) {
    filter.date = {
      $gte: new Date(query.startDate),
      $lte: new Date(query.endDate)
    };
  }

  const expenses = await Expense.find(filter);
  let totalExpenses = 0;
  const byCategory = {};

  expenses.forEach((e) => {
    totalExpenses += e.amount || 0;
    byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
  });

  return {
    totalExpenses,
    byCategory,
    count: expenses.length
  };
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  deleteExpense,
  getExpensesSummary
};

