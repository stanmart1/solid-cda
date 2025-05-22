const asyncHandler = require('express-async-handler');
const votingService = require('../services/votingService');
const Poll = require('../models/pollModel'); // For direct queries like getAllPolls
const { ROLES } = require('../utils/constants');

// @desc    Create a new poll
// @route   POST /api/polls
// @access  Private (Super Admin, Executive)
const createPoll = asyncHandler(async (req, res) => {
  const createdBy = req.user.id;
  const pollData = req.body; // { title, description, options (array of strings), startDate, endDate, allowedRoles }

  // Basic validation
  if (!pollData.title || !pollData.description || !pollData.options ||
      !pollData.startDate || !pollData.endDate || !pollData.allowedRoles) {
    res.status(400);
    throw new Error('Missing required fields: title, description, options, startDate, endDate, allowedRoles.');
  }
  if (!Array.isArray(pollData.options) || pollData.options.length < 2) {
    res.status(400);
    throw new Error('Poll options must be an array with at least two items.');
  }
   if (!Array.isArray(pollData.allowedRoles) || pollData.allowedRoles.length === 0) {
    res.status(400);
    throw new Error('allowedRoles must be a non-empty array.');
  }


  const poll = await votingService.createPoll(pollData, createdBy);
  res.status(201).json(poll);
});

// @desc    Get all polls (Admin/Executive action)
// @route   GET /api/polls/admin/all
// @access  Private (Super Admin, Executive)
const getAllPolls = asyncHandler(async (req, res) => {
  // Basic pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const polls = await Poll.find({})
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPolls = await Poll.countDocuments({});

  res.json({
    polls,
    currentPage: page,
    totalPages: Math.ceil(totalPolls / limit),
    totalPolls,
  });
});

// @desc    Get a single poll by ID
// @route   GET /api/polls/:pollId
// @access  Private (Authenticated users, logic for public visibility can be added)
const getPollById = asyncHandler(async (req, res) => {
  const pollId = req.params.pollId;
  const poll = await Poll.findById(pollId).populate('createdBy', 'firstName lastName');

  if (!poll) {
    res.status(404);
    throw new Error('Poll not found.');
  }

  // Add visibility logic here if needed (e.g., based on poll.resultsVisibility or user role)
  // For now, any authenticated user who can find it, can view its details. Results are separate.
  res.json(poll);
});

// @desc    Update a poll (Admin/Executive action)
// @route   PUT /api/polls/:pollId
// @access  Private (Super Admin, Executive)
const updatePoll = asyncHandler(async (req, res) => {
  const pollId = req.params.pollId;
  const poll = await Poll.findById(pollId);

  if (!poll) {
    res.status(404);
    throw new Error('Poll not found.');
  }

  // Business logic: Prevent updates if poll has started or has votes, unless specific fields.
  // For simplicity, allowing updates to certain fields.
  // More complex logic would be needed for robust updates (e.g., cannot change options after voting starts).
  const { title, description, startDate, endDate, allowedRoles } = req.body;

  if (poll.isActive && poll.totalVotes > 0) {
      // More restrictive: only allow endDate changes, or description/title.
      // For now, let's say only description and endDate can be changed if active and has votes.
      if (req.body.title || req.body.startDate || req.body.allowedRoles || req.body.options) {
          res.status(400);
          throw new Error('Cannot update title, startDate, allowedRoles, or options for an active poll with votes. Only description and endDate are permitted.');
      }
  }


  poll.title = title || poll.title;
  poll.description = description || poll.description;
  poll.startDate = startDate || poll.startDate;
  poll.endDate = endDate || poll.endDate;
  poll.allowedRoles = allowedRoles || poll.allowedRoles;

  // If options are being updated, need careful handling (especially if votes exist)
  // This simple update assumes options are replaced if provided, which is risky for live polls.
  // A better approach would be separate endpoints or logic for managing options.
  if (req.body.options && Array.isArray(req.body.options)) {
      if (poll.totalVotes > 0) {
          res.status(400);
          throw new Error("Cannot change options directly once votes have been cast. Consider creating a new poll.");
      }
      poll.options = req.body.options.map(optText => ({ optionText: optText, votes: 0 }));
  }


  const updatedPoll = await poll.save(); // Pre-save hook will re-validate dates and status
  res.json(updatedPoll);
});

// @desc    Delete a poll (Admin/Executive action)
// @route   DELETE /api/polls/:pollId
// @access  Private (Super Admin, Executive)
const deletePoll = asyncHandler(async (req, res) => {
  const pollId = req.params.pollId;
  const poll = await Poll.findById(pollId);

  if (!poll) {
    res.status(404);
    throw new Error('Poll not found.');
  }

  // Business logic: What happens to votes? Delete them or archive poll?
  // For now, simple deletion. If votes should be kept, poll might be marked 'archived' instead.
  if (poll.totalVotes > 0) {
    // Potentially prevent deletion or require an additional confirmation step.
    // Or, delete associated votes first.
    // For now:
    // res.status(400);
    // throw new Error("Cannot delete poll with existing votes. Please archive it or clear votes first.");
    // Alternative: Proceed with deletion of poll and its votes.
    await Vote.deleteMany({ poll: pollId }); // Delete associated votes
  }

  await poll.deleteOne(); // Mongoose v6+ uses deleteOne()
  res.json({ message: 'Poll and associated votes deleted successfully.' });
});

// @desc    Get active polls for the current user
// @route   GET /api/polls/active
// @access  Private (Authenticated users)
const getActivePolls = asyncHandler(async (req, res) => {
  const userRole = req.user.role;
  const polls = await votingService.getActivePollsForUser(userRole);
  res.json(polls);
});

// @desc    Vote in a poll
// @route   POST /api/polls/:pollId/vote
// @access  Private (Authenticated users)
const voteInPoll = asyncHandler(async (req, res) => {
  const pollId = req.params.pollId;
  const { selectedOptionText } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!selectedOptionText) {
    res.status(400);
    throw new Error('selectedOptionText is required.');
  }

  const updatedPoll = await votingService.castVote(pollId, userId, userRole, selectedOptionText);
  res.json({ message: 'Vote cast successfully.', poll: updatedPoll });
});

// @desc    Get results for a poll
// @route   GET /api/polls/:pollId/results
// @access  Private (Authenticated users, specific visibility logic can be added)
const getPollResults = asyncHandler(async (req, res) => {
  const pollId = req.params.pollId;
  const poll = await votingService.getPollResults(pollId);

  // Example visibility logic (can be enhanced or made configurable per poll)
  // if (!poll.isClosed && req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.EXECUTIVE) {
  //   res.status(403);
  //   throw new Error('Poll results are not yet available or you are not authorized to view them now.');
  // }

  res.json(poll);
});

// @desc    Manually trigger poll status updates (Admin utility)
// @route   PUT /api/polls/admin/update-statuses
// @access  Private (Super Admin, Executive)
const runPollStatusUpdater = asyncHandler(async (req, res) => {
    const result = await votingService.updatePollStatuses();
    res.json({ message: "Poll status update process completed.", result });
});


module.exports = {
  createPoll,
  getAllPolls,
  getPollById,
  updatePoll,
  deletePoll,
  getActivePolls,
  voteInPoll,
  getPollResults,
  runPollStatusUpdater,
};
