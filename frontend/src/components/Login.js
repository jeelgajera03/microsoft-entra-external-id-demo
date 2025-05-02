import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (AuthService.isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);
  
  const handleLogin = () => {
    AuthService.login();
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">Login with Microsoft Entra ID</h4>
            </Card.Header>
            <Card.Body className="d-flex flex-column align-items-center">
              <p className="mb-4 text-center">
                Click the button below to sign in with your Microsoft Entra ID credentials.
              </p>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleLogin}
                className="px-4 py-2"
              >
                Sign in with Microsoft
              </Button>
              <hr className="w-100 my-4" />
              <p className="text-center">
                Don't have an account? Ask an administrator to create an external account for you.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login; 