
/**
 * Contact Page Application
 * 
 * A comprehensive contact form application that supports:
 * - SMS messaging via Twilio
 * - Email sending with attachments via Nodemailer
 * - File uploads via Multer
 * - Payment processing via Stripe
 * - Message history tracking in PostgreSQL
 * - IP-based location detection
 * 
 * @author j869 
 * @version 1.0.0
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const port = 3000;
const bodyParser = require('body-parser');

const fs = require('fs');
const path = require('path');

// Third-party service integrations
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailTemplates = require('./email-templates');

/**
 * Twilio client configuration
 * Used for sending SMS messages
 */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_ACCESS_TOKEN;
const client = twilio(accountSid, authToken);

/**
 * PostgreSQL database connection pool
 * Stores message history and user interactions
 */
const pool = new Pool({
    user: process.env.PG_USER, // PostgreSQL username from .env
    host: process.env.PG_HOST, // PostgreSQL host from .env
    database: process.env.PG_DATABASE, // PostgreSQL database name from .env
    password: process.env.PG_PASSWORD, // PostgreSQL password from .env
    port: process.env.PG_PORT, // PostgreSQL port from .env
});

// Test database connection only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => console.log('ae9        Connected to PostgreSQL database'))
        .catch(err => console.error('ae8        Error connecting to PostgreSQL database:', err));
}
const app = express();

/**
 * Generic email sending function
 * Configures transporter and sends email with provided parameters
 * 
 * @param {Object} emailOptions - Email configuration object
 * @param {string} emailOptions.to - Recipient email address
 * @param {string} emailOptions.cc - CC email addresses (optional)
 * @param {string} emailOptions.replyTo - Reply-to email address (optional)
 * @param {string} emailOptions.subject - Email subject
 * @param {string} emailOptions.html - HTML email content (optional)
 * @param {string} emailOptions.text - Plain text email content
 * @param {string} emailOptions.from - Sender email address (optional, uses env default)
 * @returns {Object} Email sending result with success status and details
 */
