const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const PaymentRecord = require('../models/paymentRecordModel');
const crypto = require('crypto'); // Added for Paystack webhook
const User = require('../models/userModel'); // Needed for user details in receipt
const flutterwaveService = require('../services/flutterwaveService');
const paystackService = require('../services/paystackService'); // Added
const notificationService = require('../services/notificationService');
const receiptService = require('../services/receiptService');
const accountingService = require('../services/accountingService'); // Added
const paymentConfig = require('../config/paymentConfig');
const { ROLES } = require('../utils/constants');

// @desc    Initiate a new payment
// @route   POST /api/payments/initiate
// @access  Private (Authenticated User)
const initiatePayment = asyncHandler(async (req, res) => {
  const { amount, paymentFor, paymentMethod } = req.body;
  const userId = req.user.id;

  if (!amount || !paymentFor || !paymentMethod) {
    res.status(400);
    throw new Error('Amount, paymentFor, and paymentMethod are required.');
  }
  if (amount <= 0) {
    res.status(400);
    throw new Error('Amount must be greater than zero.');
  }

  const transactionReference = `${paymentConfig.transactionPrefix}-${uuidv4()}`;

  const paymentRecord = await PaymentRecord.create({
    user: userId,
    amount,
    currency: paymentConfig.defaultCurrency,
    paymentFor,
    paymentMethod,
    status: 'pending',
    transactionReference,
  });

  if (paymentMethod === 'Flutterwave') {
    // For Flutterwave, the redirect URL should point to a frontend page that will handle the response
    // Or, if this API is called from backend, it might be a webhook URL or a confirmation page.
    // For now, let's assume a generic redirect URL, to be configured in .env
    const redirect_url = process.env.FLUTTERWAVE_REDIRECT_URL || `${req.protocol}://${req.get('host')}/api/payments/flutterwave/callback`; // Placeholder

    try {
      const flutterwaveResponse = await flutterwaveService.initiatePayment(
        userId,
        amount,
        req.user.email,
        `${req.user.firstName} ${req.user.lastName}`,
        transactionReference,
        redirect_url,
        paymentFor
      );

      if (flutterwaveResponse.status === 'success' && flutterwaveResponse.data && flutterwaveResponse.data.link) {
        res.json({
          message: 'Payment initiated with Flutterwave. Redirect to the provided link.',
          paymentLink: flutterwaveResponse.data.link,
          paymentRecordId: paymentRecord._id,
          transactionReference: paymentRecord.transactionReference,
        });
      } else {
        paymentRecord.status = 'failed';
        paymentRecord.notes = 'Flutterwave initiation failed: No link returned.';
        await paymentRecord.save();
        res.status(500);
        throw new Error('Failed to initiate payment with Flutterwave. Please try again.');
      }
    } catch (error) {
      paymentRecord.status = 'failed';
      paymentRecord.notes = `Flutterwave initiation error: ${error.message}`;
      await paymentRecord.save();
      res.status(500);
      throw new Error(error.message || 'Failed to initiate payment with Flutterwave.');
    }
  } else if (paymentMethod === 'Bank Transfer') {
    res.json({
      message: 'Please use the following bank details for your transfer.',
      bankDetails: paymentConfig.bankTransfer,
      paymentRecordId: paymentRecord._id,
      transactionReference: paymentRecord.transactionReference,
      instructions: `Use your transaction reference: ${paymentRecord.transactionReference} as the payment narration. After payment, upload your proof.`,
    });
  } else if (paymentMethod === 'Haystack') {
    // Placeholder for Haystack
    paymentRecord.status = 'failed';
    paymentRecord.notes = 'Haystack payment method is not yet implemented.';
    await paymentRecord.save();
    res.status(501).json({ message: 'Haystack payment integration is coming soon.' });
  } else if (paymentMethod === 'Manual') {
      // For manual payments, an admin usually records this.
      // This route might be restricted or handled differently.
      // For now, just acknowledge. Admin will confirm later.
      res.json({
          message: 'Manual payment initiated. Awaiting admin confirmation.',
          paymentRecordId: paymentRecord._id,
          transactionReference: paymentRecord.transactionReference,
      });
  } else {
    paymentRecord.status = 'failed';
    paymentRecord.notes = `Invalid payment method: ${paymentMethod}`;
    await paymentRecord.save();
    res.status(400);
    throw new Error('Invalid payment method selected.');
  } else if (paymentMethod === 'Paystack') {
    // Ensure amount is in Kobo for Paystack
    const amountInKobo = Math.round(amount * 100);
    const callback_url = paymentConfig.paystack.callbackUrl || `${req.protocol}://${req.get('host')}/api/payments/paystack/callback`; // Default if not in .env

    try {
      const paystackResponse = await paystackService.initiatePayment(
        req.user.email,
        amountInKobo,
        transactionReference,
        callback_url
      );

      if (paystackResponse && paystackResponse.authorization_url) {
        // Update payment record with Paystack's reference if different or needed
        // paymentRecord.paystackAccessCode = paystackResponse.access_code; // Optional storage
        await paymentRecord.save(); // Save any changes if made

        res.json({
          message: 'Payment initiated with Paystack. Redirect to the provided link.',
          paymentLink: paystackResponse.authorization_url,
          paymentRecordId: paymentRecord._id,
          transactionReference: paymentRecord.transactionReference,
        });
      } else {
        paymentRecord.status = 'failed';
        paymentRecord.notes = 'Paystack initiation failed: No authorization_url returned.';
        await paymentRecord.save();
        res.status(500);
        throw new Error('Failed to initiate payment with Paystack. Please try again.');
      }
    } catch (error) {
      paymentRecord.status = 'failed';
      paymentRecord.notes = `Paystack initiation error: ${error.message}`;
      await paymentRecord.save();
      res.status(500);
      throw new Error(error.message || 'Failed to initiate payment with Paystack.');
    }
  } else { // Fallback for any other unexpected paymentMethod
    paymentRecord.status = 'failed';
    paymentRecord.notes = `Unsupported payment method: ${paymentMethod}`;
    await paymentRecord.save();
    res.status(400);
    throw new Error('Unsupported payment method selected.');
  }
});

