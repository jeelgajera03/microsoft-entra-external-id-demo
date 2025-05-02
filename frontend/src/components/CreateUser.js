import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import AuthService from '../services/AuthService';

const CreateUser = () => {
  const [userData, setUserData] = useState({
    email: '',
    displayName: '',
    givenName: '',
    surname: '',
    mailNickname: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
    
    // Auto generate mailNickname based on email
    if (name === 'email' && !userData.mailNickname) {
      const mailNickname = value.split('@')[0];
      setUserData(prev => ({
        ...prev,
        mailNickname: mailNickname
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    setSuccess(false);

    try {
      const response = await AuthService.createUser(userData);
      
      if (response.data.success) {
        setSuccess(true);
        setMessage(`User ${userData.displayName} created successfully! An invitation email has been sent.`);
        setInviteUrl(response.data.data.inviteUrl);
        setUserData({
          email: '',
          displayName: '',
          givenName: '',
          surname: '',
          mailNickname: '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <Card>
            <Card.Header as="h4">Create External User</Card.Header>
            <Card.Body>
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}
              
              {success ? (
                <div className="text-center">
                  <h5>Next Steps</h5>
                  <p>The user will receive an email with instructions to set up their account.</p>
                  <p>Alternatively, you can share this invitation link with them:</p>
                  <Alert variant="info">
                    <a href={inviteUrl} target="_blank" rel="noopener noreferrer">{inviteUrl}</a>
                  </Alert>
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      setSuccess(false);
                      setMessage('');
                    }}
                  >
                    Create Another User
                  </Button>
                </div>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={userData.email}
                      onChange={handleChange}
                      required
                      placeholder="email@example.com"
                    />
                    <Form.Text className="text-muted">
                      This will be used as the login identifier for the user.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Display Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="displayName"
                      value={userData.displayName}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="givenName"
                          value={userData.givenName}
                          onChange={handleChange}
                          required
                          placeholder="John"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="surname"
                          value={userData.surname}
                          onChange={handleChange}
                          required
                          placeholder="Doe"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Username (Mail Nickname)</Form.Label>
                    <Form.Control
                      type="text"
                      name="mailNickname"
                      value={userData.mailNickname}
                      onChange={handleChange}
                      required
                      placeholder="johndoe"
                    />
                    <Form.Text className="text-muted">
                      This will be used to generate the user's principal name.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Creating User...' : 'Create User'}
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

export default CreateUser; 