# Claude Code Instructions for MO-Viewer

**Version:** 4.0.1 | **Updated:** 2026-02-08 | **Repository:** https://github.com/CherrelleTucker/nsite-mo-viewer

---

## Session Start Checklist

When beginning a new session:
1. **Read this file** - Understand project rules and architecture
2. **Check the System Architecture section** - Know how components interconnect
3. **Review "Common Mistakes to Avoid"** - Prevent known issues
4. **Ask about context** - If user mentions prior work, ask for specifics

---

## Development Status (February 2026)

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
- **White-label branding system** - Configurable app name, page names, colors via MO-DB_Config

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

- `[solution_id]` in square brackets links to MO-DB_Solutions.solution_id
- 🆕 emoji marks new updates to capture
- Nested bullets are included in update text

### Next Steps
- Complete historical backfill for all agenda sources
- Build Actions sync script (similar pattern)
- Test automated triggers for weekly/monthly syncs

---

### Comms Page Reorganization Project (v2.4.0) - COMPLETE

**Status:** ✅ Implemented and deployed
**Completed:** 2026-02-03

**Goal:** Transform Comms from a workflow management tool to a content library for the whole MO team, while preserving workflow features for the Comms team.

**What was built:**
- **Content Tab** (new default): Search-first interface with solution browsing, quick access cards, copy buttons
- **Assets Tab** (new): Visual grid with Drive iframe previews, upload dropzone with metadata form, detail modal
- **Events Tab**: Unchanged
- **Manage Tab**: Consolidated Pipeline, Coverage, Calendar, Priorities as sub-tabs

#### Tab Structure Change

| Current (6 tabs) | New (4 tabs) |
|------------------|--------------|
| Pipeline | → Manage > Pipeline |
| Events | → Events (unchanged) |
| Coverage | → Manage > Coverage |
| Calendar | → Manage > Calendar |
| Messaging | → Split: content to Content, priorities to Manage |
| Tools | → Presentation Builder moves to Content |

#### New Tab Purposes

| Tab | Primary Audience | Purpose |
|-----|------------------|---------|
| **Content** (default) | All MO team | Search & find approved content (blurbs, key messages, facts, quotes) |
| **Assets** | All MO team | Browse images, presentations, files with attribution |
| **Events** | All MO team | Event prep, guest lists (unchanged) |
| **Manage** | Comms team | Pipeline, coverage, calendar, priorities (sub-tabs) |

#### Schema Additions (MO-DB_CommsAssets)

New fields for file/image support:
- `asset_url` - Link to file (Google Drive)
- `asset_file_type` - ENUM: image, presentation, pdf, video, document, graphic
- `usage_rights` - ENUM: public-domain, nasa-media, internal-only, attribution-required
- `rights_holder` - Who owns it (for attribution)
- `thumbnail_url` - Optional preview image

Config addition:
- `COMMS_ASSETS_FOLDER_ID` - Google Drive folder for uploads

#### Key Implementation Notes

1. **Content Tab** - Search-first design with solution dropdown, grouped results by type
2. **Presentation Builder** - Becomes contextual action (shows when viewing solution content)
3. **Assets Tab** - Grid view with thumbnails, upload via drag-drop to Google Drive
4. **Manage Tab** - Sub-tab navigation (Pipeline, Coverage, Calendar, Priorities)
5. **Preserve all existing functions** - Just reorganize HTML structure

#### Files to Modify

- `database-files/comms-assets-schema.csv` - Add new columns
- `docs/DATA_SCHEMA.md` - Update CommsAssets schema
- `library/comms-assets-api.gs` - Add new fields, upload support
- `deploy/comms.html` - Major restructure (7700+ lines - be careful)
- `deploy/comms-assets-api.gs` - Add wrapper functions
- `CHANGELOG.md` - Document changes

#### Risk Mitigation

- comms.html is large - make incremental changes, test frequently
- Keep existing state objects, add new ones for Content/Assets
- Preserve all function signatures for backward compatibility
- SPA navigation guards (commsNavId) must work with new tab structure

---

### Future Development: Historical Updates Report

Design notes for improving the Reports > Historical Updates feature:

