const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Vercel Deployment Tests', () => {
    describe('Configuration Validation', () => {
        test('vercel.json should exist and be valid JSON', () => {
            const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
            expect(fs.existsSync(vercelConfigPath)).toBe(true);

            const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
            expect(vercelConfig).toHaveProperty('version', 2);
            expect(vercelConfig).toHaveProperty('builds');
            expect(vercelConfig).toHaveProperty('routes');
            expect(vercelConfig).toHaveProperty('env');
        });

        test('vercel.json should have correct build configurations', () => {
            const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
            const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

            expect(vercelConfig.builds).toHaveLength(2);

            // Backend build configuration
            const backendBuild = vercelConfig.builds.find(build => build.src === 'server.js');
            expect(backendBuild).toBeDefined();
            expect(backendBuild.use).toBe('@vercel/node');

            // Frontend build configuration
            const frontendBuild = vercelConfig.builds.find(build => build.src === 'package.json');
            expect(frontendBuild).toBeDefined();
            expect(frontendBuild.use).toBe('@vercel/static-build');
            expect(frontendBuild.config.distDir).toBe('frontend/build');
        });

        test('vercel.json should have correct routing configuration', () => {
            const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
            const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

            expect(vercelConfig.routes).toHaveLength(2);

            // API routes
            const apiRoute = vercelConfig.routes.find(route => route.src === '/api/(.*)');
            expect(apiRoute).toBeDefined();
            expect(apiRoute.dest).toBe('/server.js');

            // Frontend routes
            const frontendRoute = vercelConfig.routes.find(route => route.src === '/(.*)');
            expect(frontendRoute).toBeDefined();
            expect(frontendRoute.dest).toBe('/frontend/$1');
        });
    });

    describe('Package.json Configuration', () => {
        test('should have vercel-build script', () => {
            const packageJsonPath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

            expect(packageJson.scripts).toHaveProperty('vercel-build');
            expect(packageJson.scripts['vercel-build']).toBe('npm run build:frontend');
        });

        test('should have correct Node.js version requirement', () => {
            const packageJsonPath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

            expect(packageJson.engines).toHaveProperty('node');
            expect(packageJson.engines.node).toMatch(/^>=/);
        });
    });

    describe('Server.js Serverless Compatibility', () => {
        test('server.js should export the Express app', () => {
            const serverPath = path.join(__dirname, '..', 'server.js');
            const serverContent = fs.readFileSync(serverPath, 'utf8');

            expect(serverContent).toMatch(/module\.exports = app;/);
        });

        test('server.js should handle local development mode', () => {
            const serverPath = path.join(__dirname, '..', 'server.js');
            const serverContent = fs.readFileSync(serverPath, 'utf8');

            expect(serverContent).toMatch(/if \(require\.main === module\)/);
        });
    });

    describe('Build Process Testing', () => {
        test('frontend build should complete successfully', () => {
            const frontendDir = path.join(__dirname, '..', 'frontend');

            // Change to frontend directory and run build
            process.chdir(frontendDir);

            try {
                execSync('npm run build', { stdio: 'pipe' });
                expect(fs.existsSync(path.join(frontendDir, 'build'))).toBe(true);
                expect(fs.existsSync(path.join(frontendDir, 'build', 'index.html'))).toBe(true);
            } catch (error) {
                throw new Error(`Frontend build failed: ${error.message}`);
            } finally {
                // Change back to root directory
                process.chdir(path.join(__dirname, '..'));
            }
        });

        test('vercel-build script should work', () => {
            try {
                execSync('npm run vercel-build', { stdio: 'pipe' });
                expect(fs.existsSync(path.join(__dirname, '..', 'frontend', 'build'))).toBe(true);
            } catch (error) {
                throw new Error(`Vercel build failed: ${error.message}`);
            }
        });
    });

    describe('Environment Variables Validation', () => {
        test('required environment variables should be documented', () => {
            const envExamplePath = path.join(__dirname, '..', '.env.example');
            expect(fs.existsSync(envExamplePath)).toBe(true);

            const envExample = fs.readFileSync(envExamplePath, 'utf8');

            // Check for critical Supabase variables
            expect(envExample).toMatch(/SUPABASE_URL/);
            expect(envExample).toMatch(/SUPABASE_KEY/);
            expect(envExample).toMatch(/JWT_SECRET/);
        });

        test('production environment variables should be properly configured', () => {
            const envPath = path.join(__dirname, '..', '.env');
            expect(fs.existsSync(envPath)).toBe(true);

            const envContent = fs.readFileSync(envPath, 'utf8');

            // Check for required variables
            expect(envContent).toMatch(/SUPABASE_URL=https:\/\/pevqxykiqddpitickoab\.supabase\.co/);
            expect(envContent).toMatch(/SUPABASE_KEY=/);
            expect(envContent).toMatch(/JWT_SECRET=/);
        });
    });

    describe('Static Asset Verification', () => {
        test('frontend build should contain necessary files', () => {
            const buildDir = path.join(__dirname, '..', 'frontend', 'build');

            // Ensure build directory exists
            expect(fs.existsSync(buildDir)).toBe(true);

            // Check for essential files
            expect(fs.existsSync(path.join(buildDir, 'index.html'))).toBe(true);
            expect(fs.existsSync(path.join(buildDir, 'static'))).toBe(true);
            expect(fs.existsSync(path.join(buildDir, 'static', 'js'))).toBe(true);
            expect(fs.existsSync(path.join(buildDir, 'static', 'css'))).toBe(true);
        });

        test('index.html should contain correct meta tags', () => {
            const indexPath = path.join(__dirname, '..', 'frontend', 'build', 'index.html');
            const indexContent = fs.readFileSync(indexPath, 'utf8');

            expect(indexContent).toMatch(/<title>/);
            expect(indexContent).toMatch(/<meta/);
        });
    });
});