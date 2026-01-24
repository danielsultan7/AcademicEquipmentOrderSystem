"""
AI-Powered Anomaly Detection Microservice
==========================================

This FastAPI service analyzes audit log text and returns anomaly scores
using a pre-trained HuggingFace transformer model.

Design Decisions:
-----------------
1. SENTIMENT AS ANOMALY PROXY: We use sentiment analysis because:
   - Failed operations often have negative language ("failed", "rejected", "denied")
   - Successful operations have neutral/positive language ("completed", "approved")
   - No training required - uses pre-trained model

2. MODEL LOADING: Model is loaded ONCE at startup via @asynccontextmanager lifespan
   - Avoids 2-3 second delay per request
   - Model stays in memory for fast inference (~50ms per request)

3. NON-BLOCKING: Uses async FastAPI with synchronous model inference
   - FastAPI handles concurrent requests efficiently
   - Model inference is CPU-bound but fast enough for background processing

4. SEPARATION OF CONCERNS:
   - This service ONLY does anomaly scoring
   - Storage is handled by the Node.js backend
   - No database connections here

Academic Reference:
------------------
Model: distilbert-base-uncased-finetuned-sst-2-english
- DistilBERT: 66M parameters (40% smaller than BERT, 60% faster)
- Fine-tuned on Stanford Sentiment Treebank (SST-2)
- Paper: Sanh et al., "DistilBERT, a distilled version of BERT" (2019)
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import pipeline, Pipeline

# =============================================================================
# CONFIGURATION
# =============================================================================

# Model configuration
MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"

# Anomaly threshold - scores above this are flagged as anomalies
# Configurable via environment variable
ANOMALY_THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "0.7"))

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# =============================================================================
# GLOBAL MODEL REFERENCE
# =============================================================================

# The model is stored here after loading at startup
# This avoids reloading the model on every request
classifier: Optional[Pipeline] = None


# =============================================================================
# PYDANTIC MODELS (Request/Response Schemas)
# =============================================================================

class AnalyzeLogRequest(BaseModel):
    """
    Input schema for log analysis.
    
    Attributes:
        log_id: Unique identifier of the audit log entry
        log_text: The text content to analyze (e.g., "Failed login attempt for user admin")
    """
    log_id: int = Field(..., description="ID of the audit log entry")
    log_text: str = Field(..., min_length=1, max_length=2000, description="Log text to analyze")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "log_id": 123,
                    "log_text": "Failed login attempt for username: admin from IP 192.168.1.100"
                }
            ]
        }
    }


class AnalyzeLogResponse(BaseModel):
    """
    Output schema for anomaly analysis.
    
    Attributes:
        log_id: Echo of the input log ID (for correlation)
        anomaly_score: Float 0-1, higher = more anomalous
        is_anomaly: Boolean flag based on threshold
        model_name: Name of the model used for transparency
    """
    log_id: int
    anomaly_score: float = Field(..., ge=0.0, le=1.0)
    is_anomaly: bool
    model_name: str


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str
    model_loaded: bool
    model_name: str
    threshold: float


# =============================================================================
# APPLICATION LIFESPAN (Model Loading)
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI.
    
    This runs ONCE when the server starts:
    - Loads the HuggingFace model into memory
    - Model stays loaded for the entire server lifetime
    
    Benefits:
    - Model loading (2-3 seconds) happens only at startup
    - All requests share the same model instance
    - Memory efficient - single model copy
    """
    global classifier
    
    logger.info("=" * 60)
    logger.info("STARTING ANOMALY DETECTION SERVICE")
    logger.info("=" * 60)
    
    # Load the model
    logger.info(f"Loading model: {MODEL_NAME}")
    logger.info("This may take a few seconds on first run (downloading weights)...")
    
    start_time = time.time()
    
    try:
        # Create the sentiment analysis pipeline
        # device=-1 forces CPU usage (no GPU required)
        classifier = pipeline(
            task="text-classification",
            model=MODEL_NAME,
            device=-1  # CPU only
        )
        
        load_time = time.time() - start_time
        logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
        logger.info(f"Anomaly threshold: {ANOMALY_THRESHOLD}")
        logger.info("Service is ready to accept requests")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Model loading failed: {e}")
    
    # Yield control to the application
    yield
    
    # Cleanup on shutdown (if needed)
    logger.info("Shutting down anomaly detection service")
    classifier = None


# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