1. **Group updates by date** - Updates with the same meeting_date should be shown together under a single date header, not as separate entries
2. **Link date to source** - The date should be a clickable link to the source document (source_url field)
3. **Increase character limit** - Current 500 char truncation cuts off URLs. Increase to ~1000 chars or implement smarter truncation that preserves complete URLs
4. **Render bullet points** - Update text often contains bullet characters (•, ○, ■). Render these as proper HTML bulleted lists (`<ul><li>`) instead of plain text

---

## Client-Side Caching (v2.3.2+)

The app uses **SessionStorage-based caching** to dramatically improve page navigation speed.

### How It Works

1. **First visit** to a page: Data fetched from server (2-3s), cached in sessionStorage
2. **Return visit**: Data served from cache (~50ms)
3. **Cache TTL**: Varies by data type (see below)
4. **Session ends**: Cache cleared when browser closes

### Cache Configuration

| Data Type | TTL | Used By |
|-----------|-----|---------|
| `solutions` | 60 min | Implementation, SEP, Reports, Schedule, TopSheet |
| `contacts` | 60 min | SEP, Contacts |
| `agencies` | 60 min | SEP |
| `sepInit` | 15 min | SEP (combined init data) |
| `commsOverview` | 15 min | Comms |
| `teamMembers` | 30 min | Team |
| `meetings` | 30 min | Team |

### Key Components (index.html)

```javascript
// Core caching utility
DataCache.get(key, fetchFn, ttlMinutes)  // Get from cache or fetch
DataCache.clear(key)                      // Clear specific cache
DataCache.clearAll()                      // Clear all caches
DataCache.getStats()                      // Debug info

// Pre-wrapped API calls
CachedAPI.getSolutions()       // Returns Promise
CachedAPI.getContacts()
CachedAPI.getSEPInitData()
CachedAPI.getCommsOverview()
CachedAPI.getTeamMembers()
CachedAPI.getMeetings()

// Cache invalidation after saves
CachedAPI.invalidate.solutions()     // Clears solutions + sepInit
CachedAPI.invalidate.contacts()      // Clears contacts + sepInit
CachedAPI.invalidate.engagements()   // Clears sepInit
CachedAPI.invalidate.all()           // Clears everything
```

### Navigation Guards

Pages capture `navigationId` at init and check it in async callbacks:

```javascript
function init() {
  var navId = getNavigationId();  // Capture current navigation

  CachedAPI.getSolutions()
    .then(function(data) {
      // Abandon if user navigated away
      if (!isNavigationCurrent(navId)) return;
      // Process data...
    });
}
```

This prevents stale data from rendering if user clicks away before load completes.

### Refresh Button

Users can click the refresh icon in the navigation bar to:
1. Clear all cached data (`DataCache.clearAll()`)
2. Reload the current page content

### When to Invalidate Cache

**Always call `CachedAPI.invalidate.*()` after save operations:**
- After creating/updating an engagement → `CachedAPI.invalidate.engagements()`
- After updating a solution → `CachedAPI.invalidate.solutions()`
- After updating a contact → `CachedAPI.invalidate.contacts()`

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
│  MO-DB_Solutions   │ Solution master data (solution_id is primary key)      │
│  MO-DB_Contacts    │ Multi-tab: People + Roles (stakeholder contacts)       │
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
│  team.html           │ Team info, actions, availability, meetings, kudos      │
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
| MO-DB_Solutions | `solution_id` | solutions-api.gs | Primary key for solutions |

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

9. **Creating duplicate directories** - NEVER create `core/`, `instance-*/`, or similar directories. The `deploy/` folder is the SINGLE SOURCE OF TRUTH. White-labeling is done via MO-DB_Config configuration, not code copies. (Learned 2026-02-05: obsolete directories caused major sync issues)

10. **Using getSheets()[0] instead of getSheetByName()** - NEVER access tabs by index. All databases have `_Lookups` tabs that can shift tab order. Always use `ss.getSheetByName('TabName')`. See the Database Reference table for correct tab names.

---

## Testing

### Browser Console Does NOT Work

**CRITICAL: Browser console (F12) does not work in Apps Script test deployments.** Console.log statements in HTML/JS files are not visible in the browser developer tools when running the test deployment.

