# Next Development Steps

**Last Updated:** 2026-02-06
**Current Version:** 2.5.5

---

## 🎉 V2 COMPLETE

V2 is feature-complete with:
- 9 viewer pages
- 17 databases (added MO-DB_Templates, MO-DB_Parking, MO-DB_CommsAssets)
- Passphrase + whitelist authentication
- MO-APIs shared library architecture
- White-label branding system
- All P0 bugs resolved

**V3** will focus on feature enhancements based on stakeholder feedback.

---

## 📋 USER FEEDBACK: Comms-NSITE Vision (2026-02-03)

### Demo Feedback Summary

**Current Reality:** Comms work is highly custom - each outreach, story, or event requires manual combination of resources and information. The tool should reduce mental load on the backend so the team can quickly gather resources needed to produce custom output.

**Comms-NSITE Should Be:**
> "A one-stop shop for external-facing content to ensure the NSITE MO team is communicating on-brand and on-message. A place to find information quickly and communicate outwards to others."

### Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Reactive, not prescriptive** | Dashboard for manual actions, not workflow management |
| **Information at the drop of a hat** | Reduce time to find the right content |
| **On-brand, on-message** | Ensure consistent team communication |
| **Resource aggregator** | Combine info from multiple sources for custom output |

### Current Features (Aligned)
- ✓ Stories pipeline - track what's being communicated
- ✓ Events calendar - know what's coming up
- ✓ Event prep reports - quick guest/stakeholder briefings
- ✓ Key messages by solution - on-brand talking points
- ✓ Highlighter blurbs - ready-to-use content snippets

### Enhancement Ideas (V3 Candidates)

**Quick Access & Copy**
- [ ] One-click copy buttons for blurbs, key messages, talking points
- [ ] "Quick grab" panel - most frequently accessed content
- [ ] Recent/favorites section for frequently used resources

**Search-First Interface**
- [ ] "What do I say about X?" - instant answer search
- [ ] Cross-content search (blurbs + messages + stories)
- [ ] Smart suggestions based on context (solution, audience, channel)

**Communication Templates**
- [ ] Email templates for common scenarios
- [ ] Social media post templates
- [ ] Briefing document formats
- [ ] Presentation slide snippets

**Export & Integration**
- [ ] Export to clipboard (formatted)
- [ ] Direct email composition with pre-filled content
- [ ] Export to Google Docs (formatted)

### Backend Data Capture (To Explore)

The goal is reducing mental load - what information does the team need at their fingertips?

- **Solution talking points** - What to say about each solution (already have key_messages)
- **Audience-specific messaging** - Different angles for different stakeholders
- **Recent activity summary** - "What's new with X?" quick answers
- **Channel-appropriate content** - Same message, formatted for Twitter vs email vs presentation
- **Contact context** - Quick background before meetings (prep report does this for events)

### Questions to Explore
1. What information do team members most often need to look up?
2. What's the typical workflow when preparing external communication?
3. What content gets reused most frequently?
4. Where do team members currently go to find on-brand messaging?

---

## 🚨 FULL REVIEW SUITE RESULTS (2026-02-06)

**BLOCKING: Complete these 4 sprints BEFORE building new features.**

Full review suite (15 reviews) completed 2026-02-06. All P0/P1 issues fixed during review.
Remaining P2/P3 issues logged to `BUG_TRACKER.md` (root of nsite-mo-viewer).

### Review Scores

| Review | Score | Key Finding |
|--------|-------|-------------|
| 1. Security | B+ | 6 unescaped enum values in innerHTML (defense-in-depth) |
| 2. Error Handling | B- | 20 locations show raw error.message to users |
| 3. Performance | B+ | 3 pages missing CachedAPI entries |
| 4. DRY | B- | 6 duplicate closeModal, 5+ formatDate variants, 4 indexOf in team.html |
| 5. API Consistency | A- | 8 minor naming convention issues |
| 6. State Management | C+ | Only 33% of 184 async callbacks have navigation guards |
| 7. Accessibility | C | 20+ clickable elements lack keyboard support; modals lack ARIA roles |
| 8. Responsive | C- | 7 fixed-column grids break on mobile; 3/7 pages have zero breakpoints |
| 9. Loading States | A- | Only implementation.html missing spinner |
| 10. Schema Validation | C+ | 2 tables missing from DATA_SCHEMA.md; column mismatches |
| 11. Data Flow | A | Field names consistent end-to-end; XSS escaping thorough |
| 12. Code Comments | B+ | Library 95%+ JSDoc; 15 HTML functions need comments |
| 13. About Page | A- | Version/date fixed; MO-DB_Kudos missing from grid |
| 14. Style Consistency | C | 300+ hardcoded colors; duplicate CSS in 4 pages |
| 15. Data Connectivity | D+ | **67% of Solutions columns never surfaced in UI** |

### Issue Counts

