const express = require('express');
const cors = require('cors');
const db = require('./db'); // our pool-based connection
const app = express();

app.use(cors());
app.use(express.json());

///////////////////////////////////////////////////////////////////////////////////////
// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = users[0];

    // Plaintext password check (NOT secure, ideally use bcrypt)
    if (password !== user.password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({ message: 'Login successful', userId: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////
// SIGNUP
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please provide username, email, and password' });
  }

  try {
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password]
    );

    res.json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//////////////////////////////////////////////////////////////////////////////////////
// TRAIN SEARCH
app.post('/search-trains', async (req, res) => {
  const { source, destination, trainClass } = req.body;

  if (!source || !destination || !trainClass) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM trains WHERE source = ? AND destination = ? AND class = ?',
      [source, destination, trainClass]
    );

    res.json({ trains: rows });
  } catch (error) {
    console.error('Error searching trains:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//////////////////////////////////////////////////////////////////////////////////////
// BOOK TRAIN
app.post('/book-train', async (req, res) => {
  const { userid, trainid, seatclass, duedate } = req.body;

  if (!userid || !trainid || !seatclass || !duedate) {
    return res.status(400).json({ message: 'userid, trainid, seatclass, and duedate are required' });
  }

  try {
    const bookingDate = new Date();
    const status = 'Confirmed';

    const [result] = await db.query(
      'INSERT INTO booking (userid, trainid, booking_date, seatclass, duedate, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userid, trainid, bookingDate, seatclass, duedate, status]
    );

    res.json({ message: 'Booking successful', bookingId: result.insertId });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//////////////////////////////////////////////////////////////////////////////////////
// VIEW BOOKINGS
app.get('/api/bookings', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        booking.bookingid, 
        users.username AS user_name,
        trains.name AS train_name,
        trains.source,
        trains.destination,
        trains.arrival,
        booking.booking_date,
        booking.status,
        booking.duedate
      FROM booking
      JOIN users ON booking.userid = users.id
      JOIN trains ON booking.trainid = trains.id
    `);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Error fetching bookings", error: error.message });
  }
});

//////////////////////////////////////////////////////////////////////////////////////
// DELETE BOOKING
app.delete('/api/bookings/:id', async (req, res) => {
  const bookingId = req.params.id;

  try {
    const [result] = await db.query('DELETE FROM booking WHERE bookingid = ?', [bookingId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting booking" });
  }
});

//////////////////////////////////////////////////////////////////////////////////////
// UPDATE DUE DATE
app.put('/bookings/:id/due-date', async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const { due_date } = req.body;

  if (!due_date) {
    return res.status(400).json({ message: 'Please provide a due_date' });
  }
  if (isNaN(bookingId)) {
    return res.status(400).json({ message: 'Invalid booking ID' });
  }

  try {
    const [result] = await db.query(
      'UPDATE booking SET duedate = ? WHERE bookingid = ?',
      [due_date, bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Due date updated successfully' });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//////////////////////////////////////////////////////////////////////////////////////
// TEST ROUTE
app.get('/test', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Server is working!' });
});

//////////////////////////////////////////////////////////////////////////////////////
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
