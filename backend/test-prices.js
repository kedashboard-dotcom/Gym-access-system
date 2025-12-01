require('dotenv').config();

console.log('💰 Testing Membership Prices & Periods\n');

console.log('📋 Current Configuration:');
console.log(`Standard Plan: KSh ${process.env.DEFAULT_MEMBERSHIP_AMOUNT}`);
console.log(`Premium Plan: KSh ${process.env.PREMIUM_MEMBERSHIP_AMOUNT || 'Not set'}`);
console.log(`VIP Plan: KSh ${process.env.VIP_MEMBERSHIP_AMOUNT || 'Not set'}`);
console.log(`Membership Duration: ${process.env.MEMBERSHIP_DURATION_DAYS} days`);

// Calculate test payment
const testAmount = 100; // Change this to test different amounts
console.log(`\n🧪 Test Payment Amount: KSh ${testAmount}`);

// Test with sample member
const sampleMember = {
    name: "Test User",
    phone: "254712345678",
    amount: testAmount,
    membership_type: "standard"
};

console.log(`\n📝 Sample Member Registration:`);
console.log(`Name: ${sampleMember.name}`);
console.log(`Phone: ${sampleMember.phone}`);
console.log(`Amount: KSh ${sampleMember.amount}`);
console.log(`Plan: ${sampleMember.membership_type}`);
console.log(`Duration: ${process.env.MEMBERSHIP_DURATION_DAYS} days`);

console.log('\n✅ Configuration ready for testing!');
console.log('🌐 Start server: npm start');
console.log('📱 Test at: http://localhost:3000');