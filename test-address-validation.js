#!/usr/bin/env node

/**
 * Address Validation Test Script
 * Tests the address validation functionality with various scenarios
 */

const { validateAddressWithFallback } = require('./app');

async function testAddresses() {
    console.log('🏠 Testing Address Validation Implementation\n');
    
    const testCases = [
        // Standard urban addresses
        '123 Main Street, Melbourne VIC 3000',
        '45 Collins Street, Melbourne VIC 3000',
        
        // Subdivision addresses
        'Lot 5 Estate Road, New Development VIC 3000',
        'Lot 12A Sunrise Boulevard, Greenfield Estate VIC 3141',
        
        // Rural addresses
        '1234 Rural Road, Farmville VIC 3000',
        '5678 Country Track, Remote Valley VIC 3456',
        
        // Invalid addresses
        'Not a valid address',
        '123',
        '',
        
        // Edge cases
        '123 Main St, Melbourne',
        'Unit 5/123 Collins Street, Melbourne VIC 3000'
    ];
    
    for (const address of testCases) {
        try {
            console.log(`\n📍 Testing: "${address}"`);
            const result = await validateAddressWithFallback(address);
            
            console.log(`   ✓ Valid: ${result.isValid}`);
            console.log(`   📊 Confidence: ${result.confidence}`);
            console.log(`   🔍 Source: ${result.source}`);
            console.log(`   🏠 Type: ${result.addressType}`);
            console.log(`   📝 Message: ${result.message}`);
            
            if (result.components && Object.keys(result.components).length > 0) {
                console.log('   🧩 Components:');
                Object.entries(result.components).forEach(([key, value]) => {
                    if (value) {
                        console.log(`      ${key}: ${value}`);
                    }
                });
            }
            
            if (result.unmapped) {
                console.log('   ⚠️  Note: Address not in mapping database (likely new development)');
            }
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
        
        console.log('   ' + '─'.repeat(50));
    }
    
    console.log('\n🎉 Address validation testing complete!');
    console.log('\n✅ Key Features Implemented:');
    console.log('   • OpenStreetMap Nominatim API integration');
    console.log('   • Intelligent regex fallback for unmapped addresses');
    console.log('   • New subdivision detection');
    console.log('   • Rural property handling');
    console.log('   • Australian address format validation');
    console.log('   • Graceful error handling');
}

// Run the tests
testAddresses().catch(console.error);
