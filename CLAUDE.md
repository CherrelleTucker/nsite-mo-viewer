# Claude Code Instructions for MO-Viewer

**Version:** 2.2.11 | **Updated:** 2026-01-30 | **Repository:** https://github.com/CherrelleTucker/nsite-mo-viewer

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
│  templates-api.gs   │ Email/meeting templates for SEP & Comms                │
│  parking-lot-api.gs │ Parking lot ideas/topics capture                       │
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

## Data Standards

### Date Format

**All dates in backend databases MUST use YYYY-MM-DD format (ISO 8601).**

| Context | Format | Example |
|---------|--------|---------|
| Database storage | `YYYY-MM-DD` | `2026-01-29` |
| API responses | `YYYY-MM-DD` | `2026-01-29` |
| JavaScript Date objects | `.toISOString().split('T')[0]` | `2026-01-29` |
| Display in webapp | Flexible (user-friendly) | `Jan 29, 2026` or `1/29/2026` |

**Why:** Consistent date format prevents sorting issues, enables reliable date comparisons, and maintains compatibility across systems.

**When writing dates:**
```javascript
// Backend/API - always YYYY-MM-DD
var today = new Date().toISOString().split('T')[0];  // "2026-01-29"

// Display in HTML - format for readability
var displayDate = new Date(isoDate).toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric'
});  // "Jan 29, 2026"
```

### Solution-Earthdata Mapping

When syncing earthdata.nasa.gov content to MO-DB_Solutions, use `earthdata-solutions-content.json` as the source. Sub-projects inherit from parent solutions:

| core_id Pattern | Earthdata Source |
|-----------------|------------------|
| `hls_*` (except hls_ll, hls_vi) | HLS |
| `opera_*` | Respective OPERA product |
| `nisar_*` | Respective NISAR product |
| `pbl_*` | PBL |
| `aq_*` | Air Quality |

---

## AI Code Pitfall Prevention

**CRITICAL: This codebase was partially AI-generated. Actively avoid these documented anti-patterns.**

### DRY Violations (Don't Repeat Yourself)

**Problem**: AI tends to generate similar code blocks repeatedly instead of creating reusable functions.

**Anti-patterns to avoid**:
```javascript
// BAD: Copy-pasting filter logic with only field name changes
function getContactsByRole(role) {
  return contacts.filter(c => c.role && c.role.toLowerCase() === role.toLowerCase());
}
function getContactsByDept(dept) {
  return contacts.filter(c => c.department && c.department.toLowerCase() === dept.toLowerCase());
}

// GOOD: Use shared utility
function getContactsByRole(role) {
  return filterByProperty(loadAllContacts_(), 'role', role);
}
```

**Required patterns**:
- Use `filterByProperty()` from config-helpers.gs for single-field filters
- Use `filterByProperties()` for multi-field filters
- Use `loadSheetData_()` for loading any sheet data with caching
- Use `deepCopy()` instead of raw `JSON.parse(JSON.stringify())`

### Inconsistent Error Handling

**Problem**: AI mixes throw, return null, and return error objects inconsistently.

**Standard pattern for this codebase**:
```javascript
// For functions that WRITE data - return result object
function updateContact(email, data) {
  try {
    // ... implementation
    return { success: true, data: result };
  } catch (e) {
    Logger.log('updateContact error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// For functions that READ data - return empty array/null on failure
function getContacts() {
  try {
    return loadAllContacts_();
  } catch (e) {
    Logger.log('getContacts error: ' + e.message);
    return [];
  }
}

// For internal helpers - throw to let caller handle
function getSheet_(sheetId) {
  if (!sheetId) {
    throw new Error('Sheet ID not configured');
  }
  return SpreadsheetApp.openById(sheetId);
}
```

### Missing Edge Cases

**Problem**: AI generates happy-path code without null checks or empty state handling.

**Required checks**:
```javascript
// ALWAYS check before string operations
var name = (contact.first_name || '') + ' ' + (contact.last_name || '');
name = name.trim() || 'Unknown';

// ALWAYS handle empty arrays
var results = getContacts();
if (!results || results.length === 0) {
  return { items: [], total: 0, message: 'No contacts found' };
}

// ALWAYS validate before write operations
if (!data.email || !data.email.includes('@')) {
  return { success: false, error: 'Valid email required' };
}
```

### Over-Complex Solutions

**Problem**: AI generates verbose, nested code when simpler approaches exist.

**Simplification rules**:
```javascript
// BAD: Nested ternary
return value ? (value === 'yes' ? true : (value === 'no' ? false : null)) : null;

// GOOD: Clear logic
if (!value) return null;
if (value === 'yes') return true;
if (value === 'no') return false;
return null;

// BAD: indexOf !== -1
if (str.indexOf(search) !== -1) { ... }

// GOOD: Modern includes()
if (str.includes(search)) { ... }
```

### Shared Utilities Reference

**Always use these utilities from config-helpers.gs**:

| Utility | Purpose | Replaces |
|---------|---------|----------|
| `loadSheetData_(sheetId, cacheKey)` | Load sheet with caching | Manual cache + getDataRange pattern |
| `filterByProperty(array, prop, value, exact)` | Single-field filter | Repeated filter functions |
| `filterByProperties(array, criteria)` | Multi-field filter | Complex filter chains |
| `deepCopy(obj)` | Safe object copy | `JSON.parse(JSON.stringify())` |
| `normalizeString(str)` | Lowercase + trim | Repeated `.toLowerCase().trim()` |
| `createResult(success, data, error)` | Standard return format | Inconsistent return objects |

