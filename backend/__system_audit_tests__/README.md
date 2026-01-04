# System Audit Test Suite

## Overview

This directory contains a comprehensive test suite for auditing the Academic Equipment Order System. The tests verify:

- **Authentication & Session Lifecycle**
- **Authorization & Access Control**
- **Core Business Flows**
- **Audit Logging (Critical)**
- **Error Handling & Edge Cases**
- **Data Consistency & Integrity**

## Prerequisites

1. **Server Running**: The backend must be running on `http://localhost:3001`
2. **Database Configured**: PostgreSQL/Supabase must be connected
3. **Test Users**: The following users must exist in the database:
   - `alice` (admin, password: `alice123`)
   - `bob` (staff, password: `bob123`)
   - `charlie` (customer, password: `charlie123`)
4. **SYSTEM User**: A user with `id=0` must exist for system actions

## Running Tests

### Run All Tests
```bash
cd backend/__system_audit_tests__
node run-all.js
```

### Run Specific Suite
```bash
node run-all.js A    # Authentication only
node run-all.js B    # Authorization only
node run-all.js C    # Business Flows only
node run-all.js D    # Audit Logging only
node run-all.js E    # Error Handling only
node run-all.js F    # Data Consistency only
```

### Run Individual Suite Directly
```bash
node A.authentication.test.js
node B.authorization.test.js
node C.business-flows.test.js
node D.audit-logging.test.js
node E.error-handling.test.js
node F.data-consistency.test.js
```

## Test Suites

### Suite A: Authentication & Session Lifecycle (14 tests)
- Login success/failure
- Token generation and validation
- Logout functionality
- Audit logging for auth events

### Suite B: Authorization & Access Control (15 tests)
- Public vs protected routes
- Role-based access (observation)
- Access denial behavior

### Suite C: Core Business Flows (21 tests)
- Product CRUD
- Order workflow (create, approve, reject)
- User management
- Inventory adjustments

### Suite D: Audit Logging (29 tests)
- Log entry creation for all actions
- User ID correctness
- Metadata structure validation
- No null user_ids

### Suite E: Error Handling (22 tests)
- Invalid input handling
- 404 responses
- Duplicate detection
- Server stability

### Suite F: Data Consistency (15 tests)
- Inventory accuracy
- Order integrity
- Referential integrity
- Status consistency

## Output

### Console Output
- Real-time test results with ✅/❌ indicators
- Summary statistics
- List of failed tests

### JSON Report
After running, a detailed report is saved to:
```
__system_audit_tests__/AUDIT_REPORT.json
```

## Cleanup

To remove test data created during testing:
```bash
node cleanup.js
```

Note: This removes test products and users but preserves orders and logs for audit trail.

## Test Data

Tests create temporary data with the prefix `__TEST_AUDIT__`. This allows:
- Easy identification of test data
- Safe cleanup without affecting real data
- Isolation from production data

## Interpreting Results

### Readiness Levels

| Level | Meaning |
|-------|---------|
| **Production-Ready** | All tests pass, no critical issues |
| **MVP** | Minor issues, safe for controlled deployment |
| **MVP with Caveats** | Multiple issues, deployment risky |
| **Prototype** | Significant issues, not deployment-ready |

## Files

| File | Purpose |
|------|---------|
| `config.js` | Test configuration and constants |
| `utils.js` | Helper functions and assertion library |
| `A.authentication.test.js` | Authentication tests |
| `B.authorization.test.js` | Authorization tests |
| `C.business-flows.test.js` | Business flow tests |
| `D.audit-logging.test.js` | Audit logging tests |
| `E.error-handling.test.js` | Error handling tests |
| `F.data-consistency.test.js` | Data consistency tests |
| `run-all.js` | Main test runner |
| `cleanup.js` | Test data cleanup utility |

## Safe Removal

This entire `__system_audit_tests__` directory can be safely deleted after auditing. It:
- Is not imported by any production code
- Does not modify core logic
- Has no side effects when removed
