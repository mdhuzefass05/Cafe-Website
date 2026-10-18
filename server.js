const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve Customer Portal on root '/'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

// Friendly aliases
app.get(['/customer', '/customer.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get(['/login', '/staff'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static files (disabled default index so root '/' serves customer portal)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Session configuration
app.use(session({
    secret: 'cafe_management_secret_key_12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/library', require('./routes/library'));

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
