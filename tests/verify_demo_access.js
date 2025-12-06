
const ReceiptController = require('../backend/controllers/receiptController');
const Receipt = require('../backend/models/Receipt');

// Mock request and response objects
const mockReq = (receiptId, userBusinessId) => ({
    params: { receipt_id: receiptId },
    user: { businessId: userBusinessId }
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.jsonData = data;
        return res;
    };
    res.sendFile = (path) => {
        res.sentFile = path;
        return res;
    };
    return res;
};

async function verifyDemoAccess() {
    console.log('--- Verifying Demo Receipt Access ---');

    const demoReceiptId = 'demo-receipt-access-test';
    const userBusinessId = 'real-user-business-id'; // Different from demo-business-id

    // Mock Receipt.findById to return a demo receipt
    // We need to revert this mock later or ensure it doesn't affect other tests if running in parallel (but here we are isolated)
    const originalFindById = Receipt.findById;
    Receipt.findById = async (id) => {
        if (id === demoReceiptId) {
            return {
                receipt_id: demoReceiptId,
                business_id: 'demo-business-id', // The mismatching ID
                storage_path: 'demo/path.jpg',
                status: 'processed'
            };
        }
        return null;
    };

    // Mock getItems needed for getReceiptDetails
    const originalGetItems = Receipt.getItems;
    Receipt.getItems = async () => [];

    // Mock getFilePath
    const originalGetFilePath = Receipt.getFilePath;
    Receipt.getFilePath = async () => 'demo/path.jpg';

    // Mock fs for getReceiptFile
    const fs = require('fs');
    const originalExistsSync = fs.existsSync;
    fs.existsSync = () => true;

    try {
        console.log('Test 1: getReceiptStatus using wrong business ID');
        const req1 = mockReq(demoReceiptId, userBusinessId);
        const res1 = mockRes();
        await ReceiptController.getReceiptStatus(req1, res1);

        if (res1.statusCode === 403) {
            console.log('REPRODUCED: getReceiptStatus denied access (403) as expected before fix');
        } else if (res1.statusCode === 200 || !res1.statusCode) {
            console.log('UNEXPECTED: getReceiptStatus allowed access (Status: ' + (res1.statusCode || 200) + ')');
        } else {
            console.log('OTHER: getReceiptStatus execution result: ' + res1.statusCode);
        }

        console.log('Test 2: getReceiptDetails using wrong business ID');
        const req2 = mockReq(demoReceiptId, userBusinessId);
        const res2 = mockRes();
        await ReceiptController.getReceiptDetails(req2, res2);

        if (res2.statusCode === 403) {
            console.log('REPRODUCED: getReceiptDetails denied access (403) as expected before fix');
        } else if (res2.statusCode === 200 || !res2.statusCode) {
            console.log('UNEXPECTED: getReceiptDetails allowed access (Status: ' + (res2.statusCode || 200) + ')');
        } else {
            console.log('OTHER: getReceiptDetails execution result: ' + res2.statusCode);
        }

    } catch (error) {
        console.error('Test failed with error:', error);
    } finally {
        // Restore mocks (best practice, though process exit handles it)
        Receipt.findById = originalFindById;
        Receipt.getItems = originalGetItems;
        Receipt.getFilePath = originalGetFilePath;
        fs.existsSync = originalExistsSync;
    }
}

verifyDemoAccess();
