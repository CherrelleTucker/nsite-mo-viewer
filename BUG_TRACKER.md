# MO-Viewer Bug Tracker

**Created:** 2026-02-06
**Purpose:** Track P2 (Medium) and P3 (Low) issues found during full review suite.
P0 (Critical) and P1 (High) issues are fixed immediately during review.

---

## Open Issues

### Security — Review Suite v4.0.4 (2026-02-10)

**SEC-07** | P2 | comms.html:5165 | className injection via `story.content_type`
- `'type-' + (story.content_type || 'story')` concatenated into class attribute without whitelist
- Fix: use whitelist map of valid content types → class names

**SEC-08** | P2 | comms.html:6823 | className injection via `blurb.status`
- `'dot-' + (blurb.status || 'idea')` concatenated into class attribute without whitelist
- Fix: whitelist valid status values before className construction

**SEC-09** | P2 | contacts.html:1539 | className injection via `contact.champion_status`
- `'champion-' + contact.champion_status.toLowerCase()` in class attribute
- Same pattern at line 1589 (renderContactTable)
- Fix: whitelist valid champion_status values

**SEC-10** | P2 | library/milestones-api.gs:499 | `updateMilestone` field values not validated
- Writable fields (target_date, status, url, notes) written without value validation
- Fix: validate date format, whitelist status enum, limit string lengths

**SEC-11** | P3 | Code.gs:216,888,1124,1489 | Session.getActiveUser/getEffectiveUser calls
- All wrapped in try-catch with graceful fallback (no functional impact)
- initializePlatform (line 1489) is editor-only, so Session works there
- Known issue from prior reviews; low risk with current error handling

### Comms-NSITE Bugs (2026-02-08)

**COMMS-005** | P3 | library/outreach-api.gs | guest_list should use guest_list_contact_id
- Currently stores guest names as text; should store contact_id FKs instead
- Requires: schema change in MO-DB_Outreach (add guest_list_contact_id column), API update to resolve IDs to names for display, migration of existing text data to contact IDs
- Status: **DEFERRED** — schema change, not safe before demo

### Error Handling — Review Suite v4.0.4 (2026-02-10)

