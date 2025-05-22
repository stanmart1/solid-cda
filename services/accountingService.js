const { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require('../models/transactionModel');
const mongoose = require('mongoose');

// Placeholder for a system user ID. In a real app, this could be a dedicated
// user account for automated system actions, fetched from config or DB.
const SYSTEM_USER_ID_PLACEHOLDER = new mongoose.Types.ObjectId('000000000000000000000000'); // Replace with actual ID

/**
 * Records an income transaction.
 * @param {object} incomeData - Data for the income transaction.
 * @param {string} incomeData.description - Description of the income.
 * @param {string} incomeData.category - Category of the income.
 * @param {number} incomeData.amount - Amount of income.
 * @param {mongoose.Types.ObjectId} incomeData.relatedPaymentRecord - ID of related PaymentRecord.
 * @param {mongoose.Types.ObjectId} incomeData.relatedUser - ID of the user related to this income.
 * @param {mongoose.Types.ObjectId} incomeData.recordedBy - ID of the user/system recording this transaction.
 * @param {Date} [incomeData.date] - Optional date of income, defaults to now.
 * @returns {Promise<Transaction>} - The created transaction object.
 */
const recordIncome = async (incomeData) => {
  const {
    description,
    category,
    amount,
    relatedPaymentRecord,
    relatedUser,
    recordedBy,
    date, // Optional, defaults to now in schema
    notes
  } = incomeData;

  if (!description || !category || !amount || !recordedBy) {
    throw new Error('Description, category, amount, and recordedBy are required for income.');
  }
  if (!INCOME_CATEGORIES.includes(category)) {
      console.warn(`Warning: Category "${category}" is not a predefined income category.`);
      // Depending on strictness, you might throw an error here:
      // throw new Error(`Invalid income category: ${category}`);
  }

  const income = new Transaction({
    date: date || new Date(),
    description,
    type: 'income',
    category,
    amount,
    relatedPaymentRecord,
    relatedUser,
    recordedBy: recordedBy || SYSTEM_USER_ID_PLACEHOLDER, // Fallback to system if not provided
    notes
  });

  await income.save();
  return income;
};

/**
 * Records an expense transaction.
 * @param {object} expenseData - Data for the expense transaction.
 * @param {string} expenseData.description - Description of the expense.
 * @param {string} expenseData.category - Category of the expense.
 * @param {number} expenseData.amount - Amount of expense.
 * @param {mongoose.Types.ObjectId} recordedByUserId - ID of the user recording this expense.
 * @param {Date} [expenseData.date] - Optional date of expense, defaults to now.
 * @param {string} [expenseData.notes] - Optional notes.
 * @param {mongoose.Types.ObjectId} [expenseData.relatedUser] - Optional user related to this expense.
 * @returns {Promise<Transaction>} - The created transaction object.
 */
const recordExpense = async (expenseData, recordedByUserId) => {
  const { description, category, amount, date, notes, relatedUser } = expenseData;

  if (!description || !category || !amount) {
    throw new Error('Description, category, and amount are required for expense.');
  }
  if (!recordedByUserId) {
    throw new Error('recordedByUserId is required to record an expense.');
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    console.warn(`Warning: Category "${category}" is not a predefined expense category.`);
    // Depending on strictness, you might throw an error here:
    // throw new Error(`Invalid expense category: ${category}`);
  }


  const expense = new Transaction({
    date: date || new Date(),
    description,
    type: 'expense',
    category,
    amount,
    recordedBy: recordedByUserId,
    notes,
    relatedUser
  });

  await expense.save();
  return expense;
};

/**
 * Fetches transactions based on filters and pagination options.
 * @param {object} filters - Filtering criteria (e.g., type, dateRange, category).
 * @param {object} paginationOptions - Pagination settings (page, limit).
 * @returns {Promise<{transactions: Transaction[], totalPages: number, currentPage: number, totalRecords: number}>}
 */
const getTransactions = async (filters = {}, paginationOptions = { page: 1, limit: 10 }) => {
  const { type, startDate, endDate, category, userId, recordedById } = filters;
  const query = {};

  if (type) query.type = type;
  if (category) query.category = { $regex: new RegExp(category, 'i') }; // Case-insensitive search
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  if (userId) query.relatedUser = userId;
  if (recordedById) query.recordedBy = recordedById;


  const page = parseInt(paginationOptions.page, 10) || 1;
  const limit = parseInt(paginationOptions.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const transactions = await Transaction.find(query)
    .populate('relatedUser', 'firstName lastName email')
    .populate('recordedBy', 'firstName lastName email')
    .populate('relatedPaymentRecord', 'transactionReference paymentFor')
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await Transaction.countDocuments(query);
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    transactions,
    totalPages,
    currentPage: page,
    totalRecords,
  };
};

/**
 * Calculates financial summary within a given date range.
 * @param {string} startDate - Start date of the period.
 * @param {string} endDate - End date of the period.
 * @returns {Promise<object>} - Financial summary including total income, expenses, net balance, and breakdowns.
 */
const getFinancialSummary = async (startDate, endDate) => {
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required for financial summary.');
  }

  const dateFilter = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  const incomePromise = Transaction.aggregate([
    { $match: { ...dateFilter, type: 'income' } },
    { $group: { _id: '$category', totalAmount: { $sum: '$amount' } } },
    { $sort: { totalAmount: -1 } }
  ]);

  const expensesPromise = Transaction.aggregate([
    { $match: { ...dateFilter, type: 'expense' } },
    { $group: { _id: '$category', totalAmount: { $sum: '$amount' } } },
    { $sort: { totalAmount: -1 } }
  ]);
  
  const totalIncomePromise = Transaction.aggregate([
      { $match: { ...dateFilter, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const totalExpensesPromise = Transaction.aggregate([
      { $match: { ...dateFilter, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);


  const [incomeByCategory, expensesByCategory, totalIncomeResult, totalExpensesResult] = await Promise.all([
    incomePromise,
    expensesPromise,
    totalIncomePromise,
    totalExpensesPromise
  ]);

  const totalIncome = totalIncomeResult.length > 0 ? totalIncomeResult[0].total : 0;
  const totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;
  const netBalance = totalIncome - totalExpenses;

  return {
    startDate,
    endDate,
    totalIncome,
    totalExpenses,
    netBalance,
    incomeByCategory: incomeByCategory.map(item => ({ category: item._id, totalAmount: item.totalAmount })),
    expensesByCategory: expensesByCategory.map(item => ({ category: item._id, totalAmount: item.totalAmount })),
  };
};

module.exports = {
  recordIncome,
  recordExpense,
  getTransactions,
  getFinancialSummary,
  SYSTEM_USER_ID_PLACEHOLDER, // Export for use in integrations if needed
  INCOME_CATEGORIES, // Export for validation or frontend use
  EXPENSE_CATEGORIES, // Export for validation or frontend use
};