app = FastAPI(
    title="Audit Log Anomaly Detection Service",
    description="""
    AI-powered anomaly detection for audit logs.
    
    This service uses a pre-trained transformer model to analyze audit log text
    and determine if it represents anomalous behavior.
    
    ## How it works
    
    1. Receives audit log text via POST request
    2. Runs sentiment analysis using DistilBERT
    3. Maps sentiment to anomaly score:
       - NEGATIVE sentiment → higher anomaly score (suspicious)
       - POSITIVE sentiment → lower anomaly score (normal)
    4. Returns structured anomaly assessment
    
    ## Use Cases
    
    - Failed login attempts → likely flagged as anomaly
    - Successful operations → likely flagged as normal
    - Rejected/denied actions → likely flagged as anomaly
    """,
    version="1.0.0",
    lifespan=lifespan
)


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint.
    
    Use this to verify:
    - Service is running
    - Model is loaded
    - Current configuration
    
    Called by Node.js backend before sending analysis requests.
    """
    return HealthResponse(
        status="healthy" if classifier is not None else "unhealthy",
        model_loaded=classifier is not None,
        model_name=MODEL_NAME,
        threshold=ANOMALY_THRESHOLD
    )


@app.post("/analyze-log", response_model=AnalyzeLogResponse, tags=["Analysis"])
async def analyze_log(request: AnalyzeLogRequest):
    """
    Analyze a single audit log for anomalies.
    
    ## Algorithm
    
    1. Run sentiment classification on log_text
    2. Get prediction: {label: "POSITIVE"|"NEGATIVE", score: 0-1}
    3. Convert to anomaly score:
       - If NEGATIVE: anomaly_score = score (high confidence negative = high anomaly)
       - If POSITIVE: anomaly_score = 1 - score (high confidence positive = low anomaly)
    4. Compare against threshold to determine is_anomaly
    
    ## Example Mappings
    
    | Log Text | Sentiment | Confidence | Anomaly Score |
    |----------|-----------|------------|---------------|
    | "Failed login attempt" | NEGATIVE | 0.95 | 0.95 |
    | "User logged in successfully" | POSITIVE | 0.92 | 0.08 |
    | "Order rejected by manager" | NEGATIVE | 0.88 | 0.88 |
    | "Order approved" | POSITIVE | 0.85 | 0.15 |
    
    ## Response Time
    
    Typical inference time: 30-100ms on CPU
    """
    # Validate model is loaded
    if classifier is None:
        logger.error("Model not loaded - service not ready")
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Service is starting up."
        )
    
    try:
        # Run inference
        # The model returns: [{"label": "POSITIVE"|"NEGATIVE", "score": float}]
        start_time = time.time()
        result = classifier(request.log_text, truncation=True, max_length=512)
        inference_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # Extract prediction
        prediction = result[0]
        label = prediction["label"]
        score = prediction["score"]
        
        # Map sentiment to anomaly score
        # NEGATIVE sentiment indicates potentially anomalous behavior
        if label == "NEGATIVE":
            anomaly_score = score
        else:  # POSITIVE
            anomaly_score = 1.0 - score
        
        # Round to 4 decimal places for cleaner output
        anomaly_score = round(anomaly_score, 4)
        
        # Determine if this is an anomaly based on threshold
        is_anomaly = anomaly_score >= ANOMALY_THRESHOLD
        
        # Log for debugging/monitoring
        logger.info(
            f"Log {request.log_id}: "
            f"sentiment={label}({score:.3f}) → "
            f"anomaly_score={anomaly_score} "
            f"[{'ANOMALY' if is_anomaly else 'NORMAL'}] "
            f"({inference_time:.1f}ms)"
        )
        
        return AnalyzeLogResponse(
            log_id=request.log_id,
            anomaly_score=anomaly_score,
            is_anomaly=is_anomaly,
            model_name=MODEL_NAME
        )
        
    except Exception as e:
        logger.error(f"Analysis failed for log {request.log_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/analyze-batch", tags=["Analysis"])
async def analyze_batch(requests: list[AnalyzeLogRequest]):
    """
    Analyze multiple logs in a single request.
    
    More efficient than multiple single requests when processing
    a backlog of logs.
    
    Returns a list of AnalyzeLogResponse objects.
    """
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    results = []
    for req in requests:
        try:
            # Reuse the single analysis logic
            prediction = classifier(req.log_text, truncation=True, max_length=512)[0]
            label = prediction["label"]
            score = prediction["score"]
            
            anomaly_score = score if label == "NEGATIVE" else 1.0 - score
            anomaly_score = round(anomaly_score, 4)
            
            results.append(AnalyzeLogResponse(
                log_id=req.log_id,
                anomaly_score=anomaly_score,
                is_anomaly=anomaly_score >= ANOMALY_THRESHOLD,
                model_name=MODEL_NAME
            ))
        except Exception as e:
            logger.error(f"Batch analysis failed for log {req.log_id}: {e}")
            # Continue processing other logs
    
    logger.info(f"Batch analysis complete: {len(results)}/{len(requests)} successful")
    return results


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    import os
    
    # ==========================================================================
    # HTTPS Configuration for Local Development
    # ==========================================================================
    # This service runs ONLY over HTTPS using a self-signed certificate.
    # Generate certificates by running: cd certs && ./generate-certs.sh
    # ==========================================================================
    
    # SSL certificate paths (relative to project root)
    SSL_KEY_PATH = os.getenv("SSL_KEY_PATH", "../certs/server.key")
    SSL_CERT_PATH = os.getenv("SSL_CERT_PATH", "../certs/server.crt")
    
    # Verify certificate files exist
    if not os.path.exists(SSL_KEY_PATH) or not os.path.exists(SSL_CERT_PATH):
        logger.error("❌ SSL certificate files not found!")
        logger.error("   Please generate certificates first:")
        logger.error("   cd certs && chmod +x generate-certs.sh && ./generate-certs.sh")
        exit(1)
    
    logger.info("🔒 Starting HTTPS server with self-signed certificate (development mode)")
    
    # Run the HTTPS server
    # In production, use: uvicorn app:app --host 0.0.0.0 --port 5000 --ssl-keyfile=... --ssl-certfile=...
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5000,
        log_level="info",
        ssl_keyfile=SSL_KEY_PATH,
        ssl_certfile=SSL_CERT_PATH
    )
