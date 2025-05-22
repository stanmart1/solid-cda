import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // Corrected path
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ProfilePage from './components/auth/ProfilePage';
import LogoutButton from './components/auth/LogoutButton'; // Import LogoutButton
import ProtectedRoute from './components/auth/ProtectedRoute'; // Import ProtectedRoute
import './App.css'; // Keep App.css or remove if not needed

function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <nav>
            <ul>
              <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/register">Register</Link>
            </li>
            <li>
              <Link to="/profile">Profile</Link>
            </li>
            <li>
              <LogoutButton />
            </li>
          </ul>
        </nav>

        <hr />

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            {/* Add other protected routes here as needed */}
          </Route>
        </Routes>
      </div>
    </Router>
  </AuthProvider>
  );
}

export default App;