// @desc    Upload proof of payment for Bank Transfer
// @route   POST /api/payments/:paymentId/upload-proof
// @access  Private (Authenticated User)
const uploadProofOfPayment = asyncHandler(async (req, res) => {
  const paymentId = req.params.paymentId;

  if (!req.file) {
    res.status(400);
    throw new Error('No proof of payment file uploaded.');
  }

  const paymentRecord = await PaymentRecord.findById(paymentId);

  if (!paymentRecord) {
    res.status(404);
    throw new Error('Payment record not found.');
  }

  // Ensure the user owns this payment record or is an admin
  if (paymentRecord.user.toString() !== req.user.id && req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.EXECUTIVE) {
    res.status(403);
    throw new Error('Not authorized to update this payment record.');
  }

  if (paymentRecord.paymentMethod !== 'Bank Transfer') {
    res.status(400);
    throw new Error('Proof of payment can only be uploaded for Bank Transfer method.');
  }

  if (paymentRecord.status === 'successful' || paymentRecord.status === 'verifying') {
     // Optionally allow re-upload if status is 'verifying' and previous proof was problematic
     if(paymentRecord.status === 'successful'){
        res.status(400);
        throw new Error(`Payment is already ${paymentRecord.status}.`);
     }
  }

  // The uploadProof middleware saves the file and req.file.path contains the relative path
  paymentRecord.proofOfPaymentUrl = req.file.path; // Store the path
  paymentRecord.status = 'verifying';
  paymentRecord.notes = 'Proof of payment uploaded by user.';
  await paymentRecord.save();

  res.json({
    message: 'Proof of payment uploaded successfully. Awaiting verification.',
    paymentRecord,
  });
});


