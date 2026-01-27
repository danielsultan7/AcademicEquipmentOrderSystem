# EduEquip Frontend

React single-page application (SPA) for the Academic Equipment Order System.

## Project Structure

```
frontend/
├── public/
│   └── index.html          # Main HTML file
├── src/
│   ├── components/         # Reusable components
│   │   ├── AuthContext.js  # Authentication context and state management
│   │   ├── Layout.js       # Main layout with sidebar navigation
│   │   └── RoleGuard.js    # Route protection by user role
│   ├── constants/
│   │   └── roles.js        # Role constant definitions
│   ├── pages/              # Page components
│   │   ├── Catalog.js      # Product catalog with shopping cart
│   │   ├── Dashboard.js    # Overview dashboard (admin/manager)
│   │   ├── Login.js        # Login page
│   │   ├── Logs.js         # System audit logs (admin only)
│   │   ├── ManageProducts.js # Product CRUD (admin only)
│   │   ├── ManageUsers.js  # User CRUD (admin only)
│   │   ├── Orders.js       # Order listing and management
│   │   └── Reports.js      # Analytics reports
│   ├── services/
│   │   └── api.js          # API client with JWT authentication
│   ├── styles/
│   │   └── global.css      # All styles in one CSS file
│   ├── utils/
│   │   └── index.js        # Utility functions (formatDate, formatCurrency)
│   ├── App.js              # Main app with routing
│   └── index.js            # Entry point
└── package.json            # Dependencies
```

## Tech Stack

- **React 18** - UI library
- **React Router v6** - Client-side routing
- **Lucide React** - Icons
- **Plain CSS** - Custom styling without frameworks

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running at https://localhost:3001
- SSL certificates generated (shared with backend)

### Installation

```bash
cd frontend
npm install
```

### Running

```bash
npm start
```

Opens at https://localhost:3000

> ⚠️ **Important:** Before the frontend can communicate with the backend, you must accept the backend's self-signed certificate. Visit https://localhost:3001/api/health first and accept the warning.

## Features

### User Roles & Access

| Role | Accessible Pages |
|------|-----------------|
| **Admin** | All pages |
| **Procurement Manager** | Dashboard, Catalog, Orders, Reports |
| **Customer** | Catalog, Orders (own orders only) |

### Pages

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Authentication page |
| Dashboard | `/dashboard` | Statistics and recent activity |
| Catalog | `/catalog` | Browse products, add to cart, place orders |
| Orders | `/orders` | View orders, approve/reject (manager+) |
| Reports | `/reports` | Analytics and insights |
| Manage Users | `/users` | User CRUD operations (admin) |
| Manage Products | `/products` | Product CRUD operations (admin) |
| System Logs | `/logs` | Audit logs with anomaly scores (admin) |

## Authentication Flow

1. User enters credentials on Login page
2. Frontend calls `POST /api/auth/login`
3. Backend returns JWT token + user info
4. Token stored in `localStorage`
5. Token sent in `Authorization: Bearer <token>` header for all API calls
6. Token expires after 1 hour → automatic redirect to login

## Environment Variables

Create a `.env` file (optional):

```env
REACT_APP_API_URL=https://localhost:3001/api
```

If not set, defaults to `https://localhost:3001/api`.

## API Integration

The `services/api.js` module provides typed API clients:

```javascript
import { authApi, usersApi, productsApi, ordersApi, logsApi } from './services/api';

// Login
const { user, token } = await authApi.login(username, password);

// Fetch data
const users = await usersApi.getAll();
const products = await productsApi.getAll();
const orders = await ordersApi.getAll();
const logs = await logsApi.getAll();

// CRUD operations
await productsApi.create({ name, price, quantity });
await ordersApi.approve(orderId);
await usersApi.delete(userId);
```

## Building for Production

```bash
npm run build
```

Creates optimized build in `build/` directory.

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Code Style

- Simple, readable JavaScript (no TypeScript)
- Clean CSS with CSS variables
- Functional components with hooks
- Clear file organization
