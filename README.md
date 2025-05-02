# Microsoft Entra External ID Demo

This project demonstrates how to use Microsoft Entra External ID (formerly Azure AD B2C) to manage external users. It consists of a Node.js/Express backend and a React.js frontend.

## Project Structure

- `/backend` - Express.js API server that communicates with Microsoft Graph API
- `/frontend` - React.js application for the user interface

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Microsoft Azure account with Entra ID configured
- Registered application in Microsoft Entra ID with proper permissions

## Environment Setup

Create a `.env` file in the `backend` directory with the following variables:

```
CLIENT_ID=your_client_id
TENANT_ID=your_tenant_id
CLIENT_SECRET=your_client_secret
VERIFIED_DOMAIN=your_verified_domain
BASE_URL=http://localhost:3000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
JWT_SECRET=generate_a_strong_secret
```

## Installation & Running

### Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

   The backend server will run on http://localhost:3000.

### Frontend

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

   The frontend will run on http://localhost:3001.

## Application Flow

1. Admin creates an external user
2. User receives an email with a link to set their password
3. User sets their password and is redirected to login
4. User logs in with Microsoft Entra ID
5. User can view their profile and manage their account
6. User can request a password reset if needed

## Features

- Create external users in Microsoft Entra ID
- Custom invitation emails with secure links
- Password management (set initial password, reset password)
- User dashboard with profile information
- Secure authentication with OAuth 2.0 and JWT tokens