// @desc    Handle Flutterwave Webhook
// @route   POST /api/payments/flutterwave/webhook
// @access  Public (Secured by Flutterwave hash)
const handleFlutterwaveWebhook = asyncHandler(async (req, res) => {
  const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  const signature = req.headers['verif-hash']; // Note: Flutterwave uses 'verif-hash'

  if (!signature || signature !== secretHash) {
    // This request isn't from Flutterwave. Discard.
    console.warn('Invalid Flutterwave webhook signature:', signature);
    res.status(401).send('Invalid signature');
    return;
  }

  const payload = req.body;
  // console.log('Flutterwave Webhook Payload:', JSON.stringify(payload, null, 2));


  // Check event type, e.g., 'charge.completed'
  // The exact event type and payload structure should be verified from Flutterwave docs
  // For successful transaction, payload.event is 'charge.completed' and payload.data.status is 'successful'
  if (payload.event === 'charge.completed' && payload.data && payload.data.status === 'successful') {
    const { id: flutterwaveTransactionId, tx_ref: transactionReference, amount, currency } = payload.data;

    // Verify transaction with Flutterwave API again for security (optional but recommended)
    try {
      const verifiedTx = await flutterwaveService.verifyTransaction(flutterwaveTransactionId.toString()); // FW tx_id is numeric
      
      if (
        verifiedTx.status === 'success' &&
        verifiedTx.data.status === 'successful' &&
        verifiedTx.data.tx_ref === transactionReference &&
        Number(verifiedTx.data.amount) === Number(amount) && // Ensure amount matches
        verifiedTx.data.currency === currency // Ensure currency matches
      ) {
        const paymentRecord = await PaymentRecord.findOne({ transactionReference });

        if (paymentRecord) {
          if (paymentRecord.status === 'successful') {
            console.log(`Transaction ${transactionReference} already processed and marked successful.`);
            res.status(200).send('Transaction already processed.');
            return;
          }

          paymentRecord.status = 'successful';
          paymentRecord.flutterwaveTransactionId = flutterwaveTransactionId.toString();
          paymentRecord.paymentDate = new Date(payload.data.created_at); // Use FW timestamp
          paymentRecord.notes = 'Payment confirmed via Flutterwave webhook.';

          const user = await User.findById(paymentRecord.user);
          if (user) {
            const receiptPath = await receiptService.generateReceipt(paymentRecord, user);
            paymentRecord.receiptUrl = receiptPath;
          } else {
            console.error(`User not found for payment record ${paymentRecord._id} during webhook processing.`);
            // Decide if to fail or proceed without receipt for now
          }
          
          await paymentRecord.save();
          console.log(`Payment ${transactionReference} successfully updated from webhook.`);
          
          // Trigger payment confirmation notification
          try {
            await notificationService.triggerPaymentConfirmedNotification(paymentRecord);
          } catch (notificationError) {
            console.error(`Payment confirmed notification failed for record ${paymentRecord._id}:`, notificationError);
          }

          // Record income transaction
          try {
            await accountingService.recordIncome({
              description: `Payment for ${paymentRecord.paymentFor} (Ref: ${paymentRecord.transactionReference})`,
              category: accountingService.INCOME_CATEGORIES[0], // Default to 'Membership Dues' or first category
              amount: paymentRecord.amount,
              relatedPaymentRecord: paymentRecord._id,
              relatedUser: paymentRecord.user,
              recordedBy: accountingService.SYSTEM_USER_ID_PLACEHOLDER, // System action
              date: paymentRecord.paymentDate || new Date(),
              notes: `Automated income from Flutterwave payment.`
            });
          } catch (accountingError) {
            console.error(`Accounting income record failed for payment ${paymentRecord._id} (webhook):`, accountingError);
            // Do not fail the process if accounting fails. Log it. Critical for reconciliation later.
          }

          res.status(200).send('Webhook processed successfully.');
        } else {
          console.error(`Payment record with tx_ref ${transactionReference} not found for webhook.`);
          res.status(404).send('Payment record not found.');
        }
      } else {
        console.warn(`Flutterwave webhook: Transaction verification failed or data mismatch for ${transactionReference}. FW Verify Status: ${verifiedTx.data.status}, Amount: ${verifiedTx.data.amount}, Expected Amount: ${amount}`);
        // Potentially mark payment as 'failed' or 'requires_review'
        const paymentRecord = await PaymentRecord.findOne({ transactionReference });
        if(paymentRecord && paymentRecord.status !== 'successful'){
            paymentRecord.status = 'failed'; // Or a custom status like 'verification_failed'
            paymentRecord.notes = 'Webhook received but Flutterwave API verification failed or data mismatch.';
            await paymentRecord.save();
        }
        res.status(400).send('Transaction verification failed or data mismatch.');
      }
    } catch (error) {
      console.error('Error verifying Flutterwave transaction from webhook:', error);
      res.status(500).send('Error processing webhook.');
    }
  } else if (payload.event === 'charge.completed' && payload.data && payload.data.status === 'failed') {
      const { tx_ref: transactionReference } = payload.data;
      const paymentRecord = await PaymentRecord.findOne({ transactionReference });
      if(paymentRecord && paymentRecord.status !== 'successful'){ // Do not update if already successful by other means
          paymentRecord.status = 'failed';
          paymentRecord.flutterwaveTransactionId = payload.data.id.toString();
          paymentRecord.notes = `Payment failed as per Flutterwave webhook: ${payload.data.processor_response || 'Unknown reason'}`;
          await paymentRecord.save();
          console.log(`Payment ${transactionReference} marked as FAILED from webhook.`);
          res.status(200).send('Webhook for failed payment processed.');
      } else {
          res.status(200).send('Webhook for failed payment received, but no action taken (already successful or not found).');
      }
  } else {
    console.log('Received other Flutterwave event or unhandled status:', payload.event, payload.data ? payload.data.status : 'N/A');
    res.status(200).send('Webhook received, but no action taken for this event type or status.');
  }
});

