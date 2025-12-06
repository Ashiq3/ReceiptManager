
const Receipt = require('../backend/models/Receipt');

// Mock console to capture output? No, just run it.
async function verifyDemoList() {
    console.log('--- Verifying Demo List ---');

    const demoBusinessId = 'demo-business-id';

    try {
        console.log('Testing Receipt.findByBusiness with demo ID...');
        const receipts = await Receipt.findByBusiness(demoBusinessId);
        console.log('Result:', receipts);

        console.log('Testing Receipt.countByBusiness with demo ID...');
        const count = await Receipt.countByBusiness(demoBusinessId);
        console.log('Count:', count);

        // We expect this to either fail (if DB issue) or return mock data (if fixed)
        // Currently it should probably return empty array or throw error if DB is down.
        // But for DEMO mode, we WANT it to return mock data.
    } catch (error) {
        console.error('TEST FAILED:', error);
        process.exit(1);
    }
}

verifyDemoList();