**Always use these methods instead:**

1. **Logger.log() in Apps Script Editor** - For testing API functions
   ```javascript
   function testMyFunction() {
     var result = myApiFunction('param');
     Logger.log(JSON.stringify(result, null, 2));
   }
   ```
   Run the function, then View → Logs to see output.

2. **Alert/Toast in UI** - For quick client-side debugging
   ```javascript
   alert('Debug: ' + JSON.stringify(data));
   // or use the app's toast system
   showToast('Debug: ' + someValue, 'info');
   ```

3. **Temporary UI element** - For inspecting data structures
   ```javascript
   document.getElementById('someDiv').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
   ```

### Testing Workflow

1. **API functions** → Test in Apps Script editor with Logger.log()
2. **UI interactions** → Use alert() or showToast() for debugging
3. **Data flow** → Add temporary visible output, then remove after debugging
4. **Production deployment** → Console.log may work, but don't rely on it

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

| solution_id Pattern | Earthdata Source |
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

**IMPORTANT: `deploy/` is the SINGLE SOURCE OF TRUTH for all web app code.**

Do NOT create alternative directories like `core/`, `instance-*/`, or similar. White-labeling is achieved through **MO-DB_Config** configuration, not separate code directories. The `setup-wizard/` helps new teams create their own config sheets.

```
nsite-mo-viewer/
├── deploy/           # SINGLE SOURCE - Files to copy to NSITE-MO-Viewer (Apps Script)
├── library/          # Files to copy to MO-APIs Library (Apps Script)
├── setup-wizard/     # Creates new team instances via config (NOT code copies)
├── scripts/          # Python import/processing scripts
├── database-files/   # Local Excel/CSV database backups
├── docs/             # Technical documentation
├── extensions/       # Browser extensions
└── training/         # Training materials
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

**CRITICAL: Always use `getSheetByName('TabName')`, NEVER `getSheets()[0]`.** Tab order can shift when `_Lookups` or other tabs are added. The centralized `DEFAULT_TAB_NAMES_` map in `config-helpers.gs` defines the primary tab name for each config key.

| Database | Config Key | Primary Tab | Other Tabs |
|----------|------------|-------------|------------|
| MO-DB_Access | ACCESS_SHEET_ID | Whitelist | _Lookups |
| MO-DB_Actions | ACTIONS_SHEET_ID | Actions | _Lookups |
| MO-DB_Agencies | AGENCIES_SHEET_ID | Agencies | Departments, Organizations, _Lookups |
| MO-DB_Availability | AVAILABILITY_SHEET_ID | Availability | _Lookups |
| MO-DB_BugLog | BUGLOG_SHEET_ID | Backlog | _Lookups |
| MO-DB_CommsAssets | COMMS_ASSETS_SHEET_ID | FileLog | _Lookups |
| MO-DB_Contacts | CONTACTS_SHEET_ID | People | Roles, _Lookups |
| MO-DB_Engagements | ENGAGEMENTS_SHEET_ID | Engagements | _Lookups |
| MO-DB_Glossary | GLOSSARY_SHEET_ID | Glossary | _Lookups |
| MO-DB_Kudos | KUDOS_SHEET_ID | Kudos | _Lookups |
| MO-DB_Meetings | MEETINGS_SHEET_ID | Meetings | _Lookups |
| MO-DB_Milestones | MILESTONES_SHEET_ID | Milestones | _Lookups |
| MO-DB_Needs | NEEDS_SHEET_ID | Needs | _Lookups |
| MO-DB_Outreach | OUTREACH_SHEET_ID | Outreach | _Lookups |
| MO-DB_Parking | PARKING_LOT_SHEET_ID | ParkingLot | _Lookups, Statuses, ItemTypes, Priorities |
| MO-DB_Solutions | SOLUTIONS_SHEET_ID | Core | Comms, Milestones, _Lookups |
| MO-DB_Stories | STORIES_SHEET_ID | Stories | _Lookups |
| MO-DB_Templates | TEMPLATES_SHEET_ID | Templates | _Lookups, Categories, Phases, Placeholders |
| MO-DB_Updates | UPDATES_SHEET_ID | 2026 | 2025, 2024, Archive, _Lookups |
| MO-DB_Config | (Script Property) | Config | — |

---

## Design System

**IMPORTANT: See `docs/STYLE_GUIDE.md` for comprehensive component patterns and CSS conventions.**

Before creating any new UI components, ALWAYS check:
1. `docs/STYLE_GUIDE.md` - Component patterns and usage examples
2. `deploy/styles.html` - CSS variables (colors, spacing, typography)
3. `deploy/shared-page-styles.html` - Shared component CSS

### Icons
- **Use Material Icons** - NOT Feather icons
- Syntax: `<span class="material-icons">icon_name</span>`
- Reference: https://fonts.google.com/icons

### Key Shared Components (from shared-page-styles.html)
- Panels: `.panel`, `.panel-header`, `.panel-content`
- Section headers: `.section-header`
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`, `.btn-full`
- View toggles: `.view-toggle`, `.view-btn`, `.view-toggle-compact`
- Filter chips: `.filter-chips`, `.chip`
- Filter search: `.filter-search`
- Stats: `.stats-row`, `.stat-card`
- Forms: `.form-group`, `.form-row`, `.rich-text-field`
- Modals: `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-body`

