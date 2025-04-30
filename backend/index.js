const express = require('express');
const msal = require('@azure/msal-node');
const bodyParser = require('body-parser');
const path = require('path');
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



// In-memory store for OTP codes (in production, use a database)
const otpStore = new Map(); // userId -> { code, expiresAt }
const mfaStore = new Map(); // userId -> { mfaEmail, enabled }
const sessionStore = new Map(); // sessionId -> { userId, expiresAt }

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

// Generate secure random OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Generate a session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

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

    // Generate custom invitation URL
    const inviteUrl = `${process.env.BASE_URL}/set-password?userId=${userData.id}`;

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
      data: { id: userData.id, inviteUrl }
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
app.post('/api/set-password', async (req, res) => {
  try {
    const { password } = req.body;
    const { userId } = req.query;

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

// API: Setup MFA Email
app.post('/api/setup-mfa', async (req, res) => {
  try {
    const { userId, mfaEmail } = req.body;

    // Validate inputs
    if (!userId || !mfaEmail) {
      return res.status(400).json({ error: 'User ID and MFA email are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mfaEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Add email as MFA authentication method via Graph API
    const accessToken = await getGraphToken();
    const graphApiUrl = `https://graph.microsoft.com/v1.0/users/${userId}/authentication/emailMethods`;
    await axios.post(
      graphApiUrl,
      { emailAddress: mfaEmail },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      success: true,
      message: 'MFA email added successfully. It will be used for MFA during sign-in.',
    });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:' + PORT}`);
});