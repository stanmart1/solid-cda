import React, { useState, useContext } from 'react';
import {
  Container, Typography, TextField, Button, Box, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Link as MuiLink
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function InitiatePaymentPage() {
  const { makeAuthenticatedRequest } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [paymentFor, setPaymentFor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState(null); // To store bank transfer info

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setBankDetails(null);
    setLoading(true);

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      setLoading(false);
      return;
    }
    if (!paymentFor.trim()) {
      setError('Please specify what the payment is for.');
      setLoading(false);
      return;
    }
    if (!paymentMethod) {
      setError('Please select a payment method.');
      setLoading(false);
      return;
    }

    try {
      const response = await makeAuthenticatedRequest('/api/payments/initiate', 'POST', {
        amount: parseFloat(amount),
        paymentFor,
        paymentMethod,
      });

      const data = await response.json();

      if (response.ok) {
        if (data.paymentLink) {
          // Redirect for Flutterwave/Paystack
          window.location.href = data.paymentLink;
          // setLoading(false) might not be reached if redirect happens immediately
        } else if (data.bankDetails) {
          // Display bank details for Bank Transfer
          setBankDetails(data.bankDetails);
          setSuccessMessage(`Payment initiated. Record ID: ${data.paymentRecordId}. Reference: ${data.transactionReference}. Please use the bank details below to complete your payment.`);
          // Clear form potentially
          setAmount('');
          setPaymentFor('');
          setPaymentMethod('');
        } else {
          // Fallback success if no specific action
          setSuccessMessage(data.message || 'Payment initiated successfully!');
        }
      } else {
        setError(data.message || 'Failed to initiate payment. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error('Payment initiation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Initiate Payment
        </Typography>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        {successMessage && !bankDetails && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{successMessage}</Alert>}
        
        {bankDetails && (
          <Alert severity="info" sx={{ width: '100%', mb: 3 }}>
            <Typography variant="h6">Complete Your Bank Transfer</Typography>
            <Typography><strong>Payment Record ID:</strong> {bankDetails.paymentRecordId || successMessage.split('Record ID: ')[1]?.split('.')[0]}</Typography>
            <Typography><strong>Transaction Reference:</strong> {bankDetails.transactionReference || successMessage.split('Reference: ')[1]?.split('.')[0]}</Typography>
            <Typography><strong>Bank Name:</strong> {bankDetails.bankName}</Typography>
            <Typography><strong>Account Number:</strong> {bankDetails.accountNumber}</Typography>
            <Typography><strong>Account Name:</strong> {bankDetails.accountName}</Typography>
            <Typography><strong>Amount:</strong> NGN {bankDetails.amount}</Typography>
            <Typography sx={{ mt: 1, fontWeight: 'bold' }}>
              Important: Please copy the "Payment Record ID" shown above. You will need it to upload your proof of payment.
            </Typography>
            <Typography sx={{ mt:1 }}>Please use the transaction reference in your payment narration.</Typography>
            <Button
              component={RouterLink}
              to={`/upload-proof/${bankDetails.paymentRecordId || successMessage.split('Record ID: ')[1]?.split('.')[0]}`}
              variant="contained"
              color="secondary"
              sx={{ mt: 2 }}
            >
              Upload Proof of Payment
            </Button>
          </Alert>
        )}

        {!bankDetails && ( // Hide form if bank details are shown
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="amount"
              label="Amount (NGN)"
              name="amount"
              type="number"
              inputProps={{ step: "0.01" }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="paymentFor"
              label="Payment For"
              name="paymentFor"
              value={paymentFor}
              onChange={(e) => setPaymentFor(e.target.value)}
              helperText="E.g., Annual Dues 2024, Event Ticket"
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="paymentMethod-label">Payment Method</InputLabel>
              <Select
                labelId="paymentMethod-label"
                id="paymentMethod"
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value=""><em>Select a method</em></MenuItem>
                <MenuItem value="Flutterwave">Flutterwave</MenuItem>
                <MenuItem value="Paystack">Paystack</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Proceed to Payment'}
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default InitiatePaymentPage;