### Critical CSS Rules
- **Rich text fields (contenteditable)** MUST have `background: #fff` and `border` - they're invisible otherwise
- **Use CSS variables** - never hardcode colors, spacing, or font sizes
- **Set `--page-accent`** on viewer containers for page-specific theming

---

## Access Control

MO-Viewer uses **passphrase + whitelist authentication** (NOT OAuth).

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

### ⛔ CRITICAL: Do NOT Use Session.getActiveUser() or Session.getEffectiveUser()

**These methods require OAuth scopes that are NOT configured for this web app.**

```javascript
// ❌ WRONG - Will fail with "permissions not sufficient" error
var email = Session.getActiveUser().getEmail();
var email = Session.getEffectiveUser().getEmail();

// ✅ CORRECT - Trust the session-based auth
// Users already authenticated via passphrase + whitelist to reach the page
function checkAuthorization() {
  return { authorized: true, email: 'session-user', message: 'Authorized via session' };
}
```

**Why this matters:**
- The web app is deployed WITHOUT the `userinfo.email` OAuth scope
- Session methods fail silently or throw errors without this scope
- Users already proved their identity through passphrase + whitelist sign-in
- API functions called from the page can trust the user is authenticated

**If you need user identity in an API function:**
- Pass it from the client (the session already validated them)
- Or use `logged_by` fields populated client-side

---

## UI/CSS Patterns

### Toast Notifications

Toasts must have `position: fixed` and high `z-index` to appear above modals:

```css
.toast {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  z-index: 10001; /* Above modals (z-index: 1000) */
}
```

### Modal Z-Index Hierarchy

| Element | z-index |
|---------|---------|
| Modal overlay | 1000 |
| Modal content | 1001 |
| Toast notifications | 10001 |
| Skip link (a11y) | 10000 |

### Form Fields

All form inputs must have visible styling:

```css
.form-group input, .form-group select, .form-group textarea {
  background: #fff;
  border: 1px solid var(--color-border);
  /* ... other styles */
}

/* For contenteditable divs used as rich text fields */
.form-group .rich-text-field {
  background: #fff;
  border: 1px solid var(--color-border);
  min-height: 80px;
}
```

### Activity Type Icons

When adding new activity types, update the icon mapping in ALL locations:

```javascript
var typeIcons = {
  'Email': 'email',
  'Phone': 'phone',
  'Meeting': 'groups',
  'Webinar': 'videocam',
  'Workshop': 'handyman',
  'Conference': 'location_city',
  'Site Visit': 'place',
  'Training': 'school'
};
```

**Locations to update when adding activity types:**
1. `library/engagements-api.gs` - ENGAGEMENT_ACTIVITY_TYPES constant
2. `deploy/sep.html` - Quick Log form dropdown
3. `deploy/sep.html` - Filter dropdown
4. `deploy/sep.html` - Edit form dropdown
5. `deploy/sep.html` - typeIcons objects (multiple locations)