| Severity | Count | Status |
|----------|-------|--------|
| P0/P1 | 2 | Fixed (about.html version + date) |
| P2 | 36 | Logged — address in Sprints 1-3 |
| P3 | 25 | Logged — address in Sprint 4 / maintenance |

### Sprint 1: Data Connectivity + State Guards (Highest Impact)

These changes transform the app from a status tracker into a decision-support tool.

- [ ] **DATA-01/02/03**: Surface alignment data (8 cols), technical specs (8 cols), milestone doc URLs (9 cols) in Implementation/SEP detail modals
- [ ] **DATA-04**: Surface team_ea_advocate, team_ra_rep_affiliation, team_stakeholder_list_url in solution detail modals
- [ ] **STATE-01**: Add navigation guards to comms.html (41 unguarded async callbacks)
- [ ] **STATE-02**: Add navigation guards + isSaving flags to contacts.html write operations
- [ ] **STATE-03**: Add navigation guard to team.html loadActions()
- [ ] **STATE-04**: Wire up 3 unused isSaving flags in comms.html (isSavingEvent, isSavingStory, isSubmittingNewEvent)
- [ ] **PERF-01/02**: Add CachedAPI entries for Comms (3 calls) and Team (5 calls) uncached API calls

### Sprint 2: CSS Consolidation + Accessibility ✅ COMPLETE

- [x] **STYLE-01**: Removed duplicate CSS from sep/comms/team/reports/implementation/contacts (~350 lines); updated shared-page-styles.html with modal flex layout, .btn-danger/.btn-icon/.btn-full
- [x] **STYLE-02**: Added ~30 CSS variables to styles.html; replaced hardcoded hex colors across all 7 pages (comms/team fully converted; sep/implementation/contacts/reports/schedule partially — remaining are API-required raw hex or Tailwind badge palette)
- [x] **DRY-05**: team.html closeModal now delegates to global window.closeModal()
- [x] **A11Y-01**: Added keyboard support to 3 comms quick-access cards (tabindex, role, onkeydown)
- [x] **A11Y-02**: Added role="dialog", aria-modal="true", aria-labelledby to all 34 modals across 7 files
- [x] **A11Y-03**: Added aria-label to contentSearchInput and assetsSearchInput in comms.html

### Sprint 3: Responsive + Error Handling + Security ✅ COMPLETE

- [x] **RESP-01/02**: Pipeline board breakpoints (1024→3col, 768→2col, 480→1col) in shared-page-styles.html; weekly-grid (1024→3col, 768→2col) and doc-status-grid (768→2col) page-specific
- [x] **RESP-03**: Events-content grid breakpoint (768→1col) in comms.html; quick-access/story grids already use auto-fit (no fix needed)
- [x] **RESP-04**: Table containers changed from overflow:hidden to overflow-x:auto (coverage + events tables)
- [x] **ERR-01**: 20 raw error.message instances replaced with user-friendly messages across 11 files
- [x] **SEC-01 through SEC-06**: All 6 unescaped values wrapped in escapeHtml() (comms.html event status/type, story status/channel; team.html source_date; schedule.html milestone status)
- [x] **DRY-04**: 4 indexOf() !== -1 converted to includes() in team.html

### Sprint 4: Documentation + Cleanup ✅ COMPLETE

- [x] **SCHEMA-02**: Added 16 undocumented Contact fields (engagement tracking + About Me profiles) to DATA_SCHEMA.md
- [x] **SCHEMA-03/04**: Added MO-DB_Outreach (19 cols, 2 enums) and MO-DB_Updates (6 cols, multi-tab) formal definitions
- [x] **SCHEMA-05**: Documented core_application_sectors in Solutions schema with usage note
- [x] **SCHEMA-06**: Fixed funding_type === 'Y' → funding_status === 'Funded' in solutions-api.gs
- [x] **DRY-01**: capitalizeFirst() consolidated to global in index.html; removed from comms.html + schedule.html
- [x] **DRY-02**: formatDate() wrappers removed from comms.html + sep.html; 22 call sites → formatDateShort()
- [x] **COMMENT-01/02/03**: Added comments to 15 complex functions in sep.html (8) and comms.html (7)
- [x] **ABOUT-01**: Added MO-DB_Kudos to about.html database grid (now 19 databases); version → 2.5.5
- [x] **DATA-05**: Surfaced earthdata_background + earthdata_societal_impact in Implementation detail modal

### Reference Files

| File | Purpose |
|------|---------|
| `BUG_TRACKER.md` | All 61 findings with file:line references and fix instructions |
| `docs/STYLE_GUIDE.md` | CSS variable and component patterns |
| `docs/DATA_SCHEMA.md` | Database column definitions (needs updates per Sprint 4) |
| `deploy/shared-page-styles.html` | Single source of truth for shared CSS |
| `deploy/index.html` | Global utilities (escapeHtml, createErrorHandler, CachedAPI, navigation guards) |

---

## 🐛 LEGACY BUG TRACKER

