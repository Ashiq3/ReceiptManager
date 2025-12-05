const request = require('supertest');
const { initializeDatabase } = require('../backend/database');
const User = require('../backend/models/User');
const Receipt = require('../backend/models/Receipt');
const fs = require('fs');
const path = require('path');

// Mock database
jest.mock('../backend/database', () => ({
    initializeDatabase: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockResolvedValue({
        rows: [{
            receipt_id: 1,
            status: 'uploaded',
            total_spending: 100,
            total_receipts: 5,
            average_per_receipt: 20,
            file_path: 'test-receipt.jpg',
            business_id: 1,
            category: 'Office',
            amount: 100
        }]
    }),
    getClient: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({
            rows: [{
                receipt_id: 1,
                status: 'uploaded',
                total_spending: 100,
                total_receipts: 5,
                average_per_receipt: 20,
                file_path: 'test-receipt.jpg',
                business_id: 1,
                category: 'Office',
                amount: 100
            }]
        }),
        release: jest.fn()
    }),
    getDatabase: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({
            rows: [{
                receipt_id: 1,
                status: 'uploaded',
                total_spending: 100,
                total_receipts: 5,
                average_per_receipt: 20,
                file_path: 'test-receipt.jpg',
                business_id: 1,
                category: 'Office',
                amount: 100
            }]
        }),
        getClient: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn()
        })
    })
}));

// Mock authentication middleware to bypass auth
jest.mock('../backend/middlewares/authenticate', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            userId: 1,
            business_id: 1,
            email: 'test@example.com'
        };
        next();
    }
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mock-uuid')
}));

// Mock sharp
jest.mock('sharp', () => () => ({
    resize: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue({})
}));

const app = require('../server');

describe('Receipt API', () => {
    let testFilePath;

    beforeAll(async () => {
        // Create a test file
        testFilePath = path.join(__dirname, 'test-receipt.jpg');
        fs.writeFileSync(testFilePath, Buffer.from('fake-image-content'));
    });

    afterAll(() => {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    describe('POST /api/receipts/upload', () => {
        it('should upload a receipt', async () => {
            const response = await request(app)
                .post('/api/receipts/upload')
                .attach('file', testFilePath)
                .field('business_id', 1);

            if (response.status !== 201) {
                console.error('Upload failed:', JSON.stringify(response.body, null, 2));
            }

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('receipt_id');
            expect(response.body).toHaveProperty('status', 'uploaded');
        });
    });

    describe('GET /api/analytics/summary', () => {
        it('should get analytics data', async () => {
            const response = await request(app)
                .get('/api/analytics/summary');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('total_receipts');
            expect(response.body).toHaveProperty('total_spending');
            expect(response.body).toHaveProperty('average_per_receipt');
        });
    });
});