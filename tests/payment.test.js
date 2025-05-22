const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');

const User = require('../models/userModel');
const PaymentRecord = require('../models/paymentRecordModel').Transaction; // Assuming Transaction is the exported model name
const paymentRoutes = require('../routes/paymentRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');
const dotenv = require('dotenv');
const paymentConfig = require('../config/paymentConfig'); // To get Paystack secret for webhook test

// Mock services
jest.mock('../services/paystackService');
const paystackService = require('../services/paystackService');
jest.mock('../services/receiptService');
const receiptService = require('../services/receiptService');
jest.mock('../services/notificationService');
const notificationService = require('../services/notificationService');
jest.mock('../services/accountingService');
const accountingService = require('../services/accountingService');


// Load .env.test variables
dotenv.config({ path: '.env.test' });

// Setup Express app for testing
const app = express();
app.use(express.json());

// Mock 'protect' and 'authorize' middleware for these tests
// In a larger setup, you might have a more sophisticated way to handle auth in tests
const mockAuth = (req, res, next) => {
  // Simulate an authenticated user
  req.user = {
    id: new mongoose.Types.ObjectId().toString(),
    email: 'testuser@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'Tenant', // Or any role appropriate for the test
  };
  next();
};
app.use('/api/payments', mockAuth, paymentRoutes); // Apply mockAuth before paymentRoutes
app.use(errorHandler);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  // Mock SYSTEM_USER_ID_PLACEHOLDER for accountingService
  accountingService.SYSTEM_USER_ID_PLACEHOLDER = new mongoose.Types.ObjectId().toString();
  accountingService.INCOME_CATEGORIES = ['Membership Dues', 'Other Income']; // Ensure this is defined
});

