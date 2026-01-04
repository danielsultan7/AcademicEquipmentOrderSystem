# Audit Logger Test Suite

This directory contains tests for validating the Audit Logging system.

## Purpose

These tests ensure that:
1. Every audited action writes exactly ONE log entry
2. No log entry is created with null/undefined user_id
3. System actions use SYSTEM_USER_ID (0)
4. User actions use req.user.id
5. Metadata structure matches the specification
6. Failed login creates a log with SYSTEM_USER_ID and status="failed"
7. No silent failures - errors are detectable

## Running Tests

### Unit Tests (no database required)
```bash
cd backend
node __audit_tests__/auditLogger.test.js
```

### Integration Tests (requires database)
```bash
cd backend
node __audit_tests__/integration.test.js
```

## Important Notes

- These tests are NOT part of production code
- Tests can be safely deleted after validation
- No test logic is mixed with production routes or services
- All test entries are prefixed with `__AUDIT_TEST__` and cleaned up automatically

## After Validation

Once all tests pass, you can safely delete this entire directory:
```bash
rm -rf backend/__audit_tests__
```

The application will continue to work without this test directory.
