const http = require('http');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a simple test file
const testFilePath = path.join(__dirname, 'test-receipt.txt');
fs.writeFileSync(testFilePath, 'Test receipt content');

// Create form data
const form = new FormData();
form.append('file', fs.createReadStream(testFilePath), {
    filename: 'test-receipt.png',
    contentType: 'image/png'
});
form.append('business_id', 'demo-business-id');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/receipts/upload',
    method: 'POST',
    headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer DEMO_TOKEN'
    }
};

console.log('Sending upload request...');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Response:', data);
        // Cleanup
        fs.unlinkSync(testFilePath);
    });
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
    // Cleanup
    if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
    }
});

form.pipe(req);
