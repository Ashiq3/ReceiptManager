const express = require('express');
const router = express.Router();
const { getSupabase } = require('../supabaseClient');

router.get('/', async (req, res) => {
    try {
        const db = getSupabase();
        const dbHealth = await db.healthCheck();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbHealth,
            environment: process.env.APP_ENV || 'development',
            version: '1.0.0'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;