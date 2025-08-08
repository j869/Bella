# Testing Documentation

This document describes the testing strategy and setup for the Contact Page application.

## Test Structure

The test suite is organized into several categories:

### 1. Unit Tests (`tests/utils.test.js`)
- Tests individual functions and utility methods
- IP address extraction logic
- Message validation
- File upload handling
- Configuration building

### 2. Integration Tests (`tests/app.test.js`)
- Tests API endpoints with mocked dependencies
- Route handling and middleware
- Error handling scenarios
- Security features

### 3. Database Tests (`tests/database.test.js`)
- Database connection testing
- CRUD operations on history table
- Error handling for database failures

### 4. End-to-End Tests (`tests/e2e.test.js`)
- Complete user workflow testing
- Multi-step user journeys
- Real interaction simulations

## Running Tests

### Install Test Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test Files
```bash
# Unit tests only
npx jest tests/utils.test.js

# Integration tests only
npx jest tests/app.test.js

# Database tests only
npx jest tests/database.test.js

# E2E tests only
npx jest tests/e2e.test.js
```

## Test Configuration

### Environment Variables
The tests use mock environment variables to avoid requiring real service credentials:

```javascript
process.env.PG_USER = 'test_user';
process.env.PG_HOST = 'localhost';
process.env.PG_DATABASE = 'test_db';
process.env.PG_PASSWORD = 'test_password';
process.env.PG_PORT = '5432';
process.env.TWILIO_ACCOUNT_SID = 'test_sid';
process.env.TWILIO_ACCESS_TOKEN = 'test_token';
process.env.SMTP_EMAIL = 'test@example.com';
process.env.SMTP_PASSWORD = 'test_password';
// Note: Stripe keys are test keys for security
```

### Mocked Services
The following external services are mocked in tests:

- **PostgreSQL**: Database operations
- **Twilio**: SMS sending
- **Nodemailer**: Email sending
- **Stripe**: Payment processing
- **Axios**: HTTP requests for location data

## Test Scenarios

### SMS Functionality
- ✅ Send SMS with valid data
- ✅ Handle missing message content
- ✅ Database logging of SMS messages
- ✅ Error handling for SMS failures

### Email Functionality
- ✅ Send email with text content
- ✅ Send email with file attachments
- ✅ Handle multiple file types
- ✅ Database logging of email messages
- ✅ Error handling for email failures

### Payment Processing
- ✅ Create Stripe checkout sessions
- ✅ Handle successful payments
- ✅ Handle payment cancellations
- ✅ Process webhook events
- ✅ Webhook signature verification

### Security Testing
- ✅ File upload size limits
- ✅ SQL injection prevention
- ✅ Webhook signature validation
- ✅ Input validation and sanitization

### Error Handling
- ✅ Database connection failures
- ✅ Invalid API credentials
- ✅ Network timeouts
- ✅ Malformed requests
- ✅ File upload errors

## Coverage Goals

The test suite aims for:
- **90%+ code coverage** on core functionality
- **100% coverage** on critical security features
- **Full coverage** of all API endpoints
- **Error path coverage** for all external service integrations

## Running Tests in CI/CD

For continuous integration, use:

```bash
# Install dependencies
npm ci

# Run tests with coverage
npm run test:coverage

# Check coverage thresholds
npx jest --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

## Test Data Management

### Database Tests
- Use transaction rollbacks for database tests
- Create test-specific data that doesn't interfere with production
- Mock database connections when integration database is unavailable

### File Upload Tests
- Create temporary test files
- Clean up test files after execution
- Test various file types and sizes

### External Service Tests
- Use service-specific test credentials when available
- Mock all external API calls
- Test both success and failure scenarios

## Debugging Tests

### Run Tests with Debug Output
```bash
npx jest --verbose
```

### Run Single Test with Debug
```bash
npx jest tests/app.test.js --verbose
```

### Debug Failing Tests
```bash
# Run only failing tests
npx jest --onlyFailures

# Run tests with increased timeout
npx jest --testTimeout=10000
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies consistently
3. **Cleanup**: Clean up resources after tests
4. **Assertions**: Use specific, meaningful assertions
5. **Coverage**: Aim for high coverage without sacrificing quality
6. **Speed**: Keep tests fast by avoiding unnecessary delays
7. **Reliability**: Tests should pass consistently

## Adding New Tests

When adding new functionality:

1. Write unit tests for new utility functions
2. Add integration tests for new endpoints
3. Update E2E tests for new user workflows
4. Ensure all error paths are tested
5. Update this documentation

## Test Environment Setup

For local development:

1. Ensure Node.js and npm are installed
2. Install dependencies: `npm install`
3. Set up test database (optional for most tests)
4. Run tests: `npm test`

The test suite is designed to run without requiring external services, making it easy for developers to run tests locally.
