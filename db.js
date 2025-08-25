const mysql = require('mysql2');
const fs = require('fs');

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '22AdG2yLcEtpGXX.root',
  password: 'm0tKUJDhkqIpDPnJ',
  database: 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    ca: fs.readFileSync('isrgrootx1.pem')
  }
}).promise();

// Function to initialize tables if they do not exist
async function initDb() {
  try {
    // USERS TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // TRAINS TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        class VARCHAR(50) NOT NULL,
        arrival TIME,
        departure TIME
      )
    `);

    // BOOKING TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booking (
        bookingid INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NOT NULL,
        trainid INT NOT NULL,
        booking_date DATETIME NOT NULL,
        seatclass VARCHAR(50) NOT NULL,
        duedate DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'Confirmed',
        FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (trainid) REFERENCES trains(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tables checked/created successfully');

  } catch (err) {
    console.error('❌ Table creation failed:', err);
  }
}

// Connect and initialize DB
async function connectDb() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database with SSL');
    connection.release();

    await initDb();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
}

connectDb();

module.exports = pool;
