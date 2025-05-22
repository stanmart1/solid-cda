const express = require('express');
const router = express.Router();
const {
  createPoll,
  getAllPolls,
  getPollById,
  updatePoll,
  deletePoll,
  getActivePolls,
  voteInPoll,
  getPollResults,
  runPollStatusUpdater, // Added for admin utility
} = require('../controllers/votingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

// Admin/Executive routes
router.post(
  '/',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  createPoll
);

router.get(
  '/admin/all',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getAllPolls
);

router.put(
  '/admin/update-statuses', // Utility route for admin to trigger status updates
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  runPollStatusUpdater
);

router.put(
  '/:pollId',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  updatePoll
);

router.delete(
  '/:pollId',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  deletePoll
);


// Authenticated user routes
router.get('/active', protect, getActivePolls);

router.get('/:pollId', protect, getPollById); // Any authenticated user can view a poll's details

router.post('/:pollId/vote', protect, voteInPoll);

router.get('/:pollId/results', protect, getPollResults);


module.exports = router;
