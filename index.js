const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Database connected!', time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.get('/api/make-organiser/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await pool.query(
      "UPDATE users SET role = 'organiser' WHERE email = $1 RETURNING *",
      [email]
    );
    if (result.rows.length === 0) {
      return res.send('User not found with that email. Register first!');
    }
    res.send(`Success! User ${email} is now an organiser.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});

// Create Event Route (Organiser Only)
app.post('/api/events', async (req, res) => {
  try {
    const { userId, title, description, startTime, endTime, venue, category } = req.body;

    // 1. Verify if the user is an organiser
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    
    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'organiser') {
      return res.status(403).json({ error: 'Access denied. Only organisers can create events.' });
    }

    // 2. Insert event if authorised
    const newEvent = await pool.query(
      'INSERT INTO events (title, description, start_time, end_time, venue, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, startTime, endTime, venue, category]
    );

    res.status(201).json({ message: 'Event created successfully!', event: newEvent.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while creating event' });
  }
});

// Signup Route
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, department, year } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Insert new user with default 'student' role
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, department, year, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, department, year, role',
      [name.trim(), normalizedEmail, password, department.trim(), year, 'student']
    );

    res.status(201).json({ success: true, message: 'Account created successfully.', user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [normalizedEmail, password]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Incorrect email or password.' });
    }

    const user = result.rows[0];
    res.json({ success: true, message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email, department: user.department, year: user.year, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
