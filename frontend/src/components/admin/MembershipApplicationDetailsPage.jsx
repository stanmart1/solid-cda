import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Alert, CircularProgress, Paper, Grid,
  Button, TextField, Link as MuiLink, List, ListItem, ListItemText, Divider, Chip
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

function MembershipApplicationDetailsPage() {
  const { applicationId } = useParams();
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [adminComments, setAdminComments] = useState('');

  // Basic role check
  const isAdmin = authState.user && (authState.user.role === 'Super Admin' || authState.user.role === 'Executive');

  const fetchApplicationDetails = async () => {
    if (!isAdmin) {
      setError('You are not authorized to view this page.');
      setLoading(false);
      return;
    }
    if (!authState.token || !applicationId) {
      setError('Application ID or auth token missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await makeAuthenticatedRequest(`/api/memberships/applications/${applicationId}`, 'GET');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch application details' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setApplication(data); // Assuming backend returns the application object directly
    } catch (err) {
      setError(err.message);
      console.error("Error fetching application details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
  }, [authState.token, applicationId, isAdmin, makeAuthenticatedRequest]); // Rerun if these change

  const handleAction = async (actionType) => {
    if (!adminComments.trim() && actionType === 'reject') {
        setActionError('Comments are required for rejection.');
        return;
    }
    setIsProcessingAction(true);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await makeAuthenticatedRequest(
        `/api/memberships/applications/${applicationId}/${actionType}`, 
        'PUT', 
        { comments: adminComments || `Actioned by admin: ${authState.user.firstName}` }
      );
      const data = await response.json();
      if (response.ok) {
        setActionSuccess(data.message || `Application successfully ${actionType}ed.`);
        fetchApplicationDetails(); // Refresh application details
      } else {
        setActionError(data.message || `Failed to ${actionType} application.`);
      }
    } catch (err) {
      setActionError(`An unexpected error occurred while ${actionType}ing the application.`);
      console.error(`Error ${actionType}ing application:`, err);
    } finally {
      setIsProcessingAction(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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

  if (!isAdmin && !error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">You are not authorized to view this page.</Alert></Container>;
  }
  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!application) {
    return <Container sx={{ mt: 4 }}><Typography>Application not found.</Typography></Container>;
  }

  const canTakeAction = application.status === 'Pending' || application.status === 'Under Review';

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Button onClick={() => navigate(-1)} variant="outlined" sx={{ mb: 2 }}> 
        &larr; Back 
      </Button>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
          Membership Application: {application._id}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Applicant Details</Typography>
            <Typography><strong>Name:</strong> {`${application.user?.firstName || ''} ${application.user?.lastName || ''}`.trim() || 'N/A'}</Typography>
            <Typography><strong>Email:</strong> {application.user?.email || 'N/A'}</Typography>
            <Typography><strong>Current Role:</strong> {application.user?.role || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Application Information</Typography>
            <Typography><strong>Type Requested:</strong> {application.membershipTypeRequested}</Typography>
            <Typography><strong>Status:</strong> <Chip label={application.status} color={getStatusChipColor(application.status)} size="small" /></Typography>
            <Typography><strong>Application Date:</strong> {formatDate(application.applicationDate)}</Typography>
          </Grid>

          {application.documents && application.documents.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 1 }}>Uploaded Documents</Typography>
              <List dense>
                {application.documents.map((doc, index) => (
                  <ListItem key={index} sx={{ pl:0 }}>
                    <MuiLink href={doc.url || '#'} target="_blank" rel="noopener noreferrer">
                      {doc.fileName || `Document ${index + 1}`}
                    </MuiLink>
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}

          {application.adminComments && application.adminComments.length > 0 && (
             <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 1 }}>Admin Comments History</Typography>
                <List dense>
                    {application.adminComments.map((comment, index) => (
                        <ListItem key={index} sx={{ pl:0, borderLeft: '3px solid #ccc', mb: 0.5, backgroundColor: '#f9f9f9' }}>
                            <ListItemText 
                                primary={comment.comment}
                                secondary={`By: ${comment.commentedBy?.firstName || 'Admin'} on ${formatDate(comment.timestamp)}`}
                            />
                        </ListItem>
                    ))}
                </List>
             </Grid>
          )}
        </Grid>

        {actionError && <Alert severity="error" sx={{ mt: 3 }}>{actionError}</Alert>}
        {actionSuccess && <Alert severity="success" sx={{ mt: 3 }}>{actionSuccess}</Alert>}

        {canTakeAction && !actionSuccess && (
          <Box sx={{ mt: 4, borderTop: '1px solid #eee', pt: 3 }}>
            <Typography variant="h6" gutterBottom>Take Action</Typography>
            <TextField
              label="Comments (Required for Rejection)"
              multiline
              rows={3}
              fullWidth
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
              sx={{ mb: 2 }}
              variant="outlined"
            />
            <Button
              variant="contained"
              color="success"
              onClick={() => handleAction('approve')}
              disabled={isProcessingAction}
              sx={{ mr: 2 }}
            >
              {isProcessingAction ? <CircularProgress size={24} /> : 'Approve'}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleAction('reject')}
              disabled={isProcessingAction || (!adminComments.trim() && true)} // Disable if no comments for rejection
            >
              {isProcessingAction ? <CircularProgress size={24} /> : 'Reject'}
            </Button>
            {!adminComments.trim() && <Typography variant="caption" color="error" display="block" sx={{mt:1}}>Comment is required to reject.</Typography>}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default MembershipApplicationDetailsPage;
