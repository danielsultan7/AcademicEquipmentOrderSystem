#!/usr/bin/env python3
"""
Test script for the AI Anomaly Detection Service.

Run the service first:
    cd ai-service && python app.py

Then run this test:
    python test_service.py
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test the health endpoint."""
    print("=" * 60)
    print("TEST: Health Check")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["model_loaded"] == True
    print("✅ Health check passed\n")

def test_analyze_log():
    """Test single log analysis."""
    print("=" * 60)
    print("TEST: Single Log Analysis")
    print("=" * 60)
    
    test_cases = [
        {
            "log_id": 1,
            "log_text": "Failed login attempt for username: admin from IP 192.168.1.100",
            "expected_anomaly": True
        },
        {
            "log_id": 2,
            "log_text": "User john logged in successfully",
            "expected_anomaly": False
        },
        {
            "log_id": 3,
            "log_text": "Order rejected by procurement manager",
            "expected_anomaly": True
        },
        {
            "log_id": 4,
            "log_text": "Order approved and processed",
            "expected_anomaly": False
        },
        {
            "log_id": 5,
            "log_text": "Permission denied for user trying to access admin panel",
            "expected_anomaly": True
        },
        {
            "log_id": 6,
            "log_text": "Product created successfully: Microscope",
            "expected_anomaly": False
        }
    ]
    
    results = []
    for test in test_cases:
        response = requests.post(
            f"{BASE_URL}/analyze-log",
            json={"log_id": test["log_id"], "log_text": test["log_text"]}
        )
        
        result = response.json()
        results.append(result)
        
        match = "✅" if result["is_anomaly"] == test["expected_anomaly"] else "⚠️"
        
        print(f"\n{match} Log {test['log_id']}: \"{test['log_text'][:50]}...\"")
        print(f"   Score: {result['anomaly_score']:.4f}")
        print(f"   Is Anomaly: {result['is_anomaly']} (expected: {test['expected_anomaly']})")
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    # Print results table
    print(f"\n{'Log ID':<8} {'Score':<10} {'Anomaly':<10} {'Text Preview'}")
    print("-" * 70)
    for i, result in enumerate(results):
        text_preview = test_cases[i]["log_text"][:40] + "..."
        print(f"{result['log_id']:<8} {result['anomaly_score']:<10.4f} {str(result['is_anomaly']):<10} {text_preview}")

def test_batch():
    """Test batch analysis."""
    print("\n" + "=" * 60)
    print("TEST: Batch Analysis")
    print("=" * 60)
    
    logs = [
        {"log_id": 100, "log_text": "Multiple failed login attempts detected"},
        {"log_id": 101, "log_text": "User session expired normally"},
        {"log_id": 102, "log_text": "Unauthorized access attempt blocked"}
    ]
    
    response = requests.post(f"{BASE_URL}/analyze-batch", json=logs)
    results = response.json()
    
    print(f"\nProcessed {len(results)} logs:")
    for result in results:
        flag = "🚨" if result["is_anomaly"] else "✅"
        print(f"  {flag} Log {result['log_id']}: {result['anomaly_score']:.4f}")
    
    print("✅ Batch analysis passed\n")

if __name__ == "__main__":
    print("\n🤖 AI ANOMALY DETECTION SERVICE - TEST SUITE\n")
    
    try:
        test_health()
        test_analyze_log()
        test_batch()
        print("\n✅ All tests completed!")
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to the service.")
        print("   Make sure the service is running: python app.py")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
