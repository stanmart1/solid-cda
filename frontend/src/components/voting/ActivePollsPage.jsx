import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Alert, CircularProgress,
  Card, CardContent, CardActions, Button, Grid
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function ActivePollsPage() {
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActivePolls = async () => {
      if (!authState.token) return;

      setLoading(true);
      setError('');
      try {
        const response = await makeAuthenticatedRequest('/api/polls/active', 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch active polls' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPolls(data || []); // Assuming backend returns array directly
      } catch (err) {
        setError(err.message);
        console.error("Error fetching active polls:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePolls();
  }, [authState.token, makeAuthenticatedRequest]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
        Active Polls
      </Typography>
      {polls.length === 0 && !loading && (
        <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed grey', borderRadius: '4px' }}>
          <Typography variant="subtitle1">No active polls available for you at this time.</Typography>
        </Box>
      )}
      {polls.length > 0 && (
        <Grid container spacing={3}>
          {polls.map((poll) => (
            <Grid item xs={12} sm={6} md={4} key={poll._id}>
              <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="div" gutterBottom>
                    {poll.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {poll.description}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    Starts: {formatDate(poll.startDate)}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    Ends: {formatDate(poll.endDate)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    component={RouterLink}
                    to={`/poll/${poll._id}`}
                    size="small"
                    variant="contained"
                  >
                    View & Vote
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default ActivePollsPage;
