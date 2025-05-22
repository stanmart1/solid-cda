const axios = require('axios');
const paymentConfig = require('../config/paymentConfig');

const paystackApi = axios.create({
  baseURL: paymentConfig.paystack.baseUrl || 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${paymentConfig.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Initiates a payment with Paystack.
 * @param {string} email - The user's email address.
 * @param {number} amountInKobo - The amount to be paid, in kobo.
 * @param {string} reference - A unique transaction reference for this payment.
 * @param {string} callback_url - The URL to redirect to after payment attempt.
 * @returns {Promise<object>} - The response from Paystack, typically containing an authorization_url.
 */
const initiatePayment = async (email, amountInKobo, reference, callback_url) => {
  try {
    if (!paymentConfig.paystack.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }
    const payload = {
      email,
      amount: amountInKobo,
      reference,
      callback_url: callback_url || paymentConfig.paystack.callbackUrl, // Use configured callback if not provided
      // You can add more metadata, channels, etc. here if needed
      // "channels": ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"]
    };

    const response = await paystackApi.post('/transaction/initialize', payload);
    // Expected response: { status: true, message: "Authorization URL created", data: { authorization_url, access_code, reference } }
    if (response.data && response.data.status === true) {
      return response.data.data; // Contains authorization_url, access_code, reference
    } else {
      throw new Error(response.data.message || 'Failed to initialize Paystack payment.');
    }
  } catch (error) {
    console.error('Paystack Initiate Payment Error:', error.response ? error.response.data : error.message);
    const errorMessage = error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : error.message;
    throw new Error(`Failed to initiate payment with Paystack: ${errorMessage}`);
  }
};

/**
 * Verifies a transaction with Paystack.
 * @param {string} reference - The transaction reference.
 * @returns {Promise<object>} - The transaction details from Paystack.
 */
const verifyTransaction = async (reference) => {
  try {
    if (!paymentConfig.paystack.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }
    if (!reference) {
        throw new Error('Transaction reference is required for verification.');
    }
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    // Expected response: { status: true, message: "Verification successful", data: { id, domain, status, reference, amount, ... } }
    if (response.data && response.data.status === true) {
      return response.data.data; // Contains the transaction details
    } else {
      // This case might happen if the reference doesn't exist on Paystack or another issue.
      // Paystack usually returns status=true even for failed payments, with data.status reflecting the payment state.
      // If status is false, it's likely an API call issue or invalid reference.
      throw new Error(response.data.message || 'Failed to verify Paystack transaction or invalid reference.');
    }
  } catch (error) {
    console.error('Paystack Verify Transaction Error:', error.response ? error.response.data : error.message);
     const errorMessage = error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : error.message;
    throw new Error(`Failed to verify transaction with Paystack: ${errorMessage}`);
  }
};

module.exports = {
  initiatePayment,
  verifyTransaction,
};
