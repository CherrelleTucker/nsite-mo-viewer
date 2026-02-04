# MO-Viewer Bug Tracker & UI Improvements

**Created:** 2026-01-19
**Last Updated:** 2026-02-04

This document tracks all known bugs, UI issues, and improvement opportunities across the MO-Viewer platform.

---

## Priority Legend

| Priority | Description | Target |
|----------|-------------|--------|
| P0 | Critical - Blocks core functionality | Immediate |
| P1 | High - Major UX issue or data problem | This week |
| P2 | Medium - Should fix, not urgent | Next sprint |
| P3 | Low - Nice to have | Backlog |

## Status Legend

| Status | Description |
|--------|-------------|
| [ ] | Open - Not started |
| [~] | In Progress |
| [x] | Fixed |
| [-] | Won't Fix / By Design |

---

## Team-NSITE

### Add Availability Modal
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-001 | Type should be checkboxes at top (office-wide vs personal) | P2 | [ ] | UX improvement per user |
| TEAM-002 | Display bug: MLK holiday shows "Holiday Holiday undefined NaN - Jan 18" | P1 | [x] | **FIXED** - Added parseDate() for date format handling |
| TEAM-003 | Date validation missing - can set end before start | P2 | [ ] | Should validate dates |
| TEAM-004 | No delete functionality for availability entries | P2 | [x] | **FIXED** - Delete button added to edit modal |
| TEAM-005 | No edit functionality for availability entries | P2 | [x] | **FIXED** - Click entry to edit; new bug: wrong name may appear in dropdown (contact_id mismatch) |

### UI/UX Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-006 | ESC key doesn't close modals | P2 | [ ] | Standard expected behavior |
| TEAM-007 | Modal overlays don't close on click | P2 | [ ] | Only X button works |
| TEAM-008 | Team filter dropdown hardcoded (6 options) | P2 | [ ] | Should dynamically populate from data |
| TEAM-009 | Meeting category/type filters hardcoded | P2 | [ ] | Should dynamically populate |
| TEAM-010 | Stats cards not clickable | P2 | [ ] | Should filter content when clicked |
| TEAM-011 | Member detail modal only shows first 5 availability entries | P3 | [ ] | No "show more" option |

### Meetings View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-012 | Save Meeting button has no loading state | P2 | [ ] | Unlike availability modal |
| TEAM-013 | Edit Meeting button in detail modal doesn't work | P1 | [x] | **FIXED** - Added editMeeting() function and currentMeetingId tracking |
| TEAM-014 | No delete functionality for meetings | P2 | [ ] | Can only add |
| TEAM-015 | Meeting time field is free text | P3 | [ ] | Should be time picker |

### Data Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-016 | "Out This Week" stat shows anyone currently OOO | P2 | [ ] | Doesn't filter to just this week |
| TEAM-017 | Meeting names in weekly grid not HTML escaped | P2 | [x] | **FIXED** - added escapeHtml() and safeUrl() helpers |
| TEAM-018 | Purpose field in meeting list not escaped | P2 | [x] | **FIXED** - all meeting fields now escaped |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-019 | No export functionality | P3 | [ ] | Other pages have CSV/Sheet export |
| TEAM-020 | No search for availability list | P3 | [ ] | Can't search by person/date |

### Responsive Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-021 | Weekly grid collapses to 3 columns on mobile | P3 | [ ] | Missing Thurs/Fri on small screens |

### Directing Documents
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-022 | MoApi.getDirectingDocuments is not a function | P0 | [x] | **FIXED** - library redeployed; icons off-center noted for future |

### Database/Data Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-023 | Availability DB format needs update | P1 | [x] | **FIXED** - Added holiday_name, partners columns to MO-DB_Availability |
| TEAM-024 | Date column has inconsistent format (mm/dd/yyyy hh:mm:ss) | P2 | [ ] | Script populates with timestamp instead of date |
| TEAM-027 | Wrong name shows when editing availability | P1 | [x] | **FIXED** - Dropdown now shows first names with contact_id values; added fallback matching by first name when contact_id doesn't match |

### Meetings View Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-025 | Schedule varies by week but shows static view | P2 | [ ] | Should show 2-week, 4-week, or "this week" options |

### Future Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| TEAM-026 | PI Calendar for tracking program increments/sprints | P3 | [ ] | Enhancement request |

---

## Implementation-NSITE

### Stats Panel
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMPL-001 | Action Items shows "TBD" - hardcoded, never calls API | P1 | [x] | **FIXED** - Now calls getOpenActions() and displays count |
| IMPL-002 | Deep Dives shows "TBD" - no data source defined | P2 | [x] | **FIXED** - Now counts solutions with `deep_dive_date` from MO-DB_Solutions |

### Solution Cards
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMPL-003 | Solution_id visible on cards (should be hidden - internal use) | P2 | [ ] | Quick fix - remove from render |
| IMPL-004 | Stakeholder Lists says "Linked" but doesn't link to contacts | P1 | [x] | **FIXED** - If URL, shows clickable "View List" link |

