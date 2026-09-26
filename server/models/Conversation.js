const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Optional reference to a lending relationship between these two users
    lendingRelationship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LendingRelationship',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
