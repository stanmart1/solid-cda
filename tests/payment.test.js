const dotenv = require('dotenv');
// Load .env.test variables at the very top
dotenv.config({ path: '.env.test' });

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

// All other requires come after dotenv
const paymentConfig = require('../config/paymentConfig');
const User = require('../models/userModel');
const PaymentRecord = require('../models/paymentRecordModel');
// paymentRoutes will be required after authMiddleware is mocked
// const paymentRoutes = require('../routes/paymentRoutes'); 
const { errorHandler } = require('../middleware/errorMiddleware');

// Mock authMiddleware first
jest.mock('../middleware/authMiddleware', () => {
  const actualMongoose = require('mongoose'); // Require mongoose inside the factory
  return {
    protect: jest.fn((req, res, next) => {
      req.user = { // Add the mock user here
        id: new actualMongoose.Types.ObjectId().toString(), // Use the locally required mongoose
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'Tenant', // Ensure this role has access if authorize is also used
      };
      next();
    }),
    authorize: jest.fn((rolesArray) => (req, res, next) => {
      // For simplicity, this mock authorize will allow any role if protect has already set req.user
      // A more sophisticated mock might check req.user.role against rolesArray
      next();
    }),
  };
});

// Now require paymentRoutes, it will get the mocked authMiddleware
const paymentRoutes = require('../routes/paymentRoutes');

// Mock services AFTER all real modules they might depend on (like config) are loaded
const paystackService = require('../services/paystackService');
jest.mock('../services/paystackService');

const receiptService = require('../services/receiptService');
jest.mock('../services/receiptService');

const accountingService = require('../services/accountingService');
jest.mock('../services/accountingService');

const notificationService = require('../services/notificationService');
jest.mock('../services/notificationService');

// Setup Express app for testing
const app = express();
app.use(express.json());

// Remove the old mockAuth and app.use for it
// const mockAuth = (req, res, next) => { ... };
// app.use('/api/payments', mockAuth, paymentRoutes); // Removed

// Apply paymentRoutes directly, it will use the mocked protect/authorize
app.use('/api/payments', paymentRoutes);
app.use(errorHandler);

beforeAll(async () => {
  // Log the webhook secret to confirm it's loaded correctly from the .env.test
  console.log('[TEST ENV] Paystack Webhook Secret in beforeAll:', paymentConfig.paystack.webhookSecret);
  if (accountingService) {
    accountingService.SYSTEM_USER_ID_PLACEHOLDER = new mongoose.Types.ObjectId().toString();
    accountingService.INCOME_CATEGORIES = ['Membership Dues', 'Other Income'];
  }
});

afterEach(async () => {
  jest.clearAllMocks();
});

