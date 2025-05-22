const mongoose = require('mongoose');
const { Schema } = mongoose;

const voteSchema = new Schema(
  {
    poll: {
      type: Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    selectedOptionText: {
      // Storing the text of the selected option.
      // This helps in auditing and if option IDs were to change (though IDs are better).
      // For simplicity with the current Poll model (options as subdocuments without their own _id),
      // matching by text is straightforward. If options had their own _id, referencing that would be more robust.
      type: String,
      required: true,
      trim: true,
    },
    // If options in Poll model had their own ObjectId, you would use:
    // selectedOptionId: {
    //   type: Schema.Types.ObjectId,
    //   required: true,
    // }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt is usually relevant for a vote
  }
);

// Compound unique index to ensure one vote per user per poll
voteSchema.index({ poll: 1, user: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
