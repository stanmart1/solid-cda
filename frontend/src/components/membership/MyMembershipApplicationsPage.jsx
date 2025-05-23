import React, { useContext } from 'react';
import { Container, Typography, Paper, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // Import Link for navigation
import { AuthContext } from '../../context/AuthContext';

function MyMembershipApplicationsPage() {
  const { authState } = useContext(AuthContext);
  const { user } = authState;
  const membershipDetails = user?.membershipDetails;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Membership
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Membership Status
        </Typography>
        {membershipDetails ? (
          <Box>
            <Typography>
              <strong>Type:</strong> {membershipDetails.membershipType}
            </Typography>
            <Typography>
              <strong>Status:</strong> {membershipDetails.status}
            </Typography>
            <Typography>
              <strong>Start Date:</strong> 
              {new Date(membershipDetails.startDate).toLocaleDateString()}
            </Typography>
            <Typography>
              <strong>End Date:</strong> 
              {new Date(membershipDetails.endDate).toLocaleDateString()}
            </Typography>
          </Box>
        ) : (
          <Typography>No active membership found.</Typography>
        )}
      </Paper>

      <Button
        variant="contained"
        color="primary"
        component={RouterLink}
        to="/apply-membership"
        sx={{ mb: 3 }}
      >
        Apply for New or Different Membership
      </Button>

      <Paper elevation={1} sx={{ p: 2, backgroundColor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="body1" gutterBottom>
          <strong>Note:</strong>
        </Typography>
        <Typography variant="body2">
          To view a detailed history of all your past membership applications and their statuses, 
          a future update will be required. Currently, you can see your active membership 
          status here and apply for a new one.
        </Typography>
      </Paper>
    </Container>
  );
}

export default MyMembershipApplicationsPage;