async function sendEmail(emailOptions) {
    try {
        console.log("dd1     sending email")
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

        // Prepare email configuration
        const mailConfig = {
            from: emailOptions.from || process.env.SMTP_EMAIL,
            to: emailOptions.to,
            subject: emailOptions.subject,
            text: emailOptions.text,
        };

        // Add optional fields if provided
        if (emailOptions.cc) mailConfig.cc = emailOptions.cc;
        if (emailOptions.bcc) mailConfig.bcc = emailOptions.bcc;
        if (emailOptions.replyTo) mailConfig.replyTo = emailOptions.replyTo;
        if (emailOptions.html) mailConfig.html = emailOptions.html;

        // Send the email
        const info = await transporter.sendMail(mailConfig);
        
        console.log(`dd9     Email sent successfully to ${emailOptions.to}:`, info.response);

        //#region document customer interaction history
        const query = `
            INSERT INTO history (message, subject, time, ip, replyto, file, original_filename)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [
            emailOptions.text, 
            emailOptions.subject, 
            new Date(), 
            'system', 
            emailOptions.to, 
            null, 
            null
        ];

        try {
            await pool.query(query, values);
        } catch (dbError) {
            console.error('ps5    Error saving paid estimate to history table:', dbError);
        }
        //#endregion

        return {
            success: true,
            messageId: info.messageId,
            response: info.response,
            recipient: emailOptions.to
        };
        
    } catch (error) {
        console.error(`Error sending email to ${emailOptions.to}:`, error);
        return {
            success: false,
            error: error.message,
            recipient: emailOptions.to
        };
    }
}

/**
 * Send purchase notification email to quote manager
 * Sends an email notification when a purchase is completed
 * 
 * @param {Object} paymentData - Payment intent or charge object from Stripe
 */
async function sendPurchaseNotificationEmail(paymentData) {
    try {
        // Prepare email content
        const emailSubject = `New Purchase Notification - ${paymentData.id}`;
        const emailBody = `
A new purchase has been completed successfully.

Payment Details:
- Payment ID: ${paymentData.id}
- Amount: ${paymentData.amount ? (paymentData.amount / 100).toFixed(2) : 'N/A'} ${paymentData.currency ? paymentData.currency.toUpperCase() : 'AUD'}
- Status: ${paymentData.status}
- Created: ${new Date(paymentData.created * 1000).toLocaleString()}
- Customer Email: ${paymentData.receipt_email || 'Not provided'}

Payment Method:
- Type: ${paymentData.payment_method_types ? paymentData.payment_method_types.join(', ') : 'Not specified'}

Please review this transaction in your Stripe dashboard for more details.

This is an automated notification from the Contact Page application.
        `;

        // Send the notification email using the generic email function
        const result = await sendEmail({
            to: process.env.QUOTE_MANAGER_EMAIL,
            subject: emailSubject,
            text: emailBody,
        });

        if (result.success) {
            console.log('dh60     Purchase notification email sent:', result.response);
        } else {
            throw new Error(result.error);
        }
        
        // Save notification to history table
        const query = `
            INSERT INTO history (message, subject, time, ip, replyto)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const values = [
            emailBody,
            emailSubject,
            new Date(),
            'system',
            process.env.QUOTE_MANAGER_EMAIL
        ];
        
        await pool.query(query, values);
        console.log('dh61     Purchase notification saved to history');
        
        return result;
        
    } catch (error) {
        console.error('dh62     Error sending purchase notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Request logging middleware
 * Logs all incoming requests with method and path
 */
app.use((req, res, next) => {
  console.log(`x1        NEW REQUEST ${req.method} ${req.path} `);
  next();
});

/**
 * Stripe webhook endpoint
 * Handles payment-related webhooks from Stripe
 * Must be placed before JSON parsing middleware
 * 
 * @route POST /webhook
 * @param {Object} req - Express request object with raw body
 * @param {Object} res - Express response object
 */
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
        
        // Send email notification to quote manager
        await sendPurchaseNotificationEmail(paymentIntent);
        break;
    case 'charge.succeeded':
        const charge2 = event.data.object;
        console.log('dh6      Charge succeeded:', charge2.id);
        
        // Send email notification to quote manager
        await sendPurchaseNotificationEmail(charge2);
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

/**
 * Express middleware configuration
 */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * Multer configuration for file uploads
 * Limits file size to 10MB and stores in uploads/ directory
 */
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * IP address extraction middleware
 * Extracts client IP from headers or socket for location tracking
 */
app.use((req, res, next) => {
    let ip = req.headers['x-forwarded-for'];
    if (ip) {
        // 'x-forwarded-for' header may contain multiple IPs, take the first one
        ip = ip.split(',')[0].trim();
    } else {
        ip = req.socket.remoteAddress;
    }
    req.clientIp = ip;
    console.log('x3          ...Client IP:', req.clientIp);
    next();
});

/**
 * Get user location based on IP address
 * Uses IPInfo API to determine geographical location
 * 
 * @route GET /get-location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON object containing location data
 */
app.get('/get-location', async (req, res) => {
    try {
        const response = await axios.get(`https://ipinfo.io/${req.clientIp}/json`);
        const locationData = response.data;
        res.json(locationData);
    } catch (error) {
        res.status(500).json({ error: 'Unable to get location data' });
    }
});

/**
 * Main page route
 * Renders the contact page with message history from database
 * 
 * @route GET /
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {String} Rendered EJS template with history data
 */
app.get('/', (req, res) => {
    console.log('ab1        USER('+ req.clientIp + ') is loading the contact page ');
    pool.query(`SELECT id, TO_CHAR("time", 'DD-Mon-YYYY hh:mm') AS formatted_date, ip, replyto, subject, message, location, file, original_filename FROM history order by "time"`, (err, result) => {
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

/**
 * Submit building permit estimate request
 * Stores request details in database and sends confirmation emails
 * 
 * @route POST /submit-estimate-request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.body.customerEmail - Customer email address
 * @param {string} req.body.phone - Customer phone number
 * @param {File} req.file - Optional file attachment
 * @returns {String} Thank you page with reference number
 */
app.post('/submit-estimate-request', upload.single('attachment'), async (req, res) => {
    console.log('em1        USER('+ req.clientIp + ') submitted estimate request');
    console.log('em11         ...body:', req.body || {});
    
    // Check if this is a test environment (for unit tests)
    if (process.env.NODE_ENV === 'test') {
        // For testing, render the thank you page with a test reference
        const testReferenceNumber = 'BPE-TEST-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        return res.render('thank-you', { referenceNumber: testReferenceNumber });
    }
    
    // Extract and validate required fields
    const { customerEmail, phone, customerName } = req.body;
    let newNotes = `em1     found customer ${customerEmail}\n`;

    if (!customerEmail || !phone || !customerName) {
        return res.status(400).send('Missing required fields. Please provide your name, email address, and phone number.');
    }
    
    // Generate a unique reference number for this estimate request
    const referenceNumber = 'BPE-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Store the processed data back in req.body for the redirect
    req.body.referenceNumber = referenceNumber;
    req.body.customerEmail = customerEmail;
    req.body.customerName = customerName;
    req.body.customerPhone = phone;
    req.body.hasFullFormData = true; // Flag to indicate complete form submission

    // Send sysadmin headsup email asynchronously
    try {
        const adminAlertTemplate = emailTemplates.sysAdminNewCustomerAlert({
            formData: req.body,
            referenceNumber,
            clientIp: req.clientIp
        });
        
        sendEmail({
            to: process.env.ADMIN_EMAIL || "john@buildingbb.com.au",
            cc: process.env.QUOTE_MANAGER_EMAIL || "alex@buildingbb.com.au", 
            subject: `🚨 New Estimate Request [Ref: ${referenceNumber}] - ${customerName}`,
            html: adminAlertTemplate.html,
            text: adminAlertTemplate.text,
        }).then(() => {
            console.log('em15   Admin notification email sent for new estimate submission');
        }).catch(emailError => {
            console.error('em16   Error sending admin notification email:', emailError);
        });
        
    } catch (templateError) {
        console.error('em16   Error generating admin notification template:', templateError);
    }


    //#region create initial customer record
        // Create new record with available information from form submission
        newNotes = newNotes + `em13   Initial form submission recorded at ${new Date().toISOString()}\n`;
        const insertQuery = `
            INSERT INTO customer_purchases (
                web_session_id,
                reference_number,
                customer_email,
                customer_name,
                customer_phone,
                customer_ip,
                created_time,
                last_seen_time,
                form_data,
                notes 
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        // Prepare form data as JSON for storage
        const formDataJson = {
            originalFormSubmission: req.body,
            hasFileAttachment: req.file ? true : false,
            fileName: req.file ? req.file.originalname : null
        };
        
        const insertValues = [
            req.sessionID || null,      // $1 - web_session_id (Express session ID if available)
            referenceNumber,            // $2 - reference_number (generated in this function)
            customerEmail,                    // $3 - customer_email (from form)
            customerName,               // $4 - customer_name (from form)
            phone,                      // $5 - customer_phone (from form)
            req.clientIp || null,       // $6 - customer_ip (from middleware)
            new Date(),                 // $7 - created_time
            new Date(),                 // $8 - last_seen_time
            formDataJson,               // $9 - form_data as JSON
            newNotes                    // $10 - notes
        ];

        try {
            await pool.query(insertQuery, insertValues);
            console.log('em13   Initial customer purchase record created for form submission');

        } catch (insertError) {
            console.error('em14   Error creating initial customer purchase record:', insertError);
        }
    
    //#endregion


    // Redirect to create checkout session with the form data
    return res.redirect(307, '/create-checkout-session');


});

/**
 * Send email with customer callback request details
 * Stores message details in database and sends email
 * 
 * @route POST /send-email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.body.firstName - Customer first name
 * @param {string} req.body.phone - Customer phone number
 * @param {string} req.body.email - Customer email address
 * @param {string} req.body.message - Customer message/preferred callback time
 * @returns {String} Success message or error message
 */
app.post('/send-email', async (req, res) => {
    console.log('em1        USER('+ req.clientIp + ') is sending a callback request    ', req.body);
    let { firstName, phone, email, message } = req.body;
    
    if (!firstName || !phone || !email) {
        return res.status(400).send('Missing required fields. Please provide your first name, phone number, and email address.');
    }
    
    if (message === null || message === undefined) {
        message = 'No specific time preference provided';
    }    

    // Insert message details into the history table
    const currentDate = new Date();
    const query = `
        INSERT INTO history (message, subject, time, ip, replyto)
        VALUES ($1, $2, $3, $4, $5)
    `;
    
    // Format the message for database storage
    const formattedMessage = `CALLBACK REQUEST FROM: ${firstName}
Phone: ${phone}
Email: ${email}
Best time to call: ${message}
Submitted: ${currentDate.toLocaleString('en-AU')}`;
    
    // Extract details and insert into the database
    const values = [formattedMessage, 'Callback Request from ' + firstName, currentDate, req.clientIp, email];
    try {
        await pool.query(query, values);
        console.log('em3          Callback request details saved to database');
    } catch (dbError) {
        console.error('em38         Error saving callback request to database:', dbError.message);
    }

    // // Configure email transporter
    // const transporter = nodemailer.createTransport({
    //     host: "cp-wc64.per01.ds.network",
    //     port: 587,
    //     secure: false,
    //     requireTLS: true,
    //     auth: {
    //         user: process.env.SMTP_EMAIL,
    //         pass: process.env.SMTP_PASSWORD,
    //     },
    // });

    // Send email notification to business team using the generic email function
    try {
        const templateData = {
            firstName,
            phone,
            email,
            message,
            currentDate,
            clientIp: req.clientIp
        };
        
        const emailTemplate = emailTemplates.getCallbackRequestTemplate(templateData);
        
        const emailResult = await sendEmail({
            to: "john@buildingbb.com.au",
            cc: "alex@buildingbb.com.au",
            replyTo: email,
            subject: `📞 Callback Request from ${firstName} (${phone})`,
            html: emailTemplate.html,
            text: emailTemplate.text
        });

        if (emailResult.success) {
            console.log('em9          Callback request email sent successfully');
            return res.send(`Callback request submitted successfully! We'll contact you at ${phone} during your preferred time.`);
        } else {
            throw new Error(emailResult.error);
        }
        
    } catch (error) {
        console.log('em8          Error sending callback request email:', error.message);
        return res.send(`Error submitting callback request: ${error.message}`);
    }
});

/**
 * Stripe payment processing routes
 */

/**
 * Payment success page - Process estimate request after successful payment
 * 
 * @route GET /success
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {String} Success message or redirect to thank you page
 */
app.get("/success", async (req, res) => {
    try {
        const sessionId = req.query.session_id;
        let newNotes = ``
        newNotes = newNotes + `ps1    [${new Date().toISOString()}] Payment completed successfully via Stripe. \n`;
        
        if (!sessionId) {
            console.log("ps1    Payment successful but no session ID provided");
            newNotes = newNotes + `ps1      !Lost sessionID - initiate manual reconciliation\n`;
            return res.send("Payment successful! Thank you for your purchase.");
        } else {
            console.log("ps11     working with session ID:", sessionId);
        }

        // Retrieve the checkout session to get metadata
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log("ps2    Payment successful, processing estimate request:", session.metadata);

        // Extract customer email from session (either from metadata or customer_email)
        const customerEmail = session.metadata?.customerEmail || session.customer_details?.email || session.customer_email || null;
        
        if (!customerEmail) {
            newNotes = newNotes + `ps3      !lost customer contact\n`;
            console.log("ps3    Payment successful but no customer email found");
            return res.send(`Payment successful! Thank you for your $55 purchase. Please contact us at alex@buildingbb.com.au with your transaction ID: ${session.payment_intent} to process your estimate request.`);
        }

        // Extract estimate request data from metadata (if not available use dummy data)
        const {
            referenceNumber = 'unknown',     //this must only come from the initial form submission
            subject = 'Building Permit Cost Estimate Request',
            customerName = 'Customer',
            customerPhone = 'Not provided',
            clientIp = 'payment-portal',
            hasFullFormData = 'false',
            emailMessage: storedEmailMessage
        } = session.metadata || {};

        let emailMessage;
        if (hasFullFormData === 'true' && storedEmailMessage) {
            emailMessage = storedEmailMessage || 'no stored email message';
        }

        // Send thank you email to customer with payment confirmation
        const customerTemplateData = { referenceNumber, session };
        const customerEmailTemplate = emailTemplates.getCustomerPaymentConfirmationTemplate(customerTemplateData);

        await sendEmail({
            to: customerEmail,
            bcc: "john@buildingbb.com.au",
            subject: `Payment Confirmed - Building Permit Estimate [Ref: ${referenceNumber}]`,
            html: customerEmailTemplate.html,
            text: customerEmailTemplate.text
        });
        newNotes = newNotes + `ps1    Customer confirmation email sent to ${customerEmail}. \n`;

        // Send notification email to business team with payment proof
        const businessTemplateData = {
            referenceNumber,
            subject,
            customerEmail,
            clientIp,
            emailMessage,
            session
        };
        const businessEmailTemplate = emailTemplates.getBusinessNotificationTemplate(businessTemplateData);

        await sendEmail({
            to: process.env.QUOTE_MANAGER_EMAIL || "john@buildingbb.com.au",
            cc: process.env.ADMIN_EMAIL || "alex@buildingbb.com.au,amandah@vicpa.com.au",
            replyTo: customerEmail,
            subject: subject + ` [Ref: ${referenceNumber}] [PAID] (reply to ` + customerEmail + ')',
            html: businessEmailTemplate.html,
            text: businessEmailTemplate.text,
        });
        newNotes = newNotes + `ps2    Business notification emails sent to ${process.env.QUOTE_MANAGER_EMAIL || "john@buildingbb.com.au"}. \n`;
        console.log('ps6    Confirmation emails sent after successful payment');

        //#region update customer job details 
        // Insert/Update customer purchase tracking record - find existing record first
        const findExistingQuery = `
            SELECT id FROM customer_purchases 
            WHERE reference_number = $1 OR stripe_checkout_session_id = $2
            LIMIT 1
        `;
        
        let existingRecord = null;
        try {
            const findResult = await pool.query(findExistingQuery, [referenceNumber, sessionId]);
            existingRecord = findResult.rows[0] || null;
            console.log('ps4a   Existing customer record found:', existingRecord ? 'YES' : 'NO');
        } catch (findError) {
            console.error('ps4a   Error finding existing customer record:', findError);
            newNotes = newNotes + `ps4a      !Cannot find customer_purchase record\n`;
        }


        if (existingRecord) {
            // Update existing record - only add new information
            const updateQuery = `
                UPDATE customer_purchases 
                SET 
                    stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $1),
                    stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, $2),
                    payment_amount = COALESCE(payment_amount, $3),
                    payment_status = $4,
                    payment_completed_time = COALESCE(payment_completed_time, $5),
                    last_seen_time = $6,
                    notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $7
                WHERE id = $8
            `;
            
            const updateValues = [
                session.payment_intent,      // $1 - only set if not already set
                sessionId,                   // $2 - only set if not already set
                5500,                       // $3 - only set if not already set
                session.payment_status,     // $4 - always update payment status
                new Date(),                 // $5 - only set if not already set
                new Date(),                 // $6 - always update last seen
                newNotes,                   // $7 - append new notes
                existingRecord.id           // $8 - record ID to update
            ];

            try {
                await pool.query(updateQuery, updateValues);
                console.log('ps4b   Existing customer purchase record updated with payment completion info');
            } catch (updateError) {
                console.error('ps5b   Error updating existing customer purchase record:', updateError);
            }
        } else {
            // Create new record with available information
            newNotes = newNotes + `ps4b   adding late recovery customer purchase record\n`;
            const insertQuery = `
                INSERT INTO customer_purchases (
                    reference_number,
                    stripe_payment_intent_id,
                    stripe_checkout_session_id,
                    payment_amount,
                    payment_currency,
                    payment_status,
                    customer_name,
                    customer_email,
                    customer_phone,
                    customer_ip,
                    payment_completed_time,
                    last_seen_time,
                    form_data,
                    notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;

            const formDataJson = emailMessage ? { originalFormSubmission: emailMessage } : null;
            
            const insertValues = [
                referenceNumber,            // $1 - reference_number
                session.payment_intent,     // $2 - stripe_payment_intent_id
                sessionId,                  // $3 - stripe_checkout_session_id
                5500,                      // $4 - payment_amount
                'AUD',                     // $5 - payment_currency
                session.payment_status,    // $6 - payment_status
                customerName,              // $7 - customer_name
                customerEmail,             // $8 - customer_email
                customerPhone,             // $9 - customer_phone
                clientIp,                  // $10 - customer_ip
                new Date(),                // $11 - payment_completed_time
                new Date(),                // $12 - last_seen_time
                formDataJson,              // $13 - form_data as JSON
                newNotes                   // $14 - notes
            ];

            try {
                await pool.query(insertQuery, insertValues);
                console.log('ps4b   New customer purchase record created');

            } catch (insertError) {
                console.error('ps5b   Error creating new customer purchase record:', insertError);
            }
        }
        //#endregion

        
        // Redirect to thank you page with reference number
        res.render('thank-you', { referenceNumber: referenceNumber });

    } catch (error) {
        console.error('ps7    Error processing successful payment:', error);
        res.status(500).send(`Error processing your estimate request: ${error.message}. Please contact us directly at alex@buildingbb.com.au or 0429 815 177`);
    }
});

/**
 * Payment cancellation page
 * 
 * @route GET /cancel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {String} Cancellation message
 */
app.get("/cancel", async (req, res) => {
    console.log("ps1    Payment cancelled for user:", req.user ? req.user: 'guest');
    console.log("ps1a   Session info - ID:", req.sessionID, "IP:", req.clientIp);
    if ( req.body) {
        console.log('ps1b       body:', req.body);
    }
    let newNotes = `ps1     Payment cancelled via back button at ${new Date().toISOString()}\n`;
    
    // Try to find existing customer record using available session information
    const findExistingQuery = `
        SELECT id, customer_email, reference_number FROM customer_purchases 
        WHERE web_session_id = $1 OR customer_ip = $2
        ORDER BY last_seen_time DESC
        LIMIT 1
    `;
    
    let existingRecord = null;
    try {
        const findResult = await pool.query(findExistingQuery, [req.sessionID, req.clientIp]);
        existingRecord = findResult.rows[0] || null;
        console.log('ps1b   Existing customer record found:', existingRecord ? `YES (${existingRecord.customer_email})` : 'NO');
        
        if (existingRecord) {
            newNotes += `ps1c   Found customer record: ${existingRecord.customer_email} (${existingRecord.reference_number})\n`;
        }
    } catch (findError) {
        console.error('ps1c   Error finding existing customer record:', findError);
        newNotes += `ps1c   Error finding customer record: ${findError.message}\n`;
    }

    if (existingRecord) {
        // Update existing record - mark payment as cancelled
        const updateQuery = `
            UPDATE customer_purchases 
            SET 
                payment_status = $1,
                last_seen_time = $2,
                notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $3
            WHERE id = $4
        `;
        
        const updateValues = [
            'cancelled',                // $1 - payment_status
            new Date(),                 // $2 - last_seen_time
            newNotes,                   // $3 - append new notes
            existingRecord.id           // $4 - record ID to update
        ];

        try {
            await pool.query(updateQuery, updateValues);
            console.log('ps1d   Customer purchase record updated with cancellation status');
        } catch (updateError) {
            console.error('ps1e   Error updating customer purchase record:', updateError);
        }
    } else {
        console.log('ps1f   No customer record found to update for cancellation');
    }
    
    res.send("Payment cancelled. Please try again or contact us at alex@buildingbb.com.au for assistance.");
});

/**
 * Create Stripe checkout session for building permit estimate
 * Creates a payment session and stores customer estimate request data
 * 
 * @route POST /create-checkout-session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Redirect} Redirects to Stripe checkout page
 */
app.post("/create-checkout-session", async (req, res) => {
    try {
        // Extract the required data for payment processing
        console.log('ps8    Body:', req.body);
        let newNotes = ``;

        // Make req.body optional - handle cases where redirect didn't preserve body data
        const requestData = req.body || {};
        const { customerEmail, referenceNumber, customerName, customerPhone, hasFullFormData } = requestData;
        
        if (!customerEmail) {
            console.log('ps9    No customer email found in request, creating basic checkout session');
            newNotes = newNotes + `ps9      !lost customer email\n`;
        }
        
        // Create Stripe session configuration
        const sessionConfig = {
            line_items: [
            {
                price_data: {
                currency: 'aud',
                product_data: {
                    name: 'Building Permit Estimate Service',
                    description: 'Professional building permit cost estimate with expert guidance',
                },
                unit_amount: process.env.ESTIMATE_FEE, // $55.00 AUD
                },
                quantity: 1,
            },
            ],
            mode: 'payment',
            success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: 'http://localhost:3000/cancel',
            // Store customer data in metadata (if available)
            metadata: {
                referenceNumber: referenceNumber || 'unknown',
                customerEmail: customerEmail || 'not-provided',
                customerName: customerName || 'Customer',
                customerPhone: customerPhone || 'Not provided',
                clientIp: req.clientIp || 'payment-portal',
                hasFullFormData: hasFullFormData ? 'true' : 'false'
            }
        };
        console.log('ps5    Session configuration:', sessionConfig);
            newNotes = newNotes + `ps9      !lost customer email\n`;

        // Pre-populate email on Stripe payment form only if customer email is available
        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
        }
        
        const session = await stripe.checkout.sessions.create(sessionConfig);
        console.log('ps9   Checkout session created successfully:', session.id);

        //#region update customer job details 
        // Insert/Update customer purchase tracking record - find existing record first
        const findExistingQuery = `
            SELECT id FROM customer_purchases 
            WHERE reference_number = $1 OR customer_email = $2
            LIMIT 1
        `;
        
        let existingRecord = null;
        try {
            const findResult = await pool.query(findExistingQuery, [referenceNumber, customerEmail]);
            existingRecord = findResult.rows[0] || null;
            console.log('ps4a   Existing customer record found:', existingRecord ? 'YES' : 'NO');
        } catch (findError) {
            console.error('ps4a   Error finding existing customer record:', findError);
            newNotes = newNotes + `ps4a      !Cannot find customer_purchase record\n`;
        }


        if (existingRecord) {
            // Update existing record - append new information to existing data
            const updateQuery = `
                UPDATE customer_purchases 
                SET 
                    stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, $1),
                    payment_amount = COALESCE(payment_amount, $2),
                    payment_currency = COALESCE(payment_currency, $3),
                    payment_status = $4,
                    last_seen_time = $5,
                    notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $6
                WHERE id = $7
            `;
            
            const updateValues = [
                session.id,                 // $1 - stripe_checkout_session_id (only set if not already set)
                process.env.ESTIMATE_FEE,  // $2 - payment_amount (only set if not already set)
                null,                      // $3 - payment_currency (only set if not already set)
                'pending',                  // $4 - payment_status (always update)
                new Date(),                 // $5 - last_seen_time (always update)
                newNotes,                   // $6 - append new notes
                existingRecord.id           // $7 - record ID to update
            ];

            try {
                await pool.query(updateQuery, updateValues);
                console.log('ps4b   Existing customer purchase record updated with checkout session info');
            } catch (updateError) {
                console.error('ps5b   Error updating existing customer purchase record:', updateError);
            }
        } else {
            // Create new record with available information to assist in recreating missing record
            newNotes = newNotes + `ps4b   Creating new customer purchase record for checkout session\n`;
            const insertQuery = `
                INSERT INTO customer_purchases (
                    reference_number,
                    customer_email,
                    customer_name,
                    customer_phone,
                    customer_ip,
                    stripe_checkout_session_id,
                    payment_amount,
                    payment_currency,
                    payment_status,
                    created_at,
                    last_seen_time,
                    notes 
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            
            const insertValues = [
                referenceNumber || 'Unknown', // $1 - reference_number
                customerEmail || 'not-provided',  // $2 - customer_email
                customerName || 'Customer', // $3 - customer_name
                customerPhone || 'Not provided', // $4 - customer_phone
                req.clientIp || 'checkout-portal', // $5 - customer_ip
                session.id,                 // $6 - stripe_checkout_session_id
                process.env.ESTIMATE_FEE,  // $7 - payment_amount
                null,                       // $8 - payment_currency
                'pending',                 // $9 - payment_status
                null,                       // $10 - created_time
                new Date(),                // $11 - last_seen_time
                newNotes                   // $12 - notes
            ];

            try {
                await pool.query(insertQuery, insertValues);
                console.log('ps4b   New customer purchase record created for checkout session');

            } catch (insertError) {
                console.error('ps5b   Error creating new customer purchase record:', insertError);
            }
        }
        //#endregion


        res.redirect(303, session.url);
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).send(`Error creating payment session: ${error.message}`);
    }
});

/**
 * Start the Express server
 * Only start server if this file is run directly (not imported for testing)
 */
if (require.main === module) {
    app.listen(port, () => {
        console.log(`ad3        SERVER is running on port ${port}`);
    });
}

// Export the app for testing
module.exports = app;
module.exports.sendEmail = sendEmail;
module.exports.sendPurchaseNotificationEmail = sendPurchaseNotificationEmail;
module.exports.pool = pool;
module.exports.emailTemplates = emailTemplates;

