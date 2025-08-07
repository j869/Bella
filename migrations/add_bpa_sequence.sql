-- Migration: Add BPA Reference Number Sequence
-- Created: 2025-08-06
-- Purpose: Create sequence and function for generating BPA reference numbers starting at 4000

-- BPA Reference Number Sequence
-- Creates a sequence for generating unique BPA reference numbers starting at 4000
DROP SEQUENCE IF EXISTS bpa_reference_seq;
CREATE SEQUENCE bpa_reference_seq
    START WITH 4000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

COMMENT ON SEQUENCE bpa_reference_seq IS 'Sequence for generating unique BPA reference numbers starting from 4000';

-- Function to get the next BPA reference number in the correct format
CREATE OR REPLACE FUNCTION get_next_bpa_reference()
RETURNS VARCHAR(10) AS $$
DECLARE
    next_num INTEGER;
    reference_number VARCHAR(10);
BEGIN
    -- Get the next value from the sequence
    SELECT nextval('bpa_reference_seq') INTO next_num;
    
    -- Format as BPA-XXXX with zero padding
    reference_number := 'BPA-' || LPAD(next_num::TEXT, 4, '0');
    
    RETURN reference_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_bpa_reference() IS 'Generates the next BPA reference number in format BPA-XXXX using the sequence';

-- Test the function (optional - comment out for production)
-- SELECT get_next_bpa_reference() as test_reference_1;
-- SELECT get_next_bpa_reference() as test_reference_2;
-- SELECT get_next_bpa_reference() as test_reference_3;

-- If you have existing BPA reference numbers and want to set the sequence to continue from the highest existing number:
-- First, find the highest existing BPA number:
-- SELECT MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)) as max_existing_number
-- FROM customer_purchases 
-- WHERE reference_number LIKE 'BPA-%' 
-- AND LENGTH(reference_number) = 8;

-- Then, if you need to adjust the sequence to continue from existing numbers, use:
-- SELECT setval('bpa_reference_seq', [max_existing_number + 1], false);
-- Note: Replace [max_existing_number + 1] with the actual number + 1

COMMIT;
