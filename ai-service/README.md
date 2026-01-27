# AI Anomaly Detection Service

A Python microservice that analyzes audit log text for security anomalies using the **Qwen 2.5-1.5B-Instruct** LLM from HuggingFace.

## Architecture

```
┌─────────────────────┐         HTTPS POST         ┌─────────────────────┐
│   Node.js Backend   │  ───────────────────────▶  │   Python AI Service │
│                     │                            │                     │
│  - Writes audit log │  POST /analyze-log         │  - Loads Qwen LLM   │
│  - Calls AI service │  {log_id, log_text,        │  - Classifies logs  │
│  - Stores result    │   timestamp}               │  - Returns score    │
│                     │  ◀───────────────────────  │                     │
│                     │  {anomaly_score, ...}      │                     │
└─────────────────────┘                            └─────────────────────┘
```

## Quick Start

```bash
# 1. Create virtual environment
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Ensure SSL certificates exist
cd ../certs && ./generate-certs.sh && cd ../ai-service

# 4. Run the service
python app.py
```

The service will be available at `https://localhost:5000`

> ⚠️ **First run downloads the model (~3GB)** - this may take several minutes depending on your internet connection.

## API Endpoints

### Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "Qwen/Qwen2.5-1.5B-Instruct"
}
```

### Analyze Single Log
```bash
POST /analyze-log
Content-Type: application/json

{
  "log_id": 123,
  "log_text": "Failed login attempt for username: admin",
  "timestamp": "2026-01-26T02:30:00Z"
}
```
Response:
```json
{
  "log_id": 123,
  "anomaly_score": 1.0,
  "is_anomaly": true,
  "model_name": "Qwen/Qwen2.5-1.5B-Instruct"
}
```

### Analyze Batch
```bash
POST /analyze-batch
Content-Type: application/json

[
  {"log_id": 1, "log_text": "User logged in successfully", "timestamp": "2026-01-26T10:00:00Z"},
  {"log_id": 2, "log_text": "Failed login attempt", "timestamp": "2026-01-26T03:00:00Z"},
  {"log_id": 3, "log_text": "Admin deleted user from system", "timestamp": "2026-01-26T04:00:00Z"}
]
```

## How It Works

### LLM-Based Classification

The service uses the Qwen 2.5-1.5B-Instruct model to directly classify logs:

1. **Input**: Audit log text + optional timestamp
2. **Time Tag**: Timestamp is converted to `[nighttime]` (00:00-06:00) or `[daytime]`
3. **LLM Prompt**: System prompt with security rules + log text
4. **Output**: "NORMAL" or "ANOMALOUS" classification

### Detection Rules

| Category | Pattern Examples |
|----------|-----------------|
| **SQL Injection** | SELECT, DROP, DELETE, INSERT, UPDATE, --, OR 1=1, UNION |
| **XSS Attacks** | \<script\>, onerror=, javascript:, \<img, onclick= |
| **Auth Failures** | "failed login", "invalid password", "authentication rejected" |
| **Privilege Escalation** | "unauthorized", "access denied", "permission denied" |
| **Nighttime Admin** | Any log with "admin" during 00:00-06:00 → ANOMALOUS |
| **Suspicious Tools** | sqlmap, path traversal (../), burp, nikto |

### Example Classifications

| Log Text | Time | Classification | Reason |
|----------|------|----------------|--------|
| "User john logged in successfully" | 14:00 | NORMAL | Standard login |
| "Admin deleted user from system" | 03:00 | ANOMALOUS | Nighttime admin activity |
| "User input: ' OR '1'='1' --" | 10:00 | ANOMALOUS | SQL injection pattern |
| "Order #12345 created" | 11:30 | NORMAL | Standard operation |
| "Comment: \<script\>alert('XSS')\</script\>" | 15:00 | ANOMALOUS | XSS attack pattern |

## Model Information

- **Model**: `Qwen/Qwen2.5-1.5B-Instruct`
- **Parameters**: 1.5 billion
- **Size**: ~3GB download
- **Inference Time**: ~5-15 seconds per log (depends on hardware)
- **Requirements**: 4GB+ RAM recommended

## API Documentation

FastAPI provides automatic interactive documentation:

- **Swagger UI**: https://localhost:5000/docs
- **ReDoc**: https://localhost:5000/redoc

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SSL_KEY_PATH` | `../certs/server.key` | Path to SSL private key |
| `SSL_CERT_PATH` | `../certs/server.crt` | Path to SSL certificate |

## Testing

```bash
# Ensure AI service is running first
python app.py

# In another terminal
python test_service.py
```

The test script covers:
- SQL injection detection
- XSS attack detection
- Authentication failure detection
- Nighttime admin activity detection
- Privilege escalation detection
- Normal operation verification

## Integration with Node.js Backend

See `backend/services/anomalyClient.js` for the Node.js client implementation.

The backend calls this service asynchronously via a background processor (`anomalyProcessor.js`) to avoid blocking the main request flow.
