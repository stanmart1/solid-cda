const mongoose = require('mongoose');
const { Schema } = mongoose;
const { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } = require('../utils/constants');

const executiveCommentSchema = new Schema({
  comment: {
    type: String,
    required: true,
  },
  commentedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Executive or Super Admin
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const complaintSchema = new Schema(
  {
    user: {
      // User who submitted the complaint
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Complaint category is required'],
      enum: COMPLAINT_CATEGORIES,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: COMPLAINT_STATUSES[0], // 'Submitted'
    },
    attachments: [
      {
        type: String, // URLs to uploaded files
        trim: true,
      },
    ],
    executiveComments: [executiveCommentSchema],
    resolutionDetails: {
      type: String,
      trim: true,
      optional: true,
    },
    assignedTo: {
      // Executive/Admin handling the complaint
      type: Schema.Types.ObjectId,
      ref: 'User',
      optional: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexing for common queries
complaintSchema.index({ user: 1, status: 1 });
complaintSchema.index({ status: 1, category: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });


const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
