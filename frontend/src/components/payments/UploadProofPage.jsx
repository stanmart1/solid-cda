import React, { useState, useContext, useEffect } from 'react';
import {
  Container, Typography, TextField, Button, Box, Alert, CircularProgress, Input
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom'; // To get paymentRecordId from URL
import { AuthContext } from '../../context/AuthContext';

function UploadProofPage() {
  const { authState } // No, makeAuthenticatedRequest is for JSON. We need the token.
    = useContext(AuthContext); 
  const { paymentRecordId: urlPaymentRecordId } = useParams(); // Get ID from URL if present

  const [paymentRecordId, setPaymentRecordId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (urlPaymentRecordId) {
      setPaymentRecordId(urlPaymentRecordId);
    }
  }, [urlPaymentRecordId]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError(''); // Clear previous file errors
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!paymentRecordId.trim()) {
      setError('Payment Record ID is required.');
      setLoading(false);
      return;
    }
    if (!selectedFile) {
      setError('Please select a file to upload.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('proof', selectedFile);
    // If your backend expects paymentRecordId in FormData, uncomment next line
    // formData.append('paymentRecordId', paymentRecordId); 

    try {
      if (!authState.token) {
        setError('Authentication token not found. Please login again.');
        setLoading(false);
        return;
      }

      // Note: makeAuthenticatedRequest is designed for JSON.
      // For FormData, we construct fetch manually to include the auth token.
      const response = await fetch(`/api/payments/${paymentRecordId}/upload-proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          // 'Content-Type': 'multipart/form-data' is NOT set here. Browser does it.
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || 'Proof of payment uploaded successfully!');
        setSelectedFile(null); // Clear file input
        // Optionally clear paymentRecordId or navigate away
        // navigate('/payment-history'); // Example navigation
      } else {
        setError(data.message || 'Failed to upload proof. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please ensure the file is valid and try again.');
      console.error('Proof upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Upload Proof of Payment
        </Typography>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{successMessage}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="paymentRecordId"
            label="Payment Record ID"
            name="paymentRecordId"
            value={paymentRecordId}
            onChange={(e) => setPaymentRecordId(e.target.value)}
            autoFocus={!urlPaymentRecordId} // Autofocus if ID not from URL
            InputProps={{
              readOnly: !!urlPaymentRecordId, // Make read-only if ID from URL
            }}
            helperText={urlPaymentRecordId ? "Payment ID pre-filled from link." : "Enter the ID from your payment initiation."}
          />
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Select Proof File (Image or PDF):
          </Typography>
          <Input
            type="file"
            onChange={handleFileChange}
            fullWidth
            sx={{ mb: 2 }}
            inputProps={{ accept: "image/*,.pdf" }} // Suggests file types
          />
          {selectedFile && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Selected file: {selectedFile.name}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Proof'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default UploadProofPage;
