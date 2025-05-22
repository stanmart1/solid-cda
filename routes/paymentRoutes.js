const express = require('express');
const router = express.Router();

// Basic Schema definitions for Swagger (can be expanded or moved to a central place)
/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and management
 * components:
 *   schemas:
 *     PaymentInitiationRequest:
 *       type: object
 *       required:
 *         - amount
 *         - paymentFor
 *         - paymentMethod
 *       properties:
 *         amount:
 *           type: number
 *           format: double
 *           description: Amount to be paid.
 *         paymentFor:
 *           type: string
 *           description: Description of what the payment is for (e.g., "Annual Dues 2024").
 *         paymentMethod:
 *           type: string
 *           enum: ['Flutterwave', 'Bank Transfer', 'Haystack', 'Manual']
 *           description: Method of payment.
 *     PaymentInitiationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         paymentLink:
 *           type: string
 *           format: url
 *           description: URL for Flutterwave payment (if applicable).
 *         paymentRecordId:
 *           type: string
 *           description: ID of the created payment record.
 *         transactionReference:
 *           type: string
 *         bankDetails: # For Bank Transfer
 *           type: object
 *           properties:
 *              bankName:
 *                  type: string
 *              accountNumber:
 *                  type: string
 *              accountName:
 *                  type: string
 *         instructions: # For Bank Transfer
 *              type: string
 *     PaymentRecordResponse: # A simplified representation of PaymentRecord
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string # User ID
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         paymentFor:
 *           type: string
 *         paymentMethod:
 *           type: string
 *         status:
 *           type: string
 *         transactionReference:
 *           type: string
 *         paymentDate:
 *           type: string
 *           format: date-time
 *         receiptUrl:
 *           type: string
 *           format: url
 *         # Add other relevant fields from PaymentRecord model
 *   securitySchemes: # Ensure this is defined if not globally
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
const {
  initiatePayment,
  uploadProofOfPayment,
  handleFlutterwaveWebhook,
  confirmBankPayment,
  getUserPaymentRecords,
  getAllPaymentRecords,
  downloadReceipt,
  handlePaystackCallback,  // Added
  handlePaystackWebhook, // Added
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadProof } = require('../middleware/uploadMiddleware'); // File upload middleware
const { ROLES } = require('../utils/constants');

// @route   POST /api/payments/initiate
// @desc    Initiate a new payment
// @access  Private (Authenticated User)
/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiationRequest'
 *     responses:
 *       200:
 *         description: Payment initiated successfully (details depend on paymentMethod)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentInitiationResponse'
 *       400:
 *         description: Invalid input or payment method error
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error or payment gateway error
 */
router.post('/initiate', protect, initiatePayment);

// @route   POST /api/payments/:paymentId/upload-proof
// @desc    Upload proof of payment for Bank Transfer
// @access  Private (Authenticated User)
/**
 * @swagger
 * /payments/{paymentId}/upload-proof:
 *   post:
 *     summary: Upload proof of payment for Bank Transfer
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the payment record.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               proof: # Field name for the file
 *                 type: string
 *                 format: binary
 *                 description: Proof of payment file (image or PDF).
 *     responses:
 *       200:
 *         description: Proof uploaded successfully, awaiting verification.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 paymentRecord:
 *                   $ref: '#/components/schemas/PaymentRecordResponse' # Or a more detailed one
 *       400:
 *         description: No file uploaded or invalid payment ID/method.
 *       401:
 *         description: Not authorized.
 *       403:
 *         description: Not authorized to update this payment record.
 *       404:
 *         description: Payment record not found.
 */
router.post(
  '/:paymentId/upload-proof',
  protect,
  uploadProof.single('proof'), // 'proof' is the field name in the form-data
  uploadProofOfPayment
);

// @route   POST /api/payments/flutterwave/webhook
// @desc    Handle Flutterwave Webhook
// @access  Public (Secured by Flutterwave hash in controller)
/**
 * @swagger
 * /payments/flutterwave/webhook:
 *   post:
 *     summary: Handle Flutterwave webhook events
 *     tags: [Payments, Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object # Define based on Flutterwave webhook payload structure
 *             example:
 *               event: "charge.completed"
 *               data: { id: 123, tx_ref: "CDA-XYZ", amount: 5000, status: "successful" }
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Error processing webhook (e.g., verification failed)
 *       401:
 *         description: Invalid signature (if verif-hash is checked)
 */
