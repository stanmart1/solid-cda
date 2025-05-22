const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationLogSchema = new Schema(
  {
    user: {
      // User who is the subject of the notification, or null if system-wide/unregistered user
      type: Schema.Types.ObjectId,
      ref: 'User',
      optional: true,
    },
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      required: true,
    },
    recipientAddress: {
      // e.g., email address, phone number, device token, or 'all'/'role:Tenant' for announcements
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      // Primarily for email
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'delivered', 'read'], // 'delivered' and 'read' might be for future advanced tracking
      default: 'queued',
    },
    sentAt: {
      type: Date,
      optional: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    // Optional: Link to the related entity (e.g., PaymentRecord, MembershipApplication)
    // relatedEntity: {
    //   entityType: String, // e.g., 'PaymentRecord', 'MembershipApplication'
    //   entityId: Schema.Types.ObjectId,
    // }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

notificationLogSchema.index({ user: 1, type: 1 });
notificationLogSchema.index({ status: 1, type: 1 });
notificationLogSchema.index({ recipientAddress: 1 });

const NotificationLog = mongoose.model(
  'NotificationLog',
  notificationLogSchema
);

module.exports = NotificationLog;
