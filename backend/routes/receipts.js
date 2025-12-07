const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { authenticate } = require('../middlewares/authenticate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.memoryStorage();

// File filter - supports all common receipt image formats
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Supported: JPEG, PNG, PDF, WebP, HEIC.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Upload receipt
router.post(
    '/upload',
    authenticate,
    upload.single('file'),
    (req, res) => receiptController.uploadReceipt(req, res)
);

// Get receipt status
router.get(
    '/:receipt_id/status',
    authenticate,
    (req, res) => receiptController.getReceiptStatus(req, res)
);

// List receipts
router.get(
    '/',
    authenticate,
    (req, res) => receiptController.listReceipts(req, res)
);

// Get receipt details
router.get(
    '/:receipt_id',
    authenticate,
    (req, res) => receiptController.getReceiptDetails(req, res)
);

// Delete receipt
router.delete(
    '/:receipt_id',
    authenticate,
    (req, res) => receiptController.deleteReceipt(req, res)
);

// Get receipt file
router.get(
    '/:receipt_id/file',
    authenticate,
    (req, res) => receiptController.getReceiptFile(req, res)
);

module.exports = router;