// @desc    Confirm a bank transfer payment (Admin/Executive)
// @route   PUT /api/payments/admin/confirm/:paymentId
// @access  Private (Super Admin, Executive)
const confirmBankPayment = asyncHandler(async (req, res) => {
  const paymentId = req.params.paymentId;
  const adminUserId = req.user.id;

  const paymentRecord = await PaymentRecord.findById(paymentId);

  if (!paymentRecord) {
    res.status(404);
    throw new Error('Payment record not found.');
  }

  if (paymentRecord.paymentMethod !== 'Bank Transfer' && paymentRecord.paymentMethod !== 'Manual') {
    res.status(400);
    throw new Error(`This confirmation is for 'Bank Transfer' or 'Manual' payments only. This payment is via ${paymentRecord.paymentMethod}.`);
  }

  if (paymentRecord.status === 'successful') {
    res.status(400);
    throw new Error('Payment is already marked as successful.');
  }
  
  // For 'Bank Transfer', ensure proof was uploaded if required by policy
  if (paymentRecord.paymentMethod === 'Bank Transfer' && !paymentRecord.proofOfPaymentUrl) {
    // Allow confirmation without proof if admin deems it okay, but maybe add a note.
    // For stricter policy:
    // res.status(400);
    // throw new Error('Proof of payment has not been uploaded for this bank transfer.');
    paymentRecord.notes = (paymentRecord.notes || '') + ' Admin confirmed without proof. ';
  }


  paymentRecord.status = 'successful';
  paymentRecord.verifiedBy = adminUserId;
  paymentRecord.verificationDate = Date.now();
  paymentRecord.paymentDate = Date.now(); // Update payment date to confirmation date or allow input
  paymentRecord.notes = (paymentRecord.notes || '') + `Payment confirmed by admin ${req.user.email}.`;


  const user = await User.findById(paymentRecord.user);
  if (user) {
    const receiptPath = await receiptService.generateReceipt(paymentRecord, user);
    paymentRecord.receiptUrl = receiptPath;
  } else {
    console.error(`User not found for payment record ${paymentRecord._id} during bank payment confirmation.`);
  }

  await paymentRecord.save();

  // Trigger payment confirmation notification
  try {
    await notificationService.triggerPaymentConfirmedNotification(paymentRecord);
  } catch (notificationError) {
    console.error(`Payment confirmed notification failed for record ${paymentRecord._id} (manual confirmation):`, notificationError);
  }

  // Record income transaction
   try {
    await accountingService.recordIncome({
      description: `Payment for ${paymentRecord.paymentFor} (Ref: ${paymentRecord.transactionReference}) - Confirmed Manually`,
      category: accountingService.INCOME_CATEGORIES[0], // Default to 'Membership Dues' or first category
      amount: paymentRecord.amount,
      relatedPaymentRecord: paymentRecord._id,
      relatedUser: paymentRecord.user,
      recordedBy: req.user.id, // Admin who confirmed
      date: paymentRecord.verificationDate || new Date(),
      notes: `Automated income from manually confirmed ${paymentRecord.paymentMethod} payment.`
    });
  } catch (accountingError) {
    console.error(`Accounting income record failed for payment ${paymentRecord._id} (manual confirmation):`, accountingError);
  }

  res.json({
    message: 'Bank payment confirmed successfully.',
    paymentRecord,
  });
});

