# Tests

Test files for MO-Viewer components.

## Test Strategy

Google Apps Script has limited testing support. Tests are implemented as:

1. **Manual Test Functions**: Run from Apps Script editor
2. **Test Data**: Sample documents/sheets for parsing tests
3. **Validation Scripts**: Check output against expected results

## Test Files

| File | Purpose |
|------|---------|
| `parser-tests.gs` | Test document parsers with sample data |
| `api-tests.gs` | Test database API operations |
| `integration-tests.gs` | End-to-end flow tests |

## Running Tests

1. Open Apps Script editor
2. Select test function from dropdown
3. Click Run
4. Check Execution Log for results

## Test Checklist

### Parser Tests
- [ ] Parse tab with standard structure
- [ ] Handle missing provider in solution name
- [ ] Handle multiple bullets per solution
- [ ] Handle nested bullets
- [ ] Handle empty tab
- [ ] Handle malformed content gracefully

### API Tests
- [ ] Create new solution record
- [ ] Update existing solution
- [ ] Query by cycle
- [ ] Query by phase
- [ ] Search by name

### Integration Tests
- [ ] Full sync from source docs
- [ ] Quick Update submission
- [ ] Dashboard data load
- [ ] Report generation

## Development

See [INTEGRATION_PLAN.md](../INTEGRATION_PLAN.md) Phase 8 for testing requirements.