---

## White-Label Branding Configuration

The platform supports white-labeling through configuration keys in MO-DB_Config. This allows teams to customize the app name, colors, and page terminology without code changes.

### Branding Config Keys

Add these key-value pairs to MO-DB_Config to customize branding:

| Key | Description | Default | Example |
|-----|-------------|---------|---------|
| **Application** | | | |
| `APP_NAME` | Application name in header/footer | `Viewer` | `ESDIS Viewer` |
| `ORG_NAME` | Organization name (shown in page title) | *(empty)* | `NSITE MO` |
| `APP_TAGLINE` | Optional tagline in header | *(empty)* | `Unified Dashboard` |
| **Page 1 (Primary)** | | | |
| `PAGE_1_KEY` | URL key for page 1 | `implementation` | `projects` |
| `PAGE_1_NAME` | Display name for page 1 tab | `Implementation` | `Projects` |
| `PAGE_1_ICON` | Material icon name for tab | `folder` | `work` |
| **Page 2 (Primary)** | | | |
| `PAGE_2_KEY` | URL key for page 2 | `sep` | `people` |
| `PAGE_2_NAME` | Display name for page 2 tab | `SEP` | `People` |
| `PAGE_2_ICON` | Material icon name for tab | `group` | `groups` |
| **Page 3 (Primary)** | | | |
| `PAGE_3_KEY` | URL key for page 3 | `comms` | `promos` |
| `PAGE_3_NAME` | Display name for page 3 tab | `Comms` | `Promos` |
| `PAGE_3_ICON` | Material icon name for tab | `chat` | `campaign` |
| **Colors** | | | |
| `COLOR_PRIMARY` | Main brand color (header) | `#0B3D91` | `#1A5F2A` |
| `COLOR_PRIMARY_LIGHT` | Light variant | `#1E5BB8` | `#2E7D32` |
| `COLOR_PRIMARY_DARK` | Dark variant | `#082B66` | `#145A1E` |
| `COLOR_ACCENT` | Accent color | `#0095D9` | `#FFB300` |
| `COLOR_PAGE_1` | Page 1 accent color | `#2E7D32` | `#0277BD` |
| `COLOR_PAGE_2` | Page 2 accent color | `#1565C0` | `#7B1FA2` |
| `COLOR_PAGE_3` | Page 3 accent color | `#7B1FA2` | `#C62828` |

### Example: NSITE MO Configuration

```
APP_NAME        = NSITE MO Viewer
ORG_NAME        = NSITE MO
APP_TAGLINE     =
PAGE_1_NAME     = Implementation-NSITE
PAGE_2_NAME     = SEP-NSITE
PAGE_3_NAME     = Comms-NSITE
COLOR_PRIMARY   = #0B3D91
```

### Example: ESDIS Configuration

```
APP_NAME        = ESDIS Viewer
ORG_NAME        = ESDIS
PAGE_1_NAME     = Projects
PAGE_1_ICON     = work
PAGE_2_NAME     = Stakeholders
PAGE_2_ICON     = groups
PAGE_3_NAME     = Outreach
PAGE_3_ICON     = campaign
COLOR_PRIMARY   = #1A5F2A
COLOR_PAGE_1    = #0277BD
```

### Deployment Checklist for New Teams

1. **Copy Google Sheets databases** (Solutions, Contacts, Updates, etc.)
2. **Create MO-DB_Config** with your sheet IDs and branding keys
3. **Copy Apps Script projects** (MO-APIs Library + Web App)
4. **Update Script Properties** - Set `CONFIG_SHEET_ID` to your config sheet
5. **Set up MO-DB_Access** with your team's email whitelist
6. **Deploy** the web app and library
7. **Test** - Verify branding appears correctly

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
- [ ] **State Management Navigation Guards** - Some pages have incomplete coverage:
  - Team (Actions section): No guards (HIGH priority)
  - SEP: ~60% coverage (MEDIUM)
  - Reports: ~70% coverage (MEDIUM)
  - Contacts: ~80% coverage (LOW)
  - Implementation: ~80% coverage (LOW)
  - Impact: UI glitches if user navigates away during async operations (not data corruption)

