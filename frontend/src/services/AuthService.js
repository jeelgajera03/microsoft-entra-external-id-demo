import axios from 'axios';

const API_URL = 'http://localhost:3000/api/';
const AUTH_URL = 'http://localhost:3000/';
const FRONTEND_URL = 'http://localhost:3001';

class AuthService {
  // Log in user via Microsoft Entra ID
  login() {
    // Redirect to backend login, but set the redirectUri to our frontend callback URL
    window.location.href = `${AUTH_URL}login?redirect_uri=${encodeURIComponent(FRONTEND_URL + '/auth/callback')}`;
  }

  // Logout user
  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  // Create a new external user
  createUser(userData) {
    return axios.post(API_URL + 'create-user', userData);
  }

  // Set password for new user
  setPassword(token, password) {
    return axios.post(API_URL + 'set-password', { password }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Request password reset
  requestPasswordReset(token) {
    return axios.post(API_URL + 'request-password-reset', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Reset password with token
  resetPassword(token, newPassword) {
    return axios.post(API_URL + 'reset-password', {
      token,
      newPassword
    });
  }

  // Get user info
  getUserInfo(token) {
    return axios.get(API_URL + 'user-info', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Store user data in localStorage
  setCurrentUser(userData, token) {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  }

  // Get current user from localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  }

  // Get authentication token
  getToken() {
    return localStorage.getItem('token');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.getCurrentUser() !== null && this.getToken() !== null;
  }
}

export default new AuthService(); 