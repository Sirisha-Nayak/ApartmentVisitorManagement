const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/residents - Retrieve all residents with optional search and sort
router.get('/', async (req, res) => {
  try {
    const { search, sort = 'name', order = 'ASC' } = req.query;

    const allowedSortFields = ['resident_id', 'name', 'flat_no', 'phone', 'email'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let sql = `
      SELECT 
        r.resident_id,
        r.name,
        r.flat_no,
        r.phone,
        r.email,
        COUNT(v.visit_id) AS total_visits
      FROM residents r
      LEFT JOIN visits v ON r.resident_id = v.resident_id
    `;
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ` WHERE (r.name LIKE ? OR r.flat_no LIKE ? OR r.phone LIKE ? OR r.email LIKE ?)`;
      params.push(term, term, term, term);
    }

    sql += ` GROUP BY r.resident_id, r.name, r.flat_no, r.phone, r.email`;
    sql += ` ORDER BY r.${sortField} ${sortOrder}`;

    const [rows] = await pool.query(sql, params);
    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve residents from the database',
      error: error.message
    });
  }
});

// GET /api/residents/:id - Retrieve single resident by ID
router.get('/:id', async (req, res) => {
  try {
    const residentId = parseInt(req.params.id, 10);
    if (isNaN(residentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resident ID supplied'
      });
    }

    const [rows] = await pool.query(
      `SELECT r.*, COUNT(v.visit_id) AS total_visits 
       FROM residents r 
       LEFT JOIN visits v ON r.resident_id = v.resident_id 
       WHERE r.resident_id = ?
       GROUP BY r.resident_id`,
      [residentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resident with ID ${residentId} not found`
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching resident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resident details',
      error: error.message
    });
  }
});

// POST /api/residents - Create a new resident
router.post('/', async (req, res) => {
  try {
    const { name, flat_no, phone, email } = req.body;

    // Validation
    const errors = [];
    if (!name || name.trim() === '') {
      errors.push('Resident name is required');
    }
    if (!flat_no || flat_no.trim() === '') {
      errors.push('Flat number is required');
    }

    if (name && name.length > 100) {
      errors.push('Resident name must be 100 characters or fewer');
    }
    if (flat_no && flat_no.length > 20) {
      errors.push('Flat number must be 20 characters or fewer');
    }
    if (phone && phone.length > 15) {
      errors.push('Phone number must be 15 characters or fewer');
    }
    if (email && email.length > 100) {
      errors.push('Email address must be 100 characters or fewer');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const cleanName = name.trim();
    const cleanFlat = flat_no.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanEmail = email ? email.trim() : null;

    const [result] = await pool.query(
      'INSERT INTO residents (name, flat_no, phone, email) VALUES (?, ?, ?, ?)',
      [cleanName, cleanFlat, cleanPhone, cleanEmail]
    );

    const newId = result.insertId;
    const [createdRows] = await pool.query('SELECT * FROM residents WHERE resident_id = ?', [newId]);

    res.status(201).json({
      success: true,
      message: `Resident "${cleanName}" added successfully to Flat ${cleanFlat}`,
      data: createdRows[0]
    });
  } catch (error) {
    console.error('Error creating resident:', error);
    res.status(500).json({
      success: false,
      message: 'Database error while creating resident record',
      error: error.message
    });
  }
});

// PUT /api/residents/:id - Update an existing resident
router.put('/:id', async (req, res) => {
  try {
    const residentId = parseInt(req.params.id, 10);
    if (isNaN(residentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resident ID supplied'
      });
    }

    // Check if resident exists
    const [existing] = await pool.query('SELECT * FROM residents WHERE resident_id = ?', [residentId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resident with ID ${residentId} not found`
      });
    }

    const { name, flat_no, phone, email } = req.body;

    const errors = [];
    if (!name || name.trim() === '') {
      errors.push('Resident name is required');
    }
    if (!flat_no || flat_no.trim() === '') {
      errors.push('Flat number is required');
    }
    if (name && name.length > 100) {
      errors.push('Resident name must be 100 characters or fewer');
    }
    if (flat_no && flat_no.length > 20) {
      errors.push('Flat number must be 20 characters or fewer');
    }
    if (phone && phone.length > 15) {
      errors.push('Phone number must be 15 characters or fewer');
    }
    if (email && email.length > 100) {
      errors.push('Email address must be 100 characters or fewer');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const cleanName = name.trim();
    const cleanFlat = flat_no.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanEmail = email ? email.trim() : null;

    await pool.query(
      'UPDATE residents SET name = ?, flat_no = ?, phone = ?, email = ? WHERE resident_id = ?',
      [cleanName, cleanFlat, cleanPhone, cleanEmail, residentId]
    );

    const [updatedRows] = await pool.query('SELECT * FROM residents WHERE resident_id = ?', [residentId]);

    res.json({
      success: true,
      message: `Resident "${cleanName}" updated successfully`,
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Error updating resident:', error);
    res.status(500).json({
      success: false,
      message: 'Database error while updating resident record',
      error: error.message
    });
  }
});

// DELETE /api/residents/:id - Delete a resident with foreign-key constraint protection
router.delete('/:id', async (req, res) => {
  try {
    const residentId = parseInt(req.params.id, 10);
    if (isNaN(residentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resident ID supplied'
      });
    }

    // Check if resident exists
    const [existing] = await pool.query('SELECT * FROM residents WHERE resident_id = ?', [residentId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resident with ID ${residentId} not found`
      });
    }

    const resident = existing[0];

    // Check for foreign key references in visits table
    const [visitRecords] = await pool.query(
      'SELECT COUNT(*) as visitCount FROM visits WHERE resident_id = ?',
      [residentId]
    );

    const visitCount = visitRecords[0].visitCount;
    if (visitCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete resident "${resident.name}" (Flat ${resident.flat_no}) because there are ${visitCount} associated visit records in the database. Historical security visit records cannot be deleted silently.`,
        visitCount
      });
    }

    // Safe to delete
    await pool.query('DELETE FROM residents WHERE resident_id = ?', [residentId]);

    res.json({
      success: true,
      message: `Resident "${resident.name}" (Flat ${resident.flat_no}) has been deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting resident:', error);

    // Foreign key constraint catch fallback
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        success: false,
        message: 'Database integrity restriction: This resident is referenced by visit records and cannot be deleted.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Database error while attempting to delete resident',
      error: error.message
    });
  }
});

module.exports = router;
