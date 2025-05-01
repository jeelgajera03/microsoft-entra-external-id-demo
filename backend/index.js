const express = require('express');
const msal = require('@azure/msal-node');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const dotenv = require('dotenv');
const crypto = require('crypto');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cors = require('cors');


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true // if you are using cookies

}));
// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function getGraphToken() {
  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default'],
    skipCache: true
  };
  const response = await cca.acquireTokenByClientCredential(tokenRequest);
  return response.accessToken;
}
const clientId = process.env.CLIENT_ID;
const tenantId = process.env.TENANT_ID;
// const authority = `https://entraidauth12.ciamlogin.com/${process.env.TENANT_ID}`;
const authority = `https://c3db1e68-955c-4423-ad2a-447e56ea3190.ciamlogin.com/${tenantId}`; // Updated authority
const redirectUri = 'http://localhost:3000/auth/callback';
// JWKS client for fetching Microsoft's public keys
const client = jwksClient({
  jwksUri: `${authority}/discovery/v2.0/keys`
});
// Function to get user profile from Graph API
async function getUserProfile(userId) {
  const accessToken = await getGraphToken();
  try {
    const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch user profile: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Function to get signing key
async function getSigningKey(kid) {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        resolve(key.getPublicKey());
      }
    });
  });
}

async function getUserDetailsFromIdToken(idToken) {
  try {
    // Validate input
    if (!idToken) {
      throw new Error('No id_token provided');
    }

    // Decode token to get header and payload
    const decodedToken = jwt.decode(idToken, { complete: true });
    if (!decodedToken) {
      throw new Error('Invalid token');
    }

    // Get signing key
    const { kid } = decodedToken.header;
    const signingKey = await getSigningKey(kid);

    // Verify token
    const verifiedToken = jwt.verify(idToken, signingKey, {
      audience: clientId,
      issuer: `${authority}/v2.0`,
      algorithms: ['RS256'],
      nonce: 'S51xbn_lhC'
    });

    // Extract and return user details
    return {
      id: verifiedToken.oid || verifiedToken.sub,
      email: verifiedToken.email || verifiedToken.upn,
    };
  } catch (error) {
    console.error('Error processing ID token:', error.message);
    throw error;
  }
}

