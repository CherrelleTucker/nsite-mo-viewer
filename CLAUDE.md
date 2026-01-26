# Claude Code Instructions for MO-Viewer

**Version:** 2.1.2 | **Updated:** 2026-01-25 | **Repository:** https://github.com/CherrelleTucker/nsite-mo-viewer

---

## Session Start Checklist

When beginning a new session:
1. **Read this file** - Understand project rules and architecture
2. **Check the System Architecture section** - Know how components interconnect
3. **Review "Common Mistakes to Avoid"** - Prevent known issues
4. **Ask about context** - If user mentions prior work, ask for specifics

---

## Development Status (January 2026)

### Current Phase: Data Infrastructure

**Completed:**
- Framework and architecture established
- All viewer pages functional (Implementation, SEP, Comms, Team, Contacts, Reports, Schedule)
- "Wow" features demonstrated:
  - Event guest list and prep report system (Comms)
  - SEP pipeline with milestone tracking
  - Agency engagement heat mapping
  - View-then-edit modal patterns
- Shared styling and component library
- Access control with passphrase + whitelist authentication

**In Progress:**
1. **Database population** - Backfilling historical data from meeting notes
2. **Maintenance scripts** - Automated sync from weekly/monthly agendas to databases

### Sync Scripts (MO-DB_Updates container)

| Script | Purpose | Trigger |
|--------|---------|---------|
| `sync-common.gs` | Shared parsing and database functions | N/A |
| `sync-weekly-current.gs` | Internal + SEP latest tab | Weekly after meetings |
| `sync-weekly-internal-historical.gs` | Internal all tabs backfill | Once |
| `sync-weekly-sep-historical.gs` | SEP all tabs backfill | Once |
| `sync-monthly-current.gs` | OPERA + PBL latest tab | Monthly |
| `sync-monthly-historical.gs` | OPERA + PBL all tabs backfill | Once |
| `sync-menu.gs` | Custom menu UI | N/A |

### Agenda Format for Sync

Updates in agendas should use:
```
● Solution Name (Provider) [solution_id]
  ○ Sub-solution [sub_solution_id]
    ■ 🆕 Update text captured by sync
```

- `[solution_id]` in square brackets links to MO-DB_Solutions.core_id
- 🆕 emoji marks new updates to capture
- Nested bullets are included in update text

### Next Steps
- Complete historical backfill for all agenda sources
- Build Actions sync script (similar pattern)
- Test automated triggers for weekly/monthly syncs
- Continue Comms page improvements (event guest list UI)

### Future Development: Historical Updates Report

Design notes for improving the Reports > Historical Updates feature:

1. **Group updates by date** - Updates with the same meeting_date should be shown together under a single date header, not as separate entries
2. **Link date to source** - The date should be a clickable link to the source document (source_url field)
3. **Increase character limit** - Current 500 char truncation cuts off URLs. Increase to ~1000 chars or implement smarter truncation that preserves complete URLs
4. **Render bullet points** - Update text often contains bullet characters (•, ○, ■). Render these as proper HTML bulleted lists (`<ul><li>`) instead of plain text

---

## System Architecture & Data Flow

**CRITICAL: This project is highly interconnected. Changes to any component can break others.**

