# Claude Instructions for NSITE MO Viewer

**Purpose:** Quality maintenance guide for Claude Code sessions on this project.
**Refer to this file when:** Starting a new session, quality is degrading, or before making changes.

---

## Critical Rules

### 1. Always Provide Full File Paths for Deployment

After making changes, ALWAYS provide the complete Windows paths for files that need to be copied to Google Apps Script. The user works across multiple projects and needs exact paths to avoid transcription errors.

**Format:**
```
Files to deploy to NSITE-MO-Viewer (Google Apps Script):
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\deploy\<filename>

Files to deploy to MO-APIs Library (Google Apps Script):
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\library\<filename>
```

### 2. API Architecture: Library = Full, Deploy = Thin Wrappers

**CRITICAL:** The architecture is now:
- `library/*-api.gs` files contain FULL implementations
- `deploy/*-api.gs` files are THIN WRAPPERS that call `MoApi.*` functions

**When updating an API:**
1. Edit the `library/<name>-api.gs` file with the full implementation
2. The `deploy/<name>-api.gs` wrapper does NOT need changes (unless adding new functions)
3. If adding a NEW function, add the wrapper in deploy: `function newFunc(x) { return MoApi.newFunc(x); }`
4. The MO-APIs Library is a separate Google Apps Script project with identifier `MoApi`

**All 11 API files exist in BOTH locations:**
- config-helpers.gs (library only - provides getConfigValue(), getDatabaseSheet())
- solutions-api.gs, contacts-api.gs, agencies-api.gs, updates-api.gs
- engagements-api.gs, team-api.gs, actions-api.gs, milestones-api.gs
- outreach-api.gs, stories-api.gs

**Thin wrapper pattern:**
```javascript
// deploy/solutions-api.gs
function getAllSolutions() {
  return MoApi.getAllSolutions();
}
```

### 3. Update about.html When Any Page Changes

Per CLAUDE.md: "When any page changes functionally, the About page must be updated."

The About page (`deploy/about.html`) documents:
- Data sources for each page
- How data is stored and transformed
- Update mechanisms and frequency
- Next steps per component

### 4. Update Documentation Files Together

When making significant changes, update ALL of these:
- `CHANGELOG.md` - Add entry under correct version section
- `NEXT_STEPS.md` - Update completed items, add new tasks
- `docs/DATA_SCHEMA.md` - If database schema changes
- `deploy/about.html` - If page functionality changes

---

## Project Architecture

### Directory Structure
```
nsite-mo-viewer/
├── deploy/           # Files to copy to Google Apps Script Web App
├── library/          # Files to copy to MO-APIs Library (Apps Script)
├── src/              # Source organization reference (not deployed)
├── docs/             # Technical documentation
├── scripts/          # Python import/processing scripts
├── database-files/   # Local Excel/CSV database backups
└── tests/            # Testing files
```

### Two Deployment Targets

1. **NSITE-MO-Viewer** (main web app)
   - Deploy from: `deploy/` folder
   - Contains: HTML pages, *-api.gs files, Code.gs

2. **MO-APIs Library** (shared library)
   - Deploy from: `library/` folder
   - Library identifier: `MoApi`
   - Contains: *-api.gs files for shared data access

### Data Architecture

- **Source of Truth:** Google Docs (meeting notes, agendas)
- **Database Cache:** Google Sheets (MO-DB_* sheets)
- **Config:** MO-DB_Config sheet (key-value pairs for all IDs)
- **Principle:** Database is a CACHE, not source of truth

### Config System

All document/sheet IDs are stored in MO-DB_Config sheet. Code.gs has a `CONFIG_KEYS` object that documents available keys. To add a new config:
1. Add the key-value to MO-DB_Config sheet
2. Add the key constant to Code.gs CONFIG_KEYS (for documentation)
3. Use `getConfigValue('KEY_NAME')` to read it

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

### SPA Navigation

The app uses Single Page Application navigation:
- Navigation uses `google.script.history.push()`, NOT `window.location`
- Content loaded via `google.script.run.getPageHTML(pageName)`
- See `docs/SPA_NAVIGATION.md` for details

### Report Export Pattern

Report exports create multi-tab Google Sheets with methodology documentation:
- `export-helpers.gs` - Shared utilities (styleHeaderRow_, autoResizeColumns_, etc.)
- `stakeholder-solution-alignment.gs` - 4 exports: Need Alignment, Stakeholder Coverage, Engagement Funnel, Department Reach
- `quicklook-generator.gs` - Detailed Milestones export
- `historical-updates-export.gs` - Historical Updates export

Each export should include a "Methodology & Data Sources" tab with:
- Links to source databases
- Calculation explanations
- Verification instructions

### CSS Pattern (Page Accent Colors)

Each page viewer sets a `--page-accent` CSS variable that controls accent colors throughout shared styles:

```css
/* In page-specific style block */
.sep-viewer {
  --page-accent: var(--color-sep);
  max-width: 1600px;
  margin: 0 auto;
}
```

