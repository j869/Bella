
/**
 * Contact Page Application
 * 
 * A comprehensive contact form application that supports:
 * - SMS messaging via Twilio
 * - Email sending with attachments via Nodemailer
 * - File uploads via Multer
 * - Payment processing via Stripe
 * - Message history tracking in PostgreSQL
 * - IP-based location detection
 * 
 * @author j869 
 * @version 1.0.0
 */

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const axios = require('axios');
const port = 3000;
const bodyParser = require('body-parser');

const fs = require('fs');
const path = require('path');

// Third-party service integrations
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailTemplates = require('./email-templates');

/**
 * Form field mapping for dynamic processing
 * Maps form field names to human-readable labels for email templates
 */
const formFieldMapping = {
    customerName: { label: 'Customer Name', type: 'text', required: true },
    customerEmail: { label: 'Email Address', type: 'email', required: true }, 
    phone: { label: 'Phone Number', type: 'tel', required: true },
    streetAddress: { label: 'Street Address', type: 'address', validate: true, required: true },
    foundation: { label: 'Foundation Type', type: 'select', required: true },
    location: { label: 'Shed Location Description', type: 'textarea', required: false },
    boundarySetbacks: { label: 'Boundary Distance', type: 'text', required: true },
    structureLength: { label: 'Structure Length', type: 'number', required: true },
    structureWidth: { label: 'Structure Width', type: 'number', required: true },
    dwellingOnProperty: { label: 'Dwelling on Property', type: 'radio', required: true },
    adjacentDwelling: { label: 'Adjacent Dwelling', type: 'radio', required: false },
    dwellingPermitted: { label: 'Dwelling Permitted', type: 'radio', required: false },
    purpose: { label: 'Primary Purpose', type: 'select', required: true },
    'storageItems[]': { label: 'Storage Items', type: 'checkbox', required: false },
    farmingOtherText: { label: 'Other Farming Use', type: 'text', required: false },
    domesticOtherText: { label: 'Other Domestic Use', type: 'text', required: false }, 
    commercialOtherText: { label: 'Commercial Use Details', type: 'text', required: false },
    commercialZone: { label: 'Commercial Zone', type: 'radio', required: false },
    buildingEnvelope: { label: 'Building Envelope Restriction', type: 'radio', required: false },
    insideEnvelope: { label: 'Inside Building Envelope', type: 'radio', required: false },
    easements: { label: 'Easements on Property', type: 'radio', required: false },
    overEasement: { label: 'Building Over Easement', type: 'radio', required: false },
    additionalInfo: { label: 'Additional Information', type: 'textarea', required: false },
    
    // New hidden fields for structured address data
    address_house_number: { label: 'House Number', type: 'hidden', internal: true },
    address_road: { label: 'Street Name', type: 'hidden', internal: true },
    address_suburb: { label: 'Suburb', type: 'hidden', internal: true },
    address_state: { label: 'State', type: 'hidden', internal: true },
    address_postcode: { label: 'Postcode', type: 'hidden', internal: true },
    address_validation_method: { label: 'Validation Method', type: 'hidden', internal: true },
    address_confidence: { label: 'Address Confidence', type: 'hidden', internal: true }
};

/**
 * Address Validation Functions
 * Provides two-tier validation: OpenStreetMap Nominatim API + Regex fallback
 */

/**
 * Validate address using regex patterns for Australian addresses
 * @param {string} address - The address to validate
 * @returns {Object} Validation result with isValid, confidence, addressType, components, message
 */
