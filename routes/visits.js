const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Helper to format date for SQL DATETIME
function formatDatetimeForSql(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// GET /api/visits - Retrieve all visits with JOINs, search and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      status, 
      date, 
      resident_id, 
      visitor_id, 
      flat_no,
      limit = 100,
      offset = 0 
    } = req.query;

    let sql = `
      SELECT 
        v.visit_id,
        v.resident_id,
        v.visitor_id,
        DATE_FORMAT(v.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
        DATE_FORMAT(v.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
        v.status,
        r.name AS resident_name,
        r.flat_no,
        r.phone AS resident_phone,
        r.email AS resident_email,
        vis.name AS visitor_name,
        vis.phone AS visitor_phone,
        vis.vehicle_no,
        vis.purpose
      FROM visits v
      JOIN residents r ON v.resident_id = r.resident_id
      JOIN visitors vis ON v.visitor_id = vis.visitor_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status ('Inside', 'Completed', etc.)
    if (status && status !== 'All') {
      sql += ' AND v.status = ?';
      params.push(status);
    }

    // Filter by date (matches DATE(v.entry_time))
    if (date && date.trim() !== '') {
      sql += ' AND DATE(v.entry_time) = ?';
      params.push(date.trim());
    }

    // Filter by resident_id
    if (resident_id) {
      sql += ' AND v.resident_id = ?';
      params.push(parseInt(resident_id, 10));
    }

    // Filter by visitor_id
    if (visitor_id) {
      sql += ' AND v.visitor_id = ?';
      params.push(parseInt(visitor_id, 10));
    }

    // Filter by flat_no
    if (flat_no && flat_no.trim() !== '') {
      sql += ' AND r.flat_no = ?';
      params.push(flat_no.trim());
    }

    // Global Search across resident name, flat, visitor name, phone, vehicle, purpose
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        r.name LIKE ? OR 
        r.flat_no LIKE ? OR 
        vis.name LIKE ? OR 
        vis.phone LIKE ? OR 
        vis.vehicle_no LIKE ? OR 
        vis.purpose LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    // Default order: most recent visits first
    sql += ' ORDER BY v.entry_time DESC';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

    sql += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, safeOffset);

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve visits records from database',
      error: error.message
    });
  }
});

// GET /api/visits/:id - Retrieve single visit record with joined details
router.get('/:id', async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    if (isNaN(visitId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visit ID supplied'
      });
    }

    const sql = `
      SELECT 
        v.visit_id,
        v.resident_id,
        v.visitor_id,
        DATE_FORMAT(v.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
        DATE_FORMAT(v.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
        v.status,
        r.name AS resident_name,
        r.flat_no,
        r.phone AS resident_phone,
        vis.name AS visitor_name,
        vis.phone AS visitor_phone,
        vis.vehicle_no,
        vis.purpose
      FROM visits v
      JOIN residents r ON v.resident_id = r.resident_id
      JOIN visitors vis ON v.visitor_id = vis.visitor_id
      WHERE v.visit_id = ?
    `;

    const [rows] = await pool.query(sql, [visitId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visit record #${visitId} not found`
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching visit details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve visit record',
      error: error.message
    });
  }
});

// POST /api/visits - Record a new visit
router.post('/', async (req, res) => {
  try {
    const { resident_id, visitor_id, entry_time, status = 'Inside' } = req.body;

    const resId = parseInt(resident_id, 10);
    const visId = parseInt(visitor_id, 10);

    const errors = [];
    if (isNaN(resId)) errors.push('Valid Resident ID is required');
    if (isNaN(visId)) errors.push('Valid Visitor ID is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Verify resident exists
    const [resRows] = await pool.query('SELECT resident_id, name, flat_no FROM residents WHERE resident_id = ?', [resId]);
    if (resRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Selected Resident with ID ${resId} does not exist in the database`
      });
    }

    // Verify visitor exists
    const [visRows] = await pool.query('SELECT visitor_id, name FROM visitors WHERE visitor_id = ?', [visId]);
    if (visRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Selected Visitor with ID ${visId} does not exist in the database`
      });
    }

    // Determine entry time: if client sent an entry_time, format it; otherwise use CURRENT_TIMESTAMP
    let formattedEntryTime;
    if (entry_time) {
      const parsed = new Date(entry_time);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entry_time format'
        });
      }
      formattedEntryTime = parsed.toISOString().slice(0, 19).replace('T', ' ');
    }

    const visitStatus = (status && status.trim()) ? status.trim() : 'Inside';

    let result;
    if (formattedEntryTime) {
      [result] = await pool.query(
        'INSERT INTO visits (resident_id, visitor_id, entry_time, exit_time, status) VALUES (?, ?, ?, NULL, ?)',
        [resId, visId, formattedEntryTime, visitStatus]
      );
    } else {
      [result] = await pool.query(
        'INSERT INTO visits (resident_id, visitor_id, entry_time, exit_time, status) VALUES (?, ?, NOW(), NULL, ?)',
        [resId, visId, visitStatus]
      );
    }

    const newVisitId = result.insertId;

    // Fetch newly created record with joins
    const [newVisit] = await pool.query(
      `SELECT 
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
      WHERE v.visit_id = ?`,
      [newVisitId]
    );

    res.status(201).json({
      success: true,
      message: `Visit #${newVisitId} recorded for ${visRows[0].name} visiting Flat ${resRows[0].flat_no}`,
      data: newVisit[0]
    });
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({
      success: false,
      message: 'Database error while recording visit',
      error: error.message
    });
  }
});

