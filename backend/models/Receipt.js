const { getSupabase } = require('../supabaseClient');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

class Receipt {
    constructor() {
        // Lazy initialization
        this.db = null;
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

            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.mimetype)) {
                throw new Error('Invalid file type. Only JPEG, PNG, and PDF are supported.');
            }

            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('File too large. Maximum size is 5MB.');
            }

            // Generate unique filename
            const fileExt = path.extname(file.originalname);
            const fileName = `${uuidv4()}${fileExt}`;
            const storagePath = `receipts/${fileName}`;

            // Save file to storage
            filePath = path.join(process.env.STORAGE_LOCAL_PATH || './uploads', storagePath);
            await this.saveFile(file, filePath);

            // Create receipt record
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
        if (file.mimetype.startsWith('image/')) {
            // Optimize image
            await sharp(file.buffer)
                .resize(2000, 2000, { withoutEnlargement: true })
                .toFile(filePath);
        } else {
            // Save as-is for PDF
            fs.writeFileSync(filePath, file.buffer);
        }
    }

    async updateStatus(receiptId, status, extractedData = null) {
        try {
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
            const receipt = await this.findById(receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            return path.join(process.env.STORAGE_LOCAL_PATH || './uploads', receipt.storage_path);
        } catch (error) {
            throw error;
        }
    }

    async getAnalytics(businessId, { startDate, endDate } = {}) {
        try {
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