**Previous bug tracker:** [`docs/BUG_TRACKER.md`](docs/BUG_TRACKER.md)
**New review findings:** [`BUG_TRACKER.md`](BUG_TRACKER.md) (root — created 2026-02-06)

### Previous P0 Issues - All Fixed
- ~~TEAM-022~~ - Fixed: Library redeployed with getDirectingDocuments
- ~~SEP-008~~ - Fixed: Loading state added to Log Engagement button
- ~~SEP-009~~ - Fixed: Engagement logs now clickable
- ~~COMM-001~~ - Fixed: createEvent() added, replaced with Add Event form
- ~~COMM-002~~ - Fixed: JS syntax corrected
- ~~QU-001~~ - Fixed: Friendly error message when tab not found

---

## ✅ TESTING COMPLETE (2026-01-18)

**All 6 report exports confirmed working:**
- [x] Need Alignment - works, has performance warning notice
- [x] Stakeholder Coverage - fixed column mismatch bug
- [x] Department Reach - fixed column mismatch bug
- [x] Engagement Funnel - working
- [x] Detailed Milestones - working
- [x] Historical Updates - fixed data structure handling

---

## Completed This Session (2026-01-26) - SEP Email & Solution Detail Improvements

- [x] **SEP SOLUTION DETAIL MODAL REDESIGN**
  - Reordered sections: Name, Cycle/Phase, Recent Engagements (+Log button), Team, Stakeholders, Agencies, Milestone Timeline
  - Lighter design with reduced font weights, subtle dividers, more whitespace
  - Clickable engagements open full engagement detail modal
  - Modal return navigation - closing engagement detail returns to solution modal
  - Agencies displayed as pills/chips, stakeholders as simple list

- [x] **EMAIL ALL STAKEHOLDERS** (SEP Solution Detail)
  - "Email All" button in Stakeholders section header
  - Collects all stakeholder emails for the solution
  - Opens email composer with recipients pre-filled
  - Solution context auto-selected

- [x] **LOG EMAIL AS ENGAGEMENT** (Email Composer)
  - "Log as Engagement" button creates engagement record
  - Activity type: Email, Direction: Outbound
  - Captures recipients, subject, solution, and email body

- [x] **EMAIL COMPOSER UX IMPROVEMENTS**
  - "Add Recipient" dropdown appends to To field (not replaces)
  - Prevents duplicate email addresses
  - Fixed engagement_id property check (was `id`, now `engagement_id`)

- [x] **SEP OVERVIEW TABLE - MILESTONE COLUMN**
  - Shows Last → Next milestone names (e.g., "TP4 → WS2")
  - Calculated from milestone dates relative to today

---

## Completed Earlier (2026-01-26) - Contacts, Comms Enhancements

- [x] **ADD CONTACT FORM** (Contacts Directory)
  - "Add Contact" button in page header opens modal form
  - Required fields: First Name, Last Name, Email (with duplicate check)
  - Organization section: Phone, Title, Department, Agency (autocomplete), Organization, Region
  - Collapsible "Solution & Engagement" section: Solution dropdown, Role, SEP Touchpoint, Engagement Level
  - Collapsible "Notes" section for relationship notes
  - Toast notifications for success/error feedback
  - Files updated: `deploy/contacts.html`, `deploy/contacts-api.gs`, `library/contacts-api.gs`

- [x] **EXPORT PREP REPORT TO GOOGLE DOC** (Comms Events)
  - "Export to Doc" button appears after generating prep report
  - Creates formatted Google Doc with:
    - Event details (name, date, location, type)
    - Summary stats (guests, agencies, connections, solutions)
    - Agencies represented, potential connections, conversation starters
    - Linked solutions, full guest profiles
    - Footer with generation timestamp
  - Opens document in new tab automatically
  - Files updated: `deploy/comms.html`, `deploy/outreach-api.gs`, `library/outreach-api.gs`

- [x] **EVENT CARD REDESIGN** (Comms Events)
  - Cleaner, more spacious design with increased padding
  - Subtle shadow and border instead of heavy left border
  - Smooth hover effect with slight elevation
  - Type icon in circular badge, prominent title
  - Details (date, location) grouped in neat column layout
  - Action buttons separated by subtle divider

- [x] **EVENT STATUS BADGES CLEANUP** (Comms Events)
  - Replaced inline styles with CSS classes (.event-status.{status})
  - Consistent design across cards, table, and modal
  - Status colors: potential (gray), considering (blue), confirmed (green), attended (muted), cancelled (strikethrough)

---

## Completed Earlier (2026-01-26) - Templates Database & API

- [x] **MO-DB_TEMPLATES DATABASE** (NEW)
  - Comprehensive email/meeting templates for SEP and Comms integration
  - 56 templates across 6 categories: Assessment, Implementation, SEP, Supplementary, Outreach, Blurbs
  - Schema: template_id, category, subcategory, phase, name, meeting_title, attendees, key_points, email_subject, email_body, attachments_notes, is_active, sort_order
  - Source: Meeting Invite Language PDF (NSITE MO C0 2025)
  - Files created:
    - `source-archives/MO-DB_Templates.xlsx` - Full Excel database
    - `database-files/templates-schema.csv` - CSV for Google Sheets import

