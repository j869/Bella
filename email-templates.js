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
 * Business notification email template for permit specialist
 * Called when customer successfully completes payment for permit estimate
 * 
 * @param {Object} data - Customer data object with form submission details
 * @param {string} data.customerName - Customer's full name
 * @param {string} data.customerEmail - Customer's email address
 * @param {string} data.phone - Customer's phone number
 * @returns {Object} Email configuration object with recipient, subject, and body
 */
function getNotifyPermitEstimateProceedTemplate(data) {
    const feeAmount = ((process.env.ESTIMATE_FEE || 5500) / 100).toFixed(2);
    
    // Use the detailed form data to build comprehensive message
    const detailedMessage = buildEstimateEmailMessage(data);
    
    return {
        to: process.env.PERMIT_INBOX || 'permits@vicpa.com.au',
        subject: `NEW ESTIMATE REQUEST: ${data.customerName || 'Unknown Customer'}`,
        text: detailedMessage
    };
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
<p><strong>Action Required:</strong> Please contact ${firstName} at ${phone} during their preferred time.</p>
<p style="text-align: center; color: #999; font-size: 11px; margin-top: 20px;">This email was system generated - ce1</p>`;

    const text = `New Callback Request

Customer Details:
Name: ${firstName}
Phone: ${phone}
Email: ${email}

Best Time to Call: ${message}

Submitted: ${currentDate.toLocaleString('en-AU')}
IP Address: ${clientIp}

Action Required: Please contact ${firstName} at ${phone} during their preferred time.

This email was system generated - ce1`;    return { html, text };
}

/**
 * System admin new customer alert email template
 * Creates a concise alert message for system administrators when a new estimate form is submitted
 * NOTE: This is a debugging email and will not be necessary long term. 
 * It is designed to catch the first few live customers and track their progression through the system to ensure good UI.
 * 
 * @param {Object} data - Template data
 * @param {Object} data.formData - Form data from request body
 * @param {string} data.referenceNumber - Generated reference number for tracking
 * @param {string} data.clientIp - Client IP address for security tracking
 * @returns {Object} Email template with html and text versions
 */
function sysAdminNewCustomerAlertTemplate(data) {
    const { formData, processedFormData, referenceNumber, clientIp } = data;
    const timestamp = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✨ New Estimate Form Submission</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2d3748; max-width: 650px; margin: 0 auto; padding: 20px; background: #f7fafc; }
        .celebration-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 16px 16px 0 0; box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3); }
        .content { background: white; padding: 25px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
        .info-box { background: linear-gradient(135deg, #f8faff 0%, #e8f4fd 100%); border: none; padding: 20px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1); }
        .contact-box { background: linear-gradient(135deg, #fff8e1 0%, #f3e5f5 100%); border: none; padding: 20px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(156, 39, 176, 0.1); }
        .project-box { background: linear-gradient(135deg, #f3e5f5 0%, #e1f5fe 100%); border: none; padding: 20px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(156, 39, 176, 0.1); }
        .action-box { background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%); border: none; padding: 20px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.1); }
        .reference { font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; font-weight: bold; font-size: 20px; color: #667eea; background: white; padding: 8px 12px; border-radius: 8px; display: inline-block; }
        .status { background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); color: white; padding: 12px 20px; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3); }
        .answer-highlight { background: white; border-left: 4px solid #667eea; padding: 12px 20px; margin: 8px 0; border-radius: 8px; font-size: 16px; font-weight: 600; color: #2d3748; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); }
        .section-title { color: #667eea; font-size: 18px; font-weight: 700; margin-bottom: 15px; display: flex; align-items: center; }
        .notes-section { background: #fafafa; border-radius: 8px; padding: 15px; margin: 10px 0; font-style: italic; border-left: 4px solid #9c27b0; }
    </style>
</head>
<body>
    <div class="celebration-header">
        <h1>✨ NEW ESTIMATE SUBMISSION</h1>
        <p style="margin: 5px 0; opacity: 0.9;">A new customer is ready to proceed</p>
    </div>
    
    <div class="content">
        <div class="info-box">
            <h3>📋 Submission Details</h3>
            <p><strong>Reference:</strong> <span class="reference">${referenceNumber}</span></p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <p><strong>Client IP:</strong> ${clientIp || 'Unknown'}</p>
            <p><strong>Status:</strong> <span class="status">Awaiting Payment</span></p>
        </div>`;

    // Dynamic form data rendering - contact information
    const contactFields = processedFormData.filter(item => 
        ['Customer Name', 'Email Address', 'Phone Number', 'Street Address'].includes(item.question)
    );
    
    if (contactFields.length > 0) {
        html += `
        <div class="contact-box">
            <h3 class="section-title">👤 Customer Contact</h3>`;
        contactFields.forEach(item => {
            if (item.question === 'Email Address') {
                html += `<div class="answer-highlight">${item.question}: <a href="mailto:${item.answer}" style="color: #667eea; text-decoration: none;">${item.answer}</a></div>`;
            } else if (item.question === 'Phone Number') {
                html += `<div class="answer-highlight">${item.question}: <a href="tel:${item.answer}" style="color: #667eea; text-decoration: none;">${item.answer}</a></div>`;
            } else if (item.question === 'Street Address') {
                html += `<div class="answer-highlight">${item.question}: ${item.answer}`;
                
                // Add address validation information if available
                if (item.quality) {
                    const qualityColor = item.quality === 'high' ? '#28a745' : 
                                       item.quality === 'medium' ? '#ffc107' : '#dc3545';
                    html += `
                        <div style="margin-top: 8px; font-size: 13px;">
                            <span style="background: ${qualityColor}; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold;">
                                ${item.quality.toUpperCase()} QUALITY
                            </span>
                            ${item.method ? ` (${item.method.replace(/-/g, ' ')})` : ''}
                        </div>`;
                    
                    // Special handling for unmapped addresses (new developments, rural properties)
                    const isUnmappedAddress = item.method && (
                        item.method.includes('regex-subdivision') ||
                        item.method.includes('regex-rural') ||
                        item.method.includes('regex-urban')
                    );
                    
                    if (isUnmappedAddress) {
                        let alertMessage = '';
                        let alertColor = '#007bff';
                        
                        if (item.method.includes('subdivision')) {
                            alertMessage = '🏘️ NEW SUBDIVISION: May be a recently developed area not yet in mapping databases.';
                        } else if (item.method.includes('rural')) {
                            alertMessage = '🌾 RURAL PROPERTY: Remote/agricultural property - normal to be unmapped.';
                            alertColor = '#28a745';
                        } else if (item.method.includes('urban')) {
                            alertMessage = '🏠 UNMAPPED URBAN: Address format valid but not found in database - may need verification.';
                            alertColor = '#ffc107';
                        }
                        
                        if (alertMessage) {
                            html += `
                                <div style="margin-top: 8px; padding: 8px 12px; background-color: #f8f9fa; border-left: 4px solid ${alertColor}; border-radius: 4px; font-size: 12px; font-weight: 500;">
                                    ${alertMessage}
                                </div>`;
                        }
                    }
                    
                    if (item.original && item.original !== item.answer) {
                        html += `
                            <div style="margin-top: 5px; font-size: 11px; color: #666; font-style: italic;">
                                Original input: ${item.original}
                            </div>`;
                    }
                }
                html += `</div>`;
            } else {
                html += `<div class="answer-highlight">${item.question}: ${item.answer}</div>`;
            }
        });
        html += `</div>`;
    }

    // Dynamic form data rendering - project details
    const projectFields = processedFormData.filter(item => 
        !['Customer Name', 'Email Address', 'Phone Number', 'Street Address'].includes(item.question)
    );
    
    if (projectFields.length > 0) {
        html += `
        <div class="project-box">
            <h3 class="section-title">🏗️ Project Summary</h3>`;
        
        projectFields.forEach(item => {
            if (item.question === 'Additional Information') {
                html += `<div class="answer-highlight">${item.question}:</div><div class="notes-section">${item.answer}</div>`;
            } else {
                html += `<div class="answer-highlight">${item.question}: ${item.answer}</div>`;
            }
        });
        
        html += `</div>`;
    }
    
    html += `
        <div class="action-box">
            <h3 class="section-title">⚡ Next Steps</h3>
            <div class="answer-highlight">Customer will be redirected to payment portal</div>
            <div class="answer-highlight">Monitor payment completion notifications</div>
            <div class="answer-highlight">Full project details available in customer_purchases table</div>
            <div class="answer-highlight">Reference number: <strong>${referenceNumber}</strong></div>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
        <p style="text-align: center; color: #666; font-size: 14px;">
            This is an automated system notification.<br>
            Full form data is stored in the database for detailed review after payment.
        </p>
        <p style="text-align: center; color: #999; font-size: 11px; margin-top: 10px;">This email was system generated - ce5</p>
    </div>
</body>
</html>`;

    // Build text version - Dynamic raw format
    let text = "✨ NEW ESTIMATE FORM SUBMISSION\n\n";
    
    text += "SUBMISSION DETAILS:\n";
    text += `Reference: ${referenceNumber}\n`;
    text += `Timestamp: ${timestamp}\n`;
    text += `Client IP: ${clientIp || 'Unknown'}\n`;
    text += `Status: Awaiting Payment\n\n`;
    
    // Dynamic raw format rendering
    text += "FORM DATA (Raw Format):\n";
    processedFormData.forEach(item => {
        text += `- ${item.question}: ${item.answer}\n`;
    });
    
    text += "\n⚡ NEXT STEPS:\n";
    text += "• Customer will be redirected to payment portal\n";
    text += "• Monitor payment completion notifications\n";
    text += "• Full project details available in customer_purchases table\n";
    text += `• Reference number: ${referenceNumber}\n\n`;
    
    text += "---\n";
    text += "This is an automated system notification.\n";
    text += "Full form data is stored in the database for detailed review after payment.\n";
    text += "This email was system generated - ce5";

    return { 
        html, 
        text,
        to: process.env.ADMIN_EMAIL || 'john@buildingbb.com.au',
        subject: `✨ NEW ESTIMATE SUBMISSION - ${referenceNumber}`
    };
}

