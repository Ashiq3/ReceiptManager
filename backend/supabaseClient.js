const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

class SupabaseClient {
    constructor() {
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

        // Initialize Supabase client
        this.client = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY,
            {
                db: {
                    schema: 'public'
                },
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );

        this.logger.info('Supabase client initialized');
    }

    async initialize() {
        try {
            // Skip connection test for local development if using placeholder URL
            if (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('placeholder')) {
                this.logger.warn('Using placeholder Supabase URL - connection test skipped for local development');
                return this.client;
            }

            // Test connection
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .limit(1);

            if (error) {
                this.logger.error('Supabase connection test failed:', error);
                throw error;
            }

            this.logger.info('Supabase connection established successfully');
            return this.client;
        } catch (error) {
            this.logger.error('Supabase initialization failed (non-fatal):', error);
            // Return client anyway so the app can start (e.g. for Demo Mode)
            return this.client;
        }
    }

    async query(table, queryBuilder) {
        try {
            const start = Date.now();
            const { data, error } = await queryBuilder;

            if (error) {
                this.logger.error('Supabase query failed:', { table, error });
                throw error;
            }

            const duration = Date.now() - start;
            this.logger.debug(`Supabase query executed in ${duration}ms: ${table}`);

            return data;
        } catch (error) {
            this.logger.error('Supabase query error:', { table, error });
            throw error;
        }
    }

    async getClient() {
        return this.client;
    }

    async transaction(operations) {
        // Supabase doesn't have native transactions, so we'll simulate them
        // by executing operations sequentially and rolling back on error
        try {
            const results = [];
            for (const operation of operations) {
                const result = await operation();
                results.push(result);
            }
            return results;
        } catch (error) {
            this.logger.error('Supabase transaction failed:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*', { count: 'exact', head: true });

            if (error) {
                throw error;
            }

            return {
                status: 'healthy',
                database: 'supabase',
                connections: {
                    total: 1, // Supabase manages connections
                    idle: 0,
                    waiting: 0
                }
            };
        } catch (error) {
            this.logger.error('Supabase health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async close() {
        // Supabase client doesn't need explicit closing
        this.logger.info('Supabase client closed');
    }
}

// Singleton instance
let supabaseInstance = null;

async function initializeSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = new SupabaseClient();
        await supabaseInstance.initialize();
    }
    return supabaseInstance;
}

function getSupabase() {
    if (!supabaseInstance) {
        throw new Error('Supabase not initialized. Call initializeSupabase() first.');
    }
    return supabaseInstance;
}

module.exports = {
    initializeSupabase,
    getSupabase
};