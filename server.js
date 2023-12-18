const express = require("express");
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// MySQL Connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sahil@1234',
    database: 'database1'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
        createTable(); // Create table if not exists
    }
});

// Create table if not exists
function createTable() {
    const createTableQuery = 'CREATE TABLE IF NOT EXISTS mytable (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL, section INT DEFAULT 0, admin VARCHAR(255) NOT NULL)';
    connection.query(createTableQuery, (err, result) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Table created or already exists');
        }
    });
}

app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (like index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Serve login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Authenticate user
app.post('/authenticate', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // Check if the credentials are valid
    if ((username === 'admin1' || username === 'admin2') && password === 'password') {
        // Redirect to index.html with a query parameter
        res.redirect(`/index.html?user=${username}`);
    } else {
        // Invalid credentials, redirect back to login
        res.redirect('/login');
    }
});

// Redirect index.html to login if not authenticated
app.get('/index.html', (req, res) => {
    const username = req.query.user;
    if (!username) {
        res.redirect('/login');
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});


// Store data
app.post('/storeData', (req, res) => {
    const productName = req.body.productName;
    const admin = req.body.admin;

    // Check if the product name already exists
    const checkDuplicateQuery = 'SELECT section, admin FROM mytable WHERE name = ?';
    connection.query(checkDuplicateQuery, [productName], (err, result) => {
        if (err) {
            console.error('Error checking duplicate data:', err);
            res.status(500).send('Internal Server Error');
        } else {
            let sectionValue;

            if (result.length > 0) {
                // Product name already exists
                const existingAdmin = result[0].admin;

                if (existingAdmin === admin) {
                    // Admin already exists for this product, do not increment the section value
                    sectionValue = parseInt(result[0].section, 10);
                } else {
                    // Admin is different, increment the section value by 1
                    if (result[0].section==10) {
                        result[0].section = 1;
                        
                    }
                    sectionValue = parseInt(result[0].section, 10) + 1;

                    // Update the existing entry with the new admin and incremented section value
                    const updateQuery = 'UPDATE mytable SET admin = ?, section = ? WHERE name = ?';
                    connection.query(updateQuery, [admin, sectionValue, productName], (err, result) => {
                        if (err) {
                            console.error('Error updating admin and section:', err);
                            res.status(500).send('Internal Server Error');
                        } else {
                            console.log('Admin and section updated in the database');
                            res.send(`<script>alert('Data stored successfully!'); window.location='/';</script>`);
                        }
                    });
                }
            } else {
                // Product name is unique, set section value to 1 and store admin
                sectionValue = 1;

                // Insert the new data with the calculated section value and admin
                const insertQuery = 'INSERT INTO mytable (name, admin, section) VALUES (?, ?, ?)';
                connection.query(insertQuery, [productName, admin, sectionValue], (err, result) => {
                    if (err) {
                        console.error('Error storing data in the database:', err);
                        res.status(500).send('Internal Server Error');
                    } else {
                        console.log('Data stored in the database');
                        res.send(`<script>alert('Data stored successfully!'); window.location='/';</script>`);
                    }
                });
            }
        }
    });
});



// Retrieve data
app.post('/retrieveData', (req, res) => {
    const productNameForRetrieval = req.body.productNameForRetrieval;

    const retrieveQuery = 'SELECT section FROM mytable WHERE name = ?';
    connection.query(retrieveQuery, [productNameForRetrieval], (err, result) => {
        if (err) {
            console.error('Error retrieving data from the database:', err);
            res.status(500).send('Internal Server Error');
        } else {
            if (result.length > 0) {
                const sectionValue = result[0].section;
                console.log('Retrieved section value:', sectionValue);
                res.send(`<script>alert('Section for ${productNameForRetrieval}: ${sectionValue}'); window.location='/';</script>`);
            } else {
                console.log('Product not found in the database');
                res.send(`<script>alert("Product not found in the database"); window.location='/';</script>`);
            }
        }
    });
});

// Add this route to check data age
app.get('/dataAge', (req, res) => {
    const checkDataAgeQuery = 'SELECT name, admin, date_created FROM mytable';
    connection.query(checkDataAgeQuery, (err, result) => {
        if (err) {
            console.error('Error checking data age:', err);
            res.status(500).send('Internal Server Error');
        } else {
            const currentDate = new Date();
            const alertThreshold = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds

            // Check data age and generate alerts
            const alerts = result
                .filter(record => {
                    const dataAge = currentDate - new Date(record.date_created);
                    return dataAge > alertThreshold;
                })
                .map(record => `Data for ${record.name} created by ${record.admin} is older than 15 days.`);

            if (alerts.length > 0) {
                res.send(`<script>alert('${alerts.join('\n')}'); window.location='/';</script>`);
            } else {
                res.send(`<script>alert('No data older than 15 days.'); window.location='/';</script>`);
            }
        }
    });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/login`);
});
