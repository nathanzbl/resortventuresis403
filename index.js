// index.js - The main entry point for the Resort Property Ventures web server

// TEAM NOTE: We should make our code comment heavy especially for our first project
// so we are all on the same page!

// 1. Import the necessary modules
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { Pool } = require('pg');

// 2. Initialize the Express application
const app = express();
const PORT = 3000;

// --- Database Configuration ---
// index.js MUST be updated to connect to the AWS RDS endpoint
const pool = new Pool({
    user: 'postgres',           
    host: 'database-1.cuxceiacqgo6.us-east-1.rds.amazonaws.com', 
    database: 'postgres', 
    password: 'adminpassword12345',
    port: 5432,
    ssl: {
        rejectUnauthorized: false  // AWS RDS requires SSL
    }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('✅ Database connected successfully!');
    }
});

// --- Configuration & Middleware ---

// Session middleware (for keeping users logged in)
app.use(session({
    secret: 'rpv-super-secret-key-change-this-in-production', // Change this!
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware to parse URL-encoded bodies and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Middleware to check if user is authenticated ---
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// --- Routes ---

// Landing Page (Root '/')
app.get('/', (req, res) => {
    res.render('landing', { user: req.session.user || null });
});

// Login Page (GET)
app.get('/login', (req, res) => {
    res.render('login', { pageTitle: 'RPV Login' });
});

// Login Submission (POST)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for user: ${username}`);

    try {
        // Query the database for the user
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password.' 
            });
        }

        const user = result.rows[0];

        // Compare the provided password with the hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password.' 
            });
        }

        // Success! Store user info in session
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        return res.status(200).json({ 
            success: true, 
            message: 'Login successful!', 
            redirectTo: '/' 
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'An error occurred during login.' 
        });
    }
});

// --- REGISTRATION ROUTES ---

// Owner Registration Page (GET)
app.get('/register/owner', (req, res) => {
    res.render('owner-registration', { pageTitle: 'Owner Registration' });
});

// Owner Registration Submission (POST)
app.post('/register/owner', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    try {
        // Validation
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required.' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Passwords do not match.' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long.' 
            });
        }

        // Check if username already exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists.' 
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new owner into database
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [username, hashedPassword, 'owner']
        );

        console.log(`✅ New owner registered: ${username}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Owner registration successful!', 
            redirectTo: '/login' 
        });

    } catch (error) {
        console.error('Owner registration error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'An error occurred during registration.' 
        });
    }
});

// Manager Registration Page (GET)
app.get('/register/manager', (req, res) => {
    res.render('manager-registration', { pageTitle: 'Manager Registration' });
});

// Manager Registration Submission (POST)
app.post('/register/manager', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    try {
        // Validation
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required.' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Passwords do not match.' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long.' 
            });
        }

        // Check if username already exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists.' 
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new manager into database
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [username, hashedPassword, 'manager']
        );

        console.log(`✅ New manager registered: ${username}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Manager registration successful!', 
            redirectTo: '/login' 
        });

    } catch (error) {
        console.error('Manager registration error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'An error occurred during registration.' 
        });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

// --- Protected Routes Example ---
// These routes require authentication

app.get('/hawaii', isAuthenticated, (req, res) => {
    res.render('hawaii', { user: req.session.user });
});

app.get('/mexico', isAuthenticated, (req, res) => {
    res.render('mexico', { user: req.session.user });
});

app.get('/mammoth', isAuthenticated, (req, res) => {
    res.render('mammoth', { user: req.session.user });
});

app.get('/tahoe', isAuthenticated, (req, res) => {
    res.render('tahoe', { user: req.session.user });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
    console.log('📝 Registration is now available!');
    console.log('   - Owner Registration: http://localhost:3000/register/owner');
    console.log('   - Manager Registration: http://localhost:3000/register/manager');
    console.log('\nPress Ctrl+C to stop the server.');
});