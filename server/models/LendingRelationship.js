const mongoose = require('mongoose');

const lendingRelationshipSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isExternal: {
      type: Boolean,
      default: false,
    },
    externalContact: {
      name: { type: String, trim: true },
      mobile: { type: String, trim: true },
    },
    // Balance conventions:
    // If registered: positive => userB owes userA; negative => userA owes userB.
    // If external: positive => externalContact owes userA; negative => userA owes externalContact.
    balance: {
      type: Number,
      default: 0,
    },
    totalGivenByA: {
      type: Number,
      default: 0,
    },
    totalGivenByB: {
      type: Number,
      default: 0,
    },
    lastTransactionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Method to project relationship from the viewpoint of a specific user
lendingRelationshipSchema.methods.getPerspective = function (userId) {
  const currentUserIdStr = userId.toString();
  const isA = this.userA && this.userA._id
    ? this.userA._id.toString() === currentUserIdStr
    : this.userA?.toString() === currentUserIdStr;

  let counterparty = null;
  let netBalance = 0; // positive => counterparty owes me; negative => I owe counterparty
  let totalGiven = 0;
  let totalReceived = 0;

  if (this.isExternal) {
    // External contact always belongs to userA
    netBalance = this.balance;
    totalGiven = this.totalGivenByA;
    totalReceived = this.totalGivenByB;
    counterparty = {
      id: null,
      name: this.externalContact?.name || 'External Contact',
      mobile: this.externalContact?.mobile || '',
      isExternal: true,
      profileImage: '',
    };
  } else {
    if (isA) {
      netBalance = this.balance;
      totalGiven = this.totalGivenByA;
      totalReceived = this.totalGivenByB;
      counterparty = {
        id: this.userB?._id || this.userB,
        name: this.userB?.name || 'Registered User',
        mobile: this.userB?.mobile || '',
        email: this.userB?.email || '',
        isExternal: false,
        profileImage: this.userB?.profileImage || '',
      };
    } else {
      netBalance = -this.balance;
      totalGiven = this.totalGivenByB;
      totalReceived = this.totalGivenByA;
      counterparty = {
        id: this.userA?._id || this.userA,
        name: this.userA?.name || 'Registered User',
        mobile: this.userA?.mobile || '',
        email: this.userA?.email || '',
        isExternal: false,
        profileImage: this.userA?.profileImage || '',
      };
    }
  }

  let status = 'settled';
  if (netBalance > 0) status = 'owes_you';
  else if (netBalance < 0) status = 'you_owe';

  return {
    _id: this._id,
    counterparty,
    netBalance,
    totalGiven,
    totalReceived,
    status,
    lastTransactionAt: this.lastTransactionAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('LendingRelationship', lendingRelationshipSchema);
