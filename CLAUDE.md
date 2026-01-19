# Claude Code Instructions for MO-Viewer

## Development Rules

### About Page Maintenance

**RULE: When any page changes functionally, the About page (`deploy/about.html`) must be updated.**

The About page documents:
- Data sources for each page
- How data is stored and transformed
- Update mechanisms and frequency

When modifying any viewer page (Implementation-NSITE, SEP-NSITE, Actions-NSITE, Contacts, Reports, Schedule, Quick Update):
1. Update the corresponding section in `deploy/about.html`
2. If adding a new data source, update the Databases section
3. If changing data flow, update the data flow diagram for that page

### File Deployment

After making changes to files in `deploy/`, provide the user with the full file paths to copy:

```
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\deploy\<filename>
```

This is required because the Google Apps Script project is separate from the git repository.

### Commit Guidelines

- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commit messages
- Use descriptive commit messages summarizing changes
- Push to remote after committing unless user specifies otherwise

## Design System

### Icons
- **Use Material Icons** - NOT Feather icons
- Syntax: `<span class="material-icons">icon_name</span>`
- Icon names use underscores (e.g., `calendar_today`, `chevron_right`)
- Reference: https://fonts.google.com/icons

### CSS Variables
- Colors, spacing, and typography defined in `shared-styles.html`
- Page-specific accent colors (e.g., `--color-comms`, `--color-sep`)

### Components
- Modals use `.modal-overlay` and `.modal-content` classes
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`
- Cards: `.stat-card`, `.content-card`

## Project Structure

- `deploy/` - Files to copy to Google Apps Script Web App
- `scripts/` - Python import/processing scripts
- `database-files/` - Local Excel/CSV database files
- `docs/` - Documentation
- `.claude/` - Claude-specific reference files

## Key Files

| File | Purpose |
|------|---------|
| `deploy/Code.gs` | Main routing, config, PAGES validation |
| `deploy/index.html` | Page routing conditionals |
| `deploy/navigation.html` | Navigation tabs |
| `deploy/about.html` | Platform documentation (KEEP UPDATED) |
| `deploy/access-denied.html` | Shown to unauthorized users |

## Access Control

MO-Viewer uses two-layer access control:

### Layer 1: Google Deployment Settings
- **Execute as**: Me (owner)
- **Who has access**: Anyone within NASA.gov
- Non-NASA accounts see Google's "Unable to open file" error

### Layer 2: MO-DB_Access Whitelist
- Users must be listed in the `MO-DB_Access` spreadsheet
- Unlisted NASA users see `access-denied.html`
- Configured via `ACCESS_SHEET_ID` in MO-DB_Config

### Key Functions (in Code.gs)
- `validateUserAccess(email, sheetId)` - Checks if email is in whitelist
- `getCurrentUser()` - Returns current user's email
- `?page=access-check` - Debug endpoint to test access status

### Managing Access
1. Open MO-DB_Access spreadsheet
2. Add/remove emails in the `access_email` column
3. Changes take effect immediately (no deployment needed)

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/BUG_TRACKER.md` | Known bugs and improvement tracking |
| `docs/TESTING_STRATEGY.md` | Testing approach for portability |
| `docs/SCHEMA_REFINEMENT.md` | Database schema documentation |

## Testing (Planned)

See `docs/TESTING_STRATEGY.md` for the full testing plan.

**Summary**: The project needs a testing suite before it can be packaged for other organizations.

**Recommended Approach**:
1. **Phase 1**: In-GAS configuration and schema validation tests
2. **Phase 2**: Jest tests for pure JavaScript logic + API contract tests
3. **Phase 3**: Playwright E2E tests for critical user flows

**Test Files** (when implemented):
- `deploy/test-runner.gs` - Test execution framework
- `deploy/test-config.gs` - Configuration validation
- `deploy/test-schema.gs` - Database schema validation
- `tests/local/` - Jest tests for extracted JS
- `tests/e2e/` - Playwright browser tests
