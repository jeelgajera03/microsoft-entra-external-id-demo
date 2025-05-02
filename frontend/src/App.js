import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import NavBar from './components/NavBar';
import Home from './components/Home';
import Login from './components/Login';
import CreateUser from './components/CreateUser';
import SetPassword from './components/SetPassword';
import ResetPassword from './components/ResetPassword';
import UserDashboard from './components/UserDashboard';
import AuthCallback from './components/AuthCallback';

// API Service
import AuthService from './services/AuthService';

function App() {
  // Simple auth check function
  const isAuthenticated = () => {
    return AuthService.getCurrentUser() !== null;
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div className="App">
        <NavBar />
        <div className="auth-wrapper">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/create-user" element={<CreateUser />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App; 