import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Alert, CircularProgress, Paper,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

function PollDetailsPage() {
  const { pollId } = useParams();
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [voteSuccess, setVoteSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollResults, setPollResults] = useState(null); // For storing poll results
  const [resultsError, setResultsError] = useState(''); // For errors when fetching results

  const fetchPollResults = async (currentPollId) => {
    if (!authState.token || !currentPollId) return;
    setResultsError('');
    // Consider adding a specific loading state for results if needed
    try {
      const response = await makeAuthenticatedRequest(`/api/polls/${currentPollId}/results`, 'GET');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch poll results' }));
        throw new Error(errorData.message || `HTTP error fetching results! status: ${response.status}`);
      }
      const resultsData = await response.json();
      // Assuming resultsData is the poll object with options array having vote counts
      setPollResults(resultsData.options || []); 
    } catch (err) {
      setResultsError(err.message);
      console.error("Error fetching poll results:", err);
    }
  };

  useEffect(() => {
    const fetchPollDetails = async () => {
      if (!authState.token || !pollId) return;

      setLoading(true);
      setError('');
      setPollResults(null); // Reset results on initial load/poll change
      try {
        const response = await makeAuthenticatedRequest(`/api/polls/${pollId}`, 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch poll details' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPoll(data); // Assuming backend returns the poll object directly

        // If poll is closed or user has already voted (assuming userVoted flag comes from API)
        // For now, let's assume if it's closed, we fetch results.
        // Or if a specific query param ?results=true is present
        if (data.poll && (data.poll.isClosed || data.poll.userHasVoted)) { // Assuming userHasVoted comes from backend
          fetchPollResults(pollId);
        }

      } catch (err) {
        setError(err.message);
        console.error("Error fetching poll details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPollDetails();
  }, [authState.token, pollId, makeAuthenticatedRequest]);

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
    setVoteError(''); // Clear previous vote error on new selection
  };

  const handleSubmitVote = async () => {
    if (!selectedOption) {
      setVoteError('Please select an option to vote.');
      return;
    }
    setIsSubmitting(true);
    setVoteError('');
    setVoteSuccess('');

    try {
      const response = await makeAuthenticatedRequest(`/api/polls/${pollId}/vote`, 'POST', {
        selectedOptionText: selectedOption,
      });
      const data = await response.json();

      if (response.ok) {
        setVoteSuccess(data.message || 'Vote submitted successfully!');
        fetchPollResults(pollId); // Fetch results after successful vote
        // Optionally, refetch poll data to update status (e.g., if userVoted flag is returned)
      } else {
        setVoteError(data.message || 'Failed to submit vote. You might have already voted or the poll is closed.');
      }
    } catch (err) {
      setVoteError('An unexpected error occurred while submitting your vote.');
      console.error('Vote submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!poll) {
    return <Container sx={{ mt: 4 }}><Typography>Poll not found.</Typography></Container>;
  }

  // Determine if voting is allowed
  // Hide voting form if results are shown, or if vote was successful, or if poll is closed/inactive
  const showVotingForm = poll && poll.isActive && !poll.isClosed && !voteSuccess && !pollResults;
  const showResultsSection = pollResults || (poll && (poll.isClosed || voteSuccess)); // Show results if available or if poll closed/voted

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>{poll.title}</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>{poll.description}</Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          Starts: {formatDate(poll.startDate)}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 3 }}>
          Ends: {formatDate(poll.endDate)}
        </Typography>

        {/* Voting Form Section */}
        {showVotingForm && (
          <Box component="fieldset" sx={{ mt: 3, border: '1px solid #ccc', p: 2, borderRadius: '4px' }}>
            <Typography component="legend" variant="h6" sx={{ mb: 1 }}>Cast Your Vote</Typography>
            {voteError && <Alert severity="error" sx={{ mb: 2 }}>{voteError}</Alert>}
            <FormControl component="div">
              <RadioGroup
                aria-label="poll-options"
                name="poll-options"
                value={selectedOption}
                onChange={handleOptionChange}
              >
                {poll.options.map((option) => (
                  <FormControlLabel 
                    key={option._id || option.optionText} 
                    value={option.optionText} 
                    control={<Radio />} 
                    // Assuming poll.options doesn't have live votes, or results are separate
                    label={option.optionText} 
                  />
                ))}
              </RadioGroup>
              <Button
                variant="contained"
                onClick={handleSubmitVote}
                disabled={isSubmitting || !selectedOption}
                sx={{ mt: 2 }}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Submit Vote'}
              </Button>
            </FormControl>
          </Box>
        )}

        {/* Success message for voting */}
        {voteSuccess && !pollResults && <Alert severity="success" sx={{ my: 2 }}>{voteSuccess} Loading results...</Alert>}
        
        {/* Results Section */}
        {resultsError && <Alert severity="error" sx={{ my: 2 }}>{resultsError}</Alert>}
        {showResultsSection && pollResults && poll && ( // Ensure poll is also available for option texts
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom>Poll Results</Typography>
            {pollResults.map((resultOption, index) => {
              // Find the original option text from the poll state, as results might only have IDs
              const originalOption = poll.options.find(opt => opt._id === resultOption._id || opt.optionText === resultOption.optionText);
              const optionText = originalOption ? originalOption.optionText : resultOption.optionText; // Fallback if not found
              return (
                <Box key={resultOption._id || index} sx={{ mb: 1, p: 1, border: '1px solid #eee', borderRadius: '4px' }}>
                  <Typography variant="body1">
                    {optionText}: <strong>{resultOption.votes} votes</strong> 
                    ({resultOption.percentage?.toFixed(1) || '0.0'}%)
                  </Typography>
                  {/* Basic bar representation */}
                  <Box sx={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', mt: 0.5 }}>
                    <Box 
                      sx={{ 
                        width: `${resultOption.percentage || 0}%`, 
                        backgroundColor: 'primary.main', 
                        height: '20px', 
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-in-out'
                      }} 
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        
        {/* Message if voting is not available and results are not shown yet */}
        {!showVotingForm && !showResultsSection && !voteSuccess && (
             <Typography variant="body1" sx={{ mt: 3, fontStyle: 'italic' }}>
                Voting is currently not available for this poll. It may be closed or not yet active.
             </Typography>
        )}


         <Button component={RouterLink} to="/polls" variant="outlined" sx={{ mt: 3 }}>
            Back to Active Polls
        </Button>
      </Paper>
    </Container>
  );
}

export default PollDetailsPage;
