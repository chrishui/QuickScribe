import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import pkg from 'pg';

const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: 'id',
});

// Middleware to authenticate users
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = await verifier.verify(token);
    req.user = payload;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Sample Route - Get Notes
app.get('/notes', authenticateUser, async (req, res) => {
  try {
    console.log("Fetching notes for user email:", req.user.email);

    const result = await pool.query('SELECT * FROM notes WHERE user_id = $1', [req.user.email]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Sample Route - Create a Note
app.post('/notes', authenticateUser, async (req, res) => {
  try {
    const { title, content } = req.body;
    console.log("Creating note for user email:", req.user.email);

    const result = await pool.query(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.email, title, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
