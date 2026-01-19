# MO-Viewer Testing Strategy

**Created:** 2026-01-19
**Status:** Planning
**Purpose:** Define a testing approach to make MO-Viewer portable and production-ready for other organizations.

---

## Executive Summary

MO-Viewer currently has no automated testing. Before the project can be packaged for use by other organizations, a testing suite is needed to:

1. **Validate deployments** - Ensure new installations are configured correctly
2. **Prevent regressions** - Catch breaking changes before they reach users
3. **Document behavior** - Tests serve as living specifications
4. **Build trust** - Other organizations need confidence the software works

This document analyzes testing options for Google Apps Script web applications and recommends a phased implementation approach.

---

## Current State

### Project Characteristics
- **Platform**: Google Apps Script (GAS) web application
- **Architecture**: Server-side GAS + client-side JavaScript in HTML files
- **Dependencies**: Google Sheets, Google Docs, Google Drive, CacheService
- **Pages**: 10+ distinct views (Implementation, SEP, Comms, Contacts, etc.)
- **APIs**: 50+ server-side functions across multiple `.gs` files

### Testing Challenges Specific to GAS

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| No local runtime | Can't run GAS code outside Google | Use in-GAS test harness or extract pure JS |
| Service dependencies | Code relies on SpreadsheetApp, DocumentApp, etc. | Mock services or test against real test data |
| iframe sandboxing | Client code runs in restricted iframe | Limited to manual/E2E testing for UI |
| No native test framework | GAS has no built-in testing tools | Build custom harness or use community tools |
| Deployment coupling | Code must be deployed to test | Use clasp for faster iteration |

---

## Testing Options Analysis

### Option A: In-GAS Test Harness

**Description**: Build a test framework directly within Google Apps Script that runs against real Google services.

**Implementation**:
```
deploy/
├── test-runner.gs       # Test execution framework
├── test-config.gs       # Configuration validation tests
├── test-schema.gs       # Database schema tests
├── test-api.gs          # API function tests
└── test-data.gs         # Test fixtures
```

**Pros**:
- Tests run in actual production environment
- Can verify real Google service integrations
- No external tooling required
- Tests can be run via custom menu in deployed app

**Cons**:
- Slower execution (API calls to Google services)
- Requires test data management
- Limited mocking capabilities
- Tests deployed with production code (can exclude via clasp)

**Best For**: Configuration validation, schema verification, integration testing

---

### Option B: Local Testing with Jest

**Description**: Extract pure JavaScript functions from HTML files and test them locally using Jest.

**Implementation**:
```
tests/
├── local/
│   ├── jest.config.js
│   ├── setup.js
│   └── __tests__/
│       ├── transforms.test.js
│       ├── validation.test.js
│       └── rendering.test.js
scripts/
└── extract-testable.js   # Extracts JS from HTML files
```

**Pros**:
- Fast execution (runs locally)
- Rich assertion library and tooling
- Easy CI/CD integration (GitHub Actions)
- Better developer experience

**Cons**:
- Only tests pure functions (no Google service calls)
- Requires extraction/build step
- Code duplication risk if not managed carefully
- Can't test actual GAS runtime behavior

**Best For**: Data transformations, validation logic, rendering functions

---

### Option C: Mock-Based Testing with gas-local

**Description**: Use the `gas-local` npm package to run GAS code locally with mocked Google services.

**Implementation**:
```
tests/
├── mocks/
│   ├── SpreadsheetApp.js
│   ├── CacheService.js
│   └── DocumentApp.js
└── gas-local/
    ├── api.test.js
    └── handlers.test.js
```

**Pros**:
- Can test server-side logic locally
- Faster than in-GAS testing
- Good for testing error handling paths

**Cons**:
- Mocks may diverge from real Google behavior
- Significant mock maintenance burden
- Complex setup
- `gas-local` has limited community support

**Best For**: Server-side function logic, error handling paths

---

### Option D: End-to-End Testing with Playwright

**Description**: Use browser automation to test the deployed application through the UI.

**Implementation**:
```
tests/
└── e2e/
    ├── playwright.config.ts
    ├── auth.setup.ts        # Handle Google OAuth
    └── specs/
        ├── smoke.spec.ts
        ├── implementation.spec.ts
        └── contacts.spec.ts
```

**Pros**:
- Tests actual user experience
- Catches UI/integration issues
- Framework-agnostic (tests behavior, not implementation)

**Cons**:
- Slow execution
- Flaky (network, timing issues)
- Complex OAuth handling for Google
- Requires deployed environment
- High maintenance burden

**Best For**: Critical user flows, regression testing, smoke tests

---

### Option E: Manual Test Checklist

**Description**: Documented manual testing procedures for critical paths.

