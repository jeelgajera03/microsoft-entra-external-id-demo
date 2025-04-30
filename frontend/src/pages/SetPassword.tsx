import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const SetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    verificationCode: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'password' | 'verification'>('password');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('userId');
    if (id) {
      setUserId(id);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await axios.post(`http://localhost:3000/api/set-password?userId=${userId}`, {
        password: formData.password,
      });
      setStep('verification');
      setSuccess('Password set successfully! Please check your email for the verification code.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set password');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Here you would typically verify the MFA code with your backend
      // For now, we'll just redirect to sign in
      window.location.href = '/signin';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify code');
    }
  };

  if (!userId) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Alert severity="error">Invalid or missing user ID</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {step === 'password' ? 'Set Your Password' : 'Verify Your Account'}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {step === 'password' ? (
            <form onSubmit={handleSetPassword}>
              <TextField
                fullWidth
                label="New Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
                required
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
              >
                Set Password
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <TextField
                fullWidth
                label="Verification Code"
                name="verificationCode"
                value={formData.verificationCode}
                onChange={handleChange}
                margin="normal"
                required
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
              >
                Verify Code
              </Button>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default SetPassword; 