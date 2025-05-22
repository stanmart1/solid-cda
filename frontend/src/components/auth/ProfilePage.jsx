import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Card, CardContent, TextField, Button,
  Box, CircularProgress, Alert
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

function ProfilePage() {
  const { authState, makeAuthenticatedRequest } = useContext(AuthContext);
  const [userData, setUserData] = useState(null); // Stores the full user profile
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authState.token) {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
          const response = await makeAuthenticatedRequest('/api/users/me', 'GET');
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user profile' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setUserData(data);
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
          });
        } catch (err) {
          setError(err.message);
          console.error("Error fetching profile:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [authState.token, makeAuthenticatedRequest]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await makeAuthenticatedRequest('/api/users/me', 'PUT', formData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const updatedData = await response.json();
      setUserData(prevData => ({ ...prevData, ...updatedData.user })); // Assuming API returns { user: {} }
      setFormData({ // Update formData as well to reflect changes if API returns partial data
        firstName: updatedData.user.firstName || '',
        lastName: updatedData.user.lastName || '',
        phoneNumber: updatedData.user.phoneNumber || '',
        address: updatedData.user.address || '',
      });
      setSuccessMessage(updatedData.message || 'Profile updated successfully!');
    } catch (err) {
      setError(err.message);
      console.error("Error updating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!authState.token) {
    // This should ideally be handled by ProtectedRoute, but as a fallback:
    return <Typography>Please login to view your profile.</Typography>;
  }

  if (loading && !userData) { // Show initial loading spinner only if no user data yet
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      {userData && (
        <Card>
          <CardContent>
            <Typography variant="h6">Details</Typography>
            <Typography><strong>Email:</strong> {userData.email}</Typography>
            <Typography><strong>Role:</strong> {userData.role}</Typography>
            <hr />
            <Box component="form" onSubmit={handleUpdateProfile} sx={{ mt: 2 }}>
              <TextField
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Profile'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

export default ProfilePage;
