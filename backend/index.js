const express = require('express');
const msal = require('@azure/msal-node');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const axios = require('axios');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

async function getGraphToken() {
  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default'],
    skipCache: true
  };
  const response = await cca.acquireTokenByClientCredential(tokenRequest);
  return response.accessToken;
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

    // Create user with external identity
    const createUserResponse = await fetch('https://graph.microsoft.com/v1.0/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
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
        // Explicitly set userType to Guest for external accounts
        userType: "Guest"
      })
    });

    if (createUserResponse.status === 201) {
      const userData = await createUserResponse.json();
      
      // Send invitation
      const inviteResponse = await fetch('https://graph.microsoft.com/v1.0/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invitedUserEmailAddress: email,
          inviteRedirectUrl: `${process.env.BASE_URL}/set-password?email=${encodeURIComponent(email)}`,
          sendInvitationMessage: true,
          invitedUserMessageInfo: {
            customizedMessageBody: `Hello ${givenName},\n\nYou have been invited to join our organization as an external user. Please click the link below to set up your account and configure Multi-Factor Authentication (MFA).\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe IT Team`
          },
          invitedUser: { id: userData.id }
        })
      });

      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json();
        res.json({
          success: true,
          message: 'User created and invitation sent',
          data: { id: userData.id, inviteUrl: inviteData.inviteRedeemUrl }
        });
      } else {
        const errorData = await inviteResponse.json();
        res.status(inviteResponse.status).json({ error: 'Failed to send invitation', details: errorData.error });
      }
    } else {
      const errorData = await createUserResponse.json();
      res.status(createUserResponse.status).json({ error: 'Failed to create user', details: errorData.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});


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

    // Update user's password and invitation state
    const updateUserResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        passwordProfile: {
          forceChangePasswordNextSignIn: true, // Require password change on next login
          password
        },
      })
    });

    if (updateUserResponse.ok) {
      res.json({
        success: true,
        message: 'Password set succesfully'
      });
    } else {
      const errorData = await updateUserResponse.json();
      res.status(updateUserResponse.status).json({ error: 'Failed to update user', details: errorData.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:' + PORT}`);
});

