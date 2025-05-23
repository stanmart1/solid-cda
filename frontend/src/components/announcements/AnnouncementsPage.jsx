import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Alert, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AuthContext } from '../../context/AuthContext';

function AnnouncementsPage() {
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!authState.token) return; 

      setLoading(true);
      setError('');
      try {
        const response = await makeAuthenticatedRequest('/api/announcements', 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch announcements' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAnnouncements(data || []); // Assuming backend returns array directly
      } catch (err) {
        setError(err.message);
        console.error("Error fetching announcements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [authState.token, makeAuthenticatedRequest]);

  const formatPublishDate = (dateString) => {
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
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Announcements
      </Typography>
      {announcements.length === 0 && !loading && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1">No announcements at this time.</Typography>
        </Paper>
      )}
      {announcements.length > 0 && (
        <Box>
          {announcements.map((announcement, index) => (
            <Accordion key={announcement._id || index} sx={{ mb: 1 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel${index}a-content`}
                id={`panel${index}a-header`}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography variant="h6">{announcement.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatPublishDate(announcement.publishDate)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography whiteSpace="pre-wrap"> 
                  {/* whiteSpace pre-wrap to respect newlines and formatting */}
                  {announcement.message}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Container>
  );
}

export default AnnouncementsPage;