- [x] **TEMPLATES API** (NEW)
  - Created `library/templates-api.gs` - Full implementation
  - Created `deploy/templates-api.gs` - Thin wrapper
  - Functions include:
    - `getAllTemplates()`, `getTemplateById()`, `getTemplatesByCategory()`
    - `getSEPTemplates()`, `getSEPTouchpointTemplates()`, `getSEPWorkingSessionTemplates()`
    - `getImplementationTemplates()`, `getDecisionGateTemplates()`, `getKickoffTemplates()`
    - `getOutreachTemplates()`, `getBlurbTemplates()`, `getBlurbForMilestone()`
    - `applyTemplate(templateId, variables)` - Variable substitution
    - `searchTemplates(query)`, `getTemplateStats()`, `getTemplateCategories()`
    - `getEmailTemplatesForSEP()` - Backward compatible with existing SEP email modal
    - `getCommsTemplates()` - Templates organized for Comms page

- [x] **BACKWARD COMPATIBILITY**
  - Updated `team-api.gs` `getEmailTemplates()` to use new TEMPLATES_SHEET_ID
  - Falls back to EMAIL_TEMPLATES_SHEET_ID if new database not configured
  - Existing SEP email modal will work with both old and new templates

- [x] **DOCUMENTATION UPDATES**
  - Updated CLAUDE.md with new database and API file
  - Updated database count in NEXT_STEPS.md

### Deployment Steps (Templates)
1. Create Google Sheet from `source-archives/MO-DB_Templates.xlsx` or `database-files/templates-schema.csv`
2. Add `TEMPLATES_SHEET_ID` to MO-DB_Config
3. Deploy `library/templates-api.gs` to MO-APIs Library
4. Deploy `deploy/templates-api.gs` to NSITE-MO-Viewer

---

- [x] **MO-DB_PARKING DATABASE** (NEW)
  - Parking Lot feature for capturing ideas, discussion topics, stakeholder connections, etc.
  - Item types: Idea, Discussion Topic, Stakeholder Connection, Follow-up, Process Suggestion, Random Info
  - Status workflow: New → Discussed → Assigned → In Progress → Resolved → Archived
  - Assignable to team members with owner tracking
  - Schema: item_id, title, description, item_type, status, priority, submitted_by, assigned_to, solution_id, contact_id, tags, notes, created_at, updated_at
  - Files created:
    - `database-files/parking-lot-schema.csv` - CSV for Google Sheets import

- [x] **PARKING LOT API** (NEW)
  - Created `library/parking-lot-api.gs` - Full implementation
  - Created `deploy/parking-lot-api.gs` - Thin wrapper
  - Functions include:
    - `getAllParkingLotItems()`, `getParkingLotItemById()`, `createParkingLotItem()`, `updateParkingLotItem()`, `deleteParkingLotItem()`
    - `getParkingLotItemsByType()`, `getParkingLotItemsByStatus()`, `getParkingLotItemsByAssignee()`
    - `assignParkingLotItem()`, `updateParkingLotItemStatus()`, `addNoteToParkingLotItem()`
    - `searchParkingLotItems()`, `getParkingLotStats()`

- [x] **TEAM PAGE - PARKING LOT TAB** (NEW)
  - Added "Parking Lot" tab to Team page view toggle
  - Quick add form with type picker, priority, solution link, tags
  - Item feed with type/status filtering
  - Item detail modal with status updates, assignment, notes
  - Stats card showing total items, new items, high priority

### Deployment Steps (Parking Lot)
1. Create Google Sheet from `database-files/parking-lot-schema.csv`
2. Add `PARKING_LOT_SHEET_ID` to MO-DB_Config
3. Deploy `library/parking-lot-api.gs` to MO-APIs Library
4. Deploy `deploy/parking-lot-api.gs` to NSITE-MO-Viewer
5. Deploy updated `deploy/team.html` to NSITE-MO-Viewer

---

## Completed Previous Session (2026-01-25) - Bug Fixes & Historical Updates Report

- [x] **CONTACTS API BUG FIX** - Fixed `solution_id_id` → `solution_id` column name mismatch
  - `getContactsBySolution()`, `getContactsBySolutionId()`, `getContactsMultiFilter()` all fixed
  - Stakeholders now display correctly in Implementation solution detail modals

- [x] **UPDATES API RESPONSE SIZE FIX** - Fixed null responses exceeding ~5MB limit
  - `getUpdatesForSolutionCard()` now limited to 10 recent + 10 extended updates
  - Text truncated to 300 chars for card display
  - Updates now load correctly in solution detail modals

- [x] **HISTORICAL UPDATES REPORT IMPROVEMENTS** (Reports page)
  - Updates grouped by date under single headers
  - Dates link to source documents (source_url field)
  - Increased text limit from 500 to 1000 characters
  - Bullet points render as line breaks
  - Shared background per date group for readability

