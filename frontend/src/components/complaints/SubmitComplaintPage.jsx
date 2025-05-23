import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, TextField, Button, Box, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, TextareaAutosize
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

function SubmitComplaintPage() {
  const { makeAuthenticatedRequest, authState } = useContext(AuthContext);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [attachments, setAttachments] = useState(''); // Comma-separated URLs

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errorCategories, setErrorCategories] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    const fetchMetaData = async () => {
      if (!authState.token) return;
      setLoadingCategories(true);
      setErrorCategories('');
      try {
        const response = await makeAuthenticatedRequest('/api/complaints/meta/categories-statuses', 'GET');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch complaint categories' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (err) {
        setErrorCategories(err.message);
        console.error("Error fetching complaint categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchMetaData();
  }, [authState.token, makeAuthenticatedRequest]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    if (!title.trim() || !description.trim() || !category) {
      setSubmitError('Title, Description, and Category are required.');
      setSubmitting(false);
      return;
    }

    // Process attachments: split string by comma, trim whitespace, filter out empty strings
    const attachmentsArray = attachments.split(',')
      .map(url => url.trim())
      .filter(url => url);

    try {
      const response = await makeAuthenticatedRequest('/api/complaints', 'POST', {
        title,
        description,
        category,
        attachments: attachmentsArray, // Send as an array of strings
      });
      const data = await response.json();

      if (response.ok) {
        setSubmitSuccess(data.message || 'Complaint submitted successfully!');
        // Clear form
        setTitle('');
        setDescription('');
        setCategory('');
        setAttachments('');
      } else {
        setSubmitError(data.message || 'Failed to submit complaint. Please try again.');
      }
    } catch (err) {
      setSubmitError('An unexpected error occurred. Please try again later.');
      console.error('Complaint submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Submit a Complaint
        </Typography>

        {submitError && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{submitError}</Alert>}
        {submitSuccess && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{submitSuccess}</Alert>}
        {errorCategories && <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>Could not load categories: {errorCategories}</Alert>}


        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="title"
            label="Complaint Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <FormControl fullWidth margin="normal" required error={loadingCategories && categories.length === 0}>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
              disabled={loadingCategories || categories.length === 0}
            >
              {loadingCategories && <MenuItem value=""><em>Loading categories...</em></MenuItem>}
              {!loadingCategories && categories.length === 0 && <MenuItem value=""><em>No categories available</em></MenuItem>}
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5, color: 'text.secondary' }}>
            Description (Be as detailed as possible)
          </Typography>
          <TextareaAutosize
            aria-label="complaint description"
            minRows={5}
            placeholder="Enter complaint description here..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', borderColor: '#ccc', fontFamily: 'inherit', fontSize: '1rem' }}
            required
          />
           {/* Attachment field for URLs - Actual file upload is a future enhancement */}
           <TextField
            margin="normal"
            fullWidth
            id="attachments"
            label="Attachments (Comma-separated URLs)"
            name="attachments"
            value={attachments}
            onChange={(e) => setAttachments(e.target.value)}
            helperText="Paste URLs to supporting documents/images, separated by commas. Actual file upload will be added later."
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={submitting || loadingCategories}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Complaint'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default SubmitComplaintPage;
