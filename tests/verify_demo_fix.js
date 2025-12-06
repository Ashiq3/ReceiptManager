
const Receipt = require('../backend/models/Receipt');
const ReceiptController = require('../backend/controllers/receiptController');
const path = require('path');
require('dotenv').config();

// Mock console to avoid clutter
const originalLogger = console.log;
// console.log = () => {};

async function verifyDemoFix() {
    console.log('--- Verifying Demo Receipt Fix ---');

    const demoReceiptId = 'demo-receipt-test-123';

    try {
        // Test 1: findById
        console.log('Testing Receipt.findById with demo ID...');
        const receipt = await Receipt.findById(demoReceiptId);
        if (receipt && receipt.receipt_id === demoReceiptId && receipt.business_id === 'demo-business-id') {
            console.log('PASS: findById returned valid mock receipt');
        } else {
            console.error('FAIL: findById returned invalid data', receipt);
            process.exit(1);
        }

        // Test 2: getItems
        console.log('Testing Receipt.getItems with demo ID...');
        const items = await Receipt.getItems(demoReceiptId);
        if (Array.isArray(items) && items.length > 0 && items[0].receipt_id === demoReceiptId) {
            console.log('PASS: getItems returned valid mock items');
        } else {
            console.error('FAIL: getItems returned invalid data', items);
            process.exit(1);
        }

        // Test 3: getFilePath
        console.log('Testing Receipt.getFilePath with demo ID...');
        const filePath = await Receipt.getFilePath(demoReceiptId);
        // Normalize path separators for comparison
        const normalizedPath = filePath.replace(/\\/g, '/');
        if (normalizedPath && normalizedPath.endsWith('demo/receipt.jpg')) {
            console.log('PASS: getFilePath returned valid mock path');
        } else {
            console.error('FAIL: getFilePath returned invalid path', filePath);
            process.exit(1);
        }

        // Test 4: delete
        console.log('Testing Receipt.delete with demo ID...');
        const deleteResult = await Receipt.delete(demoReceiptId);
        if (deleteResult && deleteResult.message === 'Demo receipt deleted') {
            console.log('PASS: delete returned success message');
        } else {
            console.error('FAIL: delete failed', deleteResult);
            process.exit(1);
        }

        // Test 5: ReceiptController.processReceipt
        // This is async and returns void, but we can verify it doesn't throw
        console.log('Testing ReceiptController.processReceipt with demo ID...');
        await ReceiptController.processReceipt(demoReceiptId);
        console.log('PASS: processReceipt executed without throwing error (Async logic will run in background)');

        console.log('ALL TESTS PASSED');
        process.exit(0);
    } catch (error) {
        console.error('TEST FAILED WITH EXCEPTION:', error);
        process.exit(1);
    }
}

verifyDemoFix();
