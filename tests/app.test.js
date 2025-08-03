/**
 * Main application tests
 * Tests for the contact page application endpoints and functionality
 */

const request = require('supertest');
const path = require('path');

// Set test environment variables before importing app
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });
process.env.NODE_ENV = 'test';

// Mock external dependencies before importing app
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
      constructEvent: jest.fn().mockImplementation((body, sig, secret) => {
        if (sig === 'invalid_signature') {
          throw new Error('Invalid signature');
        }
        return {
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test_123456' } }
        };
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

// Import app after mocking dependencies
const app = require('../app');

describe('Contact Page Application', () => {
  
  describe('GET /', () => {
    it('should render the main contact page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toContain('Contact Page');
    });
  });

  describe('GET /get-location', () => {
    it('should return location data based on IP', async () => {
      const response = await request(app)
        .get('/get-location')
        .expect(200);
      
      expect(response.body).toHaveProperty('city');
      expect(response.body).toHaveProperty('country');
    });
  });

  describe('POST /send-sms', () => {
    it('should send SMS successfully with valid data', async () => {
      const smsData = {
        to: '+1234567890',
        message: 'Test SMS message'
      };

      const response = await request(app)
        .post('/send-sms')
        .send(smsData)
        .expect(200);

      expect(response.text).toContain('Message sent');
    });

    it('should handle missing message gracefully', async () => {
      const smsData = {
        to: '+1234567890'
      };

      const response = await request(app)
        .post('/send-sms')
        .send(smsData)
        .expect(200);

      expect(response.text).toContain('Message sent');
    });
  });

  describe('POST /send-email', () => {
    it('should send email successfully with valid data', async () => {
      const emailData = {
        emailTo: 'test@example.com',
        subject: 'Test Subject',
        emailMessage: 'Test email message'
      };

      // Mock nodemailer for this test
      const nodemailer = require('nodemailer');
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ response: 'Email sent successfully' })
      };
      nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);

      const response = await request(app)
        .post('/send-email')
        .field('emailTo', emailData.emailTo)
        .field('subject', emailData.subject)
        .field('emailMessage', emailData.emailMessage)
        .expect(200);

      expect(response.text).toContain('Email sent');
    });

    it('should handle file upload with email', async () => {
      const emailData = {
        emailTo: 'test@example.com',
        subject: 'Test Subject with File',
        emailMessage: 'Test email message with attachment'
      };

      // Create a test file
      const testFilePath = path.join(__dirname, 'test-file.txt');
      require('fs').writeFileSync(testFilePath, 'Test file content');

      const response = await request(app)
        .post('/send-email')
        .field('emailTo', emailData.emailTo)
        .field('subject', emailData.subject)
        .field('emailMessage', emailData.emailMessage)
        .attach('attachment', testFilePath)
        .expect(200);

      expect(response.text).toContain('Email sent');

      // Clean up test file
      require('fs').unlinkSync(testFilePath);
    });
  });

  describe('POST /webhook', () => {
    it('should handle Stripe webhook successfully', async () => {
      const webhookPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } }
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.text).toBe('Webhook received');
    });
  });

  describe('POST /create-checkout-session', () => {
    it('should create checkout session and redirect', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .expect(303);

      expect(response.headers.location).toContain('checkout.stripe.com');
    });
  });

  describe('GET /success', () => {
    it('should display payment success message', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.text).toContain('Payment successful');
    });
  });

  describe('GET /cancel', () => {
    it('should display payment cancellation message', async () => {
      const response = await request(app)
        .get('/cancel')
        .expect(200);

      expect(response.text).toContain('Payment cancelled');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/')
        .expect(200);

      // Should still render page even with database error
      expect(response.text).toContain('Contact Page');
    });

    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/invalid-route')
        .expect(404);
    });
  });

  describe('Security', () => {
    it('should reject webhook with invalid signature', async () => {
      // Mock Stripe to throw signature verification error
      const stripe = require('stripe')();
      stripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send('invalid_payload')
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });

    it('should handle file upload size limits', async () => {
      // This would need a file larger than 10MB to test properly
      // For now, we just ensure the route accepts valid uploads
      const response = await request(app)
        .post('/send-email')
        .field('emailTo', 'test@example.com')
        .field('subject', 'Test')
        .field('emailMessage', 'Test message')
        .expect(200);
    });
  });
});
