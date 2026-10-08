const mongoose = require('mongoose');

const accountTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['INCOME', 'EXPENSE', 'PURCHASE', 'SALE', 'TRANSFER', 'REFUND', 'MANUAL_ADJUSTMENT']
    },
    amount: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    referenceId: {
      type: String,
      default: null
    },
    referenceType: {
      type: String,
      default: null
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { _id: true, timestamps: true }
);

const cashAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      unique: true
    },
    type: {
      type: String,
      required: true,
      enum: ['cash', 'digital_wallet', 'bank', 'online_gateway', 'other'],
      default: 'cash'
    },
    accountIdentifier: {
      type: String,
      default: '',
      trim: true
    },
    balance: {
      type: Number,
      required: true,
      default: 0
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    },
    transactions: [accountTransactionSchema]
  },
  {
    timestamps: true
  }
);

const CashAccount = mongoose.model('CashAccount', cashAccountSchema);

module.exports = CashAccount;
