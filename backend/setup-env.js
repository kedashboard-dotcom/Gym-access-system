const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const questions = [
  { key: 'NODE_ENV', question: 'Environment (development/production): ', default: 'development' },
  { key: 'PORT', question: 'Server port: ', default: '3000' },
  { key: 'DB_HOST', question: 'Database host: ', default: 'localhost' },
  { key: 'DB_PORT', question: 'Database port: ', default: '3306' },
  { key: 'DB_USER', question: 'Database user: ', default: 'root' },
  { key: 'DB_PASSWORD', question: 'Database password: ', type: 'password', default: '' },
  { key: 'DB_NAME', question: 'Database name: ', default: 'gym_access_system' },
  { key: 'MPESA_ENVIRONMENT', question: 'M-Pesa environment (sandbox/production): ', default: 'sandbox' },
  { key: 'MPESA_CONSUMER_KEY', question: 'M-Pesa consumer key: ', default: 'your_sandbox_consumer_key' },
  { key: 'MPESA_CONSUMER_SECRET', question: 'M-Pesa consumer secret: ', type: 'password', default: 'your_sandbox_consumer_secret' },
];

async function setupEnvironment() {
  console.log('🚀 Msingi Gym Environment Setup\n');
  console.log('This script will help you create your .env file\n');
  
  const answers = {};
  
  for (const item of questions) {
    const answer = await new Promise((resolve) => {
      rl.question(item.question, (input) => {
        resolve(input || item.default || '');
      });
    });
    answers[item.key] = answer;
  }
  
  // Generate secure random keys
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  const adminApiKey = crypto.randomBytes(32).toString('hex');
  
  // Generate .env content
  let envContent = `# 🏋️ Msingi Gym Access Control System - Environment Configuration\n`;
  envContent += `# Generated on: ${new Date().toISOString()}\n`;
  envContent += `# DO NOT COMMIT THIS FILE TO VERSION CONTROL\n\n`;
  
  // Add answers
  for (const [key, value] of Object.entries(answers)) {
    envContent += `${key}=${value}\n`;
  }
  
  // Add additional settings
  envContent += `
# Additional Settings
MPESA_BUSINESS_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=http://localhost:${answers.PORT}/api/payments/mpesa-callback

AXTRAX_ENABLED=false
AXTRAX_BASE_URL=http://localhost:8080
AXTRAX_USERNAME=admin
AXTRAX_PASSWORD=password

DEFAULT_MEMBERSHIP_AMOUNT=2000
MEMBERSHIP_DURATION_DAYS=30

# Security
JWT_SECRET=${jwtSecret}
ADMIN_API_KEY=${adminApiKey}
ADMIN_USERNAME=msingi_admin
ADMIN_PASSWORD=AdminSecurePassword123!

# Frontend
FRONTEND_URL=http://localhost:${answers.PORT}
CONTACT_PHONE=+254700000000
CONTACT_EMAIL=support@msingi.co.ke

# Logging
LOG_LEVEL=info
DEBUG_MODE=false
`;
  
  // Write to .env file
  try {
    fs.writeFileSync('.env', envContent);
    console.log('\n✅ .env file created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the generated .env file');
    console.log('2. Update M-Pesa credentials with your actual values');
    console.log('3. Run: npm install');
    console.log('4. Run: npm start');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
  }
  
  rl.close();
}

// Run if called directly
if (require.main === module) {
  setupEnvironment().catch(console.error);
}

module.exports = setupEnvironment;