**ERR-03** | P2 | library/*.gs | Write function return inconsistency
- `createAction()` returns `{ success, data: actionId }` but `updateAction()` returns `{ success, error }` without data on success
- Pattern varies slightly across APIs; should standardize to always return `{ success, data, error }`

**ERR-02** | P3 | library/solutions-api.gs:443 | `updateSolutionSEPMilestone` returns non-standard format
- Returns `{ success, solutionId, milestone, date }` instead of `{ success, data: {...} }`

### Performance

**PERF-03** | P3 | contacts.html:1244 | `getContactStats()` not cached
- Called every Contacts page load, data changes infrequently

**PERF-04** | P3 | index.html ~700 | `preloadCommon()` defined but never called
- Dead code — could preload solutions/contacts on app startup

### DRY

**DRY-03** | P3 | topsheet.html:879 | `formatDate()` uses different format ("1 Jan 2026") vs global ("Jan 1, 2026")
- Inconsistent date formatting across pages — topsheet diverges from standard

**DRY-06** | P3 | access-denied.html:357 | Duplicate `escapeHtml` using different implementation (DOM textContent)
- Global at index.html:1404 uses string replacement; access-denied uses DOM-based approach
- setup-wizard/scripts.html:458 also has simplified version missing single-quote escape

**DRY-07** | P3 | library/*.gs | 127+ filter() calls, many could use `filterByProperty()`
- comms-assets-api.gs:1110-1113 — 4 consecutive asset_type filters (ideal candidate)
- parking-lot-api.gs:517-519 — status-based filters
- solutions-api.gs:276-278 — sep_active boolean normalization
- filterByProperty() already exists in config-helpers.gs:369 but underused

### API Consistency — Review Suite v4.0.4 (2026-02-10)

**API-02** | P2 | library/milestones-api.gs:511 | `.indexOf(h) !== -1` should be `.includes(h)`
- membership check anti-pattern in updateMilestone WRITABLE_FIELDS check

**API-03** | P2 | library/outreach-api.gs:845,1000 | `.indexOf(email)` should be `.includes(email)`
- guest list and attendee list membership checks

**API-04** | P3 | library/goals-api.gs:536, library/team-api.gs:192 | `.indexOf('prefix') === 0` should be `.startsWith()`
- prefix checks using indexOf instead of startsWith

**API-01** | P3 | library/*.gs | 8 functions with inconsistent underscore naming convention
- Functions with `_` suffix called from public contexts: `countUniqueAgencies_()`, `performEventSearch_()`, `searchWithGoogleAPI_()`, `generateSearchSuggestions_()`, `detectEventType_()`
- Debug/internal functions missing `_` suffix: `debugGetSolutions()`, `getSampleSolutions()`, `getImplementationViewerHTML()`
- Fix: standardize — private helpers get `_`, public API functions don't

### State Management — Review Suite v4.0.4 (2026-02-10)

**STATE-06** | P2 | deploy/team.html:5625 | `loadActions()` failure handler missing navigation guard
- Error handler does DOM manipulation without checking `isNavigationCurrent()`
- Could show stale error message if user navigated away

**STATE-05** | P3 | reports.html | NO navigation guards on report generation
- Report loads take 2-3s; user could navigate away during generation
- Lower risk since lazy-loaded on demand (user action, not auto-init)

### Accessibility

**A11Y-07** | P2 | All pages | Search inputs missing aria-label (contacts:58, comms:371, sep:213, implementation:155, team:99)
- Placeholder text alone not sufficient for screen readers; add aria-label to each search input

**A11Y-08** | P2 | All pages | Decorative Material Icons (~605) missing aria-hidden="true"
- Most icons are decorative (next to text labels) but announce to screen readers
- Phase fix: bulk add aria-hidden="true" to icons that have adjacent text labels

**A11Y-09** | P2 | All modals | No focus trap implementation in any of 34+ modals
- Tab can escape modal to background content; no focus restoration on close
- Standard pattern needs focus management utility in shared code

**A11Y-04** | P2 | index.html | `aria-live` only on toast container (1 instance app-wide)
- Dynamic content areas (filtered results, search results, loading states) lack `aria-live` announcements
- Screen readers won't announce when content updates after filter/search


**A11Y-06** | P3 | comms.html | Form labels without `for` attribute
- comms.html:228-251 — labels visible but not semantically linked to inputs
- Fix: add `for="inputId"` to all `<label>` elements

### Mobile/Responsive


### Loading States

### Schema Validation — Review Suite v4.0.4 (2026-02-10)

**SCHEMA-08** | P1 | library/*.gs (19 locations) + deploy/*.gs (20+ locations) | Systemic `getSheets()[0]` fallback
- Nearly every sheet accessor uses `ss.getSheetByName('Tab') || ss.getSheets()[0]`
- If tab name changes/mismatches, silently reads wrong tab (likely `_Lookups`)
- Central infrastructure: `config-helpers.gs:94,509,573` (`getDatabaseSheet`, `loadSheetData_`, `getSheetForWrite_`)
- Per-file accessors: solutions:99,456 stories:23 outreach:22 kudos:55 team:124,357,600,1138 templates:25 parking:25 milestones:33 comms-assets:43,82
- Fix: replace `|| ss.getSheets()[0]` with `throw new Error('Tab not found')` — follow `loadSheetTab_()` pattern at config-helpers.gs:606

**SCHEMA-01** | P2 | actions-api.gs | Column name mismatches between code and DATA_SCHEMA.md
- Code uses `assigned_to` but schema says `owner`
- Code uses `updated_at` but schema says `last_updated`
- Code uses `task` as alternative field, schema shows `action_id` as primary
- Fix: standardize naming — update schema OR rename columns in database

**SCHEMA-09** | P2 | library/contacts-api.gs:362-373 | Dead functions filter on dropped columns
- `getContactsByDepartment()` and `getContactsByAgency()` filter on `department`/`agency` — dropped in v4.0.0
- Always return empty arrays; replaced by `agency_id` FK + `resolveAgency_()` in `getContactsMultiFilter()`
- Fix: remove or refactor to use `agency_id` with resolver

**SCHEMA-10** | P2 | library/solutions-api.gs:124 | `parseInt` on string-type `core_cycle`
- `parseInt(a.core_cycle)` where `core_cycle` is "C1", "C2" etc. — `parseInt("C1")` returns NaN
- Sort by cycle produces unpredictable results
- Fix: use `parseInt(String(a.core_cycle).replace(/\D/g, ''))` or compare as strings

**SCHEMA-11** | P2 | library/engagements-api.gs:684 | `logQuickEngagement` missing required `solution_id`
- Constructs engagement data but omits `solution_id` which is validated as required by `validateEngagementData_()`
- Function will always fail validation
- Fix: add `solution_id` as required parameter or make it optional for quick-log

**SCHEMA-12** | P2 | library/outreach-api.gs:365,371 | `deadline` vs schema `submission_deadline`
- Code references `deadline` column; DATA_SCHEMA.md defines `submission_deadline`
- If database header is `submission_deadline`, code will never find deadline values
- Fix: verify actual database header and align code or schema

**SCHEMA-13** | P2 | library/actions-api.gs:1104 | Undefined variable `taskPreview` in Slack notification
- `taskPreview` referenced but undefined in scope — would cause ReferenceError at runtime
- Fix: define `taskPreview` or replace with correct variable name

**SCHEMA-07** | P3 | engagements-api.gs:55-64 | "Workshop" in code but not in DATA_SCHEMA.md enum
- ENGAGEMENT_ACTIVITY_TYPES includes "Workshop" but schema only lists 7 types
- Code is likely correct (CLAUDE.md mentions Workshop as intentional addition)
- Fix: update DATA_SCHEMA.md to include Workshop in activity_type enum

**SCHEMA-14** | P3 | library/outreach-api.gs:87 | EVENT_TYPES constant incomplete
- Missing `presentation`, `training`, `other` that are accepted by validation at line 172
- Constant used for UI display only, not validation — cosmetic issue
- Fix: sync constant with validation array

**SCHEMA-15** | P3 | library/config-helpers.gs:456-476 | DEFAULT_TAB_NAMES_ GOALS → 'Objectives' vs CLAUDE.md 'MissionVision'
- goals-api.gs uses explicit tab names so no functional impact
- Fix: update map to 'MissionVision' or document the inconsistency

**SCHEMA-16** | P3 | deploy/quadchart-data.gs, deploy/st-report-data.gs | Solution columns not in DATA_SCHEMA.md
- References `earthdata_status_summary`, `earthdata_purpose`, `lead_name`, milestone memo URLs, `ipa`, `icd`, `project_plan`, `sponsor_agency`, `primary_agency`
- All use safe `|| ''` fallback; schema documentation is incomplete
- Fix: audit Core tab headers and update DATA_SCHEMA.md

### Data Flow — Review Suite v4.0.4 (2026-02-10)

**FLOW-03** | P2 | deploy/st-report-data.gs:195,208,343 | Timezone sensitivity in status derivation
- `new Date()` uses server timezone; `parseDate_ST_("2026-02-10")` creates midnight UTC
- Milestone targeted for today could be marked "Actual" instead of "Planned" depending on time of day
- Fix: normalize both sides to date-only comparison (strip time component)

**FLOW-04** | P2 | library/contacts-api.gs:362-373 | Dead filter functions (same as SCHEMA-09)
- `getContactsByDepartment()` and `getContactsByAgency()` filter on dropped columns — always return []

**FLOW-05** | P2 | deploy/team.html:6458,6389 | `criteria_owner_contact_id` displayed as raw ID
- Shows "CON_johnsmi" instead of human-readable name "John Smith"
- Fix: resolve contact_id to display name using contacts data

**FLOW-06** | P2 | deploy/sync-common.gs:697 | Dedup key mismatch for legacy → bracket format transition
- Re-running sync after agenda updates from legacy to bracket format creates duplicates
- `update.solution` (parsed text) vs stored `solution_id` won't match after format change
- Fix: normalize both sides to solution_id before key creation

**FLOW-01** | P3 | library/solutions-api.gs:~441 | Cache not invalidated after SEP milestone write
- `_solutionsCache` persists after `updateSolutionSEPMilestone()` completes
- Low risk: Apps Script short-lived execution contexts reset cache naturally
- Fix: add `clearSolutionsCache_()` call after successful write

**FLOW-02** | P3 | All write operations | No audit trail in UPDATE_HISTORY table
- Schema defines MO-DB_Update_History (Section 8) but no write function populates it
- Milestone updates, contact changes, engagement creates have no audit log
- Fix: implement logUpdate() calls after successful writes

**FLOW-07** | P3 | deploy/reports.html:3405-3409 | ST Accomplishments clipboard copy omits `source` column
- UI renders Date, Title, Additional Info, Source — but copy only outputs first 3
- Fix: add `a.source` to the tab-separated output

**FLOW-08** | P3 | deploy/st-report-data.gs:355 | `admin_default_in_dashboard` filter includes empty values
- Empty/undefined values pass the filter, potentially showing test/draft solutions
- May be intentional to default-include new solutions

### Code Comments — Review Suite v4.0.4 (2026-02-10)

**COMMENT-04** | P3 | deploy/quadchart-data.gs:195 | Stale comment about "temporary" actions workaround
- Says "until dedicated Actions table is populated" — Actions DB now exists
- Fix: update comment to explain this function parses solution text fields as supplementary source

**COMMENT-05** | P3 | deploy/sep.html:4394 | Stale TODO
- "TODO: Show engagements filtered by solution" — feature already exists or is no longer relevant
- Fix: remove or update with specific context

**COMMENT-06** | P3 | deploy/sync-stories-from-tracking.gs:18 | Stale `@version 1.0.0`
- Project is at v4.0.0; no other files use @version tags
- Fix: remove the @version tag

**COMMENT-07** | P3 | library/outreach-api.gs:1151 | Missing algorithm comment on `findPotentialConnections_`
- 56-line O(n^2) pairwise comparison with non-obvious scoring logic
- Fix: add comment explaining pairwise comparison, connection criteria, and the slice(0,20) cap

**COMMENT-08** | P3 | library/outreach-api.gs:1450 | Missing algorithm comment on `findPotentialGuestsFromEngagements_`
- 143-line multi-step guest discovery pipeline
- Fix: add overview comment describing the multi-source discovery and ranking heuristic

**COMMENT-09** | P3 | library/goals-api.gs:29 | Missing category abbreviation explanation
- `GOALS_CATEGORY_ORDER_` array uses unexplained abbreviations ('assess', 'sep', 'c1'-'c5')
- Fix: expand abbreviations in comment

**COMMENT-10** | P3 | deploy/reports.html:3273 | Missing function-level overview on `renderSTReport`
- 114-line rendering function with 3 distinct HTML sections
- Fix: add overview comment describing expected data shape and section structure

### About Page — Review Suite v4.0.4 (2026-02-10)

**ABOUT-08** | P3 | deploy/about.html:267 | MO-DB_Contacts description omits two-tab structure
- Still says "Stakeholder and team contacts" — should mention People + Roles tabs
- Fix: update to "Two-tab structure: People (one per person) + Roles (one per person-solution-role)"

**ABOUT-09** | P3 | deploy/about.html:262 | MO-DB_Solutions still says "Schema v2"
- Should reflect multi-tab structure: Core, Comms, Milestones tabs
- Fix: update description

**ABOUT-07** | P3 | deploy/about.html | Missing database cards for MO-DB_BugLog and MO-DB_Lookups
- Grid shows 20 databases; 2 are missing from display cards
- Fix: add cards for BugLog and Lookups

### Style Consistency

---

## Resolved Issues — v4.0.3 (2026-02-08)

**CONTACTS-EDIT** | P1 | deploy/contacts.html | Contact detail modal edit functionality
- Added view-then-edit modal with single Edit button for: email, agency, champion status, relationship owner, champion notes
- New API: `updateContactEmail()` in library + deploy wrapper

**CONTACTS-EXPORT** | P2 | deploy/contacts.html | Export was client-side CSV only
- Replaced with server-side Google Sheets export via `exportContactsToSheet()`

**CONTACTS-FILTERS** | P2 | deploy/contacts.html | Year/Role filters hardcoded
- Year filter: removed hardcoded 2024/2022/2020/2018/2016, now populated from data (sorted descending)
- Role filter: removed hardcoded 5 options, now populated from data (sorted alphabetically)

**CONTACTS-RELATED** | P2 | deploy/contacts.html | Related contacts limited to 10 with no expansion
- "+N more colleagues" now clickable to show next 10; "Show less" to collapse

**CONTACTS-A11Y** | P3 | deploy/contacts.html | No keyboard navigation through cards
- Cards and table rows now have tabindex, role="button", Enter/Space handlers, focus-visible CSS

**CONTACTS-TRUNC** | P3 | deploy/contacts.html | Solution truncation inconsistent (45 vs 50 chars)
- Standardized to 50 characters in both filter dropdown and detail modal

**COMMS-SEARCH** | P2 | deploy/comms.html | Assets search bar overflows page width
- Added flex-wrap and reduced search input width

**COMMS-CONTENT** | P3 | deploy/comms.html | "New Asset" button misleading label
- Renamed to "Build a Presentation" and wired to showPresentationBuilder()

**COMMS-NAV** | P3 | deploy/comms.html | "Add Content" button in persistent nav redundant
- Removed from persistent nav header

---

## Resolved Issues — v4.0.2 (2026-02-08)

**BUG-315** | P1 | deploy/sep.html | SEP solution detail stakeholders show 0
- Root cause: synchronous filter on `state.allContacts` which loads async and is often empty when modal opens
- Fix: replaced with async `getContactsBySolution()` API call; shows loading spinner then populates stakeholders + agencies sections; cached data used by "Email All" button

**FEAT-316** | P1 | deploy/sep.html | SEP Agencies tab right panel blank by default
- Root cause: `setView('agencies')` had no rendering handler — showed passive empty state
- Fix: added `renderAgenciesOverview()` showing stats row, top 10 engaged agencies (clickable), and agencies needing outreach

**BUG-008** | P1 | deploy/implementation.html | Implementation engagement activity items not clickable
- Root cause: `renderActivityItem()` had no onclick for engagement items, no detail modal existed
- Fix: added engagement detail modal fetching full data via `getEngagementById()`, clickable items with hover + chevron, rich text rendering via `renderUpdateText()`

**LOAD-01** | P2 | deploy/implementation.html | Solution picker showed plain "Loading..." text
- Fix: added inline loading spinner to picker label during initial data load

**STYLE-03** | P3 | deploy/styles.html | `--color-sep-light` variable undefined
- Fix: defined `--color-sep-light: rgba(21, 101, 192, 0.1)` in `:root`

**STYLE-04** | P3 | deploy/comms.html | Hardcoded hover colors — already fixed in Sprint 2 CSS work

**RESP-06** | P3 | deploy/shared-page-styles.html | `.btn-sm` touch target too small
- Fix: increased padding from `var(--space-xs)` (4px) to `var(--space-sm)` (8px) vertical, added `min-height: 32px`

**A11Y-05** | P3 | deploy/sep.html, deploy/about.html | `<a href="#">` and `javascript:void(0)` acting as buttons
- Fix: sep.html — 8 expand/collapse/action links converted to `<button class="link-btn">`
- Fix: about.html — 8 nav links changed from `javascript:void(0)` to proper `href="#section-id"` anchors
- Added shared `.link-btn` class to shared-page-styles.html

---

## Resolved Issues — v4.0.1 (2026-02-08)

**COMMS-003** | P2 | deploy/comms.html | Guest search too reactive to keystrokes
- Debounce was 300ms, increased to 500ms
- Also standardized sep.html searchContactsForLink from 300ms → 500ms to match

**COMMS-004** | P2 | library/solutions-api.gs | Key messages count/grid mismatch
- Summary showed 13 solutions with messages but grid rendered only 1
- Root cause: `getSolutionsWithKeyMessages()` returned CommsAssets results (1 talking_point) and never fell back to Solutions data
- Fix: merge both sources into single map by solution_id

**ENUM-01** | P2 | 5 library files | Enum fields not normalized to lowercase on read
- Custom loaders read raw sheet values without case normalization
- Status comparisons (`e.status === 'confirmed'`) failed when sheet had `Confirmed`
- Fix: added `.toLowerCase().trim()` normalization to all enum fields in 5 custom loaders:
  - outreach-api.gs (status, event_type)
  - stories-api.gs (status, content_type)
  - parking-lot-api.gs (status, priority, item_type)
  - milestones-api.gs (status, milestone_type)
  - comms-assets-api.gs (status, content_type, asset_file_type, usage_rights)

---

## Resolved Issues — Sprint 1 (2026-02-06)

**STATE-04** | P2 | comms.html | isSaving flags already properly wired
- Verified: isSavingEvent (8929/8930/8962/8992), isSavingStory (8104/8144/8151), isSubmittingNewEvent (9078/9114/9121/9132) all checked, set, and cleared correctly
- Status: FALSE POSITIVE — no change needed

**STATE-03** | P2 | team.html | Navigation guards added to ALL async callbacks
- Added `teamNavId` property, captured in `init()`
- Guarded 11 callbacks: loadCurrentUser (2), loadData (4), loadKudos (2), loadActions (1), loadParkingLot (2)

**STATE-02** | P2 | contacts.html | isSaving guards added to all 3 write operations
- Added `isSaving` flag to state, guarded submitNewContact, updateContactField, saveChampionNotes

**STATE-01** | P2 | comms.html | Navigation guard added to loadEvents
- Added navId capture and isNavigationCurrent check to both getAllEvents and getOutreachOverview callbacks

**PERF-01** | P2 | comms.html + index.html | 3 Comms API calls now cached
- Added CachedAPI.getCommsStories (15min), getCommsOpportunities (15min), getCommsCoverage (15min)
- Added CachedAPI.invalidate.comms() after story/event saves

**PERF-02** | P2 | team.html + index.html | 5 Team API calls now cached
- Added CachedAPI.getCurrentUser (60min), getAvailability (30min), getDirectingDocuments (60min), getKudos (30min), getKudosStats (30min)
- Added CachedAPI.invalidate.team() and invalidate.kudos()
- Converted loadData, loadKudos, loadCurrentUser to use CachedAPI

**DATA-01** | P2 | implementation.html | Alignment data now surfaced
- Added collapsible "Need Alignment Assessment" section with 6-field color-coded grid (Acceptable/Gap/N/A) + notes + last reviewed

**DATA-02** | P2 | implementation.html | Technical specs now surfaced
- Added collapsible "Technical Specifications" section with 7 product_* fields

**DATA-03** | P2 | implementation.html | Milestone documents now clickable links
- Modified renderDocStatusRow() to render clickable "View" links instead of "Complete" badges
- Added 5 presentation URL rows (ATP, F2I, ORR, Closeout, Deep Dive) to Document Status grid

**DATA-04** | P2 | implementation.html, sep.html | Team fields surfaced in both modals
- Implementation: added RA Rep Affiliation, EA Advocate (clickable), EA Affiliation, Stakeholder List URL
- SEP: added affiliations as sub-lines, EA Advocate with role badge, Stakeholder List link

---

## Resolved Issues — Sprint 2 (2026-02-06)

**STYLE-01** | P2 | 6 files | Duplicate CSS blocks removed
- Removed ~350 lines of duplicate .btn, .modal-overlay, .modal-content, .modal-header CSS from sep.html, comms.html, team.html, reports.html, implementation.html, contacts.html
- Updated shared-page-styles.html: modal-overlay (center + space-md), modal-content (max-height/flex/900px modal-lg), modal-body (overflow-y), .modal.show, .btn-danger/.btn-icon/.btn-full
- Kept page-specific overrides: implementation max-width:800px, contacts max-width:700px, team modal-sm:450px

**STYLE-02** | P2 | 7 files | Hardcoded colors replaced with CSS variables
- Added ~30 CSS variables to styles.html (danger, pipeline, phase, category, gradient, engagement type, activity section)
- comms.html: 0 hex codes remaining (all replaced by agent)
- team.html: 0 hex codes remaining (all replaced by agent)
- sep.html: 55→31 remaining (24 replaced; rest are vis.js API colors + Tailwind badge palette)
- implementation.html: 23→17 remaining (6 replaced; rest are badge palette colors)
- contacts.html: 1→0 remaining
- schedule.html: 17 remaining (Google Charts API requires raw hex)
- reports.html: 7 remaining (var() fallbacks + JS select feedback colors)

**DRY-05** | P2 | team.html | closeModal consolidated to global
- Team.closeModal now delegates to window.closeModal() (removes both 'active' and 'show')

**A11Y-01** | P2 | comms.html | Quick-access cards keyboard accessible
- Added tabindex="0", role="button", onkeydown to 3 quick-access cards (HTML + JS-generated)

**A11Y-02** | P2 | 7 files | All 34 modals have ARIA dialog attributes
- Added role="dialog", aria-modal="true", aria-labelledby to every modal across sep.html (11), comms.html (9), team.html (7), implementation.html (3), contacts.html (2), index.html (1), topsheet.html (1)
- Added unique id attributes to all modal title elements for aria-labelledby

**A11Y-03** | P2 | comms.html | Search inputs have aria-labels
- Added aria-label="Search content" to #contentSearchInput
- Added aria-label="Search assets" to #assetsSearchInput

---

## Resolved Issues — Sprint 3 (2026-02-06)

**RESP-01** | P2 | team.html, implementation.html | Page-specific responsive breakpoints added
- team.html: weekly-grid gets 1024px (3-col) and 768px (2-col) breakpoints
- implementation.html: doc-status-grid gets 768px (2-col) breakpoint

**RESP-02** | P2 | shared-page-styles.html | Pipeline board responsive breakpoints
- Added 1024px (3-col), 768px (2-col), 480px (1-col) breakpoints to .pipeline-board

**RESP-03** | P2 | comms.html | Events content grid breakpoint
- .events-content gets 768px (1-col) breakpoint (was stuck at 2-col)
- Note: .quick-access-grid and .story-grid already use auto-fit/auto-fill (no fix needed)

**RESP-04** | P2 | comms.html | Table containers scroll instead of clip
- Changed .coverage-table-container and .events-table-container from overflow:hidden to overflow-x:auto

**ERR-01** | P2 | 11 files | 20 raw error.message replaced with user-friendly messages
- All withFailureHandler callbacks now show messages like "Could not save. Please try again."
- Files: access-denied.html, auth-landing.html, comms.html (3), contacts.html (3), implementation.html (2), index.html (1), navigation.html (1), reports.html (1), sep.html (3), team.html (4)
- Only index.html:1425 handleError() retains error.message as the central error handler

**SEC-01** | P2 | comms.html | e.status wrapped in escapeHtml() in event card, table, and detail views
**SEC-02** | P2 | comms.html | capitalizeFirst(e.event_type) wrapped in escapeHtml() in table and detail views
**SEC-03** | P2 | comms.html | capitalizeFirst(story.status) wrapped in escapeHtml()
**SEC-04** | P2 | comms.html | capitalizeFirst(story.channel) wrapped in escapeHtml()
**SEC-05** | P3 | team.html | action.source_date wrapped in escapeHtml() at both locations
**SEC-06** | P3 | schedule.html | m.status and capitalizeFirst(m.status) wrapped in escapeHtml()

**DRY-04** | P2 | team.html | 4 indexOf() !== -1 converted to includes()
- officeWideTypes.indexOf → includes (3 locations), partners.indexOf → includes (1 location)
- Only remaining indexOf in team.html is text.indexOf(search) — legitimate string search

---

## Resolved Issues — Sprint 4 (2026-02-06)

**SCHEMA-02** | P2 | docs/DATA_SCHEMA.md | 16 undocumented Contact fields added
- Added Engagement Tracking Columns (touchpoint_status, engagement_level, lifecycle_phase, etc.)
- Added About Me / Personal Profile Columns (education, job_duties, hobbies, goals, etc.)

**SCHEMA-03** | P2 | docs/DATA_SCHEMA.md | MO-DB_Outreach formal schema added
- 19 columns documented with event_type and status enum values

**SCHEMA-04** | P2 | docs/DATA_SCHEMA.md | MO-DB_Updates formal schema added
- 6 columns documented plus multi-tab structure (2026, 2025, 2024, Archive)

**SCHEMA-05** | P2 | docs/DATA_SCHEMA.md | core_application_sectors documented in Solutions table
- Added to core_ prefix section with note about sector analysis functions

**SCHEMA-06** | P2 | library/solutions-api.gs | Fixed funding_type === 'Y' logic error
- Changed to `funding_status === 'Funded'` — matches actual schema values (Funded/Unfunded/Pending)

**DRY-01** | P3 | index.html, comms.html, schedule.html | capitalizeFirst() consolidated to global
- Added to index.html as global utility (with null check)
- Removed from comms.html and schedule.html (schedule.html version was missing null check — bug fixed)

**DRY-02** | P3 | comms.html, sep.html | formatDate() wrappers removed
- Deleted wrapper functions that just called window.formatDateShort()
- All 22 call sites changed to use formatDateShort() directly
- schedule.html and topsheet.html formatDate kept (different implementations for different purposes)

**COMMENT-01** | P3 | sep.html | 8 complex functions commented
- populateSolutionDropdown, renderOverviewTable, loadAllContacts, selectContact, renderSelectedContacts, loadSolutionsWithProgress, addAdditionalSolution, searchRelatedEngagements

**COMMENT-02** | P3 | comms.html | 7 complex functions commented
- filterAssets, renderAssetCard, searchContent, populateContentSolutionDropdown, showRecentBlurbs, showMostUsed, showByType

**ABOUT-01** | P3 | about.html | MO-DB_Kudos added to database grid
- Grid now shows 19 databases. Version updated to 2.5.5.

**DATA-05** | P3 | implementation.html | earthdata_background and earthdata_societal_impact surfaced
- Added conditional Background and Societal Impact sections to solution detail modal (between Purpose and Status Summary)
