import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Alert, CircularProgress, Paper,
  List, ListItem, ListItemText, Button, Divider, Chip
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function MyComplaintsPage() {
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyComplaints = async () => {
      if (!authState.token) return;

      setLoading(true);
      setError('');
      try {
        const response = await makeAuthenticatedRequest('/api/complaints/my-complaints', 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch your complaints' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setComplaints(data.complaints || []); // Assuming API returns { complaints: [] }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching my complaints:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, [authState.token, makeAuthenticatedRequest]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'pending':
        return 'info';
      case 'in progress':
      case 'under review':
        return 'warning';
      case 'resolved':
      case 'closed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
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
        My Complaints
      </Typography>
      {complaints.length === 0 && !loading && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1">You have not submitted any complaints yet.</Typography>
        </Paper>
      )}
      {complaints.length > 0 && (
        <Paper elevation={2}>
          <List>
            {complaints.map((complaint, index) => (
              <React.Fragment key={complaint._id}>
                <ListItem
                  secondaryAction={
                    <Button
                      component={RouterLink}
                      to={`/complaint/${complaint._id}`}
                      variant="outlined"
                      size="small"
                    >
                      View Details
                    </Button>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="h6" component="span">
                        {complaint.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography component="span" display="block" variant="body2" color="text.secondary">
                          Category: {complaint.category}
                        </Typography>
                        <Typography component="span" display="block" variant="body2" color="text.secondary">
                          Submitted: {formatDate(complaint.createdAt)}
                        </Typography>
                        <Chip 
                            label={complaint.status || 'N/A'} 
                            color={getStatusChipColor(complaint.status)} 
                            size="small" 
                            sx={{ mt: 0.5 }}
                        />
                      </>
                    }
                  />
                </ListItem>
                {index < complaints.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Container>
  );
}

export default MyComplaintsPage;
