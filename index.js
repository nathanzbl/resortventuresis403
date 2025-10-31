// index.js - The main entry point for the Resort Property Ventures web server

// TEAM NOTE: We should make our code comment heavy especially for our first project
// so we are all on the same page!

// 1. Import the necessary modules
const express = require('express');
const path = require('path');

// 2. Initialize the Express application
const app = express();
const PORT = 3000; // Define the port the server will listen on

// --- Configuration & Middleware ---

// 3. Middleware to parse URL-encoded bodies (essential for reading form data from POST requests)
app.use(express.urlencoded({ extended: true }));

// 4. Set the view engine to EJS and specify the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 5. Middleware for serving static files (CSS, JS, images)
// Assuming you might have a 'public' folder for static assets later
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// 6. Landing Page (Root '/')
app.get('/', (req, res) => {
    // Renders the team's landing.ejs file (assuming it's named 'landing.ejs' in the views folder)
    res.send(`
        <body style="font-family: 'Inter', sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #0d47a1;">Welcome to the Landing Page!</h1>
            <p>You have successfully logged in.</p>
            <p><a href="/login" style="color: #1e88e5;">Go to Login Page</a></p>
        </body>
    `);
});

// 7. Login Page (GET request to show the form)
app.get('/login', (req, res) => {
    // Renders the login.ejs file
    res.render('login', { pageTitle: 'RPV Login' });
});

// 8. Login Submission (POST request to process the form)
app.post('/login', (req, res) => {
    // Extract credentials from the request body
    const { username, password } = req.body;
    console.log(`Login attempt for user: ${username}`);

    // !!! DUMMY AUTHENTICATION LOGIC FOR TESTING !!!
    // The required credentials are: username="pass", password="word"
    if (username === 'pass' && password === 'word') {
        // Success: Send a 200 OK status, and tell the client to redirect to the Landing Page (/).
        return res.status(200).json({ success: true, message: 'Login successful!', redirectTo: '/' });
    } else {
        // Failure: Send a 401 Unauthorized status and a friendly message.
        return res.status(401).json({ success: false, message: 'Invalid username or password. Test credentials are "pass" and "word".' });
    }
});

// 9. Dashboard Route (Placeholder)
app.get('/dashboard', (req, res) => {
    res.send('Dashboard Placeholder');
});

// --- Server Start ---

// 10. Start the server
app.listen(PORT, () => {
    console.log(`\nServer is running at http://localhost:${PORT}`);
    console.log('Test credentials are now: username="pass", password="word"');
    console.log('Press Ctrl+C to stop the server.');
});
