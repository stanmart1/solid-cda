import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Alert, CircularProgress, Paper, Grid,
  List, ListItem, ListItemText, Divider, Link as MuiLink, Button
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

function ComplaintDetailsPage() {
  const { complaintId } = useParams();
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplaintDetails = async () => {
      if (!authState.token || !complaintId) return;

      setLoading(true);
      setError('');
      try {
        const response = await makeAuthenticatedRequest(`/api/complaints/${complaintId}`, 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch complaint details' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setComplaint(data); // Assuming backend returns the complaint object directly
      } catch (err) {
        setError(err.message);
        console.error("Error fetching complaint details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaintDetails();
  }, [authState.token, complaintId, makeAuthenticatedRequest]);

  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!complaint) {
    return <Container sx={{ mt: 4 }}><Typography>Complaint not found.</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Button component={RouterLink} to="/my-complaints" variant="outlined" sx={{ mb: 2 }}>
        &larr; Back to My Complaints
      </Button>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>
          Complaint Details: {complaint.title}
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Information</Typography>
            <Typography><strong>Category:</strong> {complaint.category}</Typography>
            <Typography><strong>Status:</strong> {complaint.status}</Typography>
            <Typography><strong>Submitted:</strong> {formatDate(complaint.createdAt)}</Typography>
            <Typography><strong>Last Updated:</strong> {formatDate(complaint.updatedAt)}</Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Description</Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', p:1, border:'1px solid #f0f0f0', borderRadius:'4px' }}>
              {complaint.description}
            </Typography>
          </Grid>

          {complaint.attachments && complaint.attachments.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2 }}>Attachments</Typography>
              <List dense>
                {complaint.attachments.map((att, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <MuiLink href={att} target="_blank" rel="noopener noreferrer">
                      {att.startsWith('http') ? att : `Attachment ${index + 1}`}
                    </MuiLink>
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}

          {complaint.resolutionDetails && (
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2 }}>Resolution Details</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', p:1, border:'1px solid #e0ffe0', backgroundColor: '#f0fff0', borderRadius:'4px' }}>
                {complaint.resolutionDetails}
              </Typography>
            </Grid>
          )}
          
          {complaint.executiveComments && complaint.executiveComments.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb:1 }}>Executive Comments</Typography>
              <List>
                {complaint.executiveComments.map((comment, index) => (
                  <React.Fragment key={comment._id || index}>
                    <ListItem alignItems="flex-start" sx={{ pl: 0, borderLeft: '3px solid #1976d2', mb:1, backgroundColor: '#f9f9f9', borderRadius:'4px' }}>
                      <ListItemText
                        primary={
                          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                            {comment.comment}
                          </Typography>
                        }
                        secondary={
                          <>
                            Comment by: {comment.commentedBy?.firstName || 'Executive'} {comment.commentedBy?.lastName || ''}
                            {' on '}
                            {formatDate(comment.timestamp)}
                          </>
                        }
                      />
                    </ListItem>
                    {index < complaint.executiveComments.length -1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
}

export default ComplaintDetailsPage;
