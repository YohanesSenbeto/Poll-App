const { getAllPolls } = require('./lib/database.js');

async function testGetPolls() {
  console.log('=== Testing getAllPolls function ===');
  
  try {
    console.log('Calling getAllPolls...');
    const result = await getAllPolls();
    
    console.log('✅ Success!');
    console.log('Result type:', typeof result);
    console.log('Result length:', result?.length || 0);
    
    if (result && result.length > 0) {
      console.log('First poll:', JSON.stringify(result[0], null, 2));
    } else {
      console.log('No polls found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

testGetPolls();