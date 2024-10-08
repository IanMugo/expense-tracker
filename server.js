require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const mysql2 = require('mysql2');
const { check, validationResult } = require('express-validator');
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Create MySQL connection
const db = mysql2.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'yourdatabase'
});

// Connect to MySQL and create tables if they don't exist
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as id', db.threadId);

  // Create tables if they do not exist
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
  `;

  const createExpensesTable = `
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(36) PRIMARY KEY NOT NULL, /* Add this line */
      expense_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      date DATE NOT NULL,
      category VARCHAR(255) NOT NULL,
      FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
    );
  `;

  db.query(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
      return;
    }
    console.log('Users table created or already exists');
  });

  db.query(createExpensesTable, (err) => {
    if (err) {
      console.error('Error creating expenses table:', err.message);
      return;
    }
    console.log('Expenses table created or already exists');
  });
});


// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User representation
const User = {
  tableName: 'users',
  createUser: function(newUser, callback) {
    db.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
  },
  getUserByEmail: function(email, callback) {
    db.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
  },
  getUserByUsername: function(username, callback) {
    db.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
  }
};

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  User.getUserByUsername(username, async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }

    const user = results[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.email }, JWT_SECRET, { expiresIn: '1h' }); // Updated to use user.email
    res.status(200).json({ message: 'Login successful', token });
  });
});

// Registration route
app.post('/api/auth/register', [
  check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check('email').custom(async (value) => {
    return new Promise((resolve, reject) => {
      User.getUserByEmail(value, (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return reject(new Error('Database error'));
        }
        if (results.length > 0) {
          return reject(new Error('Email already exists'));
        }
        resolve(true);
      });
    });
  }),
  check('username').custom(async (value) => {
    return new Promise((resolve, reject) => {
      User.getUserByUsername(value, (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return reject(new Error('Database error'));
        }
        if (results.length > 0) {
          return reject(new Error('Username already exists'));
        }
        resolve(true);
      });
    });
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    username,
    email,
    password: hashedPassword
  };

  db.query('INSERT INTO users SET ?', newUser, (err, result) => {
    if (err) {
      console.error('Database error:', err);
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
      console.error('Token verification error:', err);
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};

// Expense routes
app.post('/api/expenses', authenticateToken, (req, res) => {
  const { expense_name, amount, date, category } = req.body;

  if (!expense_name || !amount || !date || !category) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const newExpense = {
    id: uuidv4(), // Make sure the id is added here
    email: req.user.userId,
    expense_name,
    amount,
    date,
    category
  };

  db.query('INSERT INTO expenses SET ?', newExpense, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    res.status(201).json(newExpense);
  });
});

app.put('/api/expenses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { expense_name, amount, date, category } = req.body;

  const updateData = { expense_name, amount, date, category };

  db.query('UPDATE expenses SET ? WHERE id = ? AND email = ?', [updateData, id, req.user.userId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(200).json({ message: 'Expense updated successfully' });
  });
});

app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM expenses WHERE id = ? AND email = ?', [id, req.user.userId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(204).send();
  });
});

app.get('/api/expenses', authenticateToken, (req, res) => {
  db.query('SELECT * FROM expenses WHERE userId = ?', [req.user.userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    res.status(200).json(results);
  });
});

app.get('/api/expense', authenticateToken, (req, res) => {
  db.query('SELECT SUM(amount) AS totalExpense FROM expenses WHERE userId = ?', [req.user.userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    res.status(200).json({ totalExpense: results[0].totalExpense || 0 });
  });
});

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