### Detail Modal - Links
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMPL-005 | Solution Lead not clickable - should link to contact card | P2 | [ ] | Need to look up contact by name |
| IMPL-006 | Affiliation not clickable - should link to org/contact info | P3 | [ ] | Lower priority |
| IMPL-007 | RA Representative not clickable - should link to contact card | P2 | [ ] | Same as IMPL-005 |
| IMPL-008 | "Purpose" field references wrong column | P1 | [x] | **FIXED** - Schema v2 uses `earthdata_purpose` |
| IMPL-009 | Drive Folders URL doesn't work | P1 | [x] | **FIXED** - Schema v2 uses `admin_drive_folder` |
| IMPL-010 | Risk Register URL doesn't work | P1 | [x] | **FIXED** - Schema v2 uses `docs_risk_register` |
| IMPL-011 | Data Products URL doesn't work | P1 | [x] | **FIXED** - Schema v2 uses `product_data_products` |

### Detail Modal - Data
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMPL-012 | Milestones section shows no data | P1 | [x] | **FIXED** - Schema v2 uses `milestone_*` columns |
| IMPL-013 | Document status logic flawed - any non-empty text = "In Work" | P2 | [x] | **FIXED** - Schema v2 derives status from URL presence (complete/not_started) |

### View Options
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMPL-014 | No option to group/condense solutions by solution_group | P2 | [ ] | Feature request |

### Export
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| IMPL-015 | Export field mapping wrong: `solution_name`→`name`, `lifecycle_phase`→`phase` | P2 | [ ] | Quick fix |

---

## SEP-NSITE

### Pipeline View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SEP-001 | Agency browser initial window too wide (fixed 350px) | P1 | [x] | **FIXED** - Changed to minmax(280px, 400px) |
| SEP-002 | Text in agency browser hard to read (font-size-sm) | P1 | [x] | **FIXED** - Changed to font-size-base |
| SEP-003 | Agency browser duplicates Agencies view | P3 | [x] | **FIXED** - Removed from Pipeline view |
| SEP-004 | Pipeline columns max 20 contacts with NO indicator | P1 | [x] | **FIXED** - Shows "+X more contacts" when over 20 |
| SEP-005 | Column overflow hidden - no scroll indicator | P2 | [ ] | Add visual feedback |
| SEP-006 | No drag-and-drop between touchpoint columns | P3 | [ ] | Feature request - complex |
| SEP-007 | Stats cards not clickable (should filter view) | P2 | [ ] | UX improvement |

### Engagement Logging
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SEP-008 | Log Engagement button no loading state | P0 | [x] | **FIXED** - button disables + spinner while saving |
| SEP-009 | Logged engagements NOT clickable | P0 | [x] | **FIXED** - click shows details in alert |
| SEP-010 | No engagement detail modal exists | P1 | [x] | **FIXED** - Engagement detail modal implemented |
| SEP-011 | No edit/delete functionality for engagements | P2 | [ ] | Feature request |
| SEP-012 | Participant emails not validated | P2 | [ ] | Should validate format |
| SEP-013 | No "View All" link for recent engagements (max 8) | P2 | [ ] | Add link |
| SEP-026 | Recent engagement icon broken/weird sizing | P2 | [ ] | Icon display issue in +Log Engagement modal |

### Agency Browser
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SEP-014 | Search not hierarchy-aware | P2 | [ ] | Child agencies stay hidden when parent matches |
| SEP-015 | Agency selection lost when switching views | P2 | [ ] | Store in state |
| SEP-016 | Long URLs truncate without proper overflow | P3 | [ ] | Add word-break |
| SEP-017 | No engagement history on agency detail | P2 | [ ] | Feature request |
| SEP-027 | No loading indicator when clicking hierarchy expand | P2 | [ ] | Add spinner during hierarchy load |
| SEP-028 | Agency view doesn't link to contacts in database | P2 | [ ] | Add link to filtered Contacts page |
| SEP-029 | renderRecentEngagements - null element error during SPA navigation | P2 | [x] | **FIXED** - Added null guard |
| SEP-030 | renderNeedsOutreach - null element error during SPA navigation | P2 | [x] | **FIXED** - Added null guard |
| SEP-031 | renderAgencyTree - null element error during SPA navigation | P2 | [x] | **FIXED** - Added null guard |
| SEP-032 | Agency notes section styling needs refinement | P3 | [ ] | View/edit mode works but visual design needs polish |

### Contact Detail
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SEP-018 | No way to update touchpoint/engagement/dates from UI | P1 | [x] | **FIXED** - SEP milestone editor in pipeline view |
| SEP-019 | Email link fails if email field empty | P2 | [ ] | Add guard clause |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SEP-020 | No follow-up reminder system | P3 | [ ] | follow_up_date exists but unused |
| SEP-021 | No relationship health scoring | P3 | [ ] | Future enhancement |
| SEP-022 | No contact tagging/labeling | P3 | [ ] | Future enhancement |
| SEP-023 | No export functionality | P2 | [ ] | Feature request |

