/**
 * Test setup file
 * Runs before all tests to set up the testing environment
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  // Keep log method for debugging
  log: jest.fn(),
  // Mock other methods to reduce noise
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress warnings about deprecated features in test environment
process.env.NODE_NO_WARNINGS = '1';
