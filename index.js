// index.js - The main entry point for the Resort Property Ventures web server

// 1. Import the necessary modules
const express = require('express');
const path = require('path');

// 2. Initialize the Express application
const app = express();
const PORT = 3000; // Define the port the server will listen on

// --- Configuration ---

// 3. Set the view engine to EJS
// This tells Express to use EJS for rendering dynamic content.
app.set('view engine', 'ejs');

// 4. Specify the directory where your EJS template files (like login.ejs) are located
// We assume your structure is: project-root/views/
app.set('views', path.join(__dirname, 'views'));

// 5. Middleware for static files (CSS, JS, images, if you decide to separate them later)
// This serves files from a 'public' folder (you'd need to create this folder).
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// 6. Define the route for the landing page (Root '/')
// This is the starting point. It assumes you have a 'landing.ejs' file.
app.get('/', (req, res) => {
    // You would render your team's landing page here.
    // Example: res.render('landing', { pageTitle: 'Welcome to RPV' });
    res.send('<h1>Welcome to the RPV Landing Page!</h1><p>The landing.ejs view needs to be rendered here.</p><p><a href="/login">Go to Login</a></p>');
});

// 7. Define the route for the Login Page
// When a user navigates to /login, Express will look for views/login.ejs (or views/login.html)
app.get('/login', (req, res) => {
    // Renders the login.ejs file (which contains the HTML structure we created).
    res.render('login', { pageTitle: 'RPV Login' });
});

// 8. Define a basic POST route for handling the login form submission
// You will implement the actual login logic here later.
app.post('/login', (req, res) => {
    // In a real scenario, you'd process req.body for username/password,
    // authenticate the user, and redirect them.
    console.log('Login attempt received!');
    // For now, just send a simple response.
    res.status(200).send('Login processing... Authentication logic goes here!');
});

// --- Server Start ---

// 9. Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`\nServer is running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server.');
});