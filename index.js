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
app.get('/api/setup-roles', async (req, res) => {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student'");
    res.send('Role column added successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
