/**
 * Email Template Integration Tests
 * 
 * Tests that all email templates can be generated and sent successfully.
 * This runs as part of the main test suite to validate email functionality.
 */

const emailTemplates = require('../email-templates');
const { sendAllEmailExamples } = require('../test-email-templates');

describe('Email Template Integration Tests', () => {
    
    // Mock data for template testing
    const mockData = {
        customerName: 'Jest Test Customer',
        customerEmail: 'jest.test@example.com',
        phone: '0412345678',
        firstName: 'Jest',
        referenceNumber: 'BPA-JEST-' + Date.now(),
        foundation: 'concrete footings',
        location: 'test location',
        additionalInfo: 'Jest test additional information',
        clientIp: '127.0.0.1',
        currentDate: new Date(),
        session: {
            id: 'cs_jest_test_session',
            payment_intent: 'pi_jest_test_intent',
            payment_status: 'paid',
            customer_details: { email: 'jest.test@example.com' }
        },
        message: 'Jest test callback message'
    };

    describe('Template Generation', () => {
        
        test('should generate usage logging notification template', () => {
            const template = emailTemplates.getNotifyPermitEstimateProceedTemplate(mockData);
            
            expect(template).toHaveProperty('to');
            expect(template).toHaveProperty('subject');
            expect(template).toHaveProperty('text');
            expect(template.to).toBe(process.env.PERMIT_INBOX || 'permits@vicpa.com.au');
            expect(template.subject).toContain('NEW ESTIMATE REQUEST');
            expect(template.text).toContain('BUILDING PERMIT COST ESTIMATE REQUEST');
        });

        test('should generate callback request template', () => {
            const template = emailTemplates.getCallbackRequestTemplate({
                firstName: mockData.firstName,
                phone: mockData.phone,
                email: mockData.customerEmail,
                message: mockData.message,
                currentDate: mockData.currentDate,
                clientIp: mockData.clientIp
            });
            
            expect(template).toHaveProperty('html');
            expect(template).toHaveProperty('text');
            expect(template.html).toContain('New Callback Request');
            expect(template.text).toContain(mockData.firstName);
        });

        test('should generate job information template for permit specialists', () => {
            const template = emailTemplates.sysAdminNewCustomerAlertTemplate({
                formData: mockData,
                referenceNumber: mockData.referenceNumber,
                clientIp: mockData.clientIp
            });
            
            expect(template).toHaveProperty('html');
            expect(template).toHaveProperty('text');
            expect(template.html).toContain('NEW ESTIMATE SUBMISSION');
            expect(template.text).toContain(mockData.referenceNumber);
        });

        test('should generate customer thank you template', () => {
            const template = emailTemplates.getCustomerThankyouEmailTemplate({
                referenceNumber: mockData.referenceNumber,
                session: mockData.session
            });
            
            expect(template).toHaveProperty('html');
            expect(template).toHaveProperty('text');
            expect(template.html).toContain('Thank You for Your Purchase');
            expect(template.text).toContain(mockData.referenceNumber);
        });

        test('should generate failed purchase template', () => {
            const template = emailTemplates.getFailedPurchaseEmailTemplate({
                referenceNumber: mockData.referenceNumber,
                customerEmail: mockData.customerEmail,
                customerName: mockData.customerName
            });
            
            expect(template).toHaveProperty('html');
            expect(template).toHaveProperty('text');
            expect(template.html).toContain('Complete Your Building Permit Estimate');
            expect(template.text).toContain(mockData.referenceNumber);
        });

        test('should build estimate email message', () => {
            const message = emailTemplates.buildEstimateEmailMessage(mockData);
            
            expect(typeof message).toBe('string');
            expect(message).toContain('BUILDING PERMIT COST ESTIMATE REQUEST');
            expect(message).toContain('CONTACT INFORMATION');
            expect(message).toContain(mockData.customerName);
            expect(message).toContain(mockData.additionalInfo);
        });
    });

    describe('Template Data Validation', () => {
        
        test('should handle missing data gracefully', () => {
            const minimalData = { customerEmail: 'test@example.com' };
            
            // These should not throw errors
            expect(() => {
                emailTemplates.getNotifyPermitEstimateProceedTemplate(minimalData);
            }).not.toThrow();
            
            expect(() => {
                emailTemplates.buildEstimateEmailMessage(minimalData);
            }).not.toThrow();
        });

        test('should handle null/undefined data', () => {
            expect(() => {
                emailTemplates.buildEstimateEmailMessage(null);
            }).not.toThrow();
            
            expect(() => {
                emailTemplates.buildEstimateEmailMessage(undefined);
            }).not.toThrow();
        });
    });

    // Optional: Send actual emails during testing (only in specific environments)
    describe('Email Sending Integration', () => {
        
        test('should be able to send test emails (when SEND_TEST_EMAILS=true)', async () => {
            // Only run this test if explicitly requested via environment variable
            if (process.env.SEND_TEST_EMAILS === 'true') {
                console.log('\n🧪 Sending test emails as part of test suite...');
                
                // Mock the process.exit to prevent test suite from exiting
                const originalExit = process.exit;
                let exitCode = null;
                process.exit = (code) => { exitCode = code; };
                
                try {
                    await sendAllEmailExamples();
                    expect(exitCode).toBe(0); // Should exit with success
                } catch (error) {
                    // Restore process.exit and re-throw if there was an actual error
                    process.exit = originalExit;
                    throw error;
                } finally {
                    // Always restore process.exit
                    process.exit = originalExit;
                }
            } else {
                console.log('\n📧 Skipping email sending test (set SEND_TEST_EMAILS=true to enable)');
                expect(true).toBe(true); // Pass the test
            }
        }, 30000); // 30 second timeout for email sending
    });
});
