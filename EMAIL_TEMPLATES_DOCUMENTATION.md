# Email Templates Documentation

## Template System

**File**: `email-templates.js` - Centralized email template management

### Template Tracking Codes
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
**Recipients**: Alex & Amanda (permit specialists)
**Features**: Purple theme, highlighted form answers, A4 page optimized
**Data**: formData, referenceNumber, clientIp

### 3. Customer Thank You Template (ce3)
**Function**: `getCustomerThankyouEmailTemplate(data)`
**Trigger**: Successful payment via Stripe
**Recipients**: Customer
**Data**: referenceNumber, session (Stripe object)

### 4. Failed Purchase Recovery Template (ce4)
**Function**: `getFailedPurchaseEmailTemplate(data)`
**Trigger**: Customer abandons payment process
**Recipients**: Customer
**Data**: referenceNumber, customerEmail, customerName

### 5. Usage Logging Notification to admin Template (ce5)
**Function**: `getNotifyPermitEstimateProceedTemplate(data)` + `buildEstimateEmailMessage(data)`
**Trigger**: Successful payment completion
**Recipients**: John (IT admin via ADMIN_EMAIL)
**Data**: Complete customer and project form data

## Testing Commands

```bash
# Run all tests including email validation
npm test

# Send actual test emails to admin inbox
node test-email-templates.js

# Email-only Jest tests
npm run test:emails
```

## Test Coverage
1. **Usage Logging Notification (ce5)** - IT admin monitoring
2. **Callback Request (ce1)** - Customer callback requests
3. **Job Information to Permit Specialists (ce2)** - Permit work notifications
4. **Customer Thank You (ce3)** - Payment confirmations
5. **Failed Purchase Recovery (ce4)** - Cart abandonment recovery
6. **Estimate Message Builder (ce5)** - Form data processing

## Environment Variables
```env
# SMTP Configuration
SMTP_HOST=your-smtp-host
SMTP_EMAIL=your-smtp-username
SMTP_PASSWORD=your-smtp-password

# Recipients
ADMIN_EMAIL=john@buildingbb.com.au
QUOTE_MANAGER_EMAIL=alex@buildingbb.com.au;amandah@vicpa.com.au

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
