# Contact Page Application

A full-featured contact form application built with Node.js and Express that supports SMS, email, file uploads, and payment processing.

## Features

- **SMS Messaging**: Send SMS messages via Twilio
- **Email Sending**: Send emails with attachments via Nodemailer
- **File Uploads**: Support for file attachments up to 10MB
- **Payment Processing**: Stripe integration for checkout functionality
- **Message History**: PostgreSQL database to store all communications
- **Location Tracking**: IP-based location detection
- **Responsive UI**: Bootstrap-powered responsive design

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **SMS**: Twilio API
- **Email**: Nodemailer
- **Payments**: Stripe
- **File Upload**: Multer
- **Frontend**: EJS, Bootstrap 5
- **Location**: IPInfo API

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Twilio account and credentials
- Stripe account and API keys
- SMTP email server access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd contactpage
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
# Database Configuration
PG_USER=your_postgres_username
PG_HOST=localhost
PG_DATABASE=contact
PG_PASSWORD=your_postgres_password
PG_PORT=5432

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_ACCESS_TOKEN=your_twilio_auth_token

# Email Configuration
SMTP_EMAIL=your_smtp_email
SMTP_PASSWORD=your_smtp_password

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

4. Set up the PostgreSQL database:
```bash
psql -U postgres -f schema.sql
```

5. Start the application:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### GET /
- **Description**: Renders the main contact page with message history
- **Response**: HTML page with contact forms and history table

### POST /send-sms
- **Description**: Sends an SMS message via Twilio
- **Body Parameters**:
  - `to` (string): Recipient's phone number
  - `message` (string): SMS message content
- **Response**: Success/error message with Twilio SID

### POST /send-email
- **Description**: Sends an email with optional file attachment
- **Body Parameters**:
  - `emailTo` (string): Recipient's email address
  - `subject` (string): Email subject
  - `emailMessage` (string): Email message content
  - `attachment` (file): Optional file attachment
- **Response**: Success/error message

### GET /get-location
- **Description**: Gets user's location based on IP address
- **Response**: JSON object with location data

### POST /create-checkout-session
- **Description**: Creates a Stripe checkout session
- **Response**: Redirects to Stripe checkout page

### POST /webhook
- **Description**: Handles Stripe webhook events
- **Headers**: `stripe-signature` required
- **Response**: Webhook acknowledgment

## Database Schema

The application uses a single `history` table to store all communications:

```sql
CREATE TABLE history (
    id SERIAL PRIMARY KEY,
    time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ip VARCHAR(45) NOT NULL,
    replyto VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    location VARCHAR(255),
    file VARCHAR(255),
    original_filename VARCHAR(255)
);
```

## Security Considerations

- Environment variables are used for sensitive data
- File upload size is limited to 10MB
- Stripe webhook signatures are verified
- SQL injection protection via parameterized queries

## Error Handling

The application includes comprehensive error handling for:
- Database connection failures
- Email sending errors
- SMS delivery failures
- File upload issues
- Stripe payment processing errors

## Development

To run in development mode with automatic restarts:
```bash
npm install -g nodemon
nodemon app.js
```

## Testing

Run the test suite:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
