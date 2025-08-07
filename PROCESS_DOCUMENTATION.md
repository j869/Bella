
## Complete Email Flow Summary

### 📋 Customer Journey Email Flow

```
🌐 CUSTOMER STARTS
    │
    ▼
📝 STEP 1: Form Submission
    Route: POST /submit-estimate-request
    Trigger: Customer completes estimate form (before payment)
    ├─ Email: ce2 - sysAdminNewCustomerAlertTemplate
    ├─ To: ADMIN_EMAIL 
    └─ Subject: New Estimate Request [Ref: ${referenceNumber}] - ${customerName}
    │
    ▼
💳 STEP 2: Payment Success - Customer Receipt
    Route: GET /success
    Trigger: Payment success page load
    ├─ Email: ce3 - getCustomerThankyouEmailTemplate
    ├─ To: Customer
    ├─ BCC: ADMIN_EMAIL
    └─ Subject: Your confirmation receipt - Victorian Permit Applications [Ref: ${referenceNumber}]
    │
    ▼
🏗️ STEP 3: Payment Success - Business Notification
    Route: GET /success (same request)
    Trigger: Successful payment completion
    ├─ Email: ce5 - getNotifyPermitEstimateProceedTemplate
    ├─ To: PERMIT_INBOX
    ├─ BCC: ADMIN_EMAIL (if ADMIN_BCC_ALL_EMAILS="true")
    ├─ Attachments: Customer files included
    └─ Subject: NEW ESTIMATE REQUEST: ${customerName}

📞 PARALLEL FLOW: Callback Request
    Route: POST /callback-request
    Trigger: Customer requests callback
    ├─ Email: ce1 - getCallbackRequestTemplate
    ├─ To: ADMIN_EMAIL
    ├─ CC: PERMIT_INBOX (only if ADMIN_BCC_ALL_EMAILS="true")
    └─ Subject: 📞 Callback Request from ${firstName} (${phone})

⚠️ RECOVERY FLOW: Failed Payment
    Route: Stripe Webhook - checkout.session.expired
    Trigger: Payment session expires
    ├─ Email: ce4 - getFailedPurchaseEmailTemplate
    ├─ To: Customer
    ├─ BCC: ADMIN_EMAIL (if ADMIN_BCC_ALL_EMAILS="true")
    └─ Subject: Complete Your Building Permit Estimate - ${referenceNumber}
```

# Email Templates Documentation

## Template System

**File**: `email-templates.js` - Centralized email template management

### Email Template Tracking Codes
- **ce1** - Callback Request Template
- **ce2** - Job information to Permit Specialists
- **ce3** - Customer Thank You Template
- **ce4** - Failed Purchase Recovery Template
- **ce5** - Usage Logging Notification to admin Template

## Email Templates

### 1. Callback Request Template (ce1)
**Function**: `getCallbackRequestTemplate(data)`
**Trigger**: Customer submits callback request form
**Recipients**: Quote manager
**Data**: firstName, phone, email, message, currentDate, clientIp

### 2. Job Information to Permit Specialists (ce2)
**Function**: `sysAdminNewCustomerAlertTemplate(data)`
**Trigger**: Customer completes estimate form (before payment)
**Recipients**: Admin only (PERMIT_INBOX only if ADMIN_BCC_ALL_EMAILS="true")
**Features**: Purple theme, highlighted form answers, A4 page optimized
**Data**: formData, referenceNumber, clientIp

### 3. Customer Thank You Template (ce3)
**Function**: `getCustomerThankyouEmailTemplate(data)`
**Trigger**: Successful payment via Stripe
**Recipients**: Customer (BCC: Admin)
**Data**: referenceNumber, session (Stripe object)

### 4. Failed Purchase Recovery Template (ce4)
**Function**: `getFailedPurchaseEmailTemplate(data)`
**Trigger**: Customer's checkout session expires (Stripe webhook)
**Recipients**: Customer (BCC: Admin if ADMIN_BCC_ALL_EMAILS="true")
**Data**: referenceNumber, customerEmail, customerName

### 5. Usage Logging Notification to admin Template (ce5)
**Function**: `getNotifyPermitEstimateProceedTemplate(data)` + `buildEstimateEmailMessage(data)`
**Trigger**: Successful payment completion
**Recipients**: Permit specialists (BCC: Admin if ADMIN_BCC_ALL_EMAILS="true")
**Data**: Complete customer and project form data


## Testing Commands

```bash
# Run all tests including email validation and security tests
npm test

# Run specific test suites
npm test -- tests/email-templates.test.js  # Email template tests
npm test -- tests/attachment-security.test.js  # File attachment security tests

# Send actual test emails to admin inbox
node test-email-templates.js

# Email-only Jest tests
npm run test:emails

# Test with coverage
npm run test:coverage
```

## Test Coverage
1. **Usage Logging Notification (ce5)** - IT admin monitoring
2. **Callback Request (ce1)** - Customer callback requests
3. **Job Information to Permit Specialists (ce2)** - Permit work notifications
4. **Customer Thank You (ce3)** - Payment confirmations
5. **Failed Purchase Recovery (ce4)** - Cart abandonment recovery
6. **Estimate Message Builder (ce5)** - Form data processing
7. **Attachment Security** - File upload, cleanup, and path traversal protection

## Environment Variables
```env
# SMTP Configuration
SMTP_HOST=your-smtp-host
SMTP_EMAIL=your-smtp-username
SMTP_PASSWORD=your-smtp-password

# Recipients
ADMIN_EMAIL=john@buildingbb.com.au
QUOTE_MANAGER_EMAIL=alex@buildingbb.com.au;amandah@vicpa.com.au    --- old key, no longer important
PERMIT_INBOX=permits@vicpa.com.au

# Settings
ESTIMATE_FEE=4950  # Fee in cents
```

## Adding New Templates
1. Create function in `email-templates.js`
2. Add tracking code (ce6, ce7, etc.)
3. Update module exports
4. Add test case in `test-email-templates.js`
5. Update Jest tests in `tests/email-templates.test.js`

---

*Last Updated: August 6, 2025*
