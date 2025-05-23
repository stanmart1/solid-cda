import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Paper, Box, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Link as MuiLink
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

function PaymentHistoryPage() {
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!authState.token) return; // Should be handled by ProtectedRoute

      setLoading(true);
      setError('');
      try {
        const response = await makeAuthenticatedRequest('/api/payments/my-records', 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch payment history' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPaymentRecords(data.records || []); // Assuming API returns { records: [] }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching payment history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [authState.token, makeAuthenticatedRequest]);

  const formatPaymentDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Function to handle receipt download/view
  // The backend /api/payments/:paymentId/receipt should ideally set Content-Disposition header for download
  // or Content-Type for inline view.
  const handleViewReceipt = (paymentId) => {
    const receiptUrl = `/api/payments/${paymentId}/receipt`;
    // We need to make an authenticated request for the receipt.
    // Fetch the receipt as a blob, then create a URL to open/download.
    // This is more complex than a simple link if auth is needed for the GET receipt endpoint.
    // For now, let's assume if receiptUrl is in the record, it might be a pre-signed URL or a public one.
    // If the backend requires Authorization header for the receipt itself, this approach is too simple.
    // The subtask mentions "GET /api/payments/:paymentId/receipt should be used".
    // This implies a direct GET, but if it needs auth, it won't work as a simple href.
    // A robust solution would involve fetching with makeAuthenticatedRequest and handling the blob.
    // For this iteration, let's try a direct link and see if the backend supports it (e.g. via session or if receipt URLs are special)
    // If it needs token, then the link has to be built with token or a proxy endpoint in frontend.

    // If the `/api/payments/:paymentId/receipt` endpoint itself is protected by the same token auth:
    makeAuthenticatedRequest(receiptUrl, 'GET')
      .then(response => {
        if (!response.ok) throw new Error('Receipt not available or error fetching.');
        return response.blob(); // Get the receipt as a blob
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${paymentId}.pdf`; // Or determine extension from blob.type
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error("Error fetching receipt:", err);
        setError("Could not retrieve receipt: " + err.message);
      });
  };


  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Payment History
      </Typography>
      {paymentRecords.length === 0 && !loading && (
        <Typography sx={{ mt: 2 }}>No payment records found.</Typography>
      )}
      {paymentRecords.length > 0 && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="payment history table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Payment For</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Receipt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentRecords.map((record) => (
                <TableRow key={record._id || record.transactionReference}>
                  <TableCell component="th" scope="row">
                    {formatPaymentDate(record.paymentDate)}
                  </TableCell>
                  <TableCell>{record.paymentFor}</TableCell>
                  <TableCell align="right">{record.amount?.toFixed(2)}</TableCell>
                  <TableCell>{record.currency}</TableCell>
                  <TableCell>
                    <Typography 
                      color={record.status === 'successful' ? 'success.main' : record.status === 'failed' ? 'error.main' : 'text.secondary'}
                    >
                      {record.status}
                    </Typography>
                  </TableCell>
                  <TableCell>{record.paymentMethod}</TableCell>
                  <TableCell>{record.transactionReference}</TableCell>
                  <TableCell>
                    {record.status === 'successful' && record.receiptUrl && (
                       <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => handleViewReceipt(record._id)} // Assuming record._id is the paymentId
                        >
                          View/Download
                       </Button>
                    )}
                    {/* If receiptUrl is directly usable and doesn't need auth token for GET:
                    {record.status === 'successful' && record.receiptUrl && (
                      <MuiLink href={`/api/payments/${record._id}/receipt`} target="_blank" rel="noopener noreferrer">
                        View Receipt
                      </MuiLink>
                    )}
                    */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

export default PaymentHistoryPage;
