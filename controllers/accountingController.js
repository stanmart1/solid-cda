const asyncHandler = require('express-async-handler');
const accountingService = require('../services/accountingService');
const { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require('../models/transactionModel');
const mongoose = require('mongoose');

// @desc    Create an expense transaction
// @route   POST /api/accounting/expenses
// @access  Private (Super Admin, Executive)
const createExpenseTransaction = asyncHandler(async (req, res) => {
  const { date, description, category, amount, notes, relatedUser } = req.body;
  const recordedByUserId = req.user.id;

  if (!description || !category || !amount) {
    res.status(400);
    throw new Error('Description, category, and amount are required for an expense.');
  }
  if (parseFloat(amount) <= 0) {
    res.status(400);
    throw new Error('Expense amount must be greater than zero.');
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
      // Allow non-predefined categories but perhaps with a warning or specific handling
      console.warn(`Expense category "${category}" is not in predefined list.`);
      // If strict validation is desired:
      // res.status(400);
      // throw new Error(`Invalid expense category: ${category}. Choose from: ${EXPENSE_CATEGORIES.join(', ')}`);
  }


  const expenseData = { date, description, category, amount: parseFloat(amount), notes, relatedUser };
  const transaction = await accountingService.recordExpense(expenseData, recordedByUserId);
  res.status(201).json(transaction);
});

// @desc    Get all transactions with filtering and pagination
// @route   GET /api/accounting/transactions
// @access  Private (Super Admin, Executive)
const getAllTransactions = asyncHandler(async (req, res) => {
  const { type, startDate, endDate, category, userId, recordedById, page, limit } = req.query;
  const filters = { type, startDate, endDate, category, userId, recordedById };
  const paginationOptions = { page, limit };

  const result = await accountingService.getTransactions(filters, paginationOptions);
  res.json(result);
});

// @desc    Get a single transaction by ID
// @route   GET /api/accounting/transactions/:id
// @access  Private (Super Admin, Executive)
const getTransactionById = asyncHandler(async (req, res) => {
  const transactionId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400);
      throw new Error('Invalid transaction ID format.');
  }
  const transaction = await Transaction.findById(transactionId)
    .populate('relatedUser', 'firstName lastName email')
    .populate('recordedBy', 'firstName lastName email')
    .populate('relatedPaymentRecord', 'transactionReference paymentFor');

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found.');
  }
  res.json(transaction);
});

// @desc    Update a transaction
// @route   PUT /api/accounting/transactions/:id
// @access  Private (Super Admin, Executive)
const updateTransaction = asyncHandler(async (req, res) => {
  const transactionId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400);
      throw new Error('Invalid transaction ID format.');
  }

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found.');
  }

  // Be cautious about updating automated income transactions.
  // For example, amount or type of an income transaction linked to a PaymentRecord should generally not be changed.
  if (transaction.type === 'income' && transaction.relatedPaymentRecord) {
      // Allow updating notes, or perhaps category if it was miscategorized initially.
      // Disallow changing amount, type, relatedPaymentRecord, relatedUser for such transactions.
      const allowedUpdatesForAutomatedIncome = ['notes', 'category', 'description', 'date'];
      for (const key in req.body) {
          if (!allowedUpdatesForAutomatedIncome.includes(key)) {
              res.status(400);
              throw new Error(`Cannot update field '${key}' for an automated income transaction. Consider adjusting notes or category only.`);
          }
      }
  }

  // Update fields
  transaction.date = req.body.date || transaction.date;
  transaction.description = req.body.description || transaction.description;
  transaction.category = req.body.category || transaction.category;
  transaction.notes = req.body.notes || transaction.notes; // Allows clearing notes if empty string passed

  // Only update amount if it's an expense or a non-automated income
  if (req.body.amount !== undefined) {
    if (transaction.type === 'expense' || !transaction.relatedPaymentRecord) {
      const newAmount = parseFloat(req.body.amount);
      if (newAmount <= 0) {
        res.status(400);
        throw new Error('Amount must be greater than zero.');
      }
      transaction.amount = newAmount;
    } else {
      // If amount is in req.body for an automated income, but it's not allowed to change.
      res.status(400);
      throw new Error('Amount for automated income transactions cannot be changed here.');
    }
  }
  
  // Validate category based on type if type is being changed (generally not recommended for existing transactions)
  if (req.body.category) {
    if (transaction.type === 'income' && !INCOME_CATEGORIES.includes(req.body.category)) {
        console.warn(`Updating income transaction with non-standard category: ${req.body.category}`);
    } else if (transaction.type === 'expense' && !EXPENSE_CATEGORIES.includes(req.body.category)) {
        console.warn(`Updating expense transaction with non-standard category: ${req.body.category}`);
    }
  }


  // recordedBy should not change typically, unless correcting an error by an admin.
  // relatedUser might change if it was an error.
  if (req.body.relatedUser) transaction.relatedUser = req.body.relatedUser;


  const updatedTransaction = await transaction.save();
  res.json(updatedTransaction);
});

// @desc    Delete a transaction
// @route   DELETE /api/accounting/transactions/:id
// @access  Private (Super Admin, Executive)
const deleteTransaction = asyncHandler(async (req, res) => {
  const transactionId = req.params.id;
   if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400);
      throw new Error('Invalid transaction ID format.');
  }
  const transaction = await Transaction.findById(transactionId);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found.');
  }

  // Caution: Deleting an income transaction linked to a PaymentRecord might break accounting integrity
  // unless there's a clear process for this (e.g., refund processed).
  if (transaction.type === 'income' && transaction.relatedPaymentRecord) {
    // Consider preventing deletion or requiring a special flag/confirmation.
    // For now, we'll allow it but this is a point for review in a real system.
    console.warn(`Deleting an income transaction (${transactionId}) linked to a payment record (${transaction.relatedPaymentRecord}). Ensure this is intended.`);
  }

  await transaction.deleteOne(); // Mongoose v6+
  res.json({ message: 'Transaction deleted successfully.' });
});

// @desc    Get financial summary report
// @route   GET /api/accounting/reports/summary
// @access  Private (Super Admin, Executive)
const getFinancialSummaryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('startDate and endDate query parameters are required.');
  }
  // Basic date validation (can be more robust)
  if (new Date(startDate) > new Date(endDate)) {
      res.status(400);
      throw new Error('startDate cannot be after endDate.');
  }

  const summary = await accountingService.getFinancialSummary(startDate, endDate);
  res.json(summary);
});

// @desc    Get predefined transaction categories
// @route   GET /api/accounting/categories
// @access  Private (Super Admin, Executive)
const getTransactionCategories = asyncHandler(async (req, res) => {
    res.json({
        incomeCategories: INCOME_CATEGORIES,
        expenseCategories: EXPENSE_CATEGORIES,
        allTransactionTypes: Transaction.schema.path('type').enumValues // Or use imported TRANSACTION_TYPES
    });
});


module.exports = {
  createExpenseTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getFinancialSummaryReport,
  getTransactionCategories, // Added helper endpoint
};
