/**
 * Email Templates Module
 * 
 * Contains all email templates used throughout the application
 * Separates email content from business logic for better maintainability
 * 
 * @author j869
 * @version 1.0.0
 */

/**
 * Customer payment confirmation email template
 * 
 * @param {Object} data - Template data
 * @param {string} data.referenceNumber - Customer reference number
 * @param {Object} data.session - Stripe session object
 * @returns {Object} Email template with html and text versions
 */
function getCustomerPaymentConfirmationTemplate(data) {
    const { referenceNumber, session } = data;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed - Building Permit Estimate</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .payment-box { background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .reference-box { background: #fff; border: 2px solid #007bff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .reference-number { font-size: 24px; font-weight: bold; color: #007bff; font-family: 'Courier New', monospace; }
        .payment-details { font-size: 18px; font-weight: bold; color: #28a745; }
        .contact-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ Payment Confirmed!</h1>
        <p>Your building permit estimate has been purchased and your request is being processed</p>
    </div>
    
    <div class="content">
        <div class="payment-box">
            <div class="payment-details">Payment Successful: $55.00 AUD</div>
            <p><small>Transaction ID: ${session.payment_intent}</small></p>
            <p><small>Payment Method: ${session.payment_method_types ? session.payment_method_types.join(', ') : 'Card'}</small></p>
        </div>

        <div class="reference-box">
            <p><strong>Your Reference Number:</strong></p>
            <div class="reference-number">${referenceNumber}</div>
            <p><small>Please keep this number for your records and mention it when contacting us</small></p>
        </div>

        <div class="highlight">
            <strong>⏰ Response Time:</strong> We will contact you within 24 business hours with your detailed estimate.
        </div>

        <div class="contact-box">
            <h3>📞 Your Direct Contacts</h3>
            <p>
                📧 <strong>Alex:</strong> <a href="mailto:alex@buildingbb.com.au">alex@buildingbb.com.au</a><br>
                📧 <strong>Amanda:</strong> <a href="mailto:amandah@vicpa.com.au">amandah@vicpa.com.au</a><br>
                📱 <strong>Office:</strong> <a href="tel:0429815177">0429 815 177</a>
            </p>
        </div>

        <p><strong>What's Next?</strong></p>
        <ul>
            <li>Our expert team will review your project requirements</li>
            <li>We'll identify all applicable permits and regulations</li>
            <li>You'll receive a detailed cost breakdown and timeline</li>
            <li><strong>If you proceed with our full service, we'll credit the $55 back to your final bill!</strong></li>
        </ul>

        <p>Thank you for choosing our building permit expertise!</p>
        
        <p>Best regards,<br>
        <strong>The Building Permits Team</strong></p>
    </div>

    <div class="footer">
        <p>&copy; 2025 Building Permits Victoria | Licensed building surveyors serving all of Victoria</p>
    </div>
    e101
</body>
</html>`;

    const text = `Payment Confirmed - Building Permit Estimate

✅ PAYMENT SUCCESSFUL: $55.00 AUD
Transaction ID: ${session.payment_intent}

YOUR REFERENCE NUMBER: ${referenceNumber}
(Please keep this number for your records and mention it when contacting us)

RESPONSE TIME: We will contact you within 24 business hours with your detailed estimate.

YOUR DIRECT CONTACTS:
- Alex: alex@buildingbb.com.au
- Amanda: amandah@vicpa.com.au  
- Office: 0429 815 177

WHAT'S NEXT:
- Our expert team will review your project requirements
- We'll identify all applicable permits and regulations
- You'll receive a detailed cost breakdown and timeline
- If you proceed with our full service, we'll credit the $55 back!

Thank you for choosing our building permit expertise!

Best regards,
The Building Permits Team
Building Permits Victoria

e102`;

    return { html, text };
}

/**
 * Business notification email template for new paid estimate requests
 * 
 * @param {Object} data - Template data
 * @param {string} data.referenceNumber - Customer reference number
 * @param {string} data.subject - Email subject
 * @param {string} data.customerEmail - Customer email address
 * @param {string} data.clientIp - Customer IP address
 * @param {string} data.emailMessage - Customer request details
 * @param {Object} data.session - Stripe session object
 * @returns {Object} Email template with html and text versions
 */
function getBusinessNotificationTemplate(data) {
    const { referenceNumber, subject, customerEmail, clientIp, emailMessage, session } = data;
    
    const html = `
<h2>🎉 NEW PAID Building Permit Estimate Request</h2>

<div style="background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #28a745; margin-top: 0;">✅ PAYMENT CONFIRMED: $55.00 AUD</h3>
    <p><strong>Transaction ID:</strong> ${session.payment_intent}</p>
    <p><strong>Payment Status:</strong> ${session.payment_status}</p>
    <p><strong>Customer Email:</strong> ${customerEmail}</p>
</div>

<p><strong>Reference Number:</strong> ${referenceNumber}</p>
<p><strong>Subject:</strong> ${subject}</p>
<p><strong>Submitted:</strong> ${new Date().toLocaleString('en-AU')}</p>
<p><strong>Customer IP:</strong> ${clientIp}</p>

<hr>

<h3>Customer Request Details:</h3>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
<pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${emailMessage}</pre>
</div>

<hr>

<p><strong>Action Required:</strong> Please review and respond to the customer within 24 business hours.</p>
<p><strong>Customer Confirmation Email:</strong> ✅ Automatically sent to ${customerEmail}</p>
<p><strong>Payment Proof:</strong> ✅ $55.00 payment confirmed via Stripe</p>`;

    const text = `NEW PAID Building Permit Estimate Request

PAYMENT CONFIRMED: $55.00 AUD
Transaction ID: ${session.payment_intent}
Reference: ${referenceNumber}
Customer: ${customerEmail}

${emailMessage}

e103`;

    return { html, text };
}

/**
 * Callback request email template
 * 
 * @param {Object} data - Template data
 * @param {string} data.firstName - Customer first name
 * @param {string} data.phone - Customer phone number
 * @param {string} data.email - Customer email address
 * @param {string} data.message - Customer message/preferred callback time
 * @param {Date} data.currentDate - Submission timestamp
 * @param {string} data.clientIp - Customer IP address
 * @returns {Object} Email template with html and text versions
 */
function getCallbackRequestTemplate(data) {
    const { firstName, phone, email, message, currentDate, clientIp } = data;
    
    const html = `
<h2>📞 New Callback Request</h2>

<div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0;">
    <h3 style="color: #1976d2; margin-top: 0;">Customer Details</h3>
    <p><strong>Name:</strong> ${firstName}</p>
    <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
</div>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Best Time to Call:</h3>
    <p style="font-size: 16px;">${message}</p>
</div>

<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
    <p><strong>⏰ Submitted:</strong> ${currentDate.toLocaleString('en-AU')}</p>
    <p><strong>🌐 IP Address:</strong> ${clientIp}</p>
</div>

<hr>
<p><strong>Action Required:</strong> Please contact ${firstName} at ${phone} during their preferred time.</p>`;

    const text = `New Callback Request

Customer Details:
Name: ${firstName}
Phone: ${phone}
Email: ${email}

Best Time to Call: ${message}

Submitted: ${currentDate.toLocaleString('en-AU')}
IP Address: ${clientIp}

Action Required: Please contact ${firstName} at ${phone} during their preferred time.

e104`;

    return { html, text };
}

/**
 * System admin new customer alert email template
 * Creates a concise alert message for system administrators when a new estimate form is submitted
 * 
 * @param {Object} data - Template data
 * @param {Object} data.formData - Form data from request body
 * @param {string} data.referenceNumber - Generated reference number for tracking
 * @param {string} data.clientIp - Client IP address for security tracking
 * @returns {Object} Email template with html and text versions
 */
function sysAdminNewCustomerAlert(data) {
    const { formData, referenceNumber, clientIp } = data;
    const timestamp = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚨 New Estimate Form Submission Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert-header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .contact-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .project-box { background: #f3e5f5; border-left: 4px solid #9c27b0; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .action-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .reference { font-family: 'Courier New', monospace; font-weight: bold; font-size: 18px; color: #007bff; }
        .status { background: #fff3cd; padding: 10px; border-radius: 4px; font-weight: bold; color: #856404; }
    </style>
</head>
<body>
    <div class="alert-header">
        <h1>🚨 NEW ESTIMATE FORM SUBMISSION</h1>
        <p>Customer awaiting payment portal redirect</p>
    </div>
    
    <div class="content">
        <div class="info-box">
            <h3>📋 Submission Details</h3>
            <p><strong>Reference:</strong> <span class="reference">${referenceNumber}</span></p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <p><strong>Client IP:</strong> ${clientIp || 'Unknown'}</p>
            <p><strong>Status:</strong> <span class="status">Awaiting Payment</span></p>
        </div>`;

    if (formData.customerName || formData.customerEmail || formData.phone) {
        html += `
        <div class="contact-box">
            <h3>👤 Customer Contact</h3>`;
        if (formData.customerName) {
            html += `<p><strong>Name:</strong> ${formData.customerName}</p>`;
        }
        if (formData.customerEmail) {
            html += `<p><strong>Email:</strong> <a href="mailto:${formData.customerEmail}">${formData.customerEmail}</a></p>`;
        }
        if (formData.phone) {
            html += `<p><strong>Phone:</strong> <a href="tel:${formData.phone}">${formData.phone}</a></p>`;
        }
        html += `</div>`;
    }

    html += `
        <div class="project-box">
            <h3>🏗️ Project Summary</h3>`;
    
    if (formData.location) {
        html += `<p><strong>Location:</strong> ${formData.location}</p>`;
    }
    if (formData.foundation) {
        html += `<p><strong>Foundation Type:</strong> ${formData.foundation}</p>`;
    }
    if (formData.purpose) {
        html += `<p><strong>Primary Purpose:</strong> ${formData.purpose}</p>`;
    }
    
    // Storage items
    if (formData['storageItems[]']) {
        const storageItems = Array.isArray(formData['storageItems[]']) 
            ? formData['storageItems[]'] 
            : [formData['storageItems[]']];
        if (storageItems.length > 0) {
            html += `<p><strong>Storage Items:</strong> ${storageItems.join(', ')}</p>`;
        }
    }
    
    // Customer notes
    if (formData.additionalInfo && formData.additionalInfo.trim()) {
        html += `<p><strong>Customer Notes:</strong></p><div style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-style: italic;">${formData.additionalInfo.trim()}</div>`;
    }
    
    html += `</div>
        
        <div class="action-box">
            <h3>⚡ Next Steps</h3>
            <ul>
                <li>Customer will be redirected to payment portal</li>
                <li>Monitor payment completion notifications</li>
                <li>Full project details available in customer_purchases table</li>
                <li>Reference number: <strong>${referenceNumber}</strong></li>
            </ul>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
        <p style="text-align: center; color: #666; font-size: 14px;">
            This is an automated system notification.<br>
            Full form data is stored in the database for detailed review after payment.
        </p>
    </div>
</body>
</html>`;

    // Build text version
    let text = "🚨 NEW ESTIMATE FORM SUBMISSION ALERT\n\n";
    
    text += "SUBMISSION DETAILS:\n";
    text += `Reference: ${referenceNumber}\n`;
    text += `Timestamp: ${timestamp}\n`;
    text += `Client IP: ${clientIp || 'Unknown'}\n`;
    text += `Status: Awaiting Payment\n\n`;
    
    if (formData.customerName || formData.customerEmail || formData.phone) {
        text += "CUSTOMER CONTACT:\n";
        if (formData.customerName) {
            text += `Name: ${formData.customerName}\n`;
        }
        if (formData.customerEmail) {
            text += `Email: ${formData.customerEmail}\n`;
        }
        if (formData.phone) {
            text += `Phone: ${formData.phone}\n`;
        }
        text += "\n";
    }
    
    text += "PROJECT SUMMARY:\n";
    if (formData.location) {
        text += `Location: ${formData.location}\n`;
    }
    if (formData.foundation) {
        text += `Foundation Type: ${formData.foundation}\n`;
    }
    if (formData.purpose) {
        text += `Primary Purpose: ${formData.purpose}\n`;
    }
    
    if (formData['storageItems[]']) {
        const storageItems = Array.isArray(formData['storageItems[]']) 
            ? formData['storageItems[]'] 
            : [formData['storageItems[]']];
        if (storageItems.length > 0) {
            text += `Storage Items: ${storageItems.join(', ')}\n`;
        }
    }
    
    if (formData.additionalInfo && formData.additionalInfo.trim()) {
        text += `\nCustomer Notes: ${formData.additionalInfo.trim()}\n`;
    }
    
    text += "\n⚡ NEXT STEPS:\n";
    text += "• Customer will be redirected to payment portal\n";
    text += "• Monitor payment completion notifications\n";
    text += "• Full project details available in customer_purchases table\n";
    text += `• Reference number: ${referenceNumber}\n\n`;
    
    text += "---\n";
    text += "This is an automated system notification.\n";
    text += "Full form data is stored in the database for detailed review after payment.";

    return { html, text };
}

module.exports = {
    getCustomerPaymentConfirmationTemplate,
    getBusinessNotificationTemplate,
    getCallbackRequestTemplate,
    sysAdminNewCustomerAlert
};
