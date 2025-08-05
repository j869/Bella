/**
 * Stripe Integration Tests
 * Tests for Stripe payment processing functionality
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
      
      // Mock customer_purchases table queries
      if (query.includes('customer_purchases')) {
        const mockCustomerData = {
          id: 1,
          reference_number: 'BPE-TEST-12345',
          customer_email: 'test@example.com',
          customer_name: 'Test Customer',
          customer_phone: '0412345678',
          web_session_id: 'test-session-id',
          created_at: new Date(),
          last_seen_time: new Date()
        };
        
        if (query.includes('SELECT')) {
          const result = { rows: [mockCustomerData] };
          if (callback) callback(null, result);
          return Promise.resolve(result);
        } else {
          // INSERT/UPDATE queries
          const result = { rows: [], rowCount: 1 };
          if (callback) callback(null, result);
          return Promise.resolve(result);
        }
      }
      
      // Default mock for other queries
      const defaultResult = { rows: [] };
      if (callback) callback(null, defaultResult);
      return Promise.resolve(defaultResult);
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
    sendMail: jest.fn().mockResolvedValue({ 
      response: 'Email sent successfully',
      messageId: 'test-message-id'
    })
  }))
}));

// Mock Stripe with simpler implementation that properly resets between tests
const mockStripeInstance = {
  webhooks: {
    constructEvent: jest.fn()
  },
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn()
    }
  }
};

jest.mock('stripe', () => {
  return jest.fn(() => mockStripeInstance);
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

describe('Stripe Payment Integration', () => {
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_session_123',
      url: 'https://checkout.stripe.com/pay/cs_test_session_123',
      payment_intent: 'pi_test_123456',
      payment_status: 'unpaid',
      customer_details: { email: 'test@example.com' },
      metadata: {}
    });
    
    mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue({
      id: 'cs_test_session_123',
      payment_intent: 'pi_test_123456',
      payment_status: 'paid',
      customer_details: { email: 'test@example.com' },
      metadata: {
        referenceNumber: 'BPE-TEST-12345',
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        customerPhone: '0412345678'
      }
    });
    
    mockStripeInstance.webhooks.constructEvent.mockImplementation((body, sig, secret) => {
      if (sig === 'invalid_signature') {
        throw new Error('Invalid signature');
      }
      return {
        type: 'payment_intent.succeeded',
        data: { 
          object: { 
            id: 'pi_test_123456',
            amount: parseInt(process.env.ESTIMATE_FEE) || 5500,
            currency: 'aud',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
            receipt_email: 'test@example.com',
            payment_method_types: ['card']
          } 
        }
      };
    });
  });
  
  afterAll(async () => {
    // Close database connection if it exists
    if (app.pool && typeof app.pool.end === 'function') {
      await app.pool.end();
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /create-checkout-session', () => {
    it('should create Stripe checkout session with complete form data', async () => {
      const formData = {
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        customerPhone: '0412345678',
        referenceNumber: 'BPE-TEST-12345',
        hasFullFormData: true
      };

      const response = await request(app)
        .post('/create-checkout-session')
        .send(formData)
        .expect(303);

      // Verify redirect to Stripe
      expect(response.headers.location).toContain('checkout.stripe.com');
      
      // Verify Stripe session was created
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledTimes(1);
      
      // Verify the configuration passed to Stripe
      const stripeConfig = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
      expect(stripeConfig.customer_email).toBe(formData.customerEmail);
      expect(stripeConfig.metadata.customerEmail).toBe(formData.customerEmail);
      expect(stripeConfig.metadata.customerName).toBe(formData.customerName);
      expect(stripeConfig.metadata.customerPhone).toBe(formData.customerPhone);
      expect(stripeConfig.metadata.referenceNumber).toBe(formData.referenceNumber);
    });

    it('should create checkout session with database fallback when body is empty', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({})
        .expect(303);

      // Should still redirect to Stripe (using database fallback)
      expect(response.headers.location).toContain('checkout.stripe.com');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledTimes(1);
      
      // Verify metadata contains fallback values
      const stripeConfig = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
      expect(stripeConfig.metadata.customerEmail).toBe('test@example.com'); // From mocked DB
      expect(stripeConfig.metadata.referenceNumber).toBe('BPE-TEST-12345'); // From mocked DB
    });

    it('should handle missing customer email gracefully', async () => {
      const formData = {
        customerName: 'Test Customer',
        customerPhone: '0412345678',
        referenceNumber: 'BPE-TEST-12345'
        // Missing customerEmail
      };

      const response = await request(app)
        .post('/create-checkout-session')
        .send(formData)
        .expect(303);

      expect(response.headers.location).toContain('checkout.stripe.com');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledTimes(1);
      
      // Should use database fallback for missing email
      const stripeConfig = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
      expect(stripeConfig.customer_email).toBe('test@example.com'); // From DB fallback
    });

    it('should handle Stripe API errors gracefully', async () => {
      // Mock Stripe to throw an error
      mockStripeInstance.checkout.sessions.create.mockRejectedValueOnce(new Error('Stripe API error'));

      const formData = {
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        customerPhone: '0412345678',
        referenceNumber: 'BPE-TEST-12345'
      };

      const response = await request(app)
        .post('/create-checkout-session')
        .send(formData)
        .expect(500);

      expect(response.text).toContain('Error creating payment session');
    });
  });

  describe('GET /success', () => {
    it('should process successful payment and render thank you page', async () => {
      const sessionId = 'cs_test_session_123';
      
      const response = await request(app)
        .get('/success')
        .query({ session_id: sessionId })
        .expect(200);

      // Verify Stripe session was retrieved
      expect(mockStripeInstance.checkout.sessions.retrieve).toHaveBeenCalledWith(sessionId);
      
      // Verify thank you page is rendered with reference number
      expect(response.text).toContain('BPE-TEST-12345');
    });

    it('should handle successful payment without session ID', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.text).toContain('Payment successful! Thank you for your purchase.');
    });

    it('should handle missing customer email in session', async () => {
      // Mock session without customer email
      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValueOnce({
        id: 'cs_test_session_123',
        payment_intent: 'pi_test_123456',
        payment_status: 'paid',
        metadata: {}
      });

      const response = await request(app)
        .get('/success')
        .query({ session_id: 'cs_test_session_123' })
        .expect(200);

      expect(response.text).toContain('Payment successful!');
      expect(response.text).toContain('pi_test_123456'); // Should show transaction ID
    });
  });

  describe('GET /cancel', () => {
    it('should handle payment cancellation', async () => {
      const response = await request(app)
        .get('/cancel')
        .expect(200);

      expect(response.text).toContain('Payment cancelled');
      expect(response.text).toContain('Please try again');
    });
  });

  describe('POST /webhook', () => {
    it('should handle payment_intent.succeeded webhook', async () => {
      const webhookPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { 
          object: { 
            id: 'pi_test_123456',
            amount: parseInt(process.env.ESTIMATE_FEE) || 5500,
            currency: 'aud',
            status: 'succeeded'
          } 
        }
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'valid_signature')
        .set('content-type', 'application/json')
        .send(webhookPayload)
        .expect(200);

      expect(response.text).toBe('Webhook received');
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        'valid_signature',
        process.env.STRIPE_WEBHOOK_SECRET
      );
    });

    it('should handle charge.succeeded webhook', async () => {
      // Mock webhook to return charge.succeeded event
      mockStripeInstance.webhooks.constructEvent.mockReturnValueOnce({
        type: 'charge.succeeded',
        data: { 
          object: { 
            id: 'ch_test_123456',
            amount: parseInt(process.env.ESTIMATE_FEE) || 5500,
            currency: 'aud',
            status: 'succeeded'
          } 
        }
      });

      const webhookPayload = JSON.stringify({
        type: 'charge.succeeded',
        data: { object: { id: 'ch_test_123456' } }
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'valid_signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.text).toBe('Webhook received');
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } }
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(webhookPayload)
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });

    it('should handle unrecognized webhook events', async () => {
      // Mock webhook to return unknown event type
      mockStripeInstance.webhooks.constructEvent.mockReturnValueOnce({
        type: 'unknown.event.type',
        data: { object: { id: 'unknown_123456' } }
      });

      const webhookPayload = JSON.stringify({
        type: 'unknown.event.type',
        data: { object: { id: 'unknown_123456' } }
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'valid_signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.text).toBe('Webhook received');
    });
  });

  describe('Redirect Flow Integration', () => {
    it('should handle complete estimate request to payment flow', async () => {
      // Temporarily set to production mode to test redirect
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        const formData = {
          customerEmail: 'integration@example.com',
          customerName: 'Integration Test',
          phone: '0487654321'
        };

        // Use agent to maintain session across requests
        const agent = request.agent(app);

        // Step 1: Submit estimate request (should redirect to checkout)
        const submitResponse = await agent
          .post('/submit-estimate-request')
          .field('customerEmail', formData.customerEmail)
          .field('customerName', formData.customerName)
          .field('phone', formData.phone)
          .expect(307);

        // Verify redirect URL
        expect(submitResponse.headers.location).toContain('/create-checkout-session?customerEmail=');

        // Step 2: Follow redirect to create checkout session
        const checkoutResponse = await agent
          .post('/create-checkout-session')
          .send({
            customerEmail: formData.customerEmail,
            customerName: formData.customerName,
            customerPhone: formData.phone,
            referenceNumber: 'BPE-INTEGRATION-TEST',
            hasFullFormData: true
          })
          .expect(303);

        // Verify checkout session creation
        expect(checkoutResponse.headers.location).toContain('checkout.stripe.com');
        expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledTimes(1);

        // Verify form data was preserved in metadata
        const stripeConfig = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
        expect(stripeConfig.metadata.customerEmail).toBe(formData.customerEmail);
        expect(stripeConfig.metadata.customerName).toBe(formData.customerName);
        expect(stripeConfig.metadata.customerPhone).toBe(formData.phone);

      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('should handle database recovery when redirect loses form data', async () => {
      // Test scenario where redirect doesn't preserve form data
      const response = await request(app)
        .post('/create-checkout-session')
        .send({}) // Empty body to trigger database recovery
        .expect(303);

      expect(response.headers.location).toContain('checkout.stripe.com');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledTimes(1);
      
      // Verify database fallback was used
      const stripeConfig = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
      expect(stripeConfig.metadata.customerEmail).toBe('test@example.com'); // From mocked DB
    });
  });

  describe('Error Recovery', () => {
    it('should handle database errors during customer lookup', async () => {
      // Mock database to throw error
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/create-checkout-session')
        .send({})
        .expect(303);

      // Should still create session with fallback values
      expect(response.headers.location).toContain('checkout.stripe.com');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors in success page', async () => {
      // Mock database to throw error during customer update
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query.mockRejectedValueOnce(new Error('Database update failed'));

      const response = await request(app)
        .get('/success')
        .query({ session_id: 'cs_test_session_123' })
        .expect(200);

      // Should still render thank you page despite database error
      expect(response.text).toContain('BPE-TEST-12345');
    });
  });
});
