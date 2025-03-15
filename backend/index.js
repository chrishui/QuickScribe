import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import pkg from 'pg';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';

const { Pool } = pkg;

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet()); // Protects against common security vulnerabilities
app.use(xss()); // Prevents cross-site scripting attacks
app.use(hpp()); // Prevents HTTP Parameter Pollution
app.use(compression()); // Compresses responses to improve performance
app.use(morgan('combined')); // Logs HTTP requests for monitoring

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

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
    console.error("JWT Verification Failed:", err);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Get Notes (with optional search query)
app.get('/notes', authenticateUser, async (req, res) => {
  try {
    const searchQuery = req.query.query;
    let query = 'SELECT * FROM notes WHERE user_id = $1';
    let values = [req.user.email];

    if (searchQuery) {
      query += ' AND (title ILIKE $2 OR content ILIKE $2)';
      values.push(`%${searchQuery}%`);
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a Note
app.post('/notes', authenticateUser, async (req, res) => {
  try {
    const { title, content } = req.body;
    const result = await pool.query(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.email, title, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating note:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update a Note
app.put('/notes/:id', authenticateUser, async (req, res) => {
  try {
    const { title, content } = req.body;
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [title, content, id, req.user.email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating note:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a Note
app.delete('/notes/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
