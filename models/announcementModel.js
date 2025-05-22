const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ROLES } = require('../utils/constants'); // Assuming ROLES are defined here

const announcementSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Announcement message is required'],
    },
    targetRoles: {
      type: [String],
      // Validate against ROLES if possible, or allow 'all'
      // Example: enum: [...Object.values(ROLES), 'all']
      // For simplicity, we'll allow any string array, but validation can be added.
      default: ['all'], // Default to all roles
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Should be an Executive or Super Admin
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      optional: true,
    },
    isGlobal: {
      // True if it should appear for all users regardless of login status (for future public pages perhaps)
      // Or if it's a system-wide non-role-based announcement.
      type: Boolean,
      default: false,
    },
    // For tracking if an announcement was broadcasted (e.g., via email/sms)
    // broadcastStatus: {
    //   email: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    //   sms: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    //   lastBroadcastAttempt: Date,
    //   broadcastError: String,
    // }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

announcementSchema.index({ targetRoles: 1, publishDate: -1, expiryDate: 1 });
announcementSchema.index({ createdBy: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
