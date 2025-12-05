const request = require('supertest');
const { initializeDatabase } = require('../backend/database');
const User = require('../backend/models/User');
const jwt = require('jsonwebtoken');

// Mock database
jest.mock('../backend/database', () => ({
    initializeDatabase: jest.fn().mockResolvedValue({}),
    getDatabase: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        getClient: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn()
        })
    })
}));

// Mock User model
jest.mock('../backend/models/User', () => ({
    findByEmail: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    generateAuthToken: jest.fn().mockResolvedValue('mock_auth_token'),
    generateRefreshToken: jest.fn().mockResolvedValue('mock_refresh_token'),
    storeRefreshToken: jest.fn().mockResolvedValue(),
    validatePassword: jest.fn().mockResolvedValue(true),
    getUserWithBusiness: jest.fn(),
    findByRefreshToken: jest.fn()
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn().mockResolvedValue(true)
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mock-uuid')
}));

const app = require('../server');

describe('Auth API', () => {
    let testUser;
    let authToken;
    let refreshToken;

    beforeAll(async () => {
        await initializeDatabase();
    });

    beforeEach(async () => {
        // Create test user
        testUser = {
            email: `test-${Date.now()}@example.com`,
            password: 'test1234',
            full_name: 'Test User',
            business_name: 'Test Business'
        };

        // Mock User.create to return a user
        User.create.mockResolvedValue({
            user_id: 1,
            email: testUser.email,
            password_hash: 'hashed_password',
            full_name: testUser.full_name,
            role: 'business_owner',
            business_id: 1,
            business_name: testUser.business_name
        });

        // Mock User.findByEmail to return null (for registration check)
        User.findByEmail.mockResolvedValue(null);

        // Mock User.getUserWithBusiness
        User.getUserWithBusiness.mockResolvedValue({
            user_id: 1,
            email: testUser.email,
            full_name: testUser.full_name,
            role: 'business_owner',
            business_id: 1,
            business_name: testUser.business_name
        });
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const newUser = {
                email: `new-${Date.now()}@example.com`,
                password: 'password123',
                full_name: 'New User',
                business_name: 'New Business'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('auth_token');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            // Mock findByEmail to return user
            User.findByEmail.mockResolvedValue({
                user_id: 1,
                email: testUser.email,
                password_hash: 'hashed_password'
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('auth_token');
        });
    });
});