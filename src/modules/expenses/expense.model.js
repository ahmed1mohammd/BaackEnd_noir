const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: [
        'Hosting',
        'Photography',
        'Transportation',
        'Marketing',
        'Printing',
        'Office',
        'Equipment',
        'Packaging_Supplies',
        'Utilities',
        'Salaries',
        'Other'
      ],
      default: 'Other',
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    paymentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashAccount',
      default: null
    },
    paymentAccountName: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    attachmentUrl: {
      type: String,
      default: null
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

expenseSchema.index({ date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
