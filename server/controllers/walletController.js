const User = require('../models/User');
const Transaction = require('../models/Transaction');
const LendingRelationship = require('../models/LendingRelationship');

// @desc    Get complete wallet and dashboard metrics for authenticated user
// @route   GET /api/wallet/dashboard
// @access  Private
const getWalletDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch all transactions involving user
    const transactions = await Transaction.find({
      $or: [{ createdBy: userId }, { sender: userId }, { receiver: userId }],
    })
      .populate('sender', 'name mobile email profileImage')
      .populate('receiver', 'name mobile email profileImage')
      .sort({ date: -1 });

    // Calculate current wallet balance & month metrics
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    const categoryTotals = {};

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const isThisMonth = txDate >= startOfMonth && txDate <= endOfMonth;

      // Classify transaction from current user's perspective
      if (tx.type === 'income' && tx.createdBy.toString() === userId.toString()) {
        if (isThisMonth) thisMonthIncome += tx.amount;
      } else if (tx.type === 'expense' && tx.createdBy.toString() === userId.toString()) {
        if (isThisMonth) {
          thisMonthExpense += tx.amount;
          categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        }
      }
    });

    // Fetch all lending relationships involving user
    const relationships = await LendingRelationship.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA', 'name mobile email profileImage')
      .populate('userB', 'name mobile email profileImage');

    let totalReceivable = 0;
    let totalPayable = 0;
    let totalGiven = 0;
    let totalReceived = 0;

    relationships.forEach((rel) => {
      const p = rel.getPerspective(userId);
      if (p.netBalance > 0) {
        totalReceivable += p.netBalance;
      } else if (p.netBalance < 0) {
        totalPayable += Math.abs(p.netBalance);
      }
      totalGiven += p.totalGiven;
      totalReceived += p.totalReceived;
    });

    // Calculate 6-month cash flow history for charts
    const cashFlowHistory = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1);
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthName = mDate.toLocaleString('default', { month: 'short' });

      let mIncome = 0;
      let mExpense = 0;

      transactions.forEach((tx) => {
        const txDate = new Date(tx.date);
        if (txDate >= mStart && txDate <= mEnd && tx.createdBy.toString() === userId.toString()) {
          if (tx.type === 'income') mIncome += tx.amount;
          if (tx.type === 'expense') mExpense += tx.amount;
        }
      });

      cashFlowHistory.push({
        month: monthName,
        income: mIncome,
        expenses: mExpense,
        net: mIncome - mExpense,
      });
    }

    // Format category breakdown for charts
    const categoryChartData = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
    }));

    // If no category expense recorded this month, provide graceful sample or empty
    const recentTransactions = transactions.slice(0, 8);

    res.json({
      success: true,
      data: {
        wallet: {
          currentBalance: user.walletBalance,
        },
        thisMonth: {
          income: thisMonthIncome,
          expenses: thisMonthExpense,
          net: thisMonthIncome - thisMonthExpense,
        },
        lending: {
          totalReceivable,
          totalPayable,
          totalGiven,
          totalReceived,
        },
        categoryBreakdown: categoryChartData,
        cashFlowHistory,
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update or adjust wallet balance manually
// @route   POST /api/wallet/adjust
// @access  Private
const adjustWalletBalance = async (req, res, next) => {
  try {
    const { amount, action, description } = req.body; // action: 'add' | 'subtract' | 'set'
    const numAmount = Number(amount);

    if (isNaN(numAmount) || (action !== 'set' && numAmount <= 0)) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let diff = 0;
    if (action === 'add') {
      user.walletBalance += numAmount;
      diff = numAmount;
    } else if (action === 'subtract') {
      user.walletBalance -= numAmount;
      diff = -numAmount;
    } else if (action === 'set') {
      diff = numAmount - user.walletBalance;
      user.walletBalance = numAmount;
    }

    await user.save();

    // Record adjustment transaction
    if (diff !== 0) {
      await Transaction.create({
        type: diff > 0 ? 'income' : 'expense',
        amount: Math.abs(diff),
        category: 'Manual Adjustment',
        description: description || `Wallet manual ${action === 'set' ? 'set' : action}`,
        createdBy: user._id,
        status: 'completed',
        date: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Wallet balance updated',
      data: {
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWalletDashboard,
  adjustWalletBalance,
};