router.post('/flutterwave/webhook', handleFlutterwaveWebhook);

// Paystack specific routes
// @route   GET /api/payments/paystack/callback
// @desc    Handle Paystack payment callback
// @access  Public
/**
 * @swagger
 * /payments/paystack/callback:
 *   get:
 *     summary: Handle Paystack payment callback
 *     tags: [Payments, Webhooks]
 *     parameters:
 *       - in: query
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: The transaction reference from Paystack.
 *     responses:
 *       302:
 *         description: Redirects to frontend success or failure page.
 *       400:
 *         description: Invalid request (e.g., missing reference).
 */
router.get('/paystack/callback', handlePaystackCallback);

// @route   POST /api/payments/paystack/webhook
// @desc    Handle Paystack webhook events
// @access  Public (Secured by Paystack signature in controller)
/**
 * @swagger
 * /payments/paystack/webhook:
 *   post:
 *     summary: Handle Paystack webhook events
 *     tags: [Payments, Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object # Define based on Paystack webhook payload structure
 *             example:
 *               event: "charge.success"
 *               data: { reference: "YOUR_TX_REF", amount: 500000, status: "success", id: 12345 }
 *     responses:
 *       200:
 *         description: Webhook processed successfully.
 *       400:
 *         description: Invalid webhook payload or signature.
 */
router.post('/paystack/webhook', handlePaystackWebhook);


// @route   PUT /api/payments/admin/confirm/:paymentId
// @desc    Confirm a bank transfer or manual payment (Admin/Executive)
// @access  Private (Super Admin, Executive)
/**
 * @swagger
 * /payments/admin/confirm/{paymentId}:
 *   put:
 *     summary: Confirm a bank transfer or manual payment (Admin/Executive)
 *     tags: [Payments, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the payment record to confirm.
 *     responses:
 *       200:
 *         description: Payment confirmed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 paymentRecord:
 *                   $ref: '#/components/schemas/PaymentRecordResponse'
 *       400:
 *         description: Invalid request (e.g., payment already confirmed or wrong method).
 *       401:
 *         description: Not authorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Payment record not found.
 */
router.put(
  '/admin/confirm/:paymentId',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]), // authorize includes protect
  confirmBankPayment
);

// @route   GET /api/payments/my-records
// @desc    Get payment records for the logged-in user
// @access  Private (Authenticated User)
/**
 * @swagger
 * /payments/my-records:
 *   get:
 *     summary: Get payment records for the logged-in user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of payment records.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentRecordResponse'
 *       401:
 *         description: Not authorized.
 */
router.get('/my-records', protect, getUserPaymentRecords);

// @route   GET /api/payments/admin/all-records
// @desc    Get all payment records (Admin/Executive)
// @access  Private (Super Admin, Executive)
/**
 * @swagger
 * /payments/admin/all-records:
 *   get:
 *     summary: Get all payment records (Admin/Executive)
 *     tags: [Payments, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters: # Add query params for pagination/filtering if applicable
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by payment status.
 *     responses:
 *       200:
 *         description: A list of all payment records with pagination.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentRecordResponse'
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalRecords:
 *                   type: integer
 *       401:
 *         description: Not authorized.
 *       403:
 *         description: Forbidden.
 */
router.get(
  '/admin/all-records',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getAllPaymentRecords
);

// @route   GET /api/payments/:paymentId/receipt
// @desc    Download a payment receipt
// @access  Private
/**
 * @swagger
 * /payments/{paymentId}/receipt:
 *   get:
 *     summary: Download a payment receipt PDF
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the payment record.
 *     responses:
 *       200:
 *         description: Payment receipt PDF file.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authorized.
 *       403:
 *         description: Forbidden (user does not own the record and is not admin).
 *       404:
 *         description: Payment record or receipt not found, or payment not successful.
 */
router.get('/:paymentId/receipt', protect, downloadReceipt);

module.exports = router;
