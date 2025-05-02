import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetRequested, setResetRequested] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = AuthService.getToken();
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      try {
        const response = await AuthService.getUserInfo(token);
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          setError('Failed to load user data');
          AuthService.logout();
          navigate('/login');
        }
      } catch (err) {
        setError(err.response?.data?.details || err.response?.data?.error || 'Failed to load user data');
        if (err.response?.status === 401) {
          AuthService.logout();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);

  const handlePasswordReset = async () => {
    const token = AuthService.getToken();
    
    if (!token) {
      navigate('/login');
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await AuthService.requestPasswordReset(token);
      
      if (response.data.success) {
        setMessage('Password reset email sent successfully. Check your inbox.');
        setResetRequested(true);
      }
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading dashboard...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4 dashboard-container">
      <h2 className="mb-4">User Dashboard</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      
      {user && (
        <Row>
          <Col md={4}>
            <Card className="mb-4">
              <Card.Header as="h5">User Profile</Card.Header>
              <Card.Body>
                <Card.Title>{user.displayName}</Card.Title>
                <Card.Text>
                  <strong>Email:</strong> {user.mail || user.userPrincipalName} <br />
                  <strong>User ID:</strong> {user.id} <br />
                  <strong>Account Type:</strong> {user.userType || 'External'} <br />
                  {user.jobTitle && <><strong>Job Title:</strong> {user.jobTitle} <br /></>}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={8}>
            <Card className="mb-4">
              <Card.Header as="h5">Account Management</Card.Header>
              <Card.Body>
                <Row>
                  <Col sm={6}>
                    <Card className="mb-3">
                      <Card.Body>
                        <Card.Title>Password Management</Card.Title>
                        <Card.Text>
                          Reset your password to keep your account secure.
                        </Card.Text>
                        <Button 
                          variant="primary" 
                          onClick={handlePasswordReset}
                          disabled={loading || resetRequested}
                        >
                          {resetRequested ? "Email Sent" : "Reset Password"}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col sm={6}>
                    <Card className="mb-3">
                      <Card.Body>
                        <Card.Title>Account Actions</Card.Title>
                        <Card.Text>
                          Manage your session.
                        </Card.Text>
                        <Button 
                          variant="danger" 
                          onClick={handleLogout}
                        >
                          Logout
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default UserDashboard; 