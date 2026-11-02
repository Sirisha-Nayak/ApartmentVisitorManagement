const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-memory active security staff sessions
const activeSessions = new Map();

// Authorized Security & Management Staff Accounts
const STAFF_ACCOUNTS = [
  {
    username: 'admin',
    password: 'password123',
    pin: '1234',
    name: 'Chief Security Officer',
    role: 'Security Administrator',
    badgeId: 'SEC-ADMIN-01',
    gate: 'Control Center'
  },
  {
    username: 'guard',
    password: 'password123',
    pin: '5678',
    name: 'Officer Rajesh Kumar',
    role: 'Main Gate Warden',
    badgeId: 'SEC-GATE-104',
    gate: 'North Main Gate'
  }
];

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password, pin } = req.body;

  let matchedAccount = null;

  if (pin) {
    matchedAccount = STAFF_ACCOUNTS.find(acc => acc.pin === pin.trim());
  } else if (username && password) {
    matchedAccount = STAFF_ACCOUNTS.find(
      acc => acc.username.toLowerCase() === username.trim().toLowerCase() && acc.password === password
    );
  }

  if (!matchedAccount) {
    return res.status(401).json({
      success: false,
      message: 'Invalid security credentials or PIN. Please check your credentials.'
    });
  }

  // Generate secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    token,
    username: matchedAccount.username,
    name: matchedAccount.name,
    role: matchedAccount.role,
    badgeId: matchedAccount.badgeId,
    gate: matchedAccount.gate,
    loginTime: new Date().toISOString()
  };

  activeSessions.set(token, sessionData);

  res.json({
    success: true,
    message: `Welcome, ${matchedAccount.name}`,
    data: sessionData
  });
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, authenticated: false });
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  const session = activeSessions.get(token);

  if (!session) {
    return res.status(401).json({ success: false, authenticated: false, message: 'Session expired or invalid' });
  }

  res.json({
    success: true,
    authenticated: true,
    user: session
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/, '').trim();
    activeSessions.delete(token);
  }
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
