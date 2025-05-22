const mongoose = require('mongoose');
const { Schema } = mongoose;

// Consider moving these to utils/constants.js if they grow or are used elsewhere
const TRANSACTION_TYPES = ['income', 'expense'];
const INCOME_CATEGORIES = [
  'Membership Dues',
  'Levies',
  'Event Tickets',
  'Donations',
  'Service Charges',
  'Other Income',
];
const EXPENSE_CATEGORIES = [
  'Utilities', // e.g., Electricity, Water
  'Maintenance & Repairs', // e.g., Plumbing, Electrical, Building
  'Office Supplies & Stationery',
  'Event Costs',
  'Salaries & Wages', // If applicable
  'Security Services',
  'Waste Management',
  'Bank Charges',
  'Legal & Professional Fees',
  'Community Projects',
  'Other Expenses',
];


const transactionSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      required: [true, 'Transaction description is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    category: {
      type: String,
      required: [true, 'Transaction category is required'],
      trim: true,
      // Validator can be enhanced if categories are strictly from the lists above
      // validate: {
      //   validator: function(v) {
      //     if (this.type === 'income') return INCOME_CATEGORIES.includes(v);
      //     if (this.type === 'expense') return EXPENSE_CATEGORIES.includes(v);
      //     return false;
      //   },
      //   message: props => `${props.value} is not a valid category for type ${this.type}`
      // }
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than zero'], // Ensure positive amount
    },
    relatedPaymentRecord: {
      // Link to a specific payment record if this transaction is derived from it
      type: Schema.Types.ObjectId,
      ref: 'PaymentRecord',
      optional: true,
    },
    relatedUser: {
      // User associated with the transaction (e.g., member who paid dues, staff who incurred expense)
      type: Schema.Types.ObjectId,
      ref: 'User',
      optional: true,
    },
    recordedBy: {
      // User who recorded this transaction (Admin/Executive or System)
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      optional: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexing for common queries
transactionSchema.index({ date: -1, type: 1 });
transactionSchema.index({ type: 1, category: 1 });
transactionSchema.index({ relatedPaymentRecord: 1 });
transactionSchema.index({ recordedBy: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = {
    Transaction,
    TRANSACTION_TYPES,
    INCOME_CATEGORIES,
    EXPENSE_CATEGORIES
};
