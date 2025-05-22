const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ROLES } = require('../utils/constants'); // Assuming ROLES are defined here

const pollOptionSchema = new Schema({
  optionText: {
    type: String,
    required: true,
    trim: true,
  },
  votes: {
    type: Number,
    default: 0,
  },
});

const pollSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Poll title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Poll description is required'],
      trim: true,
    },
    options: [pollOptionSchema], // Array of options
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Executive/Super Admin ID
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    allowedRoles: {
      type: [String],
      required: true,
      validate: {
        validator: function (roles) {
          // Ensure all provided roles are valid roles defined in ROLES constants
          return roles.every(role => Object.values(ROLES).includes(role));
        },
        message: props => `${props.value} contains invalid role(s). Allowed roles are: ${Object.values(ROLES).join(', ')}`
      }
    },
    isActive: {
      // True when poll is currently running (current date is between start and end)
      type: Boolean,
      default: false,
    },
    isClosed: {
      // True when poll has ended (current date is past end date)
      type: Boolean,
      default: false,
    },
    // Configuration for when results are visible
    // resultsVisibility: {
    //   type: String,
    //   enum: ['always', 'after_end', 'admin_only'],
    //   default: 'after_end',
    // }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true }, // Ensure virtuals are included in JSON output
    toObject: { virtuals: true }, // Ensure virtuals are included in object output
  }
);

// Virtual for totalVotes
pollSchema.virtual('totalVotes').get(function () {
  if (this.options && this.options.length > 0) {
    return this.options.reduce((total, option) => total + option.votes, 0);
  }
  return 0;
});

// Pre-save hook to validate dates and options
pollSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date.'));
  }
  if (!this.options || this.options.length < 2) {
    return next(new Error('A poll must have at least two options.'));
  }

  // Update isActive and isClosed based on dates automatically
  const now = new Date();
  if (this.startDate <= now && this.endDate > now) {
    this.isActive = true;
    this.isClosed = false;
  } else if (this.endDate <= now) {
    this.isActive = false;
    this.isClosed = true;
  } else { // Start date is in the future
    this.isActive = false;
    this.isClosed = false;
  }

  next();
});

// Indexing
pollSchema.index({ createdBy: 1 });
pollSchema.index({ startDate: 1, endDate: 1, isActive: 1, isClosed: 1 });
pollSchema.index({ allowedRoles: 1 });


const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;