afterEach(async () => {
  await User.deleteMany({});
  await PaymentRecord.deleteMany({});
  jest.clearAllMocks(); // Clear mock calls between tests
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Paystack Payment Integration Tests', () => {
  describe('POST /api/payments/initiate (Paystack)', () => {
    it('should initiate a Paystack payment successfully', async () => {
      paystackService.initiatePayment.mockResolvedValue({
        authorization_url: 'https://checkout.paystack.com/mock_auth_url',
        access_code: 'mock_access_code',
        reference: 'test_tx_ref_paystack',
      });

      const paymentData = {
        amount: 5000,
        paymentFor: 'Annual Dues 2024',
        paymentMethod: 'Paystack',
      };

      const res = await request(app)
        .post('/api/payments/initiate')
        .send(paymentData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('paymentLink', 'https://checkout.paystack.com/mock_auth_url');
      expect(res.body).toHaveProperty('transactionReference');
      expect(paystackService.initiatePayment).toHaveBeenCalledWith(
        'testuser@example.com',
        500000, // 5000 NGN in kobo
        expect.any(String), // transactionReference
        expect.any(String)  // callback_url
      );
      // Check if PaymentRecord was created with 'pending'
      const record = await PaymentRecord.findOne({ transactionReference: res.body.transactionReference });
      expect(record).not.toBeNull();
      expect(record.status).toBe('pending');
      expect(record.paymentMethod).toBe('Paystack');
    });

    it('should return 500 if Paystack initiation fails', async () => {
        paystackService.initiatePayment.mockRejectedValue(new Error('Paystack API Error'));
        const paymentData = {
            amount: 5000,
            paymentFor: 'Annual Dues 2024',
            paymentMethod: 'Paystack',
        };
        const res = await request(app)
            .post('/api/payments/initiate')
            .send(paymentData);
        expect(res.statusCode).toEqual(500);
        expect(res.body.message).toContain('Failed to initiate payment with Paystack');
    });
  });

  describe('GET /api/payments/paystack/callback', () => {
    it('should redirect to success URL if Paystack verification is successful', async () => {
      const mockReference = 'callback_ref_success';
      paystackService.verifyTransaction.mockResolvedValue({
        status: 'success',
        id: 'paystack_tx_id_123',
        // other details...
      });
      // Create a pending payment record for this callback
      await PaymentRecord.create({
          user: new mongoose.Types.ObjectId(),
          amount: 2000,
          paymentFor: 'Test Dues',
          paymentMethod: 'Paystack',
          status: 'pending',
          transactionReference: mockReference,
      });

      const res = await request(app).get(`/api/payments/paystack/callback?reference=${mockReference}`);
      
      expect(res.statusCode).toEqual(302); // Redirect status
      expect(res.headers.location).toBe(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-success?ref=${mockReference}`);
      // Note: The callback itself doesn't update the DB record status to 'successful' in the current controller logic.
      // It relies on the webhook for that. So, we don't check for DB status change here.
    });

    it('should redirect to failure URL if Paystack verification fails', async () => {
      const mockReference = 'callback_ref_fail';
      paystackService.verifyTransaction.mockResolvedValue({
        status: 'failed',
      });
       await PaymentRecord.create({
          user: new mongoose.Types.ObjectId(),
          amount: 1000,
          paymentFor: 'Test Dues Fail',
          paymentMethod: 'Paystack',
          status: 'pending',
          transactionReference: mockReference,
      });

      const res = await request(app).get(`/api/payments/paystack/callback?reference=${mockReference}`);
      
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?ref=${mockReference}&status=failed`);
      const record = await PaymentRecord.findOne({ transactionReference: mockReference });
      expect(record.status).toBe('failed'); // Callback updates to 'failed' on verification failure
    });

     it('should redirect to failure URL if reference is missing', async () => {
      const res = await request(app).get(`/api/payments/paystack/callback`);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?error=no_reference`);
    });
  });

  describe('POST /api/payments/paystack/webhook', () => {
    const paystackWebhookSecret = paymentConfig.paystack.webhookSecret || 'test_paystack_webhook_secret'; // Use from config or a test default
    // Manually set in .env.test or ensure paymentConfig loads it for the test env.
    // For this test, let's assume process.env.PAYSTACK_WEBHOOK_SECRET is set by dotenv from .env.test
    
    it('should process charge.success webhook, update payment, and generate items', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'webhook_ref_success',
          amount: 300000, // 3000 NGN in kobo
          status: 'success',
          id: 'paystack_tx_id_webhook',
          paid_at: new Date().toISOString(),
          // other Paystack data...
        },
      };
      const signature = crypto.createHmac('sha512', paystackWebhookSecret).update(JSON.stringify(webhookPayload)).digest('hex');

      // Create a pending payment record
      const userForRecord = await User.create({ email: 'webhookuser@example.com', firstName: 'Webhook', lastName: 'User', password: 'password' });
      await PaymentRecord.create({
        user: userForRecord._id,
        amount: 3000, // Amount in major unit
        paymentFor: 'Webhook Test Dues',
        paymentMethod: 'Paystack',
        status: 'pending',
        transactionReference: 'webhook_ref_success',
      });

      paystackService.verifyTransaction.mockResolvedValue({ // Mock for the secondary verification inside webhook
        status: 'success',
        id: webhookPayload.data.id,
        amount: webhookPayload.data.amount, // Ensure amount is in kobo
        reference: webhookPayload.data.reference,
      });
      receiptService.generateReceipt.mockResolvedValue('private/receipts/mock-receipt.pdf');
      notificationService.triggerPaymentConfirmedNotification.mockResolvedValue();
      accountingService.recordIncome.mockResolvedValue({});


      const res = await request(app)
        .post('/api/payments/paystack/webhook')
        .set('x-paystack-signature', signature)
        .send(webhookPayload);

      expect(res.statusCode).toEqual(200);
      expect(res.text).toBe('Webhook processed successfully.');

      const updatedRecord = await PaymentRecord.findOne({ transactionReference: 'webhook_ref_success' });
      expect(updatedRecord.status).toBe('successful');
      expect(updatedRecord.paystackTransactionId).toBe('paystack_tx_id_webhook');
      expect(updatedRecord.receiptUrl).toBe('private/receipts/mock-receipt.pdf');
      expect(notificationService.triggerPaymentConfirmedNotification).toHaveBeenCalledWith(expect.objectContaining({ _id: updatedRecord._id }));
      expect(accountingService.recordIncome).toHaveBeenCalledWith(expect.objectContaining({ relatedPaymentRecord: updatedRecord._id, amount: 3000 }));
    });

    it('should return 400 if signature is invalid', async () => {
      const webhookPayload = { event: 'charge.success', data: { reference: 'ref' } };
      const res = await request(app)
        .post('/api/payments/paystack/webhook')
        .set('x-paystack-signature', 'invalid_signature')
        .send(webhookPayload);
      expect(res.statusCode).toEqual(400);
      expect(res.text).toBe('Invalid signature');
    });
    
    it('should handle charge.failed event', async () => {
        const webhookPayload = {
            event: 'charge.failed',
            data: {
                reference: 'webhook_ref_failed',
                amount: 100000,
                status: 'failed',
                id: 'paystack_tx_id_failed_webhook',
                gateway_response: 'Insufficient funds'
            }
        };
        const signature = crypto.createHmac('sha512', paystackWebhookSecret).update(JSON.stringify(webhookPayload)).digest('hex');
        await PaymentRecord.create({
            user: new mongoose.Types.ObjectId(),
            amount: 1000,
            paymentFor: 'Webhook Test Dues Failed',
            paymentMethod: 'Paystack',
            status: 'pending',
            transactionReference: 'webhook_ref_failed',
        });

        const res = await request(app)
            .post('/api/payments/paystack/webhook')
            .set('x-paystack-signature', signature)
            .send(webhookPayload);
        
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe('Webhook for failed payment processed.');
        const record = await PaymentRecord.findOne({ transactionReference: 'webhook_ref_failed'});
        expect(record.status).toBe('failed');
        expect(record.notes).toContain('Insufficient funds');
    });
  });
});
