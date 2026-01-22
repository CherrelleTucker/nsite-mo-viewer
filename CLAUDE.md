# Claude Code Instructions for MO-Viewer

## Development Rules

### About Page Maintenance

**RULE: When any page changes functionally, the About page (`deploy/about.html`) must be updated.**

The About page documents:
- Data sources for each page
- How data is stored and transformed
- Update mechanisms and frequency

When modifying any viewer page (Implementation-NSITE, SEP-NSITE, Actions-NSITE, Comms-NSITE, Team-NSITE, Contacts, Reports, Schedule, Quick Update):
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
- **NEVER push to GitHub until user confirms the fix/feature is working**
- Wait for explicit "push" instruction from user

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

- `deploy/` - Files to copy to Google Apps Script Web App (NSITE-MO-Viewer project)
- `library/` - Source files for MO-APIs Library (separate Apps Script project)
- `scripts/` - Python import/processing scripts
- `database-files/` - Local Excel/CSV database files
- `docs/` - Documentation
- `.claude/` - Claude-specific reference files

## MO-APIs Library Architecture

The project uses a **thin wrapper pattern**:

1. **library/*.gs** - Full implementations in a standalone Apps Script Library (identifier: `MoApi`)
2. **deploy/*-api.gs** - Thin wrappers that delegate to the library: `function X() { return MoApi.X(); }`

When updating API functions:
1. Update the implementation in `library/*.gs`
2. Copy to MO-APIs Library project in Apps Script
3. If adding new functions, add thin wrapper to `deploy/*-api.gs`
4. Copy to NSITE-MO-Viewer project in Apps Script

**Library files:**
- config-helpers.gs, solutions-api.gs, contacts-api.gs, agencies-api.gs
- updates-api.gs, engagements-api.gs, team-api.gs, actions-api.gs
- milestones-api.gs, outreach-api.gs, stories-api.gs

## Key Files

| File | Purpose |
|------|---------|
| `deploy/Code.gs` | Main routing, config, session management, access control |
| `deploy/index.html` | Page routing conditionals, SPA navigation |
| `deploy/navigation.html` | Navigation tabs |
| `deploy/about.html` | Platform documentation (KEEP UPDATED) |
| `deploy/auth-landing.html` | Sign-in page (email + passphrase form) |
| `deploy/access-denied.html` | Shown to unauthorized users, includes Request Access |

## Access Control

MO-Viewer uses **passphrase + whitelist authentication** to support mixed account types (NASA.gov and personal Google accounts).

### How It Works

1. User visits MO-Viewer → sees sign-in page
2. User enters email + team passphrase
3. Server verifies passphrase matches `SITE_PASSPHRASE` in config
4. Server checks if email is in `MO-DB_Access` whitelist
5. If both pass → creates session token (6-hour expiry) → redirects to app
6. Session token is passed in URL and verified on each page load

### Configuration Required (MO-DB_Config)

| Key | Purpose |
|-----|---------|
| `SITE_PASSPHRASE` | Shared team passphrase (case-sensitive) |
| `ACCESS_SHEET_ID` | ID of MO-DB_Access spreadsheet |
| `ADMIN_EMAIL` | Email for access request notifications |

### Deployment Settings

- **Execute as**: Me (script owner)
- **Who has access**: Anyone with Google account

### Key Functions (in Code.gs)

| Function | Purpose |
|----------|---------|
| `verifyPassphraseAccess(email, passphrase)` | Main auth function - verifies passphrase and whitelist |
| `createSessionToken(email)` | Creates UUID token, stores in ScriptCache (6hr) |
| `verifySessionToken(token)` | Validates token and re-checks whitelist |
| `validateUserAccess(email, sheetId)` | Checks if email exists in whitelist |
| `submitAccessRequest(email, reason)` | Logs access request (attempts email if MailApp available) |

### Managing Access

**Adding users:**
1. Open MO-DB_Access spreadsheet
2. Add email to `access_email` column
3. Share the passphrase with the user (via Slack, email, etc.)
4. Changes take effect immediately

**Changing passphrase:**
1. Update `SITE_PASSPHRASE` in MO-DB_Config
2. Notify team of new passphrase
3. Existing sessions continue working until they expire (6 hours)

### Why This Approach?

**Approaches that DON'T work with Google Apps Script:**

| Approach | Why It Fails |
|----------|--------------|
| `Session.getActiveUser()` | Returns empty for external users when deployed as "Execute as: Me" |
| `Session.getEffectiveUser()` | Returns script owner's email, not visitor's |
| `ScriptApp.getOAuthToken()` | Returns owner's token when "Execute as: Me" |
| Google Identity Services | Blocked - GAS serves HTML from `googleusercontent.com` subdomains which Google forbids as OAuth origins |
| Deploy as "User accessing" | Requires app verification for sensitive scopes; users need access to all underlying sheets |

**The passphrase approach works because:**
- User self-identifies by entering their email
- Passphrase prevents unauthorized access (only team members know it)
- Whitelist provides granular control over who can access
- Session tokens (ScriptCache) provide proper per-user isolation
- No OAuth, no Google Cloud project, no app verification needed

### Session Management Details

- Sessions stored in `ScriptCache` (not `UserProperties` - that's shared when "Execute as: Me")
- Token format: UUID stored as `session_{token}` → `{email, created}`
- Expiry: 6 hours (21600 seconds)
- On each page load, token is re-verified and whitelist is re-checked
- Sessions are isolated per-user (different users get different tokens)

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