- [x] **IMPLEMENTATION PAGE ENHANCEMENTS**
  - Markdown links in Recent Updates now clickable
  - Animated loading spinner during modal load

- [x] **DOCUMENTATION CONSOLIDATION**
  - Merged claude-instructions.md into CLAUDE.md
  - Added System Architecture & Data Flow section
  - Complete data flow map: Source Docs → Databases → APIs → Pages
  - Critical column name dependencies documented
  - Response size limits documented

---

## Completed Previous Session (2026-01-22) - Solutions Schema v2

- [x] **MO-DB_SOLUTIONS SCHEMA v2** - Major refactoring with semantic prefixes
  - Reduced from 76 → 64 columns
  - Added 9 semantic prefixes: `core_`, `funding_`, `admin_`, `team_`, `earthdata_`, `comms_`, `product_`, `milestone_`, `docs_`
  - Merged `name` (colloquial) into `core_alternate_names`
  - Added 5 new presentation URL columns for milestones
  - Dropped 17 columns (status fields now derived from URL presence)
  - Column names use underscores for JS dot notation compatibility
  - Migration script: `scripts/solutions_schema_v2.py`
  - Output: `MO-DB_Solutions_v2.xlsx`

---

## Completed Previous Session (2026-01-18) - Report Exports, Comms-NSITE & Database Consolidation

- [x] **REPORT EXPORT TO GOOGLE SHEETS** (NEW)
  - All 6 reports now export to multi-tab Google Sheets with methodology documentation
  - Each export includes a "Methodology & Data Sources" tab with:
    - Clickable links to source databases
    - Calculation explanations for all scores
    - Verification instructions for leadership review
  - Performance optimized with batch `setValues()` instead of `appendRow()` loops
  - Confidence weighting added to Need Alignment report
  - Created `historical-updates-export.gs` for Historical Updates report
  - Created `export-helpers.gs` for shared export utilities (de-duplicated code)
  - Generic `exportToGoogleSheet()` handler in reports.html
  - Added performance warning notice for Need Alignment report

- [x] **COMMS-NSITE ENHANCEMENTS**
  - Added Admin Priorities view showing stories aligned with Biden-Harris priorities
  - Added admin_priorities checkbox group to story form
  - 5 priority categories: Partnerships, Citizen Science, AI Innovation, Science Integrity, Efficiency
  - renderPrioritiesView() function with priority cards

- [x] **MO-DB_STORIES DATABASE** (NEW)
  - 38 stories extracted from NSITE Story Tracking workbook
  - 6 content types: story, web_content, social_media, nugget, key_date, science_advancement
  - 22 columns including admin_priorities and source tracking
  - Created sync-stories-from-tracking.gs (container-bound)
  - Created sync_stories_from_tracking.py (local development)

- [x] **MO-DB_SOLUTIONS CONSOLIDATION** (**MAJOR CLEANUP**)
  - Reduced from 80 → 48 columns (32 columns removed/migrated)
  - Milestone data extracted to MO-DB_Milestones
  - Empty columns removed (17 with no data)
  - Redundant columns merged
  - Created consolidate_solutions_db.py script

- [x] **MO-DB_MILESTONES DATABASE** (NEW)
  - 185 milestone records extracted from Solutions
  - Columns: milestone_id, solution_id, milestone_type, target_date, actual_date, status, notes
  - Milestone types: ATP, F2I, ORR, Closeout, various memo dates

- [x] **KEY MESSAGES INTEGRATION**
  - **Key Messages View** in Comms-NSITE with search, summary stats, and card grid
  - 6 new columns added to MO-DB_Solutions:
    - key_messages, focus_type, industry_connections
    - scientific_advancement, agency_use_impact, public_comms_links
  - Key Messages API functions in solutions-api.gs:
    - getKeyMessages(solutionId)
    - getSolutionsWithKeyMessages()
    - getKeyMessagesSummary()
    - searchKeyMessages(query)
  - 13 solutions populated with key messages data

---

## Completed Previous Session (2026-01-18) - API Conversion & Team Viewer