### Future Considerations
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SEP-024 | How to mark closed agencies (e.g., USAID) | P3 | [ ] | Data model question |
| SEP-025 | Projects under sub-agencies? | P3 | [ ] | May be too granular |

---

## Comms-NSITE

### Critical Bugs
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-001 | Discover Events feature removed; replaced with Add Event | P0 | [x] | **FIXED** - removed rejected feature, added manual Add Event form |
| COMM-002 | Malformed JS in messages view failure handler (line 2188-2189) | P0 | [x] | **FIXED** - corrected indentation |
| COMM-003 | Admin priority parsing bug - doesn't trim spaces | P1 | [x] | **FIXED** - Added toLowerCase() and improved matching logic |

### Story Management
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-004 | No loading state during form submit (double-click risk) | P1 | [x] | **FIXED** - Button shows "Saving..." and is disabled during submit |
| COMM-005 | Solution name conversion may fail for multi-word names | P1 | [x] | **FIXED** - Removed conversion, uses names directly as identifiers |
| COMM-006 | No validation on solution names - accepts any text | P1 | [x] | **FIXED** - Added datalist with autocomplete suggestions |
| COMM-007 | Form state not fully cleared after submit | P2 | [ ] | Old data may flash briefly |
| COMM-008 | Search only checks title + solution_names, not all fields | P2 | [ ] | Users expect full-text search |
| COMM-025 | URL fields too strict - require https:// prefix | P2 | [ ] | Should auto-add protocol if missing |
| COMM-026 | After editing story, unclear which one was edited | P2 | [ ] | Need "recently updated" indicator |
| COMM-027 | Story card shows limited info vs edit dialog | P2 | [ ] | Detail view should show more fields |

### Pipeline View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-009 | No drag-and-drop between pipeline columns | P3 | [ ] | Feature request - complex |
| COMM-010 | No "Clear Filters" button | P2 | [ ] | Must manually reset each dropdown |
| COMM-011 | Opportunities panel doesn't explain empty state | P3 | [ ] | No refresh context |

### Calendar View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-012 | "+X more" overflow text not clickable | P2 | [ ] | Can't access hidden events |

### Events View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-013 | No duplicate event prevention when adding discovered events | P1 | [x] | **FIXED** - Checks for same name+year before creating |
| COMM-014 | Location truncated to 25 chars without hover tooltip | P3 | [ ] | Full location only in modal |
| COMM-028 | Remove "Discover Events" feature | P2 | [ ] | Not scalable, adds setup complexity for other projects |
| COMM-029 | Confirm/Decline attendance buttons don't work | P1 | [x] | **FIXED** - Added success alert and feedback |
| COMM-030 | Event status buttons need loading icons | P1 | [x] | **FIXED** - Shows "Updating..." and disables buttons |
| COMM-031 | Unclear what happens when event is declined | P2 | [ ] | Where does it go? Can status be changed back? |
| COMM-032 | No storage for event artifacts | P3 | [ ] | Future: links to presentations, videos, memos |

### Coverage View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-033 | "undefined" shown when no previous story | P1 | [x] | **FIXED** - Changed !== null to != null to catch both null and undefined |
| COMM-034 | Scrolling issues - content cuts off or continues out of frame | P2 | [ ] | Layout/overflow problem |

### Messages View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-015 | Two async calls without coordinated loading state | P2 | [ ] | Summary + grid load independently |
| COMM-038 | External mention search bar unnecessary in Messages view | P2 | [ ] | Remove or repurpose the filter |

### Priorities View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-016 | Clicking untagged story auto-edits instead of showing detail | P2 | [ ] | Inconsistent with other cards |
| COMM-036 | Story update fails with data validation error on solution_id | P1 | [x] | **FIXED** - Changed solution input from free text to dropdown with valid solution_ids; fixed column name mismatches (pitch_doc_url, published_url, platform, etc.) |
| COMM-037 | Key messages visually clunky layout | P2 | [ ] | UI/UX polish needed |

### Modal Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-017 | ESC key doesn't close modals | P2 | [ ] | Standard expected behavior |
| COMM-018 | Click on modal content may still close modal | P3 | [ ] | stopPropagation issue |
| COMM-035 | Story/Event modals lack sufficient detail | P2 | [ ] | Consider adding more fields, history, related items |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| COMM-019 | No bulk actions (multi-select, bulk status change) | P3 | [ ] | Feature request |
| COMM-020 | No story commenting/history/audit trail | P3 | [ ] | Feature request |
| COMM-021 | No team assignment/ownership for stories | P3 | [ ] | Feature request |
| COMM-022 | No solution browse/select dialog | P2 | [ ] | Would fix COMM-006 |
| COMM-023 | No export functionality | P2 | [ ] | Feature request |
| COMM-024 | Status can only advance forward, not backward | P2 | [ ] | Review → Drafting not possible |

