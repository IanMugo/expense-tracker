require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs
const path = require('path'); // Ensure path module is required

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Secret key for JWT

// Mock user data
const users = [
    {
        id: 1,
        username: 'user1',
        password: '$2a$10$L.fk0E9DrcEUVR0kxdIWzO1xKP4uIayFkG.JR.joaIIP3Xc/kDFk2' // 'password1' hashed
    },
    {
        id: 2,
        username: 'user2',
        password: '$2a$10$9d7/6kJS6QdE2DdHJMbFheVFVOTdPfz3Z7HOcF6ACZqX2aC0uPBlG' // 'password2' hashed
    }
];

// Mock expense data
let expenses = [];

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
    const user = users.find(user => user.username === username);
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

    expenses.push(newExpense);
    res.status(201).json(newExpense);
});

// Retrieve all expenses for a user
app.get('/api/expenses', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const userExpenses = expenses.filter(expense => expense.userId === userId);
    res.status(200).json(userExpenses);
});

// Update an existing expense
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { userId, description, amount, date } = req.body;

    // Ensure userId from token matches the userId in request body
    if (parseInt(userId) !== req.user.userId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const expenseIndex = expenses.findIndex(expense => expense.id === id);
    if (expenseIndex === -1) {
        return res.status(404).json({ message: 'Expense not found' });
    }

    if (description) expenses[expenseIndex].description = description;
    if (amount) expenses[expenseIndex].amount = amount;
    if (date) expenses[expenseIndex].date = date;

    res.status(200).json(expenses[expenseIndex]);
});

// Delete an existing expense
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    // Ensure userId from token matches the userId in request body
    if (parseInt(userId) !== req.user.userId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const expenseIndex = expenses.findIndex(expense => expense.id === id);
    if (expenseIndex === -1) {
        return res.status(404).json({ message: 'Expense not found' });
    }

    expenses.splice(expenseIndex, 1);
    res.status(204).send();
});

// Calculate total expense for a user
app.get('/api/expense', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const userExpenses = expenses.filter(expense => expense.userId === userId);
    const totalExpense = userExpenses.reduce((total, expense) => total + parseFloat(expense.amount), 0);

    res.status(200).json({ totalExpense });
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


