const { getSupabase } = require('../supabaseClient');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
// Use dynamic import for sharp to handle environments where it may not be available
let sharp = null;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('Sharp not available, image optimization disabled');
}

class Receipt {
    constructor() {
        // Lazy initialization
        this.db = null;
        // Check if running on Vercel
        this.isVercel = !!process.env.VERCEL;
    }

    getDb() {
        if (!this.db) {
            this.db = getSupabase();
        }
        return this.db;
    }

    async create(receiptData, file) {
        let filePath = null;

        try {
            // Validate file
            if (!file) {
                throw new Error('No file provided');
            }

            // Allow any file type for AI processing, but warn if not standard
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp', 'image/heic'];
            // We won't block other types, but we'll log them
            if (!allowedTypes.includes(file.mimetype)) {
                console.warn(`Uploading non-standard file type: ${file.mimetype}`);
            }

            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('File too large. Maximum size is 5MB.');
            }

            // Generate unique filename
            const fileExt = path.extname(file.originalname);
            const fileName = `${uuidv4()}${fileExt}`;
            const storagePath = `receipts/${fileName}`;

            // Check if demo mode - completely bypass database and file operations
            const isDemo = receiptData.business_id === 'demo-business-id';

            if (isDemo) {
                // Return mock data for demo mode - no database or file operations
                const mockReceiptId = `demo-receipt-${uuidv4().slice(0, 8)}`;
                console.log(`Demo mode: Created mock receipt ${mockReceiptId}`);
                // Ensure db is initialized even for demo (to avoid null checks later if needed, though we should guard against usage)
                // this.getDb(); 
                return {
                    receipt_id: mockReceiptId,
                    business_id: receiptData.business_id,
                    original_filename: file.originalname,
                    storage_path: `demo/${storagePath}`,
                    status: 'uploaded',
                    uploaded_by: receiptData.user_id,
                    created_at: new Date().toISOString()
                };
            }

            // Ensure DB is initialized for non-demo
            this.getDb();

            // Non-demo mode: save file and insert into database
            // Non-demo mode: save file and insert into database
            // Critical fix for Vercel: ALWAYS use /tmp
            const baseDir = this.isVercel ? '/tmp' : (process.env.STORAGE_LOCAL_PATH || './uploads');

            // On Vercel, we can't create nested directories reliably in standard paths, 
            // so we'll flatten the structure or ensure /tmp is used
            const finalStoragePath = this.isVercel ? path.basename(storagePath) : storagePath;
            filePath = path.join(baseDir, finalStoragePath);

            await this.saveFile(file, filePath);

            // Create receipt record in database
            const db = this.getDb();
            const data = await db.query('receipts', db.client
                .from('receipts')
                .insert({
                    business_id: receiptData.business_id,
                    original_filename: file.originalname,
                    storage_path: storagePath,
                    status: 'uploaded',
                    uploaded_by: receiptData.user_id
                })
                .select()
                .single()
            );

            return data;
        } catch (error) {
            // Clean up file if it was saved
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
            throw error;
        }
    }

    async saveFile(file, filePath) {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Save file
        if (sharp && file.mimetype.startsWith('image/')) {
            // Optimize image with sharp (if available)
            try {
                await sharp(file.buffer)
                    .resize(2000, 2000, { withoutEnlargement: true })
                    .toFile(filePath);
            } catch (sharpError) {
                // If sharp fails, save as-is
                console.warn('Sharp processing failed, saving raw file:', sharpError.message);
                fs.writeFileSync(filePath, file.buffer);
            }
        } else {
            // Save as-is for PDF or if sharp is not available
            fs.writeFileSync(filePath, file.buffer);
        }
    }

    async updateStatus(receiptId, status, extractedData = null) {
        try {
            // Check for demo receipt
            if (receiptId && receiptId.toString().startsWith('demo-')) {
                console.log(`Demo mode: Skipping DB update for ${receiptId}, status: ${status}`);
                return {
                    receipt_id: receiptId,
                    status: status,
                    ...extractedData
                };
            }

            // Ensure DB is connected
            this.getDb();

            if (extractedData) {
                const data = await this.db.query('receipts', this.db.client
                    .from('receipts')
                    .update({
                        status: status,
                        vendor_name: extractedData.vendor,
                        receipt_date: extractedData.date,
                        total_amount: extractedData.total,
                        payment_method: extractedData.payment_method,
                        currency: extractedData.currency || 'USD',
                        raw_text: extractedData.raw_text,
                        extracted_data: extractedData.extracted_data, // Save JSONB
                        confidence_score: extractedData.confidence || 0.95,
                        processed_at: new Date().toISOString()
                    })
                    .eq('receipt_id', receiptId)
                    .select()
                    .single()
                );

                return data;
            } else {
                const data = await this.db.query('receipts', this.db.client
                    .from('receipts')
                    .update({
                        status: status
                    })
                    .eq('receipt_id', receiptId)
                    .select()
                    .single()
                );

                return data;
            }
        } catch (error) {
            throw error;
        }
    }

    async findById(receiptId) {
        try {
            // Demo mode check
            if (receiptId && receiptId.toString().startsWith('demo-')) {
                return {
                    receipt_id: receiptId,
                    business_id: 'demo-business-id',
                    original_filename: 'demo_receipt.jpg',
                    vendor_name: 'Demo Vendor',
                    receipt_date: new Date().toISOString().split('T')[0],
                    total_amount: 123.45,
                    payment_method: 'Credit Card',
                    currency: 'USD',
                    status: 'processed', // Always processed for demo
                    processed_at: new Date().toISOString(),
                    storage_path: 'demo/receipt.jpg',
                    users: { email: 'demo@example.com' },
                    extracted_data: {
                        vendor: 'Demo Office Supplies',
                        date: new Date().toISOString().split('T')[0],
                        total: 150.00,
                        invoice_number: 'INV-2023-001',
                        tax_amount: 12.50,
                        store_address: '123 Fake Street, Tech City',
                        cashier_name: 'John Doe',
                        loyalty_points_earned: 50
                    }
                };
            }

            const data = await this.db.query('receipts', this.db.client
                .from('receipts')
                .select('*, users(email)')
                .eq('receipt_id', receiptId)
                .single()
            );

            return data || null;
        } catch (error) {
            throw error;
        }
    }

    async findByBusiness(businessId, { limit = 50, offset = 0, startDate, endDate, vendor, minAmount, maxAmount } = {}) {
        try {
            // Demo mode check
            if (businessId === 'demo-business-id') {
                return [
                    {
                        receipt_id: 'demo-receipt-1',
                        business_id: 'demo-business-id',
                        original_filename: 'demo_receipt_1.jpg',
                        vendor_name: 'Demo Office Supples',
                        receipt_date: new Date().toISOString().split('T')[0],
                        total_amount: 150.00,
                        status: 'processed',
                        processed_at: new Date().toISOString()
                    },
                    {
                        receipt_id: 'demo-receipt-2',
                        business_id: 'demo-business-id',
                        original_filename: 'demo_receipt_2.pdf',
                        vendor_name: 'Demo Software Co',
                        receipt_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                        total_amount: 99.99,
                        status: 'processed',
                        processed_at: new Date(Date.now() - 86400000).toISOString()
                    }
                ];
            }

            let query = this.db.client
                .from('receipts')
                .select('*')
                .eq('business_id', businessId)
                .order('receipt_date', { ascending: false })
                .limit(limit)
                .range(offset, offset + limit - 1);

            if (startDate && endDate) {
                query = query.gte('receipt_date', startDate).lte('receipt_date', endDate);
            }

            if (vendor) {
                query = query.ilike('vendor_name', `%${vendor}%`);
            }

            if (minAmount !== undefined && minAmount !== null && minAmount !== '') {
                query = query.gte('total_amount', parseFloat(minAmount));
            }

            if (maxAmount !== undefined && maxAmount !== null && maxAmount !== '') {
                query = query.lte('total_amount', parseFloat(maxAmount));
            }

            const data = await this.db.query('receipts', query);

            return data;
        } catch (error) {
            throw error;
        }
    }

    async countByBusiness(businessId, { startDate, endDate, vendor, minAmount, maxAmount } = {}) {
        try {
            // Demo mode check
            if (businessId === 'demo-business-id') {
                return 2;
            }

            let query = this.db.client
                .from('receipts')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId);

            if (startDate && endDate) {
                query = query.gte('receipt_date', startDate).lte('receipt_date', endDate);
            }

            if (vendor) {
                query = query.ilike('vendor_name', `%${vendor}%`);
            }

            if (minAmount !== undefined && minAmount !== null && minAmount !== '') {
                query = query.gte('total_amount', parseFloat(minAmount));
            }

            if (maxAmount !== undefined && maxAmount !== null && maxAmount !== '') {
                query = query.lte('total_amount', parseFloat(maxAmount));
            }

            const result = await this.db.query('receipts', query);

            // For head:true queries, the result includes count property
            return result?.count || 0;
        } catch (error) {
            throw error;
        }
    }

    async addItems(receiptId, items) {
        if (!items || items.length === 0) {
            return [];
        }

        // Check for demo receipt
        if (receiptId && receiptId.toString().startsWith('demo-')) {
            console.log(`Demo mode: Skipping addItems for ${receiptId}`);
            return items.map((item, index) => ({
                ...item,
                item_id: `demo-item-${index}`,
                receipt_id: receiptId
            }));
        }

        this.getDb();

        try {
            const results = [];
            for (const item of items) {
                const data = await this.db.query('receipt_items', this.db.client
                    .from('receipt_items')
                    .insert({
                        receipt_id: receiptId,
                        item_description: item.description,
                        quantity: item.quantity || 1,
                        unit_price: item.unit_price || item.total_price,
                        total_price: item.total_price,
                        category: item.category || 'general'
                    })
                    .select()
                    .single()
                );

                results.push(data);
            }
            return results;
        } catch (error) {
            throw error;
        }
    }

    async getItems(receiptId) {
        try {
            // Demo mode check
            if (receiptId && receiptId.toString().startsWith('demo-')) {
                return [
                    {
                        item_id: 'demo-item-1',
                        receipt_id: receiptId,
                        item_description: 'Office Supplies',
                        quantity: 1,
                        unit_price: 50.00,
                        total_price: 50.00,
                        category: 'Office'
                    },
                    {
                        item_id: 'demo-item-2',
                        receipt_id: receiptId,
                        item_description: 'Software License',
                        quantity: 1,
                        unit_price: 73.45,
                        total_price: 73.45,
                        category: 'Software'
                    }
                ];
            }

            const data = await this.db.query('receipt_items', this.db.client
                .from('receipt_items')
                .select('*')
                .eq('receipt_id', receiptId)
                .order('item_id', { ascending: true })
            );

            return data || [];
        } catch (error) {
            throw error;
        }
    }

    async delete(receiptId) {
        try {
            // Demo mode check
            if (receiptId && receiptId.toString().startsWith('demo-')) {
                return { message: 'Demo receipt deleted' };
            }

            // Get receipt to delete file
            const receipt = await this.findById(receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            // Delete items
            await this.db.query('receipt_items', this.db.client
                .from('receipt_items')
                .delete()
                .eq('receipt_id', receiptId)
            );

            // Delete receipt
            const data = await this.db.query('receipts', this.db.client
                .from('receipts')
                .delete()
                .eq('receipt_id', receiptId)
                .select()
                .single()
            );

            // Delete file
            const filePath = path.join(process.env.STORAGE_LOCAL_PATH || './uploads', receipt.storage_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    async getFilePath(receiptId) {
        try {
            // Demo mode check
            if (receiptId && receiptId.toString().startsWith('demo-')) {
                // Return a fake path for demo
                return path.join(process.env.STORAGE_LOCAL_PATH || './uploads', 'demo/receipt.jpg');
            }

            const receipt = await this.findById(receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            if (this.isVercel) {
                // On Vercel, files are in /tmp and flattened
                return path.join('/tmp', path.basename(receipt.storage_path));
            }

            return path.join(process.env.STORAGE_LOCAL_PATH || './uploads', receipt.storage_path);
        } catch (error) {
            throw error;
        }
    }

    async getAnalytics(businessId, { startDate, endDate } = {}) {
        try {
            // Demo mode check
            if (businessId === 'demo-business-id') {
                return {
                    total_receipts: 15,
                    total_spending: 4321.50,
                    avg_per_receipt: 288.10,
                    first_receipt_date: new Date(Date.now() - 30 * 86400000).toISOString(),
                    last_receipt_date: new Date().toISOString()
                };
            }

            // Get total receipts count
            const receipts = await this.db.query('receipts', this.db.client
                .from('receipts')
                .select('total_amount')
                .eq('business_id', businessId)
                .eq('status', 'processed')
            );

            const receiptsList = receipts || [];
            const totalSpending = receiptsList.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);
            const avgPerReceipt = receiptsList.length > 0 ? totalSpending / receiptsList.length : 0;

            return {
                total_receipts: receiptsList.length,
                total_spending: totalSpending,
                avg_per_receipt: avgPerReceipt,
                first_receipt_date: null,
                last_receipt_date: null
            };
        } catch (error) {
            throw error;
        }
    }

    async getCategoryBreakdown(businessId, { startDate, endDate } = {}) {
        try {
            // Demo mode check
            if (businessId === 'demo-business-id') {
                return [
                    { category: 'Software', total_amount: 1200.00, item_count: 5 },
                    { category: 'Office Supplies', total_amount: 500.00, item_count: 10 },
                    { category: 'Travel', total_amount: 2500.00, item_count: 3 },
                    { category: 'Meals', total_amount: 121.50, item_count: 2 },
                ];
            }

            // This is a simplified version - in a real app you'd use PostgreSQL functions
            const items = await this.db.query('receipt_items', this.db.client
                .from('receipt_items')
                .select('category, total_price')
            );

            const itemsList = items || [];

            // Group by category manually
            const categories = {};
            itemsList.forEach(item => {
                if (!categories[item.category]) {
                    categories[item.category] = {
                        category: item.category,
                        total_amount: 0,
                        item_count: 0
                    };
                }
                categories[item.category].total_amount += item.total_price || 0;
                categories[item.category].item_count += 1;
            });

            return Object.values(categories)
                .sort((a, b) => b.total_amount - a.total_amount)
                .slice(0, 10);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new Receipt();