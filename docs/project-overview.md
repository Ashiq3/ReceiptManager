# Project Overview: AI-Powered Receipt Management System

## 1. Introduction
The **Receipt Manager** is a comprehensive web application designed to help small business owners digitize, organize, and manage their receipts. It leverages AI and OCR (Optical Character Recognition) technology to automatically extract key data from uploaded receipt images, eliminating manual data entry and streamlining expense tracking.

## 2. Technology Stack

### Frontend
-   **Framework**: React.js (v18)
-   **UI Library**: Material-UI (MUI) v5
-   **State Management**: React Query (Server state), Context API (Auth state)
-   **Routing**: React Router v6
-   **HTTP Client**: Axios
-   **Styling**: Emotion (CSS-in-JS)

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: PostgreSQL
-   **ORM/Query Builder**: Knex.js
-   **Authentication**: JWT (JSON Web Tokens)
-   **File Handling**: Multer (for uploads)
-   **Logging**: Winston

### Infrastructure & Tools
-   **Containerization**: Docker (implied by `docker-compose.yml`)
-   **Testing**: Jest, Supertest
-   **Linting**: ESLint

## 3. System Architecture
The application follows a standard **Client-Server** architecture:

1.  **Client (Frontend)**: A Progressive Web App (PWA) that users interact with. It handles image capturing/uploading and displays data.
2.  **Server (Backend)**: A RESTful API that handles business logic, authentication, file processing, and database interactions.
3.  **Database**: PostgreSQL stores structured data (users, receipts, items).
4.  **AI Service**: An integrated service (likely Python-based) that processes images to extract text and structured data.

## 4. Key Features

-   **User Authentication**: Secure signup and login functionality using JWT.
-   **Receipt Upload**: Users can upload receipts via file selection or camera capture (supported formats: JPEG, PNG, PDF).
-   **AI Data Extraction**: Automatically parses receipts to identify:
    -   Vendor Name
    -   Date
    -   Total Amount
    -   Line Items
    -   Payment Method
-   **Dashboard**: Visual analytics and summaries of expenses.
-   **Search & Filter**: specific receipts based on date, vendor, or amount.
-   **Receipt Management**: View details, download original files, and delete records.

## 5. Backend Structure & Functionality

The backend is organized into a modular structure:

### Directory Structure
-   `server.js`: Application entry point. Configures Express, middleware (CORS, Helmet, BodyParser), and connects to the database.
-   `backend/routes/`: Defines API endpoints.
-   `backend/controllers/`: Contains the business logic for each route.
-   `backend/models/`: Database models/schema definitions.
-   `backend/middlewares/`: Custom middleware (e.g., `authenticate.js` for protecting routes).
-   `backend/database/`: Database connection and configuration.

### Key API Endpoints

#### Authentication (`/api/auth`)
-   `POST /register`: Create a new user account.
-   `POST /login`: Authenticate user and receive a JWT.

#### Receipts (`/api/receipts`)
-   `POST /upload`: Upload a receipt image for processing. (Protected)
-   `GET /`: List all receipts for the authenticated user. (Protected)
-   `GET /:id`: Get detailed information about a specific receipt. (Protected)
-   `GET /:id/file`: Download the original receipt image/file. (Protected)
-   `DELETE /:id`: Delete a receipt. (Protected)

#### Analytics (`/api/analytics`)
-   Provides data for the dashboard charts and reports.

## 6. Frontend Structure & Functionality

The frontend is a single-page application (SPA) built with React.

### Directory Structure
-   `src/index.js`: Entry point, sets up Providers (Theme, Auth, QueryClient).
-   `src/App.js`: Main component, handles routing.
-   `src/pages/`: Top-level page components (e.g., Dashboard, Login, ReceiptList).
-   `src/components/`: Reusable UI components.
-   `src/context/`: Global state (AuthContext).

### Key Workflows
1.  **Login/Signup**: Users authenticate to access the app. Tokens are stored for session management.
2.  **Dashboard**: The landing page after login, showing an overview of recent activity and expense charts.
3.  **Upload Flow**: Users select a file -> Frontend sends it to `POST /api/receipts/upload` -> Backend saves file and triggers AI processing -> Frontend polls for status or displays result.
