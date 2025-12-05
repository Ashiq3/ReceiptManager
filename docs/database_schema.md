# Database Schema for Receipt Management System

## 1. Core Tables

### Users Table
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'business_owner'
);
```

### Businesses Table
```sql
CREATE TABLE businesses (
    business_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### Receipts Table
```sql
CREATE TABLE receipts (
    receipt_id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(business_id),
    original_filename VARCHAR(255),
    storage_path VARCHAR(512),
    vendor_name VARCHAR(255),
    receipt_date DATE,
    total_amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    currency VARCHAR(3),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'processed',
    raw_text TEXT,
    confidence_score DECIMAL(5,2)
);
```

### ReceiptItems Table
```sql
CREATE TABLE receipt_items (
    item_id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES receipts(receipt_id),
    item_description TEXT,
    quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    category VARCHAR(100),
    tax_amount DECIMAL(10,2)
);
```

## 2. Indexes for Performance

```sql
CREATE INDEX idx_receipts_business ON receipts(business_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);
CREATE INDEX idx_receipt_items ON receipt_items(receipt_id);
CREATE INDEX idx_users_email ON users(email);
```

## 3. Sample Queries

### Get all receipts for a business
```sql
SELECT r.*, b.business_name
FROM receipts r
JOIN businesses b ON r.business_id = b.business_id
WHERE b.user_id = :user_id
ORDER BY r.receipt_date DESC;
```

### Get receipt details with items
```sql
SELECT r.*, ri.*
FROM receipts r
LEFT JOIN receipt_items ri ON r.receipt_id = ri.receipt_id
WHERE r.receipt_id = :receipt_id;
```

### Search receipts by date range
```sql
SELECT * FROM receipts
WHERE business_id = :business_id
AND receipt_date BETWEEN :start_date AND :end_date
ORDER BY receipt_date;
```

## 4. Data Retention Policy
- Raw receipt images: 7 years (tax compliance)
- Processed data: Permanent (for analytics)
- Audit logs: 2 years
- Regular database backups: Daily with 30-day retention