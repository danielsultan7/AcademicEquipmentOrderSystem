/**
 * SYSTEM AUDIT - Main Test Runner
 * 
 * Runs all test suites and generates a comprehensive report.
 * 
 * Usage:
 *   node run-all.js              # Run all tests
 *   node run-all.js --quick      # Skip slow tests
 *   node run-all.js --suite A    # Run specific suite
 */

const { runAuthenticationTests } = require('./A.authentication.test');
const { runAuthorizationTests } = require('./B.authorization.test');
const { runBusinessFlowTests } = require('./C.business-flows.test');
const { runAuditLoggingTests } = require('./D.audit-logging.test');
const { runErrorHandlingTests } = require('./E.error-handling.test');
const { runDataConsistencyTests } = require('./F.data-consistency.test');
const { api } = require('./utils');

// Parse command line arguments
const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const specificSuite = args.find(a => a !== '--quick' && a.length === 1);

async function checkServerHealth() {
  console.log('🔍 Checking server health...\n');
  try {
    const response = await api.get('/health');
    if (response.status === 200 && response.data.status === 'ok') {
      console.log('✅ Server is healthy');
      console.log(`   Database: ${response.data.database}`);
      console.log(`   Timestamp: ${response.data.timestamp}\n`);
      return true;
    } else {
      console.log('❌ Server returned unhealthy status');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Could not connect to server');
    console.log('   Make sure the backend is running on http://localhost:3001');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('═'.repeat(60));
  console.log('         ACADEMIC EQUIPMENT ORDER SYSTEM');
  console.log('              SYSTEM AUDIT REPORT');
  console.log('═'.repeat(60));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Mode: ${quickMode ? 'Quick' : 'Full'}`);
  if (specificSuite) console.log(`Suite: ${specificSuite} only`);
  console.log('═'.repeat(60) + '\n');

  // Check server health first
  const serverOk = await checkServerHealth();
  if (!serverOk) {
    console.log('\n❌ Cannot proceed without healthy server.');
    process.exit(1);
  }

  const results = [];
  const startTime = Date.now();

  // Run test suites
  const suites = [
    { id: 'A', name: 'Authentication', runner: runAuthenticationTests },
    { id: 'B', name: 'Authorization', runner: runAuthorizationTests },
    { id: 'C', name: 'Business Flows', runner: runBusinessFlowTests },
    { id: 'D', name: 'Audit Logging', runner: runAuditLoggingTests },
    { id: 'E', name: 'Error Handling', runner: runErrorHandlingTests },
    { id: 'F', name: 'Data Consistency', runner: runDataConsistencyTests }
  ];

  for (const suite of suites) {
    if (specificSuite && suite.id !== specificSuite.toUpperCase()) {
      continue;
    }

    try {
      const suiteResult = await suite.runner();
      results.push(suiteResult);
    } catch (error) {
      console.error(`\n❌ Suite ${suite.id} crashed: ${error.message}`);
      results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        tests: [{ name: 'Suite execution', status: 'FAILED', error: error.message }]
      });
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Generate summary
  console.log('\n' + '═'.repeat(60));
  console.log('                    FINAL SUMMARY');
  console.log('═'.repeat(60));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  console.log('\n📋 Results by Suite:\n');
  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalSkipped += result.skipped;

    const icon = result.failed === 0 ? '✅' : '❌';
    console.log(`  ${icon} ${result.suite}`);
    console.log(`     Passed: ${result.passed} | Failed: ${result.failed} | Skipped: ${result.skipped}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 Overall Results:`);
  console.log(`   ✅ Passed:  ${totalPassed}`);
  console.log(`   ❌ Failed:  ${totalFailed}`);
  console.log(`   ⏭️  Skipped: ${totalSkipped}`);
  console.log(`   📝 Total:   ${totalPassed + totalFailed + totalSkipped}`);
  console.log(`   ⏱️  Time:    ${totalTime}s`);

  // List failed tests
  if (totalFailed > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('\n❌ FAILED TESTS:\n');
    for (const result of results) {
      const failedTests = result.tests.filter(t => t.status === 'FAILED');
      for (const test of failedTests) {
        console.log(`  • [${result.suite}] ${test.name}`);
        console.log(`    Error: ${test.error}`);
      }
    }
  }

  // Generate report file
  await generateReport(results, totalTime);

  console.log('\n' + '═'.repeat(60));
  if (totalFailed === 0) {
    console.log('           ✅ ALL TESTS PASSED - SYSTEM VERIFIED');
  } else {
    console.log(`           ❌ ${totalFailed} TEST(S) FAILED - REVIEW REQUIRED`);
  }
  console.log('═'.repeat(60) + '\n');

  return { passed: totalPassed, failed: totalFailed, skipped: totalSkipped };
}

async function generateReport(results, totalTime) {
  const report = {
    title: 'Academic Equipment Order System - System Audit Report',
    timestamp: new Date().toISOString(),
    executionTime: `${totalTime}s`,
    summary: {
      totalTests: results.reduce((sum, r) => sum + r.tests.length, 0),
      passed: results.reduce((sum, r) => sum + r.passed, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      skipped: results.reduce((sum, r) => sum + r.skipped, 0)
    },
    suites: results,
    assessment: generateAssessment(results)
  };

  // Write JSON report
  const fs = require('fs');
  const reportPath = __dirname + '/AUDIT_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

function generateAssessment(results) {
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const criticalSuites = ['Audit Logging', 'Authentication'];
  
  const criticalFailed = results
    .filter(r => criticalSuites.includes(r.suite))
    .some(r => r.failed > 0);

  // Gather findings
  const findings = {
    securityConcerns: [],
    missingValidations: [],
    brokenFeatures: [],
    recommendations: []
  };

  // Check specific issues from test results
  for (const result of results) {
    for (const test of result.tests) {
      if (test.status === 'FAILED') {
        if (test.name.includes('auth') || test.name.includes('token')) {
          findings.securityConcerns.push(test.name);
        }
        if (test.name.includes('log') || test.name.includes('audit')) {
          findings.brokenFeatures.push(`Audit: ${test.name}`);
        }
      }
    }
  }

  // Determine readiness level
  let readinessLevel;
  let readinessNotes = [];

  if (totalFailed === 0) {
    if (criticalFailed) {
      readinessLevel = 'MVP';
      readinessNotes.push('All tests pass but review critical suite warnings');
    } else {
      readinessLevel = 'Production-Ready';
      readinessNotes.push('All core functionality verified');
      readinessNotes.push('Audit logging complete and accurate');
      readinessNotes.push('Authentication/Authorization working');
    }
  } else if (totalFailed < 5) {
    readinessLevel = 'MVP';
    readinessNotes.push('Minor issues to address before production');
    readinessNotes.push(`${totalFailed} test(s) require fixes`);
  } else if (totalFailed < 15) {
    readinessLevel = 'MVP with Caveats';
    readinessNotes.push('Multiple issues require attention');
    readinessNotes.push('Not recommended for production without fixes');
  } else {
    readinessLevel = 'Prototype';
    readinessNotes.push('Significant issues detected');
    readinessNotes.push('Requires substantial fixes before deployment');
  }

  // Add standard recommendations
  findings.recommendations.push('Review all failed tests and fix issues');
  findings.recommendations.push('Ensure SYSTEM user (id=0) exists for unauthenticated logging');
  findings.recommendations.push('Consider adding rate limiting for login attempts');
  findings.recommendations.push('Implement bcrypt for password hashing (currently plaintext)');
  findings.recommendations.push('Add role-based restrictions to admin operations');

  return {
    readinessLevel,
    readinessNotes,
    findings
  };
}

// Run tests
runAllTests()
  .then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
  });
