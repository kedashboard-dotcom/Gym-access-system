<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$response = [
    'status' => 'success',
    'message' => 'Physical file test - Node.js should handle this',
    'timestamp' => date('c'),
    'server_software' => $_SERVER['SERVER_SOFTWARE'],
    'request_method' => $_SERVER['REQUEST_METHOD']
];

// Check if Node.js is running
$nodejs_port = 3000;
$connection = @fsockopen('localhost', $nodejs_port, $errno, $errstr, 1);

if ($connection) {
    $response['nodejs_status'] = 'running';
    fclose($connection);
} else {
    $response['nodejs_status'] = 'not_running';
    $response['nodejs_error'] = $errstr;
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>