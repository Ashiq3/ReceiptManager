const { getSupabase } = require('../supabaseClient');

class AnalyticsController {
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

    async getSummary(req, res) {
        try {
            const db = this.getDb();
            const { business_id } = req.user;
            const { period } = req.query;

            // Get total spending, receipts, and average
            let query = db.client
                .from('receipts')
                .select('total_amount')
                .eq('business_id', business_id)
                .eq('status', 'processed');

            // Add date filtering based on period
            if (period === 'monthly') {
                // Last month
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                query = query.gte('receipt_date', startDate.toISOString().split('T')[0]);
            } else if (period === 'yearly') {
                // Last year
                const startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                query = query.gte('receipt_date', startDate.toISOString().split('T')[0]);
            }

            const { data: receipts, error: receiptsError } = await db.query('receipts', query);

            if (receiptsError) {
                throw receiptsError;
            }

            const totalSpending = receipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);
            const totalReceipts = receipts.length;
            const averagePerReceipt = totalReceipts > 0 ? totalSpending / totalReceipts : 0;

            // Get top categories
            const { data: categories, error: categoriesError } = await db.query('receipt_items', db.client
                .from('receipt_items')
                .select('category, total_price')
                .eq('receipt_id.business_id', business_id) // This would need proper join in real implementation
            );

            if (categoriesError) {
                throw categoriesError;
            }

            // Group by category manually
            const categoryMap = {};
            categories.forEach(item => {
                if (!categoryMap[item.category]) {
                    categoryMap[item.category] = {
                        category: item.category || 'Uncategorized',
                        amount: 0
                    };
                }
                categoryMap[item.category].amount += item.total_price || 0;
            });

            // Calculate percentages
            const topCategories = Object.values(categoryMap)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map(cat => ({
                    category: cat.category,
                    amount: cat.amount,
                    percentage: totalSpending > 0 ? ((cat.amount / totalSpending) * 100).toFixed(1) : 0
                }));

            res.json({
                total_spending: totalSpending,
                total_receipts: totalReceipts,
                average_per_receipt: averagePerReceipt,
                top_categories: topCategories
            });

        } catch (error) {
            console.error('Analytics summary error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch analytics summary'
                }
            });
        }
    }

    async getTrends(req, res) {
        try {
            const db = this.getDb();
            const { business_id } = req.user;
            const { period = 'monthly' } = req.query; // monthly, yearly

            let result;
            if (period === 'monthly') {
                // Last 12 months - simplified approach
                const { data, error } = await db.query('receipts', db.client
                    .from('receipts')
                    .select('receipt_date, total_amount')
                    .eq('business_id', business_id)
                    .eq('status', 'processed')
                );

                if (error) throw error;

                // Group by month manually
                const monthlyData = {};
                data.forEach(receipt => {
                    const date = new Date(receipt.receipt_date);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = { date: monthKey, amount: 0 };
                    }
                    monthlyData[monthKey].amount += receipt.total_amount || 0;
                });

                result = Object.values(monthlyData).sort((a, b) => a.date.localeCompare(b.date));
            } else {
                // Last 30 days - simplified approach
                const { data, error } = await db.query('receipts', db.client
                    .from('receipts')
                    .select('receipt_date, total_amount')
                    .eq('business_id', business_id)
                    .eq('status', 'processed')
                );

                if (error) throw error;

                // Group by day manually
                const dailyData = {};
                data.forEach(receipt => {
                    const date = receipt.receipt_date.split('T')[0];
                    if (!dailyData[date]) {
                        dailyData[date] = { date: date, amount: 0 };
                    }
                    dailyData[date].amount += receipt.total_amount || 0;
                });

                // Get last 30 days
                result = Object.values(dailyData)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(-30);
            }

            res.json({
                trends: result.map(row => ({
                    date: row.date,
                    amount: parseFloat(row.amount)
                }))
            });

        } catch (error) {
            console.error('Analytics trends error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch analytics trends'
                }
            });
        }
    }

    async getCategories(req, res) {
        try {
            const db = this.getDb();
            const { business_id } = req.user;

            const { data, error } = await db.query('receipt_items', db.client
                .from('receipt_items')
                .select('category, total_price')
                .eq('receipt_id.business_id', business_id) // This would need proper join in real implementation
            );

            if (error) throw error;

            // Group by category manually
            const categoryMap = {};
            data.forEach(item => {
                if (!categoryMap[item.category]) {
                    categoryMap[item.category] = {
                        category: item.category || 'Uncategorized',
                        amount: 0,
                        count: 0
                    };
                }
                categoryMap[item.category].amount += item.total_price || 0;
                categoryMap[item.category].count += 1;
            });

            const categories = Object.values(categoryMap)
                .sort((a, b) => b.amount - a.amount)
                .map(row => ({
                    name: row.category,
                    value: parseFloat(row.amount),
                    count: row.count
                }));

            res.json({
                categories: categories
            });

        } catch (error) {
            console.error('Analytics categories error:', error);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch category breakdown'
                }
            });
        }
    }
}

module.exports = new AnalyticsController();
