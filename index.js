// index.js - The main entry point for the Resort Property Ventures web server

// TEAM NOTE: We should make our code comment heavy especially for our first project
// so we are all on the same page!

// 1. Import the necessary modules
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { Pool } = require('pg');
const dotenv = require('dotenv');


// Load environment variables from .env file
dotenv.config();
// 2. Initialize the Express application
const app = express();
const PORT = process.env.NODE_PORT || 3000;

// --- Database Configuration ---
// index.js MUST be updated to connect to the AWS RDS endpoint
const pool = new Pool({
    user: process.env.DB_USER,           
    host: process.env.DB_HOST, 
    database: process.env.DB_DATABASE, 
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
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

// --- Middleware to check if user is a manager ---
function isManager(req, res, next) {
    if (req.session.user && req.session.user.role === 'manager') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Manager privileges required.'
    });
}

// --- Middleware to check if user is an owner (read-only access) ---
function isOwner(req, res, next) {
    if (req.session.user && req.session.user.role === 'owner') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Owner privileges required.'
    });
}

// --- Routes ---

// Landing Page (Root '/')
app.get('/', (req, res) => {
    res.render('landing', { user: req.session.user || null });
});

// Login Page (GET)
app.get('/login', (req, res) => {
    res.render('login', { pageTitle: 'RPV Login', user: req.session.user || null });
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
    res.render('owner-registration', { pageTitle: 'Owner Registration', user: req.session.user || null });
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
    res.render('manager-registration', { pageTitle: 'Manager Registration', user: req.session.user || null });
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



app.get('/directory', isAuthenticated, async (req, res) => {
    try {
        const searchQuery = req.query.search; // Get the search term from the URL query
        let sqlQuery = `
            SELECT
                owner_id,
                primaryownerfirstname  AS "PrimaryOwnerFirstName",
                primaryownerlastname   AS "PrimaryOwnerLastName",
                secondaryownerfirstname AS "SecondaryOwnerFirstName",
                secondaryownerlastname  AS "SecondaryOwnerLastName",
                contact_info,
                email,
                notes
            FROM owners1
        `;
        const queryParams = [];

        if (searchQuery) {
            const searchTerm = '%' + searchQuery.toLowerCase() + '%';

            sqlQuery += `
                WHERE 
                    primaryownerfirstname ILIKE $1 OR
                    primaryownerlastname ILIKE $1 OR
                    secondaryownerfirstname ILIKE $1 OR
                    secondaryownerlastname ILIKE $1
            `;
            queryParams.push(searchTerm);
        }

        sqlQuery += ` ORDER BY owner_id`;

        const result = await pool.query(sqlQuery, queryParams);

        res.render('directory', {
            owners: result.rows,
            searchQuery: searchQuery || '', 
            user: req.session.user || null
        });
    } catch (err) {
        console.error('Error fetching owners:', err);
        res.status(500).send('Error fetching owners');
    }
});

// Add new owner - managers only
app.post('/directory/add', isAuthenticated, isManager, async (req, res) => {
    const {
        primaryFirstName,
        primaryLastName,
        secondaryFirstName,
        secondaryLastName,
        contactInfo,
        email,
        notes
    } = req.body;

    try {
        await pool.query(
            `INSERT INTO owners1
            (primaryownerfirstname, primaryownerlastname, secondaryownerfirstname,
             secondaryownerlastname, contact_info, email, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [primaryFirstName, primaryLastName, secondaryFirstName,
             secondaryLastName, contactInfo, email, notes]
        );

        console.log(`✅ New owner added by manager: ${req.session.user.username}`);
        return res.status(200).json({
            success: true,
            message: 'Owner added successfully!'
        });
    } catch (err) {
        console.error('Error adding owner:', err);
        return res.status(500).json({
            success: false,
            message: 'Error adding owner'
        });
    }
});

// Edit owner - managers only
app.post('/directory/edit/:id', isAuthenticated, isManager, async (req, res) => {
    const ownerId = req.params.id;
    const {
        primaryFirstName,
        primaryLastName,
        secondaryFirstName,
        secondaryLastName,
        contactInfo,
        email,
        notes
    } = req.body;

    try {
        await pool.query(
            `UPDATE owners1
            SET primaryownerfirstname = $1, primaryownerlastname = $2,
                secondaryownerfirstname = $3, secondaryownerlastname = $4,
                contact_info = $5, email = $6, notes = $7
            WHERE owner_id = $8`,
            [primaryFirstName, primaryLastName, secondaryFirstName,
             secondaryLastName, contactInfo, email, notes, ownerId]
        );

        console.log(`✅ Owner ${ownerId} updated by manager: ${req.session.user.username}`);
        return res.status(200).json({
            success: true,
            message: 'Owner updated successfully!'
        });
    } catch (err) {
        console.error('Error updating owner:', err);
        return res.status(500).json({
            success: false,
            message: 'Error updating owner'
        });
    }
});

// Delete owner - managers only
app.post('/directory/delete/:id', isAuthenticated, isManager, async (req, res) => {
    const ownerId = req.params.id;

    try {
        await pool.query('DELETE FROM owners1 WHERE owner_id = $1', [ownerId]);

        console.log(`✅ Owner ${ownerId} deleted by manager: ${req.session.user.username}`);
        return res.status(200).json({
            success: true,
            message: 'Owner deleted successfully!'
        });
    } catch (err) {
        console.error('Error deleting owner:', err);
        return res.status(500).json({
            success: false,
            message: 'Error deleting owner'
        });
    }
});

app.get('/code', isAuthenticated, async (req, res) => {
    res.render('mammothCode', { user: req.session.user });
});

// Property schedules page
app.get('/schedules', isAuthenticated, async (req, res) => {
    const selectedProperty = req.query.property_name || '';

    try {
        // Get list of properties for the dropdown
        const propertiesResult = await pool.query(
            'SELECT property_id, property_name FROM properties ORDER BY property_name'
        );
        const properties = propertiesResult.rows;

        // Get list of owners for add/edit forms
        const ownersResult = await pool.query(
            `SELECT owner_id,
                    CONCAT(
                        COALESCE(primaryownerfirstname, ''), ' ',
                        COALESCE(primaryownerlastname, '')
                    ) AS owner_name
            FROM owners1
            ORDER BY owner_id`
        );
        const owners = ownersResult.rows;

        let schedules = [];

        // If a property was selected, load its schedule
        if (selectedProperty) {
            const scheduleResult = await pool.query(
                `SELECT s.schedule_id, s.start_date, s.end_date, s.ownerid, s.property_id,
                 CASE
                    WHEN (o.secondaryownerfirstname IS NOT NULL AND o.secondaryownerfirstname <> '')
                    OR (o.secondaryownerlastname  IS NOT NULL AND o.secondaryownerlastname  <> '')
                    THEN CONCAT(
                    COALESCE(o.primaryownerfirstname, ''), ' ',
                    COALESCE(o.primaryownerlastname,  ''), ' and ',
                    COALESCE(o.secondaryownerfirstname, ''), ' ',
                    COALESCE(o.secondaryownerlastname,  ''))
                ELSE CONCAT(
                    COALESCE(o.primaryownerfirstname, ''), ' ',
                    COALESCE(o.primaryownerlastname,  ''))
                END AS owner_name,
                s.status
                FROM schedule s
                INNER JOIN properties p ON p.property_id = s.property_id
                INNER JOIN owners1 o     ON o.owner_id   = s.ownerid
                WHERE p.property_name = $1
                ORDER BY s.start_date`,
                [selectedProperty]
            );
            schedules = scheduleResult.rows;
        }

        res.render('schedules', {
            user: req.session.user || null,
            properties,
            owners,
            selectedProperty,
            schedules
        });
    } catch (err) {
        console.error('Error loading schedules:', err);
        res.status(500).send('Error loading schedules');
    }
});

// Add new schedule - managers only
app.post('/schedules/add', isAuthenticated, isManager, async (req, res) => {
    const { property_id, owner_id, start_date, end_date, status } = req.body;

    try {
        await pool.query(
            `INSERT INTO schedule (property_id, ownerid, start_date, end_date, status)
            VALUES ($1, $2, $3, $4, $5)`,
            [property_id, owner_id, start_date, end_date, status]
        );

        console.log(`✅ New schedule added by manager: ${req.session.user.username}`);
        return res.status(200).json({
            success: true,
            message: 'Schedule added successfully!'
        });
    } catch (err) {
        console.error('Error adding schedule:', err);
        return res.status(500).json({
            success: false,
            message: 'Error adding schedule'
        });
    }
});

// Edit schedule - managers only
app.post('/schedules/edit/:id', isAuthenticated, isManager, async (req, res) => {
    const scheduleId = req.params.id;
    const { property_id, owner_id, start_date, end_date, status } = req.body;

    try {
        await pool.query(
            `UPDATE schedule
            SET property_id = $1, ownerid = $2, start_date = $3,
                end_date = $4, status = $5
            WHERE schedule_id = $6`,
            [property_id, owner_id, start_date, end_date, status, scheduleId]
        );

        console.log(`✅ Schedule ${scheduleId} updated by manager: ${req.session.user.username}`);
        return res.status(200).json({
            success: true,
            message: 'Schedule updated successfully!'
        });
    } catch (err) {
        console.error('Error updating schedule:', err);
        return res.status(500).json({
            success: false,
            message: 'Error updating schedule'
        });
    }
});

// Delete schedule - managers only
app.post('/schedules/delete/:id', isAuthenticated, isManager, async (req, res) => {
    const scheduleId = req.params.id;

    try {
        await pool.query('DELETE FROM schedule WHERE schedule_id = $1', [scheduleId]);

        console.log(`✅ Schedule ${scheduleId} deleted by manager: ${req.session.user.username}`);
        return res.status(200).json({
            success: true,
            message: 'Schedule deleted successfully!'
        });
    } catch (err) {
        console.error('Error deleting schedule:', err);
        return res.status(500).json({
            success: false,
            message: 'Error deleting schedule'
        });
    }
});

// Exchange Form Page (GET)
app.get('/exchange', isAuthenticated, (req, res) => {
    res.render('exchange', { user: req.session.user });
});

// Exchange Form Submission (POST)
app.post('/exchange', isAuthenticated, async (req, res) => {
    const {
        requesterName,
        requesterEmail,
        currentProperty,
        desiredProperty,
        currentCheckin,
        currentCheckout,
        desiredCheckin,
        desiredCheckout,
        reason,
        notes
    } = req.body;

    try {
        // In a real application, you would save this to a database table
        console.log(`✅ Exchange request submitted by ${requesterName}`);
        console.log(`   From: ${currentProperty} (${currentCheckin} to ${currentCheckout})`);
        console.log(`   To: ${desiredProperty} (${desiredCheckin} to ${desiredCheckout})`);

        return res.status(200).json({
            success: true,
            message: 'Exchange request submitted successfully! Our team will review it and get back to you.'
        });
    } catch (err) {
        console.error('Error submitting exchange request:', err);
        return res.status(500).json({
            success: false,
            message: 'Error submitting exchange request'
        });
    }
});

// Change Your Info Page (GET)
app.get('/info', isAuthenticated, (req, res) => {
    res.render('info', { user: req.session.user });
});

// Change Your Info Submission (POST)
app.post('/info', isAuthenticated, async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        street,
        city,
        state,
        zip,
        currentPassword,
        newPassword
    } = req.body;

    try {
        // In a real application, you would update the user's information in the database
        // If changing password, verify current password and update
        console.log(`✅ Information updated for user: ${req.session.user.username}`);

        return res.status(200).json({
            success: true,
            message: 'Your information has been updated successfully!'
        });
    } catch (err) {
        console.error('Error updating user info:', err);
        return res.status(500).json({
            success: false,
            message: 'Error updating information'
        });
    }
});

// Feedback Page (GET)
app.get('/feedback', isAuthenticated, (req, res) => {
    res.render('feedback', { user: req.session.user });
});

// Feedback Submission (POST)
app.post('/feedback', isAuthenticated, async (req, res) => {
    const {
        name,
        email,
        property,
        rating,
        visitDate,
        feedbackTypes,
        comments,
        positives,
        improvements,
        followUp
    } = req.body;

    try {
        // In a real application, you would save this to a database table
        console.log(`✅ Feedback submitted by ${name}`);
        console.log(`   Property: ${property}, Rating: ${rating}`);
        console.log(`   Follow-up requested: ${followUp}`);

        return res.status(200).json({
            success: true,
            message: 'Thank you for your feedback! We appreciate you taking the time to share your experience.'
        });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        return res.status(500).json({
            success: false,
            message: 'Error submitting feedback'
        });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
    console.log('📝 Registration is now available!');
    console.log('   - Owner Registration: http://localhost:3000/register/owner');
    console.log('   - Manager Registration: http://localhost:3000/register/manager');
    console.log('\nPress Ctrl+C to stop the server.');
});