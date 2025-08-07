/**
 * Email Template Testing Script
 * 
 * Sends example emails of every template type to the admin email for review.
 * This script is designed to be reusable for testing email templates and layouts.
 * 
 * Usage: node test-email-templates.js
 * 
 * @author j869
 * @version 1.0.0
 */

require('dotenv').config();
const emailTemplates = require('./email-templates');
const nodemailer = require('nodemailer');

// Configure email transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

// Mock data for testing all email templates
const mockData = {
    // Customer and contact details
    customerName: 'John Test Customer',
    customerEmail: 'customer.test@example.com',
    phone: '0412345678',
    firstName: 'John',
    
    // Reference and tracking
    referenceNumber: 'BPA-TEST-' + Date.now(),
    
    // Form submission data
    foundation: 'concrete footings',
    location: 'suburban residential area',
    boundaryOffsets: '1.5m from all boundaries',
    dwellingOnProperty: 'yes',
    adjacentDwelling: 'no',
    purpose: 'storage shed',
    'storageItems[]': ['garden tools', 'lawn mower', 'bicycles'],
    buildingEnvelope: 'no',
    insideEnvelope: 'yes',
    easements: 'yes',
    overEasement: 'no',
    additionalInfo: 'Planning to build a 6x4m shed for garden storage. Need advice on council requirements.',
    
    // System metadata
    clientIp: '192.168.1.100',
    currentDate: new Date(),
    
    // Mock Stripe session
    session: {
        id: 'cs_test_session_123456',
        payment_intent: 'pi_test_intent_789',
        payment_status: 'paid',
        payment_method_types: ['card'],
        customer_details: {
            email: 'customer.test@example.com'
        },
        metadata: {
            customerName: 'John Test Customer',
            customerEmail: 'customer.test@example.com',
            customerPhone: '0412345678',
            referenceNumber: 'BPA-TEST-' + Date.now(),
            hasFullFormData: 'true'
        }
    },
    
    // Callback message
    message: 'Please call me between 9am-5pm weekdays. I have questions about shed requirements.'
};

/**
 * Send a test email with error handling
 */
async function sendTestEmail(templateName, emailData, description) {
    try {
        console.log(`\n📧 Sending ${templateName}...`);
        console.log(`   Description: ${description}`);
        
        const result = await transporter.sendMail({
            ...emailData,
            from: process.env.SMTP_EMAIL,
            to: process.env.ADMIN_EMAIL,
            subject: `[EMAIL TEST] ${emailData.subject || templateName}`
        });
        
        console.log(`   ✅ Success: ${result.messageId}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        return false;
    }
}

/**
 * Main function to send all email template examples
 */
async function sendAllEmailExamples() {
    console.log('🚀 Email Template Testing Script Started');
    console.log(`📬 Sending all email examples to: ${process.env.ADMIN_EMAIL}`);
    console.log(`🕒 Test started at: ${new Date().toLocaleString('en-AU')}\n`);
    
    let successCount = 0;
    let totalCount = 0;
    
    try {
        // 1. Admin Notification (ce2) - Form Submission Alert
        totalCount++;
        const adminAlert = emailTemplates.sysAdminNewCustomerAlertTemplate({
            formData: mockData,
            referenceNumber: mockData.referenceNumber,
            clientIp: mockData.clientIp
        });
        
        if (await sendTestEmail(
            'Admin Notification (ce2)',
            {
                subject: `🚨 New Estimate Request [Ref: ${mockData.referenceNumber}] - ${mockData.customerName}`,
                html: adminAlert.html,
                text: adminAlert.text
            },
            'Admin-only notification sent when customer submits estimate form (before payment)'
        )) successCount++;
        
        // 2. Customer Thank You (ce3) - Payment Success Receipt
        totalCount++;
        const customerThanks = emailTemplates.getCustomerThankyouEmailTemplate({
            referenceNumber: mockData.referenceNumber,
            session: mockData.session
        });
        
        if (await sendTestEmail(
            'Customer Thank You (ce3)',
            {
                subject: `Your confirmation receipt - Victorian Permit Applications [Ref: ${mockData.referenceNumber}]`,
                html: customerThanks.html,
                text: customerThanks.text
            },
            'Receipt email sent to customer after successful payment completion'
        )) successCount++;
        
        // 3. Permit Specialists Notification (ce5) - Business Processing
        totalCount++;
        const businessNotification = emailTemplates.getNotifyPermitEstimateProceedTemplate(mockData);
        
        if (await sendTestEmail(
            'Permit Specialists Notification (ce5)',
            {
                subject: businessNotification.subject,
                text: businessNotification.text
            },
            'Business notification sent to permit specialists after successful payment with customer files attached'
        )) successCount++;
        
        // 4. Callback Request (ce1) - Customer Support
        totalCount++;
        const callbackRequest = emailTemplates.getCallbackRequestTemplate({
            firstName: mockData.firstName,
            phone: mockData.phone,
            email: mockData.customerEmail,
            message: mockData.message,
            currentDate: mockData.currentDate,
            clientIp: mockData.clientIp
        });
        
        if (await sendTestEmail(
            'Callback Request (ce1)',
            {
                subject: `📞 Callback Request from ${mockData.firstName} (${mockData.phone})`,
                html: callbackRequest.html,
                text: callbackRequest.text
            },
            'Support request email sent when customer requests a callback'
        )) successCount++;
        
        // 5. Failed Purchase Recovery (ce4) - Session Expired
        totalCount++;
        const failedPurchase = emailTemplates.getFailedPurchaseEmailTemplate({
            referenceNumber: mockData.referenceNumber,
            customerEmail: mockData.customerEmail,
            customerName: mockData.customerName
        });
        
        if (await sendTestEmail(
            'Failed Purchase Recovery (ce4)',
            {
                subject: failedPurchase.subject,
                html: failedPurchase.html,
                text: failedPurchase.text
            },
            'Recovery email sent when customer\'s checkout session expires (Stripe webhook)'
        )) successCount++;
        
        // 6. Standalone buildEstimateEmailMessage function test
        totalCount++;
        const estimateMessage = emailTemplates.buildEstimateEmailMessage(mockData);
        
        if (await sendTestEmail(
            'Form Data Processing Test',
            {
                subject: `Form Data Processing Test - ${mockData.referenceNumber}`,
                text: `This tests the buildEstimateEmailMessage function:\n\n${estimateMessage}`
            },
            'Test of the form data to email message conversion function (part of ce5)'
        )) successCount++;
        
    } catch (error) {
        console.error(`💥 Fatal error during email testing: ${error.message}`);
    }
    
    // Summary report
    console.log(`\n📊 EMAIL TESTING SUMMARY`);
    console.log(`===============================`);
    console.log(`✅ Successful: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
    console.log(`📬 Recipient: ${process.env.ADMIN_EMAIL}`);
    console.log(`🕒 Completed: ${new Date().toLocaleString('en-AU')}`);
    
    if (successCount === totalCount) {
        console.log(`\n🎉 All email templates sent successfully!`);
        console.log(`📨 Check ${process.env.ADMIN_EMAIL} inbox for examples.`);
    } else {
        console.log(`\n⚠️  Some emails failed to send. Check SMTP configuration.`);
    }
    
    process.exit(successCount === totalCount ? 0 : 1);
}

// Run the email testing
if (require.main === module) {
    sendAllEmailExamples().catch(error => {
        console.error('💥 Script failed:', error.message);
        process.exit(1);
    });
}

module.exports = { sendAllEmailExamples, sendTestEmail };
