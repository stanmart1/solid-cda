import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // Corrected path
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ProfilePage from './components/auth/ProfilePage';
import LogoutButton from './components/auth/LogoutButton'; // Import LogoutButton
import ProtectedRoute from './components/auth/ProtectedRoute'; // Import ProtectedRoute
import ApplyMembershipPage from './components/membership/ApplyMembershipPage'; // Import ApplyMembershipPage
import MyMembershipApplicationsPage from './components/membership/MyMembershipApplicationsPage'; // Import MyMembershipApplicationsPage
import InitiatePaymentPage from './components/payments/InitiatePaymentPage'; // Import InitiatePaymentPage
import UploadProofPage from './components/payments/UploadProofPage'; // Import UploadProofPage
import PaymentHistoryPage from './components/payments/PaymentHistoryPage'; // Import PaymentHistoryPage
import AnnouncementsPage from './components/announcements/AnnouncementsPage'; // Import AnnouncementsPage
import ActivePollsPage from './components/voting/ActivePollsPage'; // Import ActivePollsPage
import PollDetailsPage from './components/voting/PollDetailsPage'; // Import PollDetailsPage
import SubmitComplaintPage from './components/complaints/SubmitComplaintPage'; // Import SubmitComplaintPage
import MyComplaintsPage from './components/complaints/MyComplaintsPage'; // Import MyComplaintsPage
import ComplaintDetailsPage from './components/complaints/ComplaintDetailsPage'; // Import ComplaintDetailsPage
import ViewMembershipApplicationsPage from './components/admin/ViewMembershipApplicationsPage'; // Import Admin Page
import MembershipApplicationDetailsPage from './components/admin/MembershipApplicationDetailsPage'; // Import Admin Detail Page
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
              <Link to="/apply-membership">Apply for Membership</Link>
            </li>
            <li>
              <Link to="/my-membership">My Membership</Link>
            </li>
            <li>
              <Link to="/initiate-payment">Initiate Payment</Link> {/* Temporary Link */}
            </li>
            <li>
              <Link to="/upload-proof">Upload Payment Proof</Link> {/* Temporary Link */}
            </li>
            <li>
              <Link to="/payment-history">Payment History</Link> {/* Temporary Link */}
            </li>
            <li>
              <Link to="/announcements">Announcements</Link> {/* Temporary Link */}
            </li>
            <li>
              <Link to="/polls">Voting Polls</Link> {/* Temporary Link */}
            </li>
            <li>
              <Link to="/submit-complaint">Submit Complaint</Link> {/* Temporary Link */}
            </li>
            <li>
              <Link to="/my-complaints">My Complaints</Link> {/* Temporary Link */}
            </li>
            {/* Admin Links Placeholder - ideally conditionally rendered based on role */}
            <li>
              <Link to="/admin/membership-applications">Admin: Membership Apps</Link> {/* Temporary Admin Link */}
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
            <Route path="/apply-membership" element={<ApplyMembershipPage />} />
            <Route path="/my-membership" element={<MyMembershipApplicationsPage />} />
            <Route path="/initiate-payment" element={<InitiatePaymentPage />} />
            <Route path="/upload-proof" element={<UploadProofPage />} />
            <Route path="/upload-proof/:paymentRecordId" element={<UploadProofPage />} />
            <Route path="/payment-history" element={<PaymentHistoryPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/polls" element={<ActivePollsPage />} />
            <Route path="/poll/:pollId" element={<PollDetailsPage />} />
            <Route path="/submit-complaint" element={<SubmitComplaintPage />} />
            <Route path="/my-complaints" element={<MyComplaintsPage />} />
            <Route path="/complaint/:complaintId" element={<ComplaintDetailsPage />} />
            {/* Admin Routes */}
            {/* These should also be protected by an admin role check in ProtectedRoute or a specialized AdminRoute */}
            <Route path="/admin/membership-applications" element={<ViewMembershipApplicationsPage />} />
            <Route path="/admin/application/:applicationId" element={<MembershipApplicationDetailsPage />} />
            {/* Add other protected routes here as needed */}
          </Route>
        </Routes>
      </div>
    </Router>
  </AuthProvider>
  );
}

export default App;
