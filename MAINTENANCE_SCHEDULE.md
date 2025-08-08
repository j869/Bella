# Victorian Permit Applications - Maintenance Schedule

## File Cleanup
- **Automatic**: Runs on server startup only
- **Manual**: `/admin/cleanup-files` endpoint (requires `ADMIN_CLEANUP_TOKEN`)
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:3000/admin/cleanup-files?maxAge=48"
```

## Required Maintenance Tasks

### Daily Tasks
- [ ] Monitor server logs for errors
- [ ] Check email delivery status (bounces, failures)
- [ ] Verify database connectivity

### Weekly Tasks
- [ ] **File Cleanup** (if server hasn't restarted recently)
  - Manual cleanup via admin endpoint
  - Review cleanup statistics in logs
  - Check for unusual file accumulation patterns

- [ ] Review customer purchase records for anomalies
- [ ] Check disk space in `uploads/` directory
- [ ] Monitor database performance and connection pool

### Monthly Tasks
- [ ] **Stripe Key Review**
  - Verify Stripe webhook endpoints are active
  - Check for any new Stripe API updates or deprecations
  - Review payment processing statistics
  - Ensure webhook secret is current

- [ ] **Environment Variables Audit**
  - Review all `.env` variables for accuracy
  - Update any expired or rotated credentials
  - Verify email SMTP credentials are valid

- [ ] **Database Maintenance**
  - Review `customer_purchases` table for old records
  - Check BPA reference number sequence health
  - Review and archive old `history` table entries
  - Analyze query performance

- [ ] **Email Template Review**
  - Test all email templates render correctly
  - Verify all template data substitutions work
  - Check for broken links or outdated information

### Quarterly Tasks
- [ ] **Security Review**
  - Rotate sensitive credentials (database passwords, SMTP passwords)
  - Review and update Stripe webhook signatures
  - Update any API keys or tokens
  - Check for Node.js and dependency updates

- [ ] **System Performance Review**
  - Analyze server resource usage patterns
  - Review file upload limits and disk usage
  - Check database query performance
  - Review and optimize any slow endpoints

- [ ] **Backup Verification**
  - Verify database backups are working
  - Test backup restoration procedures
  - Ensure file attachment backups (if implemented)

### Annual Tasks
- [ ] **Major Dependency Updates**
  - Update Node.js to latest LTS version
  - Update all npm dependencies
  - Update Bootstrap and frontend libraries
  - Test all functionality after updates

- [ ] **Business Logic Review**
  - Review permit estimation logic for accuracy
  - Update form fields based on regulatory changes
  - Review email templates for current information
  - Verify contact information and business details

## Emergency Procedures

**File System Full:**
1. `du -sh uploads/` - check directory size
2. Run manual cleanup endpoint
3. Manually remove oldest files if critical

**Database Issues:**
1. Check PostgreSQL service status
2. Verify connection pool and credentials
3. Review database locks/performance

**Email Failures:**
1. Verify SMTP credentials and server
2. Check bounced email logs
3. Test with simple send

**Stripe Issues:**
1. Check webhook failures in Stripe dashboard
2. Verify webhook signature in environment
3. Check payment intent statuses

## Key Files to Monitor/Backup
- `.env` (all environment variables)
- `package.json` and `package-lock.json` 
- `schema.sql` and `migrations/`
- `email-templates.js`

## Critical Environment Variables
- `STRIPE_WEBHOOK_SECRET` - must match Stripe dashboard
- `SMTP_EMAIL` and `SMTP_PASSWORD` 
- `ADMIN_EMAIL` and `PERMIT_INBOX`
- `ADMIN_CLEANUP_TOKEN`
