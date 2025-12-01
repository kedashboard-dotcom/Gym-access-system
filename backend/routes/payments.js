<?php
header('Content-Type: text/plain');

echo "🔧 Testing Msingi Gym Configuration\n\n";

// CORRECT PATH: .env is in the parent directory of test files
$envFile = dirname(__DIR__) . '/.env';
echo "Looking for .env at: $envFile\n\n";

if (!file_exists($envFile)) {
    die("❌ .env file not found!\nCheck if it exists at: $envFile\n");
}

echo "✅ .env file found!\n\n";

// Parse .env file
$config = [];
$lines = explode("\n", file_get_contents($envFile));

echo "📋 CURRENT CONFIGURATION:\n";
echo "========================\n";

foreach ($lines as $line) {
    $line = trim($line);
    if (empty($line) || strpos($line, '#') === 0) continue;
    
    if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        $config[$key] = $value;
        
        // Show important configs
        if (in_array($key, ['DEFAULT_MEMBERSHIP_AMOUNT', 'MEMBERSHIP_DURATION_DAYS', 
                           'PREMIUM_MEMBERSHIP_AMOUNT', 'VIP_MEMBERSHIP_AMOUNT',
                           'MPESA_ENVIRONMENT', 'NODE_ENV', 'DB_NAME'])) {
            echo "$key: $value\n";
        }
    }
}

echo "\n🧪 TEST CONFIGURATION:\n";
echo "=====================\n";
echo "Standard Plan: KSh " . ($config['DEFAULT_MEMBERSHIP_AMOUNT'] ?? 'NOT SET') . "\n";
echo "Premium Plan: KSh " . ($config['PREMIUM_MEMBERSHIP_AMOUNT'] ?? 'NOT SET') . "\n";
echo "VIP Plan: KSh " . ($config['VIP_MEMBERSHIP_AMOUNT'] ?? 'NOT SET') . "\n";
echo "Duration: " . ($config['MEMBERSHIP_DURATION_DAYS'] ?? 'NOT SET') . " days\n";
echo "M-Pesa Mode: " . ($config['MPESA_ENVIRONMENT'] ?? 'NOT SET') . "\n";

echo "\n📊 DATABASE TEST:\n";
echo "================\n";

if (isset($config['DB_HOST']) && isset($config['DB_USER']) && isset($config['DB_NAME'])) {
    echo "Database: " . $config['DB_NAME'] . "\n";
    echo "Host: " . $config['DB_HOST'] . "\n";
    echo "User: " . $config['DB_USER'] . "\n";
    
    // Try to connect
    $mysqli = @new mysqli(
        $config['DB_HOST'], 
        $config['DB_USER'], 
        $config['DB_PASSWORD'] ?? '', 
        $config['DB_NAME']
    );
    
    if ($mysqli->connect_error) {
        echo "❌ Connection Failed: " . $mysqli->connect_error . "\n";
    } else {
        echo "✅ Connection Successful!\n";
        
        // Check tables
        $result = $mysqli->query("SHOW TABLES");
        if ($result) {
            echo "📊 Tables found: ";
            $tables = [];
            while ($row = $result->fetch_array()) {
                $tables[] = $row[0];
            }
            echo implode(', ', $tables) . "\n";
        }
        
        $mysqli->close();
    }
} else {
    echo "⚠️ Database credentials not fully set in .env\n";
}

echo "\n✅ CONFIGURATION CHECK COMPLETE!\n";
echo "🌐 Test Registration with: KSh " . ($config['DEFAULT_MEMBERSHIP_AMOUNT'] ?? '100') . "\n";
?>