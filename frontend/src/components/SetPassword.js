import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthService from '../services/AuthService';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  console.log(token);
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing token. Please check your link or request a new one.');
    }
  }, [token]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return false;
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(password);
    
    return hasUppercase && hasLowercase && hasNumbers && hasSpecialChars;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters');
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await AuthService.setPassword(token, password);
      
      if (response.data.success) {
        setMessage('Password set successfully! You will be redirected to login...');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          AuthService.login();
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col md={{ span: 6, offset: 3 }}>
          <Card>
            <Card.Header as="h4">Set Your Password</Card.Header>
            <Card.Body>
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}
              
              {!token ? (
                <Alert variant="warning">
                  Invalid or missing token. Please check your link or request a new one.
                </Alert>
              ) : (
                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength="8"
                      isInvalid={password && !validatePassword(password)}
                    />
                    <Form.Control.Feedback type="invalid">
                      Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      isInvalid={confirmPassword && password !== confirmPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      Passwords do not match.
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Text>
                      Your password must be at least 8 characters long and include:
                      <ul>
                        <li>At least one uppercase letter (A-Z)</li>
                        <li>At least one lowercase letter (a-z)</li>
                        <li>At least one number (0-9)</li>
                        <li>At least one special character (!@#$%, etc.)</li>
                      </ul>
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button variant="primary" type="submit" disabled={loading || !token}>
                      {loading ? 'Setting Password...' : 'Set Password'}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SetPassword; 