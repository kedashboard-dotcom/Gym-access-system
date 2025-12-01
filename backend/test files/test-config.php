<?php
header('Content-Type: text/plain');

echo "🔧 Testing Msingi Gym Configuration\n\n";

// Read .env file

$envFile = __DIR__ . '/../../.env';
if (!file_exists($envFile)) {
    die("❌ .env file not found at: $envFile\n");
}

$envContent = file_get_contents($envFile);

// Parse .env file
$config = [];
$lines = explode("\n", $envContent);
foreach ($lines as $line) {
    $line = trim($line);
    if (empty($line) || strpos($line, '#') === 0) continue;
    
    if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        $config[trim($key)] = trim($value);
    }
}

echo "📋 Current Configuration:\n";
echo "-------------------------\n";

$importantKeys = [
    'DEFAULT_MEMBERSHIP_AMOUNT',
    'PREMIUM_MEMBERSHIP_AMOUNT',
    'VIP_MEMBERSHIP_AMOUNT',
    'MEMBERSHIP_DURATION_DAYS',
    'NODE_ENV',
    'MPESA_ENVIRONMENT',
    'DB_NAME'
];

foreach ($importantKeys as $key) {
    if (isset($config[$key])) {
        echo "$key: " . $config[$key] . "\n";
    } else {
        echo "$key: ❌ NOT SET\n";
    }
}

echo "\n🧪 Test Scenarios:\n";
echo "-----------------\n";
echo "1. Standard Plan: KSh " . ($config['DEFAULT_MEMBERSHIP_AMOUNT'] ?? 'N/A') . "\n";
echo "2. Premium Plan: KSh " . ($config['PREMIUM_MEMBERSHIP_AMOUNT'] ?? 'N/A') . "\n";
echo "3. VIP Plan: KSh " . ($config['VIP_MEMBERSHIP_AMOUNT'] ?? 'N/A') . "\n";
echo "4. Duration: " . ($config['MEMBERSHIP_DURATION_DAYS'] ?? 'N/A') . " days\n";

echo "\n✅ Configuration Check Complete!\n";
echo "🌐 Access your site: https://msingi.co.ke\n";

// Check database connection
echo "\n🔍 Checking Database...\n";
$dbHost = $config['DB_HOST'] ?? 'localhost';
$dbName = $config['DB_NAME'] ?? 'msingico_gym';
echo "Database: $dbName\n";

// Try to connect
$mysqli = @new mysqli($dbHost, $config['DB_USER'] ?? '', $config['DB_PASSWORD'] ?? '', $dbName);
if ($mysqli->connect_error) {
    echo "❌ Database Connection: FAILED - " . $mysqli->connect_error . "\n";
} else {
    echo "✅ Database Connection: SUCCESS\n";
    $mysqli->close();
}
?>