// PUT /api/visits/:id/checkout - Check out an active visitor (sets exit_time = NOW(), status = 'Completed')
router.put('/:id/checkout', async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    if (isNaN(visitId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visit ID supplied'
      });
    }

    // Check visit existence & current status
    const [existing] = await pool.query('SELECT * FROM visits WHERE visit_id = ?', [visitId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visit #${visitId} not found`
      });
    }

    const currentVisit = existing[0];
    if (currentVisit.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Visit #${visitId} is already completed (checked out at ${currentVisit.exit_time || 'previously recorded time'}). Duplicate checkouts are not allowed.`
      });
    }

    // Perform checkout update
    await pool.query(
      "UPDATE visits SET exit_time = NOW(), status = 'Completed' WHERE visit_id = ?",
      [visitId]
    );

    // Fetch updated record with JOINs
    const [updated] = await pool.query(
      `SELECT 
        v.visit_id,
        v.resident_id,
        v.visitor_id,
        DATE_FORMAT(v.entry_time, '%Y-%m-%d %H:%i:%s') AS entry_time,
        DATE_FORMAT(v.exit_time, '%Y-%m-%d %H:%i:%s') AS exit_time,
        v.status,
        r.name AS resident_name,
        r.flat_no,
        vis.name AS visitor_name
      FROM visits v
      JOIN residents r ON v.resident_id = r.resident_id
      JOIN visitors vis ON v.visitor_id = vis.visitor_id
      WHERE v.visit_id = ?`,
      [visitId]
    );

    res.json({
      success: true,
      message: `Visitor ${updated[0].visitor_name} checked out successfully. Status marked as Completed.`,
      data: updated[0]
    });
  } catch (error) {
    console.error('Error checking out visit:', error);
    res.status(500).json({
      success: false,
      message: 'Database error during checkout',
      error: error.message
    });
  }
});

// Also support POST /api/visits/:id/checkout for clients that prefer POST
router.post('/:id/checkout', async (req, res) => {
  // Delegate to checkout logic
  req.method = 'PUT';
  router.handle(req, res);
});

// PUT /api/visits/:id - Update visit details
router.put('/:id', async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    if (isNaN(visitId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visit ID supplied'
      });
    }

    const [existing] = await pool.query('SELECT * FROM visits WHERE visit_id = ?', [visitId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visit #${visitId} not found`
      });
    }

    const { resident_id, visitor_id, entry_time, exit_time, status } = req.body;

    const resId = resident_id ? parseInt(resident_id, 10) : existing[0].resident_id;
    const visId = visitor_id ? parseInt(visitor_id, 10) : existing[0].visitor_id;

    // Validate foreign keys
    const [resCheck] = await pool.query('SELECT resident_id FROM residents WHERE resident_id = ?', [resId]);
    if (resCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resident ID ${resId} not found`
      });
    }

    const [visCheck] = await pool.query('SELECT visitor_id FROM visitors WHERE visitor_id = ?', [visId]);
    if (visCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visitor ID ${visId} not found`
      });
    }

    let parsedEntry = existing[0].entry_time;
    if (entry_time) {
      const d = new Date(entry_time);
      if (!isNaN(d.getTime())) {
        parsedEntry = d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    let parsedExit = existing[0].exit_time;
    if (exit_time !== undefined) {
      if (exit_time === null || exit_time === '') {
        parsedExit = null;
      } else {
        const d = new Date(exit_time);
        if (!isNaN(d.getTime())) {
          parsedExit = d.toISOString().slice(0, 19).replace('T', ' ');
        }
      }
    }

    const newStatus = status ? status.trim() : existing[0].status;

    await pool.query(
      `UPDATE visits 
       SET resident_id = ?, visitor_id = ?, entry_time = ?, exit_time = ?, status = ?
       WHERE visit_id = ?`,
      [resId, visId, parsedEntry, parsedExit, newStatus, visitId]
    );

    const [updated] = await pool.query(
      `SELECT 
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
      WHERE v.visit_id = ?`,
      [visitId]
    );

    res.json({
      success: true,
      message: `Visit #${visitId} updated successfully`,
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({
      success: false,
      message: 'Database error while updating visit',
      error: error.message
    });
  }
});

// DELETE /api/visits/:id - Delete visit record
router.delete('/:id', async (req, res) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    if (isNaN(visitId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visit ID supplied'
      });
    }

    const [existing] = await pool.query('SELECT * FROM visits WHERE visit_id = ?', [visitId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visit record #${visitId} not found`
      });
    }

    await pool.query('DELETE FROM visits WHERE visit_id = ?', [visitId]);

    res.json({
      success: true,
      message: `Visit record #${visitId} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({
      success: false,
      message: 'Database error while deleting visit',
      error: error.message
    });
  }
});

module.exports = router;
