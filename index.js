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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
