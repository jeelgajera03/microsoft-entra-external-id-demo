import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';

const NavBar = () => {
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  const handleLogout = () => {
    AuthService.logout();
    navigate('/');
    window.location.reload();
  };

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Microsoft Entra ID Demo</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            {currentUser ? (
              <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
            ) : (
              <>
                <Nav.Link as={Link} to="/create-user">Create User</Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {currentUser ? (
              <>
                <span className="navbar-text me-3">
                  Welcome, {currentUser.displayName || currentUser.email}
                </span>
                <Button variant="outline-danger" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <Button variant="outline-primary" onClick={() => AuthService.login()}>Login</Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavBar; 