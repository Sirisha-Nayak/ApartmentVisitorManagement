const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'apartment_visitor_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true // Returns DATETIME as formatted strings instead of JS Date objects
});

// Test connection and print diagnostic information
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT DATABASE() as db, VERSION() as version');
    connection.release();
    return {
      connected: true,
      database: rows[0].db,
      version: rows[0].version,
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      code: error.code,
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'apartment_visitor_db'
    };
  }
}

module.exports = {
  pool,
  testConnection
};
