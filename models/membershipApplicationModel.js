const mongoose = require('mongoose');

const membershipApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    membershipTypeRequested: {
      type: String,
      required: [true, 'Membership type requested is required'],
      trim: true,
      // Example values: 'Property Owner Basic', 'Tenant Premium', 'Community Gold'
      // This can be more granular than the user's primary role.
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    reviewDate: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Should be an Executive or Super Admin
    },
    documents: [
      {
        type: String, // URLs or paths to uploaded documents
        trim: true,
      },
    ],
    comments: {
      // Admin notes during review
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

const MembershipApplication = mongoose.model(
  'MembershipApplication',
  membershipApplicationSchema
);

module.exports = MembershipApplication;
