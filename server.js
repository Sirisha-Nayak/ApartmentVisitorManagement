const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { testConnection } = require('./db');
const residentsRouter = require('./routes/residents');
const visitorsRouter = require('./routes/visitors');
const visitsRouter = require('./routes/visits');
const statsRouter = require('./routes/stats');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from project root
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/residents', residentsRouter);
app.use('/api/visitors', visitorsRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/auth', authRouter);

// Database Health Check Route
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    server: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// HTML Page Route redirects / shortcuts
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API 404 Handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found`
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server and verify DB connection
async function startServer() {
  const dbHealth = await testConnection();

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log('  APARTMENT VISITOR MANAGEMENT SYSTEM - SERVER');
    console.log('====================================================');
    console.log(`✓ HTTP Server running on: http://localhost:${PORT}`);
    if (dbHealth.connected) {
      console.log(`✓ MySQL Database: CONNECTED (${dbHealth.database} @ ${dbHealth.host}:${dbHealth.port})`);
      console.log(`✓ MySQL Server Version: ${dbHealth.version}`);
    } else {
      console.error(`✗ MySQL Connection Failed: ${dbHealth.error}`);
      console.error('  Please check your .env database credentials.');
    }
    console.log('----------------------------------------------------');
    console.log('Active Web Pages:');
    console.log(`  Dashboard:  http://localhost:${PORT}/index.html`);
    console.log(`  Residents:  http://localhost:${PORT}/residents.html`);
    console.log(`  Visitors:   http://localhost:${PORT}/visitors.html`);
    console.log(`  Visits:     http://localhost:${PORT}/visits.html`);
    console.log(`  Login:      http://localhost:${PORT}/login.html`);
    console.log('====================================================');
  });
}

startServer();

module.exports = app;
