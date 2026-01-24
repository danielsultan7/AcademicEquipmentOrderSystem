# Academic Equipment Order System (EduEquip)

A full-stack procurement system for academic institutions, featuring role-based access control, AI-powered anomaly detection, and comprehensive audit logging.

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
│  Tables:          │              │  DistilBERT Anomaly Detection   │
│  - users          │              │  - sentiment analysis           │
│  - products       │              │  - audit log scoring            │
│  - orders         │              │                                 │
│  - order_items    │              └─────────────────────────────────┘
│  - logs           │
│  - log_anomaly_   │
│    scores         │
└───────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account (for PostgreSQL database)
- SSL certificates (for HTTPS)

### Installation

```bash
# Clone and install all dependencies
npm run install-all
```

### Generate SSL Certificates (Development)

```bash
cd certs
chmod +x generate-certs.sh
./generate-certs.sh
```

### Environment Variables

Create `.env` file in `/backend`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secure-secret-key
PORT=3001
```

### Run the Application

```bash
# Start all services (backend, frontend, AI service)
npm start

# Or in development mode (with hot reload)
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | https://localhost:3000 |
| Backend API | https://localhost:3001 |
| AI Service | https://localhost:5000 |

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: users, products, orders, logs |
| **Procurement Manager** | Dashboard, orders (approve/reject), reports |
| **Customer** | Catalog, place orders, view own orders |

## 📁 Project Structure

```
AcademicEquipmentOrderSystem/
├── frontend/              # React SPA
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── styles/        # CSS styles
│   └── package.json
│
├── backend/               # Node.js API
│   ├── routes/            # Express routes
│   ├── middleware/        # Auth, validation, rate limiting
│   ├── services/          # Anomaly detection integration
│   ├── utils/             # Utilities (JWT, password, logging)
│   └── package.json
│
├── ai-service/            # Python ML service
│   ├── app.py             # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── test_*.py          # Test scripts
│
├── certs/                 # SSL certificates
│   └── generate-certs.sh  # Certificate generator
│
└── package.json           # Root orchestrator
```

## 🔒 Security Features

- **HTTPS Only** - All services run over TLS
- **JWT Authentication** - Stateless token-based auth
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Express-validator on all inputs
- **Password Hashing** - bcrypt with configurable salt rounds
- **Audit Logging** - Comprehensive action tracking
- **AI Anomaly Detection** - ML-based suspicious activity flagging

## 🤖 AI Anomaly Detection

The system includes an AI service that analyzes audit logs for anomalous behavior:

- Uses DistilBERT (HuggingFace Transformers)
- Sentiment analysis as anomaly proxy
- Non-blocking background processing
- Configurable threshold (default: 0.7)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Soft delete (admin)

### Orders
- `GET /api/orders` - List orders (filtered by role)
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/approve` - Approve order (manager+)
- `PUT /api/orders/:id/reject` - Reject order (manager+)

### Logs (Admin only)
- `GET /api/logs` - View audit logs with anomaly scores

## 🧪 Testing

### Backend Audit Tests
```bash
cd backend
node __audit_tests__/auditLogger.test.js    # Unit tests
node __audit_tests__/integration.test.js    # Integration tests
```

### System Audit Tests
```bash
cd backend/__system_audit_tests__
node run-all.js                              # All suites
node run-all.js A                            # Authentication only
```

### AI Service Tests
```bash
cd ai-service
python test_service.py
```

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