// @desc    Get payment records for the logged-in user
// @route   GET /api/payments/my-records
// @access  Private (Authenticated User)
const getUserPaymentRecords = asyncHandler(async (req, res) => {
  const payments = await PaymentRecord.find({ user: req.user.id })
    .sort({ createdAt: -1 }) // Sort by newest first
    .populate('verifiedBy', 'firstName lastName email'); // Optional: populate who verified

  res.json(payments);
});

// @desc    Get all payment records (Admin/Executive)
// @route   GET /api/payments/admin/all-records
// @access  Private (Super Admin, Executive)
const getAllPaymentRecords = asyncHandler(async (req, res) => {
  // Basic pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Basic filtering (can be expanded)
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.userId) {
    filter.user = req.query.userId;
  }
  if (req.query.paymentMethod) {
    filter.paymentMethod = req.query.paymentMethod;
  }

  const payments = await PaymentRecord.find(filter)
    .populate('user', 'firstName lastName email')
    .populate('verifiedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await PaymentRecord.countDocuments(filter);

  res.json({
    payments,
    currentPage: page,
    totalPages: Math.ceil(totalRecords / limit),
    totalRecords,
  });
});

// @desc    Download a payment receipt
// @route   GET /api/payments/:paymentId/receipt
// @access  Private
const downloadReceipt = asyncHandler(async (req, res) => {
  const paymentId = req.params.paymentId;
  const paymentRecord = await PaymentRecord.findById(paymentId);

  if (!paymentRecord) {
    res.status(404);
    throw new Error('Payment record not found.');
  }

  // Security: Ensure user owns the record or is an admin
  if (
    paymentRecord.user.toString() !== req.user.id &&
    req.user.role !== ROLES.SUPER_ADMIN &&
    req.user.role !== ROLES.EXECUTIVE
  ) {
    res.status(403);
    throw new Error('Not authorized to download this receipt.');
  }

  if (!paymentRecord.receiptUrl || paymentRecord.status !== 'successful') {
    res.status(404);
    throw new Error('Receipt not available or payment not successful.');
  }

  const receiptFilePath = path.join(__dirname, '..', paymentRecord.receiptUrl);

  if (fs.existsSync(receiptFilePath)) {
    res.download(receiptFilePath, (err) => {
      if (err) {
        console.error('Error downloading receipt:', err);
        // Avoid sending another response if headers already sent by res.download
        if (!res.headersSent) {
            res.status(500).send('Could not download the receipt.');
        }
      }
    });
  } else {
    console.error(`Receipt file not found at path: ${receiptFilePath} for payment ID: ${paymentId}`);
    res.status(404);
    throw new Error('Receipt file not found on server.');
  }
});


