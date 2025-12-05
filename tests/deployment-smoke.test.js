const axios = require('axios');

describe('Deployment Smoke Tests', () => {
    const baseURL = process.env.VERCEL_URL || 'http://localhost:3000';

    describe('Critical Path Verification', () => {
        test('🚀 SMOKE: Application should be accessible', async () => {
            try {
                const response = await axios.get(baseURL, { timeout: 10000 });
                expect(response.status).toBe(200);
                console.log('✅ Application is accessible');
            } catch (error) {
                console.error('❌ Application not accessible:', error.message);
                throw error;
            }
        });

        test('🚀 SMOKE: Health endpoint should respond', async () => {
            try {
                const response = await axios.get(`${baseURL}/api/health`, { timeout: 10000 });
                expect(response.status).toBe(200);
                expect(response.data.status).toBeDefined();
                console.log('✅ Health endpoint responding');
            } catch (error) {
                console.error('❌ Health endpoint failed:', error.message);
                throw error;
            }
        });

        test('🚀 SMOKE: Supabase connection should be healthy', async () => {
            try {
                const response = await axios.get(`${baseURL}/api/health`, { timeout: 10000 });
                expect(response.data.database.status).toBe('healthy');
                expect(response.data.database.database).toBe('supabase');
                console.log('✅ Supabase connection healthy');
            } catch (error) {
                console.error('❌ Supabase connection unhealthy:', error.message);
                throw error;
            }
        });

        test('🚀 SMOKE: Static assets should be served', async () => {
            try {
                const response = await axios.get(`${baseURL}/static/js/main.js`, { timeout: 10000 });
                expect(response.status).toBe(200);
                expect(response.headers['content-type']).toMatch(/javascript/);
                console.log('✅ Static assets served');
            } catch (error) {
                console.error('❌ Static assets not served:', error.message);
                throw error;
            }
        });
    });

    describe('Basic Functionality Checks', () => {
        test('🚀 SMOKE: API routes should be accessible', async () => {
            const routes = ['/api/auth', '/api/receipts', '/api/analytics'];

            for (const route of routes) {
                try {
                    const response = await axios.get(`${baseURL}${route}/invalid`, {
                        timeout: 5000,
                        validateStatus: () => true
                    });
                    expect([404, 401]).toContain(response.status);
                    console.log(`✅ Route ${route} accessible`);
                } catch (error) {
                    console.error(`❌ Route ${route} not accessible:`, error.message);
                    throw error;
                }
            }
        });

        test('🚀 SMOKE: CORS should be configured', async () => {
            try {
                const response = await axios.options(`${baseURL}/api/health`, {
                    timeout: 5000,
                    headers: {
                        'Origin': 'https://test-domain.com',
                        'Access-Control-Request-Method': 'GET'
                    }
                });
                expect(response.status).toBe(204);
                expect(response.headers).toHaveProperty('access-control-allow-origin');
                console.log('✅ CORS configured');
            } catch (error) {
                console.error('❌ CORS not configured:', error.message);
                throw error;
            }
        });

        test('🚀 SMOKE: Security headers should be present', async () => {
            try {
                const response = await axios.get(`${baseURL}/api/health`, { timeout: 5000 });
                const headers = response.headers;

                expect(headers).toHaveProperty('x-content-type-options');
                expect(headers).toHaveProperty('x-frame-options');
                console.log('✅ Security headers present');
            } catch (error) {
                console.error('❌ Security headers missing:', error.message);
                throw error;
            }
        });
    });

    describe('Performance Checks', () => {
        test('🚀 SMOKE: Response time should be reasonable', async () => {
            try {
                const start = Date.now();
                await axios.get(`${baseURL}/api/health`, { timeout: 10000 });
                const duration = Date.now() - start;

                expect(duration).toBeLessThan(3000); // 3 seconds
                console.log(`✅ Response time: ${duration}ms`);
            } catch (error) {
                console.error('❌ Response time too slow:', error.message);
                throw error;
            }
        });

        test('🚀 SMOKE: Should handle basic load', async () => {
            try {
                const promises = Array(3).fill().map(() =>
                    axios.get(`${baseURL}/api/health`, { timeout: 5000 })
                );

                const start = Date.now();
                const responses = await Promise.all(promises);
                const duration = Date.now() - start;

                expect(responses).toHaveLength(3);
                responses.forEach(response => expect(response.status).toBe(200));

                expect(duration).toBeLessThan(5000); // 5 seconds for 3 concurrent requests
                console.log(`✅ Load test passed: ${duration}ms for 3 requests`);
            } catch (error) {
                console.error('❌ Load test failed:', error.message);
                throw error;
            }
        });
    });

    describe('Error Handling Verification', () => {
        test('🚀 SMOKE: Should handle invalid routes gracefully', async () => {
            try {
                const response = await axios.get(`${baseURL}/api/invalid-route`, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                expect([404, 500]).toContain(response.status);
                console.log('✅ Invalid routes handled gracefully');
            } catch (error) {
                console.error('❌ Invalid route handling failed:', error.message);
                throw error;
            }
        });

        test('🚀 SMOKE: Should handle malformed requests', async () => {
            try {
                const response = await axios.post(`${baseURL}/api/auth/login`, '{invalid', {
                    timeout: 5000,
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: () => true
                });
                expect([400, 422, 500]).toContain(response.status);
                console.log('✅ Malformed requests handled');
            } catch (error) {
                console.error('❌ Malformed request handling failed:', error.message);
                throw error;
            }
        });
    });
});