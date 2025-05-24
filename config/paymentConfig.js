// const dotenv = require('dotenv'); // dotenv will be called by the application entry point or test setup
// dotenv.config(); // Removed to allow environment to be set by entry point or test setup

module.exports = {
  flutterwave: {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
    webhookSecretHash: process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,
    // Base URL for Flutterwave API
    baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co', // Official base URL
  },
  bankTransfer: {
    // These details will be displayed to the user for manual bank transfers
    bankName: process.env.BANK_TRANSFER_BANK_NAME || 'Example Bank Plc',
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER || '0123456789',
    accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME || 'Your CDA Name',
    paymentReferenceInstructions: 'Please use your transaction reference ID as the payment narration.',
  },
  // Default currency if not specified elsewhere
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'NGN',
  // Transaction reference prefix
  transactionPrefix: process.env.TRANSACTION_PREFIX || 'CDA',
};