---

## Quick Update

### Critical Bugs
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| QU-001 | Silent failure when tab not found - returns success response | P0 | [x] | **FIXED** - now shows friendly error: "Next week's agenda (MM_DD) not yet created." Future: replace Doc-based agendas with MO-Viewer agendas |
| QU-002 | No server-side double-submission prevention | P1 | [x] | **FIXED** - acquireSubmissionLock() uses CacheService with 30s TTL |
| QU-003 | Error object validation missing - may show "Error: undefined" | P1 | [x] | **FIXED** - getErrorMessage() helper handles all error types |

### Form & Validation
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| QU-004 | No character limit on update text | P2 | [ ] | Could submit extremely long updates |
| QU-005 | Solution list hardcoded in JS (28 items) | P2 | [ ] | Database fallback exists but not used |
| QU-006 | No input sanitization before document insertion | P1 | [x] | **FIXED** - sanitizeInput() removes control chars, limits length to 2000 |
| QU-007 | Solution matching uses indexOf (partial matches) | P1 | [x] | **FIXED** - solutionNamesMatch() requires exact match or word boundary; also fixed insertion to place updates first |

### UI/Styling
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| QU-020 | Solution dropdown font doesn't match app styling | P2 | [ ] | Different font than rest of page |
| QU-021 | Type field should be single-select buttons, not dropdown | P2 | [ ] | Make updates more directed/intentional |

### User Feedback
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| QU-008 | No timeout for loading state - form stays hidden if server hangs | P1 | [x] | **FIXED** - 60-second timeout shows error and restores form |
| QU-009 | Success message auto-hides after 8 sec (too fast for links) | P2 | [ ] | Increase to 12 sec or add close button |
| QU-010 | Error message auto-hides after 5 sec (too fast to read) | P2 | [ ] | Add close button, don't auto-hide |
| QU-011 | No progress indicator (which meeting is being updated) | P2 | [ ] | Just shows generic spinner |
| QU-012 | Partial failure returns success + error text (ambiguous) | P2 | [ ] | Client can't distinguish partial vs full failure |

### Accessibility
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| QU-013 | Red "walk-on" text doesn't meet WCAG contrast | P3 | [ ] | Color alone doesn't convey meaning |
| QU-014 | Emoji encoding may display as "??" on some systems | P3 | [ ] | Uses hardcoded code points |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| QU-015 | No submission history/audit trail | P2 | [ ] | Can't see what was submitted |
| QU-016 | No form state persistence (lost on error/reload) | P2 | [ ] | Use localStorage |
| QU-017 | No searchable dropdown for 28 solutions | P3 | [ ] | Hard to find solution quickly |
| QU-018 | No preview before submitting | P3 | [ ] | Would show how it looks in doc |
| QU-019 | Test functions exist but not accessible from UI | P3 | [ ] | Admin debugging tools hidden |

---

## Contacts

### Security & Data Integrity
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| CON-001 | escapeAttr() insufficient - only escapes quotes, not other HTML chars | P1 | [x] | **FIXED** - escapeAttr() now escapes &, <, >, ", ' in contacts.html, sep.html, comms.html |
| CON-002 | Email case normalization missing - could cause duplicate contacts | P1 | [x] | **FIXED** - Emails normalized to lowercase on load and lookup |

### Data Loading
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| CON-003 | Race condition: Multi-Solution stat calculated from allContacts before it's populated | P1 | [x] | **FIXED** - updateMultiSolutionStat() now called from loadContacts() success handler |
| CON-004 | No refresh indicator - unclear when data was last updated | P3 | [ ] | Add "Last refreshed" timestamp |
| CON-005 | Error handler just shows generic "Failed to load contacts" | P2 | [ ] | Should show actual error details |

### Filters
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| CON-006 | Year filter hardcoded (2024, 2022, 2020, 2018, 2016) - missing 2025 | P2 | [ ] | Should be dynamically populated from data |
| CON-007 | Role filter hardcoded (5 options) | P2 | [ ] | Should be dynamically populated |
| CON-008 | Search doesn't search by role or solutions | P2 | [ ] | Only searches name, email, dept, agency, org |
| CON-009 | Stats cards not clickable | P2 | [ ] | Should filter by category (e.g., click Multi-Solution to filter) |

### Contact Card Display
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| CON-023 | Redundant email display on contact cards | P2 | [ ] | Shows both clickable email and email icon with "Email" label |
| CON-024 | Solution field displays odd text like "Agencies recommended SNWG_commercial products…" | P2 | [ ] | Jamie Kibbler example - data formatting issue |