**Implementation**:
```
docs/
└── MANUAL_TESTS.md      # Step-by-step test procedures
```

**Pros**:
- No tooling required
- Can test anything
- Good for exploratory testing

**Cons**:
- Time-consuming
- Human error prone
- Doesn't scale
- No automation benefits

**Best For**: Initial validation, edge cases, UX assessment

---

## Comparison Matrix

| Criteria | In-GAS (A) | Jest (B) | gas-local (C) | Playwright (D) | Manual (E) |
|----------|------------|----------|---------------|----------------|------------|
| Setup complexity | Low | Medium | High | High | None |
| Execution speed | Slow | Fast | Medium | Slow | N/A |
| Google service testing | Yes | No | Mocked | Yes | Yes |
| CI/CD integration | Difficult | Easy | Easy | Medium | No |
| Maintenance burden | Low | Medium | High | High | Low |
| Deployment validation | Excellent | Poor | Poor | Good | Good |
| Portability testing | Excellent | Poor | Poor | Good | Good |
| **Recommended priority** | **P0** | **P1** | P3 | P2 | **P0** |

---

## Recommended Approach

### Phase 1: Foundation (Recommended First)

**Goal**: Catch deployment/configuration issues for new organizations

**Components**:
1. **In-GAS Configuration Tests** (Option A)
   - Verify all CONFIG properties exist and are valid
   - Verify required spreadsheet IDs are accessible
   - Verify required document IDs are accessible
   - Run via custom menu: "MO-Viewer > Run Tests"

2. **In-GAS Schema Tests** (Option A)
   - Verify each database spreadsheet has expected columns
   - Verify column names match code expectations
   - Report mismatches with actionable messages

3. **Manual Deployment Checklist** (Option E)
   - Step-by-step new organization setup guide
   - Verification steps after each configuration
   - Troubleshooting guide for common issues

**Deliverables**:
- `deploy/test-runner.gs` - Test framework
- `deploy/test-config.gs` - Configuration tests
- `deploy/test-schema.gs` - Schema validation tests
- `docs/DEPLOYMENT_CHECKLIST.md` - Manual verification steps

**Estimated Effort**: 2-3 days

---

### Phase 2: Logic Testing

**Goal**: Prevent regressions in business logic

**Components**:
1. **Jest Tests for Pure Functions** (Option B)
   - Extract testable functions from HTML files
   - Test data transformations (date formatting, escaping, etc.)
   - Test validation functions
   - Test rendering logic

2. **In-GAS API Tests** (Option A)
   - Test each public API function returns expected shape
   - Test error handling returns appropriate messages
   - Use dedicated test spreadsheet with known data

**Deliverables**:
- `tests/local/` - Jest test suite
- `scripts/extract-testable.js` - Extraction script
- `deploy/test-api.gs` - API contract tests
- GitHub Actions workflow for Jest tests

**Estimated Effort**: 3-5 days

---

### Phase 3: Integration & E2E

**Goal**: Verify complete user flows work correctly

**Components**:
1. **Playwright Smoke Tests** (Option D)
   - Test critical paths: load page, view data, submit form
   - Run against staging deployment
   - OAuth handling via saved auth state

2. **In-GAS Integration Tests** (Option A)
   - Test cross-function workflows
   - Test data flows through the system

**Deliverables**:
- `tests/e2e/` - Playwright test suite
- Staging environment setup documentation
- CI/CD pipeline for E2E tests

**Estimated Effort**: 5-7 days

---

## Proposed Test File Structure

```
nsite-mo-viewer/
├── deploy/
│   ├── Code.gs
│   ├── ... (existing files)
│   ├── test-runner.gs        # Test execution framework
│   ├── test-config.gs        # CONFIG validation tests
│   ├── test-schema.gs        # Spreadsheet schema tests
│   └── test-api.gs           # API contract tests
├── tests/
│   ├── local/
│   │   ├── package.json
│   │   ├── jest.config.js
│   │   └── __tests__/
│   │       ├── escaping.test.js
│   │       ├── dateUtils.test.js
│   │       └── validation.test.js
│   └── e2e/
│       ├── package.json
│       ├── playwright.config.ts
│       └── specs/
│           ├── smoke.spec.ts
│           └── pages/
│               ├── implementation.spec.ts
│               ├── contacts.spec.ts
│               └── comms.spec.ts
├── docs/
│   ├── TESTING_STRATEGY.md   # This document
│   ├── DEPLOYMENT_CHECKLIST.md
│   └── TEST_DATA.md          # Test data management
└── .github/
    └── workflows/
        └── test.yml          # CI/CD pipeline
```

---

## In-GAS Test Framework Design

### Test Runner API

