const { Pool } = require('pg');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.pool = null;
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    async initialize() {
        try {
            // Create pool
            this.pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                max: process.env.DB_POOL_MAX || 20,
                idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT || 30000,
                connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT || 2000,
                ssl: process.env.DB_SSL === 'true' ? {
                    rejectUnauthorized: false
                } : false
            });

            // Test connection
            await this.pool.query('SELECT 1');
            this.logger.info('Database connection established successfully');

            // Run migrations if in development
            if (process.env.APP_ENV === 'development') {
                await this.runMigrations();
            }

            return this.pool;
        } catch (error) {
            this.logger.error('Database connection failed:', error);
            throw error;
        }
    }

    async runMigrations() {
        try {
            const { execSync } = require('child_process');
            this.logger.info('Running database migrations...');

            // Run Knex migrations
            execSync('npx knex migrate:latest', { stdio: 'inherit' });

            this.logger.info('Migrations completed successfully');
        } catch (error) {
            this.logger.error('Migration failed:', error);
            throw error;
        }
    }

    async query(text, params) {
        try {
            const start = Date.now();
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;

            this.logger.debug(`Query executed in ${duration}ms: ${text}`, { params });

            return result;
        } catch (error) {
            this.logger.error('Query failed:', { text, params, error });
            throw error;
        }
    }

    async getClient() {
        try {
            const client = await this.pool.connect();
            this.logger.debug('Database client acquired');
            return client;
        } catch (error) {
            this.logger.error('Failed to acquire database client:', error);
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.getClient();

        try {
            await client.query('BEGIN');
            this.logger.debug('Transaction started');

            const result = await callback(client);

            await client.query('COMMIT');
            this.logger.debug('Transaction committed');

            return result;
        } catch (error) {
            this.logger.error('Transaction failed, rolling back:', error);
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
            this.logger.debug('Database client released');
        }
    }

    async healthCheck() {
        try {
            const result = await this.query('SELECT 1');
            return {
                status: 'healthy',
                database: process.env.DB_NAME,
                connections: {
                    total: this.pool.totalCount,
                    idle: this.pool.idleCount,
                    waiting: this.pool.waitingCount
                }
            };
        } catch (error) {
            this.logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async close() {
        try {
            await this.pool.end();
            this.logger.info('Database connection pool closed');
        } catch (error) {
            this.logger.error('Failed to close database pool:', error);
            throw error;
        }
    }
}

// Singleton instance
let databaseInstance = null;

async function initializeDatabase() {
    if (!databaseInstance) {
        databaseInstance = new Database();
        await databaseInstance.initialize();
    }
    return databaseInstance;
}

function getDatabase() {
    if (!databaseInstance) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return databaseInstance;
}

module.exports = {
    initializeDatabase,
    getDatabase
};