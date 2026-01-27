# Academic Equipment Order System (EduEquip)

A full-stack procurement system for academic institutions, featuring role-based access control, AI-powered anomaly detection, and comprehensive audit logging.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Detailed Setup Instructions](#-detailed-setup-instructions)
- [User Roles](#-user-roles)
- [Project Structure](#-project-structure)
- [Security Features](#-security-features)
- [AI Anomaly Detection](#-ai-anomaly-detection)
- [API Endpoints](#-api-endpoints)
- [Troubleshooting](#-troubleshooting)

## Overview

EduEquip is a complete procurement solution designed for academic institutions. It enables:

- **Customers** to browse equipment catalogs and place orders
- **Procurement Managers** to review and approve/reject orders
- **Administrators** to manage users, products, and view system logs

All actions are logged and analyzed by an AI service that detects anomalous behavior (e.g., failed login attempts, unusual activity patterns).

## 🛠 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18, React Router v6, Lucide Icons | Single-page application UI |
| **Backend** | Node.js 18+, Express.js | REST API server |
| **Database** | Supabase (PostgreSQL) | Data persistence |
| **AI Service** | Python 3.9+, FastAPI, Qwen 2.5 LLM | Anomaly detection |
| **Authentication** | JWT (JSON Web Tokens), bcrypt | Stateless auth, secure passwords |
| **Security** | HTTPS/TLS, Rate Limiting, Input Validation | Protection layers |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                             │
│                     https://localhost:3000                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                        │
│                     https://localhost:3001                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Routes    │  │ Middleware  │  │  Services   │                 │
│  │  - auth     │  │  - auth     │  │  - anomaly  │                 │
│  │  - users    │  │  - rate     │  │    client   │                 │
│  │  - products │  │    limiter  │  │  - anomaly  │                 │
│  │  - orders   │  │  - validate │  │    processor│                 │
│  │  - logs     │  │             │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
        │                                       │
        │ PostgreSQL                            │ HTTPS
        ▼                                       ▼
┌───────────────────┐              ┌─────────────────────────────────┐
│     Supabase      │              │   AI Service (Python/FastAPI)   │
│   (PostgreSQL)    │              │      https://localhost:5000     │
│                   │              │                                 │
│  Tables:          │              │  Qwen 2.5 LLM Anomaly Detection │
│  - users          │              │  - security pattern recognition │
│  - products       │              │  - nighttime admin activity     │
│  - orders         │              │  - attack detection             │
│  - order_items    │              └─────────────────────────────────┘
│  - logs           │
│  - log_anomaly_   │
│    scores         │
└───────────────────┘
```

### Data Flow

1. **User Action** → Frontend sends HTTPS request to Backend
2. **Backend** validates request, authenticates user (JWT), processes action
3. **Database** stores/retrieves data via Supabase
4. **Audit Logging** → Every action is logged to the `logs` table
5. **AI Analysis** → Background processor sends logs to AI service for anomaly scoring
6. **Results** → Anomaly scores stored in `log_anomaly_scores` table

## 🚀 Quick Start

> **TL;DR for experienced developers:** Generate certs → create `.env` → `npm run install-all` → `npm start` → accept browser certificate warnings

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Python 3.9+** - [Download](https://www.python.org/)
- **Supabase account** - [Sign up free](https://supabase.com/)
- **OpenSSL** - Usually pre-installed on Linux/macOS; Windows users can use Git Bash

### Quick Installation

```bash
# 1. Clone and install all dependencies
git clone <repository-url>
cd AcademicEquipmentOrderSystem
npm run install-all

# 2. Generate SSL certificates
cd certs && chmod +x generate-certs.sh && ./generate-certs.sh && cd ..

# 3. Create backend/.env file (see Environment Variables section)

# 4. Start all services
npm start
```

## 📖 Detailed Setup Instructions

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd AcademicEquipmentOrderSystem
```

### Step 2: Install Dependencies

This command installs dependencies for the root project, backend, frontend, and creates a Python virtual environment for the AI service:

```bash
npm run install-all
```

**What this does:**
- Installs root `node_modules` (concurrently for running services)
- Installs backend Node.js dependencies
- Installs frontend React dependencies
- Creates Python virtual environment in `ai-service/venv`
- Installs Python AI service dependencies

**If the install-all script fails**, you can install manually:
```bash
# Root
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# AI Service
cd ai-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Step 3: Generate SSL Certificates

All services run over HTTPS for security. Generate self-signed certificates:

```bash
cd certs
chmod +x generate-certs.sh
./generate-certs.sh
cd ..
```

**Output:**
- `certs/server.key` - Private key (keep secret!)
- `certs/server.crt` - Public certificate

> ⚠️ These are self-signed certificates for **development only**. Browsers will show security warnings - this is expected.

### Step 4: Configure Environment Variables

Create a `.env` file in the `/backend` directory:

```bash
# backend/.env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secure-random-secret-key-at-least-32-chars
PORT=3001
```

**Where to get these values:**

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` key |
| `JWT_SECRET` | Generate a secure random string (32+ characters) |
| `PORT` | Default is 3001, change if needed |

**Generate a secure JWT_SECRET:**
```bash
# Linux/macOS
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 5: Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the following schema:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('admin', 'procurement_manager', 'customer')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100) DEFAULT 'Uncategorized',
  status VARCHAR(50) DEFAULT 'available',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);

-- Audit logs table
CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Anomaly scores table
CREATE TABLE log_anomaly_scores (
  id SERIAL PRIMARY KEY,
  log_id INTEGER REFERENCES logs(id) ON DELETE CASCADE,
  anomaly_score DECIMAL(5,4) NOT NULL,
  is_anomaly BOOLEAN NOT NULL,
  model_name VARCHAR(100),
  analyzed_at TIMESTAMP DEFAULT NOW()
);

-- Create system user for audit logging (ID = 0)
INSERT INTO users (id, username, email, password_hash, role) 
VALUES (0, 'system', 'system@local', 'not-a-real-password', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Create initial admin user (password: admin123)
-- NOTE: Change this password immediately after first login!
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SpQ9aQ.3BEJ2nG', 'admin');
```

3. **Important:** The default admin password is `admin123`. Change it after first login!

### Step 6: Start the Application

```bash
# Start all services (backend, frontend, AI service)
npm start

# Or in development mode (with hot reload for backend)
npm run dev
```

### Step 7: Accept SSL Certificate in Browser

Since we use self-signed certificates, you must accept them in your browser:

1. **First, visit the backend:** Open https://localhost:3001/api/health
2. Click "Advanced" → "Proceed to localhost (unsafe)"
3. **Then visit the frontend:** Open https://localhost:3000
4. Accept the certificate warning if prompted

| Service | URL |
|---------|-----|
| Frontend | https://localhost:3000 |
| Backend API | https://localhost:3001 |
| AI Service | https://localhost:5000 |
| API Health Check | https://localhost:3001/api/health |
| AI API Docs (Swagger) | https://localhost:5000/docs |

## 👥 User Roles

| Role | Permissions | Default Page |
|------|-------------|--------------|
| **Admin** | Full access: users, products, orders, logs, reports | Dashboard |
| **Procurement Manager** | Dashboard, orders (approve/reject), reports, catalog | Dashboard |
| **Customer** | Catalog, place orders, view own orders | Catalog |

### Role-Based Access Control (RBAC)

Access control is enforced at multiple levels:
1. **Frontend:** `RoleGuard` component hides unauthorized pages
2. **Backend:** Middleware checks JWT token role before processing requests
3. **Database:** Row-level queries filter data by user ID for customers

## 📁 Project Structure

```
AcademicEquipmentOrderSystem/
├── frontend/              # React SPA (Single Page Application)
│   ├── src/
│   │   ├── components/    # Reusable components (Layout, AuthContext, RoleGuard)
│   │   ├── constants/     # Role definitions
│   │   ├── pages/         # Page components (Dashboard, Catalog, Orders, etc.)
│   │   ├── services/      # API client (api.js)
│   │   ├── styles/        # Global CSS
│   │   └── utils/         # Utility functions (formatDate, formatCurrency)
│   └── package.json
│
├── backend/               # Node.js REST API
│   ├── routes/            # Express route handlers (auth, users, products, orders, logs)
│   ├── middleware/        # Auth, validation, rate limiting middleware
│   ├── services/          # Anomaly detection client and processor
│   ├── utils/             # Utilities (JWT, password hashing, Supabase client, audit logger)
│   └── package.json
│
├── ai-service/            # Python ML microservice
│   ├── app.py             # FastAPI application with Qwen LLM
│   ├── requirements.txt   # Python dependencies
│   └── test_service.py    # Test script for anomaly detection
│
├── certs/                 # SSL certificates for HTTPS
│   └── generate-certs.sh  # Self-signed certificate generator
│
├── package.json           # Root orchestrator (runs all services concurrently)
└── README.md              # This file
```

## 🔒 Security Features

| Feature | Implementation | Description |
|---------|---------------|-------------|
| **HTTPS/TLS** | Self-signed certificates | All traffic encrypted; mandatory for auth |
| **JWT Authentication** | `jsonwebtoken` library | Stateless, 1-hour expiry tokens |
| **Password Hashing** | bcrypt (12 rounds) | Industry-standard secure password storage |
| **Rate Limiting** | `express-rate-limit` | Prevents brute force and DoS attacks |
| **Input Validation** | `express-validator` | Protects against SQL injection and XSS |
| **CORS** | Whitelist-based | Only frontend origin allowed |
| **Audit Logging** | Every action logged | Complete audit trail with AI analysis |

### Rate Limiting Configuration

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login (`/api/auth/login`) | 5 attempts | 15 minutes |
| General API | 100 requests | 1 minute |
| Sensitive operations | 10 requests | 1 minute |

## 🤖 AI Anomaly Detection

The system includes an AI microservice that analyzes audit logs for security anomalies using the **Qwen 2.5-1.5B-Instruct** LLM.

### How It Works

1. **Log Creation** → User action triggers audit log
2. **Queue** → Log is added to background processing queue
3. **AI Analysis** → Qwen LLM classifies log as NORMAL or ANOMALOUS
4. **Storage** → Results saved to `log_anomaly_scores` table
5. **Display** → Admin can view anomaly scores in Logs page

### Detection Patterns

The AI detects these security anomalies:

| Category | Examples |
|----------|----------|
| **SQL Injection** | `SELECT`, `DROP`, `--`, `OR 1=1`, `UNION` |
| **XSS Attacks** | `<script>`, `onerror=`, `javascript:` |
| **Auth Failures** | Failed logins, invalid passwords |
| **Privilege Escalation** | Unauthorized access, role changes |
| **Nighttime Admin Activity** | Admin actions between 00:00-06:00 |
| **Suspicious Tools** | sqlmap, path traversal (`../`), burp |

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Model | `Qwen/Qwen2.5-1.5B-Instruct` | LLM used for classification |
| Batch Size | 10 | Logs processed per batch |
| Process Interval | 10 seconds | How often queue is checked |
| Request Timeout | 30 seconds | Max wait for AI response |

### Testing the AI Service

```bash
# Start the AI service
cd ai-service
source venv/bin/activate
python app.py

# In another terminal, run tests
python test_service.py
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/logout` | User logout | Yes |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Products
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | List products | No |
| GET | `/api/products/:id` | Get product by ID | No |
| POST | `/api/products` | Create product | Admin |
| PUT | `/api/products/:id` | Update product | Admin |
| DELETE | `/api/products/:id` | Soft delete | Admin |

### Orders
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/orders` | List orders (filtered by role) | Optional |
| GET | `/api/orders/:id` | Get order by ID | Optional |
| POST | `/api/orders` | Create order | Yes |
| PUT | `/api/orders/:id/approve` | Approve order | Manager+ |
| PUT | `/api/orders/:id/reject` | Reject order | Manager+ |

### Logs (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | View audit logs with anomaly scores |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend health + DB connection status |

## 🔧 Troubleshooting

### Common Issues

#### "Failed to fetch" or Network Errors
**Cause:** Browser blocking requests to self-signed certificate  
**Solution:** Visit https://localhost:3001/api/health first and accept the certificate warning

#### "SSL certificate files not found"
**Cause:** Certificates not generated  
**Solution:** 
```bash
cd certs && chmod +x generate-certs.sh && ./generate-certs.sh
```

#### "Missing SUPABASE_URL or SUPABASE_KEY"
**Cause:** Environment variables not set  
**Solution:** Create `backend/.env` file with your Supabase credentials

#### AI Service Not Starting
**Cause:** Python dependencies not installed or venv not activated  
**Solution:**
```bash
cd ai-service
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

#### "Model loading failed" in AI Service
**Cause:** First run downloads ~3GB model  
**Solution:** Wait for model download to complete. Requires stable internet connection.

#### Port Already in Use
**Cause:** Another process using port 3000, 3001, or 5000  
**Solution:**
```bash
# Find process using port (e.g., 3001)
lsof -i :3001  # Linux/macOS
netstat -ano | findstr :3001  # Windows

# Kill the process or change port in configuration
```

#### Chrome Certificate Bypass
If Chrome won't let you proceed with the certificate warning:
1. Click anywhere on the warning page
2. Type `thisisunsafe` (no visible text field, just type it)
3. The page will load

### Running Services Individually

```bash
# Backend only
cd backend && npm start

# Frontend only
cd frontend && npm start

# AI Service only
cd ai-service
source venv/bin/activate
python app.py
```

### Development Mode

```bash
# Runs backend with nodemon (auto-reload on file changes)
npm run dev
```

## 📝 License

This project is for academic purposes.
