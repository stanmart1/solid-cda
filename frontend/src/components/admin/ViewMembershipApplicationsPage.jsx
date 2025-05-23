import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Alert, CircularProgress, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function ViewMembershipApplicationsPage() {
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Basic role check - ideally ProtectedRoute would handle role-specific access
  const isAdmin = authState.user && (authState.user.role === 'Super Admin' || authState.user.role === 'Executive');

  useEffect(() => {
    if (!isAdmin) {
      setError('You are not authorized to view this page.');
      return;
    }

    const fetchApplications = async () => {
      if (!authState.token) return;

      setLoading(true);
      setError('');
      try {
        const response = await makeAuthenticatedRequest('/api/memberships/applications', 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch membership applications' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setApplications(data || []); // Assuming backend returns array directly
      } catch (err) {
        setError(err.message);
        console.error("Error fetching membership applications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [authState.token, authState.user, isAdmin, makeAuthenticatedRequest]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'under review': return 'info';
      default: return 'default';
    }
  };

  if (!isAdmin && !error) { // Still checking authState before error is set by useEffect
    return (
        <Container sx={{ mt: 4 }}>
            <Alert severity="error">You are not authorized to view this page.</Alert>
        </Container>
    );
  }

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
        Membership Applications
      </Typography>
      {applications.length === 0 && !loading && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1">No membership applications found.</Typography>
        </Paper>
      )}
      {applications.length > 0 && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="membership applications table">
            <TableHead>
              <TableRow>
                <TableCell>Applicant Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Type Requested</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Application Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app._id}>
                  <TableCell>{`${app.user?.firstName || ''} ${app.user?.lastName || ''}`.trim() || 'N/A'}</TableCell>
                  <TableCell>{app.user?.email || 'N/A'}</TableCell>
                  <TableCell>{app.membershipTypeRequested}</TableCell>
                  <TableCell>
                    <Chip 
                        label={app.status || 'N/A'} 
                        color={getStatusChipColor(app.status)} 
                        size="small" 
                    />
                  </TableCell>
                  <TableCell>{formatDate(app.applicationDate)}</TableCell>
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/admin/application/${app._id}`} // Link to future details page
                      variant="outlined"
                      size="small"
                    >
                      View Details
                    </Button>
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

export default ViewMembershipApplicationsPage;
