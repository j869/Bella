/**
 * End-to-end tests for the contact page application
 * These tests simulate real user interactions
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.PG_USER = 'test_user';
process.env.PG_HOST = 'localhost';
process.env.PG_DATABASE = 'test_db';
process.env.PG_PASSWORD = 'test_password';
process.env.PG_PORT = '5432';
process.env.TWILIO_ACCOUNT_SID = 'test_sid';
process.env.TWILIO_ACCESS_TOKEN = 'test_token';
process.env.SMTP_EMAIL = 'test@example.com';
process.env.SMTP_PASSWORD = 'test_password';
process.env.STRIPE_SECRET_KEY = 'sk_test_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

// Mock all external services for E2E tests BEFORE importing app
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockImplementation((query, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
      }
      const mockResult = { 
        rows: [
          {
            id: 1,
            formatted_date: '01-Jan-2025',
            ip: '127.0.0.1',
            replyto: 'test@example.com',
            subject: 'Test Subject',
            message: 'Test Message',
            location: 'Test Location',
            file: null,
            original_filename: null
          }
        ]
      };
      if (callback) {
        callback(null, mockResult);
      }
      return Promise.resolve(mockResult);
    })
  }))
}));

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'test_message_sid_123' })
    }
  }));
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ response: 'Email sent successfully' })
  }))
}));

jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123456' } }
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://checkout.stripe.com/test_session'
        })
      }
    }
  }));
});

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      ip: '127.0.0.1',
      city: 'Test City',
      region: 'Test Region',
      country: 'AU',
      loc: '-33.8688,151.2093'
    }
  })
}));

// Import app AFTER mocking dependencies
const app = require('../app');

describe('E2E: Contact Page User Journeys', () => {
  
  describe('User sends SMS message', () => {
    it('should complete SMS sending workflow', async () => {
      // 1. User visits the main page
      const mainPageResponse = await request(app)
        .get('/')
        .expect(200);
      
      expect(mainPageResponse.text).toContain('Send SMS');
      
      // 2. User fills out SMS form and submits
      const smsResponse = await request(app)
        .post('/send-sms')
        .send({
          to: '+1234567890',
          message: 'Hello, this is a test message!'
        })
        .expect(200);
      
      expect(smsResponse.text).toContain('Message sent');
    });
  });

  describe('User sends email with attachment', () => {
    it('should complete email sending workflow with file', async () => {
      // 1. User visits the main page
      const mainPageResponse = await request(app)
        .get('/')
        .expect(200);
      
      expect(mainPageResponse.text).toContain('Send Email');
      
      // 2. Create a test file for attachment
      const testFilePath = path.join(__dirname, 'test-attachment.txt');
      fs.writeFileSync(testFilePath, 'This is a test attachment file.');
      
      // 3. User fills out email form with attachment and submits
      const emailResponse = await request(app)
        .post('/send-email')
        .field('emailTo', 'user@example.com')
        .field('subject', 'Test Email with Attachment')
        .field('emailMessage', 'Please find the attached file.')
        .attach('attachment', testFilePath)
        .expect(200);
      
      expect(emailResponse.text).toContain('Email sent');
      
      // 4. Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should complete email sending workflow without attachment', async () => {
      const emailResponse = await request(app)
        .post('/send-email')
        .field('emailTo', 'user@example.com')
        .field('subject', 'Test Email without Attachment')
        .field('emailMessage', 'This is a simple email message.')
        .expect(200);
      
      expect(emailResponse.text).toContain('Email sent');
    });
  });

  describe('User completes payment flow', () => {
    it('should complete checkout workflow', async () => {
      // 1. User visits main page
      const mainPageResponse = await request(app)
        .get('/')
        .expect(200);
      
      expect(mainPageResponse.text).toContain('Checkout');
      
      // 2. User initiates checkout
      const checkoutResponse = await request(app)
        .post('/create-checkout-session')
        .expect(303);
      
      expect(checkoutResponse.headers.location).toBeDefined();
      
      // 3. Simulate successful payment redirect
      const successResponse = await request(app)
        .get('/success')
        .expect(200);
      
      expect(successResponse.text).toContain('Payment successful');
    });

    it('should handle payment cancellation', async () => {
      const cancelResponse = await request(app)
        .get('/cancel')
        .expect(200);
      
      expect(cancelResponse.text).toContain('Payment cancelled');
    });
  });

  describe('User checks location', () => {
    it('should get location data based on IP', async () => {
      const locationResponse = await request(app)
        .get('/get-location')
        .expect(200);
      
      expect(locationResponse.body).toHaveProperty('city');
      expect(locationResponse.body).toHaveProperty('country');
    });
  });

  describe('Webhook handling', () => {
    it('should process Stripe webhook correctly', async () => {
      const webhookPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 5500,
            currency: 'aud'
          }
        }
      });

      const webhookResponse = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test_signature_header')
        .set('content-type', 'application/json')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.text).toBe('Webhook received');
    });
  });

  describe('Error scenarios', () => {
    it('should handle invalid email submission gracefully', async () => {
      const emailResponse = await request(app)
        .post('/send-email')
        .field('emailTo', 'invalid-email')
        .field('subject', '')
        .field('emailMessage', '')
        .expect(200);
      
      // Should not crash, even with invalid data
      expect(emailResponse.status).toBe(200);
    });

    it('should handle invalid SMS submission gracefully', async () => {
      const smsResponse = await request(app)
        .post('/send-sms')
        .send({
          to: '',
          message: ''
        })
        .expect(200);
      
      // Should not crash, even with empty data
      expect(smsResponse.status).toBe(200);
    });

    it('should handle file upload errors gracefully', async () => {
      // Try to upload a non-existent file
      const emailResponse = await request(app)
        .post('/send-email')
        .field('emailTo', 'test@example.com')
        .field('subject', 'Test')
        .field('emailMessage', 'Test message')
        .expect(200);
      
      // Should not crash even without file
      expect(emailResponse.status).toBe(200);
    });
  });

  describe('Complete user session', () => {
    it('should simulate a complete user session', async () => {
      // 1. User visits main page
      const mainPage = await request(app)
        .get('/')
        .expect(200);
      
      expect(mainPage.text).toContain('Contact Page');
      
      // 2. User checks their location
      const location = await request(app)
        .get('/get-location')
        .expect(200);
      
      expect(location.body).toHaveProperty('ip');
      
      // 3. User sends an SMS
      const sms = await request(app)
        .post('/send-sms')
        .send({
          to: '+1234567890',
          message: 'Hello from the contact page!'
        })
        .expect(200);
      
      expect(sms.text).toContain('Message sent');
      
      // 4. User sends an email
      const email = await request(app)
        .post('/send-email')
        .field('emailTo', 'user@example.com')
        .field('subject', 'Contact Form Submission')
        .field('emailMessage', 'This is my message via the contact form.')
        .expect(200);
      
      expect(email.text).toContain('Email sent');
      
      // 5. User initiates payment
      const checkout = await request(app)
        .post('/create-checkout-session')
        .expect(303);
      
      expect(checkout.headers.location).toBeDefined();
      
      // 6. Payment is successful
      const success = await request(app)
        .get('/success')
        .expect(200);
      
      expect(success.text).toContain('Payment successful');
    });
  });
});