### Contact Detail Modal
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| CON-010 | No ESC key to close modal | P2 | [ ] | Standard expected behavior |
| CON-011 | Email link might fail if email is empty | P2 | [ ] | No guard clause for empty email |
| CON-012 | Related contacts limited to 10 with no "View All" | P2 | [ ] | "+X more colleagues" but no way to see them |
| CON-013 | Solution truncation inconsistent (45 vs 50 chars) | P2 | [ ] | Different lengths in dropdown vs modal |
| CON-014 | Solution names truncated without tooltip | P3 | [ ] | No hover to see full name |
| CON-015 | Phone display uses wrong CSS class | P3 | [ ] | Icon misaligned with contact details |

### Export
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| CON-016 | Export is client-side CSV only | P2 | [ ] | Other pages have Google Sheet export |
| CON-017 | CSV export missing fields (roles, solutions, years, phone) | P2 | [ ] | Only exports basic info |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| CON-018 | No way to add new contact | P3 | [ ] | Read-only view |
| CON-019 | No way to edit contact | P3 | [ ] | No edit functionality |
| CON-020 | No sort options | P3 | [ ] | Always sorted by solutions_count then last_name |
| CON-021 | No keyboard navigation through cards | P3 | [ ] | Accessibility concern |
| CON-022 | No batch/bulk actions | P3 | [ ] | Can't select multiple contacts |

---

## Reports

### UI/UX Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| RPT-006 | View buttons have no loading state (only preview panel shows loading) | P2 | [ ] | Button should disable or show spinner |
| RPT-007 | ESC key doesn't close preview panel | P2 | [ ] | Standard expected behavior |
| RPT-008 | Quad Chart has no export option | P2 | [ ] | Shows "Export not available" alert |
| RPT-009 | Historical Updates filter requires re-clicking View | P2 | [ ] | Filter change doesn't auto-refresh |
| RPT-010 | copyToClipboard uses deprecated execCommand('copy') | P3 | [ ] | Should use navigator.clipboard API |
| RPT-011 | showNotification() just uses alert() for errors | P3 | [ ] | No toast notification system |
| RPT-012 | Preview panel scroll doesn't reset between reports | P3 | [ ] | May start scrolled down |
| RPT-013 | Error messages show raw technical errors | P2 | [ ] | Should be user-friendly |
| RPT-019 | Quad Chart methodology table extends outside container | P2 | [ ] | Table overflows its bounds; console shows available Reports methods |
| RPT-020 | Need Alignment shows [object Object] instead of stakeholder counts | P1 | [ ] | Data not being rendered properly - shows "[object Object] (6)" |
| RPT-021 | Export report feedback too quiet - unclear if it worked | P2 | [ ] | Need confirmation toast/message when export completes |
| RPT-022 | MoApi.getApplicationSectors is not a function | P1 | [ ] | Function exists in library/solutions-api.gs but needs library redeployment |

### Data/Integration Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| RPT-014 | Data provenance links always null | P2 | [ ] | window.MO_CONFIG never populated |
| RPT-015 | Quad Chart provenance says only MO-DB_Solutions | P3 | [ ] | Actually uses Updates and Actions too |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| RPT-016 | No custom date range selector | P3 | [ ] | Only predefined dropdowns |
| RPT-017 | Reports don't remember filter preferences | P3 | [ ] | Reset to defaults each time |
| RPT-018 | No print functionality | P3 | [ ] | Only export to Sheets |

### Fixed Issues (2026-01-18)
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| RPT-001 | Need Alignment export slow | P2 | [x] | Added warning notice |
| RPT-002 | Historical Updates data structure mismatch | P1 | [x] | Fixed |
| RPT-003 | Stakeholder Coverage column mismatch | P1 | [x] | Fixed |
| RPT-004 | Department Reach column mismatch | P1 | [x] | Fixed |
| RPT-005 | getProperty(CONFIG...) broken in all exports | P1 | [x] | Fixed - use getConfigValue() |

---

## Schedule

### Stats & Display
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SCH-001 | Overdue stat always shows 0 | P1 | [x] | **FIXED** - updateStats() now counts based on m.status field |
| SCH-005 | No "overdue" status ever assigned to milestones | P2 | [ ] | Past dates default to "completed"; need completed flag or logic change to identify overdue |
| SCH-002 | Stats cards not clickable | P2 | [ ] | Should filter view when clicked |
| SCH-003 | Month headers look clickable but don't collapse | P2 | [ ] | CSS hover suggests collapsible |

### Export
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SCH-004 | exportToCSV function called but not defined | P1 | [x] | **FIXED** - Added exportToCSV() function with proper CSV generation |

### UI/UX
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SCH-005 | No loading state when switching Timeline/Gantt | P2 | [ ] | Appears frozen during switch |
| SCH-006 | Gantt chart requires external Google Charts | P3 | [ ] | Won't work offline |
| SCH-007 | No drag-and-drop for timeline items | P3 | [ ] | Can't reorder visually |
| SCH-008 | Search field too long, pushes search icon upward | P2 | [ ] | Layout/CSS issue |