```javascript
// test-runner.gs

/**
 * Run all tests and display results
 * Accessible via: MO-Viewer menu > Run Tests
 */
function runAllTests() {
  var results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Run test suites
  runConfigTests(results);
  runSchemaTests(results);
  runApiTests(results);

  // Display results
  showTestResults(results);
}

/**
 * Test assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + message);
  }
}

/**
 * Test case wrapper
 */
function test(name, fn, results) {
  try {
    fn();
    results.passed++;
    Logger.log('✓ ' + name);
  } catch (e) {
    results.failed++;
    results.errors.push({ test: name, error: e.message });
    Logger.log('✗ ' + name + ': ' + e.message);
  }
}
```

### Example Config Tests

```javascript
// test-config.gs

function runConfigTests(results) {
  var requiredConfigs = [
    'SOLUTIONS_DB_ID',
    'CONTACTS_DB_ID',
    'OUTREACH_DB_ID',
    'ACTIONS_DB_ID',
    'MILESTONES_DB_ID'
  ];

  requiredConfigs.forEach(function(key) {
    test('CONFIG.' + key + ' exists and is accessible', function() {
      var value = getConfigValue(key);
      assert(value, key + ' is not configured');

      // Verify it's a valid spreadsheet ID
      try {
        var ss = SpreadsheetApp.openById(value);
        assert(ss, key + ' is not a valid spreadsheet ID');
      } catch (e) {
        throw new Error(key + ' spreadsheet not accessible: ' + e.message);
      }
    }, results);
  });
}
```

### Example Schema Tests

```javascript
// test-schema.gs

function runSchemaTests(results) {
  var schemas = {
    'SOLUTIONS_DB_ID': ['solution_id', 'name', 'phase', 'cycle', 'solution_lead'],
    'CONTACTS_DB_ID': ['contact_id', 'first_name', 'last_name', 'email', 'agency'],
    'OUTREACH_DB_ID': ['contact_id', 'agency', 'touchpoint_status', 'last_engagement_date']
  };

  Object.keys(schemas).forEach(function(configKey) {
    test(configKey + ' has required columns', function() {
      var ssId = getConfigValue(configKey);
      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheets()[0];
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

      var requiredCols = schemas[configKey];
      var missingCols = requiredCols.filter(function(col) {
        return headers.indexOf(col) === -1;
      });

      assert(missingCols.length === 0,
        'Missing columns: ' + missingCols.join(', '));
    }, results);
  });
}
```

---

## CI/CD Integration

### GitHub Actions Workflow (Phase 2+)

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  local-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd tests/local && npm install

      - name: Run Jest tests
        run: cd tests/local && npm test

  # E2E tests would run on a schedule or manual trigger
  # due to OAuth complexity and execution time
```

---

## Test Data Strategy

### Recommendation: Dedicated Test Spreadsheets

1. **Create test copies** of each database spreadsheet
2. **Populate with known, synthetic data** (not production data)
3. **Use separate CONFIG** for test environment
4. **Reset data** before each test run if needed

### Test Data Principles

- Test data should be deterministic (same input = same output)
- Include edge cases: empty values, special characters, Unicode
- Include boundary conditions: max lengths, date ranges
- Never use real PII in test data

---

## Success Criteria

### Phase 1 Complete When:
- [ ] `runAllTests()` function exists and runs from menu
- [ ] All CONFIG properties validated
- [ ] All database schemas validated
- [ ] Deployment checklist documented
- [ ] New org can deploy and run tests to verify setup

### Phase 2 Complete When:
- [ ] Jest tests cover core utility functions
- [ ] API tests verify all public function contracts
- [ ] Tests run automatically on PR via GitHub Actions
- [ ] Test coverage report generated

### Phase 3 Complete When:
- [ ] E2E tests cover critical user paths
- [ ] Staging environment documented
- [ ] Full CI/CD pipeline operational
- [ ] Test documentation complete

---

## Appendix: Tools & Resources

### Recommended Tools

| Tool | Purpose | Link |
|------|---------|------|
| clasp | GAS CLI for local development | https://github.com/google/clasp |
| Jest | JavaScript testing framework | https://jestjs.io |
| Playwright | E2E browser testing | https://playwright.dev |
| gas-local | Run GAS locally (optional) | https://github.com/nicco88/gas-local |

### References

- [Google Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices)
- [Testing Google Apps Script](https://medium.com/geekculture/testing-google-apps-script-a-complete-guide-to-unit-testing-in-gas-5e2a9e9d9c0e)
- [clasp Documentation](https://github.com/google/clasp/blob/master/docs/README.md)

---

## Next Steps

1. **Approve this strategy** - Review and confirm approach
2. **Create test spreadsheets** - Set up test data environment
3. **Implement Phase 1** - Build in-GAS test harness
4. **Document deployment** - Create setup checklist for new orgs
5. **Iterate** - Add tests as bugs are found and features added

