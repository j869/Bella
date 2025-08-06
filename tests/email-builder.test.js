/**
 * Email Message Building Test Suite
 * 
 * Tests the server-side email message building functionality
 * to ensure all form data is properly collected and formatted
 */

const { buildEstimateEmailMessage } = require('../app');

describe('Email Message Building Tests', () => {
    
    test('should build complete email message with all form fields', () => {
        const formData = {
            customerName: 'John Smith',
            emailTo: 'customer@example.com',
            phone: '0412345678',
            foundation: 'concrete footings',
            location: 'residential suburban area',
            boundaryOffsets: '1.5m from all boundaries',
            dwellingOnProperty: 'yes',
            purpose: 'storage shed',
            'storageItems[]': ['garden tools', 'lawn mower', 'bicycles'],
            buildingEnvelope: 'no',
            easements: 'yes',
            overEasement: 'no',
            additionalInfo: 'Planning to build a 6x4m shed for garden storage'
        };

        const result = buildEstimateEmailMessage(formData);

        // Verify all sections are included
        expect(result).toContain('BUILDING PERMIT COST ESTIMATE REQUEST');
        expect(result).toContain('CONTACT INFORMATION:');
        expect(result).toContain('Name: John Smith');
        expect(result).toContain('customer@example.com');
        expect(result).toContain('0412345678');
        
        expect(result).toContain('CONSTRUCTION DETAILS:');
        expect(result).toContain('concrete footings');
        
        expect(result).toContain('LOCATION & SETBACKS:');
        expect(result).toContain('residential suburban area');
        expect(result).toContain('1.5m from all boundaries');
        
        expect(result).toContain('DWELLING INFORMATION:');
        expect(result).toContain('Dwelling on property: yes');
        
        expect(result).toContain('PURPOSE & STORAGE:');
        expect(result).toContain('storage shed');
        expect(result).toContain('garden tools, lawn mower, bicycles');
        
        expect(result).toContain('BUILDING ENVELOPE & EASEMENTS:');
        expect(result).toContain('Building envelope: no');
        expect(result).toContain('Easements: yes');
        expect(result).toContain('Over easement: no');
        
        expect(result).toContain('ADDITIONAL INFORMATION:');
        expect(result).toContain('Planning to build a 6x4m shed');
        
        expect(result).toContain('This estimate request was submitted via the building permit website');
        const expectedFee = ((parseInt(process.env.ESTIMATE_FEE) || 5500) / 100).toFixed(2);
        expect(result).toContain(`$${expectedFee} estimate service`);
    });

    test('should handle missing optional fields gracefully', () => {
        const minimalFormData = {
            emailTo: 'minimal@example.com',
            phone: '0498765432'
            // Most fields missing including customerName
        };

        const result = buildEstimateEmailMessage(minimalFormData);

        expect(result).toContain('minimal@example.com');
        expect(result).toContain('0498765432');
        expect(result).toContain('Name: Not provided');
        expect(result).toContain('Not specified');
        expect(result).toContain('Not answered');
        expect(result).toContain('None specified');
        expect(result).not.toContain('ADDITIONAL INFORMATION:');
    });

    test('should handle dwelling on property = no scenario', () => {
        const formData = {
            emailTo: 'test@example.com',
            dwellingOnProperty: 'no',
            adjacentDwelling: 'yes',
            dwellingPermitted: 'unknown'
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).toContain('Dwelling on property: no');
        expect(result).toContain('Adjacent dwelling: yes');
        expect(result).toContain('Dwelling permitted: unknown');
    });

    test('should handle building envelope = yes scenario', () => {
        const formData = {
            emailTo: 'test@example.com',
            buildingEnvelope: 'yes',
            insideEnvelope: 'no'
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).toContain('Building envelope: yes');
        expect(result).toContain('Inside envelope: no');
    });

    test('should handle single storage item correctly', () => {
        const formData = {
            emailTo: 'test@example.com',
            'storageItems[]': 'lawn mower'
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).toContain('Storage items: lawn mower');
    });

    test('should handle empty storage items array', () => {
        const formData = {
            emailTo: 'test@example.com',
            'storageItems[]': []
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).toContain('Storage items: None specified');
    });

    test('should handle empty additionalInfo field', () => {
        const formData = {
            emailTo: 'test@example.com',
            additionalInfo: ''
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).not.toContain('ADDITIONAL INFORMATION:');
    });

    test('should handle whitespace-only additionalInfo field', () => {
        const formData = {
            emailTo: 'test@example.com',
            additionalInfo: '   \n   \t   '
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).not.toContain('ADDITIONAL INFORMATION:');
    });

    test('should preserve additionalInfo formatting', () => {
        const formData = {
            emailTo: 'test@example.com',
            additionalInfo: 'Line 1\nLine 2\n\nLine 4 with spacing'
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).toContain('Line 1\nLine 2\n\nLine 4 with spacing');
    });

    test('should include all required footer information', () => {
        const formData = {
            emailTo: 'test@example.com'
        };

        const result = buildEstimateEmailMessage(formData);

        expect(result).toContain('---');
        expect(result).toContain('submitted via the building permit website');
        const expectedFee = ((parseInt(process.env.ESTIMATE_FEE) || 5500) / 100).toFixed(2);
        expect(result).toContain(`$${expectedFee} estimate service`);
        expect(result).toContain('not a final quote');
        expect(result).toContain(`$${expectedFee} will be credited back`);
    });
});
