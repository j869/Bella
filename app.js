
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
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 

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
    .then(() => console.log('ae9        Connected to PostgreSQL database'))
    .catch(err => console.error('ae8        Error connecting to PostgreSQL database:', err));
const app = express();

app.use((req, res, next) => {
  console.log(`x1        NEW REQUEST ${req.method} ${req.path} `);
  next();
});

app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    // must Precede Middleware to parse JSON bodies    //app.use(express.json());  and bodyParser.urlencoded({ extended: true });
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    console.log("dh1    Stripe webhook received with signature:", sig);
    let event;

    try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
        req.body, // Raw request body (Buffer)
        sig,
        webhookSecret
    );
    } catch (err) {
    console.error('dh28     Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('dh3      Webhook verified:', event.type);

    // Handle the event (e.g., process payment_intent.succeeded)
    switch (event.type) {
    case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('dh59     PaymentIntent succeeded:', paymentIntent.id);
        break;
    case 'charge.succeeded':
        const charge2 = event.data.object;
        console.log('dh6      Charge succeeded:', charge2.id);
        break;
    case 'payment_intent.created':
        console.log('dh7      PaymentIntent created:', event.data.object.id);
        break;
    case 'charge.failed':
        const charge3 = event.data.object;
        console.log('dh58    Charge failed:', charge3.id);
        break;
    default:
        console.log(`dh588      Unhandled event type: ${event.type}`);
    }

    res.status(200).send("Webhook received");

});


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    console.log('ab1        USER('+ req.clientIp + ') is loading the contact page ');
    pool.query(`SELECT id, TO_CHAR("time", 'DD-Mon-YYYY') AS formatted_date, ip, replyto, subject, message, location, file, original_filename FROM history`, (err, result) => {
        if (err) {
            console.error('ab81         Error fetching records from history table:', err);
            // res.status(500).send('Error fetching records');
            res.render('main', { title: 'Send me an SMS' });
        } else {
            console.log(`ab2     ${result.rows.length} records fetched from history table, i.e.`, result.rows[result.rows.length - 1]);
            res.render('main', { data: result.rows });
        }
    });
    
});


app.post('/send-email', upload.single('attachment'), async (req, res) => {
    console.log('em1        USER('+ req.clientIp + ') is sending an email', req.body);
    // console.log('em2      Uploaded file:', req.file); // This should show your file info
    const { emailTo, subject, emailMessage } = req.body;

    // Handle the attachment if it exists
    let attachments = [];
    let filePath = null;
    let originalFilename = null;
    if (req.file) {
        filePath = req.file.path;
        originalFilename = req.file.originalname;
        attachments = [{
            filename: req.file.originalname || path.basename(req.file.path),
            path: req.file.path
        }];
    }
    // Insert email details into the history table
    const query = `
        INSERT INTO history (message, subject, time, ip, replyto, file, original_filename)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [emailMessage, subject, new Date(), req.clientIp, emailTo, filePath, originalFilename];

    try {
        pool.query(query, values);
        console.log('em3          Email details saved to history table');
    } catch (dbError) {
        console.error('em38         Error saving email to history table:', dbError);
        console.error('em38         Error saving email to history table:', dbError.message);
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
            from: "john@buildingbb.com.au",     //emailTo,
            to: "john@buildingbb.com.au",
            replyTo: emailTo,
            subject: subject + ' (reply to ' + emailTo + ')',
            text: emailMessage,
            attachments: attachments
            });

        console.log('ad5        Email sent:', info.response);
        res.send(`Email sent: ${info.response}`);
    } catch (error) {
        console.error('ad6          Error sending email:', error);
        res.status(500).send(`Error sending email: ${error.message}`);
    }
});



app.post('/send-sms', async (req, res) => {
    //console.log('ac1            ', accountSid, authToken);
    console.log('ac1        USER('+ req.clientIp + ') is sending a SMS    ', req.body);
    const { to, message } = req.body;
    if (message === null || message === undefined) {
        message = 'no message';
      }    

    // Insert message details into the history table
    const currentDate = new Date();
    const query = `
        INSERT INTO history (message, subject, time, ip, replyto)
        VALUES ($1, $2, $3, $4, $5)
    `;
    // Extract details and insert into the database
    const values = [message, 'SMS sent to +61409877561', currentDate, req.clientIp, to];
    try {
        await pool.query(query, values);
        console.log('ac3          Message details saved to database');
    } catch (dbError) {
        console.error('ac38         Error saving message to database:', dbError.message);
    }

    client.messages.create({
        body: message + ' (reply to ' + to + ')',
        from: '+14789991903',
        to: '+61409877561'
    })
    .then(async (message) => {
        console.log('ac9          Message sent:', message);
        return res.send(`Message sent: ${message.sid}`);
    })
    .catch(error => {
        console.log('ac8          Error sending SMS:', error.message);
        return res.send(`Error sending message: ${error.message}`);
    });
});

//#region stripe checkout

    app.get("/success", async (req, res) => {
      console.log("ps1    Payment successful for user:", req.user ? req.user: 'guest');
      res.send("Payment successful! Thank you for your purchase.");
    });
    app.get("/cancel", async (req, res) => {
      console.log("ps1    Payment cancelled for user:", req.user ? req.user: 'guest');
      res.send("Payment cancelled. Please try again.");
    });


    app.post("/create-checkout-session", async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        line_items: [
        {
            price_data: {
            currency: 'aud',
            product_data: {
                name: 'T-shirt',
            },
            unit_amount: 5500,
            },
            quantity: 1,
        },
        ],
        mode: 'payment',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
    });

    res.redirect(303, session.url);
    });


//#endregion


app.listen(port, () => {
    console.log(`ad3        SERVER is running on port ${port}`);
});

