CREATE DATABASE contact
WITH
OWNER = postgres
ENCODING = 'UTF8'
LC_COLLATE = 'en_AU.UTF-8'
LC_CTYPE = 'en_AU.UTF-8'
LOCALE_PROVIDER = 'libc'
TABLESPACE = pg_default
CONNECTION LIMIT = -1
IS_TEMPLATE = False
TEMPLATE = template0;






DROP table if exists public.history;
CREATE TABLE IF NOT EXISTS public.history
(
    id SERIAL PRIMARY KEY,
    "time" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    ip VARCHAR(45) NOT NULL,
    replyto VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    location VARCHAR(255),
    file VARCHAR(255),
    original_filename VARCHAR(255),
    -- New fields for multiple file uploads
    section32_file VARCHAR(255),
    section32_filename VARCHAR(255),
    property_title_file VARCHAR(255),
    property_title_filename VARCHAR(255)
);
COMMENT ON TABLE history IS 'Historical log of all customer interactions including emails, callbacks, and form submissions';
COMMENT ON COLUMN history.id IS 'Primary key - unique identifier for each history record';
COMMENT ON COLUMN history."time" IS 'Timestamp when the interaction occurred, defaults to current time if not specified';
COMMENT ON COLUMN history.ip IS 'Customer IP address for tracking and security purposes';
COMMENT ON COLUMN history.replyto IS 'Customer email address for replies and follow-up communications';
COMMENT ON COLUMN history.subject IS 'Subject line or title of the customer interaction';
COMMENT ON COLUMN history.message IS 'Main content of the customer message or interaction details';
COMMENT ON COLUMN history.location IS 'Geographic location information derived from IP address';
COMMENT ON COLUMN history.file IS 'File path for general attachments (shed plans, photos) uploaded by the customer';
COMMENT ON COLUMN history.original_filename IS 'Original name of general attachment file as provided by customer';
COMMENT ON COLUMN history.section32_file IS 'File path for Section 32 statement uploaded by the customer';
COMMENT ON COLUMN history.section32_filename IS 'Original name of Section 32 file as provided by customer';
COMMENT ON COLUMN history.property_title_file IS 'File path for property title/plan uploaded by the customer';
COMMENT ON COLUMN history.property_title_filename IS 'Original name of property title/plan file as provided by customer';





