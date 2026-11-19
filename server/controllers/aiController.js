const Transaction = require('../models/Transaction');
const LendingRelationship = require('../models/LendingRelationship');
const User = require('../models/User');
const { generateFinancialSummary, answerFinancialQuery } = require('../services/aiService');
const { createLendingTransaction } = require('./lendingController');
const { emitToUser } = require('../sockets/socketManager');

// @desc    Get AI-powered financial summary and analysis (Financial Insights)
// @route   GET /api/ai/summary
// @access  Private
const getAiSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch user for current wallet balance
    const user = await User.findById(userId);

    // Fetch transactions
    const transactions = await Transaction.find({
      $or: [{ createdBy: userId }, { sender: userId }, { receiver: userId }],
    }).sort({ date: -1 });

    // Fetch lending relationships
    const lendingRelationships = await LendingRelationship.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA', 'name mobile email profileImage')
      .populate('userB', 'name mobile email profileImage');

    const summary = await generateFinancialSummary(
      transactions,
      lendingRelationships,
      userId,
      req.user.name,
      user?.walletBalance || 0
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ask AI assistant a natural language financial question or issue transaction command
// @route   POST /api/ai/query
// @access  Private
const queryAiAssistant = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Question prompt is required' });
    }

    const user = await User.findById(userId);

    const transactions = await Transaction.find({
      $or: [{ createdBy: userId }, { sender: userId }, { receiver: userId }],
    }).sort({ date: -1 });

    const lendingRelationships = await LendingRelationship.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA', 'name mobile email profileImage')
      .populate('userB', 'name mobile email profileImage');

    const result = await answerFinancialQuery(
      query.trim(),
      transactions,
      lendingRelationships,
      userId,
      req.user.name,
      user?.walletBalance || 0
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Execute confirmed financial transaction action from AI Assistant
// @route   POST /api/ai/execute-action
// @access  Private
const executeAiTransaction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { actionType, data } = req.body;

    if (!actionType || !data) {
      return res.status(400).json({ success: false, message: 'Action type and data payload are required' });
    }

    const numAmount = Number(data.amount);
    const date = data.date ? new Date(data.date) : new Date();

    // 1. ADD INCOME
    if (actionType === 'create_income') {
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
      }

      const tx = await Transaction.create({
        type: 'income',
        amount: numAmount,
        category: data.category || 'Salary',
        description: data.description || (data.contactName ? `Received from ${data.contactName}` : 'Income added'),
        createdBy: userId,
        status: 'completed',
        date,
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { walletBalance: numAmount } },
        { new: true }
      );

      emitToUser(userId, 'wallet:update', { walletBalance: updatedUser.walletBalance });
      emitToUser(userId, 'transaction:new', tx);

      return res.status(201).json({
        success: true,
        message: `Income of ₹${numAmount.toLocaleString('en-IN')} successfully recorded.`,
        data: {
          transaction: tx,
          walletBalance: updatedUser.walletBalance,
        },
      });
    }

    // 2. ADD EXPENSE
    if (actionType === 'create_expense') {
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
      }

      const tx = await Transaction.create({
        type: 'expense',
        amount: numAmount,
        category: data.category || 'Food',
        description: data.description || `${data.category || 'Expense'} recorded`,
        createdBy: userId,
        status: 'completed',
        date,
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { walletBalance: -numAmount } },
        { new: true }
      );

      emitToUser(userId, 'wallet:update', { walletBalance: updatedUser.walletBalance });
      emitToUser(userId, 'transaction:new', tx);

      return res.status(201).json({
        success: true,
        message: `Expense of ₹${numAmount.toLocaleString('en-IN')} recorded under ${tx.category}.`,
        data: {
          transaction: tx,
          walletBalance: updatedUser.walletBalance,
        },
      });
    }

    // 3. LEND / REPAYMENT / BORROW
    if (actionType === 'create_lend' || actionType === 'create_repayment' || actionType === 'create_borrow') {
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
      }

      const lendingType = actionType === 'create_lend'
        ? 'lend'
        : actionType === 'create_repayment'
        ? 'repayment'
        : 'borrow';

      req.body = {
        type: lendingType,
        amount: numAmount,
        contactName: data.contactName,
        contactMobile: data.contactMobile,
        contactId: data.contactId,
        description: data.description,
        date,
      };

      return createLendingTransaction(req, res, next);
    }

    // 4. DELETE TRANSACTION
    if (actionType === 'delete_transaction') {
      const targetId = data.targetTransactionId;
      if (!targetId) {
        return res.status(400).json({ success: false, message: 'Target transaction ID is required' });
      }

      const tx = await Transaction.findById(targetId);
      if (!tx) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      if (tx.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this transaction' });
      }

      let balanceDelta = 0;
      if (tx.type === 'income') balanceDelta = -tx.amount;
      else if (tx.type === 'expense') balanceDelta = tx.amount;

      let updatedUser = null;
      if (balanceDelta !== 0) {
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { walletBalance: balanceDelta } },
          { new: true }
        );
      } else {
        updatedUser = await User.findById(userId);
      }

      await tx.deleteOne();

      emitToUser(userId, 'wallet:update', { walletBalance: updatedUser.walletBalance });

      return res.json({
        success: true,
        message: 'Transaction deleted successfully.',
        data: {
          walletBalance: updatedUser.walletBalance,
        },
      });
    }

    // 5. EDIT TRANSACTION
    if (actionType === 'edit_transaction') {
      const targetId = data.targetTransactionId;
      if (!targetId) {
        return res.status(400).json({ success: false, message: 'Target transaction ID is required' });
      }

      const tx = await Transaction.findById(targetId);
      if (!tx) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      if (tx.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this transaction' });
      }

      let balanceDelta = 0;
      if (data.amount && !isNaN(Number(data.amount))) {
        const newAmt = Number(data.amount);
        const oldAmt = tx.amount;
        if (tx.type === 'income') balanceDelta = newAmt - oldAmt;
        else if (tx.type === 'expense') balanceDelta = -(newAmt - oldAmt);
        tx.amount = newAmt;
      }

      if (data.category) tx.category = data.category;
      if (data.description) tx.description = data.description;
      if (data.date) tx.date = new Date(data.date);

      await tx.save();

      let updatedUser = null;
      if (balanceDelta !== 0) {
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { walletBalance: balanceDelta } },
          { new: true }
        );
      } else {
        updatedUser = await User.findById(userId);
      }

      emitToUser(userId, 'wallet:update', { walletBalance: updatedUser.walletBalance });
      emitToUser(userId, 'transaction:new', tx);

      return res.json({
        success: true,
        message: 'Transaction updated successfully.',
        data: {
          transaction: tx,
          walletBalance: updatedUser.walletBalance,
        },
      });
    }

    return res.status(400).json({ success: false, message: `Unsupported action type: ${actionType}` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAiSummary,
  queryAiAssistant,
  executeAiTransaction,
};