### Complete Data Flow Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SOURCE DOCUMENTS                                   │
│  (Google Docs - Meeting Notes, Agendas, Reports)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Weekly Internal Planning Meeting Notes                                      │
│  Weekly SEP Meeting Notes                                                    │
│  Monthly OPERA Meeting Notes                                                 │
│  Monthly PBL Meeting Notes                                                   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNC SCRIPTS                                       │
│  (Apps Script in MO-DB_Updates container)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  sync-weekly-current.gs      → MO-DB_Updates (current year tab)             │
│  sync-weekly-historical.gs   → MO-DB_Updates (all year tabs)                │
│  sync-monthly-current.gs     → MO-DB_Updates (current year tab)             │
│  sync-common.gs              → Shared parsing functions                      │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASES                                          │
│  (Google Sheets)                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  MO-DB_Config      │ Configuration key-value pairs, sheet IDs               │
│  MO-DB_Access      │ User whitelist for authentication                      │
│  MO-DB_Solutions   │ Solution master data (core_id is primary key)          │
│  MO-DB_Contacts    │ Stakeholder contacts (solution_id links to Solutions)  │
│  MO-DB_Updates     │ Solution updates by year (2026, 2025, 2024, Archive)   │
│  MO-DB_Engagements │ Contact engagement records                              │
│  MO-DB_Agencies    │ Agency/organization master data                         │
│  MO-DB_Outreach    │ Events, stories, comms activities                       │
│  MO-DB_Actions     │ Action items and tasks                                  │
│  MO-DB_Team        │ Team member information                                 │
│  MO-DB_Meetings    │ Meeting schedule data                                   │
│  MO-DB_Milestones  │ Milestone definitions                                   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MO-APIs LIBRARY                                    │
│  (Standalone Apps Script Library - identifier: MoApi)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  config-helpers.gs  │ getConfigValue(), database connection helpers         │
│  solutions-api.gs   │ getAllSolutions(), getSolutionById()                  │
│  contacts-api.gs    │ getContactsBySolution(), getSolutionStakeholderSummary│
│  updates-api.gs     │ getUpdatesForSolutionCard(), getAllHistoricalUpdates  │
│  agencies-api.gs    │ getAgencyEngagementStats(), agency queries            │
│  engagements-api.gs │ Engagement tracking and statistics                     │
│  outreach-api.gs    │ Events, stories, comms queries                         │
│  actions-api.gs     │ Action item queries                                    │
│  team-api.gs        │ Team member queries                                    │
│  milestones-api.gs  │ Milestone queries                                      │
│  stories-api.gs     │ Story/narrative queries                                │
│  kudos-api.gs       │ Recognition/kudos queries                              │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOY WRAPPERS                                    │
│  (NSITE-MO-Viewer Apps Script project)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  *-api.gs files     │ Thin wrappers: function X() { return MoApi.X(); }     │
│  Code.gs            │ Routing, auth, session management                      │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIEWER PAGES                                       │
│  (HTML/CSS/JS served by Apps Script)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  implementation.html │ Solutions, Stakeholders, Updates, Milestones         │
│  sep.html            │ SEP pipeline, touchpoints, working sessions          │
│  comms.html          │ Stories, events, coverage, messaging                  │
│  contacts.html       │ Contact directory and search                          │
│  team.html           │ Team info, documents, meetings                        │
│  reports.html        │ Historical updates report, data exports               │
│  schedule.html       │ Meeting schedule and availability                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database → API → Page Dependencies

| Database | API File | Key Functions | Used By Pages |
|----------|----------|---------------|---------------|
| MO-DB_Solutions | solutions-api.gs | `getAllSolutions()`, `getSolutionById()` | Implementation, SEP, Reports |
| MO-DB_Contacts | contacts-api.gs | `getContactsBySolution()`, `getSolutionStakeholderSummary()` | Implementation, SEP, Contacts |
| MO-DB_Updates | updates-api.gs | `getUpdatesForSolutionCard()`, `getAllHistoricalUpdatesForReport()` | Implementation, Reports |
| MO-DB_Agencies | agencies-api.gs | `getAgencyEngagementStats()` | Contacts, SEP |
| MO-DB_Engagements | engagements-api.gs | `getEngagementsByContact()` | Contacts, SEP |
| MO-DB_Outreach | outreach-api.gs | `getEvents()`, `getStories()` | Comms |
| MO-DB_Actions | actions-api.gs | `getOpenActions()` | Implementation, Team |
| MO-DB_Team | team-api.gs | `getTeamMembers()` | Team |
| MO-DB_Meetings | Code.gs (direct) | `getMeetings()` | Schedule, Team |

### Critical Column Name Dependencies

**These column names MUST match exactly between database headers and API code:**

| Database | Column | Used In | API Function |
|----------|--------|---------|--------------|
| MO-DB_Contacts | `solution_id` | contacts-api.gs | `getContactsBySolution()` |
| MO-DB_Contacts | `email` | contacts-api.gs | All contact queries |
| MO-DB_Updates | `solution_id` | updates-api.gs | `getUpdatesBySolution()` |
| MO-DB_Updates | `meeting_date` | updates-api.gs | Date filtering |
| MO-DB_Solutions | `core_id` | solutions-api.gs | Primary key for solutions |

### Response Size Limits

**google.script.run has a ~5MB response limit. Large responses return null.**

| Function | Risk | Mitigation |
|----------|------|------------|
| `getUpdatesForSolutionCard()` | High - many updates with long text | Limited to 10 recent + 10 extended, text truncated to 300 chars |
| `getAllHistoricalUpdatesForReport()` | High - full history | Limited to 500 updates, text truncated to 500 chars |
| `getAllContacts()` | Medium | Use pagination or filtering |

### Deployment Checklist

When modifying code, deploy in this order:

