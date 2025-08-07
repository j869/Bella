// Test with real addresses that should return API results
const axios = require('axios');

async function testRealAddresses() {
    console.log('Testing real addresses for Victoria filtering...\n');
    
    const testAddresses = [
        '1 Collins Street Melbourne', // Famous Melbourne address
        '123 Bourke Street Melbourne', // Should get API results
        '90 Foreman Road Shelbourne', // The address from earlier
        'Federation Square Melbourne', // Famous landmark
        '1 Flinders Street Melbourne' // Central Melbourne
    ];
    
    for (const address of testAddresses) {
        try {
            console.log(`Testing: "${address}"`);
            const response = await axios.get(`http://localhost:3000/validate-address?address=${encodeURIComponent(address)}`);
            const result = response.data;
            
            console.log(`✅ Success: ${result.success}`);
            console.log(`   Valid: ${result.isValid}`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Confidence: ${result.confidence}`);
            console.log(`   Suggestions: ${result.suggestions ? result.suggestions.length : 0}`);
            
            if (result.suggestions && result.suggestions.length > 0) {
                console.log('   Suggestions:');
                result.suggestions.slice(0, 3).forEach((s, i) => {
                    console.log(`     ${i+1}. ${s.formatted}`);
                    console.log(`        ${s.display_name}`);
                });
                
                // Check all suggestions are Victoria
                const allVictoria = result.suggestions.every(s => {
                    const displayName = s.display_name ? s.display_name.toLowerCase() : '';
                    return displayName.includes('vic') || 
                           displayName.includes('victoria') ||
                           (!displayName.includes('nsw') && 
                            !displayName.includes('qld') && 
                            !displayName.includes('wa') && 
                            !displayName.includes('sa') && 
                            !displayName.includes('nt') && 
                            !displayName.includes('tas'));
                });
                
                console.log(`   ✅ All suggestions are Victoria: ${allVictoria}`);
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
testRealAddresses().then(() => {
    console.log('Real address Victoria filtering test completed!');
}).catch(error => {
    console.error('Test error:', error);
});
