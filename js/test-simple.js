// This can be run by creating a test.html page that calls it
// Or use cPanel's "Node.js Selector" to run it

require('dotenv').config();

console.log('🧪 SIMPLE MPESA TEST - RUN IN CPANEL\n');

// Test 1: Check environment
console.log('1. Checking Environment Variables:');
console.log('   MPESA_ENVIRONMENT:', process.env.MPESA_ENVIRONMENT || 'Not set');
console.log('   DB_HOST:', process.env.DB_HOST || 'Not set');
console.log('   AXTRAX_ENABLED:', process.env.AXTRAX_ENABLED || 'false');
console.log('   CALLBACK_URL:', process.env.MPESA_CALLBACK_URL || 'Not set');

// Test 2: Test M-Pesa token
console.log('\n2. Testing M-Pesa Token Generation:');
try {
    const mpesa = require('./config/mpesa');
    const token = await mpesa.generateAccessToken();
    console.log('   ✅ Token generated successfully');
    console.log('   Token (first 20 chars):', token.substring(0, 20) + '...');
} catch (error) {
    console.log('   ❌ Token generation failed:', error.message);
}

// Test 3: Test database
console.log('\n3. Testing Database Connection:');
try {
    const db = require('./config/database');
    await db.query('SELECT 1 as test');
    console.log('   ✅ Database connected');
} catch (error) {
    console.log('   ❌ Database failed:', error.message);
}

console.log('\n✅ Test completed!');