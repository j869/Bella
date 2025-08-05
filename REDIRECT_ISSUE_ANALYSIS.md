/**
 * Test case analysis: req.body undefined issue in production redirect
 * 
 * ISSUE IDENTIFIED:
 * When submitting the estimate form in production, the flow is:
 * 1. POST /submit-estimate-request → processes form data
 * 2. res.redirect(307, '/create-checkout-session') → attempts to redirect with body preserved
 * 3. Browser makes new request to POST /create-checkout-session
 * 4. req.body is undefined/empty in the create-checkout-session handler
 * 
 * ROOT CAUSE:
 * HTTP 307 redirects do not reliably preserve request bodies across all browsers and scenarios.
 * While 307 is supposed to preserve the method and body, many browsers and HTTP clients
 * don't implement this correctly, especially for form data.
 * 
 * SOLUTION OPTIONS:
 * 1. Use session storage to pass data between requests
 * 2. Encode data in query parameters (limited by URL length)
 * 3. Store data in database with a temporary token
 * 4. Use POST-redirect-GET pattern with session data
 * 
 * RECOMMENDED FIX:
 * Use Express session middleware to store form data temporarily:
 * - Store processed form data in req.session before redirect
 * - Retrieve and clear session data in create-checkout-session
 * - This ensures data persistence across redirect boundaries
 */

// Example implementation:
// In submit-estimate-request:
// req.session.estimateData = {
//   emailTo, subject, customerName, customerPhone, 
//   referenceNumber, emailMessage, hasFullFormData: true
// };
// return res.redirect('/create-checkout-session');

// In create-checkout-session:
// const formData = req.session.estimateData || req.body;
// delete req.session.estimateData; // Clean up
// if (!formData.emailTo) return res.status(400).send('Missing data');
