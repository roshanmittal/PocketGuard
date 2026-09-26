const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { emitToUser } = require('../sockets/socketManager');

// @desc    Get user's transactions with filtering, searching, and pagination
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      type,
      category,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = req.query;

    const query = {
      $or: [{ createdBy: userId }, { sender: userId }, { receiver: userId }],
    };

    // Filter by type
    if (type && type !== 'all') {
      if (type === 'income') query.type = 'income';
      else if (type === 'expense') query.type = 'expense';
      else if (type === 'lend') query.type = 'lend';
      else if (type === 'borrow') query.type = 'borrow';
      else if (type === 'repayment') query.type = 'repayment';
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Search by description or contact name
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { description: searchRegex },
            { category: searchRegex },
            { 'externalContact.name': searchRegex },
          ],
        },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('sender', 'name mobile email profileImage')
        .populate('receiver', 'name mobile email profileImage')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query),
    ]);

    // Format transaction from current user's perspective
    const formatted = transactions.map((tx) => {
      const isCreator = tx.createdBy.toString() === userId.toString();
      const isSender = tx.sender && tx.sender._id
        ? tx.sender._id.toString() === userId.toString()
        : tx.sender?.toString() === userId.toString();

      let displayType = tx.type;
      let counterpartyName = 'Self';

      if (tx.isExternal && tx.externalContact?.name) {
        counterpartyName = tx.externalContact.name;
      } else if (tx.type === 'lend' || tx.type === 'borrow' || tx.type === 'repayment') {
        if (isSender) {
          counterpartyName = tx.receiver?.name || 'Contact';
          displayType = tx.type === 'repayment' ? 'Repayment Given' : 'Money Given';
        } else {
          counterpartyName = tx.sender?.name || 'Contact';
          displayType = tx.type === 'repayment' ? 'Repayment Received' : 'Money Received';
        }
      }

      return {
        _id: tx._id,
        type: tx.type,
        displayType,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        counterpartyName,
        sender: tx.sender,
        receiver: tx.receiver,
        isCreator,
        status: tx.status,
        date: tx.date,
        createdAt: tx.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        transactions: formatted,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a regular personal transaction (Income / Expense)
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type, amount, category, description, date } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount greater than 0 is required' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be income or expense' });
    }

    const transaction = await Transaction.create({
      type,
      amount: numAmount,
      category: category || (type === 'income' ? 'Salary' : 'Other'),
      description: description || (type === 'income' ? 'Income added' : 'Expense recorded'),
      createdBy: userId,
      date: date || new Date(),
      status: 'completed',
    });

    // Update wallet balance
    const balanceChange = type === 'income' ? numAmount : -numAmount;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: balanceChange } },
      { new: true }
    );

    // Real-time update
    emitToUser(userId, 'wallet:update', { walletBalance: updatedUser.walletBalance });
    emitToUser(userId, 'transaction:new', transaction);

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a personal transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Ownership check
    if (transaction.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this transaction' });
    }

    // If simple personal income or expense, roll back wallet balance
    if (transaction.type === 'income') {
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -transaction.amount } });
    } else if (transaction.type === 'expense') {
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: transaction.amount } });
    }

    await transaction.deleteOne();

    emitToUser(userId, 'wallet:update', {});

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  deleteTransaction,
};
