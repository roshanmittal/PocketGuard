const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: ['income', 'expense', 'lend', 'borrow', 'repayment'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lendingRelationship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LendingRelationship',
      default: null,
    },
    isExternal: {
      type: Boolean,
      default: false,
    },
    externalContact: {
      name: { type: String, trim: true },
      mobile: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'completed',
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups
transactionSchema.index({ sender: 1, date: -1 });
transactionSchema.index({ receiver: 1, date: -1 });
transactionSchema.index({ lendingRelationship: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
