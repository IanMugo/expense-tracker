require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const mysql = require('mysql2'); // Add MySQL package
const { hashPassword } = require('./hash'); // Import hash function

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Create MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'yourdatabase'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as id', db.threadId);
});

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  // Find user by username
  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    const user = results[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
  });
});

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Save user to database
  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    res.status(201).json({ message: 'User registered successfully' });
  });
});

// Authorization middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};

// Input validation middleware
const { body, validationResult } = require('express-validator');

// Example validation middleware
const validateExpenseInput = [
  body('userId').isInt(),
  body('description').trim().notEmpty(),
  body('amount').isFloat(),
  body('date').isISO8601().toDate(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Apply the middleware where needed
app.post('/api/expenses', validateExpenseInput, authenticateToken, (req, res) => {
  const { userId, description, amount, date } = req.body;

  if (!userId || !description || !amount || !date) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Ensure userId from token matches the userId in request body
  if (parseInt(userId) !== req.user.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const newExpense = {
    id: uuidv4(),
    userId: parseInt(userId),
    description,
    amount,
    date
  };

  db.query('INSERT INTO expenses SET ?', newExpense, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    res.status(201).json(newExpense);
  });
});

// Retrieve all expenses for a user
app.get('/api/expenses', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.query('SELECT * FROM expenses WHERE userId = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    res.status(200).json(results);
  });
});

// Update an existing expense
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId, description, amount, date } = req.body;

  // Ensure userId from token matches the userId in request body
  if (parseInt(userId) !== req.user.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updateData = { description, amount, date };

  db.query('UPDATE expenses SET ? WHERE id = ? AND userId = ?', [updateData, id, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({ message: 'Expense updated successfully' });
  });
});

// Delete an existing expense
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  // Ensure userId from token matches the userId in request body
  if (parseInt(userId) !== req.user.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  db.query('DELETE FROM expenses WHERE id = ? AND userId = ?', [id, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(204).send();
  });
});

// Calculate total expense for a user
app.get('/api/expense', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.query('SELECT SUM(amount) as totalExpense FROM expenses WHERE userId = ?', [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    res.status(200).json(result[0]);
  });
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
