# Database Implementation Plan

## 1. Database Setup

### PostgreSQL Configuration
```sql
-- Create database
CREATE DATABASE receipt_manager
  WITH
  OWNER = receipt_app_user
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.utf8'
  LC_CTYPE = 'en_US.utf8'
  TABLESPACE = pg_default
  CONNECTION LIMIT = -1;

-- Create user with appropriate permissions
CREATE USER receipt_app_user WITH PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE receipt_manager TO receipt_app_user;
```

### Connection Pooling
```javascript
// Node.js implementation using pg-pool
const { Pool } = require('pg');

const pool = new Pool({
  user: 'receipt_app_user',
  host: 'localhost',
  database: 'receipt_manager',
  password: process.env.DB_PASSWORD,
  port: 5432,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
```

## 2. Data Access Layer

### Repository Pattern Implementation
```javascript
class ReceiptRepository {
  constructor(db) {
    this.db = db;
  }

  async create(receiptData) {
    const query = `
      INSERT INTO receipts
      (business_id, original_filename, storage_path, vendor_name,
       receipt_date, total_amount, payment_method, currency,
       raw_text, confidence_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      receiptData.business_id,
      receiptData.original_filename,
      receiptData.storage_path,
      receiptData.vendor_name,
      receiptData.receipt_date,
      receiptData.total_amount,
      receiptData.payment_method,
      receiptData.currency,
      receiptData.raw_text,
      receiptData.confidence_score
    ];

    return this.db.query(query, values);
  }

  async findById(receiptId) {
    const query = 'SELECT * FROM receipts WHERE receipt_id = $1';
    return this.db.query(query, [receiptId]);
  }

  async findByBusiness(businessId, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT * FROM receipts
      WHERE business_id = $1
      ORDER BY receipt_date DESC
      LIMIT $2 OFFSET $3
    `;
    return this.db.query(query, [businessId, limit, offset]);
  }

  async updateStatus(receiptId, status) {
    const query = `
      UPDATE receipts
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE receipt_id = $2
      RETURNING *;
    `;
    return this.db.query(query, [status, receiptId]);
  }
}
```

## 3. Transaction Management

### Receipt Processing Transaction
```javascript
async function processReceiptTransaction(db, receiptData, items) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Insert receipt
    const receiptResult = await client.query(
      `INSERT INTO receipts (...) VALUES (...) RETURNING receipt_id`,
      [/* receipt values */]
    );
    const receiptId = receiptResult.rows[0].receipt_id;

    // Insert items
    for (const item of items) {
      await client.query(
        `INSERT INTO receipt_items
         (receipt_id, item_description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [receiptId, item.description, item.quantity, item.unit_price, item.total_price]
      );
    }

    // Update business statistics
    await client.query(
      `UPDATE businesses
       SET last_receipt_date = CURRENT_TIMESTAMP,
           total_receipts = total_receipts + 1
       WHERE business_id = $1`,
      [receiptData.business_id]
    );

    await client.query('COMMIT');
    return { success: true, receiptId };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

## 4. Data Migration Strategy

### Initial Migration
```javascript
// Using Knex.js for migrations
exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.increments('user_id').primary();
      table.string('email', 255).unique().notNullable();
      table.string('password_hash', 255).notNullable();
      // ... other fields
      table.timestamps(true, true);
    })
    .createTable('businesses', table => {
      table.increments('business_id').primary();
      table.integer('user_id').unsigned().references('users.user_id');
      // ... other fields
    })
    .createTable('receipts', table => {
      table.increments('receipt_id').primary();
      table.integer('business_id').unsigned().references('businesses.business_id');
      // ... other fields
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('receipt_items')
    .dropTable('receipts')
    .dropTable('businesses')
    .dropTable('users');
};
```

## 5. Backup and Recovery

### Automated Backup Script
```bash
#!/bin/bash
# Daily database backup script

BACKUP_DIR="/backups/receipt_manager"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="receipt_manager"
DB_USER="backup_user"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U $DB_USER -d $DB_NAME -F c -f $BACKUP_DIR/$DB_NAME_$DATE.dump

# Compress backup
gzip $BACKUP_DIR/$DB_NAME_$DATE.dump

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -type f -mtime +30 -delete

# Verify backup integrity
if pg_restore -U $DB_USER -d postgres -c $BACKUP_DIR/$DB_NAME_$DATE.dump.gz > /dev/null 2>&1; then
    echo "Backup successful and verified"
else
    echo "Backup failed or verification failed"
    exit 1
fi
```

### Recovery Procedure
```sql
-- Step 1: Create new database
CREATE DATABASE receipt_manager_recovery;

-- Step 2: Restore from backup
pg_restore -U receipt_app_user -d receipt_manager_recovery \
  /backups/receipt_manager/receipt_manager_20231115_143022.dump.gz

-- Step 3: Verify data integrity
SELECT COUNT(*) FROM receipts;
SELECT COUNT(*) FROM receipt_items;
```

## 6. Performance Monitoring

### Query Optimization
```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_receipts_business_date
ON receipts(business_id, receipt_date);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM receipts
WHERE business_id = 456
AND receipt_date BETWEEN '2023-11-01' AND '2023-11-30'
ORDER BY receipt_date DESC;
```

### Monitoring Setup
```javascript
// Database health check endpoint
app.get('/api/db/health', async (req, res) => {
  try {
    const result = await db.query('SELECT 1');
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM receipts) as total_receipts,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM businesses) as total_businesses
    `);

    res.json({
      status: 'healthy',
      database: 'postgresql',
      connections: pool.totalCount - pool.idleCount,
      stats: stats.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});