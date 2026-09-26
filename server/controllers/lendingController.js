const mongoose = require('mongoose');
const User = require('../models/User');
const LendingRelationship = require('../models/LendingRelationship');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { emitToUser, emitToConversation } = require('../sockets/socketManager');

// Helper to find or create a canonical LendingRelationship between two registered users
const getOrCreateCanonicalRelationship = async (userId1, userId2) => {
  // Sort user IDs for canonical indexing
  const [userA, userB] = [userId1.toString(), userId2.toString()].sort();

  let relationship = await LendingRelationship.findOne({
    userA,
    userB,
    isExternal: false,
  });

  if (!relationship) {
    relationship = await LendingRelationship.create({
      userA,
      userB,
      balance: 0,
      totalGivenByA: 0,
      totalGivenByB: 0,
      isExternal: false,
    });
  }

  return relationship;
};

// @desc    Get lending dashboard overview and contacts list for current user
// @route   GET /api/lending
// @access  Private
const getLendingDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch all relationships involving current user
    const relationships = await LendingRelationship.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA', 'name mobile email profileImage')
      .populate('userB', 'name mobile email profileImage')
      .sort({ updatedAt: -1 });

    let totalMoneyGiven = 0;
    let totalMoneyReceived = 0;
    let peopleWhoOweYou = 0;
    let peopleYouOwe = 0;

    const contacts = relationships.map((rel) => {
      const p = rel.getPerspective(userId);

      if (p.netBalance > 0) {
        peopleWhoOweYou += p.netBalance;
      } else if (p.netBalance < 0) {
        peopleYouOwe += Math.abs(p.netBalance);
      }

      totalMoneyGiven += p.totalGiven;
      totalMoneyReceived += p.totalReceived;

      return p;
    });

    res.json({
      success: true,
      data: {
        totals: {
          totalMoneyGiven,
          totalMoneyReceived,
          peopleWhoOweYou,
          peopleYouOwe,
        },
        contacts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a lending / borrowing / repayment transaction
// @route   POST /api/lending
// @access  Private
const createLendingTransaction = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const {
      type, // 'lend' (Money Given) | 'borrow' (Money Received) | 'repayment'
      amount,
      contactMobile,
      contactId,
      contactName,
      description,
      date,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount greater than 0 is required' });
    }

    if (!type || !['lend', 'borrow', 'repayment'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Transaction type must be lend, borrow, or repayment' });
    }

    let targetUser = null;
    let isExternal = false;
    let cleanMobile = contactMobile ? contactMobile.trim() : '';

    if (contactId) {
      targetUser = await User.findById(contactId);
    } else if (cleanMobile) {
      targetUser = await User.findOne({ mobile: cleanMobile });
    }

    // Prevent lending to oneself
    if (targetUser && targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot record a lending transaction with yourself' });
    }

    let relationship = null;
    let senderId = null;
    let receiverId = null;

    if (targetUser) {
      // Registered User: Canonical Two-Sided Synchronization
      relationship = await getOrCreateCanonicalRelationship(currentUserId, targetUser._id);
      const isUserA = relationship.userA.toString() === currentUserId.toString();

      if (type === 'lend') {
        // Current user gave money to targetUser
        senderId = currentUserId;
        receiverId = targetUser._id;

        if (isUserA) {
          relationship.balance += numAmount;
          relationship.totalGivenByA += numAmount;
        } else {
          relationship.balance -= numAmount;
          relationship.totalGivenByB += numAmount;
        }

        // Update wallet balances: sender spent, receiver gained
        await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: -numAmount } });
        await User.findByIdAndUpdate(targetUser._id, { $inc: { walletBalance: numAmount } });
      } else if (type === 'borrow') {
        // Current user received/borrowed money from targetUser
        senderId = targetUser._id;
        receiverId = currentUserId;

        if (isUserA) {
          relationship.balance -= numAmount;
          relationship.totalGivenByB += numAmount;
        } else {
          relationship.balance += numAmount;
          relationship.totalGivenByA += numAmount;
        }

        await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: numAmount } });
        await User.findByIdAndUpdate(targetUser._id, { $inc: { walletBalance: -numAmount } });
      } else if (type === 'repayment') {
        // Repayment: check existing perspective
        const perspective = relationship.getPerspective(currentUserId);
        
        // If current user owed money, current user is paying it back
        if (perspective.netBalance < 0) {
          senderId = currentUserId;
          receiverId = targetUser._id;

          if (isUserA) {
            relationship.balance += numAmount;
            relationship.totalGivenByA += numAmount;
          } else {
            relationship.balance -= numAmount;
            relationship.totalGivenByB += numAmount;
          }

          await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: -numAmount } });
          await User.findByIdAndUpdate(targetUser._id, { $inc: { walletBalance: numAmount } });
        } else {
          // Target user is paying back current user
          senderId = targetUser._id;
          receiverId = currentUserId;

          if (isUserA) {
            relationship.balance -= numAmount;
            relationship.totalGivenByB += numAmount;
          } else {
            relationship.balance += numAmount;
            relationship.totalGivenByA += numAmount;
          }

          await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: numAmount } });
          await User.findByIdAndUpdate(targetUser._id, { $inc: { walletBalance: -numAmount } });
        }
      }

      relationship.lastTransactionAt = date || new Date();
      await relationship.save();

      // Create synchronized Transaction
      const transaction = await Transaction.create({
        type,
        amount: numAmount,
        description: description || (type === 'lend' ? 'Money Given' : type === 'borrow' ? 'Money Borrowed' : 'Debt Repayment'),
        category: type === 'repayment' ? 'Repayment' : type === 'lend' ? 'Lending' : 'Borrowing',
        sender: senderId,
        receiver: receiverId,
        createdBy: currentUserId,
        lendingRelationship: relationship._id,
        isExternal: false,
        status: 'completed',
        date: date || new Date(),
      });

      // Notification for counterparty
      let notificationMsg = '';
      if (type === 'lend') {
        notificationMsg = `${req.user.name} recorded ₹${numAmount.toLocaleString('en-IN')} given to you.`;
      } else if (type === 'borrow') {
        notificationMsg = `${req.user.name} recorded ₹${numAmount.toLocaleString('en-IN')} received/borrowed from you.`;
      } else {
        notificationMsg = `${req.user.name} recorded a repayment of ₹${numAmount.toLocaleString('en-IN')}.`;
      }

      const notif = await Notification.create({
        user: targetUser._id,
        type: type === 'repayment' ? 'repayment' : 'lending',
        title: type === 'repayment' ? 'Repayment Update' : 'Lending Update',
        message: notificationMsg,
        data: {
          transactionId: transaction._id,
          relationshipId: relationship._id,
          amount: numAmount,
        },
      });

      // Also create an in-chat alert message if conversation exists
      const conversation = await Conversation.findOne({
        participants: { $all: [currentUserId, targetUser._id] },
      });

      if (conversation) {
        const chatAlertMessage = await Message.create({
          conversation: conversation._id,
          sender: currentUserId,
          receiver: targetUser._id,
          message: `💸 Financial Update: ${notificationMsg}`,
          type: 'transaction_alert',
          metadata: {
            transactionId: transaction._id,
            amount: numAmount,
            type,
          },
        });
        conversation.lastMessage = chatAlertMessage._id;
        await conversation.save();

        emitToConversation(conversation._id, 'message:new', chatAlertMessage);
      }

      // Real-time Socket.IO emission to both users
      emitToUser(targetUser._id, 'wallet:update', { amount: numAmount });
      emitToUser(targetUser._id, 'lending:update', { relationshipId: relationship._id });
      emitToUser(targetUser._id, 'transaction:new', transaction);
      emitToUser(targetUser._id, 'notification:new', notif);

      emitToUser(currentUserId, 'wallet:update', { amount: numAmount });
      emitToUser(currentUserId, 'lending:update', { relationshipId: relationship._id });
      emitToUser(currentUserId, 'transaction:new', transaction);

      return res.status(201).json({
        success: true,
        message: 'Transaction synchronized successfully with registered user',
        data: {
          transaction,
          relationship: relationship.getPerspective(currentUserId),
        },
      });
    } else {
      // External Contact (Not registered on PocketGuard)
      isExternal = true;
      const externalName = contactName ? contactName.trim() : 'External Contact';

      // Find or create external relationship
      relationship = await LendingRelationship.findOne({
        userA: currentUserId,
        isExternal: true,
        'externalContact.mobile': cleanMobile || undefined,
        'externalContact.name': !cleanMobile ? externalName : undefined,
      });

      if (!relationship) {
        relationship = await LendingRelationship.create({
          userA: currentUserId,
          userB: null,
          isExternal: true,
          externalContact: {
            name: externalName,
            mobile: cleanMobile,
          },
          balance: 0,
          totalGivenByA: 0,
          totalGivenByB: 0,
        });
      }

      if (type === 'lend') {
        relationship.balance += numAmount;
        relationship.totalGivenByA += numAmount;
        await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: -numAmount } });
      } else if (type === 'borrow') {
        relationship.balance -= numAmount;
        relationship.totalGivenByB += numAmount;
        await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: numAmount } });
      } else if (type === 'repayment') {
        if (relationship.balance > 0) {
          // External contact repaid user
          relationship.balance -= numAmount;
          relationship.totalGivenByB += numAmount;
          await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: numAmount } });
        } else {
          // User repaid external contact
          relationship.balance += numAmount;
          relationship.totalGivenByA += numAmount;
          await User.findByIdAndUpdate(currentUserId, { $inc: { walletBalance: -numAmount } });
        }
      }

      relationship.lastTransactionAt = date || new Date();
      await relationship.save();

      const transaction = await Transaction.create({
        type,
        amount: numAmount,
        description: description || `Transaction with ${externalName}`,
        category: type === 'repayment' ? 'Repayment' : type === 'lend' ? 'Lending' : 'Borrowing',
        sender: type === 'lend' ? currentUserId : null,
        receiver: type === 'borrow' ? currentUserId : null,
        createdBy: currentUserId,
        lendingRelationship: relationship._id,
        isExternal: true,
        externalContact: {
          name: externalName,
          mobile: cleanMobile,
        },
        status: 'completed',
        date: date || new Date(),
      });

      emitToUser(currentUserId, 'wallet:update', { amount: numAmount });
      emitToUser(currentUserId, 'lending:update', { relationshipId: relationship._id });
      emitToUser(currentUserId, 'transaction:new', transaction);

      return res.status(201).json({
        success: true,
        message: 'Lending transaction recorded for external contact',
        data: {
          transaction,
          relationship: relationship.getPerspective(currentUserId),
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Quick repayment endpoint
// @route   POST /api/lending/:id/repay
// @access  Private
const repayLending = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid repayment amount is required' });
    }

    const relationship = await LendingRelationship.findById(id)
      .populate('userA', 'name mobile email profileImage')
      .populate('userB', 'name mobile email profileImage');

    if (!relationship) {
      return res.status(404).json({ success: false, message: 'Lending relationship not found' });
    }

    const currentUserId = req.user._id.toString();
    const isUserA = relationship.userA?._id?.toString() === currentUserId;
    const isUserB = relationship.userB?._id?.toString() === currentUserId;

    if (!isUserA && !isUserB) {
      return res.status(403).json({ success: false, message: 'Not authorized for this relationship' });
    }

    // Call createLendingTransaction logic with type: 'repayment'
    const targetUserId = isUserA ? relationship.userB?._id : relationship.userA?._id;

    req.body = {
      type: 'repayment',
      amount: numAmount,
      contactId: targetUserId,
      contactName: relationship.isExternal ? relationship.externalContact?.name : undefined,
      contactMobile: relationship.isExternal ? relationship.externalContact?.mobile : undefined,
      description: description || 'Repayment',
    };

    return createLendingTransaction(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed relationship & transaction history with a specific contact or relationship ID
// @route   GET /api/lending/:id
// @access  Private
const getRelationshipDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    let relationship = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      relationship = await LendingRelationship.findById(id)
        .populate('userA', 'name mobile email profileImage')
        .populate('userB', 'name mobile email profileImage');
    }

    // If not found by relationship ID, check if id is a counterparty User ID
    if (!relationship && mongoose.Types.ObjectId.isValid(id)) {
      relationship = await LendingRelationship.findOne({
        $or: [
          { userA: userId, userB: id },
          { userA: id, userB: userId },
        ],
      })
        .populate('userA', 'name mobile email profileImage')
        .populate('userB', 'name mobile email profileImage');
    }

    if (!relationship) {
      return res.status(404).json({ success: false, message: 'Relationship not found' });
    }

    const perspective = relationship.getPerspective(userId);

    // Fetch related transactions
    const transactions = await Transaction.find({
      lendingRelationship: relationship._id,
    })
      .populate('sender', 'name mobile')
      .populate('receiver', 'name mobile')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: {
        relationship: perspective,
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLendingDashboard,
  createLendingTransaction,
  repayLending,
  getRelationshipDetails,
};
