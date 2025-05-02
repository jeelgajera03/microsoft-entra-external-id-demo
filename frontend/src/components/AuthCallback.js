import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Alert, Spinner } from 'react-bootstrap';
import AuthService from '../services/AuthService';
import axios from 'axios';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processLogin = async () => {
      try {
        // Extract id_token from URL hash
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const idToken = hashParams.get('id_token');

        if (!idToken) {
          setError('No authentication token found in the URL');
          setLoading(false);
          return;
        }

        // Call backend to validate the token and get user info
        const response = await axios.get(`http://localhost:3000/auth/callback?id_token=${idToken}`);
        
        if (response.data.success) {
          // Save user data and token in local storage
          const { user, token } = response.data.data;
          AuthService.setCurrentUser(user, token);
          
          // Redirect to dashboard
          navigate('/dashboard');
        } else {
          setError('Failed to process authentication');
          setLoading(false);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError(err.response?.data?.error || err.message || 'Failed to authenticate');
        setLoading(false);
      }
    };

    processLogin();
  }, [location, navigate]);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3">Completing login, please wait...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <Alert.Heading>Login Error</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <button 
              className="btn btn-outline-danger" 
              onClick={() => navigate('/login')}
            >
              Return to Login
            </button>
          </div>
        </Alert>
      </Container>
    );
  }

  return null;
};

export default AuthCallback; 