# Outstanding Issues & Required Changes

## 🔧 Critical Fixes Required

### 1. Stripe Webhook Handler - Failed Payment Recovery
**Issue**: `checkout.session.expired` webhook event is not handled, preventing ce4 recovery emails
**Location**: `app.js` - POST `/webhook` route
**Current Status**: Event received but marked as "Unhandled event type"
**Log Evidence**:
```
x1        NEW REQUEST POST /webhook 
dh1    Stripe webhook received with signature: t=1754461570,v1=f560c518edf93b586c9764e64e7b594fc6dd258994ec780c74d2d5ac0bc53174,v0=7f25c8c146430ee32aa576251d47fc8dbb1b6168ca317c6f7ff2c7379f5a9c43
dh3      Webhook verified: checkout.session.expired
dh588      Unhandled event type: checkout.session.expired
```
**Required Action**: 
- Add handler for `checkout.session.expired` event type
- Trigger ce4 Failed Purchase Recovery email template when payment session expires
- Ensure customer receives follow-up to complete their purchase

### 2. Email Template Updates - ce4 Recovery Email
**Location**: `email-templates.js` - `getFailedPurchaseEmailTemplate()`
**Required Changes**:
- Remove "Next Steps" section (permit specialists have their own process)
- Replace with simple reminder: "We'll respond within 24 hours of payment"
- Remove note about "full data not stored in database" (this is incorrect)

### 3. Form Field Labels - User Experience
**Location**: `views/main.ejs` - Structure dimensions section
**Required Changes**:
- Change "Structure Length" → "Structure Length (gutter side)"  
- Change "Structure Width" → "Structure Width (gable end)"
- **Layout**: Put length and width fields on same row, move boundary distance to separate row

## ⚙️ Configuration Updates

### 4. Pricing Update
**Location**: `.env` file
**Change**: Update `ESTIMATE_FEE` from current value to `$55`

### 5. Reference Number Format Change  
**Location**: Database schema and reference generation function
**Change**: Update BPA prefix to VPA format
- Current: `BPA-4123`
- New: `VPA-4123`
**Files to modify**:
- `schema.sql` - Update sequence and function comments
- `app.js` - Update `generateReferenceNumber()` function
- Any email templates referencing BPA format

## 📋 Implementation Priority
1. **High Priority**: Stripe webhook fix (affects customer recovery)
2. **Medium Priority**: Form UX improvements (affects conversion)
3. **Low Priority**: Reference number format change (cosmetic)

## 🗂️ Files Requiring Changes
- `app.js` (webhook handler)
- `email-templates.js` (ce4 template)  
- `views/main.ejs` (form labels)
- `.env` (pricing configuration)
- `schema.sql` (reference number format)

---
*Application shelved - resume with these fixes when development continues*
