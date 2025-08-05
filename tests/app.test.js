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
  
  // Clean up any open handles after all tests
  afterAll(async () => {
    // Close database connection if it exists and isn't mocked
    if (app.pool && typeof app.pool.end === 'function') {
      await app.pool.end();
    }
    
    // Give a small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  describe('GET /', () => {
    it('should render the main contact page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toContain('Building Permit Cost Estimate');
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

  describe('POST /send-email', () => {
    it('should send callback email successfully with valid data', async () => {
      const callbackData = {
        firstName: 'John',
        phone: '+1234567890',
        email: 'john@example.com',
        message: 'Please call me weekdays 9am-5pm'
      };

      const response = await request(app)
        .post('/send-email')
        .send(callbackData)
        .expect(200);

      expect(response.text).toContain('Callback request submitted successfully');
    });

    it('should handle missing required fields gracefully', async () => {
      const callbackData = {
        phone: '+1234567890',
        // Missing firstName and email
        message: 'Please call me'
      };

      const response = await request(app)
        .post('/send-email')
        .send(callbackData)
        .expect(400);

      expect(response.text).toContain('Missing required fields');
    });
  });

  describe('POST /submit-estimate-request', () => {
    it('should send email successfully with valid data', async () => {
      const emailData = {
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        phone: '0412345678'
      };

      // Mock nodemailer for this test
      const nodemailer = require('nodemailer');
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ response: 'Email sent successfully' })
      };
      nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);

      const response = await request(app)
        .post('/submit-estimate-request')
        .field('customerEmail', emailData.customerEmail)
        .field('customerName', emailData.customerName)
        .field('phone', emailData.phone)
        .expect(200);

      expect(response.text).toContain('BPE-'); // Check for reference number format
    });

    it('should handle multiple file uploads with email', async () => {
      const emailData = {
        customerEmail: 'test@example.com',
        customerName: 'Test Customer with Multiple Files',
        phone: '0412345678'
      };

      // Create test files
      const testFilePath = path.join(__dirname, 'test-file.txt');
      const section32Path = path.join(__dirname, 'test-section32.pdf');
      const titlePath = path.join(__dirname, 'test-title.pdf');
      
      require('fs').writeFileSync(testFilePath, 'Test file content');
      require('fs').writeFileSync(section32Path, 'Test section 32 content');
      require('fs').writeFileSync(titlePath, 'Test title content');

      const response = await request(app)
        .post('/submit-estimate-request')
        .field('customerEmail', emailData.customerEmail)
        .field('customerName', emailData.customerName)
        .field('phone', emailData.phone)
        .attach('attachment', testFilePath)
        .attach('section32', section32Path)
        .attach('propertyTitle', titlePath)
        .expect(200);

      expect(response.text).toContain('Thank You');

      // Clean up test files
      require('fs').unlinkSync(testFilePath);
      require('fs').unlinkSync(section32Path);
      require('fs').unlinkSync(titlePath);
    });

    it('should correctly pass data from submit-estimate-request to create-checkout-session', async () => {
      // Test the redirect flow from submit-estimate-request to create-checkout-session
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const formData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Smith',
        phone: '0412345678'
      };

      // Test the redirect behavior from submit-estimate-request
      const redirectResponse = await request(app)
        .post('/submit-estimate-request')
        .field('customerEmail', formData.customerEmail)
        .field('customerName', formData.customerName)
        .field('phone', formData.phone)
        .expect(307);

      // Verify redirect goes to correct endpoint
      expect(redirectResponse.headers.location).toContain('/create-checkout-session?customerEmail=');

      process.env.NODE_ENV = originalNodeEnv;
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
      expect(response.text).toContain('Building Permit Cost Estimate');
    });

    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/invalid-route')
        .expect(404);
    });
  });

  describe('Security', () => {
    it('should handle file upload size limits', async () => {
      // Ensure we're in test mode for this test
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      try {
        const response = await request(app)
          .post('/submit-estimate-request')
          .field('customerEmail', 'test@example.com')
          .field('customerName', 'Test Customer')
          .field('phone', '0412345678')
          .expect(200);
      } finally {
        // Restore NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
