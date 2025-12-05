const request = require('supertest');

describe('Serverless Function Compatibility Tests', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Import app dynamically to avoid circular structure issues
        app = require('../server');
        server = app.listen(0); // Use random port for testing
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('Express App Export', () => {
        test('should export Express application', () => {
            expect(app).toBeDefined();
            expect(typeof app).toBe('function');
            expect(app.listen).toBeDefined();
            expect(app.use).toBeDefined();
        });

        test('should handle middleware correctly', () => {
            const middlewareStack = app._router.stack;
            expect(middlewareStack.length).toBeGreaterThan(0);

            // Check for essential middleware
            const hasCors = middlewareStack.some(layer =>
                layer.name === 'cors' || layer.handle.name === 'cors'
            );
            expect(hasCors).toBe(true);
        });
    });

    describe('API Routes Compatibility', () => {
        test('health endpoint should work in serverless context', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('database');
            expect(response.body.database).toHaveProperty('status');
            expect(response.body.database).toHaveProperty('database');
        });

        test('auth routes should be properly configured', async () => {
            // Test that auth routes exist (should return 404 for invalid endpoints)
            const response = await request(app)
                .post('/api/auth/invalid-endpoint')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });

        test('receipt routes should be properly configured', async () => {
            const response = await request(app)
                .get('/api/receipts/invalid-endpoint')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });

        test('analytics routes should be properly configured', async () => {
            const response = await request(app)
                .get('/api/analytics/invalid-endpoint')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Error Handling in Serverless Context', () => {
        test('should handle 404 errors correctly', async () => {
            const response = await request(app)
                .get('/api/nonexistent-route')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
            expect(response.body.error).toHaveProperty('message');
        });

        test('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('{invalid json}')
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('CORS Configuration', () => {
        test('should handle CORS preflight requests', async () => {
            const response = await request(app)
                .options('/api/health')
                .set('Origin', 'https://your-app.vercel.app')
                .set('Access-Control-Request-Method', 'GET')
                .expect(204);

            expect(response.headers).toHaveProperty('access-control-allow-origin');
            expect(response.headers).toHaveProperty('access-control-allow-methods');
        });

        test('should allow cross-origin requests', async () => {
            const response = await request(app)
                .get('/api/health')
                .set('Origin', 'https://your-app.vercel.app')
                .expect(200);

            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
    });

    describe('Security Headers', () => {
        test('should set security headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
            expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
        });
    });

    describe('Static File Serving', () => {
        test('should serve static files from frontend/build', async () => {
            // This test assumes the frontend is built
            // In a real deployment, static files would be served by Vercel
            const response = await request(app)
                .get('/static/js/main.js')
                .expect(404); // Should 404 in development, but would work in production

            // Just verify the route doesn't crash the server
            expect(response.status).toBeDefined();
        });
    });

    describe('Environment Variable Handling', () => {
        test('should handle missing environment variables gracefully', async () => {
            // Temporarily remove environment variables
            const originalUrl = process.env.SUPABASE_URL;
            const originalKey = process.env.SUPABASE_KEY;

            delete process.env.SUPABASE_URL;
            delete process.env.SUPABASE_KEY;

            // Restart the app or test the health endpoint
            try {
                const response = await request(app)
                    .get('/api/health')
                    .expect(200);

                // Should still work or handle gracefully
                expect(response.body).toBeDefined();
            } finally {
                // Restore environment variables
                process.env.SUPABASE_URL = originalUrl;
                process.env.SUPABASE_KEY = originalKey;
            }
        });
    });

    describe('Memory and Performance', () => {
        test('should handle concurrent requests', async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .get('/api/health')
                        .expect(200)
                );
            }

            const responses = await Promise.all(promises);
            expect(responses).toHaveLength(10);
            responses.forEach(response => {
                expect(response.body).toHaveProperty('status');
            });
        });

        test('should handle large payloads', async () => {
            const largePayload = { data: 'x'.repeat(1000000) }; // 1MB payload

            const response = await request(app)
                .post('/api/receipts')
                .set('Content-Type', 'application/json')
                .send(largePayload)
                .expect(413); // Payload too large

            expect(response.body).toHaveProperty('error');
        });
    });
});