function validateAddressRegex(address) {
    if (!address || typeof address !== 'string') {
        return {
            isValid: false,
            confidence: 'low',
            addressType: 'unknown',
            components: {},
            message: 'Please provide a valid address'
        };
    }

    // Enhanced Australian address patterns for rural/new subdivision tolerance
    const patterns = [
        // Full format: "123 Main Street, Melbourne VIC 3000"
        /^(\d+(?:[A-Za-z])?)\s+([A-Za-z\s'.-]+?)(?:,\s*)?([A-Za-z\s'.-]+?)(?:,?\s*)?(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s*(\d{4})$/i,
        
        // Rural/subdivision format: "Lot 5 Main Street, New Estate VIC 3000"  
        /^(Lot\s+\d+[A-Za-z]?)\s+([A-Za-z\s'.-]+?)(?:,\s*)?([A-Za-z\s'.-]+?)(?:,?\s*)?(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s*(\d{4})$/i,
        
        // Rural property format: "1234 Rural Road, Farmville VIC 3000"
        /^(\d+[A-Za-z]?)\s+([A-Za-z\s'.-]*?(?:Road|Rd|Street|St|Lane|Ln|Drive|Dr|Avenue|Ave|Highway|Hwy|Track|Tk))\s*,?\s*([A-Za-z\s'.-]+?)(?:,?\s*)?(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s*(\d{4})$/i,
        
        // Format with postcode but no state: "123 Main Street, Suburb 3000" or "123 street name suburb 3000"
        /^(\d+(?:[A-Za-z])?)\s+([A-Za-z\s'.-]*?(?:Road|Rd|Street|St|Lane|Ln|Drive|Dr|Avenue|Ave|Highway|Hwy|Track|Tk|way|Way|place|Place|court|Court|close|Close))\s+([A-Za-z\s'.-]+?)\s+(\d{4})$/i,
        
        // More flexible format: "90 forman rd shelbourne 3515"
        /^(\d+(?:[A-Za-z])?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(rd|road|st|street|ln|lane|dr|drive|ave|avenue|hwy|highway|tk|track|way|place|court|close)\s+([A-Za-z\s'.-]+?)\s+(\d{4})$/i,
        
        // Partial format with suburb: "123 Main Street, Melbourne" (requires comma or multiple words after street)
        /^(\d+(?:[A-Za-z])?|Lot\s+\d+[A-Za-z]?)\s+([A-Za-z\s'.-]+?)(?:,\s+)([A-Za-z\s'.-]+?)$/i,
        
        // Basic format: "123 Main Street" or "Lot 5 Estate Road" (single street name, no suburb parsing)
        /^(\d+(?:[A-Za-z])?|Lot\s+\d+[A-Za-z]?)\s+([A-Za-z\s'.-]+?)$/i,
        
        // Rural property number only: "1234 Some Rural Property Name"
        /^(\d{3,}[A-Za-z]?)\s+([A-Za-z\s'.-]{10,})$/i
    ];
    
    for (let i = 0; i < patterns.length; i++) {
        const match = address.match(patterns[i]);
        if (match) {
            // Extract components first to check state
            const components = extractRegexComponents(match);
            
            // Only allow Victoria addresses - reject other states
            if (components.state && 
                !['VIC', 'VICTORIA'].includes(components.state.toUpperCase()) &&
                components.state.trim() !== '') {
                continue; // Skip this pattern match if it's not Victoria
            }
            
            const addressType = detectAddressType(match[1], match[2]);
            return {
                isValid: true,
                confidence: i === 0 ? 'high' : i <= 2 ? 'medium' : 'low',
                addressType: addressType,
                components: components,
                message: getValidationMessage(i, addressType)
            };
        }
    }
    
    return {
        isValid: false,
        confidence: 'low',
        addressType: 'unknown',
        components: {},
        message: 'Please use a Victoria address format like: "123 Main Street, Suburb VIC 3000" or "Lot 5 Estate Road, Development VIC 3000"'
    };
}

/**
 * Detect address type based on house number and street patterns
 */
function detectAddressType(houseNumber, street) {
    if (houseNumber.toLowerCase().includes('lot')) {
        return 'subdivision';
    }
    
    if (parseInt(houseNumber) > 9999) {
        return 'rural';
    }
    
    const ruralStreetTypes = ['road', 'rd', 'track', 'tk', 'highway', 'hwy'];
    const streetLower = street.toLowerCase();
    if (ruralStreetTypes.some(type => streetLower.includes(type))) {
        return 'rural';
    }
    
    return 'urban';
}

/**
 * Extract address components from regex match
 */
function extractRegexComponents(match) {
    // Handle different pattern structures
    if (match.length === 6 && match[3] && /^(rd|road|st|street|ln|lane|dr|drive|ave|avenue|hwy|highway|tk|track|way|place|court|close)$/i.test(match[3])) {
        // Format: "90 forman rd shelbourne 3515" (street type separate)
        return {
            house_number: match[1] || '',
            road: `${match[2]} ${match[3]}`, // Combine street name and type
            suburb: match[4] || '',
            state: 'VIC', // Default to VIC for Victoria addresses
            postcode: match[5] || ''
        };
    } else if (match.length === 5 && match[4] && /^\d{4}$/.test(match[4])) {
        // Format: "123 Main Street, Suburb 3000" (no state)
        return {
            house_number: match[1] || '',
            road: match[2] || '',
            suburb: match[3] || '',
            state: 'VIC', // Default to VIC for Victoria addresses
            postcode: match[4] || ''
        };
    } else if (match.length === 4 && match[3] && !match[3].match(/^\d{4}$/)) {
        // Format: "123 Main Street, Suburb" (with comma, no postcode)
        return {
            house_number: match[1] || '',
            road: match[2] || '',
            suburb: match[3] || '',
            state: '',
            postcode: ''
        };
    } else if (match.length === 3) {
        // Format: "123 Main Street" (basic format, no suburb)
        return {
            house_number: match[1] || '',
            road: match[2] || '',
            suburb: '',
            state: '',
            postcode: ''
        };
    } else {
        // Standard format with state and postcode
        return {
            house_number: match[1] || '',
            road: match[2] || '',
            suburb: match[3] || '',
            state: match[4] || '',
            postcode: match[5] || ''
        };
    }
}

/**
 * Get validation message based on pattern match and address type
 */
function getValidationMessage(patternIndex, addressType) {
    const typeMessages = {
        subdivision: 'New subdivision address format',
        rural: 'Rural property address format',
        urban: 'Urban address format'
    };
    
    const qualityMessages = [
        'Complete address format',
        'Good address format (may be new development)',
        'Acceptable address format',
        'Basic address format (missing state/postcode)',
        'Minimal address format',
        'Rural property format'
    ];
    
    const baseMessage = qualityMessages[patternIndex] || 'Address format detected';
    const typeMessage = typeMessages[addressType] || '';
    
    return typeMessage ? `${baseMessage} - ${typeMessage}` : baseMessage;
}

/**
 * Validate address using OpenStreetMap Nominatim API
 * @param {string} address - The address to validate
 * @returns {Promise<Object>} API validation result
 */
async function validateWithNominatim(address) {
    const nominatimBaseUrl = 'https://nominatim.openstreetmap.org/search';
    
    try {
        const params = new URLSearchParams({
            format: 'json',
            addressdetails: '1',
            limit: '10', // Get more results to filter for Victoria only
            countrycodes: 'au',
            state: 'Victoria', // Prefer Victoria results
            q: address
        });
        
        const response = await axios.get(`${nominatimBaseUrl}?${params}`, {
            headers: {
                'User-Agent': 'VictorianPermitApplications/1.0'
            },
            timeout: 5000
        });
        
        // Filter results to only include Victoria addresses
        const allResults = response.data || [];
        const victoriaResults = allResults.filter(result => {
            const addr = result.address || {};
            const state = addr.state || '';
            
            // Check for various forms of "Victoria" in the state field
            return state.toLowerCase().includes('victoria') || 
                   state.toLowerCase() === 'vic' ||
                   state.toLowerCase() === 'vic.' ||
                   // Also check if the address components suggest Victoria
                   (result.display_name && result.display_name.toLowerCase().includes('vic')) ||
                   (result.display_name && result.display_name.toLowerCase().includes('victoria'));
        });
        
        console.log(`Nominatim returned ${allResults.length} results, ${victoriaResults.length} in Victoria`);
        
        return {
            success: true,
            results: victoriaResults.slice(0, 5) // Limit to 5 Victoria results
        };
        
    } catch (error) {
        console.warn('Nominatim API error:', error.message);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
}

/**
 * Main address validation function with fallback logic
 * @param {string} address - The address to validate
 * @returns {Promise<Object>} Complete validation result
 */
async function validateAddressWithFallback(address) {
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
        return {
            isValid: false,
            confidence: 'low',
            source: 'none',
            addressType: 'unknown',
            components: {},
            message: 'Please provide a valid address',
            formatted: address
        };
    }

    // First, try API validation - this should be the primary method
    try {
        const apiResult = await validateWithNominatim(address);
        
        if (apiResult.success && apiResult.results.length > 0) {
            // Use first result from Nominatim
            const firstResult = apiResult.results[0];
            const components = extractNominatimComponents(firstResult);
            
            return {
                isValid: true,
                confidence: 'high',
                source: 'nominatim',
                addressType: 'api-verified',
                components: components,
                message: `Found ${apiResult.results.length} matching address${apiResult.results.length > 1 ? 'es' : ''} in Victoria`,
                formatted: formatDisplayAddress(firstResult),
                nominatim_result: firstResult,
                api_results_count: apiResult.results.length
            };
        }
        
        console.log('🔍 API returned 0 results, trying regex fallback for:', address);
        
    } catch (apiError) {
        console.warn('Nominatim API error, falling back to regex:', apiError.message);
    }
    
    // Only use regex validation as fallback when API returns 0 results or fails
    const regexResult = validateAddressRegex(address);
    
    if (regexResult.isValid) {
        return {
            isValid: true,
            confidence: regexResult.confidence,
            source: 'regex-fallback',
            addressType: regexResult.addressType,
            components: regexResult.components,
            message: regexResult.message + ' (not found in mapping database - may be new development)',
            formatted: address,
            fallback: true
        };
    }
    
    // Both API and regex failed
    return {
        isValid: false,
        confidence: 'low',
        source: 'failed',
        addressType: 'unknown',
        components: {},
        message: 'Please use a Victoria address format like: "123 Main Street, Suburb VIC 3000"',
        formatted: address
    };
}

/**
 * Format display address from Nominatim result
 */
function formatDisplayAddress(result) {
    const addr = result.address || {};
    const parts = [
        addr.house_number,
        addr.road,
        addr.suburb || addr.city || addr.town,
        addr.state,
        addr.postcode
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
}

/**
 * Process address data for form submission
 * @param {Object} formData - Form submission data
 * @returns {Object} Processed address data
 */
function processAddressData(formData) {
    const addressData = {
        original: formData.streetAddress || '',
        houseNumber: formData.address_house_number || '',
        road: formData.address_road || '',
        suburb: formData.address_suburb || '',
        state: formData.address_state || '',
        postcode: formData.address_postcode || '',
        validationMethod: formData.address_validation_method || 'none',
        confidence: formData.address_confidence || 'low'
    };

    // Create formatted display address
    const formatParts = [
        addressData.houseNumber,
        addressData.road,
        addressData.suburb,
        addressData.state,
        addressData.postcode
    ].filter(part => part && part.trim());

    addressData.formatted = formatParts.length > 2 ? 
        formatParts.join(', ') : 
        addressData.original;

    // Determine address quality
    addressData.quality = calculateAddressQuality(addressData);
    
    return addressData;
}

/**
 * Calculate address quality score based on validation method and completeness
 */
function calculateAddressQuality(addressData) {
    let score = 0;
    
    // Method scoring - enhanced for unmapped addresses
    switch (addressData.validationMethod) {
        case 'nominatim':
            score += 40;
            break;
        case 'regex-subdivision':
            score += 35; // High score for properly formatted subdivision addresses
            break;
        case 'regex-rural':
            score += 30; // Good score for rural properties
            break;
        case 'regex-urban':
            score += 25; // Medium score for unmapped urban addresses
            break;
        case 'regex-fallback':
            score += 20;
            break;
        default:
            score += 5;
    }
    
    // Component completeness scoring
    if (addressData.houseNumber || addressData.houseNumber.includes('Lot')) score += 15;
    if (addressData.road) score += 20;
    if (addressData.suburb) score += 15;
    if (addressData.state) score += 5;
    if (addressData.postcode) score += 5;
    
    // Bonus for complete unmapped addresses (likely new developments)
    if (addressData.validationMethod.includes('regex')) {
        if (addressData.houseNumber && addressData.road && addressData.suburb && addressData.postcode) {
            score += 10; // Bonus for complete unmapped address
        }
    }
    
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
}

/**
 * Dynamic form data processor
 * Converts form data into structured question-answer pairs for email templates
 * @param {Object} reqBody - Express request body containing form data
 * @returns {Array} Array of objects with question, answer, and fieldName properties
 */
function processFormData(reqBody) {
    const processedData = [];
    
    for (const [fieldName, fieldValue] of Object.entries(reqBody)) {
        if (fieldValue && fieldName in formFieldMapping) {
            const fieldConfig = formFieldMapping[fieldName];
            
            // Skip internal fields in main processing
            if (fieldConfig.internal) {
                continue;
            }
            
            let displayValue = fieldValue;
            let additionalData = {};
            
            // Special processing for address field
            if (fieldName === 'streetAddress') {
                const addressData = processAddressData(reqBody);
                displayValue = addressData.formatted;
                additionalData = {
                    original: addressData.original,
                    quality: addressData.quality,
                    method: addressData.validationMethod,
                    confidence: addressData.confidence,
                    addressType: addressData.houseNumber.toLowerCase().includes('lot') ? 'subdivision' : 
                                parseInt(addressData.houseNumber) > 9999 ? 'rural' : 'urban'
                };
            } else {
                // Handle different field types
                if (Array.isArray(fieldValue)) {
                    displayValue = fieldValue.join(', ');
                }
            }
            
            // Skip empty values
            if (displayValue && displayValue.toString().trim()) {
                processedData.push({
                    question: fieldConfig.label,
                    answer: displayValue,
                    fieldName: fieldName,
                    ...additionalData
                });
            }
        }
    }
    
    return processedData;
}

/**
 * Twilio client configuration
 * Used for sending SMS messages
 */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_ACCESS_TOKEN;
const client = twilio(accountSid, authToken);

/**
 * PostgreSQL database connection pool
 * Stores message history and user interactions
 */
const pool = new Pool({
    user: process.env.PG_USER, // PostgreSQL username from .env
    host: process.env.PG_HOST, // PostgreSQL host from .env
    database: process.env.PG_DATABASE, // PostgreSQL database name from .env
    password: process.env.PG_PASSWORD, // PostgreSQL password from .env
    port: process.env.PG_PORT, // PostgreSQL port from .env
});

// Test database connection only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => console.log('ae9        Connected to PostgreSQL database'))
        .catch(err => console.error('ae8        Error connecting to PostgreSQL database:', err));
}
const app = express();



/**
 * Generates a unique reference number in the format BPA-XXXX
 * 
 * This function is designed to be easily modified in the future to:
 * - Read the next available sequence from an API on a foreign server
 * - Maintain consistency across distributed systems
 * - Handle failover scenarios
 * 
 * @param {string} environment - Environment type ('test', 'production', etc.)
 * @returns {string} Formatted reference number (e.g., 'BPA-4123')
 */
async function generateReferenceNumber(environment = 'production') {
    if (environment === 'test') {
        // For testing environments, use a predictable format
        return 'BPA-TEST-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
    
    // TODO: In future implementation, this could call an external API:
    // const nextNumber = await fetchNextReferenceFromAPI();
    // return `BPA-${nextNumber.toString().padStart(4, '0')}`;
    
    try {
        // Use database sequence to get next BPA reference number
        const result = await pool.query('SELECT get_next_bpa_reference() as reference_number');
        
        if (result.rows && result.rows.length > 0) {
            return result.rows[0].reference_number;
        } else {
            throw new Error('No reference number returned from database');
        }
    } catch (error) {
        console.error('Error generating reference number from database:', error);
        
        // Fallback: generate a timestamp-based reference number
        const timestamp = Date.now().toString().slice(-8);
        const fallbackRef = `BPA-FB-${timestamp}`;
        console.log(`Using fallback reference number: ${fallbackRef}`);
        return fallbackRef;
    }
}

/**
 * Clean up orphaned files in the uploads directory
 * Removes files that are older than the specified age and not referenced in active database records
 * 
 * @param {number} maxAgeHours - Maximum age in hours for files to be kept (default: 48)
 * @returns {Object} Cleanup statistics
 */
async function cleanupOrphanedFiles(maxAgeHours = 48) {
    const cleanupStats = {
        totalFilesScanned: 0,
        filesDeleted: 0,
        filesSkipped: 0,
        errors: []
    };
    
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.log('Uploads directory does not exist, skipping cleanup');
            return cleanupStats;
        }
        
        const files = fs.readdirSync(uploadsDir);
        cleanupStats.totalFilesScanned = files.length;
        
        // Get list of files currently referenced in database
        const activeFilesQuery = `
            SELECT form_data 
            FROM customer_purchases 
            WHERE form_data IS NOT NULL 
            AND form_data::text LIKE '%"hasFileAttachment":true%'
            AND created_at > NOW() - INTERVAL '7 days'
        `;
        
        const activeFilesResult = await pool.query(activeFilesQuery);
        const referencedFiles = new Set();
        
        // Extract file paths from database records
        activeFilesResult.rows.forEach(row => {
            if (row.form_data && row.form_data.files) {
                ['section32', 'propertyTitle', 'attachment'].forEach(fileType => {
                    if (row.form_data.files[fileType] && row.form_data.files[fileType].path) {
                        referencedFiles.add(path.basename(row.form_data.files[fileType].path));
                    }
                });
            }
        });
        
        console.log(`Found ${referencedFiles.size} files referenced in active database records`);
        
        for (const filename of files) {
            const filePath = path.join(uploadsDir, filename);
            
            try {
                const stats = fs.statSync(filePath);
                const fileAgeHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
                
                // Skip files that are too new or are referenced in database
                if (fileAgeHours < maxAgeHours || referencedFiles.has(filename)) {
                    cleanupStats.filesSkipped++;
                    continue;
                }
                
                // Delete old orphaned file
                fs.unlinkSync(filePath);
                cleanupStats.filesDeleted++;
                console.log(`Cleaned up orphaned file: ${filename} (${fileAgeHours.toFixed(1)} hours old)`);
                
            } catch (fileError) {
                cleanupStats.errors.push(`Error processing ${filename}: ${fileError.message}`);
                console.error(`Error processing file ${filename}:`, fileError);
            }
        }
        
        console.log(`File cleanup completed: ${cleanupStats.filesDeleted} deleted, ${cleanupStats.filesSkipped} skipped, ${cleanupStats.errors.length} errors`);
        
    } catch (error) {
        cleanupStats.errors.push(`Cleanup process error: ${error.message}`);
        console.error('Error during file cleanup:', error);
    }
    
    return cleanupStats;
}/**
 * Generic email sending function
 * Configures transporter and sends email with provided parameters
 * 
 * @param {Object} emailOptions - Email configuration object
 * @param {string} emailOptions.to - Recipient email address
 * @param {string} emailOptions.cc - CC email addresses (optional)
 * @param {string} emailOptions.replyTo - Reply-to email address (optional)
 * @param {string} emailOptions.subject - Email subject
 * @param {string} emailOptions.html - HTML email content (optional)
 * @param {string} emailOptions.text - Plain text email content
 * @param {string} emailOptions.from - Sender email address (optional, uses env default)
 * @returns {Object} Email sending result with success status and details
 */
async function sendEmail(emailOptions) {
    try {
        console.log(`dd1     sending '${emailOptions.subject}' to ${emailOptions.to}`)
        // Configure the transporter
        const transporter = nodemailer.createTransport({
            host: "cp-wc64.per01.ds.network",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        // Prepare email configuration
        const mailConfig = {
            from: emailOptions.from || process.env.SMTP_EMAIL,
            to: emailOptions.to,
            subject: emailOptions.subject,
            text: emailOptions.text,
        };

        // Add optional fields if provided
        if (emailOptions.cc) mailConfig.cc = emailOptions.cc;
        if (emailOptions.bcc) mailConfig.bcc = emailOptions.bcc;
        if (emailOptions.replyTo) mailConfig.replyTo = emailOptions.replyTo;
        if (emailOptions.html) mailConfig.html = emailOptions.html;
        if (emailOptions.attachments && emailOptions.attachments.length > 0) {
            mailConfig.attachments = emailOptions.attachments;
            console.log(`dd1a    Adding ${emailOptions.attachments.length} attachment(s) to email`);
        }

        // Auto-add admin BCC if enabled (unless the admin is already the recipient)
        if (process.env.ADMIN_BCC_ALL_EMAILS === 'true' && process.env.ADMIN_EMAIL) {
            const adminEmail = process.env.ADMIN_EMAIL;
            // Don't BCC admin if they're already the recipient or in TO/CC
            const recipients = [emailOptions.to, emailOptions.cc].join(',').toLowerCase();
            if (!recipients.includes(adminEmail.toLowerCase())) {
                if (mailConfig.bcc) {
                    // If BCC already exists, append admin email
                    mailConfig.bcc += ',' + adminEmail;
                } else {
                    // If no BCC exists, set admin as BCC
                    mailConfig.bcc = adminEmail;
                }
                console.log(`dd2     Auto-added admin BCC: ${adminEmail}`);
            }
        }

        // Send the email
        const info = await transporter.sendMail(mailConfig);
        
        console.log(`dd9     Email sent successfully to ${emailOptions.to}:`, info.response);

        //#region document customer interaction history
        const query = `
            INSERT INTO history (message, subject, time, ip, replyto, file, original_filename)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [
            emailOptions.text, 
            emailOptions.subject, 
            new Date(), 
            'system', 
            emailOptions.to, 
            null, 
            null
        ];

        try {
            await pool.query(query, values);
        } catch (dbError) {
            console.error('ps5    Error saving paid estimate to history table:', dbError);
        }
        //#endregion

        return {
            success: true,
            messageId: info.messageId,
            response: info.response,
            recipient: emailOptions.to
        };
        
    } catch (error) {
        console.error(`Error sending email to ${emailOptions.to}:`, error);
        return {
            success: false,
            error: error.message,
            recipient: emailOptions.to
        };
    }
}

/**
 * Send purchase notification email to quote manager
 * Sends an email notification when a purchase is completed
 * 
 * @param {Object} paymentData - Payment intent or charge object from Stripe
 */
async function sendPurchaseNotificationEmail(paymentData) {
    try {
        // Prepare email content
        const emailSubject = `New Purchase Notification - ${paymentData.id}`;
        const emailBody = `
A new purchase has been completed successfully.

Payment Details:
- Payment ID: ${paymentData.id}
- Amount: ${paymentData.amount ? (paymentData.amount / 100).toFixed(2) : 'N/A'} ${paymentData.currency ? paymentData.currency.toUpperCase() : 'AUD'}
- Status: ${paymentData.status}
- Created: ${new Date(paymentData.created * 1000).toLocaleString()}
- Customer Email: ${paymentData.receipt_email || 'Not provided'}

Payment Method:
- Type: ${paymentData.payment_method_types ? paymentData.payment_method_types.join(', ') : 'Not specified'}

Please review this transaction in your Stripe dashboard for more details.

This is an automated notification from the Contact Page application.
        `;

        // Send the notification email using the generic email function
        const result = await sendEmail({
            to: process.env.PERMIT_INBOX,
            subject: emailSubject,
            text: emailBody,
        });

        if (result.success) {
            console.log('dh60     Purchase notification email sent:', result.response);
        } else {
            throw new Error(result.error);
        }
        
        // Save notification to history table
        const query = `
            INSERT INTO history (message, subject, time, ip, replyto)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const values = [
            emailBody,
            emailSubject,
            new Date(),
            'system',
            process.env.PERMIT_INBOX
        ];
        
        await pool.query(query, values);
        console.log('dh61     Purchase notification saved to history');
        
        return result;
        
    } catch (error) {
        console.error('dh62     Error sending purchase notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Request logging middleware
 * Logs all incoming requests with method and path
 */
app.use((req, res, next) => {
  console.log(`x1        NEW REQUEST ${req.method} ${req.path} `);
  next();
});

/**
 * Stripe webhook endpoint
 * Handles payment-related webhooks from Stripe
 * Must be placed before JSON parsing middleware
 * 
 * @route POST /webhook
 * @param {Object} req - Express request object with raw body
 * @param {Object} res - Express response object
 */
app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    // must Precede Middleware to parse JSON bodies    //app.use(express.json());  and bodyParser.urlencoded({ extended: true });
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    console.log("dh1    Stripe webhook received with signature:", sig);
    let event;

    try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
        req.body, // Raw request body (Buffer)
        sig,
        webhookSecret
    );
    } catch (err) {
    console.error('dh28     Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('dh3      Webhook verified:', event.type);

    // Handle the event (e.g., process payment_intent.succeeded)
    switch (event.type) {
    case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('dh59     PaymentIntent succeeded:', paymentIntent.id);
        break;
    case 'charge.succeeded':
        const charge2 = event.data.object;
        console.log('dh6      Charge succeeded:', charge2.id);
        break;
    case 'payment_intent.created':
        console.log('dh7      PaymentIntent created:', event.data.object.id);
        break;
    case 'charge.failed':
        const charge3 = event.data.object;
        console.log('dh58    Charge failed:', charge3.id);
        break;
    case 'checkout.session.expired':
        const expiredSession = event.data.object;
        console.log('dh60     Checkout session expired:', expiredSession.id);
        
        // Send ce4 Failed Purchase Recovery email
        try {
            if (expiredSession.metadata && expiredSession.metadata.customerEmail && expiredSession.metadata.customerName) {
                const failedPurchaseTemplate = emailTemplates.getFailedPurchaseEmailTemplate({
                    referenceNumber: expiredSession.metadata.referenceNumber || 'N/A',
                    customerEmail: expiredSession.metadata.customerEmail,
                    customerName: expiredSession.metadata.customerName
                });
                
                await sendEmail({
                    to: expiredSession.metadata.customerEmail,
                    bcc: process.env.ADMIN_BCC_ALL_EMAILS === "true" ? process.env.ADMIN_EMAIL : undefined,
                    subject: failedPurchaseTemplate.subject || `Complete Your Building Permit Estimate`,
                    html: failedPurchaseTemplate.html,
                    text: failedPurchaseTemplate.text
                });
                
                console.log('dh61     Failed purchase recovery email sent to:', expiredSession.metadata.customerEmail);
            }
        } catch (failedEmailError) {
            console.error('dh62     Error sending failed purchase recovery email:', failedEmailError);
        }
        break;
    default:
        console.log(`dh588      Unhandled event type: ${event.type}`);
    }

    res.status(200).send("Webhook received");
});

/**
 * Express middleware configuration
 */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * Multer configuration for file uploads
 * Limits file size to 10MB and stores in uploads/ directory
 */
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * IP address extraction middleware
 * Extracts client IP from headers or socket for location tracking
 */
app.use((req, res, next) => {
    let ip = req.headers['x-forwarded-for'];
    if (ip) {
        // 'x-forwarded-for' header may contain multiple IPs, take the first one
        ip = ip.split(',')[0].trim();
    } else {
        ip = req.socket.remoteAddress;
    }
    req.clientIp = ip;
    console.log('x3          ...Client IP:', req.clientIp);
    next();
});

/**
 * Get user location based on IP address
 * Uses IPInfo API to determine geographical location
 * 
 * @route GET /get-location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON object containing location data
 */
app.get('/get-location', async (req, res) => {
    try {
        const response = await axios.get(`https://ipinfo.io/${req.clientIp}/json`);
        const locationData = response.data;
        res.json(locationData);
    } catch (error) {
        res.status(500).json({ error: 'Unable to get location data' });
    }
});

/**
 * Address validation and suggestion endpoint
 * Provides real-time address validation and suggestions using OpenStreetMap Nominatim API
 * with regex fallback for new subdivisions and rural properties
 * 
 * @route GET /validate-address
 * @param {Object} req - Express request object
 * @param {string} req.query.address - Address to validate
 * @returns {Object} JSON object containing validation results and suggestions
 */
app.get('/validate-address', async (req, res) => {
    try {
        const address = req.query.address;
        
        if (!address || address.trim().length < 3) {
            return res.json({
                success: false,
                message: 'Please provide an address with at least 3 characters',
                suggestions: []
            });
        }

        console.log(`x4        ADDRESS VALIDATION REQUEST: "${address}" from ${req.clientIp}`);
        
        // Use our existing validation function
        const validationResult = await validateAddressWithFallback(address);
        
        let suggestions = [];
        
        // If we got Nominatim results, format them as suggestions
        if (validationResult.source === 'nominatim' && validationResult.nominatim_result) {
            // We only have one result from the main validation, but we can call Nominatim again for more suggestions
            try {
                const nominatimResult = await validateWithNominatim(address);
                if (nominatimResult.success && nominatimResult.results.length > 0) {
                    // Filter and format suggestions - only Victoria addresses
                    suggestions = nominatimResult.results
                        .filter(result => {
                            const addr = result.address || {};
                            const state = addr.state || '';
                            // Double-check Victoria filtering for suggestions
                            return state.toLowerCase().includes('victoria') || 
                                   state.toLowerCase() === 'vic' ||
                                   state.toLowerCase() === 'vic.' ||
                                   (result.display_name && result.display_name.toLowerCase().includes('vic')) ||
                                   (result.display_name && result.display_name.toLowerCase().includes('victoria'));
                        })
                        .slice(0, 5) // Limit to 5 suggestions
                        .map(result => ({
                            display_name: result.display_name,
                            formatted: formatDisplayAddress(result),
                            address: result.address,
                            lat: result.lat,
                            lon: result.lon,
                            importance: result.importance,
                            confidence: 'high',
                            source: 'nominatim'
                        }));
                }
            } catch (apiError) {
                console.warn('Additional suggestions API error:', apiError.message);
            }
        }
        
        // Add regex validation info
        const regexResult = validateAddressRegex(address);
        
        const response = {
            success: validationResult.isValid,
            isValid: validationResult.isValid,
            confidence: validationResult.confidence,
            source: validationResult.source,
            addressType: validationResult.addressType,
            message: validationResult.message,
            components: validationResult.components,
            formatted: validationResult.formatted,
            suggestions: suggestions,
            regexValidation: regexResult,
            unmapped: validationResult.unmapped || false,
            fallback: validationResult.fallback || false
        };
        
        console.log(`x5        ADDRESS VALIDATION RESULT: ${validationResult.isValid ? 'VALID' : 'INVALID'} (${validationResult.confidence}) - ${suggestions.length} suggestions`);
        
        res.json(response);
        
    } catch (error) {
        console.error('Address validation endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Address validation service temporarily unavailable',
            message: 'Please try again or enter address manually',
            suggestions: []
        });
    }
});

/**
 * Manual file cleanup route (admin only)
 * Triggers cleanup of orphaned files in uploads directory
 * 
 * @route GET /admin/cleanup-files
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON object with cleanup statistics
 */
app.get('/admin/cleanup-files', async (req, res) => {
    try {
        // Simple admin check - in production you'd use proper authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_CLEANUP_TOKEN}`) {
            return res.status(401).json({ error: 'Unauthorized. Admin token required.' });
        }
        
        const maxAgeHours = parseInt(req.query.maxAge) || 48;
        const cleanupStats = await cleanupOrphanedFiles(maxAgeHours);
        
        res.json({
            success: true,
            message: 'File cleanup completed',
            statistics: cleanupStats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Manual cleanup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Cleanup failed', 
            details: error.message 
        });
    }
});

/**
 * Test address validation page
 * Simple form to test the address validation API without database integration
 * 
 * @route GET /test-address
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {String} Rendered test address form
 */
app.get('/test-address', (req, res) => {
    console.log('test1      USER('+ req.clientIp + ') is loading the address test form');
    res.render('test-address');
});

/**
 * Main page route
 * Renders the contact page with message history from database
 * 
 * @route GET /
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {String} Rendered EJS template with history data
 */
app.get('/', (req, res) => {
    console.log('ab1        USER('+ req.clientIp + ') is loading the contact page ');
    pool.query(`SELECT id, TO_CHAR("time", 'DD-Mon-YYYY hh:mm') AS formatted_date, ip, replyto, subject, message, location, file, original_filename FROM history order by "time"`, (err, result) => {
        if (err) {
            console.error('ab81         Error fetching records from history table:', err);
            // res.status(500).send('Error fetching records');
            res.render('main', { title: 'Send me an SMS' });
        } else {
            console.log(`ab2     ${result.rows.length} records fetched from history table, i.e.`, result.rows[result.rows.length - 1]);
            res.render('main', { data: result.rows });
        }
    });
});

/**
 * Submit building permit estimate request
 * Stores request details in database and sends confirmation emails
 * 
 * @route POST /submit-estimate-request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.body.customerEmail - Customer email address
 * @param {string} req.body.phone - Customer phone number
 * @param {Object} req.files - Optional file attachments (section32, propertyTitle, attachment)
 * @returns {String} Thank you page with reference number
 */
app.post('/submit-estimate-request', upload.fields([
    { name: 'section32', maxCount: 1 },
    { name: 'propertyTitle', maxCount: 1 },
    { name: 'attachment', maxCount: 1 }
]), async (req, res) => {
    console.log('em1        USER('+ req.clientIp + ') submitted estimate request');
    console.log('em12         ...sessionID:', req.sessionID);
    console.log('em11         ...body:', req.body || {});
    
    // Check if this is a test environment (for unit tests)
    if (process.env.NODE_ENV === 'test') {
        // For testing, render the thank you page with a test reference
        const testReferenceNumber = await generateReferenceNumber('test');
        const agents = JSON.parse(process.env.AGENTS || '[]');
        const officePhone = process.env.OFFICE_PHONE || '0429815177';
        return res.render('thank-you', { 
            referenceNumber: testReferenceNumber,
            agents: agents,
            officePhone: officePhone
        });
    }
    
    // Extract and validate required fields
    const { customerEmail, phone, customerName } = req.body;
    let newNotes = `[${new Date().toISOString()}] FORM SUBMISSION STARTED\n`;
    newNotes += `Customer Email: ${customerEmail || 'NOT PROVIDED'}\n`;
    newNotes += `Customer Name: ${customerName || 'NOT PROVIDED'}\n`;
    newNotes += `Customer Phone: ${phone || 'NOT PROVIDED'}\n`;
    newNotes += `Session ID: ${req.sessionID}\n`;
    newNotes += `Client IP: ${req.clientIp}\n`;
    newNotes += `User Agent: ${req.headers['user-agent'] || 'unknown'}\n`;

    if (!customerEmail || !phone || !customerName) {
        newNotes += `ERROR: Missing required fields - Email: ${!!customerEmail}, Phone: ${!!phone}, Name: ${!!customerName}\n`;
        return res.status(400).send('Missing required fields. Please provide your name, email address, and phone number.');
    }
    
    // Track file attachments
    if (req.files && Object.keys(req.files).length > 0) {
        newNotes += `File attachments received: ${Object.keys(req.files).join(', ')}\n`;
        Object.keys(req.files).forEach(fileType => {
            if (req.files[fileType] && req.files[fileType][0]) {
                newNotes += `  - ${fileType}: ${req.files[fileType][0].originalname} (${(req.files[fileType][0].size / 1024).toFixed(1)}KB)\n`;
            }
        });
    } else {
        newNotes += `No file attachments provided\n`;
    }

    // Generate a unique reference number for this estimate request
    let referenceNumber;
    try {
        referenceNumber = await generateReferenceNumber();
        newNotes += `Reference number generated: ${referenceNumber}\n`;
    } catch (refError) {
        newNotes += `ERROR: Failed to generate reference number: ${refError.message}\n`;
        // Still try to continue with a fallback
        referenceNumber = `BPA-ERROR-${Date.now().toString().slice(-8)}`;
        newNotes += `Using emergency fallback reference: ${referenceNumber}\n`;
    }
    
    // Store the processed data back in req.body for the redirect
    req.body.referenceNumber = referenceNumber;
    req.body.customerEmail = customerEmail;
    req.body.customerName = customerName;
    req.body.customerPhone = phone;
    req.body.hasFullFormData = true; // Flag to indicate complete form submission

    // Process form data dynamically for email templates
    const processedFormData = processFormData(req.body);
    newNotes += `Processed ${processedFormData.length} form fields dynamically\n`;

    // Add address validation if streetAddress is provided
    if (req.body.streetAddress) {
        try {
            const addressValidation = await validateAddressWithFallback(req.body.streetAddress);
            req.addressValidation = addressValidation;
            newNotes += `Address validation: ${addressValidation.confidence} confidence via ${addressValidation.source}\n`;
            newNotes += `Address type: ${addressValidation.addressType}, Valid: ${addressValidation.isValid}\n`;
            if (addressValidation.unmapped) {
                newNotes += `NOTE: Address not in mapping database - may be new development\n`;
            }
        } catch (validationError) {
            console.warn('Address validation error:', validationError);
            newNotes += `Address validation failed: ${validationError.message}\n`;
            req.addressValidation = {
                isValid: false,
                confidence: 'low',
                source: 'error',
                message: 'Validation failed'
            };
        }
    }

    // Send sysadmin heads-up email asynchronously
    try {
        const adminAlertTemplate = emailTemplates.sysAdminNewCustomerAlertTemplate({
            formData: req.body,
            processedFormData: processedFormData,
            referenceNumber,
            clientIp: req.clientIp
        });
        
        newNotes += `Email template generated successfully for admin notification\n`;
        
        sendEmail({
            to: process.env.ADMIN_EMAIL || "john@buildingbb.com.au",
            subject: `New Estimate Request [Ref: ${referenceNumber}] - ${customerName}`,
            html: adminAlertTemplate.html,
            text: adminAlertTemplate.text,
        }).then((emailResult) => {
            console.log('em15   Admin notification email sent for new estimate submission');
            
        }).catch(emailError => {
            console.error('em16   Error sending admin notification email:', emailError);
            
        });
        
        newNotes += `Admin notification email queued for sending\n`;
        console.log("em3     sent sysAdmin headsup email")
    } catch (templateError) {
        console.error('em16   Error generating admin notification template:', templateError);
        newNotes += `ERROR: Failed to generate admin email template: ${templateError.message}\n`;
    }


    //#region create initial customer record
        // Create new record with available information from form submission
        newNotes += `DATABASE RECORD CREATION:\n`;
        newNotes += `Attempting to create customer_purchases record at ${new Date().toISOString()}\n`;
        
        const insertQuery = `
            INSERT INTO customer_purchases (
                web_session_id,
                reference_number,
                customer_email,
                customer_name,
                customer_phone,
                customer_ip,
                created_at,
                last_seen_time,
                form_data,
                notes 
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        // Prepare form data as JSON for storage including actual file paths
        const formDataJson = {
            originalFormSubmission: req.body,
            hasFileAttachment: req.files && Object.keys(req.files).length > 0,
            files: req.files ? {
                section32: req.files.section32 ? {
                    filename: req.files.section32[0].originalname,
                    path: req.files.section32[0].path,
                    size: req.files.section32[0].size,
                    mimetype: req.files.section32[0].mimetype
                } : null,
                propertyTitle: req.files.propertyTitle ? {
                    filename: req.files.propertyTitle[0].originalname,
                    path: req.files.propertyTitle[0].path,
                    size: req.files.propertyTitle[0].size,
                    mimetype: req.files.propertyTitle[0].mimetype
                } : null,
                attachment: req.files.attachment ? {
                    filename: req.files.attachment[0].originalname,
                    path: req.files.attachment[0].path,
                    size: req.files.attachment[0].size,
                    mimetype: req.files.attachment[0].mimetype
                } : null
            } : null
        };
        
        const insertValues = [
            req.sessionID || null,      // $1 - web_session_id (Express session ID if available)
            referenceNumber,            // $2 - reference_number (generated in this function)
            customerEmail,                    // $3 - customer_email (from form)
            customerName,               // $4 - customer_name (from form)
            phone,                      // $5 - customer_phone (from form)
            req.clientIp || null,       // $6 - customer_ip (from middleware)
            new Date(),                 // $7 - created_at
            new Date(),                 // $8 - last_seen_time
            formDataJson,               // $9 - form_data as JSON
            newNotes                    // $10 - notes
        ];

        try {
            await pool.query(insertQuery, insertValues);
            console.log('em13   Initial customer purchase record created for form submission');
            newNotes += `SUCCESS: Customer record created in database\n`;

        } catch (insertError) {
            console.error('em14   Error creating initial customer purchase record:', insertError);
            newNotes += `ERROR: Failed to create customer record: ${insertError.message}\n`;
            newNotes += `Error details: ${insertError.code || 'unknown error code'}\n`;
        }
    
    //#endregion

    newNotes += `FORM SUBMISSION COMPLETED:\n`;
    newNotes += `Redirecting to payment portal at ${new Date().toISOString()}\n`;
    newNotes += `Redirect URL: /create-checkout-session?customerEmail=${encodeURIComponent(customerEmail)}\n`;

    // Redirect to create checkout session with the form data
    const redirectUrl = `/create-checkout-session?customerEmail=${encodeURIComponent(customerEmail)}`;
    return res.redirect(307, redirectUrl);


});

/**
 * Send email with customer callback request details
 * Stores message details in database and sends email
 * 
 * @route POST /send-email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.body.firstName - Customer first name
 * @param {string} req.body.phone - Customer phone number
 * @param {string} req.body.email - Customer email address
 * @param {string} req.body.message - Customer message/preferred callback time
 * @returns {String} Success message or error message
 */
app.post('/send-email', async (req, res) => {
    console.log('em1        USER('+ req.clientIp + ') is sending a callback request    ', req.body);
    let { firstName, phone, email, message } = req.body;
    
    if (!firstName || !phone || !email) {
        return res.status(400).send('Missing required fields. Please provide your first name, phone number, and email address.');
    }
    
    if (message === null || message === undefined) {
        message = 'No specific time preference provided';
    }    

    // Insert message details into the history table
    const currentDate = new Date();
    const query = `
        INSERT INTO history (message, subject, time, ip, replyto)
        VALUES ($1, $2, $3, $4, $5)
    `;
    
    // Format the message for database storage
    const formattedMessage = `CALLBACK REQUEST FROM: ${firstName}
Phone: ${phone}
Email: ${email}
Best time to call: ${message}
Submitted: ${currentDate.toLocaleString('en-AU')}`;
    
    // Extract details and insert into the database
    const values = [formattedMessage, 'Callback Request from ' + firstName, currentDate, req.clientIp, email];
    try {
        await pool.query(query, values);
        console.log('em3          Callback request details saved to database');
    } catch (dbError) {
        console.error('em38         Error saving callback request to database:', dbError.message);
    }

    // // Configure email transporter
    // const transporter = nodemailer.createTransport({
    //     host: "cp-wc64.per01.ds.network",
    //     port: 587,
    //     secure: false,
    //     requireTLS: true,
    //     auth: {
    //         user: process.env.SMTP_EMAIL,
    //         pass: process.env.SMTP_PASSWORD,
    //     },
    // });

    // Send email notification to business team using the generic email function
    try {
        const templateData = {
            firstName,
            phone,
            email,
            message,
            currentDate,
            clientIp: req.clientIp
        };
        
        const emailTemplate = emailTemplates.getCallbackRequestTemplate(templateData);
        
        const emailResult = await sendEmail({
            to: process.env.ADMIN_EMAIL || "john@buildingbb.com.au",
            cc: process.env.ADMIN_BCC_ALL_EMAILS === "true" ? process.env.PERMIT_INBOX : undefined,
            replyTo: email,
            subject: `📞 Callback Request from ${firstName} (${phone})`,
            html: emailTemplate.html,
            text: emailTemplate.text
        });

        if (emailResult.success) {
            console.log('em9          Callback request email sent successfully');
            return res.send(`Callback request submitted successfully! We'll contact you at ${phone} during your preferred time.`);
        } else {
            throw new Error(emailResult.error);
        }
        
    } catch (error) {
        console.log('em8          Error sending callback request email:', error.message);
        return res.send(`Error submitting callback request: ${error.message}`);
    }
});

/**
 * Stripe payment processing routes
 */

/**
 * Payment success page - Process estimate request after successful payment
 * 
 * @route GET /success
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {String} Success message or redirect to thank you page
 */
app.get("/success", async (req, res) => {
    try {
        console.log('ps1        USER('+ req.clientIp + ') submitted estimate request');
        console.log('ps12         ...sessionID:', req.sessionID);
        console.log('ps11         ...body:', req.body || {});

        const sessionId = req.query.session_id;
        let newNotes = `[${new Date().toISOString()}] PAYMENT SUCCESS PROCESSING\n`;
        newNotes += `Session ID: ${sessionId || 'NOT PROVIDED'}\n`;
        newNotes += `Client IP: ${req.clientIp}\n`;
        
        if (!sessionId) {
            console.log("ps1    Payment successful but no session ID provided");
            newNotes += `ERROR: Missing session ID - manual reconciliation required\n`;
            return res.send("Payment successful! Thank you for your purchase.");
        } else {
            console.log("ps11     working with session ID:", sessionId);
            newNotes += `Processing with session ID: ${sessionId}\n`;
        }

        // Retrieve the checkout session to get metadata
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log("ps2    session metadata:", session.metadata);
        newNotes += `Stripe session retrieved successfully\n`;
        newNotes += `Session metadata: ${JSON.stringify(session.metadata)}\n`;

        // Extract customer email from session (either from metadata or customer_email)
        const customerEmail = session.metadata?.customerEmail || session.customer_details?.email || session.customer_email || null;
        
        if (!customerEmail) {
            newNotes += `ERROR: No customer email found in session data\n`;
            console.log("ps3    Payment successful but no customer email found");
            const feeAmount = ((process.env.ESTIMATE_FEE || 5500) / 100).toFixed(2);
            return res.send(`Payment successful! Thank you for your $${feeAmount} purchase. Please contact us at alex@buildingbb.com.au with your transaction ID: ${session.payment_intent} to process your estimate request.`);
        } else {
            newNotes += `Customer email identified: ${customerEmail}\n`;
        }

        // Extract estimate request data from metadata (if not available use dummy data)
        const {
            referenceNumber = session.metadata?.referenceNumber ,     //this must only come from the initial form submission
            customerName = session.metadata?.customerName,
            customerPhone = session.metadata?.customerPhone,
            clientIp = session.metadata?.clientIp,
            hasFullFormData = session.metadata?.hasFullFormData || 'false' 
        } = session.metadata || {};


        // Send thank you email to customer with payment confirmation
        const customerTemplateData = { referenceNumber, session };
        const customerEmailTemplate = emailTemplates.getCustomerThankyouEmailTemplate(customerTemplateData);
        newNotes += `EMAIL OPERATIONS:\n`;

        try {
            await sendEmail({
                to: customerEmail,
                bcc: process.env.ADMIN_EMAIL || "john@buildingbb.com.au",
                subject: `Your confirmation receipt - Victorian Permit Applications [Ref: ${referenceNumber}]`,
                html: customerEmailTemplate.html,
                text: customerEmailTemplate.text
            });
            newNotes += `SUCCESS: Customer confirmation email sent to ${customerEmail}\n`;
        } catch (emailError) {
            newNotes += `ERROR: Failed to send customer confirmation email: ${emailError.message}\n`;
        }

        // Send notification email to business team with payment proof and file attachments
        // Extract customer data from session metadata for detailed business notification
        const customerData = {
            customerName,
            customerEmail,
            phone: customerPhone,
            // Include any other form data from metadata if available
            ...session.metadata
        };
        
        const businessEmailTemplate = emailTemplates.getNotifyPermitEstimateProceedTemplate(customerData);

        // Retrieve and prepare file attachments from database
        let emailAttachments = [];
        let attachmentPaths = [];
        
        try {
            // Query database for file information related to this customer
            const fileQuery = `
                SELECT form_data 
                FROM customer_purchases 
                WHERE reference_number = $1 OR customer_email = $2
                ORDER BY created_at DESC
                LIMIT 1
            `;
            
            const fileResult = await pool.query(fileQuery, [referenceNumber, customerEmail]);
            newNotes += `Database file lookup for attachments\n`;
            
            if (fileResult.rows.length > 0 && fileResult.rows[0].form_data) {
                const formData = fileResult.rows[0].form_data;
                newNotes += `Form data found in database for attachments\n`;
                
                // Check if files were uploaded with the original form submission
                if (formData.hasFileAttachment && formData.files) {
                    const fileTypes = ['section32', 'propertyTitle', 'attachment'];
                    
                    for (const fileType of fileTypes) {
                        if (formData.files[fileType] && formData.files[fileType].path) {
                            const fileInfo = formData.files[fileType];
                            const filePath = path.resolve(__dirname, fileInfo.path);
                            
                            // Check if the file still exists
                            if (fs.existsSync(filePath)) {
                                emailAttachments.push({
                                    filename: fileInfo.filename,
                                    path: filePath,
                                    contentType: fileInfo.mimetype || 'application/octet-stream'
                                });
                                attachmentPaths.push(filePath);
                                newNotes += `Attachment prepared: ${fileType} -> ${fileInfo.filename} (${(fileInfo.size / 1024).toFixed(1)}KB)\n`;
                            } else {
                                newNotes += `WARNING: File not found: ${fileInfo.filename} at ${filePath}\n`;
                            }
                        }
                    }
                }
            }
            
            if (emailAttachments.length > 0) {
                newNotes += `${emailAttachments.length} file(s) will be attached to business email\n`;
            } else {
                newNotes += `No file attachments found for this customer\n`;
            }
            
        } catch (fileError) {
            newNotes += `ERROR: Failed to retrieve file attachments: ${fileError.message}\n`;
            console.error('File attachment retrieval error:', fileError);
        }

        try {
            await sendEmail({
                to: businessEmailTemplate.to,
                bcc: process.env.ADMIN_BCC_ALL_EMAILS === "true" ? process.env.ADMIN_EMAIL : undefined,
                replyTo: customerEmail,
                subject: businessEmailTemplate.subject,
                text: businessEmailTemplate.text,
                attachments: emailAttachments  // Include actual file attachments
            });
            newNotes += `SUCCESS: Business notification email sent with ${emailAttachments.length} attachment(s) to ${process.env.PERMIT_INBOX || "permits@vicpa.com.au"}\n`;
            
            // Clean up attachment files after successful email sending
            if (attachmentPaths.length > 0) {
                newNotes += `FILE CLEANUP:\n`;
                for (const filePath of attachmentPaths) {
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            newNotes += `SUCCESS: Deleted attachment file: ${path.basename(filePath)}\n`;
                            console.log(`File cleaned up: ${filePath}`);
                        }
                    } catch (cleanupError) {
                        newNotes += `ERROR: Failed to delete file ${path.basename(filePath)}: ${cleanupError.message}\n`;
                        console.error(`Error deleting file ${filePath}:`, cleanupError);
                    }
                }
            }
            
        } catch (emailError) {
            newNotes += `ERROR: Failed to send business notification email: ${emailError.message}\n`;
            // Don't delete files if email failed - they might be needed for retry
        }

        console.log('ps6    Confirmation emails sent after successful payment');

        //#region update customer job details 
        newNotes += `DATABASE UPDATE OPERATIONS:\n`;
        // Insert/Update customer purchase tracking record - find existing record first
        const findExistingQuery = `
            SELECT id FROM customer_purchases 
            WHERE reference_number = $1 OR stripe_checkout_session_id = $2
            LIMIT 1
        `;
        
        let existingRecord = null;
        try {
            const findResult = await pool.query(findExistingQuery, [referenceNumber, sessionId]);
            existingRecord = findResult.rows[0] || null;
            console.log('ps4a   Existing customer record found:', existingRecord ? 'YES' : 'NO');
            newNotes += `Database record lookup: ${existingRecord ? 'FOUND existing record' : 'No existing record found'}\n`;
        } catch (findError) {
            console.error('ps4a   Error finding existing customer record:', findError);
            newNotes += `ERROR: Database lookup failed: ${findError.message}\n`;
        }


        if (existingRecord) {
            // Update existing record - only add new information
            newNotes += `Updating existing customer record (ID: ${existingRecord.id})\n`;
            const updateQuery = `
                UPDATE customer_purchases 
                SET 
                    stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $1),
                    stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, $2),
                    payment_amount = COALESCE(payment_amount, $3),
                    payment_status = $4,
                    payment_completed_time = COALESCE(payment_completed_time, $5),
                    last_seen_time = $6,
                    notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $7
                WHERE id = $8
            `;
            
            const updateValues = [
                session.payment_intent,      // $1 - only set if not already set
                sessionId,                   // $2 - only set if not already set
                parseInt(process.env.ESTIMATE_FEE) || 5500,  // $3 - only set if not already set
                session.payment_status,     // $4 - always update payment status
                new Date(),                 // $5 - only set if not already set
                new Date(),                 // $6 - always update last seen
                newNotes,                   // $7 - append new notes
                existingRecord.id           // $8 - record ID to update
            ];

            try {
                await pool.query(updateQuery, updateValues);
                console.log('ps4b   Existing customer purchase record updated with payment completion info');
                newNotes += `SUCCESS: Customer record updated with payment completion\n`;
            } catch (updateError) {
                console.error('ps5b   Error updating existing customer purchase record:', updateError);
                newNotes += `ERROR: Failed to update customer record: ${updateError.message}\n`;
            }
        } else {
            // Create new record with available information
            newNotes += `Creating new customer record for late recovery\n`;
            const insertQuery = `
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
                    payment_completed_time,
                    last_seen_time,
                    form_data,
                    notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;

            const formDataJson = emailMessage ? { originalFormSubmission: emailMessage } : null;
            
            const insertValues = [
                referenceNumber,            // $1 - reference_number
                session.payment_intent,     // $2 - stripe_payment_intent_id
                sessionId,                  // $3 - stripe_checkout_session_id
                parseInt(process.env.ESTIMATE_FEE) || 5500,  // $4 - payment_amount
                'AUD',                     // $5 - payment_currency
                session.payment_status,    // $6 - payment_status
                customerName,              // $7 - customer_name
                customerEmail,             // $8 - customer_email
                customerPhone,             // $9 - customer_phone
                clientIp,                  // $10 - customer_ip
                new Date(),                // $11 - payment_completed_time
                new Date(),                // $12 - last_seen_time
                formDataJson,              // $13 - form_data as JSON
                newNotes                   // $14 - notes
            ];

            try {
                await pool.query(insertQuery, insertValues);
                console.log('ps4b   New customer purchase record created');
                newNotes += `SUCCESS: New customer record created for payment completion\n`;

            } catch (insertError) {
                console.error('ps5b   Error creating new customer purchase record:', insertError);
                newNotes += `ERROR: Failed to create new customer record: ${insertError.message}\n`;
            }
        }
        //#endregion

        
        // Redirect to thank you page with reference number
        const agents = JSON.parse(process.env.AGENTS || '[]');
        const officePhone = process.env.OFFICE_PHONE || '0429815177';
        res.render('thank-you', { 
            referenceNumber: referenceNumber,
            agents: agents,
            officePhone: officePhone
        });

    } catch (error) {
        console.error('ps7    Error processing successful payment:', error);
        res.status(500).send(`Error processing your estimate request: ${error.message}. Please contact us directly at alex@buildingbb.com.au or 0429 815 177`);
    }
});

/**
 * Payment cancellation page
 * 
 * @route GET /cancel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {String} Cancellation message
 */
app.get("/cancel", async (req, res) => {
    console.log("ps1    Payment cancelled for user:", req.user ? req.user: 'guest');
    console.log("ps1a   Session info - ID:", req.sessionID, "IP:", req.clientIp);
    if ( req.body) {
        console.log('ps1b       body:', req.body);
    }
    let newNotes = `[${new Date().toISOString()}] PAYMENT CANCELLATION\n`;
    newNotes += `User cancelled payment process\n`;
    newNotes += `Session ID: ${req.sessionID}\n`;
    newNotes += `Client IP: ${req.clientIp}\n`;
    
    // Try to find existing customer record using available session information
    const findExistingQuery = `
        SELECT id, customer_email, reference_number FROM customer_purchases 
        WHERE web_session_id = $1 OR customer_ip = $2
        ORDER BY last_seen_time DESC
        LIMIT 1
    `;
    
    let existingRecord = null;
    try {
        const findResult = await pool.query(findExistingQuery, [req.sessionID, req.clientIp]);
        existingRecord = findResult.rows[0] || null;
        console.log('ps13   Existing customer record found:', existingRecord ? `YES (${existingRecord.customer_email})` : 'NO');
        
        if (existingRecord) {
            newNotes += `Customer record found: ${existingRecord.customer_email} (${existingRecord.reference_number})\n`;
        } else {
            newNotes += `No existing customer record found for session/IP\n`;
        }
    } catch (findError) {
        console.error('ps1c   Error finding existing customer record:', findError);
        newNotes += `ERROR: Database lookup failed: ${findError.message}\n`;
    }

    if (existingRecord) {
        // Update existing record - mark payment as cancelled
        const updateQuery = `
            UPDATE customer_purchases 
            SET 
                payment_status = $1,
                last_seen_time = $2,
                notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $3
            WHERE id = $4
        `;
        
        const updateValues = [
            'cancelled',                // $1 - payment_status
            new Date(),                 // $2 - last_seen_time
            newNotes,                   // $3 - append new notes
            existingRecord.id           // $4 - record ID to update
        ];

        try {
            await pool.query(updateQuery, updateValues);
            console.log('ps1d   Customer purchase record updated with cancellation status');
        } catch (updateError) {
            console.error('ps1e   Error updating customer purchase record:', updateError);
        }
    } else {
        console.log('ps1f   No customer record found to update for cancellation');
    }
    
    res.send("Payment cancelled. Please try again or contact us at alex@buildingbb.com.au for assistance.");
});

/**
 * Create Stripe checkout session for building permit estimate
 * Creates a payment session and stores customer estimate request data
 * 
 * @route POST /create-checkout-session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Redirect} Redirects to Stripe checkout page
 */
app.post("/create-checkout-session", async (req, res) => {

    try {
        console.log('ps1        USER('+ req.clientIp + ') submitted estimate request');
        console.log('ps12         ...sessionID:', req.sessionID);
        console.log('ps13         ...req.query:', req.query);
        console.log('ps11         ...body:', req.body || {});
        
        // Extract the required data for payment processing
        let newNotes = `[${new Date().toISOString()}] CHECKOUT SESSION CREATION\n`;
        newNotes += `Session ID: ${req.sessionID}\n`;
        newNotes += `Client IP: ${req.clientIp}\n`;

        // Make req.body optional - handle cases where redirect didn't preserve body data
        const requestData = req.body || {};
        let { customerEmail, referenceNumber, customerName, customerPhone, hasFullFormData } = requestData;
        console.log('ps2    Body:', requestData);
        newNotes += `Form data received: ${Object.keys(requestData).length} fields\n`;
        
        if (!customerEmail || !referenceNumber || !customerName || !customerPhone) {
            console.log('ps51    No customer data found in request, recreating from database with sessionID and req.query.customeremail');
            newNotes += `CUSTOMER DATA RECOVERY:\n`;
            newNotes += `Missing customer data, attempting database recovery\n`;
            
            // Try to get customer email from query params if not in body
            const queryCustomerEmail = req.query.customerEmail;
            
            // Query database for customer information using session ID or email from query
            const findCustomerQuery = `
                SELECT reference_number, customer_email, customer_name, customer_phone, web_session_id
                FROM customer_purchases 
                WHERE (web_session_id = $1 AND web_session_id IS NOT NULL) 
                   OR (customer_email = $2 AND customer_email IS NOT NULL)
                   OR (customer_ip = $3 AND customer_ip IS NOT NULL)
                ORDER BY created_at DESC
                LIMIT 1
            `;
            
            try {
                const findResult = await pool.query(findCustomerQuery, [
                    req.sessionID || null,
                    queryCustomerEmail || null,
                    req.clientIp || null
                ]);
                
                if (findResult.rows.length > 0) {
                    const dbCustomer = findResult.rows[0];
                    console.log('ps52    Found customer in database:', dbCustomer.customer_email);
                    
                    // Restore customer data from database
                    customerEmail = customerEmail || dbCustomer.customer_email;
                    referenceNumber = referenceNumber || dbCustomer.reference_number;
                    customerName = customerName || dbCustomer.customer_name;
                    customerPhone = customerPhone || dbCustomer.customer_phone;

                    // Log for debugging:
                    if (req.sessionID == dbCustomer.web_session_id) {
                        console.log('ps50    Session ID matches database record:', dbCustomer.web_session_id);
                    } else {
                        console.log('ps50    Session ID does not match database record:', dbCustomer.web_session_id, ' compared to current req.sessionID: ', req.sessionID);
                    }
                    
                    newNotes += `SUCCESS: Customer data recovered from database: ${dbCustomer.customer_email}\n`;
                } else {
                    console.log('ps53    No customer found in database, using query parameter if available');
                    customerEmail = customerEmail || queryCustomerEmail || null;
                    newNotes += `No database match found, using query email: ${queryCustomerEmail || 'none'}\n`;
                }
                
            } catch (dbError) {
                console.error('ps54    Error querying database for customer info:', dbError);
                customerEmail = customerEmail || queryCustomerEmail || null;
                newNotes += `ERROR: Database recovery failed: ${dbError.message}\n`;
                newNotes += `Fallback to query email: ${queryCustomerEmail || 'none'}\n`;
            }
        }
        // Log the final customer data we have after recovery attempt
        console.log('ps55    Final customer data - Email:', customerEmail, 'Ref:', referenceNumber, 'Name:', customerName, 'Phone:', customerPhone);
        newNotes += `Final customer data - Email: ${customerEmail}, Ref: ${referenceNumber}, Name: ${customerName}, Phone: ${customerPhone}\n`;
        
        // Create Stripe session configuration
        newNotes += `STRIPE SESSION CREATION:\n`;
        const sessionConfig = {
            line_items: [
            {
                price_data: {
                currency: 'aud',
                product_data: {
                    name: 'Building Permit Estimate Service',
                    description: 'Building permit cost estimate',
                },
                unit_amount: parseInt(process.env.ESTIMATE_FEE) || 5500, // Amount in cents from env var
                },
                quantity: 1,
            },
            ],
            mode: 'payment',
            success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: 'http://localhost:3000/cancel',
            // Store customer data in metadata (if available)
            metadata: {
                referenceNumber: referenceNumber || 'unknown',
                customerEmail: customerEmail || 'not-provided',
                customerName: customerName || 'Customer',
                customerPhone: customerPhone || 'Not provided',
                // Add validated address data if available
                ...(req.addressValidation && {
                    addressValidated: req.addressValidation.isValid ? 'true' : 'false',
                    addressSource: req.addressValidation.source || 'unknown',
                    addressConfidence: req.addressValidation.confidence || 'low',
                    addressType: req.addressValidation.addressType || 'unknown',
                    formattedAddress: req.addressValidation.formatted || req.body.streetAddress || ''
                })
            }
        };
        console.log('ps5    initialising stripe session configuration:', sessionConfig);
        newNotes += `Stripe session configured with amount: $${((parseInt(process.env.ESTIMATE_FEE) || 5500) / 100).toFixed(2)}\n`;

        // Pre-populate email on Stripe payment form only if customer email is available
        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
            newNotes += `Customer email pre-populated in Stripe form\n`;
        } else {
            newNotes += `WARNING: No customer email to pre-populate in Stripe form\n`;
        }
        
        const session = await stripe.checkout.sessions.create(sessionConfig);
        console.log('ps91   Checkout session created successfully:', session.id);
        newNotes += `SUCCESS: Stripe checkout session created: ${session.id}\n`;

        //#region update customer job details 
        newNotes += `DATABASE OPERATIONS:\n`;
        // Insert/Update customer purchase tracking record - find existing record first
        const findExistingQuery = `
            SELECT id FROM customer_purchases 
            WHERE reference_number = $1 OR customer_email = $2
            LIMIT 1
        `;
        
        let existingRecord = null;
        try {
            const findResult = await pool.query(findExistingQuery, [referenceNumber, customerEmail]);
            existingRecord = findResult.rows[0] || null;
            console.log('ps4a   Existing customer record found:', existingRecord ? 'YES' : 'NO');
            newNotes += `Database lookup: ${existingRecord ? 'Found existing record' : 'No existing record'}\n`;
        } catch (findError) {
            console.error('ps4a   Error finding existing customer record:', findError);
            newNotes += `ERROR: Database lookup failed: ${findError.message}\n`;
        }


        if (existingRecord) {
            // Update existing record - append new information to existing data
            newNotes += `Updating existing customer record\n`;
            const updateQuery = `
                UPDATE customer_purchases 
                SET 
                    stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, $1),
                    payment_amount = COALESCE(payment_amount, $2),
                    payment_currency = COALESCE(payment_currency, $3),
                    payment_status = $4,
                    last_seen_time = $5,
                    notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END || $6
                WHERE id = $7
            `;
            
            const updateValues = [
                session.id,                 // $1 - stripe_checkout_session_id (only set if not already set)
                parseInt(process.env.ESTIMATE_FEE) || 5500,  // $2 - payment_amount (only set if not already set)
                null,                      // $3 - payment_currency (only set if not already set)
                'pending',                  // $4 - payment_status (always update)
                new Date(),                 // $5 - last_seen_time (always update)
                newNotes,                   // $6 - append new notes
                existingRecord.id           // $7 - record ID to update
            ];

            try {
                await pool.query(updateQuery, updateValues);
                console.log('ps4b   Existing customer purchase record updated with checkout session info');
                newNotes += `SUCCESS: Customer record updated with checkout session\n`;
            } catch (updateError) {
                console.error('ps5b   Error updating existing customer purchase record:', updateError);
                newNotes += `ERROR: Failed to update customer record: ${updateError.message}\n`;
            }
        } else {
            // Create new record with available information to assist in recreating missing record
            newNotes += `Creating new customer record for checkout session\n`;
            const insertQuery = `
                INSERT INTO customer_purchases (
                    reference_number,
                    customer_email,
                    customer_name,
                    customer_phone,
                    customer_ip,
                    stripe_checkout_session_id,
                    payment_amount,
                    payment_currency,
                    payment_status,
                    created_at,
                    last_seen_time,
                    notes 
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            
            const insertValues = [
                referenceNumber || 'Unknown', // $1 - reference_number
                customerEmail || 'not-provided',  // $2 - customer_email
                customerName || 'Customer', // $3 - customer_name
                customerPhone || 'Not provided', // $4 - customer_phone
                req.clientIp || 'checkout-portal', // $5 - customer_ip
                session.id,                 // $6 - stripe_checkout_session_id
                parseInt(process.env.ESTIMATE_FEE) || 5500,  // $7 - payment_amount
                null,                       // $8 - payment_currency
                'pending',                 // $9 - payment_status
                null,                       // $10 - created_time
                new Date(),                // $11 - last_seen_time
                newNotes                   // $12 - notes
            ];

            try {
                await pool.query(insertQuery, insertValues);
                console.log('ps4b   New customer purchase record created for checkout session');
                newNotes += `SUCCESS: New customer record created\n`;

            } catch (insertError) {
                console.error('ps5b   Error creating new customer purchase record:', insertError);
                newNotes += `ERROR: Failed to create customer record: ${insertError.message}\n`;
            }
        }
        //#endregion

        newNotes += `CHECKOUT COMPLETION:\n`;
        newNotes += `Redirecting to Stripe checkout at ${new Date().toISOString()}\n`;
        newNotes += `Stripe session URL: ${session.url}\n`;


        res.redirect(303, session.url);
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).send(`Error creating payment session: ${error.message}`);
    }
});

/**
 * Start the Express server
 * Only start server if this file is run directly (not imported for testing)
 */
if (require.main === module) {
    app.listen(port, () => {
        console.log(`ad3        SERVER is running on port ${port}`);
    });
}

/**
 * Build email message from form data
 * Legacy function for test compatibility
 * 
 * @param {Object} formData - Form data from estimate request
 * @returns {string} Formatted email message
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
    
    // Add additional information if provided
    if (formData.emailMessage && formData.emailMessage.trim()) {
        message += 'ADDITIONAL INFORMATION:\n';
        message += formData.emailMessage + '\n\n';
    }
    
    // Add footer with estimate service information
    const feeAmount = ((process.env.ESTIMATE_FEE || 5500) / 100).toFixed(2);
    message += '---\n';
    message += 'This estimate request was submitted via the Victorian Permit Applications website.\n';
    message += `Please note: This is a $${feeAmount} estimate service to provide you with a preliminary cost assessment.\n`;
    message += `This estimate is not a final quote. The $${feeAmount} will be credited back if you proceed with our services.\n`;
    message += `Submitted: ${new Date().toLocaleString('en-AU')}\n`;
    
    return message;
}

// Export the app for testing
module.exports = app;
module.exports.sendEmail = sendEmail;
module.exports.sendPurchaseNotificationEmail = sendPurchaseNotificationEmail;
module.exports.pool = pool;
module.exports.emailTemplates = emailTemplates;
module.exports.buildEstimateEmailMessage = emailTemplates.buildEstimateEmailMessage;
module.exports.cleanupOrphanedFiles = cleanupOrphanedFiles;

// Start server and run initial cleanup (only when not in test mode)
if (require.main === module && process.env.NODE_ENV !== 'test') {
    const server = app.listen(port, async () => {
        console.log(`💼 Contact Page Application started on port ${port}`);
        console.log(`🌐 Server URL: http://localhost:${port}`);
        console.log(`📧 Email alerts: ${process.env.ADMIN_EMAIL || 'Not configured'}`);
        console.log(`🏗️  Permit inbox: ${process.env.PERMIT_INBOX || 'Not configured'}`);
        
        // Run initial file cleanup on startup
        try {
            console.log('🧹 Running initial file cleanup...');
            const cleanupStats = await cleanupOrphanedFiles(48); // Clean files older than 48 hours
            console.log(`✅ Startup cleanup completed: ${cleanupStats.filesDeleted} files removed, ${cleanupStats.filesSkipped} files kept`);
        } catch (cleanupError) {
            console.error('⚠️  Error during startup cleanup:', cleanupError.message);
        }
        
        // Schedule periodic cleanup every 6 hours
        setInterval(async () => {
            try {
                console.log('🧹 Running scheduled file cleanup...');
                const cleanupStats = await cleanupOrphanedFiles(48);
                console.log(`✅ Scheduled cleanup completed: ${cleanupStats.filesDeleted} files removed`);
            } catch (cleanupError) {
                console.error('⚠️  Error during scheduled cleanup:', cleanupError.message);
            }
        }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('📴 SIGTERM received, shutting down gracefully...');
        server.close(async () => {
            try {
                if (pool) {
                    await pool.end();
                    console.log('💾 Database connections closed');
                }
                console.log('✅ Server shutdown complete');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        });
    });
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app; // Export the main app
    module.exports.validateAddressWithFallback = validateAddressWithFallback;
    module.exports.validateAddressRegex = validateAddressRegex;
    module.exports.validateWithNominatim = validateWithNominatim;
    module.exports.processAddressData = processAddressData;
    module.exports.calculateAddressQuality = calculateAddressQuality;
}

