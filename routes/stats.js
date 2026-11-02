const express = require('express');
const router = express.Router();
const { pool, testConnection } = require('../db');

// GET /api/stats - Real-time statistics from MySQL
router.get('/', async (req, res) => {
  try {
    // Run real-time aggregate queries
    const [residentsCount] = await pool.query('SELECT COUNT(*) AS count FROM residents');
    const [visitorsCount] = await pool.query('SELECT COUNT(*) AS count FROM visitors');
    const [visitsCount] = await pool.query('SELECT COUNT(*) AS count FROM visits');
    const [insideCount] = await pool.query("SELECT COUNT(*) AS count FROM visits WHERE status = 'Inside'");
    const [todayCount] = await pool.query('SELECT COUNT(*) AS count FROM visits WHERE DATE(entry_time) = CURDATE()');
    const [completedCount] = await pool.query("SELECT COUNT(*) AS count FROM visits WHERE status = 'Completed'");

    // Fetch the 8 most recent visits with JOINs
    const [recentVisits] = await pool.query(`
      SELECT 
        v.visit_id,
        v.resident_id,
        v.visitor_id,
        DATE_FORMAT(v.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
        DATE_FORMAT(v.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
        v.status,
        r.name AS resident_name,
        r.flat_no,
        vis.name AS visitor_name,
        vis.phone AS visitor_phone,
        vis.vehicle_no,
        vis.purpose
      FROM visits v
      JOIN residents r ON v.resident_id = r.resident_id
      JOIN visitors vis ON v.visitor_id = vis.visitor_id
      ORDER BY v.entry_time DESC
      LIMIT 8
    `);

    // Grouping by visit purposes for insights
    const [purposeBreakdown] = await pool.query(`
      SELECT COALESCE(vis.purpose, 'General') AS purpose, COUNT(*) AS count
      FROM visits v
      JOIN visitors vis ON v.visitor_id = vis.visitor_id
      GROUP BY purpose
      ORDER BY count DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalResidents: residentsCount[0].count,
        totalVisitors: visitorsCount[0].count,
        totalVisits: visitsCount[0].count,
        currentlyInside: insideCount[0].count,
        todayVisits: todayCount[0].count,
        completedVisits: completedCount[0].count,
        recentVisits,
        purposeBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics from MySQL',
      error: error.message
    });
  }
});

// GET /api/stats/health - Database and server health diagnostic
router.get('/health', async (req, res) => {
  const dbHealth = await testConnection();
  res.json({
    status: dbHealth.connected ? 'healthy' : 'degraded',
    serverTime: new Date().toISOString(),
    database: dbHealth
  });
});

module.exports = router;