// Add this middleware function near your other middleware
const validateAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access token missing' });
    }

    // Decode token to get header
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get signing key
    const { kid } = decodedToken.header;
    const signingKey = await getSigningKey(kid);

    // Verify token
    const verifiedToken = jwt.verify(token, signingKey, {
      audience: clientId,
      issuer: `${authority}/v2.0`,
      algorithms: ['RS256']
    });

    // Attach user info to request
    req.user = {
      id: verifiedToken.oid || verifiedToken.sub,
      email: verifiedToken.email || verifiedToken.upn
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const validateUserToken = (req, res, next) => {
  try {
    const token = req.query.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'a0d6ffdd9039ed850d94296a36eaac6303d2e07cda2a9c56b4e923c98be2e4b4');
    
    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    console.log({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    });

    next();
  } catch (error) {
    console.error('Token validation error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// API: Create User
app.post('/api/create-user', async (req, res) => {
  try {
    const {
      email,
      displayName,
      givenName,
      surname,
      mailNickname,
    } = req.body;

    // Validate required fields
    if (!email || !displayName || !givenName || !surname || !mailNickname) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = await getGraphToken();
    const verifiedDomain = process.env.VERIFIED_DOMAIN || 'demovijayorg.onmicrosoft.com';
    const userPrincipalName = `${mailNickname}@${verifiedDomain}`;
    const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16) + '!1Aa';

    // Create user with external identity using axios
    const createUserResponse = await axios.post('https://graph.microsoft.com/v1.0/users', {
      accountEnabled: true,
      displayName,
      mailNickname,
      userPrincipalName,
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: tempPassword
      },
      passwordPolicies: "DisablePasswordExpiration",
      mail: email,
      givenName,
      surname,
      identities: [
        {
          signInType: "emailAddress",
          issuer: verifiedDomain,
          issuerAssignedId: email
        }
      ],
      userType: "Guest"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const userData = createUserResponse.data;
    console.log({userData});

    // Generate a JWT token for the user
    const userToken = jwt.sign(
      {
        id: userData.id,
        email: email,
        name: displayName
      },
      process.env.JWT_SECRET || 'a0d6ffdd9039ed850d94296a36eaac6303d2e07cda2a9c56b4e923c98be2e4b4', // Use a proper secret from env
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Generate custom invitation URL with the token
    const inviteUrl = `${process.env.BASE_URL}/set-password?token=${userToken}`;

    // Send custom email using nodemailer
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Our Organization - Account Setup',
      html: `
        <h2>Hello ${givenName},</h2>
        <p>You have been invited to join our organization as an external user.</p>
        <p>Please click the link below to set up your account and configure Multi-Factor Authentication (MFA):</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Set Up Account</a>
        <p>You will be prompted to change this password upon first login.</p>
        <p>If you have any questions, please contact our support team at support@organization.com.</p>
        <p>Best regards,<br>The IT Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'User created and custom invitation email sent',
      data: { 
        id: userData.id, 
        inviteUrl,
        token: userToken // Return the user-specific token
      },
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.response?.data?.error?.message || error.message 
    });
  }
});

// API: Set Password
app.post('/api/set-password', validateUserToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id; // Get from token instead of query param

    // Validate inputs
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must include uppercase, lowercase, numbers, and special characters' });
    }

    const token = await getGraphToken();

    // Update user's password
    const updateUserResponse = await axios.patch(
      `https://graph.microsoft.com/v1.0/users/${userId}`,
      {
        passwordProfile: {
          forceChangePasswordNextSignIn: false,
          password
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Get user information to retrieve email for MFA setup
    const userResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}?$select=mail,displayName`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const userData = userResponse.data;

    res.json({
      success: true,
      message: 'Password set successfully',
      user: {
        id: userId,
        email: userData.mail,
        displayName: userData.displayName
      }
    });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.response?.data?.error?.message || error.message 
    });
  }
});

// Route to initiate login
app.get('/login', (req, res) => {
  const nonce = 'S51xbn_lhC'; // In production, generate a random nonce
  const authUrl = `${authority}/oauth2/v2.0/authorize?` +
    `client_id=${process.env.CLIENT_ID}&` +
    `nonce=${nonce}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=openid profile email&` + // Updated scope
    // `scope=openid&` +
    `response_type=id_token&` +
    `prompt=login`;

  res.redirect(authUrl);
});

// Route to handle callback
// Update the callback route to serve a dashboard
app.get('/auth/callback', async (req, res) => {
  try {
    const idToken = req.query.id_token;
    if (!idToken) {
      throw new Error('No id_token provided');
    }
    
    const userData = await getUserDetailsFromIdToken(idToken);
    const encodedToken = encodeURIComponent(idToken);

    // Serve a dashboard HTML with reset password button
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .dashboard { max-width: 800px; margin: 0 auto; }
          .user-info { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .actions { display: flex; gap: 10px; }
          .btn { padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          .btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="dashboard">
          <h1>Welcome to Your Dashboard</h1>
          
          <div class="user-info">
            <h2>User Information</h2>
            <p><strong>ID:</strong> ${userData.id}</p>
            <p><strong>Email:</strong> ${userData.email}</p>
          </div>
          
          <div class="actions">
            <a href="/api/request-password-reset" class="btn" onclick="requestReset(event)">Reset Password</a>
            <!-- Add more action buttons as needed -->
          </div>
        </div>

        <script>
          async function requestReset(e) {
            e.preventDefault();
            try {
              const response = await fetch('/api/request-password-reset', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ${encodedToken}'
                }
              });
              
              const result = await response.json();
              if (response.ok) {
                alert('Password reset link sent to your email!');
              } else {
                alert('Error: ' + (result.error || 'Failed to send reset link'));
              }
            } catch (err) {
              alert('Error: ' + err.message);
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error processing token:', error.message);
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Error</title>
      </head>
      <body>
        <h1>Login Failed</h1>
        <p>Error: ${error.message}</p>
      </body>
      </html>
    `);
  }
});


// API: reset-password feature
// Step 1: Initialize password reset token storage
// Using in-memory storage for demonstration purposes
// In production, use a database to store these tokens
const passwordResetTokens = new Map();

// Step 2: API to request a password reset
app.post('/api/request-password-reset', validateAccessToken, async (req, res) => {
  try {
    const email = req.user.email; // Get from token instead of body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const token = await getGraphToken();

    // Find user by email using Microsoft Graph API
    const userResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users?$filter=mail eq '${email}' or userPrincipalName eq '${email}'&$select=id,displayName,givenName`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Check if user exists
    if (!userResponse.data.value || userResponse.data.value.length === 0) {
      // For security, don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If your email exists in our system, you will receive a password reset link'
      });
    }

    const user = userResponse.data.value[0];
    
    // Generate a reset token (cryptographically secure)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Store token with expiration (1 hour)
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      email,
      expires: new Date(Date.now() + 3600000) // 1 hour from now
    });
    
    // Generate password reset URL
    const resetUrl = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;
    
    // Send password reset email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Hello ${user.givenName || user.displayName},</h2>
        <p>We received a request to reset your password.</p>
        <p>Please click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The IT Team</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({
      success: true, 
      message: 'Password reset email sent successfully'
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Server error',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// Step 3: API to verify token and reset password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Check if token exists and is valid
    if (!passwordResetTokens.has(token)) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const tokenData = passwordResetTokens.get(token);
    
    // Check if token has expired
    if (new Date() > tokenData.expires) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ error: 'Token has expired' });
    }
    
    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must include uppercase, lowercase, numbers, and special characters' });
    }
    
    const graphToken = await getGraphToken();
    
    // Update user's password using Microsoft Graph API
    await axios.patch(
      `https://graph.microsoft.com/v1.0/users/${tokenData.userId}`,
      {
        passwordProfile: {
          forceChangePasswordNextSignIn: false,
          password: newPassword
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${graphToken}`
        }
      }
    );
    
    // Remove the used token
    passwordResetTokens.delete(token);
    
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Server error',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

app.get('/api/user-info', validateAccessToken, async (req, res) => {
  try {
    const token = await getGraphToken();
    const userResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${req.user.id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.json({
      success: true,
      user: userResponse.data
    });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Server error',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// Add a utility function to clean up expired tokens
function cleanupExpiredTokens() {
  const now = new Date();
  for (const [token, data] of passwordResetTokens.entries()) {
    if (now > data.expires) {
      passwordResetTokens.delete(token);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 3600000); // 1 hour

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:' + PORT}`);
});
