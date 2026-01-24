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

## Google Sheets Database Requirements

### Column Formatting (CRITICAL)

**All columns containing text that will be displayed in the UI must be formatted as "Plain Text" in Google Sheets.**

Why this matters:
- Google Sheets auto-formats dates, times, and numbers
- A time like `14:00` may be converted to a Date object, which renders incorrectly
- The API passes values as-is; if Sheets converts them, the UI receives unexpected types

**How to set Plain Text format:**
1. Select the column(s)
2. Format → Number → Plain Text
3. Re-enter any values that were already auto-formatted

**Columns that MUST be Plain Text:**
| Database | Columns |
|----------|---------|
| MO-DB_Meetings | `time`, `day_of_week`, `cadence`, `name` |
| MO-DB_Availability | `start_date`, `end_date` (if stored as strings) |
| All databases | Any column with free-form text that might look like dates/numbers |

### MO-DB_Meetings Schema

| Column | Type | Expected Values | Notes |
|--------|------|-----------------|-------|
| `meeting_id` | Text | MTG_0001, etc. | Auto-generated on add |
| `name` | Text | Meeting name | Displayed in UI |
| `day_of_week` | Text | `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday` | **Case-sensitive, exact match required** |
| `time` | Text | `10:00 AM`, `14:00`, etc. | Displayed as-is, use Plain Text format |
| `cadence` | Text | `Weekly`, `4th Monday`, `Biweekly`, `1st & 3rd Tuesday` | Recurrence pattern for display |
| `is_active` | Boolean | `TRUE` / `FALSE` | Only active meetings display |
| `category` | Text | `MO`, `Assessment`, `SEP`, `Comms`, etc. | For filtering/badges |
| `type` | Text | `Internal`, `External`, etc. | Meeting type |
| `description` | Text | Meeting description | Shown in detail modal |
| `meeting_link` | URL | Teams/Zoom link | Clickable in detail modal |
| `notes_link` | URL | Link to meeting notes | Clickable in detail modal |

### Directing Documents (MO-DB_Config)

Team > Documents displays governing documents and templates. Document IDs are stored in MO-DB_Config.
Categories only display if at least one document in that category has an ID configured.

**Categories & Config Keys:**

| Category | Config Key | Document Name |
|----------|------------|---------------|
| Core | `MO_PROJECT_PLAN_DOC_ID` | MO Project Plan |
| Core | `HQ_PROJECT_PLAN_DOC_ID` | HQ Project Plan |
| Core | `SOLUTION_REQUIREMENTS_EXPECTATIONS_DOC_ID` | Solution Requirements & Expectations |
| SEP | `SEP_PLAN_DOC_ID` | SEP Plan |
| SEP | `SEP_BLUEPRINT_DOC_ID` | SEP Blueprint |
| SEP | `CODESIGN_PIPELINE_DOC_ID` | CoDesign Pipeline |
| Comms | `COMMS_PLAN_DOC_ID` | Communications Plan |
| Comms | `STYLE_GUIDE_DOC_ID` | Style Guide |
| Comms | `HIGHLIGHTER_BLURBS_DOC_ID` | Highlighter Blurbs |
| Comms | `WEBPAGE_LOG_DOC_ID` | Webpage Log |
| Assessment | `ASSESSEMENT_PROCESS_DOC_ID` | Assessment Process |
| Assessment | `ASSESSEMENT_CHEATSHEET_DOC_ID` | Assessment Cheatsheet |
| Operations | `MO_RISK_REGISTER_DOC_ID` | MO Risk Register |
| Operations | `RISK_REGISTER_DOC_ID` | Risk Register |
| Operations | `INFO_MANAGEMENT_PLAN_DOC_ID` | Information Management Plan |
| Operations | `AUDIT_LOG_DOC_ID` | Audit Log |
| Templates | `TEMPLATE_MEETING_NOTES_DOC_ID` | Meeting Notes Template |
| Templates | `TEMPLATE_SOLUTION_BRIEF_DOC_ID` | Solution Brief Template |
| Templates | `TEMPLATE_STAKEHOLDER_REPORT_DOC_ID` | Stakeholder Report Template |
| Templates | `TEMPLATE_PRESENTATION_DOC_ID` | Presentation Template |
| Templates | `TEMPLATE_EMAIL_OUTREACH_DOC_ID` | Email Outreach Templates |
| Templates | `TEMPLATE_ONE_PAGER_DOC_ID` | One-Pager Template |

