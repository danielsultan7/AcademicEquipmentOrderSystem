"""
AI-Powered Anomaly Detection Microservice
==========================================

This FastAPI service analyzes audit log text and returns anomaly classification
using the Qwen2.5-1.5B-Instruct LLM.

The model directly classifies logs as NORMAL or ANOMALOUS based on security rules.
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer

# =============================================================================
# CONFIGURATION
# =============================================================================

MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"

SYSTEM_PROMPT = """You are a security log classifier. Analyze the log entry and respond with exactly one word: NORMAL or ANOMALOUS.

CRITICAL RULE - CHECK FIRST:
- If the log starts with "[nighttime]" AND contains the word "admin" (case-insensitive) anywhere → ANOMALOUS
- This includes: "Admin", "admin", "ADMIN", "administrator"

Other anomaly patterns (mark as ANOMALOUS):
1. SQL injection: SELECT, DROP, DELETE, INSERT, UPDATE, --, ', OR 1=1, UNION
2. XSS attacks: <script>, onerror=, javascript:, <img, onclick=, onload=
3. Authentication failures: "failed login", "invalid password", "authentication rejected", "login failed"
4. Privilege escalation: "unauthorized", "access denied", "permission denied", "role change"
5. Suspicious tools: sqlmap, path traversal (../), burp, nikto

If NONE of the above patterns match, return NORMAL.

Respond with exactly one word: NORMAL or ANOMALOUS"""


def get_time_period(timestamp: Optional[str]) -> str:
    """
    Check if timestamp is during nighttime (00:00-06:00) or daytime.
    Returns: "[nighttime]" or "[daytime]"
    """
    if not timestamp:
        return "[daytime]"  # Default to daytime if no timestamp
    
    try:
        # Parse ISO format timestamp (e.g., "2026-01-26T02:30:00Z")
        from datetime import datetime
        
        # Handle both Z suffix and +00:00 formats
        ts = timestamp.replace("Z", "+00:00")
        dt = datetime.fromisoformat(ts)
        hour = dt.hour
        
        # Nighttime: 00:00 - 05:59 (hour 0-5)
        if 0 <= hour < 6:
            return "[nighttime]"
        else:
            return "[daytime]"
    except Exception:
        return "[daytime]"  # Default to daytime on parse error

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

tokenizer: Optional[AutoTokenizer] = None
model: Optional[AutoModelForCausalLM] = None


# =============================================================================
# PYDANTIC MODELS (Request/Response Schemas)
# =============================================================================

class AnalyzeLogRequest(BaseModel):
    log_id: int = Field(..., description="ID of the audit log entry")
    log_text: str = Field(..., min_length=1, max_length=2000, description="Log text to analyze")
    timestamp: Optional[str] = Field(None, description="Timestamp of the log entry")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "log_id": 123,
                    "log_text": "Failed login attempt for username: admin from IP 192.168.1.100",
                    "timestamp": "2026-01-26T10:30:00Z"
                }
            ]
        }
    }


class AnalyzeLogResponse(BaseModel):
    log_id: int
    anomaly_score: float = Field(..., ge=0.0, le=1.0)
    is_anomaly: bool
    model_name: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str


# =============================================================================
# APPLICATION LIFESPAN (Model Loading)
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global tokenizer, model
    
    logger.info("=" * 60)
    logger.info("STARTING ANOMALY DETECTION SERVICE")
    logger.info("=" * 60)
    
    logger.info(f"Loading model: {MODEL_NAME}")
    logger.info("This may take a minute on first run (downloading weights)...")
    
    start_time = time.time()
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            torch_dtype="auto",
            device_map="auto"
        )
        
        load_time = time.time() - start_time
        logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
        logger.info("Service is ready to accept requests")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Model loading failed: {e}")
    
    yield
    
    logger.info("Shutting down anomaly detection service")
    tokenizer = None
    model = None


# =============================================================================
# INFERENCE FUNCTION
# =============================================================================

def classify_log(log_text: str, timestamp: Optional[str] = None) -> str:
    """
    Classify a log entry using the LLM.
    Returns: "NORMAL" or "ANOMALOUS"
    """
    # Get time period tag (nighttime or daytime)
    time_period = get_time_period(timestamp)
    full_log = f"{time_period} {log_text}"
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": full_log}
    ]
    
    # Apply chat template
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    inputs = tokenizer([text], return_tensors="pt").to(model.device)
    
    # Generate with deterministic settings
    outputs = model.generate(
        **inputs,
        max_new_tokens=10,
        temperature=0.0,
        do_sample=False,
        pad_token_id=tokenizer.eos_token_id
    )
    
    # Extract only the generated tokens
    generated_ids = outputs[0][inputs["input_ids"].shape[1]:]
    response = tokenizer.decode(generated_ids, skip_special_tokens=True)
    
    # Normalize output
    result = response.strip().upper()
    
    # Validate and default to NORMAL if unexpected output
    if result not in ("NORMAL", "ANOMALOUS"):
        logger.warning(f"Unexpected model output: '{response}', defaulting to NORMAL")
        return "NORMAL"
    
    return result


# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

app = FastAPI(
    title="Audit Log Anomaly Detection Service",
    description="AI-powered anomaly detection for audit logs using Qwen LLM.",
    version="2.0.0",
    lifespan=lifespan
)


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        model_name=MODEL_NAME
    )


@app.post("/analyze-log", response_model=AnalyzeLogResponse, tags=["Analysis"])
async def analyze_log(request: AnalyzeLogRequest):
    if model is None or tokenizer is None:
        logger.error("Model not loaded - service not ready")
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Service is starting up."
        )
    
    try:
        start_time = time.time()
        
        classification = classify_log(request.log_text, request.timestamp)
        
        inference_time = (time.time() - start_time) * 1000
        
        is_anomaly = classification == "ANOMALOUS"
        anomaly_score = 1.0 if is_anomaly else 0.0
        
        logger.info(
            f"Log {request.log_id}: {classification} "
            f"(score={anomaly_score}) [{inference_time:.1f}ms]"
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
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    results = []
    for req in requests:
        try:
            classification = classify_log(req.log_text, req.timestamp)
            is_anomaly = classification == "ANOMALOUS"
            
            results.append(AnalyzeLogResponse(
                log_id=req.log_id,
                anomaly_score=1.0 if is_anomaly else 0.0,
                is_anomaly=is_anomaly,
                model_name=MODEL_NAME
            ))
        except Exception as e:
            logger.error(f"Batch analysis failed for log {req.log_id}: {e}")
    
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
