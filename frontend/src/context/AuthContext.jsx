import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem('token') || null,
    user: null, // User details will be fetched or set on login
  });

  // Effect to potentially load user details if token exists but user is null
  // For this task, user info is expected from login response.
  // This could be extended to fetch user profile if only token is present.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !authState.user) {
      // In a real app, you might want to verify the token and fetch user details here
      // For example: fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
      // .then(res => res.json()).then(data => setAuthState(prev => ({...prev, user: data.user })))
      // .catch(() => localStorage.removeItem('token')); // Token is invalid
      // For now, we assume login will populate user or it's not strictly needed on initial load without login
      console.log("AuthProvider: Token found in localStorage, user details would ideally be fetched if not present.");
    }
  }, []); // Removed authState.user from dependency array to avoid re-runs if user is set by login

  const login = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        // Assuming the user data is part of the response, e.g., data.user
        // If not, user might need to be fetched in a separate call or is just the email/id
        setAuthState({ token: data.token, user: data.user || { email: credentials.email } }); // Store token and user info
        return data; // Return data for potential use in component
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      throw error; // Re-throw to be caught by the calling component
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({ token: null, user: null });
    // Optionally, redirect or notify other parts of the app
  };

  const makeAuthenticatedRequest = async (url, method = 'GET', body = null) => {
    if (!authState.token) {
      throw new Error('User not authenticated');
    }

    const headers = {
      'Authorization': `Bearer ${authState.token}`,
    };

    const config = {
      method,
      headers,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);
    // Let the caller handle response.json() and error checking for more flexibility
    return response;
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, makeAuthenticatedRequest }}>
      {children}
    </AuthContext.Provider>
  );
};