describe('Paystack Payment Integration Tests', () => {
  describe('POST /api/payments/initiate (Paystack)', () => {
    it('should initiate a Paystack payment successfully', async () => {
      paystackService.initiatePayment.mockResolvedValue({
        authorization_url: 'https://checkout.paystack.com/mock_auth_url',
        access_code: 'mock_access_code',
        reference: 'test_tx_ref_paystack',
      });
      const paymentData = { amount: 5000, paymentFor: 'Annual Dues 2024', paymentMethod: 'Paystack' };
      const res = await request(app).post('/api/payments/initiate').send(paymentData);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('paymentLink', 'https://checkout.paystack.com/mock_auth_url');
      // Check if req.user (from mocked protect) was used by the controller for email
      expect(paystackService.initiatePayment).toHaveBeenCalledWith('testuser@example.com', 500000, expect.any(String), expect.any(String));
      const record = await PaymentRecord.findOne({ transactionReference: res.body.transactionReference });
      expect(record).not.toBeNull();
      expect(record.status).toBe('pending');
       // Check if userId from mocked req.user was saved
      expect(record.user.toString()).toEqual(expect.any(String)); // Just check it's an ObjectId string
    });

    it('should return 500 if Paystack initiation fails', async () => {
      paystackService.initiatePayment.mockRejectedValue(new Error('Paystack API Error'));
      const paymentData = { amount: 5000, paymentFor: 'Annual Dues 2024', paymentMethod: 'Paystack' };
      const res = await request(app).post('/api/payments/initiate').send(paymentData);
      expect(res.statusCode).toEqual(500);
      expect(res.body.message).toBe('Paystack API Error'); // Match the exact error message thrown
    });
  });

  describe('GET /api/payments/paystack/callback', () => {
    it('should redirect to success URL if Paystack verification is successful', async () => {
      const mockReference = 'callback_ref_success';
      paystackService.verifyTransaction.mockResolvedValue({ status: 'success', id: 'paystack_tx_id_123' });
      await PaymentRecord.create({ user: new mongoose.Types.ObjectId(), amount: 2000, paymentFor: 'Test Dues', paymentMethod: 'Paystack', status: 'pending', transactionReference: mockReference });
      const res = await request(app).get(`/api/payments/paystack/callback?reference=${mockReference}`);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-success?ref=${mockReference}`);
    }, 30000);

    it('should redirect to failure URL if Paystack verification fails', async () => {
      const mockReference = 'callback_ref_fail';
      paystackService.verifyTransaction.mockResolvedValue({ status: 'failed' });
      await PaymentRecord.create({ user: new mongoose.Types.ObjectId(), amount: 1000, paymentFor: 'Test Dues Fail', paymentMethod: 'Paystack', status: 'pending', transactionReference: mockReference });
      const res = await request(app).get(`/api/payments/paystack/callback?reference=${mockReference}`);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?ref=${mockReference}&status=failed`);
      const record = await PaymentRecord.findOne({ transactionReference: mockReference });
      expect(record.status).toBe('failed');
    }, 30000);

    it('should redirect to failure URL if reference is missing', async () => {
      const res = await request(app).get('/api/payments/paystack/callback');
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?error=no_reference`);
    });
  });

  describe('POST /api/payments/paystack/webhook', () => {
    const getWebhookSecret = () => paymentConfig.paystack.webhookSecret;

    it('should process charge.success webhook, update payment, and generate items', async () => {
      const webhookSecret = getWebhookSecret();
      const webhookPayload = { event: 'charge.success', data: { reference: 'webhook_ref_success', amount: 300000, status: 'success', id: 'paystack_tx_id_webhook', paid_at: new Date().toISOString() } };
      const signature = crypto.createHmac('sha512', webhookSecret).update(JSON.stringify(webhookPayload)).digest('hex');
      const userForRecord = await User.create({ email: 'webhookuser@example.com', firstName: 'Webhook', lastName: 'User', password: 'password' });
      await PaymentRecord.create({ user: userForRecord._id, amount: 3000, paymentFor: 'Webhook Test Dues', paymentMethod: 'Paystack', status: 'pending', transactionReference: 'webhook_ref_success' });
      paystackService.verifyTransaction.mockResolvedValue({ status: 'success', id: webhookPayload.data.id, amount: webhookPayload.data.amount, reference: webhookPayload.data.reference });
      receiptService.generateReceipt.mockResolvedValue('private/receipts/mock-receipt.pdf');
      notificationService.triggerPaymentConfirmedNotification.mockResolvedValue();
      accountingService.recordIncome.mockResolvedValue({});
      const res = await request(app).post('/api/payments/paystack/webhook').set('x-paystack-signature', signature).send(webhookPayload);
      expect(res.statusCode).toEqual(200);
      expect(res.text).toBe('Webhook processed successfully.');
      const updatedRecord = await PaymentRecord.findOne({ transactionReference: 'webhook_ref_success' });
      expect(updatedRecord.status).toBe('successful');
    }, 30000);

    it('should return 400 if signature is invalid', async () => {
      const webhookPayload = { event: 'charge.success', data: { reference: 'ref' } };
      const res = await request(app).post('/api/payments/paystack/webhook').set('x-paystack-signature', 'invalid_signature').send(webhookPayload);
      expect(res.statusCode).toEqual(400);
      expect(res.text).toBe('Invalid signature');
    });

    it('should handle charge.failed event', async () => {
      const webhookSecret = getWebhookSecret();
      const webhookPayload = { event: 'charge.failed', data: { reference: 'webhook_ref_failed', amount: 100000, status: 'failed', id: 'paystack_tx_id_failed_webhook', gateway_response: 'Insufficient funds' } };
      const signature = crypto.createHmac('sha512', webhookSecret).update(JSON.stringify(webhookPayload)).digest('hex');
      await PaymentRecord.create({ user: new mongoose.Types.ObjectId(), amount: 1000, paymentFor: 'Webhook Test Dues Failed', paymentMethod: 'Paystack', status: 'pending', transactionReference: 'webhook_ref_failed' });
      const res = await request(app).post('/api/payments/paystack/webhook').set('x-paystack-signature', signature).send(webhookPayload);
      expect(res.statusCode).toEqual(200);
      expect(res.text).toBe('Webhook for failed payment processed.');
      const record = await PaymentRecord.findOne({ transactionReference: 'webhook_ref_failed' });
      expect(record.status).toBe('failed');
    }, 30000);
  });
});