- [x] **TRUE THIN WRAPPER CONVERSION** (**MAJOR ARCHITECTURE CHANGE**)
  - All 10 deploy/*-api.gs files now delegate to MoApi library
  - Full implementations moved to library/ folder
  - Deploy wrappers reduced from ~6,500 lines to ~700 lines total
  - Pattern: `function X(...args) { return MoApi.X(...args); }`
  - APIs converted: solutions, contacts, agencies, updates, engagements, team, actions, milestones, outreach, stories

- [x] **4 NEW LIBRARY API FILES**
  - Added `library/actions-api.gs` - Action tracking with bi-directional agenda sync
  - Added `library/milestones-api.gs` - Milestone tracking for Implementation-NSITE
  - Added `library/outreach-api.gs` - Event/outreach tracking with web discovery
  - Added `library/stories-api.gs` - Communications story pipeline

- [x] **Team Viewer - Documents View Implementation**
  - Added `getDirectingDocuments()` function to team-api.gs (deploy and library)
  - Reads 16 directing document IDs from MO-DB_Config
  - Documents grouped by category: Core, SEP, Comms, Assessment, Operations
  - Renders clickable document cards with icons and descriptions
  - Document count now shows in Team stats

---

## Completed Previous Session (2026-01-17) - MO-APIs Library, Wrapper Conversion & SPA Navigation

- [x] **SPA Navigation Architecture** - Fixed blank page after 3 tab clicks (**CRITICAL FIX**)
  - Root cause: Google Apps Script iframe sandbox fails after ~3 `window.location` navigations
  - Implemented Single Page Application (SPA) pattern using `google.script.history`
  - Added `getPageHTML(pageName)` to Code.gs for dynamic content loading
  - Navigation now uses `google.script.run` + `innerHTML` instead of page reloads
  - Browser back/forward buttons work correctly
  - Bonus: Nav bar now works in Apps Script preview mode
  - Full documentation: `docs/SPA_NAVIGATION.md`

- [x] **MO-APIs Library** - Standalone shared data access layer (**DEPLOYED & TESTED**)
  - Created `library/` folder with extracted APIs
  - `config-helpers.gs` - configuration loading and database sheet access
  - `solutions-api.gs` - includes `findSolutionIdsInText()` for name matching
  - `contacts-api.gs`, `agencies-api.gs`, `updates-api.gs`, `engagements-api.gs`
  - Deployed as Apps Script Library with identifier: `MoApi`
  - Config: `CONFIG_SHEET_ID` script property points to MO-DB_Config
  - All 6 databases verified accessible

- [x] **API Code Organization** - Parallel library and deploy implementations
  - `library/*-api.gs` files contain shared implementations (MO-APIs Library)
  - `deploy/*-api.gs` files contain identical implementations for web app
  - HTML files use `google.script.run` to call deploy API functions
  - All UI viewers tested and working (Implementation, SEP, etc.)
  - **Note:** True thin wrapper conversion not yet implemented - deploy files have full implementations

- [x] **Monthly Meeting Presentations Sync**
  - Created `sync-monthly-presentations.gs` for MO-DB_Updates container
  - Parses Google Slides presentations from MONTHLY_FOLDER_ID
  - Solution identification: speaker notes (preferred) or name mapping (fallback)
  - Categorizes updates: programmatic, development, engagement, roadblock

- [x] **MO-DB_Solutions Schema Update**
  - Added `alternate_names` column for solution name variants
  - Pipe-delimited (e.g., "Harmonized Landsat Sentinel-2|HLS v2")
  - Used by `findSolutionIdsInText()` - no code changes needed for new variants

- [x] **Reports Page Refinements**
  - Removed QuickLook CSV report (MO Viewer replaces its function)
  - Removed Export functionality temporarily (needs review)
  - Restored comprehensive "How is this calculated?" methodology sections
  - **Need Alignment report**: Expandable solution rows - click to see gap analysis inline
  - No more scrolling to find details - everything expands in place

- [x] **MO-DB_Contacts Schema Update**
  - Added 6 internal team columns: `is_internal`, `internal_title`, `internal_team`, `supervisor`, `start_date`, `active`
  - Enables tracking internal MO team members without separate database
  - Updated DATA_SCHEMA.md documentation

- [x] **Earlier: MO-DB_Updates & Updates API**
  - Created `sync-updates-to-db.gs` - parses 🆕 updates from agenda documents
  - Created `updates-api.gs` - data access layer with caching
  - Supports Internal Planning, SEP Strategy, OPERA Monthly, PBL Monthly agendas

---

## Completed Earlier (2026-01-16) - SEP-NSITE Complete

- [x] **SEP-NSITE Viewer** - Phase 5 stakeholder engagement pipeline
  - Created `sep.html` - complete UI with pipeline and agencies views
  - Pipeline view with 7 touchpoint columns (T4, W1, W2, T5, T6, T7, T8)
  - Agencies view with hierarchical organization browser
  - Stats dashboard: Contacts, Agencies, Need Follow-up, This Week
  - Engagement log panel with recent activities
  - Log engagement modal for recording interactions
  - Contact detail modal with engagement history
  - Agency detail panel with enriched data display

- [x] **MO-DB_Agencies Database** - Organization hierarchy
  - 43 agencies with parent-child relationships
  - Created `agencies-api.gs` - CRUD, hierarchy queries, search, statistics
  - Enriched with web research:
    - Mission statements for 36 agencies
    - Earth observation data interests
    - Official website URLs (clickable hyperlinks)
    - Geographic scope and relationship status
  - Created `seed_agencies.py` - initial extraction from contacts
  - Created `enrich_agencies.py` - enrichment from Agency Overviews folder
  - Created `update_agencies_enriched.py` - web research data population
  - Created `add_hyperlinks.py` - Excel hyperlink formatting

- [x] **MO-DB_Engagements Database** - Engagement logging
  - 17 columns for tracking stakeholder interactions
  - Created `engagements-api.gs` - CRUD and relationship queries

- [x] **MO-DB_Contacts Enhanced** - 9 new SEP columns
  - touchpoint_status, lifecycle_phase, engagement_level
  - agency_id, title, region
  - last_contact_date, next_scheduled_contact, relationship_notes
  - Enhanced `contacts-api.gs` with SEP functions

- [x] **Integration**
  - Updated `Code.gs` with AGENCIES_SHEET_ID and ENGAGEMENTS_SHEET_ID
  - Updated `index.html` with SEP routing
  - Compact styling for agency detail panel

---

## Completed Earlier (2026-01-16) - MO-DB_Needs & True Alignment Analysis

- [x] Created **MO-DB_Needs database** - granular stakeholder survey responses
  - 2,049 records extracted from 47 solution stakeholder Excel files
  - Survey data from 2018, 2020, 2022, 2024 cycles
- [x] **Rewrote Need Alignment report** for actual needs comparison
  - New scoring: degreeNeedMet (40), resolutionMatch (20), frequencyMatch (20), coverageMatch (20)

---

## Priority Tasks for Next Session

### 1. Comms-NSITE Completion

**Remaining Features**
- [ ] Add Key Messaging panel to comms.html (view/search key messages)
- [ ] External Mentions tracking (track published stories across channels)
- [ ] Story analytics and coverage metrics

**Documentation**
- [ ] Update about.html with full Comms-NSITE documentation

### 2. SEP-NSITE Enhancements

**Data Population**
- [ ] Assign touchpoint_status to existing contacts based on roles
- [ ] Link contacts to agencies via agency_id
- [ ] Create sample engagements for testing

**Features**
- [ ] Drag-and-drop pipeline cards
- [ ] Contact quick-edit from cards
- [ ] Engagement timeline visualization

---

## Technical Debt / Improvements

### Known Bugs
- [x] ~~**Blank page after 3 tab clicks**~~ - Fixed: SPA navigation architecture (2026-01-17)
  - See `docs/SPA_NAVIGATION.md` for full technical documentation

### Implementation-NSITE
- [x] ~~Add loading states for async operations~~ - Standardized in styles.html (2026-01-18)
- [x] ~~Implement actual export functionality (CSV download)~~ - exportToCSV utility (2026-01-18)

### Contacts Directory
- [ ] Add inline editing capability
- [ ] Add bulk email functionality
- [ ] Add contact merge for duplicates

### Platform
- [x] ~~Add global search functionality~~ - Ctrl+K to search (2026-01-18)
- [x] ~~Standardize loading states~~ - Consolidated CSS + utilities (2026-01-18)
- [ ] Add help documentation/tour
- [ ] Add Glossary shared resource

### Future Development: Database Instruction Sheets
- [ ] Add an "Instructions" tab to each of the 19 databases with usage guidance, column definitions, and validation rules. Databases:
  - DB_Access, DB_Actions, DB_Agencies, DB_Availability, DB_BugLog
  - DB_CommsAssets, DB_Contacts, DB_Engagements, DB_Glossary, DB_Kudos
  - DB_Meetings, DB_Milestones, DB_Needs, DB_Outreach, DB_Parking
  - DB_Solutions, DB_Stories, DB_Templates, DB_Updates

---

## Deploy Files Reference

### MO-APIs Library (standalone Apps Script project)
```
library/
├── config-helpers.gs       # Configuration loading, getConfigValue(), getDatabaseSheet()
├── solutions-api.gs        # Solutions data + findSolutionIdsInText()
├── contacts-api.gs         # Contacts data (stakeholders, SEP)
├── agencies-api.gs         # Agencies hierarchy
├── updates-api.gs          # Updates data
├── engagements-api.gs      # Engagements logging
├── team-api.gs             # Team, availability, meetings, glossary, directing docs
├── actions-api.gs          # Actions tracking with bi-directional agenda sync
├── milestones-api.gs       # Milestone tracking
├── outreach-api.gs         # Event/outreach tracking
├── stories-api.gs          # Communications story pipeline
├── templates-api.gs        # Email/meeting templates for SEP & Comms
└── parking-lot-api.gs      # Parking lot ideas/topics capture
```

### NSITE-MO-Viewer (main web app)
```
deploy/
├── Code.gs                 # Main Apps Script entry point, config keys
├── about.html              # Platform documentation page
├── agencies-api.gs         # THIN WRAPPER → MoApi.getAllAgencies(), etc.
├── actions-api.gs          # THIN WRAPPER → MoApi.getAllActions(), etc.
├── contacts.html           # Contacts Directory UI
├── contacts-api.gs         # THIN WRAPPER → MoApi.getAllContacts(), etc.
├── contacts-menu.gs        # Contacts sheet menu
├── earthdata-sync.gs       # Earthdata.nasa.gov content scraper/sync
├── engagements-api.gs      # THIN WRAPPER → MoApi.getAllEngagements(), etc.
├── export-helpers.gs       # Shared export utilities (styling, formatting)
├── implementation.html     # Implementation-NSITE UI
├── index.html              # Platform shell with SPA routing
├── milestones-api.gs       # THIN WRAPPER → MoApi.getAllMilestones(), etc.
├── navigation.html         # Tab navigation
├── outreach-api.gs         # THIN WRAPPER → MoApi.getAllEvents(), etc.
├── quadchart-data.gs       # Quad Chart report generator
├── quick-update.html       # Quick Update Form UI
├── quick-update-handlers.gs # Quick Update backend
├── quicklook-generator.gs  # QuickLook CSV report generator
├── reports.html            # Reports tab UI (redesigned UX)
├── schedule.html           # Schedule timeline view
├── sep.html                # SEP-NSITE UI
├── stakeholder-solution-alignment.gs  # Advanced stakeholder reports + exports
├── historical-updates-export.gs       # Historical Updates report export
├── solutions-api.gs        # THIN WRAPPER → MoApi.getAllSolutions(), etc.
├── stories-api.gs          # THIN WRAPPER → MoApi.getAllStories(), etc.
├── templates-api.gs        # THIN WRAPPER → MoApi.getAllTemplates(), etc.
├── parking-lot-api.gs      # THIN WRAPPER → MoApi.getAllParkingLotItems(), etc.
├── styles.html             # Shared CSS
├── team.html               # Team-NSITE UI (profiles, actions, availability, guidance, kudos, parking lot)
├── team-api.gs             # THIN WRAPPER → MoApi.getInternalTeam(), etc.
└── updates-api.gs          # THIN WRAPPER → MoApi.getAllUpdates(), etc.
```

**ARCHITECTURE:** All deploy/*-api.gs files are now THIN WRAPPERS that delegate to the MoApi library.
Full implementations live in library/*-api.gs files.

### Container-Bound Scripts (in respective database sheets)
```
MO-DB_Updates:
├── sync-updates-to-db.gs       # Sync from agenda docs (🆕 markers)
└── sync-monthly-presentations.gs # Sync from Monthly Meeting slides

MO-DB_Actions:
├── sync-actions.gs             # Sync actions from agendas
└── sync-actions-to-db.gs       # Alternative sync script
```

---

## Data Sources Reference

**17 Databases Total**

| Database | Google Sheet | Local Backup | Records | Status |
|----------|--------------|--------------|---------|--------|
| MO-DB_Actions | Yes | `MO-Viewer Databases/` | -- | **Active** |
| MO-DB_Agencies | Yes | `MO-Viewer Databases/` | 43 agencies | **Populated** |
| MO-DB_Availability | Yes | `MO-Viewer Databases/` | Team OOO | **Active** |
| MO-DB_Config | Yes | `MO-Viewer Databases/` | Configuration | **Active** |
| MO-DB_Contacts | Yes | `MO-Viewer Databases/` | 4,221 records | **Enhanced** |
| MO-DB_Engagements | Yes | `MO-Viewer Databases/` | -- | **Ready** |
| MO-DB_Glossary | Yes | `MO-Viewer Databases/` | Terms | **Active** |
| MO-DB_Meetings | Yes | `MO-Viewer Databases/` | Meetings | **Active** |
| MO-DB_Milestones | Yes | `MO-Viewer Databases/` | 185 milestones | **NEW** |
| MO-DB_Needs | Yes | `MO-Viewer Databases/` | 2,049 responses | **Populated** |
| MO-DB_Outreach | Yes | `MO-Viewer Databases/` | Events | **Active** |
| MO-DB_Solutions | Yes | `MO-Viewer Databases/` | 48 solutions (64 cols) | **Schema v2** |
| MO-DB_Stories | Yes | `MO-Viewer Databases/` | 38 stories | **NEW** |
| MO-DB_Templates | Yes | `MO-Viewer Databases/` | 56 templates | **NEW** |
| MO-DB_Parking | Yes | `MO-Viewer Databases/` | -- | **Active** |
| MO-DB_CommsAssets | Yes | `MO-Viewer Databases/` | -- | **Active** |
| MO-DB_Updates | Yes | `MO-Viewer Databases/` | -- | **Active** |

**Local Database Files:** `C:\...\MO-development\database-files\MO-Viewer Databases\`
**Source Archives:** `C:\...\MO-development\source-archives\`

---

## Session Checklist

Before starting next session:
- [ ] Review this document
- [ ] Check databases for any manual updates
- [ ] Verify deployment is still working
- [ ] Identify top priority from list above

After session:
- [ ] Update CHANGELOG.md
- [ ] Update this NEXT_STEPS.md
- [ ] Commit changes to git
- [ ] Deploy updated files to Google Apps Script