This variable is used by shared-page-styles.html for:
- Page title color (`.page-title h1`)
- View toggle active state (`.view-btn.active`)
- Stat icon colors (`.stat-icon`)
- Panel header colors (`.panel-header h3`)
- Button primary background (`.btn-primary`)
- Form focus states

**When adding a new page:**
1. Add `--page-accent: var(--color-pagename);` to the viewer class
2. Add the color to styles.html if it doesn't exist (e.g., `--color-newpage: #HEXCODE;`)
3. Use shared styles from shared-page-styles.html
4. Only add page-specific CSS for unique components

**Shared styles include:** page header, view toggle, stats row, view panels, section header, panels, buttons, forms, modals, filter bar, empty states, pipeline board, pipeline cards, card components, badges, data tables, avatars

---

## Quality Checklist

Before completing any task, verify:

### Code Changes
- [ ] Both deploy/ and library/ versions updated (if API file)
- [ ] No hardcoded IDs (use getConfigValue())
- [ ] Error handling in place
- [ ] Caching implemented for data access functions

### Documentation
- [ ] CHANGELOG.md updated
- [ ] NEXT_STEPS.md updated
- [ ] about.html updated (if page changed)
- [ ] DATA_SCHEMA.md updated (if schema changed)

### Deployment
- [ ] Full file paths provided for ALL changed files
- [ ] Paths provided for BOTH deploy/ and library/ targets
- [ ] Clear indication of which Google Apps Script project each goes to

### Git
- [ ] Meaningful commit message
- [ ] Co-Authored-By line included
- [ ] Changes pushed to origin/main

---

## Common Mistakes to Avoid

1. **Forgetting library sync** - When updating deploy/team-api.gs, ALWAYS also update library/team-api.gs

2. **Hardcoding IDs** - Never hardcode Google Doc/Sheet IDs. Always use `getConfigValue('KEY_NAME')`

3. **Missing file paths** - Always provide full Windows paths after changes

4. **Incomplete documentation** - Update ALL relevant docs, not just code

5. **Editing wrong file** - For API logic changes, edit `library/*-api.gs` files (the full implementations). Deploy wrappers rarely need changes unless adding new functions.

6. **Forgetting about.html** - This is the user-facing documentation. Keep it current.

---

## Database Reference

| Database | Sheet ID Config Key | Purpose |
|----------|---------------------|---------|
| MO-DB_Solutions | SOLUTIONS_SHEET_ID | Solution metadata (includes deep_dive_date, deep_dive_url) |
| MO-DB_Contacts | CONTACTS_SHEET_ID | Stakeholder contacts + internal team (includes profile fields) |
| MO-DB_Agencies | AGENCIES_SHEET_ID | Organization hierarchy |
| MO-DB_Engagements | ENGAGEMENTS_SHEET_ID | Interaction logging |
| MO-DB_Needs | NEEDS_SHEET_ID | Survey responses |
| MO-DB_Updates | UPDATES_SHEET_ID | Parsed updates from meeting notes |
| MO-DB_Actions | ACTIONS_SHEET_ID | Action items |
| MO-DB_Milestones | MILESTONES_SHEET_ID | Solution milestones (IPA, ICD, ATP, F2I, ORR, OPS, Closeout) |
| MO-DB_Stories | STORIES_SHEET_ID | Communications story pipeline |
| MO-DB_Outreach | OUTREACH_SHEET_ID | Outreach events and conferences |
| MO-DB_Availability | AVAILABILITY_SHEET_ID | Team OOO calendar |
| MO-DB_Meetings | MEETINGS_SHEET_ID | Recurring meetings |
| MO-DB_Glossary | GLOSSARY_SHEET_ID | Terms and definitions |
| MO-DB_Access | ACCESS_SHEET_ID | Email whitelist for authentication |
| MO-DB_Config | (Script Property) | Configuration store |

---

## Session Start Checklist

When beginning a new session:

1. **Read this file** - Refresh on project rules
2. **Check NEXT_STEPS.md** - Understand current priorities
3. **Review CHANGELOG.md** - Know recent changes
4. **Ask about context** - If user mentions prior work, ask for specifics

---

## Key Files Reference

| File | Purpose | Update When |
|------|---------|-------------|
| `deploy/Code.gs` | Main entry, routing, CONFIG_KEYS | Adding config keys, pages |
| `deploy/index.html` | SPA shell, page routing | Adding new pages |
| `deploy/styles.html` | CSS variables, base styles | Adding new colors/variables |
| `deploy/shared-page-styles.html` | Shared page patterns (header, stats, panels, forms, modals) | Adding common patterns |
| `deploy/navigation.html` | Tab navigation | Adding/changing tabs |
| `deploy/about.html` | Platform documentation | ANY page changes |
| `CLAUDE.md` | Development rules | Rarely |
| `NEXT_STEPS.md` | Task tracking | Every session |
| `CHANGELOG.md` | Version history | Every release |
| `docs/DATA_SCHEMA.md` | Database schemas | Schema changes |

---

