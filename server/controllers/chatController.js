const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const LendingRelationship = require('../models/LendingRelationship');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { emitToUser, emitToConversation, isUserOnline } = require('../sockets/socketManager');

// @desc    Get all conversations for current user with unread counts and financial status
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name mobile email profileImage')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Find counterparty
        const otherParticipant = conv.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );

        if (!otherParticipant) return null;

        // Unread messages count
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          receiver: userId,
          read: false,
        });

        // Find or check lending relationship between current user and counterparty
        const [u1, u2] = [userId.toString(), otherParticipant._id.toString()].sort();
        const relationship = await LendingRelationship.findOne({
          userA: u1,
          userB: u2,
          isExternal: false,
        });

        const financialPerspective = relationship ? relationship.getPerspective(userId) : null;

        return {
          _id: conv._id,
          participant: {
            ...otherParticipant.toObject(),
            isOnline: isUserOnline(otherParticipant._id),
          },
          lastMessage: conv.lastMessage,
          unreadCount,
          financialRelationship: financialPerspective,
          updatedAt: conv.updatedAt,
        };
      })
    );

    const validConversations = formattedConversations.filter(Boolean);

    res.json({
      success: true,
      data: validConversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create a conversation with a specific user
// @route   POST /api/conversations
// @access  Private
const getOrCreateConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { recipientId, mobile } = req.body;

    let targetUser = null;
    if (recipientId) {
      targetUser = await User.findById(recipientId);
    } else if (mobile) {
      targetUser = await User.findOne({ mobile: mobile.trim() });
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser._id.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, targetUser._id] },
    })
      .populate('participants', 'name mobile email profileImage')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, targetUser._id],
      });
      conversation = await conversation.populate('participants', 'name mobile email profileImage');
    }

    // Lending relationship
    const [u1, u2] = [userId.toString(), targetUser._id.toString()].sort();
    const relationship = await LendingRelationship.findOne({
      userA: u1,
      userB: u2,
      isExternal: false,
    });

    res.json({
      success: true,
      data: {
        _id: conversation._id,
        participant: {
          ...targetUser.toObject(),
          isOnline: isUserOnline(targetUser._id),
        },
        lastMessage: conversation.lastMessage,
        financialRelationship: relationship ? relationship.getPerspective(userId) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId).populate(
      'participants',
      'name mobile email profileImage'
    );

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized for this conversation' });
    }

    // Mark unread messages sent to me as read
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        read: false,
      },
      {
        read: true,
      }
    );

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name profileImage')
      .sort({ createdAt: 1 });

    // Financial relationship details
    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );

    let financialRelationship = null;
    if (otherParticipant) {
      const [u1, u2] = [userId.toString(), otherParticipant._id.toString()].sort();
      const rel = await LendingRelationship.findOne({
        userA: u1,
        userB: u2,
        isExternal: false,
      });
      if (rel) {
        financialRelationship = rel.getPerspective(userId);
      }
    }

    res.json({
      success: true,
      data: {
        conversationId,
        participant: otherParticipant ? {
          ...otherParticipant.toObject(),
          isOnline: isUserOnline(otherParticipant._id),
        } : null,
        financialRelationship,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message in a conversation
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { conversationId, receiverId, message, type = 'text', metadata = null } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    } else if (receiverId) {
      conversation = await Conversation.findOne({
        participants: { $all: [userId, receiverId] },
      });
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [userId, receiverId],
        });
      }
    }

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation could not be identified' });
    }

    // Identify target receiver
    const actualReceiverId = conversation.participants.find(
      (p) => p.toString() !== userId.toString()
    );

    if (!actualReceiverId) {
      return res.status(400).json({ success: false, message: 'Receiver not found' });
    }

    const newMessage = await Message.create({
      conversation: conversation._id,
      sender: userId,
      receiver: actualReceiverId,
      message: message.trim(),
      type,
      metadata,
    });

    conversation.lastMessage = newMessage._id;
    await conversation.save();

    await newMessage.populate('sender', 'name profileImage');

    // Emit live message event to conversation room
    emitToConversation(conversation._id, 'message:new', newMessage);

    // Emit notification to receiver if offline or outside conversation
    emitToUser(actualReceiverId, 'message:received', {
      conversationId: conversation._id,
      message: newMessage,
      sender: {
        _id: req.user._id,
        name: req.user.name,
      },
    });

    res.status(201).json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
};
