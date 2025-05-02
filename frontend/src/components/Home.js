import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AuthService from '../services/AuthService';

const Home = () => {
  const handleLogin = () => {
    AuthService.login();
  };

  return (
    <Container className="mt-5">
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <Card className="text-center">
            <Card.Header as="h3">Welcome to Microsoft Entra External ID Demo</Card.Header>
            <Card.Body>
              <Card.Title>Manage external users with Microsoft Entra ID</Card.Title>
              <Card.Text>
                This application demonstrates how to use Microsoft Entra External ID to manage external users.
                You can create external user accounts, set passwords, and reset passwords.
              </Card.Text>
              <div className="d-flex justify-content-center gap-3">
                <Button variant="primary" onClick={handleLogin}>Login</Button>
                <Button variant="secondary" as={Link} to="/create-user">Create External User</Button>
              </div>
            </Card.Body>
            <Card.Footer className="text-muted">
              Powered by Microsoft Entra ID and Azure Active Directory B2C
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home; 