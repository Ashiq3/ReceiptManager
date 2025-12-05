# Receipt Manager - AI-Powered Receipt Management System

## Overview

Receipt Manager is a comprehensive solution for small business owners to digitize, organize, and analyze their receipts using AI technology. The system allows users to scan receipts via mobile camera or file upload, automatically extract key data, and store it in a structured database for easy retrieval and analysis.

## Features

✅ **AI-Powered Receipt Scanning** - Automatic extraction of vendor, date, amount, and items
✅ **Mobile-Friendly Interface** - Works on any device with camera or file upload
✅ **Secure Database Storage** - Structured storage with proper indexing
✅ **Comprehensive Analytics** - Spending trends, category breakdowns, and business insights
✅ **Robust Authentication** - JWT-based security with role-based access control
✅ **Multi-User Support** - Business owners and team members
✅ **Export Functionality** - CSV, Excel, and PDF export options

## Getting Started

### Prerequisites

- Node.js 16+
- PostgreSQL 13+
- Python 3.9+ (for AI model)
- Docker (for containerized deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/receipt-manager.git
cd receipt-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```bash
npm run migrate
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

```
receipt-manager/
├── backend/               # Backend API server
│   ├── controllers/       # API controllers
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middlewares/       # Express middlewares
│   └── config/            # Configuration files
├── frontend/              # React frontend
│   ├── public/            # Static assets
│   ├── src/               # React components
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Redux store
│   │   └── styles/       # CSS/SCSS files
│   └── package.json       # Frontend dependencies
├── ai/                    # AI model and processing
│   ├── models/            # Trained models
│   ├── preprocessing/     # Image preprocessing
│   └── extraction/        # Data extraction logic
├── config/                # Configuration files
├── migrations/            # Database migrations
├── seeds/                 # Database seeds
├── tests/                 # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── .env.example           # Environment configuration
├── package.json           # Project dependencies
└── README.md              # This file
```

## API Documentation

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/forgot-password` - Password reset

### Receipts

- `POST /api/receipts/upload` - Upload receipt for processing
- `GET /api/receipts/:id/status` - Check processing status
- `GET /api/receipts` - List all receipts
- `GET /api/receipts/:id` - Get receipt details
- `DELETE /api/receipts/:id` - Delete receipt

### Analytics

- `GET /api/analytics/summary` - Get spending summary
- `GET /api/analytics/trends` - Get spending trends
- `GET /api/analytics/categories` - Get category breakdown

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Building for Production

```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:frontend

# Full build
npm run build
```

### Database Migrations

```bash
# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate

# Rollback migration
npm run rollback
```

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t receipt-manager .

# Run container
docker run -p 3000:3000 --env-file .env receipt-manager
```

### AWS Deployment

1. Configure AWS credentials in `.env`
2. Run Terraform to provision infrastructure:
```bash
cd terraform
terraform init
terraform apply
```

3. Deploy using CI/CD pipeline or manually:
```bash
npm run deploy
```

## Configuration

Edit the `.env` file to configure:

- Database connection
- Storage provider (local/S3)
- JWT secrets
- Email settings
- Rate limiting
- Logging configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please contact support@receiptmanager.com