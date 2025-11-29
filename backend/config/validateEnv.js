require('dotenv').config();

function validateEnvironment() {
  const required = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n💡 Please check your .env file or run: node setup-env.js');
    process.exit(1);
  }

  // Validate M-Pesa configuration
  if (process.env.MPESA_ENVIRONMENT === 'production') {
    const productionRequired = ['MPESA_BUSINESS_SHORTCODE', 'MPESA_PASSKEY'];
    const productionMissing = productionRequired.filter(key => !process.env[key]);
    
    if (productionMissing.length > 0) {
      console.error('❌ Missing M-Pesa production configuration:');
      productionMissing.forEach(key => console.error(`   - ${key}`));
      process.exit(1);
    }
  }

  console.log('✅ Environment configuration validated successfully');
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️ Database: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
  console.log(`📱 M-Pesa: ${process.env.MPESA_ENVIRONMENT}`);
}

module.exports = validateEnvironment;