### Future Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| SCH-009 | Clicking milestone should show info and artifacts | P3 | [ ] | Enhancement request |

---

## Actions

### UI/UX
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ACT-001 | ESC key doesn't close drawer or modal | P2 | [ ] | Standard expected behavior |
| ACT-002 | Drawer overlay click doesn't close | P2 | [ ] | Only close button works |
| ACT-003 | Modal overlay click doesn't close | P2 | [ ] | Only X button works |
| ACT-004 | No confirmation for status changes | P3 | [ ] | Changes happen immediately |
| ACT-005 | Error messages use alert() | P3 | [ ] | Should use toast notifications |

### Kanban View
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ACT-006 | No drag-and-drop between columns | P2 | [ ] | Can't drag cards to change status |
| ACT-007 | 4-column layout needs 2160px+ width | P2 | [ ] | Doesn't fit most screens |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ACT-008 | No delete functionality | P2 | [ ] | Can't remove actions |
| ACT-009 | No edit functionality | P2 | [ ] | Can only update status, not task text |
| ACT-010 | Long solution names break filter dropdown | P3 | [ ] | No text truncation |
| ACT-011 | Need ability to add notes to selected action | P2 | [x] | **DONE** - Notes section in drawer with Add Note button |
| ACT-012 | Done column gets too long - need pagination | P2 | [ ] | Show 10 items, then "see next 10" |
| ACT-013 | Assignee dropdown to assign actions to team members | P2 | [x] | **DONE** - Dropdown populated from MO-DB_Contacts (is_internal=Y) |
| ACT-014 | Email notification when action is assigned | P2 | [x] | **DONE** - Fallback if Slack not configured |
| ACT-015 | Slack bot integration for action notifications | P1 | [x] | **DONE** - DM on assign, Mark Done & Add Update buttons in Slack |

---

## About

### Content/Accuracy Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ABT-001 | Version number hardcoded (1.3.0) | P3 | [ ] | Should pull from config or CHANGELOG |
| ABT-002 | Database counts hardcoded (~40 solutions, 4000+ contacts) | P3 | [ ] | Should be fetched dynamically |
| ABT-003 | Architecture diagram missing Quick Update page | P2 | [ ] | Shows 8 pages, Quick Update not listed |
| ABT-004 | "Next Steps" sections may be outdated | P2 | [ ] | Some features may be done or abandoned |
| ABT-005 | No mention of MO-APIs Library architecture | P2 | [ ] | Shared library not documented |

### UI/UX Issues
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ABT-006 | Nav links use javascript:void(0) | P3 | [ ] | Could break if JS disabled |
| ABT-007 | Architecture diagram hard to read on mobile | P3 | [ ] | Pre tag doesn't scale |
| ABT-008 | No changelog/version history section | P3 | [ ] | Users can't see recent changes |

### JavaScript Errors
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ABT-011 | populateSolutionFilter throws "Cannot set properties of null" | P1 | [x] | **FIXED** - Added null guard in actions.html:1078 |
| ABT-012 | "Uncaught ns" error in GAS compiled JS (mae_html_user.js) | P3 | [ ] | Internal GAS error on page navigation; doesn't affect functionality |

### Accessibility
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ABT-009 | Material icons lack aria-labels | P3 | [ ] | Screen readers can't interpret |

### Missing Features
| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| ABT-010 | No "Back to Top" button | P2 | [x] | **FIXED** - Added floating button with smooth scroll |

---

## Cross-Page UX Issues

| ID | Issue | Priority | Status | Notes |
|----|-------|----------|--------|-------|
| UX-001 | Delete buttons lack loading feedback | P2 | [ ] | Delete actions in detail modals (engagements, availability, etc.) should show loading/in-progress icon like save buttons do |

---

## Quick Wins (< 1 hour each)

These can be knocked out quickly:

**Implementation-NSITE:**
1. **IMPL-003** - Hide solution_id from cards
2. **IMPL-015** - Fix export field mapping

**SEP-NSITE:**
3. **SEP-008** - Add loading state to Log Engagement button
4. **SEP-009** - Make engagement logs clickable (basic - open alert with details)
5. **SEP-001** - Fix agency browser width CSS
6. **SEP-002** - Increase agency browser font size
7. **SEP-004** - Add contact count to pipeline column headers

**Comms-NSITE:**
8. **COMM-001** - Add `createEvent()` to outreach-api.gs (critical!)
9. **COMM-002** - Fix malformed JS in messages failure handler
10. **COMM-003** - Trim spaces in admin priority parsing
11. **COMM-010** - Add "Clear Filters" button
12. **COMM-017** - Add ESC key to close modals

**Quick Update:**
13. **QU-001** - Fix silent failure when tab not found (CRITICAL - data loss!)
14. **QU-003** - Add error object validation to prevent "Error: undefined"

