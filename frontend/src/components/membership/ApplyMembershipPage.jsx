import React, { useState, useContext } from 'react';
import {
  Container, Typography, TextField, Button, Box, Alert, CircularProgress
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

function ApplyMembershipPage() {
  const { makeAuthenticatedRequest } = useContext(AuthContext);
  const [membershipType, setMembershipType] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!membershipType.trim()) {
      setError('Membership type cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      const response = await makeAuthenticatedRequest('/api/memberships/apply', 'POST', {
        membershipTypeRequested: membershipType,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || 'Membership application submitted successfully!');
        setMembershipType(''); // Clear field on success
      } else {
        setError(data.message || 'Failed to submit application. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error('Membership application error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          Apply for Membership
        </Typography>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{successMessage}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="membershipType"
            label="Membership Type Requested"
            name="membershipType"
            autoFocus
            value={membershipType}
            onChange={(e) => setMembershipType(e.target.value)}
            helperText="E.g., Premium, Standard, Basic"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Application'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default ApplyMembershipPage;
