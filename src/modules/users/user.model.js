const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationCode: {
      type: String,
      default: null,
      select: false
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false
    },
    password: {
      type: String,
      default: null,
      select: false
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'superadmin'],
      default: 'customer',
      index: true
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    isFirst100: {
      type: Boolean,
      default: false,
      index: true
    },
    firstOrderNumber: {
      type: String,
      default: null
    },
    foundingRank: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
