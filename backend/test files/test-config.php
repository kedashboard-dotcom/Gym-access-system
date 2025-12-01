<?php
header('Content-Type: text/plain');

echo "=====================================\n";
echo "🔧 MSINGI GYM CONFIGURATION TEST\n";
echo "=====================================\n\n";

// DEBUG: Show current directory
echo "📂 Current directory: " . __DIR__ . "\n";

// CORRECT PATH: Go ONE level up from "test files" to find .env
$envFile = __DIR__ . '/../.env';
echo "🔍 Looking for .env at: $envFile\n\n";

if (!file_exists($envFile)) {
    echo "❌ ERROR: .env file not found!\n";
    
    // Try alternative paths
    echo "\n🔄 Trying alternative paths:\n";
    
    $possiblePaths = [
        __DIR__ . '/../.env',                   // Relative from test files
        dirname(__DIR__, 2) . '/backend/.env',  // From public_html
        '/home/msingico/public_html/backend/.env' // Absolute path
    ];
    
    foreach ($possiblePaths as $path) {
        echo "- $path : " . (file_exists($path) ? "✅ EXISTS" : "❌ NOT FOUND") . "\n";
    }
    
    echo "\n📂 Listing files in backend directory:\n";
    $backendDir = __DIR__ . '/../';
    if (is_dir($backendDir)) {
        $files = scandir($backendDir);
        foreach ($files as $file) {
            if ($file != '.' && $file != '..') {
                echo "- $file\n";
            }
        }
    } else {
        echo "Cannot access backend directory\n";
    }
    
    exit(1);
}

echo "✅ .env file found!\n\n";

// Read the .env file
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$config = [];

foreach ($lines as $line) {
    $line = trim($line);
    if (empty($line) || $line[0] === '#') continue;
    
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) {
        $key = trim($parts[0]);
        $value = trim($parts[1]);
        $config[$key] = $value;
    }
}

echo "📋 IMPORTANT CONFIGURATION:\n";
echo "===========================\n";

// Check and display critical settings
$criticalSettings = [
    'DEFAULT_MEMBERSHIP_AMOUNT' => 'Standard Plan (KSh)',
    'PREMIUM_MEMBERSHIP_AMOUNT' => 'Premium Plan (KSh)',
    'VIP_MEMBERSHIP_AMOUNT' => 'VIP Plan (KSh)',
    'MEMBERSHIP_DURATION_DAYS' => 'Membership Duration (days)',
    'MPESA_ENVIRONMENT' => 'M-Pesa Mode',
    'NODE_ENV' => 'Environment',
    'DB_NAME' => 'Database Name',
    'DB_HOST' => 'Database Host',
    'DB_USER' => 'Database User'
];

foreach ($criticalSettings as $key => $description) {
    if (isset($config[$key])) {
        echo "✅ $description: " . $config[$key] . "\n";
    } else {
        echo "❌ $description: NOT SET\n";
    }
}

echo "\n🧪 TEST READY:\n";
echo "=============\n";
$testAmount = $config['DEFAULT_MEMBERSHIP_AMOUNT'] ?? '100';
$testDays = $config['MEMBERSHIP_DURATION_DAYS'] ?? '1';
echo "Test with amount: KSh $testAmount\n";
echo "Membership will last: $testDays days\n";
echo "M-Pesa mode: " . ($config['MPESA_ENVIRONMENT'] ?? 'sandbox') . "\n";

echo "\n✅ CONFIGURATION LOADED SUCCESSFULLY!\n";
?>