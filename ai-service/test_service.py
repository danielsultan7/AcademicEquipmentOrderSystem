#!/usr/bin/env python3
"""
Test script for the AI Anomaly Detection Service (Qwen LLM version).

Run the service first:
    cd ai-service && python app.py

Then run this test:
    python test_service.py

Test Categories:
================
1. SQL Injection attacks
2. XSS (Cross-Site Scripting) attempts
3. Authentication failures / failed logins
4. Admin activity during overnight hours (00:00-06:00)
5. Privilege escalation attempts
6. Suspicious/malformed input
7. Normal operations (should NOT be flagged)
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://localhost:5000"

# Disable SSL warnings for self-signed certificate
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def test_health():
    """Test the health endpoint."""
    print("=" * 70)
    print("TEST: Health Check")
    print("=" * 70)
    
    response = requests.get(f"{BASE_URL}/health", verify=False)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["model_loaded"] == True
    assert "Qwen" in response.json()["model_name"]
    print("✅ Health check passed\n")


def test_anomaly_detection():
    """Test anomaly detection with various cases."""
    print("=" * 70)
    print("TEST: Anomaly Detection Cases")
    print("=" * 70)
    
    test_cases = [
        # =================================================================
        # CATEGORY 1: SQL Injection Attacks (should be ANOMALOUS)
        # =================================================================
        {
            "log_id": 1,
            "log_text": "User input received: SELECT * FROM users WHERE id=1; DROP TABLE users;--",
            "timestamp": "2026-01-26T14:30:00Z",
            "expected_anomaly": True,
            "category": "SQL Injection"
        },
        {
            "log_id": 2,
            "log_text": "Search query: ' OR '1'='1' --",
            "timestamp": "2026-01-26T10:15:00Z",
            "expected_anomaly": True,
            "category": "SQL Injection"
        },
        {
            "log_id": 3,
            "log_text": "Login attempt with username: admin'--",
            "timestamp": "2026-01-26T09:00:00Z",
            "expected_anomaly": True,
            "category": "SQL Injection"
        },
        
        # =================================================================
        # CATEGORY 2: XSS Attacks (should be ANOMALOUS)
        # =================================================================
        {
            "log_id": 4,
            "log_text": "Comment submitted: <script>alert('XSS')</script>",
            "timestamp": "2026-01-26T11:20:00Z",
            "expected_anomaly": True,
            "category": "XSS Attack"
        },
        {
            "log_id": 5,
            "log_text": "User profile update with bio: <img src=x onerror=alert('hacked')>",
            "timestamp": "2026-01-26T16:45:00Z",
            "expected_anomaly": True,
            "category": "XSS Attack"
        },
        
        # =================================================================
        # CATEGORY 3: Authentication Failures (should be ANOMALOUS)
        # =================================================================
        {
            "log_id": 6,
            "log_text": "Failed login attempt for username: admin from IP 192.168.1.100",
            "timestamp": "2026-01-26T08:30:00Z",
            "expected_anomaly": True,
            "category": "Auth Failure"
        },
        {
            "log_id": 7,
            "log_text": "Multiple failed login attempts detected: 15 failures in 5 minutes for user john",
            "timestamp": "2026-01-26T12:00:00Z",
            "expected_anomaly": True,
            "category": "Auth Failure"
        },
        {
            "log_id": 8,
            "log_text": "Authentication rejected: Invalid password for user procurement_manager",
            "timestamp": "2026-01-26T09:15:00Z",
            "expected_anomaly": True,
            "category": "Auth Failure"
        },
        
        # =================================================================
        # CATEGORY 4: Admin Overnight Activity (should be ANOMALOUS)
        # =================================================================
        {
            "log_id": 9,
            "log_text": "Admin user performed: DELETE FROM orders WHERE status='pending'",
            "timestamp": "2026-01-26T02:30:00Z",  # 2:30 AM - overnight!
            "expected_anomaly": True,
            "category": "Admin Overnight"
        },
        {
            "log_id": 10,
            "log_text": "Admin modified system settings: max_login_attempts changed to 999",
            "timestamp": "2026-01-26T03:45:00Z",  # 3:45 AM - overnight!
            "expected_anomaly": True,
            "category": "Admin Overnight"
        },
        {
            "log_id": 11,
            "log_text": "Admin created new user with role: super_admin",
            "timestamp": "2026-01-26T05:00:00Z",  # 5:00 AM - overnight!
            "expected_anomaly": True,
            "category": "Admin Overnight"
        },
        {
            "log_id": 12,
            "log_text": "Admin exported all user data to CSV",
            "timestamp": "2026-01-26T00:15:00Z",  # 12:15 AM - overnight!
            "expected_anomaly": True,
            "category": "Admin Overnight"
        },
        
        # =================================================================
        # CATEGORY 5: Privilege Escalation (should be ANOMALOUS)
        # =================================================================
        {
            "log_id": 13,
            "log_text": "User attempted to access admin panel without authorization",
            "timestamp": "2026-01-26T14:00:00Z",
            "expected_anomaly": True,
            "category": "Privilege Escalation"
        },
        {
            "log_id": 14,
            "log_text": "Role change request: user 'student' attempting to change role to 'admin'",
            "timestamp": "2026-01-26T10:30:00Z",
            "expected_anomaly": True,
            "category": "Privilege Escalation"
        },
        {
            "log_id": 15,
            "log_text": "Unauthorized access attempt to /api/admin/users endpoint",
            "timestamp": "2026-01-26T15:20:00Z",
            "expected_anomaly": True,
            "category": "Privilege Escalation"
        },
        
        # =================================================================
        # CATEGORY 6: Suspicious/Malformed Input (should be ANOMALOUS)
        # =================================================================
        {
            "log_id": 16,
            "log_text": "Received malformed JSON payload: {{{invalid}}}",
            "timestamp": "2026-01-26T11:00:00Z",
            "expected_anomaly": True,
            "category": "Malformed Input"
        },
        {
            "log_id": 17,
            "log_text": "Request with suspicious user-agent: sqlmap/1.4.7",
            "timestamp": "2026-01-26T13:30:00Z",
            "expected_anomaly": True,
            "category": "Suspicious Input"
        },
        {
            "log_id": 18,
            "log_text": "Path traversal attempt detected: ../../etc/passwd",
            "timestamp": "2026-01-26T16:00:00Z",
            "expected_anomaly": True,
            "category": "Suspicious Input"
        },
        
        # =================================================================
        # CATEGORY 7: Normal Operations (should be NORMAL)
        # =================================================================
        {
            "log_id": 19,
            "log_text": "User john logged in successfully",
            "timestamp": "2026-01-26T09:00:00Z",
            "expected_anomaly": False,
            "category": "Normal - Login"
        },
        {
            "log_id": 20,
            "log_text": "Order #12345 created by user procurement_staff",
            "timestamp": "2026-01-26T10:30:00Z",
            "expected_anomaly": False,
            "category": "Normal - Order"
        },
        {
            "log_id": 21,
            "log_text": "Product 'Microscope XL-500' added to catalog by admin",
            "timestamp": "2026-01-26T14:00:00Z",  # Normal business hours
            "expected_anomaly": False,
            "category": "Normal - Admin (daytime)"
        },
        {
            "log_id": 22,
            "log_text": "User viewed order history for their account",
            "timestamp": "2026-01-26T11:15:00Z",
            "expected_anomaly": False,
            "category": "Normal - View"
        },
        {
            "log_id": 23,
            "log_text": "Order #12346 approved by procurement_manager",
            "timestamp": "2026-01-26T15:30:00Z",
            "expected_anomaly": False,
            "category": "Normal - Approval"
        },
        {
            "log_id": 24,
            "log_text": "User logged out successfully",
            "timestamp": "2026-01-26T17:00:00Z",
            "expected_anomaly": False,
            "category": "Normal - Logout"
        },
        {
            "log_id": 25,
            "log_text": "Password changed successfully for user jane",
            "timestamp": "2026-01-26T13:45:00Z",
            "expected_anomaly": False,
            "category": "Normal - Password Change"
        },
    ]
    
    results = []
    passed = 0
    failed = 0
    
    for test in test_cases:
        response = requests.post(
            f"{BASE_URL}/analyze-log",
            json={
                "log_id": test["log_id"],
                "log_text": test["log_text"],
                "timestamp": test["timestamp"]
            },
            verify=False
        )
        
        result = response.json()
        results.append(result)
        
        is_correct = result["is_anomaly"] == test["expected_anomaly"]
        if is_correct:
            passed += 1
            status = "✅"
        else:
            failed += 1
            status = "❌"
        
        expected_label = "ANOMALOUS" if test["expected_anomaly"] else "NORMAL"
        actual_label = "ANOMALOUS" if result["is_anomaly"] else "NORMAL"
        
        print(f"\n{status} Test {test['log_id']}: [{test['category']}]")
        print(f"   Log: \"{test['log_text'][:60]}...\"")
        print(f"   Timestamp: {test['timestamp']}")
        print(f"   Expected: {expected_label}, Got: {actual_label}")
    
    # Print summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"\nTotal tests: {len(test_cases)}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Accuracy: {(passed/len(test_cases))*100:.1f}%")
    
    # Print results by category
    print("\n" + "-" * 70)
    print("Results by Category:")
    print("-" * 70)
    
    categories = {}
    for i, test in enumerate(test_cases):
        cat = test["category"].split(" - ")[0] if " - " in test["category"] else test["category"]
        if cat not in categories:
            categories[cat] = {"passed": 0, "total": 0}
        categories[cat]["total"] += 1
        if results[i]["is_anomaly"] == test["expected_anomaly"]:
            categories[cat]["passed"] += 1
    
    for cat, stats in categories.items():
        pct = (stats["passed"]/stats["total"])*100
        print(f"  {cat}: {stats['passed']}/{stats['total']} ({pct:.0f}%)")
    
    return passed, failed


def test_batch():
    """Test batch analysis."""
    print("\n" + "=" * 70)
    print("TEST: Batch Analysis")
    print("=" * 70)
    
    batch = [
        {"log_id": 100, "log_text": "User login successful", "timestamp": "2026-01-26T10:00:00Z"},
        {"log_id": 101, "log_text": "SQL injection attempt: ' OR 1=1 --", "timestamp": "2026-01-26T10:01:00Z"},
        {"log_id": 102, "log_text": "Admin deleted user at 3AM", "timestamp": "2026-01-26T03:00:00Z"},
    ]
    
    response = requests.post(
        f"{BASE_URL}/analyze-batch",
        json=batch,
        verify=False
    )
    
    results = response.json()
    print(f"\nBatch of {len(batch)} logs processed:")
    
    for i, result in enumerate(results):
        label = "ANOMALOUS" if result["is_anomaly"] else "NORMAL"
        print(f"  Log {result['log_id']}: {label} (score: {result['anomaly_score']})")
    
    print("✅ Batch analysis completed\n")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("ANOMALY DETECTION SERVICE TEST SUITE")
    print("Model: Qwen/Qwen2.5-1.5B-Instruct")
    print("=" * 70 + "\n")
    
    try:
        # Run tests
        test_health()
        passed, failed = test_anomaly_detection()
        test_batch()
        
        # Final result
        print("=" * 70)
        print("ALL TESTS COMPLETED")
        print("=" * 70)
        
        if failed == 0:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {failed} test(s) did not match expected results.")
            print("   Review the cases above to tune the system prompt if needed.")
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to the service.")
        print("   Make sure the service is running: python app.py")
    except Exception as e:
        print(f"❌ ERROR: {e}")
