const express = require('express');
const router = express.Router();
const {
  createExpenseTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getFinancialSummaryReport,
  getTransactionCategories, // Added endpoint
} = require('../controllers/accountingController');
const { authorize } = require('../middleware/authMiddleware'); // authorize includes protect
const { ROLES } = require('../utils/constants');

// Create an expense
router.post(
  '/expenses',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  createExpenseTransaction
);

// Get all transactions (with filtering)
router.get(
  '/transactions',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getAllTransactions
);

// Get a single transaction by ID
router.get(
  '/transactions/:id',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getTransactionById
);

// Update a transaction
router.put(
  '/transactions/:id',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  updateTransaction
);

// Delete a transaction
router.delete(
  '/transactions/:id',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  deleteTransaction
);

// Get financial summary report
router.get(
  '/reports/summary',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getFinancialSummaryReport
);

// Get predefined transaction categories
router.get(
  '/categories',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getTransactionCategories
);

module.exports = router;
