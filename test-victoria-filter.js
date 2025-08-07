// Test Victoria-only filtering
const axios = require('axios');

async function testVictoriaFiltering() {
    console.log('Testing Victoria-only address filtering...\n');
    
    const testAddresses = [
        '123 Collins Street, Melbourne VIC 3000', // Should work - Victoria
        '90 Forman Road, Shelbourne VIC 3515', // Should work - Victoria  
        '123 George Street, Sydney NSW 2000', // Should be rejected - NSW
        '456 Queen Street, Brisbane QLD 4000', // Should be rejected - QLD
        '789 King Street, Perth WA 6000', // Should be rejected - WA
        'Lot 5 Estate Road, New Estate VIC 3150', // Should work - Victoria
        '50 Collins Street Melbourne' // Should work - assumed Victoria
    ];
    
    for (const address of testAddresses) {
        try {
            console.log(`Testing: "${address}"`);
            const response = await axios.get(`http://localhost:3000/validate-address?address=${encodeURIComponent(address)}`);
            const result = response.data;
            
            console.log(`✅ Success: ${result.success}`);
            console.log(`   Valid: ${result.isValid}`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Message: ${result.message}`);
            console.log(`   Suggestions: ${result.suggestions ? result.suggestions.length : 0}`);
            
            if (result.suggestions && result.suggestions.length > 0) {
                console.log('   Sample suggestion:', result.suggestions[0].formatted);
            }
            
            // Check if any non-Victoria results leaked through
            if (result.suggestions) {
                const nonVicSuggestions = result.suggestions.filter(s => {
                    const displayName = s.display_name ? s.display_name.toLowerCase() : '';
                    return !displayName.includes('vic') && 
                           !displayName.includes('victoria') &&
                           (displayName.includes('nsw') || 
                            displayName.includes('qld') || 
                            displayName.includes('wa') || 
                            displayName.includes('sa') || 
                            displayName.includes('nt') || 
                            displayName.includes('tas'));
                });
                
                if (nonVicSuggestions.length > 0) {
                    console.log(`   ⚠️  WARNING: Found ${nonVicSuggestions.length} non-Victoria suggestions!`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('');
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
}

// Run the test
testVictoriaFiltering().then(() => {
    console.log('Victoria filtering test completed!');
    process.exit(0);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});
