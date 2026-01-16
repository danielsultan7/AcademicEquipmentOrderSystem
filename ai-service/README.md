# AI Anomaly Detection Service

A Python microservice that analyzes audit log text for anomalies using HuggingFace transformers.

## Architecture

```
┌─────────────────────┐         HTTP POST          ┌─────────────────────┐
│   Node.js Backend   │  ───────────────────────▶  │   Python AI Service │
│                     │                            │                     │
│  - Writes audit log │  POST /analyze-log         │  - Loads model once │
│  - Calls AI service │  {log_id, log_text}        │  - Runs inference   │
│  - Stores result    │                            │  - Returns score    │
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

# 3. Run the service
python app.py
# Or with uvicorn directly:
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

The service will be available at `http://localhost:5000`

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
  "model_name": "distilbert-base-uncased-finetuned-sst-2-english",
  "threshold": 0.7
}
```

### Analyze Single Log
```bash
POST /analyze-log
Content-Type: application/json

{
  "log_id": 123,
  "log_text": "Failed login attempt for username: admin"
}
```
Response:
```json
{
  "log_id": 123,
  "anomaly_score": 0.9234,
  "is_anomaly": true,
  "model_name": "distilbert-base-uncased-finetuned-sst-2-english"
}
```

### Analyze Batch
```bash
POST /analyze-batch
Content-Type: application/json

[
  {"log_id": 1, "log_text": "User logged in successfully"},
  {"log_id": 2, "log_text": "Failed login attempt"},
  {"log_id": 3, "log_text": "Order rejected by manager"}
]
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `ANOMALY_THRESHOLD` | `0.7` | Score threshold for flagging anomalies |

Example:
```bash
ANOMALY_THRESHOLD=0.8 python app.py
```

## How It Works

### Sentiment → Anomaly Mapping

The service uses sentiment analysis as a proxy for anomaly detection:

1. **Input**: Audit log text (e.g., "Failed login attempt for user admin")
2. **Model**: DistilBERT fine-tuned on sentiment data
3. **Output**: Sentiment label (POSITIVE/NEGATIVE) + confidence score

**Mapping Logic**:
```python
if sentiment == "NEGATIVE":
    anomaly_score = confidence  # High confidence negative = high anomaly
else:
    anomaly_score = 1 - confidence  # High confidence positive = low anomaly
```

### Example Mappings

| Log Text | Sentiment | Confidence | Anomaly Score | Is Anomaly |
|----------|-----------|------------|---------------|------------|
| "Failed login attempt" | NEGATIVE | 0.95 | 0.95 | ✅ Yes |
| "User logged in successfully" | POSITIVE | 0.92 | 0.08 | ❌ No |
| "Order rejected" | NEGATIVE | 0.88 | 0.88 | ✅ Yes |
| "Order approved" | POSITIVE | 0.85 | 0.15 | ❌ No |
| "Permission denied" | NEGATIVE | 0.91 | 0.91 | ✅ Yes |

## Model Information

- **Model**: `distilbert-base-uncased-finetuned-sst-2-english`
- **Parameters**: 66 million
- **Size**: ~250MB
- **Inference Time**: 30-100ms per log (CPU)
- **Training Data**: Stanford Sentiment Treebank (SST-2)

## API Documentation

FastAPI provides automatic interactive documentation:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

## Production Deployment

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download model during build
RUN python -c "from transformers import pipeline; pipeline('text-classification', model='distilbert-base-uncased-finetuned-sst-2-english')"

COPY . .
EXPOSE 5000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
```

### Using systemd

```ini
[Unit]
Description=AI Anomaly Detection Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/ai-service
Environment="ANOMALY_THRESHOLD=0.7"
ExecStart=/opt/ai-service/venv/bin/uvicorn app:app --host 0.0.0.0 --port 5000
Restart=always

[Install]
WantedBy=multi-user.target
```

## Integration with Node.js

See `backend/services/anomalyClient.js` for the Node.js client implementation.