module.exports = {
  initiatePayment,
  uploadProofOfPayment,
  handleFlutterwaveWebhook,
  confirmBankPayment,
  getUserPaymentRecords,
  getAllPaymentRecords,
  downloadReceipt,
};

// @desc    Handle Paystack Callback
// @route   GET /api/payments/paystack/callback
// @access  Public
const handlePaystackCallback = asyncHandler(async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    // Redirect to a frontend failure page if no reference
    return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?error=no_reference`);
  }

  try {
    const transactionDetails = await paystackService.verifyTransaction(reference);

    // Check transaction status (e.g., transactionDetails.status === 'success')
    if (transactionDetails && transactionDetails.status === 'success') {
      const paymentRecord = await PaymentRecord.findOne({ transactionReference: reference });

      if (paymentRecord) {
        if (paymentRecord.status === 'pending') {
          // This is a good place for preliminary update, but webhook is more reliable for final confirmation.
          // For now, we'll assume webhook will handle the final update.
          // If you want to confirm here, ensure it's idempotent with webhook.
          console.log(`Paystack callback: Payment for reference ${reference} was successful. Awaiting webhook for final confirmation.`);
          // paymentRecord.status = 'verifying'; // Or some intermediate status
          // paymentRecord.paystackTransactionId = transactionDetails.id.toString();
          // await paymentRecord.save();
        } else if (paymentRecord.status === 'successful') {
          console.log(`Paystack callback: Payment for reference ${reference} already confirmed as successful.`);
        }
        // Redirect to a frontend success page
        return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-success?ref=${reference}`);
      } else {
        console.error(`Paystack callback: Payment record with reference ${reference} not found.`);
        return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?error=record_not_found&ref=${reference}`);
      }
    } else {
      // Payment was not successful according to Paystack verification
      console.log(`Paystack callback: Payment verification failed or payment not successful for reference ${reference}. Status: ${transactionDetails ? transactionDetails.status : 'N/A'}`);
      const paymentRecord = await PaymentRecord.findOne({ transactionReference: reference });
      if (paymentRecord && paymentRecord.status === 'pending') {
        paymentRecord.status = 'failed';
        paymentRecord.notes = `Payment failed or verification issue via Paystack callback. Paystack status: ${transactionDetails ? transactionDetails.status : 'Unknown'}`;
        await paymentRecord.save();
      }
      return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?ref=${reference}&status=${transactionDetails ? transactionDetails.status : 'failed'}`);
    }
  } catch (error) {
    console.error(`Paystack callback error for reference ${reference}:`, error.message);
    // Redirect to a frontend failure page
    return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment-failure?error=verification_error&ref=${reference}`);
  }
});


// @desc    Handle Paystack Webhook
// @route   POST /api/payments/paystack/webhook
// @access  Public (Secured by Paystack signature)
const handlePaystackWebhook = asyncHandler(async (req, res) => {
  const secret = paymentConfig.paystack.webhookSecret;
  // Validate event from Paystack
  // Compare the signature on the request with a hash of the request body
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('Paystack webhook: Invalid signature.');
    // Invalid signature
    res.status(400).send('Invalid signature');
    return;
  }

  const event = req.body.event;
  const data = req.body.data;

  if (!event || !data) {
      res.status(400).send('Invalid webhook payload.');
      return;
  }

  // console.log('Paystack Webhook Event:', event, 'Data:', JSON.stringify(data, null, 2));


  if (event === 'charge.success') {
    const reference = data.reference;
    const paymentRecord = await PaymentRecord.findOne({ transactionReference: reference });

    if (paymentRecord) {
      if (paymentRecord.status === 'successful') {
        console.log(`Paystack webhook: Payment ${reference} already processed and marked successful.`);
        res.status(200).send('Transaction already processed.');
        return;
      }

      // Verify again with Paystack API for added security (optional but recommended for webhooks)
      try {
        const verifiedTx = await paystackService.verifyTransaction(reference);
        if (verifiedTx && verifiedTx.status === 'success' && verifiedTx.id.toString() === data.id.toString() && Math.round(verifiedTx.amount) === Math.round(data.amount)) {
          paymentRecord.status = 'successful';
          paymentRecord.paystackTransactionId = data.id.toString(); // Paystack's unique transaction ID
          paymentRecord.paymentDate = new Date(data.paid_at || data.created_at);
          paymentRecord.notes = 'Payment confirmed via Paystack webhook.';

          const user = await User.findById(paymentRecord.user);
          if (user) {
            const receiptPath = await receiptService.generateReceipt(paymentRecord, user);
            paymentRecord.receiptUrl = receiptPath;
          } else {
            console.error(`User not found for payment record ${paymentRecord._id} during Paystack webhook processing.`);
          }
          
          await paymentRecord.save();
          console.log(`Payment ${reference} successfully updated from Paystack webhook.`);

          // Trigger notifications
          try {
            await notificationService.triggerPaymentConfirmedNotification(paymentRecord);
          } catch (notificationError) {
            console.error(`Payment confirmed notification failed for record ${paymentRecord._id} (Paystack webhook):`, notificationError);
          }

          // Record income transaction
          try {
            await accountingService.recordIncome({
              description: `Payment for ${paymentRecord.paymentFor} (Ref: ${reference})`,
              category: accountingService.INCOME_CATEGORIES[0], // Default category
              amount: paymentRecord.amount, // Amount is already in major unit in paymentRecord
              relatedPaymentRecord: paymentRecord._id,
              relatedUser: paymentRecord.user,
              recordedBy: accountingService.SYSTEM_USER_ID_PLACEHOLDER,
              date: paymentRecord.paymentDate,
              notes: `Automated income from Paystack payment.`
            });
          } catch (accountingError) {
            console.error(`Accounting income record failed for payment ${paymentRecord._id} (Paystack webhook):`, accountingError);
          }

          res.status(200).send('Webhook processed successfully.');

        } else {
            console.warn(`Paystack webhook: Transaction ${reference} verification failed or data mismatch. Paystack API Verify Status: ${verifiedTx ? verifiedTx.status : 'N/A'}, Amount: ${verifiedTx ? verifiedTx.amount : 'N/A'}, Expected Amount: ${data.amount}`);
            paymentRecord.status = 'failed'; // Or 'verification_failed'
            paymentRecord.notes = 'Webhook received but Paystack API verification failed or data mismatch.';
            await paymentRecord.save();
            res.status(400).send('Transaction verification failed or data mismatch.');
        }
      } catch (verifyError) {
          console.error(`Error verifying Paystack transaction ${reference} from webhook:`, verifyError);
          res.status(500).send('Error processing webhook due to verification failure.');
      }

    } else {
      console.error(`Paystack webhook: Payment record with reference ${reference} not found.`);
      res.status(404).send('Payment record not found.');
    }
  } else if (event === 'charge.failed') {
    const reference = data.reference;
    const paymentRecord = await PaymentRecord.findOne({ transactionReference: reference });
    if (paymentRecord && paymentRecord.status !== 'successful') {
      paymentRecord.status = 'failed';
      paymentRecord.paystackTransactionId = data.id.toString();
      paymentRecord.notes = `Payment failed as per Paystack webhook: ${data.gateway_response || 'Unknown reason'}`;
      await paymentRecord.save();
      console.log(`Payment ${reference} marked as FAILED from Paystack webhook.`);
      res.status(200).send('Webhook for failed payment processed.');
    } else {
      res.status(200).send('Webhook for failed payment received, but no action taken (already successful or not found).');
    }
  } else {
    // console.log('Received other Paystack event:', event);
    res.status(200).send('Webhook received, but no action taken for this event type.');
  }
});


module.exports = {
  initiatePayment,
  uploadProofOfPayment,
  handleFlutterwaveWebhook,
  confirmBankPayment,
  getUserPaymentRecords,
  getAllPaymentRecords,
  downloadReceipt,
  handlePaystackCallback,  // Added
  handlePaystackWebhook, // Added
};