1. **MO-APIs Library** (library/*.gs) → Updates shared by all projects
2. **NSITE-MO-Viewer** (deploy/*.gs, deploy/*.html) → Web app code
3. **Verify library version** → Check if using HEAD or versioned reference

**After library changes:**
- Clear any server-side caches
- Test API functions directly in Apps Script editor before browser testing
- Check browser console for null responses (indicates size limit exceeded)

---

## Development Rules

### File Deployment

After making changes, ALWAYS provide complete Windows paths for files that need to be copied to Google Apps Script:

```
Files to deploy to NSITE-MO-Viewer (Google Apps Script):
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\deploy\<filename>

Files to deploy to MO-APIs Library (Google Apps Script):
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\library\<filename>
```

### MO-APIs Library Architecture

The project uses a **thin wrapper pattern**:

1. **library/*.gs** - Full implementations in a standalone Apps Script Library (identifier: `MoApi`)
2. **deploy/*-api.gs** - Thin wrappers that delegate to the library: `function X() { return MoApi.X(); }`

**When updating API functions:**
1. Edit the `library/<name>-api.gs` file with the full implementation
2. The `deploy/<name>-api.gs` wrapper does NOT need changes (unless adding new functions)
3. If adding a NEW function, add the wrapper: `function newFunc(x) { return MoApi.newFunc(x); }`
4. Copy library file to MO-APIs Library project, deploy file to NSITE-MO-Viewer project

**Library files:**
- config-helpers.gs (library only - provides getConfigValue(), getDatabaseSheet())
- solutions-api.gs, contacts-api.gs, agencies-api.gs, updates-api.gs
- engagements-api.gs, team-api.gs, actions-api.gs, milestones-api.gs
- outreach-api.gs, stories-api.gs, kudos-api.gs

### About Page Maintenance

**RULE: When any page changes functionally, the About page (`deploy/about.html`) must be updated.**

The About page documents:
- Data sources for each page
- How data is stored and transformed
- Update mechanisms and frequency

### Documentation Updates

When making significant changes, update ALL relevant files:
- `CHANGELOG.md` - Add entry under correct version section
- `NEXT_STEPS.md` - Update completed items, add new tasks
- `docs/DATA_SCHEMA.md` - If database schema changes
- `deploy/about.html` - If page functionality changes

### Commit Guidelines

- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commit messages
- Use descriptive commit messages summarizing changes
- **NEVER push to GitHub until user confirms the fix/feature is working**
- Wait for explicit "push" instruction from user

---

## Common Mistakes to Avoid

1. **Wrong column name in API** - Column names in code MUST match database headers exactly. Example: `solution_id` not `solution_id_id`. Always verify column names against actual database.

2. **Forgetting library sync** - When updating an API, edit `library/*-api.gs` (full implementation). Deploy wrappers rarely need changes.

3. **Response too large** - If `google.script.run` returns null, the response exceeded ~5MB. Add limits and truncation.

4. **Hardcoding IDs** - Never hardcode Google Doc/Sheet IDs. Always use `getConfigValue('KEY_NAME')`.

5. **Missing file paths** - Always provide full Windows paths after changes.

6. **Incomplete documentation** - Update ALL relevant docs, not just code.

7. **Forgetting about.html** - This is the user-facing documentation. Keep it current.

8. **Editing deploy instead of library** - For API logic changes, edit `library/*-api.gs` files.

---

## Code Patterns

### API Function Pattern

All API functions should:
1. Use caching where appropriate (`_cacheVariableName`)
2. Return deep copies of cached data (`JSON.parse(JSON.stringify(...))`)
3. Handle errors gracefully with try/catch
4. Log errors with `Logger.log()`

```javascript
var _solutionsCache = null;

function getAllSolutions() {
  if (_solutionsCache !== null) {
    return JSON.parse(JSON.stringify(_solutionsCache));
  }

  try {
    var sheetId = getConfigValue('SOLUTIONS_SHEET_ID');
    // ... implementation
    _solutionsCache = results;
    return JSON.parse(JSON.stringify(results));
  } catch (e) {
    Logger.log('Error in getAllSolutions: ' + e);
    return [];
  }
}
```

### HTML Page Pattern

Each page should:
1. Have a main object (e.g., `var Team = { ... }`)
2. Call `init()` on page load
3. Load data via `google.script.run` calls
4. Handle errors with `withFailureHandler(handleError)`

### CSS Pattern (Page Accent Colors)

Each page viewer sets a `--page-accent` CSS variable:

```css
.sep-viewer {
  --page-accent: var(--color-sep);
  max-width: 1600px;
  margin: 0 auto;
}
```

This variable is used by shared-page-styles.html for page title, buttons, form focus states, etc.

---

## Quality Checklist

Before completing any task, verify:

### Code Changes
- [ ] Library file updated (if API change)
- [ ] No hardcoded IDs (use getConfigValue())
- [ ] Error handling in place
- [ ] Column names match database headers exactly

### Documentation
- [ ] about.html updated (if page changed)
- [ ] CHANGELOG.md updated (if significant)

### Deployment
- [ ] Full file paths provided for ALL changed files
- [ ] Clear indication of which Google Apps Script project each goes to
- [ ] Deployment order specified if it matters (library first)

---

## Project Structure

```
nsite-mo-viewer/
├── deploy/           # Files to copy to NSITE-MO-Viewer (Apps Script)
├── library/          # Files to copy to MO-APIs Library (Apps Script)
├── scripts/          # Python import/processing scripts
├── database-files/   # Local Excel/CSV database backups
├── docs/             # Technical documentation
└── tests/            # Testing files
```

## Key Files

| File | Purpose |
|------|---------|
| `deploy/Code.gs` | Main routing, config, session management, access control |
| `deploy/index.html` | Page routing conditionals, SPA navigation |
| `deploy/navigation.html` | Navigation tabs |
| `deploy/about.html` | Platform documentation (KEEP UPDATED) |
| `deploy/shared-page-styles.html` | Shared CSS patterns |
| `deploy/styles.html` | CSS variables, base styles |

## Database Reference

| Database | Config Key | Purpose |
|----------|------------|---------|
| MO-DB_Solutions | SOLUTIONS_SHEET_ID | Solution metadata |
| MO-DB_Contacts | CONTACTS_SHEET_ID | Stakeholder contacts |
| MO-DB_Updates | UPDATES_SHEET_ID | Updates by year (2026, 2025, 2024, Archive) |
| MO-DB_Agencies | AGENCIES_SHEET_ID | Organization hierarchy |
| MO-DB_Engagements | ENGAGEMENTS_SHEET_ID | Interaction logging |
| MO-DB_Outreach | OUTREACH_SHEET_ID | Events and conferences |
| MO-DB_Actions | ACTIONS_SHEET_ID | Action items |
| MO-DB_Team | TEAM_SHEET_ID | Team members |
| MO-DB_Meetings | MEETINGS_SHEET_ID | Recurring meetings |
| MO-DB_Access | ACCESS_SHEET_ID | Auth whitelist |
| MO-DB_Config | (Script Property) | All configuration |

---

## Design System

### Icons
- **Use Material Icons** - NOT Feather icons
- Syntax: `<span class="material-icons">icon_name</span>`
- Reference: https://fonts.google.com/icons

### CSS Variables
- Colors, spacing, typography in `shared-styles.html`
- Page-specific accents (e.g., `--color-comms`, `--color-sep`)

### Components
- Modals: `.modal-overlay`, `.modal-content`
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`
- Cards: `.stat-card`, `.content-card`

---

## Access Control

MO-Viewer uses **passphrase + whitelist authentication**.

### How It Works
1. User visits MO-Viewer → sees sign-in page
2. User enters email + team passphrase
3. Server verifies passphrase matches `SITE_PASSPHRASE` in config
4. Server checks if email is in `MO-DB_Access` whitelist
5. If both pass → creates session token (6-hour expiry) → redirects to app

### Configuration (MO-DB_Config)
| Key | Purpose |
|-----|---------|
| `SITE_PASSPHRASE` | Shared team passphrase |
| `ACCESS_SHEET_ID` | ID of MO-DB_Access spreadsheet |
| `ADMIN_EMAIL` | Email for access request notifications |

---

## Google Sheets Requirements

### Column Formatting (CRITICAL)

**All text columns must be formatted as "Plain Text" in Google Sheets.**

Why: Google Sheets auto-formats dates/numbers. A time like `14:00` becomes a Date object and renders incorrectly.

**How to set:** Format → Number → Plain Text

---

## Quality Review Status

### Completed
- [x] Add caching to solutions-api.gs
- [x] Remove debug console.log statements
- [x] XSS audit and fixes
- [x] Input validation for write APIs
- [x] Standardize error handling
- [x] Remove duplicate functions from Code.gs
- [x] CSS consolidation (shared-page-styles.html)
- [x] Sync Code.gs PAGES icons

### Deferred
- [ ] Add automated tests (see docs/TESTING_STRATEGY.md)
- [ ] SEP Pipeline toolbar cleanup
- [ ] Systematic SPA navigation null checks

---

*This file should be updated when new patterns emerge or mistakes are identified.*
