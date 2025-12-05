const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/AnalyticsController');
const { authenticate } = require('../middlewares/authenticate');

// All analytics routes require authentication
router.use(authenticate);

router.get('/summary', analyticsController.getSummary);
router.get('/trends', analyticsController.getTrends);
router.get('/categories', analyticsController.getCategories);

module.exports = router;