### MO-DB_Agencies Schema

| Column | Type | Values | Notes |
|--------|------|--------|-------|
| `agency_id` | Text | AGY_*, e.g. AGY_NASA | Unique identifier |
| `name` | Text | Short name | e.g. "NASA", "NOAA" |
| `full_name` | Text | Full organization name | e.g. "National Aeronautics and Space Administration" |
| `abbreviation` | Text | Common abbreviation | For display |
| `parent_agency_id` | Text | AGY_* | Parent in hierarchy |
| `type` | Text | Federal Agency, Bureau, Office, Lab | Organization type |
| `status` | Text | Active, Closed, Merged | **For tracking closed agencies** |
| `closed_date` | Date | YYYY-MM-DD | When agency closed |
| `successor_agency_id` | Text | AGY_* | Where people/functions moved |
| `relationship_status` | Text | New, Developing, Established, Strong, Dormant | Current relationship health |
| `geographic_scope` | Text | National, Regional, State, Local, International | Coverage area |
| `mission_statement` | Text | Mission text | Agency mission |
| `data_interests` | Text | Interest areas | Earth observation interests |
| `website_url` | URL | Agency website | External link |

**API Functions:**
- `getAgencyEngagementStats(agencyId)` - Total engagements, last date, heat status (hot/warm/cold)
- `getAgencyEngagementTimeline(agencyId, limit)` - Engagement history for agency contacts
- `getAgencyContactsWithTags(agencyId)` - Contacts with solution_tags array
- `getContactSolutionTags(email)` - Solutions a contact has engaged with

### MO-DB_Solutions SEP Milestone Schema

Solutions have two types of milestones:
1. **Implementation Milestones** (milestone_ prefix): ATP, F2I, ORR, Closeout
2. **SEP Milestones** (sep_ prefix): Working Sessions and Touchpoints

**SEP Active Column:**
| Column | Type | Values | Notes |
|--------|------|--------|-------|
| `sep_active` | Boolean | `TRUE` / `FALSE` | Only TRUE solutions appear in SEP pipeline |

**SEP Milestone Flow:**
```
WS1 → TP4 → WS2 → TP5 → WS3 → TP6 → WS4 → TP7 → WS5 → TP8
```

- **Working Sessions (WS)**: NSITE SEP team prepares solution teams for touchpoints
- **Touchpoints (TP)**: Solution teams engage directly with stakeholders

| Milestone | Type | Full Name | Date Column | URL Column |
|-----------|------|-----------|-------------|------------|
| WS1 | Working Session | Working Session 1 | `sep_ws1_date` | `sep_ws1_url` |
| TP4 | Touchpoint | Touchpoint 4 - Outreach | `sep_tp4_date` | `sep_tp4_url` |
| WS2 | Working Session | Working Session 2 | `sep_ws2_date` | `sep_ws2_url` |
| TP5 | Touchpoint | Touchpoint 5 - Transition | `sep_tp5_date` | `sep_tp5_url` |
| WS3 | Working Session | Working Session 3 | `sep_ws3_date` | `sep_ws3_url` |
| TP6 | Touchpoint | Touchpoint 6 - Training | `sep_tp6_date` | `sep_tp6_url` |
| WS4 | Working Session | Working Session 4 | `sep_ws4_date` | `sep_ws4_url` |
| TP7 | Touchpoint | Touchpoint 7 - Adoption | `sep_tp7_date` | `sep_tp7_url` |
| WS5 | Working Session | Working Session 5 | `sep_ws5_date` | `sep_ws5_url` |
| TP8 | Touchpoint | Touchpoint 8 - Impact | `sep_tp8_date` | `sep_tp8_url` |

**API Functions:**
- `getSEPMilestones()` - Get milestone definitions
- `getSolutionsWithSEPProgress()` - Solutions with progress info (filtered by sep_active)
- `getSolutionsBySEPMilestone()` - Solutions grouped by current milestone
- `getSEPPipelineStats()` - Dashboard statistics
- `updateSolutionSEPMilestone(solutionId, milestoneId, date)` - Update milestone date
- `getSEPCycles()` - Get unique cycles from SEP-active solutions (for filter dropdown)
- `getSolutionsNeedingOutreach(threshold)` - Solutions with low engagement count

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
