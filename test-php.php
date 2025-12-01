<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Msingi Gym - PHP Test Page</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        pre { background: #f5f5f5; padding: 10px; }
    </style>
</head>
<body>
    <h1>🔧 Msingi Gym - PHP Test Page</h1>
    
    <h2>1. Server Information</h2>
    <pre><?php
        echo "PHP Version: " . phpversion() . "\n";
        echo "Server: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
        echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
        echo "cPanel User: " . $_SERVER['USER'] . "\n";
    ?></pre>
    
    <h2>2. File Permissions</h2>
    <pre><?php
        $files = [
            '.htaccess',
            'backend/.env',
            'backend/server.js',
            'index.html'
        ];
        
        foreach ($files as $file) {
            if (file_exists($file)) {
                $perms = substr(sprintf('%o', fileperms($file)), -4);
                echo "$file: EXISTS (Permissions: $perms)\n";
            } else {
                echo "$file: NOT FOUND\n";
            }
        }
    ?></pre>
    
    <h2>3. Test API Endpoints</h2>
    <div id="api-tests">
        <button onclick="testApi('health')">Test /api/health</button>
        <button onclick="testApi('callback-get')">Test GET Callback</button>
        <button onclick="testApi('callback-post')">Test POST Callback</button>
        <div id="api-result" style="margin-top: 20px;"></div>
    </div>
    
    <h2>4. Quick Links</h2>
    <ul>
        <li><a href="/" target="_blank">Main Website</a></li>
        <li><a href="/test-callback.html" target="_blank">Callback Tester</a></li>
        <li><a href="/api-test.html" target="_blank">API Tester</a></li>
        <li><a href="/api/health" target="_blank">API Health Check</a></li>
    </ul>

    <script>
        async function testApi(type) {
            const resultDiv = document.getElementById('api-result');
            resultDiv.innerHTML = 'Testing...';
            
            let url, method = 'GET', body = null;
            
            switch(type) {
                case 'health':
                    url = '/api/health';
                    break;
                case 'callback-get':
                    url = '/api/payments/mpesa-callback';
                    break;
                case 'callback-post':
                    url = '/api/payments/mpesa-callback';
                    method = 'POST';
                    body = JSON.stringify({
                        Body: {
                            stkCallback: {
                                MerchantRequestID: "test-php",
                                ResultCode: 0,
                                ResultDesc: "Test from PHP"
                            }
                        }
                    });
                    break;
            }
            
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: body ? { 'Content-Type': 'application/json' } : {},
                    body: body
                });
                
                const data = await response.json();
                resultDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                resultDiv.className = 'success';
            } catch (error) {
                resultDiv.innerHTML = `Error: ${error.message}`;
                resultDiv.className = 'error';
            }
        }
    </script>
</body>
</html>