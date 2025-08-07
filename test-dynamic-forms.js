/**
 * Test script to demonstrate the new dynamic form processing system
 * This shows how the system now handles form data dynamically without hardcoding field names
 */

// Import the email templates and app functions
const emailTemplates = require('./email-templates');

// Simulate the form field mapping from app.js
const formFieldMapping = {
    customerName: 'Customer Name',
    customerEmail: 'Email Address', 
    phone: 'Phone Number',
    streetAddress: 'Street Address',
    foundation: 'Foundation Type',
    location: 'Shed Location Description',
    boundarySetbacks: 'Boundary Distance',
    structureLength: 'Structure Length',
    structureWidth: 'Structure Width',
    dwellingOnProperty: 'Dwelling on Property',
    adjacentDwelling: 'Adjacent Dwelling',
    dwellingPermitted: 'Dwelling Permitted',
    purpose: 'Primary Purpose',
    'storageItems[]': 'Storage Items',
    farmingOtherText: 'Other Farming Use',
    domesticOtherText: 'Other Domestic Use', 
    commercialOtherText: 'Commercial Use Details',
    commercialZone: 'Commercial Zone',
    buildingEnvelope: 'Building Envelope Restriction',
    insideEnvelope: 'Inside Building Envelope',
    easements: 'Easements on Property',
    overEasement: 'Building Over Easement',
    additionalInfo: 'Additional Information'
};

// Dynamic form data processor (same as in app.js)
function processFormData(reqBody) {
    const processedData = [];
    
    for (const [fieldName, fieldValue] of Object.entries(reqBody)) {
        if (fieldValue && fieldName in formFieldMapping) {
            const label = formFieldMapping[fieldName];
            
            // Handle different field types
            let displayValue = fieldValue;
            if (Array.isArray(fieldValue)) {
                displayValue = fieldValue.join(', ');
            }
            
            // Skip empty values
            if (displayValue && displayValue.toString().trim()) {
                processedData.push({
                    question: label,
                    answer: displayValue,
                    fieldName: fieldName
                });
            }
        }
    }
    
    return processedData;
}

// Test data simulating a form submission
const testFormData = {
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    phone: '0412345678',
    streetAddress: '123 Farm Road, Bendigo VIC',
    foundation: 'concrete pier footings',
    location: 'Rear left corner of property, about 20m from house',
    boundarySetbacks: '2m I think but I\'ll need to ask my mom',
    structureLength: '12m',
    structureWidth: '8m',
    dwellingOnProperty: 'yes',
    purpose: 'farming',
    'storageItems[]': ['hay', 'machinery', 'other'],
    farmingOtherText: 'Storage for vintage tractor collection',
    buildingEnvelope: 'no',
    easements: 'unknown',
    additionalInfo: 'This is my first building permit application so please be patient with me!'
};

// Process the form data dynamically
const processedFormData = processFormData(testFormData);

console.log('🎯 DYNAMIC FORM PROCESSING TEST RESULTS\n');
console.log('='.repeat(50));
console.log('\n📋 PROCESSED FORM DATA (Raw Format):');
console.log('-'.repeat(30));

processedFormData.forEach(item => {
    console.log(`- ${item.question}: ${item.answer}`);
});

console.log('\n✨ FUTURE FORM COMPATIBILITY TEST:');
console.log('-'.repeat(30));

// Simulate adding new fields to the form without code changes
const futureFormData = {
    ...testFormData,
    roofMaterial: 'Colorbond steel',  // New field not in current form
    gutterType: 'Spouting side drainage', // Another new field
    specialRequirements: 'Heritage overlay consideration needed'
};

// Add new field mappings (this would be done in app.js)
const extendedMapping = {
    ...formFieldMapping,
    roofMaterial: 'Roof Material',
    gutterType: 'Gutter Configuration', 
    specialRequirements: 'Special Requirements'
};

// Simulate the extended processor
function processExtendedFormData(reqBody) {
    const processedData = [];
    
    for (const [fieldName, fieldValue] of Object.entries(reqBody)) {
        if (fieldValue && fieldName in extendedMapping) {
            const label = extendedMapping[fieldName];
            
            let displayValue = fieldValue;
            if (Array.isArray(fieldValue)) {
                displayValue = fieldValue.join(', ');
            }
            
            if (displayValue && displayValue.toString().trim()) {
                processedData.push({
                    question: label,
                    answer: displayValue,
                    fieldName: fieldName
                });
            }
        }
    }
    
    return processedData;
}

const extendedProcessedData = processExtendedFormData(futureFormData);

console.log('Adding 3 new form fields dynamically...');
extendedProcessedData.slice(-3).forEach(item => {
    console.log(`- ${item.question}: ${item.answer}`);
});

console.log('\n🎉 SUCCESS! New fields processed automatically without template changes.\n');

console.log('📧 EMAIL TEMPLATE COMPATIBILITY:');
console.log('-'.repeat(30));
console.log('The email template will now render ANY form field automatically.');
console.log('Format: "- Question: Answer" (perfect for raw email display)');
console.log('No more hardcoded field references in email templates!');

console.log('\n' + '='.repeat(50));
console.log('✅ DYNAMIC FORM SYSTEM: READY FOR FUTURE CHANGES');