**Contacts:**
15. **CON-001** - Fix escapeAttr() to handle all HTML special chars (security!)
16. **CON-003** - Fix race condition in Multi-Solution stat
17. **CON-010** - Add ESC key to close modal
18. **CON-011** - Add guard clause for empty email in modal

**Schedule:**
19. **SCH-001** - Fix overdue stat calculation (variable never incremented!)
20. **SCH-004** - Add missing exportToCSV function (export button broken!)

**Actions:**
21. **ACT-001** - Add ESC key to close drawer and modal
22. **ACT-002/003** - Add click-outside-to-close for drawer/modal overlays

**Team-NSITE:**
23. **TEAM-022** - Add getDirectingDocuments() to MO-APIs Library (**P0 CRITICAL!**)
24. **TEAM-002** - Fix holiday date formatting bug (P1)
25. **TEAM-006/007** - Add ESC key and click-outside-to-close for modals
26. **TEAM-013** - Fix Edit Meeting button (editMeeting() not defined - P1!)
27. **TEAM-017/018** - Escape HTML in meeting names and purpose fields (XSS)

**About:**
28. **ABT-010** - Add "Back to Top" button

---

## Database Checks Needed

~~These bugs were resolved by the Schema v2 migration (2026-01-22):~~

| Bug ID | Old Column | New v2 Column | Status |
|--------|------------|---------------|--------|
| ~~IMPL-008~~ | `purpose_mission` | `earthdata_purpose` | FIXED |
| ~~IMPL-009~~ | `drive_folder_url` | `admin_drive_folder` | FIXED |
| ~~IMPL-010~~ | `risk_register_url` | `docs_risk_register` | FIXED |
| ~~IMPL-011~~ | `data_product_table_url` | `product_data_products` | FIXED |
| ~~IMPL-012~~ | `atp_date`, etc. | `milestone_atp_date`, etc. | FIXED |

---

## Future Development

### Testing Suite (Pre-Portability Requirement)

Before MO-Viewer can be packaged for other organizations, a comprehensive testing suite is needed.

**Full strategy documented in**: `docs/TESTING_STRATEGY.md`

| Phase | Scope | Priority | Status |
|-------|-------|----------|--------|
| Phase 1 | In-GAS config & schema validation | P0 | Planned |
| Phase 2 | Jest tests + API contract tests | P1 | Planned |
| Phase 3 | Playwright E2E tests | P2 | Planned |

**Phase 1 Deliverables**:
- [ ] `deploy/test-runner.gs` - Test execution framework
- [ ] `deploy/test-config.gs` - CONFIG property validation
- [ ] `deploy/test-schema.gs` - Database schema validation
- [ ] `docs/DEPLOYMENT_CHECKLIST.md` - Manual setup verification

### Major Feature Requests

| Feature | Description | Effort | Status |
|---------|-------------|--------|--------|
| ~~SEP-010~~ | ~~Engagement detail modal~~ | ~~4 hours~~ | **DONE** |
| SEP-018 | Update touchpoint from UI | Large | Backlog |
| Drag-and-drop | Kanban-style column drag | Large | Backlog |
| Bulk actions | Multi-select for batch operations | Medium | Backlog |

---

## Summary by Section