## Communication Guidelines

1. **Be specific about file locations** - Always use full paths
2. **Explain what changed and why** - Don't assume context carries over
3. **List ALL files that need deployment** - User deploys manually to GAS
4. **Indicate which GAS project** - NSITE-MO-Viewer vs MO-APIs Library
5. **Provide deployment order if it matters** - Some files depend on others

---

## Version Information

- **Current Version:** 2.1.1
- **Last Updated:** 2026-01-24
- **Repository:** https://github.com/CherrelleTucker/nsite-mo-viewer

---

## IN PROGRESS: Quality Review (2026-01-24)

A full codebase quality audit was conducted. This section tracks progress on implementing the recommendations.

### Completed (Recommendations 1-3)

- [x] **1. Add `_solutionsCache` to solutions-api.gs** - Added caching to `library/solutions-api.gs` following the same pattern as engagements-api.gs. Added `clearSolutionsCache()` function. Added wrapper to `deploy/solutions-api.gs`.

- [x] **2. Remove debug console.log statements** - Removed debug logging block from `deploy/sep.html` (lines 2121-2126 that logged "SEP re-render with data").

- [x] **3. Delete reports.html.bak** - Removed backup file from deploy folder.

**Files changed (need deployment):**

| File | Deploy To |
|------|-----------|
| `library/solutions-api.gs` | MO-APIs Library |
| `library/engagements-api.gs` | MO-APIs Library |
| `deploy/solutions-api.gs` | NSITE-MO-Viewer |
| `deploy/sep.html` | NSITE-MO-Viewer |
| `deploy/comms.html` | NSITE-MO-Viewer |
| `deploy/team.html` | NSITE-MO-Viewer |
| `deploy/implementation.html` | NSITE-MO-Viewer |
| `deploy/index.html` | NSITE-MO-Viewer |
| `deploy/Code.gs` | NSITE-MO-Viewer |

### Completed (Recommendations 4-7)

- [x] **4. Audit XSS** - Fixed critical vulnerability in `implementation.html` (unescaped `sol.core_id` in onclick handlers). Added escape functions to `team.html`. Added global `escapeHtml()` and `escapeAttr()` to `index.html` for all pages.

- [x] **5. Add input validation to write APIs** - Added `validateEngagementData_()` to `library/engagements-api.gs`. Validates required fields, activity types, directions, date format, and summary length.

- [x] **6. Standardize error handling in client JavaScript** - Enhanced `handleError()` in `index.html` to accept optional user message. Added `createErrorHandler(userMessage)` helper for cleaner API calls.

- [x] **7. Remove duplicate functions from Code.gs** - Replaced `loadConfigFromSheet()`, `getConfigValue()`, and `getDatabaseSheet()` with thin wrappers that delegate to `MoApi.*`. Removed unused `_configCache` variable.

### Completed (Recommendation 8 - Phase 1 & 2)

- [x] **8. CSS Consolidation Phase 1 & 2** - Created `shared-page-styles.html` with common patterns:
  - **Phase 1:** Page header, view toggle, stats row, view panels, section header, panels, buttons, forms, modals, filter bar, empty states
  - **Phase 2:** Pipeline board, pipeline cards, card components, badges, data tables, avatars
  - Pages now use `--page-accent` CSS variable for accent colors
  - Updated: sep.html, team.html, comms.html, implementation.html, index.html
  - Removed ~250+ lines of duplicated CSS
  - **Remaining (optional):** Responsive breakpoint consolidation, further component extraction

### Deferred (Recommendations 9-11) - DO LATER

- [x] **9. Sync Code.gs PAGES icons with navigation.html** - DONE: PAGES.icon values now match navigation.html exactly. Note: These icons are metadata only (not rendered from PAGES), kept in sync for documentation consistency.

- [ ] **10. Add automated tests** - As documented in `docs/TESTING_STRATEGY.md`.

- [ ] **11. SEP Pipeline toolbar cleanup** - The cycle selection dropdown, drag hint, and WS/TP legend look crowded. Consider: simplifying to icons-only, moving to a collapsed menu, or reducing visual weight.

- [ ] **12. Systematic SPA navigation null checks** - Async callbacks (google.script.run handlers) can fire after user navigates away, causing "Cannot set properties of null" errors. Not critical (doesn't break functionality), but clutters console. Pattern: add `if (!element) return;` guards at start of render functions. Affected files: comms.html (partially fixed), potentially others. Consider a systematic audit of all `withSuccessHandler` callbacks.

### Audit Summary (for reference)

**Overall Grade: B+** - Solid architecture, good documentation, consistent patterns. Issues found are refinements, not blockers.

**Strengths:**
- Library/wrapper pattern correctly implemented
- Config-driven (no hardcoded IDs)
- Caching pattern used in most places
- Documentation thorough and accurate

**Risk Areas:**
- XSS if untrusted data enters system
- Performance without caching on some APIs (now fixed for solutions)
- Code duplication in Code.gs

---

*This file should be updated when new patterns emerge or mistakes are identified.*
