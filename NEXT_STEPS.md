# Next Development Steps

**Last Updated:** 2026-01-18
**Current Version:** 1.3.0

---

## Completed This Session (2026-01-18) - Comms-NSITE & Database Consolidation

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
- [ ] Implement actual export functionality (CSV download)

### Contacts Directory
- [ ] Add inline editing capability
- [ ] Add bulk email functionality
- [ ] Add contact merge for duplicates

### Platform
- [x] ~~Add global search functionality~~ - Ctrl+K to search (2026-01-18)
- [x] ~~Standardize loading states~~ - Consolidated CSS + utilities (2026-01-18)
- [ ] Add help documentation/tour
- [ ] Add Glossary shared resource

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
└── stories-api.gs          # Communications story pipeline
```

### NSITE-MO-Viewer (main web app)
```
deploy/
├── Code.gs                 # Main Apps Script entry point, config keys
├── about.html              # Platform documentation page
├── actions.html            # Actions-NSITE UI
├── agencies-api.gs         # THIN WRAPPER → MoApi.getAllAgencies(), etc.
├── actions-api.gs          # THIN WRAPPER → MoApi.getAllActions(), etc.
├── contacts.html           # Contacts Directory UI
├── contacts-api.gs         # THIN WRAPPER → MoApi.getAllContacts(), etc.
├── contacts-menu.gs        # Contacts sheet menu
├── earthdata-sync.gs       # Earthdata.nasa.gov content scraper/sync
├── engagements-api.gs      # THIN WRAPPER → MoApi.getAllEngagements(), etc.
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
├── stakeholder-solution-alignment.gs  # Advanced stakeholder reports
├── solutions-api.gs        # THIN WRAPPER → MoApi.getAllSolutions(), etc.
├── stories-api.gs          # THIN WRAPPER → MoApi.getAllStories(), etc.
├── styles.html             # Shared CSS
├── team.html               # Team-NSITE UI (profiles, meetings, availability, docs)
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

**13 Databases Total**

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
| MO-DB_Solutions | Yes | `MO-Viewer Databases/` | 37 solutions (48 cols) | **Consolidated** |
| MO-DB_Stories | Yes | `MO-Viewer Databases/` | 38 stories | **NEW** |
| MO-DB_Updates | Yes | `MO-Viewer Databases/` | -- | **Ready** |

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