| Section | P0 | P1 | P2 | P3 | Total |
|---------|----|----|----|----|-------|
| Team-NSITE | 1 | 3 | 16 | 6 | 26 |
| Implementation-NSITE | 0 | 6 | 7 | 2 | 15 |
| SEP-NSITE | 2 | 4 | 15 | 7 | 28 |
| Comms-NSITE | 2 | 9 | 15 | 8 | 34 |
| Quick Update | 1 | 5 | 10 | 5 | 21 |
| Contacts | 0 | 3 | 11 | 8 | 22 |
| Reports | 0 | 1 | 7 | 7 | 15 |
| Schedule | 0 | 2 | 4 | 3 | 9 |
| Actions | 0 | 0 | 9 | 3 | 12 |
| About | 0 | 0 | 4 | 6 | 10 |
| **Total** | **6** | **33** | **98** | **55** | **192** |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-01-19 | **SECURITY**: Implemented two-layer access control (NASA domain + MO-DB_Access whitelist) |
| 2026-01-19 | **DOCS**: Created TESTING_STRATEGY.md - comprehensive testing plan for portability |
| 2026-01-19 | **FIXED**: Stakeholder List now links to Contacts page filtered by solution |
| 2026-01-19 | **FIXED COMM-005/006**: Solution name validation with autocomplete datalist |
| 2026-01-19 | **FIXED IMPL-001**: Action Items stat now calls getOpenActions() API |
| 2026-01-19 | **FIXED IMPL-004**: Stakeholder List shows clickable link if URL provided |
| 2026-01-19 | **FIXED**: Add Event form missing date fields - added Start Date and End Date inputs, year derived from start_date |
| 2026-01-19 | **FIXED TEAM-022**: Library redeployed, Documents view working |
| 2026-01-19 | **FIXED 3 security bugs**: QU-006 (input sanitization), TEAM-017, TEAM-018 (XSS) |
| 2026-01-19 | **IMPROVED**: Weekly schedule meeting chips now scroll to details instead of popup |
| 2026-01-19 | **IMPROVED**: Replaced Feather icons with Material icons in team.html |
| 2026-01-19 | **DOCS**: Added Design System section to CLAUDE.md (Material icons, not Feather) |
| 2026-01-19 | **FIXED 5 P0 bugs**: QU-001, SEP-008, SEP-009, COMM-001, COMM-002 |
| 2026-01-19 | Added user observations: Schedule, Actions, Team, About (+10 bugs) |
| 2026-01-19 | **NEW P0**: TEAM-022 - MoApi.getDirectingDocuments not a function |
| 2026-01-19 | Added About section (9 bugs) - ALL PAGES NOW REVIEWED |
| 2026-01-19 | Expanded Team-NSITE section with deep review (21 bugs, up from 2) |
| 2026-01-19 | Added Schedule section (7 bugs) and Actions section (10 bugs) |
| 2026-01-19 | Added Reports page UI review (14 bugs) + user observation (RPT-019) |
| 2026-01-19 | Added user observations: Quick Update UI styling (QU-020, QU-021) |
| 2026-01-19 | Added Quick Update section (19 bugs) |
| 2026-01-19 | Added Contacts section (22 bugs including security findings) |
| 2026-01-19 | Initial bug tracker created from team review session |
| 2026-01-22 | **FIXED ACT-011**: Added Notes section to action drawer with Add Note functionality |
| 2026-01-22 | **FIXED ACT-015**: Slack bot integration - DMs on assignment, Mark Done/Add Update buttons |
| 2026-01-22 | **NEW**: Slack app manifest file for easy setup (`deploy/slack-app-manifest.yaml`) |
| 2026-01-22 | **IMPROVED**: Token caching for faster Slack API responses |
| 2026-01-22 | **IMPROVED**: First-name matching for action assignments (consistent with existing data) |
| 2026-01-22 | **SCHEMA**: MO-DB_Solutions v2 migration - 64 columns with semantic prefixes (core_, admin_, team_, milestone_, docs_, comms_, earthdata_, product_, funding_) |
| 2026-01-22 | **FIXED IMPL-008 to IMPL-013**: All Implementation detail modal issues resolved by schema v2 column mappings |
| 2026-01-23 | **FIXED**: SPA navigation errors - Added DOM guards to implementation.html (updateStats, updateMilestones, updateTrackingStats) to prevent "Cannot set properties of null" errors when navigating away while async callbacks pending |
| 2026-01-23 | **IMPROVED**: Meeting chips now display cadence for non-weekly meetings (e.g., "4th Monday") |
| 2026-01-23 | **IMPROVED**: Meeting chip click scrolls to detail row with highlight animation |
| 2026-01-23 | **DOCS**: Added Google Sheets database requirements to CLAUDE.md (Plain Text column formatting critical for time/date fields) |
| 2026-01-23 | **DOCS**: Added MO-DB_Meetings schema documentation to CLAUDE.md |
| 2026-01-23 | **SCHEMA**: Standardized solution foreign key columns to `solution_id` across all databases (was: solution_names, solution, etc.) |
| 2026-01-23 | **SECURITY**: Added client_secret*.json patterns to .gitignore (credential leak prevention) |
| 2026-01-23 | **SECURITY**: Fixed XSS vulnerability in access-denied.html - escaped adminEmail and userEmail in innerHTML |
| 2026-01-23 | **SECURITY**: Fixed open redirect vulnerability in auth-landing.html - added URL validation for redirectUrl |
| 2026-01-23 | **SECURITY**: Changed XFrameOptionsMode from ALLOWALL to SAMEORIGIN in Code.gs (clickjacking prevention) |
| 2026-01-23 | **SECURITY**: Fixed empty error handler in reports.html:2048 |
| 2026-01-23 | **SECURITY**: Added maxlength attributes to all textarea elements (DoS prevention) |
| 2026-01-23 | **CLEANUP**: Deleted unused OAuth client_secret file (was for removed Discover Events feature in Comms) |
| 2026-01-23 | **CLEANUP**: Removed all debug console.log statements from deploy/*.html (31 instances); converted error logs to console.error |
| 2026-01-28 | **LOGGED**: SEP-029 to SEP-031 - SPA navigation null element errors in sep.html (renderRecentEngagements, renderNeedsOutreach, renderAgencyTree) |
| 2026-01-28 | **LOGGED**: RPT-022 - MoApi.getApplicationSectors needs library redeployment |
| 2026-01-30 | **LOGGED**: UX-001 - Delete buttons in detail modals (engagements, availability, etc.) need loading/in-progress feedback like other button actions |