---

## Full Review Suite Procedure

**Trigger phrases:** "run full testing suite", "run all reviews", "comprehensive review"

---
### ⛔ STOP - READ THIS BEFORE EVERY REVIEW ⛔

**DO NOT CUT CORNERS. DO NOT RUSH. DO NOT DO SURFACE-LEVEL SCANS.**

This is a PRODUCTION-READY product. The user's job security depends on quality.

**Every time you want to say "passed" or "looks good":**
1. STOP
2. Ask yourself: "Did I actually READ the code or just count grep matches?"
3. If you just counted matches, GO BACK and investigate properly
4. A review is NOT complete until you've traced data flows and verified fixes

**If you catch yourself rushing:** STOP. Slow down. Quality over speed. ALWAYS.

---

When the user requests a full review suite, follow this procedure exactly:

### Step 1: Create Review Tasks

Create a task for EACH of the 13 reviews using TaskCreate:
```
Review 1: Security Audit
Review 2: Error Handling
Review 3: Performance
Review 4: DRY Audit
Review 5: API Consistency
Review 6: State Management
Review 7: Accessibility
Review 8: Mobile/Responsive
Review 9: Loading States
Review 10: Schema Validation
Review 11: Data Flow
Review 12: Code Comments
Review 13: About Page Accuracy
```

### Step 2: Execute Each Review Systematically

For EACH review (in order):
1. Mark task as `in_progress`
2. Run the specific scans/checks listed in the checklist below
3. **READ THE CODE** - Don't just count grep matches. Actually examine:
   - How values are used (innerHTML? className? function parameters?)
   - Whether validation exists for user inputs
   - How data flows through the system
   - Edge cases and error paths
4. Document ALL findings with file:line references
5. **Fix immediately:** CRITICAL (P0) and HIGH (P1) issues
6. **Log to BUG_TRACKER.md:** MEDIUM (P2) and LOW (P3) issues
7. Mark task as `completed` only when review is fully done
8. Move to next review

**What "thorough" means:**
- Don't declare "passed" after a grep count - investigate what the matches mean
- Trace user input from API → database → UI to find XSS/injection paths
- Check that enum values used in innerHTML/className are validated at the backend
- Verify async callbacks check element existence before DOM manipulation
- Actually read 5-10 code samples from grep results, not just the first one

### Step 3: Provide Summary

After ALL 13 reviews complete:
1. Summary of issues found per review
2. List of files modified
3. List of items logged to BUG_TRACKER.md
4. Smoke tests for user to verify fixes

### Review-Specific Scan Commands

| Review | What to Scan |
|--------|--------------|
| 1. Security | `innerHTML` without escapeHtml, `eval`, hardcoded IDs, missing input validation |
| 2. Error Handling | `google.script.run` without `withFailureHandler`, inconsistent return formats |
| 3. Performance | Redundant API calls, large response functions, missing caching |
| 4. DRY | Duplicate functions, `JSON.parse(JSON.stringify)`, repeated patterns |
| 5. API Consistency | `indexOf !== -1`, boolean returns on write functions, naming conventions |
| 6. State Management | Async callbacks without navigation guards, missing `isSaving` guards |
| 7. Accessibility | Missing `aria-label`, no keyboard handlers, missing focus states |
| 8. Mobile/Responsive | Fixed widths, missing breakpoints, overflow issues |
| 9. Loading States | Missing spinners, empty states, error states |
| 10. Schema Validation | Column names in code vs database headers, required field checks |
| 11. Data Flow | Trace one entity end-to-end, verify transformations |
| 12. Code Comments | Complex functions without explanations |
| 13. About Page | Version number, feature list, database list accuracy |

### Important Rules

- **DO NOT skip reviews** - complete all 13 in order
- **DO NOT mark complete prematurely** - only after all scans run and issues addressed
- **DO NOT forget to log deferred items** - everything P2+ goes to BUG_TRACKER.md
- **DO NOT do surface-level grep scans** - this is a PRODUCTION product, not a hobby project
- **DO investigate matches** - grep finds patterns, you must investigate what they mean
- **DO trace data flows** - user input → API → database → UI rendering = XSS check
- **ALWAYS provide smoke tests** after fixes before moving to next review
- **STAY ON TASK** until user confirms all reviews complete

