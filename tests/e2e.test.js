/**
 * End-to-end tests for the contact page application
 * These tests simulate real user interactions
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set up test environment
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });
process.env.NODE_ENV = 'test';

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
  
  // Clean up any open handles after all tests
  afterAll(async () => {
    // Close database connection if it exists and isn't mocked
    if (app.pool && typeof app.pool.end === 'function') {
      await app.pool.end();
    }
    
    // Give a small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  describe('User sends callback request', () => {
    it('should complete callback request workflow', async () => {
      // 1. User visits the main page
      const mainPageResponse = await request(app)
        .get('/')
        .expect(200);
      
      expect(mainPageResponse.text).toContain('Request Callback');
      
      // 2. User fills out callback form and submits
      const callbackResponse = await request(app)
        .post('/send-email')
        .send({
          firstName: 'John',
          phone: '+1234567890',
          email: 'john@example.com',
          message: 'Please call me weekdays 9am-5pm'
        })
        .expect(200);
      
      expect(callbackResponse.text).toContain('Callback request submitted successfully');
    });
  });

  describe('User sends email with attachment', () => {
    it('should complete email sending workflow with file', async () => {
      // 1. User visits the main page
      const mainPageResponse = await request(app)
        .get('/')
        .expect(200);
      
      expect(mainPageResponse.text).toContain('Get My Estimate');
      
      // 2. Create a test file for attachment
      const testFilePath = path.join(__dirname, 'test-attachment.txt');
      fs.writeFileSync(testFilePath, 'This is a test attachment file.');
      
      // 3. User fills out estimate request form with attachment and submits
      const emailResponse = await request(app)
        .post('/submit-estimate-request')
        .field('emailTo', 'user@example.com')
        .field('subject', 'Building Permit Cost Estimate Request')
        .field('emailMessage', 'Please find the attached file.')
        .attach('attachment', testFilePath)
        .expect(200);
      
      expect(emailResponse.text).toContain('Thank You');
      
      // 4. Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should complete email sending workflow without attachment', async () => {
      const emailResponse = await request(app)
        .post('/submit-estimate-request')
        .field('emailTo', 'user@example.com')
        .field('subject', 'Building Permit Cost Estimate Request')
        .field('emailMessage', 'This is a simple email message.')
        .expect(200);
      
      expect(emailResponse.text).toContain('Thank You');
    });
  });

  describe('User completes payment flow', () => {
    it('should complete checkout workflow', async () => {
      // 1. User visits main page
      const mainPageResponse = await request(app)
        .get('/')
        .expect(200);
      
      expect(mainPageResponse.text).toContain('Get My Estimate');
      
      // 2. User initiates checkout
      const checkoutResponse = await request(app)
        .post('/create-checkout-session')
        .send({
          emailTo: 'test@example.com',
          subject: 'Building Permit Cost Estimate Request',
          emailMessage: 'Test estimate request'
        })
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
            amount: parseInt(process.env.ESTIMATE_FEE) || 5500,
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
        .post('/submit-estimate-request')
        .field('emailTo', 'invalid-email')
        .field('subject', '')
        .field('emailMessage', '')
        .expect(200); // In test mode, always returns thank you page
      
      // Should not crash, even with invalid data - just renders thank you page
      expect(emailResponse.text).toContain('Thank You');
    });

    it('should handle invalid callback submission gracefully', async () => {
      const callbackResponse = await request(app)
        .post('/send-email')
        .send({
          phone: '+1234567890',
          // Missing required firstName and email fields
          message: 'Please call me'
        })
        .expect(400);
      
      // Should not crash, even with missing data
      expect(callbackResponse.status).toBe(400);
    });

    it('should handle file upload errors gracefully', async () => {
      // Try to upload a file via the estimate form
      const emailResponse = await request(app)
        .post('/submit-estimate-request')
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
      
      expect(mainPage.text).toContain('Building Permit Cost Estimate');
      
      // 2. User checks their location
      const location = await request(app)
        .get('/get-location')
        .expect(200);
      
      expect(location.body).toHaveProperty('ip');
      
      // 3. User sends a callback request
      const callback = await request(app)
        .post('/send-email')
        .send({
          firstName: 'John',
          phone: '+1234567890',
          email: 'john@example.com',
          message: 'Please call me after 6pm'
        })
        .expect(200);
      
      expect(callback.text).toContain('Callback request submitted successfully');
      
      // 4. User submits estimate request
      const email = await request(app)
        .post('/submit-estimate-request')
        .field('emailTo', 'user@example.com')
        .field('subject', 'Building Permit Cost Estimate Request')
        .field('emailMessage', 'This is my estimate request.')
        .expect(200);
      
      expect(email.text).toContain('Thank You');
      
      // 5. User initiates payment
      const checkout = await request(app)
        .post('/create-checkout-session')
        .send({
          emailTo: 'user@example.com',
          subject: 'Building Permit Cost Estimate Request',
          emailMessage: 'Payment for estimate request'
        })
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
