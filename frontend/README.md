# Microsoft Entra External ID Demo - Frontend

This is the frontend for the Microsoft Entra External ID Demo application. It's built with React and communicates with the backend API.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Backend server running on http://localhost:3000

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

The application will run on http://localhost:3001 and automatically proxy API requests to the backend server.

## Features

- Create external users in Microsoft Entra ID
- Set user passwords
- Reset passwords
- User dashboard with profile information

## Application Flow

1. Home page: Users can login or create a new external user
2. Create User: Admin can create a new external user, which sends an invitation email
3. Set Password: New users can set their password via the invitation link
4. Login: Users can login via Microsoft Entra ID
5. Dashboard: Users can view their profile and reset their password
6. Reset Password: Users can reset their password with a token sent to their email

## Notes

- The backend server must be running for the frontend to work properly
- The application uses OAuth 2.0 and OpenID Connect for authentication
- User tokens are stored in localStorage for session management 