# API Design for Receipt Management System

## 1. Authentication Endpoints

### User Registration
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123",
  "full_name": "John Doe",
  "business_name": "My Restaurant",
  "phone_number": "+1234567890"
}

Response:
{
  "user_id": 123,
  "business_id": 456,
  "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123"
}

Response:
{
  "user_id": 123,
  "business_id": 456,
  "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 2. Receipt Processing Endpoints

### Upload Receipt
```
POST /api/receipts/upload
Authorization: Bearer {auth_token}
Content-Type: multipart/form-data

Form Data:
- file: (binary receipt image)
- business_id: 456

Response:
{
  "receipt_id": 789,
  "status": "processing",
  "message": "Receipt uploaded successfully, processing started"
}
```

### Get Receipt Status
```
GET /api/receipts/{receipt_id}/status
Authorization: Bearer {auth_token}

Response:
{
  "status": "completed",
  "progress": 100,
  "data": {
    "vendor": "ABC Restaurant",
    "date": "2023-12-01",
    "total": 125.50,
    "items": [...]
  }
}
```

## 3. Data Retrieval Endpoints

### List All Receipts
```
GET /api/receipts
Authorization: Bearer {auth_token}
Query Parameters:
- business_id: 456
- start_date: 2023-11-01
- end_date: 2023-11-30
- limit: 50
- offset: 0

Response:
{
  "total_count": 125,
  "receipts": [
    {
      "receipt_id": 789,
      "vendor": "ABC Restaurant",
      "date": "2023-11-15",
      "total": 125.50,
      "status": "processed"
    },
    ...
  ]
}
```

### Get Receipt Details
```
GET /api/receipts/{receipt_id}
Authorization: Bearer {auth_token}

Response:
{
  "receipt_id": 789,
  "business_id": 456,
  "vendor": "ABC Restaurant",
  "date": "2023-11-15",
  "total": 125.50,
  "payment_method": "Credit Card",
  "items": [
    {
      "description": "Chicken Biryani",
      "quantity": 2,
      "unit_price": 15.99,
      "total": 31.98
    },
    ...
  ],
  "raw_image_url": "/storage/receipts/789.jpg",
  "processed_at": "2023-11-15T14:30:00Z"
}
```

## 4. Analytics Endpoints

### Get Spending Summary
```
GET /api/analytics/summary
Authorization: Bearer {auth_token}
Query Parameters:
- business_id: 456
- period: "monthly" (daily/weekly/monthly/yearly)

Response:
{
  "total_spending": 15250.75,
  "average_per_receipt": 122.00,
  "top_categories": [
    {"category": "Food", "amount": 8520.50, "percentage": 55.8},
    {"category": "Supplies", "amount": 4250.25, "percentage": 27.9}
  ],
  "trend": "increasing"
}
```

## 5. Error Handling

### Standard Error Response
```
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid file format. Only JPEG, PNG, and PDF are supported.",
    "details": {
      "supported_formats": ["image/jpeg", "image/png", "application/pdf"]
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Invalid or missing auth token
- `FORBIDDEN`: User doesn't have access to resource
- `INVALID_INPUT`: Validation failed
- `PROCESSING_ERROR`: AI processing failed
- `STORAGE_ERROR`: Database storage failed
- `RATE_LIMITED`: Too many requests