### Example: XSS Review (What Thorough Looks Like)

**Bad (surface scan):**
```
Grep for innerHTML → found 56 matches
Grep for escapeHtml → found 366 uses
"Looks like escapeHtml is used. Review passed."
```

**Good (thorough review):**
```
1. Grep for innerHTML → 56 matches
2. For each match, check: Is the value escaped?
3. Found: `capitalizeFirst(event.event_type)` in innerHTML - NOT escaped
4. Trace: Where does event_type come from?
5. Check API: Does createEvent validate event_type?
6. Found: NO validation! User could inject "<script>alert(1)</script>"
7. Fix: Add backend validation in outreach-api.gs
8. Verify: Now invalid event_type returns error
```

---

## Comprehensive Review Checklist

Work through these reviews systematically to ensure webapp quality.

### Code Quality
- [x] **1. Security Audit** - XSS vulnerabilities, input validation, data sanitization, access control gaps (completed 2026-01-29; re-run 2026-02-04: XSS fixes in 5 HTML files, auth guards added to 45+ API wrappers, backend enum validation in 4 API files)
- [x] **2. Error Handling Review** - Consistent patterns, user-friendly messages, logging, graceful failures (completed 2026-01-29, fixes deployed 2026-01-30: added withFailureHandler to 4 comms.html calls, fixed createAction return type consistency, fixed invisible toast text)
- [x] **3. Performance Audit** - API response sizes, redundant calls, caching opportunities, render optimization (completed 2026-01-30: global search early termination, SEP page 9→2 API calls via getSEPInitData, response size monitoring added to high-risk endpoints)

### Architecture
- [x] **4. DRY Audit** - Duplicate code across pages, opportunities for shared utilities (completed 2026-01-30: Team.escapeHtml security fix, global closeModal/showToast utilities, date formatting consolidation; 2026-02-04: added shared validation utilities to config-helpers.gs)
- [x] **5. API Consistency** - Naming conventions, return formats, parameter patterns across all APIs (completed 2026-01-30: standardized write returns to {success, data, error}, cache functions to private suffix)
- [x] **6. State Management** - How each page handles state, potential race conditions, stale data (completed 2026-01-30: element existence checks in async handlers, isSaving guards to prevent double-submit; 2026-02-04: documented remaining gaps as known issues - see Deferred section)

### User Experience
- [x] **7. Accessibility Audit** - Keyboard navigation, screen reader support, color contrast, focus states (completed 2026-01-30: skip link, focus-visible styles, aria-labels on 26 modal close buttons and icon buttons, Escape key closes modals, toast aria-live)
- [x] **8. Mobile/Responsive Review** - Layout issues on different screen sizes (completed 2026-01-30: quick fix - stats-row responsive breakpoints at 1024px and 600px)
- [x] **9. Loading States** - Spinners, skeletons, empty states, error states across all views (completed 2026-01-30: consolidated 8 duplicate .empty-state definitions into shared style)

### Data Integrity
- [x] **10. Schema Validation** - Column names match between code and databases, required fields enforced (completed 2026-01-30: added backend validation to 8 write functions across 6 API files; 2026-02-04: added enum validation to 4 more API files)
- [x] **11. Data Flow Audit** - Trace data from source docs → sync scripts → databases → APIs → UI (completed 2026-01-30: fixed solution/solution_id column inconsistency, renamed extractSolutionName_ to extractSolutionId_, added MoApi fallback, replaced indexOf with includes)

### Documentation
- [x] **12. Code Comments** - Missing explanations for complex logic (completed 2026-01-30: added comments to 10 complex areas in sync-common.gs, actions-api.gs, outreach-api.gs)
- [x] **13. About Page Accuracy** - Does documentation match current functionality? (completed 2026-01-30: updated version 2.2.0→2.2.12, database count 15→17, architecture diagram includes Top Sheet, Team views includes Parking Lot; 2026-02-04: verified 2.4.1 accurate)

---

*This file should be updated when new patterns emerge or mistakes are identified.*