/**
 * Customer thank you email template
 * This is the only success email that the customer needs to receive if everything went right.
 * Key to customer interaction and should contain all information for a good sales experience 
 * and act as a return point if the customer searches their inbox for us in the distant future.
 * 
 * @param {Object} data - Template data
 * @param {string} data.referenceNumber - Customer reference number
 * @param {Object} data.session - Stripe session object with payment details
 * @returns {Object} Email template with html and text versions
 */
function getCustomerThankyouEmailTemplate(data) {
    const { referenceNumber, session } = data;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You - Victorian Permit Applications</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .payment-box { background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .reference-box { background: #fff; border: 2px solid #007bff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .reference-number { font-size: 24px; font-weight: bold; color: #007bff; font-family: 'Courier New', monospace; }
        .payment-details { font-size: 18px; font-weight: bold; color: #28a745; }
        .contact-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #28a745; }
        .highlight { background: #ffc107; color: #000; padding: 15px; border-radius: 4px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
        .next-steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-top: 3px solid #dc3545; }
        .step-list { margin: 15px 0; }
        .step-list li { margin: 8px 0; }
        .contact-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0; }
        .amount { font-size: 20px; font-weight: bold; color: #28a745; }
        .transaction-id { font-family: 'Courier New', monospace; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Thank You for Your Purchase!</h1>
        <p>Your building permit estimate request has been received and payment confirmed</p>
    </div>
    
    <div class="content">
        <div class="payment-box">
            <div class="payment-details">✅ Payment Confirmed</div>
            <div class="amount">$${((process.env.ESTIMATE_FEE) / 100).toFixed(2)} AUD</div>
            <div class="transaction-id">Transaction ID: ${session.payment_intent || session.id}</div>
        </div>
        
        <div class="reference-box">
            <p><strong>Your Reference Number:</strong></p>
            <div class="reference-number">${referenceNumber}</div>
            <p style="margin-top: 15px; color: #666; font-size: 14px;">
                Please keep this reference number for your records
            </p>
        </div>
        
        <div class="highlight">
            🚀 Your building permit estimate is now being processed by our expert team!
        </div>
        
        <div class="next-steps">
            <h3 style="color: #dc3545; margin-top: 0;">📋 What Happens Next?</h3>
            <ul class="step-list">
                <li><strong>Within 24-48 hours:</strong> Our team will review your project details</li>
                <li><strong>Initial Assessment:</strong> We'll analyze your building requirements and local council regulations</li>
                <li><strong>Cost Estimation:</strong> Detailed breakdown of permit fees and processing costs</li>
                <li><strong>Expert Guidance:</strong> Recommendations for smooth permit approval</li>
                <li><strong>Direct Contact:</strong> Personal consultation if needed</li>
            </ul>
        </div>
        
        <div class="contact-box">
            <h3 style="color: #28a745; margin-top: 0;">📞 Need Help? Contact Our Team</h3>
            <div class="contact-info">
                <p><strong>Email:</strong> ${process.env.PERMIT_INBOX || 'permits@vicpa.com.au'}</p>
                <p><strong>Phone:</strong> 0429 815 177</p>
                <p><strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM AEST</p>
            </div>
            <p style="margin-top: 15px; color: #666; font-size: 14px;">
                <em>Our permit specialists are here to guide you through every step of the process</em>
            </p>
        </div>
        
        <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h4 style="color: #007bff; margin-top: 0;">💡 Pro Tip</h4>
            <p style="margin-bottom: 0;">
                Start gathering your building plans and site documentation now. 
                Our team will provide a detailed checklist of required documents based on your specific project.
            </p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Victorian Permit Applications</strong></p>
        <p>Making building permits simple and stress-free</p>
        <p style="font-size: 12px; color: #999;">
            This is an automated confirmation email. If you have any questions, please contact us using the details above.
        </p>
        <p style="font-size: 11px; color: #ccc; margin-top: 10px;">This email was system generated - ce3</p>
    </div>
</body>
</html>`;

    const text = `
VICTORIAN PERMIT APPLICATIONS - PAYMENT CONFIRMATION

Thank you for your purchase!

PAYMENT DETAILS:
✅ Payment Confirmed: $${((process.env.ESTIMATE_FEE) / 100).toFixed(2)} AUD
Transaction ID: ${session.payment_intent || session.id}

YOUR REFERENCE NUMBER: ${referenceNumber}
(Please keep this reference number for your records)

WHAT HAPPENS NEXT?
• Within 24-48 hours: Our team will review your project details
• Initial Assessment: We'll analyze your building requirements and local council regulations  
• Cost Estimation: Detailed breakdown of permit fees and processing costs
• Expert Guidance: Recommendations for smooth permit approval
• Direct Contact: Personal consultation if needed

CONTACT OUR TEAM:
Email: ${process.env.PERMIT_INBOX || 'permits@vicpa.com.au'}
Phone: 0429 815 177
Business Hours: Monday - Friday, 9:00 AM - 5:00 PM AEST

PRO TIP: Start gathering your building plans and site documentation now. Our team will provide a detailed checklist of required documents based on your specific project.

---
Victorian Permit Applications
Making building permits simple and stress-free

This is an automated confirmation email. If you have any questions, please contact us using the details above.

This email was system generated - ce3
`;

    return { html, text };
}

/**
 * Build detailed estimate email message from form data
 * Transforms form data into comprehensive email content for permit specialists
 * 
 * @param {Object} formData - Form data from estimate request
 * @returns {string} Formatted email message with all form details
 */
function buildEstimateEmailMessage(formData) {
    if (!formData) return 'BUILDING PERMIT COST ESTIMATE REQUEST\n\nNo form data provided';
    
    let message = 'BUILDING PERMIT COST ESTIMATE REQUEST\n\n';
    
    // Contact Information Section
    message += 'CONTACT INFORMATION:\n';
    if (formData.customerName) {
        message += `Name: ${formData.customerName}\n`;
    } else {
        message += 'Name: Not provided\n';
    }
    if (formData.customerEmail || formData.emailTo) {
        message += `Email: ${formData.customerEmail || formData.emailTo}\n`;
    }
    if (formData.phone) {
        message += `Phone: ${formData.phone}\n`;
    }
    message += '\n';
    
    // Construction Details Section
    if (formData.foundation) {
        message += 'CONSTRUCTION DETAILS:\n';
        message += `Foundation: ${formData.foundation}\n`;
        message += '\n';
    } else if (!formData.customerName && !formData.purpose) {
        // For minimal forms, show defaults
        message += 'CONSTRUCTION DETAILS:\n';
        message += 'Foundation: Not specified\n';
        message += '\n';
    }
    
    // Location & Setbacks Section  
    if (formData.location || formData.boundaryOffsets) {
        message += 'LOCATION & SETBACKS:\n';
        if (formData.location) {
            message += `Location: ${formData.location}\n`;
        }
        if (formData.boundaryOffsets) {
            message += `Boundary offsets: ${formData.boundaryOffsets}\n`;
        }
        message += '\n';
    } else if (!formData.customerName && !formData.purpose) {
        // For minimal forms, show defaults
        message += 'LOCATION & SETBACKS:\n';
        message += 'Location: Not specified\n';
        message += 'Boundary offsets: Not answered\n';
        message += '\n';
    }
    
    // Dwelling Information Section
    if (formData.dwellingOnProperty || formData.adjacentDwelling) {
        message += 'DWELLING INFORMATION:\n';
        if (formData.dwellingOnProperty) {
            message += `Dwelling on property: ${formData.dwellingOnProperty}\n`;
        }
        if (formData.adjacentDwelling) {
            message += `Adjacent dwelling: ${formData.adjacentDwelling}\n`;
        }
        if (formData.dwellingOnProperty === 'no') {
            message += 'Dwelling permitted: unknown\n';
        }
        message += '\n';
    }
    
    // Building Envelope & Easements Section (combined)
    if (formData.buildingEnvelope || formData.easements) {
        message += 'BUILDING ENVELOPE & EASEMENTS:\n';
        if (formData.buildingEnvelope) {
            message += `Building envelope: ${formData.buildingEnvelope}\n`;
        }
        if (formData.insideEnvelope) {
            message += `Inside envelope: ${formData.insideEnvelope}\n`;
        }
        if (formData.easements) {
            message += `Easements: ${formData.easements}\n`;
        }
        if (formData.overEasement) {
            message += `Over easement: ${formData.overEasement}\n`;
        } else if (formData.easements) {
            message += 'Over easement: no\n';
        }
        message += '\n';
    }
    
    // Purpose & Storage Section
    if (formData.purpose || formData['storageItems[]'] || formData.storageItems) {
        message += 'PURPOSE & STORAGE:\n';
        if (formData.purpose) {
            message += `Purpose: ${formData.purpose}\n`;
        }
        
        // Handle storage items
        if (formData['storageItems[]']) {
            const items = Array.isArray(formData['storageItems[]']) ? formData['storageItems[]'] : [formData['storageItems[]']];
            message += `Storage items: ${items.length > 0 ? items.join(', ') : 'None specified'}\n`;
        } else if (formData.storageItems) {
            message += `Storage items: ${formData.storageItems}\n`;
        } else {
            message += 'Storage items: None specified\n';
        }
        message += '\n';
    } else if (!formData.customerName && !formData.foundation) {
        // For minimal forms, show defaults
        message += 'PURPOSE & STORAGE:\n';
        message += 'Purpose: Not specified\n';
        message += 'Storage items: None specified\n';
        message += '\n';
    }
    
    // Other Details Section - only if there are fields not covered above
    if (formData.easements && !formData.buildingEnvelope) {
        message += 'OTHER DETAILS:\n';
        message += `Easements: ${formData.easements}\n`;
        message += '\n';
    }
    
    // Add additional information if provided (support both field names for compatibility)
    const additionalText = formData.additionalInfo || formData.emailMessage;
    if (additionalText && additionalText.trim()) {
        message += 'ADDITIONAL INFORMATION:\n';
        message += additionalText + '\n\n';
    }
    
    // Add file attachment information
    if (formData.files) {
        message += 'ATTACHED FILES:\n';
        if (formData.files.section32) {
            message += `Section 32 Statement: ${formData.files.section32}\n`;
        }
        if (formData.files.propertyTitle) {
            message += `Property Title/Plan: ${formData.files.propertyTitle}\n`;
        }
        if (formData.files.attachment) {
            message += `Additional Attachment: ${formData.files.attachment}\n`;
        }
        message += '\n';
    }
    
    // Add footer with estimate service information
    const feeAmount = ((process.env.ESTIMATE_FEE || 5500) / 100).toFixed(2);
    message += '---\n';
    message += 'This estimate request was submitted via the Victorian Permit Applications website.\n';
    message += `Please note: This is a $${feeAmount} estimate service to provide you with a preliminary cost assessment.\n`;
    message += `This estimate is not a final quote. The $${feeAmount} will be credited back if you proceed with our services.\n`;
    message += `Submitted: ${new Date().toLocaleString('en-AU')}\n`;
    message += '\nThis email was system generated - ce5\n';
    
    return message;
}

/**
 * Failed purchase email template
 * Sent to customer when they begin to pay but back out.
 * Appeals to the customer and gives them options to help them try again.
 * 
 * @param {Object} data - Template data
 * @param {string} data.referenceNumber - Customer reference number
 * @param {string} data.customerEmail - Customer email address
 * @param {string} data.customerName - Customer name
 * @returns {Object} Email template with html and text versions
 */
function getFailedPurchaseEmailTemplate(data) {
    const { referenceNumber, customerEmail, customerName } = data;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Building Permit Estimate - Victorian Permit Applications</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: #000; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .appeal-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .reference-box { background: #fff; border: 2px solid #007bff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .reference-number { font-size: 24px; font-weight: bold; color: #007bff; font-family: 'Courier New', monospace; }
        .cta-button { background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px 0; }
        .help-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⏰ Don't Miss Out on Your Building Permit Estimate!</h1>
        <p>Hi ${customerName || 'there'}, your estimate request is still waiting for you</p>
    </div>
    
    <div class="content">
        <div class="appeal-box">
            <h3 style="margin-top: 0;">We noticed you started but didn't complete your purchase</h3>
            <p>Your building permit estimate details are saved and ready to proceed.</p>
            <p><strong>Just $${((process.env.ESTIMATE_FEE) / 100).toFixed(2)} AUD</strong> for professional guidance that could save you hundreds!</p>
        </div>

        <div class="reference-box">
            <p><strong>Your Reference Number:</strong></p>
            <div class="reference-number">${referenceNumber}</div>
            <p style="margin-top: 15px; color: #666; font-size: 14px;">
                This reference is holding your form details
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${process.env.PERMIT_INBOX || 'permits@vicpa.com.au'}?subject=Complete%20My%20Estimate%20-%20${referenceNumber}" class="cta-button">
                Complete My Estimate Now
            </a>
        </div>

        <div class="help-box">
            <h4 style="color: #1976d2; margin-top: 0;">🤔 Need Help Completing Your Purchase?</h4>
            <p><strong>Common issues and solutions:</strong></p>
            <ul style="text-align: left;">
                <li><strong>Payment concerns:</strong> We accept all major credit cards and use secure Stripe processing</li>
                <li><strong>Technical issues:</strong> Try a different browser or device</li>
                <li><strong>Questions about the service:</strong> Call us directly at 0429 815 177</li>
                <li><strong>Need more time:</strong> Your details are saved - no rush!</li>
            </ul>
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #28a745; margin-top: 0;">💡 Why Choose Our Estimate Service?</h4>
            <ul style="margin: 10px 0;">
                <li>✅ Expert analysis by licensed building surveyors</li>
                <li>✅ Identify potential costly issues early</li>
                <li>✅ Fast 24-48 hour turnaround</li>
                <li>✅ $${((process.env.ESTIMATE_FEE) / 100).toFixed(2)} credited back if you proceed with our services</li>
                <li>✅ Direct access to permit specialists</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 20px;"><strong>Still have questions? We're here to help!</strong></p>
            <p>
                📧 Email: <a href="mailto:${process.env.PERMIT_INBOX || 'permits@vicpa.com.au'}">${process.env.PERMIT_INBOX || 'permits@vicpa.com.au'}</a><br>
                📱 Phone: <a href="tel:0429815177">0429 815 177</a><br>
                🕒 Business Hours: Monday - Friday, 9:00 AM - 5:00 PM AEST
            </p>
        </div>
    </div>

    <div class="footer">
        <p><strong>Victorian Permit Applications</strong></p>
        <p>Making building permits simple and stress-free</p>
        <p style="font-size: 12px; color: #999;">
            No pressure - take your time. Your estimate details are saved and waiting whenever you're ready.
        </p>
        <p style="font-size: 11px; color: #ccc; margin-top: 10px;">This email was system generated - ce4</p>
    </div>
</body>
</html>`;

    const text = `
COMPLETE YOUR BUILDING PERMIT ESTIMATE

Hi ${customerName || 'there'},

We noticed you started but didn't complete your building permit estimate purchase.

YOUR REFERENCE: ${referenceNumber}
COST: Just $${((process.env.ESTIMATE_FEE) / 100).toFixed(2)} AUD

Your form details are saved and ready to proceed whenever you're ready.

NEED HELP?
• Payment concerns: We use secure Stripe processing with all major cards
• Technical issues: Try a different browser or device  
• Questions: Call us at 0429 815 177
• No rush: Your details are saved!

WHY CHOOSE OUR ESTIMATE SERVICE?
✅ Expert analysis by licensed building surveyors
✅ Identify potential costly issues early  
✅ Fast 24-48 hour turnaround
✅ $${((process.env.ESTIMATE_FEE) / 100).toFixed(2)} credited back if you proceed with our services
✅ Direct access to permit specialists

CONTACT US:
Email: ${process.env.PERMIT_INBOX || 'permits@vicpa.com.au'}
Phone: 0429 815 177
Hours: Monday - Friday, 9:00 AM - 5:00 PM AEST

No pressure - take your time. We're here when you're ready!

Victorian Permit Applications
Making building permits simple and stress-free

This email was system generated - ce4
`;

    return { 
        subject: `Complete Your Building Permit Estimate - ${referenceNumber}`,
        html, 
        text 
    };
}

module.exports = {
    buildEstimateEmailMessage,
    getNotifyPermitEstimateProceedTemplate,
    getCallbackRequestTemplate,
    sysAdminNewCustomerAlertTemplate,
    getCustomerThankyouEmailTemplate,
    getFailedPurchaseEmailTemplate
};
