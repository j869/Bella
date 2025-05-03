
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const port = 3000;
const bodyParser = require('body-parser');


const fs = require('fs');
const path = require('path');
//twilio setup
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_ACCESS_TOKEN;
const client = twilio(accountSid, authToken);


// PostgreSQL setup
const pool = new Pool({
    user: process.env.PG_USER, // PostgreSQL username from .env
    host: process.env.PG_HOST, // PostgreSQL host from .env
    database: process.env.PG_DATABASE, // PostgreSQL database name from .env
    password: process.env.PG_PASSWORD, // PostgreSQL password from .env
    port: process.env.PG_PORT, // PostgreSQL port from .env
});

pool.connect()
    .then(() => console.log('ae9     Connected to PostgreSQL database'))
    .catch(err => console.error('ae8     Error connecting to PostgreSQL database:', err));
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', '/home/joma/Documents/contactPage/views');

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });


// Middleware to get the client's IP address
app.use((req, res, next) => {
    bodyParser.urlencoded({ extended: true })

    let ip = req.headers['x-forwarded-for'];
    if (ip) {
        // 'x-forwarded-for' header may contain multiple IPs, take the first one
        ip = ip.split(',')[0].trim();
    } else {
        ip = req.socket.remoteAddress;
    }
    req.clientIp = ip;
    // console.log('aa9     Client IP:', req.clientIp);
    next();
});


// app.use((req, res, next) => {
//     const originalSend = res.send;
//     res.send = function(...args) {
//         console.log('Sending response for:', req.url);
//         originalSend.apply(res, args);
//     };
//     next();
// });


// Route to get the user's location
app.get('/get-location', async (req, res) => {
    try {
        const response = await axios.get(`https://ipinfo.io/${req.clientIp}/json`);
        const locationData = response.data;
        res.json(locationData);
    } catch (error) {
        res.status(500).json({ error: 'Unable to get location data' });
    }
});

    

app.get('/', (req, res) => {
    console.log('ab1            ('+ req.clientIp + ')');
    pool.query('SELECT * FROM history', (err, result) => {
        if (err) {
            console.error('ab81     Error fetching records from history table:', err);
            // res.status(500).send('Error fetching records');
            res.render('main', { title: 'Send me an SMS' });
        } else {
            console.log('ab2     Records fetched from history table:', result.rows);
            res.render('main', { data: result.rows });
        }
    });
    
});


app.post('/send-email', upload.single('attachment'), async (req, res) => {
    console.log('em1            (' + req.clientIp + ')', req.body);
    // console.log('em2      Uploaded file:', req.file); // This should show your file info
    const { emailTo, subject, emailMessage } = req.body;

    // Handle the attachment if it exists
    let attachments = [];
    if (req.file) {
        attachments = [{
            filename: req.file.originalname || path.basename(req.file.path),
            path: req.file.path
        }];
    }
    // Insert email details into the history table
    const query = `
        INSERT INTO history (message, subject, time, ip, replyto)
        VALUES ($1, $2, $3, $4, $5)
    `;
    const values = [emailMessage, subject, new Date(), req.clientIp, emailTo];

    try {
        await pool.query(query, values);
        console.log('em3    Email details saved to history table');
    } catch (dbError) {
        console.error('em38    Error saving email to history table:', dbError.message);
    }

    // Configure the transporter
    const transporter = nodemailer.createTransport({
        host: "cp-wc64.per01.ds.network",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });


    try {
        const info = await transporter.sendMail({
            from: emailTo,
            to: "john@maherco.com.au",
            subject: subject,
            text: emailMessage,
            attachments: attachments
            });

        console.log('ad5     Email sent:', info.response);
        res.send(`Email sent: ${info.response}`);
    } catch (error) {
        console.error('ad6     Error sending email:', error);
        res.status(500).send(`Error sending email: ${error.message}`);
    }
});

app.post('/send-sms', (req, res) => {
    // console.log('ac1            ', accountSid, authToken);
    const { to, message } = req.body;
    console.log('ac2            ('+ req.clientIp + ')');
    // Insert message details into the history table
    const query = `
        INSERT INTO history (message, subject, time, ip, replyto)
        VALUES ($1, $2, $3, $4, $5)
    `;

    client.messages.create({
        body: message,
        from: '+14789991903',
        to: to
    })
    .then(async (message) => {
        console.log('ac9     Message sent:', message);

        // Extract details and insert into the database
        const values = [message.body, message.body, message.dateUpdated, req.clientIp, null];
        try {
            await pool.query(query, values);
            console.log('ac3    Message details saved to history table');
        } catch (dbError) {
            console.error('ac38    Error saving message to history table:', dbError.message);
        }

        return res.send(`Message sent: ${message.sid}`);
    })
    .catch(error => {
        console.log('ac8     Error sending SMS:', error.message);
        return res.send(`Error sending message: ${error.message}`);
    });
    // Validate the 'to' field format
    const phoneRegex = /^\+614\d{8}$/;
    if (!phoneRegex.test(to)) {
        console.log('ac8     Invalid phone number format:', to);
        return res.status(400).send('Invalid phone number format. It should be in the format +614########');
    }

    client.messages.create({
        body: message + ' (reply to ' + to + ')',
        from: '+14789991903',
        to: '+61409877561'
    })
    .then(message => {
        console.log('ac9     Message sent:', message);
        return res.send(`Message sent: ${message.sid}`);
    })
    .catch(error => {
        console.log('ac8     Error sending SMS:', error.message);
        return res.send(`Error sending message: ${error.message}`);
    });
});

app.listen(port, () => {
    console.log('ad3       Server started');
    console.log(`Server is running on port ${port}`);
});

