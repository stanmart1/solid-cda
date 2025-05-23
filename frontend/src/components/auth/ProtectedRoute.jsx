import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function ProtectedRoute() {
  const { authState } = useContext(AuthContext);

  if (!authState.token) {
    // User not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the child route content
  return <Outlet />;
}

export default ProtectedRoute;
