const Poll = require('../models/pollModel');
const Vote = require('../models/voteModel');
const User = require('../models/userModel'); // For role validation if needed, though user object passed in usually has role
const { ROLES } = require('../utils/constants');
const mongoose = require('mongoose');

/**
 * Creates a new poll.
 * @param {object} pollData - Data for the new poll.
 * @param {mongoose.Types.ObjectId} createdBy - User ID of the creator.
 * @returns {Promise<Poll>} - The created poll object.
 */
const createPoll = async (pollData, createdBy) => {
  const { title, description, options, startDate, endDate, allowedRoles } = pollData;

  if (!title || !description || !options || !startDate || !endDate || !allowedRoles) {
    throw new Error('Missing required fields for poll creation.');
  }

  if (options.length < 2) {
    throw new Error('A poll must have at least two options.');
  }

  if (new Date(endDate) <= new Date(startDate)) {
    throw new Error('End date must be after start date.');
  }

  // Validate allowedRoles against ROLES constants
  if (!Array.isArray(allowedRoles) || !allowedRoles.every(role => Object.values(ROLES).includes(role))) {
      throw new Error(`Invalid roles in allowedRoles. Must be a subset of: ${Object.values(ROLES).join(', ')}`);
  }

  const poll = new Poll({
    title,
    description,
    options: options.map(optText => ({ optionText: optText, votes: 0 })), // Initialize options
    createdBy,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    allowedRoles,
  });

  // The pre-save hook in pollModel will set isActive and isClosed
  await poll.save();
  return poll;
};

/**
 * Casts a vote on a poll.
 * @param {string} pollId - The ID of the poll.
 * @param {mongoose.Types.ObjectId} userId - The ID of the user voting.
 * @param {string} userRole - The role of the user voting.
 * @param {string} selectedOptionText - The text of the option selected by the user.
 * @returns {Promise<Poll>} - The updated poll object.
 */
const castVote = async (pollId, userId, userRole, selectedOptionText) => {
  const poll = await Poll.findById(pollId);

  if (!poll) {
    throw new Error('Poll not found.');
  }
  if (!poll.isActive || poll.isClosed) {
    throw new Error('Poll is not currently active or has ended.');
  }
  if (!poll.allowedRoles.includes(userRole)) {
    throw new Error(`Your role (${userRole}) is not allowed to vote in this poll.`);
  }

  const existingVote = await Vote.findOne({ poll: pollId, user: userId });
  if (existingVote) {
    throw new Error('You have already voted in this poll.');
  }

  const optionToUpdate = poll.options.find(opt => opt.optionText === selectedOptionText);
  if (!optionToUpdate) {
    throw new Error('Selected option is not valid for this poll.');
  }

  // Using a session for atomicity (requires replica set for production MongoDB)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Increment vote count in Poll document
    optionToUpdate.votes += 1;
    // poll.markModified('options'); // Not always necessary for subdocuments but can be a safeguard
    await poll.save({ session });

    // Create Vote record
    const voteRecord = new Vote({
      poll: pollId,
      user: userId,
      selectedOptionText: selectedOptionText,
    });
    await voteRecord.save({ session });

    await session.commitTransaction();
    return poll;
  } catch (error) {
    await session.abortTransaction();
    console.error('Transaction aborted due to error in castVote:', error);
    throw new Error(`Failed to cast vote: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Retrieves the results of a poll.
 * @param {string} pollId - The ID of the poll.
 * @returns {Promise<Poll>} - The poll object with vote counts.
 */
const getPollResults = async (pollId) => {
  const poll = await Poll.findById(pollId).populate('createdBy', 'firstName lastName');
  if (!poll) {
    throw new Error('Poll not found.');
  }
  // Logic for results visibility can be added here if needed
  // e.g., if (!poll.isClosed && poll.resultsVisibility === 'after_end' && !isAdmin) throw new Error('Results are not yet available.');
  return poll;
};

/**
 * Fetches active polls for a given user role.
 * @param {string} userRole - The role of the user.
 * @returns {Promise<Poll[]>} - An array of active polls relevant to the user.
 */
const getActivePollsForUser = async (userRole) => {
  const now = new Date();
  return Poll.find({
    startDate: { $lte: now },
    endDate: { $gt: now },
    isActive: true, // Should be redundant if pre-save hook works, but good for explicit query
    isClosed: false,
    allowedRoles: userRole, // Check if the user's role is in the allowedRoles array
  })
  .populate('createdBy', 'firstName lastName')
  .sort({ endDate: 1 }); // Show polls ending soonest first
};

/**
 * Utility function to update the status (isActive, isClosed) of all polls.
 * Can be called periodically by a cron job or a system task.
 * @returns {Promise<{updated: number, errors: number}>} - Count of updated polls and errors.
 */
const updatePollStatuses = async () => {
  const polls = await Poll.find({});
  let updatedCount = 0;
  let errorCount = 0;
  const now = new Date();

  for (const poll of polls) {
    let changed = false;
    const originalIsActive = poll.isActive;
    const originalIsClosed = poll.isClosed;

    if (poll.startDate <= now && poll.endDate > now) {
      poll.isActive = true;
      poll.isClosed = false;
    } else if (poll.endDate <= now) {
      poll.isActive = false;
      poll.isClosed = true;
    } else { // Start date is in the future
      poll.isActive = false;
      poll.isClosed = false;
    }
    
    if (poll.isActive !== originalIsActive || poll.isClosed !== originalIsClosed) {
        changed = true;
    }

    if (changed) {
      try {
        await poll.save();
        updatedCount++;
      } catch (error) {
        console.error(`Error updating status for poll ${poll._id}:`, error);
        errorCount++;
      }
    }
  }
  console.log(`Poll status update: ${updatedCount} updated, ${errorCount} errors.`);
  return { updated: updatedCount, errors: errorCount };
};


module.exports = {
  createPoll,
  castVote,
  getPollResults,
  getActivePollsForUser,
  updatePollStatuses,
};