### Code Review Checklist for AI-Generated Code

Before accepting any new code, verify:
- [ ] No duplicate filter/map/reduce patterns that could use shared utilities
- [ ] Error handling follows the standard pattern (write=object, read=empty, internal=throw)
- [ ] All string operations have null checks
- [ ] Empty array cases are handled explicitly
- [ ] Uses `.includes()` instead of `.indexOf() !== -1`
- [ ] No raw `JSON.parse(JSON.stringify())` - uses `deepCopy()` instead
- [ ] Complex logic is broken into named helper functions

---

## Code Patterns

### API Function Pattern

All API functions should:
1. Use `loadSheetData_()` for data loading with automatic caching
2. Return deep copies using `deepCopy()` (not raw JSON.parse/stringify)
3. Follow standard error handling (read=empty array, write=result object)
4. Use shared filter utilities instead of inline filter functions

```javascript
// PREFERRED: Using shared utilities
function getAllSolutions() {
  return deepCopy(loadSheetData_('SOLUTIONS_SHEET_ID', '_solutionsCache'));
}

function getSolutionsByPhase(phase) {
  return filterByProperty(getAllSolutions(), 'admin_lifecycle_phase', phase, true);
}

// When custom logic is needed
function getSolutionsWithMilestones() {
  var solutions = getAllSolutions();
  return solutions.filter(function(sol) {
    return sol.milestone_atp_date || sol.milestone_orr_date;
  });
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
| MO-DB_Templates | TEMPLATES_SHEET_ID | Email/meeting templates for SEP & Comms |
| MO-DB_Parking | PARKING_LOT_SHEET_ID | Ideas, topics, follow-ups capture |
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
- [x] AI Pitfall Prevention section added to CLAUDE.md
- [x] Shared utilities added to config-helpers.gs (deepCopy, filterByProperty, etc.)
- [x] Refactored contacts-api.gs to use shared utilities (template)
- [x] Consolidated escapeHtml to global definition in index.html

### AI Pitfall Refactoring Progress (2026-01-28) - **COMPLETE**
All library API files refactored:
- [x] `JSON.parse(JSON.stringify())` → `deepCopy()` (89 → 0 instances)
- [x] `indexOf !== -1` → `.includes()` (64 → 0 instances)

Files updated:
- config-helpers.gs (shared utilities)
- contacts-api.gs, solutions-api.gs, agencies-api.gs
- engagements-api.gs, milestones-api.gs, outreach-api.gs
- team-api.gs, stories-api.gs, parking-lot-api.gs
- templates-api.gs, actions-api.gs, updates-api.gs

### Deferred
- [ ] Add automated tests (see docs/TESTING_STRATEGY.md)
- [ ] SEP Pipeline toolbar cleanup
- [ ] Systematic SPA navigation null checks (SEP-029, SEP-030, SEP-031)

---

## Comprehensive Review Checklist

Work through these reviews systematically to ensure webapp quality.

### Code Quality
- [x] **1. Security Audit** - XSS vulnerabilities, input validation, data sanitization, access control gaps (completed 2026-01-29)
- [x] **2. Error Handling Review** - Consistent patterns, user-friendly messages, logging, graceful failures (completed 2026-01-29, fixes deployed 2026-01-30: added withFailureHandler to 4 comms.html calls, fixed createAction return type consistency, fixed invisible toast text)
- [x] **3. Performance Audit** - API response sizes, redundant calls, caching opportunities, render optimization (completed 2026-01-30: global search early termination, SEP page 9→2 API calls via getSEPInitData, response size monitoring added to high-risk endpoints)

### Architecture
- [x] **4. DRY Audit** - Duplicate code across pages, opportunities for shared utilities (completed 2026-01-30: Team.escapeHtml security fix, global closeModal/showToast utilities, date formatting consolidation)
- [x] **5. API Consistency** - Naming conventions, return formats, parameter patterns across all APIs (completed 2026-01-30: standardized write returns to {success, data, error}, cache functions to private suffix)
- [x] **6. State Management** - How each page handles state, potential race conditions, stale data (completed 2026-01-30: element existence checks in async handlers, isSaving guards to prevent double-submit)

### User Experience
- [x] **7. Accessibility Audit** - Keyboard navigation, screen reader support, color contrast, focus states (completed 2026-01-30: skip link, focus-visible styles, aria-labels on 26 modal close buttons and icon buttons, Escape key closes modals, toast aria-live)
- [x] **8. Mobile/Responsive Review** - Layout issues on different screen sizes (completed 2026-01-30: quick fix - stats-row responsive breakpoints at 1024px and 600px)
- [x] **9. Loading States** - Spinners, skeletons, empty states, error states across all views (completed 2026-01-30: consolidated 8 duplicate .empty-state definitions into shared style)

### Data Integrity
- [x] **10. Schema Validation** - Column names match between code and databases, required fields enforced (completed 2026-01-30: added backend validation to 8 write functions across 6 API files)
- [x] **11. Data Flow Audit** - Trace data from source docs → sync scripts → databases → APIs → UI (completed 2026-01-30: fixed solution/solution_id column inconsistency, renamed extractSolutionName_ to extractSolutionId_, added MoApi fallback, replaced indexOf with includes)

### Documentation
- [ ] **12. Code Comments** - Missing explanations for complex logic
- [ ] **13. About Page Accuracy** - Does documentation match current functionality?

---

*This file should be updated when new patterns emerge or mistakes are identified.*