-- Customer Purchase Tracking Table
DROP table if exists public.customer_purchases;
CREATE TABLE IF NOT EXISTS public.customer_purchases
(
    id SERIAL PRIMARY KEY,
    -- Reference and Payment Information
    reference_number VARCHAR(50) UNIQUE,           -- e.g., BPE-12345678-ABCD
    stripe_payment_intent_id VARCHAR(255),                  -- Stripe PaymentIntent ID
    stripe_checkout_session_id VARCHAR(255),                -- Stripe Checkout Session ID
    stripe_customer_id VARCHAR(255),                        -- Stripe Customer ID (if created)
    payment_amount INTEGER,                                 -- Amount in cents (e.g., 5500 for $55.00)
    payment_currency VARCHAR(3) DEFAULT 'AUD',             -- Currency code
    payment_status VARCHAR(50),                             -- succeeded, pending, failed, etc.
    -- Customer Information
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_ip VARCHAR(45),                                -- IP address when form was submitted
    web_session_id VARCHAR(255),  -- Web session ID for tracking user session
    -- Timing Information
    first_visit_time TIMESTAMP WITHOUT TIME ZONE,          -- When customer first loaded the form
    form_submitted_time TIMESTAMP WITHOUT TIME ZONE,       -- When estimate request was submitted
    payment_completed_time TIMESTAMP WITHOUT TIME ZONE,    -- When payment was successfully processed
    last_seen_time TIMESTAMP WITHOUT TIME ZONE,            -- Last activity timestamp
    -- Form Data and Notes
    form_data JSONB,                                        -- Complete form submission as JSON object
    notes TEXT,                                             -- Additional notes or comments   
    -- Metadata
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    -- Indexes for common queries
    CONSTRAINT unique_reference_number UNIQUE (reference_number)
);
-- Create indexes 
CREATE INDEX IF NOT EXISTS idx_customer_purchases_email ON customer_purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_reference ON customer_purchases(reference_number);
create index if not exists idx_customer_purchases_ip ON customer_purchases(customer_ip);
-- comments
COMMENT ON TABLE customer_purchases IS 'Complete customer purchase tracking from first visit to payment completion';
COMMENT ON COLUMN customer_purchases.reference_number IS 'Unique reference number generated for each estimate request (e.g., BPE-12345678-ABCD)';
COMMENT ON COLUMN customer_purchases.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for tracking payment in Stripe dashboard';
COMMENT ON COLUMN customer_purchases.stripe_checkout_session_id IS 'Stripe Checkout Session ID for linking to Stripe session data';
COMMENT ON COLUMN customer_purchases.stripe_customer_id IS 'Stripe Customer ID if a customer record was created in Stripe';
COMMENT ON COLUMN customer_purchases.payment_amount IS 'Payment amount in cents (e.g., 5500 for $55.00 AUD)';
COMMENT ON COLUMN customer_purchases.payment_currency IS 'Currency code for the payment (defaults to AUD)';
COMMENT ON COLUMN customer_purchases.payment_status IS 'Payment status from Stripe (succeeded, pending, failed, etc.)';
COMMENT ON COLUMN customer_purchases.customer_name IS 'Customer full name as provided in the form';
COMMENT ON COLUMN customer_purchases.customer_email IS 'Customer email address for contact and receipts';
COMMENT ON COLUMN customer_purchases.customer_phone IS 'Customer phone number for follow-up contact';
COMMENT ON COLUMN customer_purchases.customer_ip IS 'Customer IP address when form was submitted for tracking';
COMMENT ON COLUMN customer_purchases.first_visit_time IS 'Timestamp when customer first loaded the estimate form';
COMMENT ON COLUMN customer_purchases.form_submitted_time IS 'Timestamp when customer submitted the estimate request form';
COMMENT ON COLUMN customer_purchases.payment_completed_time IS 'Timestamp when payment was successfully processed via Stripe';
COMMENT ON COLUMN customer_purchases.last_seen_time IS 'Most recent activity timestamp for tracking customer engagement';
COMMENT ON COLUMN customer_purchases.form_data IS 'Complete form submission stored as JSON including all customer inputs and preferences';
COMMENT ON COLUMN customer_purchases.notes IS 'Additional notes, comments, and process tracking (e.g., emails sent, follow-ups)';
COMMENT ON COLUMN customer_purchases.created_at IS 'Timestamp when this record was first created';
COMMENT ON COLUMN customer_purchases.updated_at IS 'Timestamp when this record was last modified (auto-updated via trigger)';

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on any change to customer_purchases
CREATE TRIGGER update_customer_purchases_updated_at 
    BEFORE UPDATE ON customer_purchases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample INSERT for payment success endpoint - populate with available data from /success route
/*
INSERT INTO customer_purchases (
    reference_number,
    stripe_payment_intent_id,
    stripe_checkout_session_id,
    payment_amount,
    payment_currency,
    payment_status,
    customer_name,
    customer_email,
    customer_phone,
    customer_ip,
    form_submitted_time,
    payment_completed_time,
    last_seen_time,
    form_data,
    notes
) VALUES (
    $1,  -- referenceNumber from session.metadata
    $2,  -- session.payment_intent
    $3,  -- session.id (checkout session ID)
    5500, -- hardcoded $55.00 AUD in cents
    'AUD',
    $4,  -- session.payment_status
    $5,  -- customerName from session.metadata
    $6,  -- customerEmail
    $7,  -- customerPhone from session.metadata
    $8,  -- clientIp from session.metadata
    $9,  -- form_submitted_time (can be derived from session creation or metadata)
    NOW(), -- payment_completed_time (current timestamp when payment succeeds)
    NOW(), -- last_seen_time (current timestamp)
    $10, -- storedEmailMessage as JSON (if hasFullFormData is true)
    'Customer payment confirmation email sent. Business notification email sent to john@buildingbb.com.au, alex@buildingbb.com.au, amandah@vicpa.com.au'
);
*/



