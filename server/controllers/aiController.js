const Transaction = require('../models/Transaction');
const LendingRelationship = require('../models/LendingRelationship');
const { generateFinancialSummary, answerFinancialQuery } = require('../services/aiService');

// @desc    Get AI-powered financial summary and analysis
// @route   GET /api/ai/summary
// @access  Private
const getAiSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch transactions
    const transactions = await Transaction.find({
      $or: [{ createdBy: userId }, { sender: userId }, { receiver: userId }],
    }).sort({ date: -1 });

    // Fetch lending relationships
    const lendingRelationships = await LendingRelationship.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA', 'name mobile')
      .populate('userB', 'name mobile');

    const summary = await generateFinancialSummary(
      transactions,
      lendingRelationships,
      userId,
      req.user.name
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ask AI assistant a natural language financial question
// @route   POST /api/ai/query
// @access  Private
const queryAiAssistant = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Question prompt is required' });
    }

    const transactions = await Transaction.find({
      $or: [{ createdBy: userId }, { sender: userId }, { receiver: userId }],
    }).sort({ date: -1 });

    const lendingRelationships = await LendingRelationship.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA', 'name mobile')
      .populate('userB', 'name mobile');

    const result = await answerFinancialQuery(
      query.trim(),
      transactions,
      lendingRelationships,
      userId,
      req.user.name
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAiSummary,
  queryAiAssistant,
};
