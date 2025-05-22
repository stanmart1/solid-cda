const axios = require('axios');
const paymentConfig = require('../config/paymentConfig');
const { v4: uuidv4 } = require('uuid'); // For generating unique references if not provided

const flutterwaveApi = axios.create({
  baseURL: paymentConfig.flutterwave.baseUrl,
  headers: {
    Authorization: `Bearer ${paymentConfig.flutterwave.secretKey}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Initiates a payment with Flutterwave.
 * @param {string} userId - The ID of the user initiating the payment.
 * @param {number} amount - The amount to be paid.
 * @param {string} email - The user's email address.
 * @param {string} name - The user's full name.
 * @param {string} tx_ref - A unique transaction reference for this payment.
 * @param {string} redirect_url - The URL to redirect to after payment.
 * @param {string} paymentFor - Description of what the payment is for.
 * @returns {Promise<object>} - The response from Flutterwave, typically containing a payment link.
 */
const initiatePayment = async (
  userId,
  amount,
  email,
  name,
  tx_ref,
  redirect_url,
  paymentFor
) => {
  try {
    const payload = {
      tx_ref: tx_ref || `${paymentConfig.transactionPrefix}-${uuidv4()}`, // Generate if not provided
      amount,
      currency: paymentConfig.defaultCurrency || 'NGN',
      redirect_url, // URL to redirect to after payment attempt
      payment_options: 'card,banktransfer,ussd', // Customize as needed
      customer: {
        email,
        phonenumber: '', // Optional, but good to have
        name,
      },
      customizations: {
        title: 'CDA Payment',
        description: `Payment for ${paymentFor}`,
        logo: '', // URL to your CDA logo
      },
      meta: {
        user_id: userId,
        payment_for: paymentFor,
      }
    };

    const response = await flutterwaveApi.post('/payments', payload);
    return response.data; // This should contain { status: 'success', message: 'Hosted Link', data: { link: 'PAYMENT_URL' } }
  } catch (error) {
    console.error('Flutterwave Initiate Payment Error:', error.response ? error.response.data : error.message);
    throw new Error(
      `Failed to initiate payment with Flutterwave: ${
        error.response ? error.response.data.message : error.message
      }`
    );
  }
};

/**
 * Verifies a transaction with Flutterwave.
 * @param {string} transaction_id - The Flutterwave transaction ID (numeric).
 * @returns {Promise<object>} - The transaction details from Flutterwave.
 */
const verifyTransaction = async (transaction_id) => {
  try {
    const response = await flutterwaveApi.get(
      `/transactions/${transaction_id}/verify`
    );
    return response.data; // This should contain transaction details
  } catch (error) {
    console.error('Flutterwave Verify Transaction Error:', error.response ? error.response.data : error.message);
    throw new Error(
      `Failed to verify transaction with Flutterwave: ${
        error.response ? error.response.data.message : error.message
      }`
    );
  }
};

module.exports = {
  initiatePayment,
  verifyTransaction,
};
