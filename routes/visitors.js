const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/visitors - Retrieve all visitors with optional search and sort
router.get('/', async (req, res) => {
  try {
    const { search, sort = 'name', order = 'ASC' } = req.query;

    const allowedSortFields = ['visitor_id', 'name', 'phone', 'vehicle_no', 'purpose'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let sql = `
      SELECT 
        v.visitor_id,
        v.name,
        v.phone,
        v.vehicle_no,
        v.purpose,
        COUNT(vt.visit_id) AS total_visits,
        SUM(CASE WHEN vt.status = 'Inside' THEN 1 ELSE 0 END) AS active_visits
      FROM visitors v
      LEFT JOIN visits vt ON v.visitor_id = vt.visitor_id
    `;
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ` WHERE (v.name LIKE ? OR v.phone LIKE ? OR v.vehicle_no LIKE ? OR v.purpose LIKE ?)`;
      params.push(term, term, term, term);
    }

    sql += ` GROUP BY v.visitor_id, v.name, v.phone, v.vehicle_no, v.purpose`;
    sql += ` ORDER BY v.${sortField} ${sortOrder}`;

    const [rows] = await pool.query(sql, params);
    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve visitors from the database',
      error: error.message
    });
  }
});

// GET /api/visitors/:id - Retrieve single visitor by ID
router.get('/:id', async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id, 10);
    if (isNaN(visitorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visitor ID supplied'
      });
    }

    const [rows] = await pool.query(
      `SELECT v.*, COUNT(vt.visit_id) AS total_visits 
       FROM visitors v 
       LEFT JOIN visits vt ON v.visitor_id = vt.visitor_id 
       WHERE v.visitor_id = ?
       GROUP BY v.visitor_id`,
      [visitorId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visitor with ID ${visitorId} not found`
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching visitor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve visitor details',
      error: error.message
    });
  }
});

// POST /api/visitors - Register a new visitor
router.post('/', async (req, res) => {
  try {
    const { name, phone, vehicle_no, purpose } = req.body;

    // Validation
    const errors = [];
    if (!name || name.trim() === '') {
      errors.push('Visitor name is required');
    }

    if (name && name.length > 100) {
      errors.push('Visitor name must be 100 characters or fewer');
    }
    if (phone && phone.length > 15) {
      errors.push('Phone number must be 15 characters or fewer');
    }
    if (vehicle_no && vehicle_no.length > 30) {
      errors.push('Vehicle number must be 30 characters or fewer');
    }
    if (purpose && purpose.length > 150) {
      errors.push('Purpose must be 150 characters or fewer');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanVehicle = vehicle_no ? vehicle_no.trim() : null;
    const cleanPurpose = purpose ? purpose.trim() : null;

    const [result] = await pool.query(
      'INSERT INTO visitors (name, phone, vehicle_no, purpose) VALUES (?, ?, ?, ?)',
      [cleanName, cleanPhone, cleanVehicle, cleanPurpose]
    );

    const newId = result.insertId;
    const [createdRows] = await pool.query('SELECT * FROM visitors WHERE visitor_id = ?', [newId]);

    res.status(201).json({
      success: true,
      message: `Visitor "${cleanName}" registered successfully`,
      data: createdRows[0]
    });
  } catch (error) {
    console.error('Error creating visitor:', error);
    res.status(500).json({
      success: false,
      message: 'Database error while registering visitor',
      error: error.message
    });
  }
});

// PUT /api/visitors/:id - Update visitor information
router.put('/:id', async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id, 10);
    if (isNaN(visitorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visitor ID supplied'
      });
    }

    // Check if visitor exists
    const [existing] = await pool.query('SELECT * FROM visitors WHERE visitor_id = ?', [visitorId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visitor with ID ${visitorId} not found`
      });
    }

    const { name, phone, vehicle_no, purpose } = req.body;

    const errors = [];
    if (!name || name.trim() === '') {
      errors.push('Visitor name is required');
    }
    if (name && name.length > 100) {
      errors.push('Visitor name must be 100 characters or fewer');
    }
    if (phone && phone.length > 15) {
      errors.push('Phone number must be 15 characters or fewer');
    }
    if (vehicle_no && vehicle_no.length > 30) {
      errors.push('Vehicle number must be 30 characters or fewer');
    }
    if (purpose && purpose.length > 150) {
      errors.push('Purpose must be 150 characters or fewer');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanVehicle = vehicle_no ? vehicle_no.trim() : null;
    const cleanPurpose = purpose ? purpose.trim() : null;

    await pool.query(
      'UPDATE visitors SET name = ?, phone = ?, vehicle_no = ?, purpose = ? WHERE visitor_id = ?',
      [cleanName, cleanPhone, cleanVehicle, cleanPurpose, visitorId]
    );

    const [updatedRows] = await pool.query('SELECT * FROM visitors WHERE visitor_id = ?', [visitorId]);

    res.json({
      success: true,
      message: `Visitor "${cleanName}" updated successfully`,
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Error updating visitor:', error);
    res.status(500).json({
      success: false,
      message: 'Database error while updating visitor',
      error: error.message
    });
  }
});

// DELETE /api/visitors/:id - Delete visitor with historical visit preservation
router.delete('/:id', async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id, 10);
    if (isNaN(visitorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visitor ID supplied'
      });
    }

    // Check if visitor exists
    const [existing] = await pool.query('SELECT * FROM visitors WHERE visitor_id = ?', [visitorId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Visitor with ID ${visitorId} not found`
      });
    }

    const visitor = existing[0];

    // Check for foreign key references in visits table
    const [visitRecords] = await pool.query(
      'SELECT COUNT(*) as visitCount FROM visits WHERE visitor_id = ?',
      [visitorId]
    );

    const visitCount = visitRecords[0].visitCount;
    if (visitCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete visitor "${visitor.name}" because there are ${visitCount} associated visit records in history. Gated community security protocol requires preserving historical visit logs.`,
        visitCount
      });
    }

    // Safe to delete
    await pool.query('DELETE FROM visitors WHERE visitor_id = ?', [visitorId]);

    res.json({
      success: true,
      message: `Visitor "${visitor.name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting visitor:', error);

    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        success: false,
        message: 'Database integrity restriction: This visitor has linked visit logs and cannot be removed.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Database error while attempting to delete visitor',
      error: error.message
    });
  }
});

module.exports = router;
