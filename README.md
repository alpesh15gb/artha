# Artha Cloud Accounting

A cloud-based accounting application for Indian businesses, built as a modern SaaS solution.

## Features

- **Multi-business Support**: Manage multiple businesses from a single account
- **Parties Management**: Track customers and suppliers with GST compliance
- **Inventory Management**: Manage products and services with stock tracking
- **Invoicing**: Create GST-compliant invoices with automatic tax calculations
- **Estimates/Quotations**: Generate professional quotes
- **Payments**: Record and track payments
- **Expense Tracking**: Monitor business expenses
- **Financial Reports**: Profit & Loss, GST Summary, Party Balances
- **Data Import**: Import data from VyaparApp desktop version
- **Docker Ready**: Easy deployment with Docker and nginx

## Tech Stack

- **Backend**: Node.js, Express, Prisma (PostgreSQL)
- **Frontend**: React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL
- **Reverse Proxy**: nginx
- **Container**: Docker

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### Using Docker (Production)

1. Clone the repository
2. Copy `.env.example` to `.env` and update values
3. Run:
```bash
docker-compose up -d
```

4. Access the app at `http://localhost`

### Local Development

1. Start PostgreSQL database
2. Backend:
```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```

3. Frontend:
```bash
cd client
npm install
npm run dev
```

## Data Import from Vyapar

1. Export data from VyaparApp (Settings → Export Data)
2. Upload the JSON file in the Import section
3. Select your business and start import

### Supported Import Data
- Parties (Customers & Suppliers)
- Items (Products & Services)
- Invoices
- Opening balances
- GST details

## Project Structure

```
artha/
├── server/           # Backend API
│   ├── prisma/       # Database schema
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── middleware/# Auth, error handling
│   │   └── ...
│   └── uploads/      # File uploads
├── client/           # React frontend
│   └── src/
│       ├── pages/    # Page components
│       ├── components/# Reusable components
│       ├── store/    # State management
│       └── services/ # API client
├── docker/           # Docker configs
├── import-tools/     # Data import utilities
└── docker-compose.yml
```

## API Documentation

Base URL: `/api`

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Businesses
- `GET /api/businesses` - List businesses
- `POST /api/businesses` - Create business
- `GET /api/businesses/:id` - Get business details
- `PUT /api/businesses/:id` - Update business

### Parties
- `GET /api/parties/business/:businessId` - List parties
- `POST /api/parties` - Create party
- `GET /api/parties/:id` - Get party details
- `GET /api/parties/:id/balance` - Get party balance

### Items
- `GET /api/items/business/:businessId` - List items
- `POST /api/items` - Create item

### Invoices
- `GET /api/invoices/business/:businessId` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices/:id/payment` - Record payment

### Reports
- `GET /api/reports/business/:id/gst-summary` - GST Summary
- `GET /api/reports/business/:id/profit-loss` - P&L Report
- `GET /api/reports/business/:id/party-balance-summary` - Party Balances

### Import
- `POST /api/import/vyapar` - Import Vyapar data
- `GET /api/import/status/:id` - Check import status

## License

ISC
