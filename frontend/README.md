# EduEquip - Academic Equipment Order System

A simple, clean React application for managing academic equipment orders.

## Project Structure

```
frontend/
├── public/
│   └── index.html          # Main HTML file
├── src/
│   ├── components/         # Reusable components
│   │   ├── AuthContext.js  # Authentication context
│   │   ├── Layout.js       # Main layout with sidebar
│   │   └── RoleGuard.js    # Route protection by role
│   ├── data/               # Data models and mock data
│   │   ├── entities.js     # Entity class definitions
│   │   └── mockData.js     # Mock data for demo
│   ├── pages/              # Page components
│   │   ├── Catalog.js      # Product catalog with cart
│   │   ├── Dashboard.js    # Overview dashboard
│   │   ├── Logs.js         # System logs (admin only)
│   │   ├── ManageProducts.js # Product management (admin)
│   │   ├── ManageUsers.js  # User management (admin)
│   │   ├── Orders.js       # Order listing
│   │   └── Reports.js      # Analytics reports
│   ├── styles/
│   │   └── global.css      # All styles in one CSS file
│   ├── utils/
│   │   └── index.js        # Utility functions
│   ├── App.js              # Main app with routing
│   └── index.js            # Entry point
└── package.json            # Dependencies
```

## Tech Stack

- **React 18** - UI library
- **React Router v6** - Client-side routing
- **Lucide React** - Icons
- **Plain CSS** - No CSS frameworks, just clean CSS

## Getting Started

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### User Roles
- **Admin** - Full system access
- **Procurement Manager** - Order management and reports
- **Customer** - Browse catalog and place orders

### Pages
- **Dashboard** - Overview with statistics
- **Catalog** - Browse and order equipment
- **Orders** - View and manage orders
- **Reports** - Analytics and insights (admin/manager)
- **Manage Users** - User CRUD operations (admin)
- **Manage Products** - Product CRUD operations (admin)
- **System Logs** - Activity logs (admin)

### Demo Mode
Switch between user roles using the dropdown in the sidebar to test different access levels.

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
