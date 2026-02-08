# MO-Viewer Bug Tracker

**Created:** 2026-02-06
**Purpose:** Track P2 (Medium) and P3 (Low) issues found during full review suite.
P0 (Critical) and P1 (High) issues are fixed immediately during review.

---

## Open Issues

### Comms-NSITE Bugs (2026-02-08)

**COMMS-005** | P3 | library/outreach-api.gs | guest_list should use guest_list_contact_id
- Currently stores guest names as text; should store contact_id FKs instead
- Requires: schema change in MO-DB_Outreach (add guest_list_contact_id column), API update to resolve IDs to names for display, migration of existing text data to contact IDs
- Status: **DEFERRED** — schema change, not safe before demo

### Error Handling

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

### API Consistency

**API-01** | P3 | library/*.gs | 8 functions with inconsistent underscore naming convention
- Functions with `_` suffix called from public contexts: `countUniqueAgencies_()`, `performEventSearch_()`, `searchWithGoogleAPI_()`, `generateSearchSuggestions_()`, `detectEventType_()`
- Debug/internal functions missing `_` suffix: `debugGetSolutions()`, `getSampleSolutions()`, `getImplementationViewerHTML()`
- Fix: standardize — private helpers get `_`, public API functions don't

### State Management

**STATE-05** | P3 | reports.html | NO navigation guards on report generation
- Report loads take 2-3s; user could navigate away during generation
- Lower risk since lazy-loaded on demand (user action, not auto-init)

### Accessibility

**A11Y-04** | P2 | index.html | `aria-live` only on toast container (1 instance app-wide)
- Dynamic content areas (filtered results, search results, loading states) lack `aria-live` announcements
- Screen readers won't announce when content updates after filter/search

**A11Y-05** | P3 | sep.html:4278,4283,4311,4316 | `<a href="#">` elements acting as buttons
- Expand/collapse links should be `<button>` elements, not `<a>` with `href="#"`
- about.html:16-23 — 8 navigation links use `javascript:void(0)` (problematic for a11y)

**A11Y-06** | P3 | comms.html | Form labels without `for` attribute
- comms.html:228-251 — labels visible but not semantically linked to inputs
- Fix: add `for="inputId"` to all `<label>` elements

### Mobile/Responsive

**RESP-06** | P3 | shared-page-styles.html:360 | `.btn-sm` touch target too small
- 4px vertical padding — below 44px mobile touch target guideline
- Fix: increase to `var(--space-xs) var(--space-sm)` minimum

### Loading States

**LOAD-01** | P2 | implementation.html | Uses text placeholder instead of proper loading spinner
- Stats show "Loading..." text button instead of `.loading-state` with spinner
- Users can't tell if page is still loading vs loaded with no data
- Fix: add `.loading-state` with `.loading-spinner` on init, hide on data load

### Schema Validation

**SCHEMA-01** | P2 | actions-api.gs | Column name mismatches between code and DATA_SCHEMA.md
- Code uses `assigned_to` but schema says `owner`
- Code uses `updated_at` but schema says `last_updated`
- Code uses `task` as alternative field, schema shows `action_id` as primary
- Fix: standardize naming — update schema OR rename columns in database

**SCHEMA-07** | P3 | engagements-api.gs:55-64 | "Workshop" in code but not in DATA_SCHEMA.md enum
- ENGAGEMENT_ACTIVITY_TYPES includes "Workshop" but schema only lists 7 types
- Code is likely correct (CLAUDE.md mentions Workshop as intentional addition)
- Fix: update DATA_SCHEMA.md to include Workshop in activity_type enum

### Data Flow

**FLOW-01** | P3 | library/solutions-api.gs:~441 | Cache not invalidated after SEP milestone write
- `_solutionsCache` persists after `updateSolutionSEPMilestone()` completes
- Low risk: Apps Script short-lived execution contexts reset cache naturally
- Fix: add `clearSolutionsCache_()` call after successful write

**FLOW-02** | P3 | All write operations | No audit trail in UPDATE_HISTORY table
- Schema defines MO-DB_Update_History (Section 8) but no write function populates it
- Milestone updates, contact changes, engagement creates have no audit log
- Fix: implement logUpdate() calls after successful writes

### Style Consistency

**STYLE-03** | P3 | sep.html:1086 | Reference to undefined CSS variable `--color-sep-light`
- Has rgba() fallback so renders correctly, but variable never defined in styles.html

**STYLE-04** | P3 | comms.html:3109, 3181 | Hardcoded hover states
- `.btn-primary:hover` and `.comms-due-action:hover` use hardcoded `#6a1b9a`
- Should derive from `var(--page-accent)` or color variable

### Data Connectivity

**DATA-01** | P2 | All viewer pages | Alignment data (8 columns) 100% hidden from UI
- These are core SEP decision-making fields (gap/acceptable status for stakeholder needs)
- Fix: surface in Implementation detail modal and SEP pipeline cards

**DATA-02** | P2 | All viewer pages | Technical specifications (8 product_* columns) hidden
- Only `product_assigned_daac` is displayed
- Fix: surface in Implementation detail modal

**DATA-03** | P2 | All viewer pages | Milestone document URLs (9 columns) hidden
- Milestone DATES are shown but decision documents are inaccessible
- Fix: add document links alongside dates in Implementation/SEP modals

**DATA-04** | P2 | All viewer pages | Team contacts partially hidden (4 columns)
- EA Advocate is critical for SEP community outreach
- Fix: surface in solution detail modals

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
