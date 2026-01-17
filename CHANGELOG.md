# Changelog

All notable changes to the MO-Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **sync-updates-to-db.gs**: Container-bound script for MO-DB_Updates that parses 🆕 updates from agenda documents
  - Supports Internal Planning (table format) and SEP Strategy (paragraph format)
  - Also supports OPERA Monthly and PBL Monthly agendas
  - Reads config from MO-DB_Config (INTERNAL_AGENDA_ID, SEP_AGENDA_ID, etc.)
  - Deduplicates by solution + update text
  - Custom menu for manual sync triggers
- **updates-api.gs**: Data access layer for MO-DB_Updates
  - `getAllUpdates()`, `getUpdatesBySolution()`, `getRecentUpdatesBySolution()`
  - `getUpdatesForSolutionCard()` - structured data for solution cards (recent/extended/historical)
  - `getUpdatesGroupedBySolution()`, `getUpdatesStats()`
  - Cache with 1-minute duration
- **MO-DB_Contacts schema**: Added 6 internal team columns
  - `is_internal` (Y/N), `internal_title`, `internal_team`, `supervisor`, `start_date`, `active`
  - Enables tracking internal MO team members without separate database

### Changed
- **reports.html**: Reports page UX improvements
  - Removed QuickLook CSV report (MO Viewer replaces its function)
  - Removed Export functionality (temporary - for review)
  - Restored comprehensive "How is this calculated?" methodology sections for all 7 reports
  - **Need Alignment report**: Expandable solution rows - click any solution to see its gap analysis inline
  - Compact card layout with 4 cards across (responsive: 4→3→2→1)
  - Removed Impl/SEP/Comms badges from cards (reduced visual noise)

### Planned
- Comms-NSITE (communications/story tracking)
- Automation & Sync (scheduled exports, email notifications)

---

## [1.0.1] - 2026-01-16

### Changed
- **Renamed**: "MO-Viewer" → "NSITE MO Viewer" throughout platform
- **Security**: Access restricted to NASA.gov Google Workspace accounts only
  - Deployment: Execute as Me, Who has access: Anyone within NASA.gov
  - External accounts blocked by Google
- **Header**: Removed user email display (not functional with "Execute as Me" deployment)
- **About page**: Added fallback CSS variables for consistent styling
- **About page**: Fixed quick navigation links (now use JavaScript scrolling instead of anchor hrefs)
- **About page**: Centered architecture diagram
- **About page**: Updated Security section to document NASA.gov-only access

---

## [1.0.0] - 2026-01-16

**MO-Viewer v1.0** - Complete unified dashboard platform with all databases, core viewers, and supporting features.

### Platform Summary

| Component | Status | Description |
|-----------|--------|-------------|
| **Implementation-NSITE** | Complete | Solution tracking with milestones, documents, stakeholders |
| **SEP-NSITE** | Complete | Stakeholder engagement pipeline with touchpoints |
| **Actions-NSITE** | Complete | Action item tracking with bi-directional agenda sync |
| **Contacts Directory** | Complete | 423 contacts across 47 solutions |
| **Reports** | Complete | 7 report types with methodology documentation |
| **Schedule** | Complete | Timeline and Gantt views |
| **Quick Update Form** | Complete | Submit updates to agenda documents |

### Databases (7 total)

| Database | Records | Purpose |
|----------|---------|---------|
| **MO-DB_Solutions** | 37 | Solution data (49 columns) |
| **MO-DB_Contacts** | 423 | Stakeholder contacts |
| **MO-DB_Agencies** | 43 | Federal agency hierarchy |
| **MO-DB_Engagements** | — | Engagement logging |
| **MO-DB_Needs** | 2,049 | Stakeholder survey responses |
| **MO-DB_Actions** | — | Action items with agenda sync |
| **MO-DB_Config** | — | Configuration settings |

### Core Viewers

**Implementation-NSITE** (`implementation.html`):
- Solution cards organized by cycle with phase badges
- Milestone tracking (ATP, F2I, ORR, Closeout)
- Document status tracking (9 document types)
- Stakeholder integration per solution
- Solution picker with default selection

**SEP-NSITE** (`sep.html`):
- Pipeline kanban (T4 → W1 → W2 → T5 → T6 → T7 → T8)
- Agencies view with hierarchy browser
- Engagement logging modal
- Stats: Contacts, Agencies, Need Follow-up, This Week

**Actions-NSITE** (`actions.html`):
- Assignee-first collapsible cards
- Bi-directional sync with agenda documents
- Status updates push back to source docs
- Add Action modal for new items

### Supporting Features

**Reports** (`reports.html`):
- QuickLook CSV, Quad Chart, Detailed Milestone
- Need Alignment, Stakeholder Coverage, Engagement Funnel, Department Reach
- Methodology documentation per report
- Data provenance banners

**Schedule** (`schedule.html`):
- Timeline view grouped by month
- Gantt chart with phase dependencies
- Stats: Upcoming, Overdue, Completed

**Contacts** (`contacts.html`):
- Card and table views with pagination
- Search and filters (department, solution, role, year)
- Export to CSV

---

## Pre-Release Development History

## [0.9.3] - 2026-01-16

### Added - MO-DB_Needs & True Alignment Analysis

**MO-DB_Needs Database** - Granular stakeholder survey responses:
- 2,049 records extracted from 47 solution stakeholder Excel files
- Survey data from 2018, 2020, 2022, 2024 cycles
- 40+ columns capturing full survey responses per stakeholder
- Fields include: resolution needs, frequency needs, coverage needs, degree need met

**Need Alignment Report Rewrite** - Now compares actual needs vs solution characteristics:
- **Before**: Counted stakeholders/SMEs (engagement quantity)
- **After**: Compares what stakeholders need vs what solutions provide

**New Scoring System (0-100%):**
| Category | Points | Criteria |
|----------|--------|----------|
| Degree Need Met | 40 | Avg stakeholder-reported satisfaction (survey field 3a-4) |
| Resolution Match | 20 | Solution horizontal_resolution meets/exceeds needs |
| Frequency Match | 20 | Solution temporal_resolution meets/exceeds needs |
| Coverage Match | 20 | Solution geographic_coverage meets/exceeds needs |

**Gap Identification** - Report now shows:
- Needs count per solution (from MO-DB_Needs)
- Average "% Met" from stakeholder responses
- Specific gaps where solution doesn't meet requirements

**Scripts Added:**
- `scripts/extract_needs_data.py` - Python extraction from stakeholder Excel files
- `docs/MO-DB_Needs_Schema.md` - Schema documentation

### Changed
- `stakeholder-solution-alignment.gs` - Rewrote `calculateNeedAlignment_()` for actual comparison
- `stakeholder-solution-alignment.gs` - Added `getAllNeeds()` function to read MO-DB_Needs
- `reports.html` - Updated methodology documentation for Need Alignment
- `reports.html` - Updated report description and data sources

---

## [0.9.2] - 2026-01-16

### Added - Report Transparency & Accuracy

**Methodology Documentation** - Each report card now includes collapsible "How is this calculated?" sections:
- **QuickLook CSV**: Explains data source columns and filtering logic
- **Quad Chart**: Explains quadrant data sources and date logic
- **Detailed Milestone**: Explains milestone and document status logic
- **Need Alignment**: Full scoring table (40 pts stakeholders, 25 pts SMEs, 20 pts multi-year, 15 pts content)
- **Stakeholder Coverage**: Explains contact/solution matching and coverage gap calculation
- **Engagement Funnel**: Explains stakeholder classification and funnel percentages
- **Department Reach**: Explains department/agency counting and broadest reach sorting

**Data Provenance Banners** - Report previews now show source data info:
- Displays which databases were queried (MO-DB_Solutions, MO-DB_Contacts)
- Shows record counts for each data source
- Clickable links to source sheets (when configured)

**Score Breakdown** - Need Alignment report improvements:
- Added "Score Breakdown" column showing points earned in each category
- Detailed scoring summary (e.g., "Stakeholders: 30/40 | SMEs: 25/25 | Multi-year: 20/20 | Content: 10/15")

### Changed
- `reports.html` - Added methodology CSS styling, provenance banner styling
- `stakeholder-solution-alignment.gs` - Score calculation now returns detailed breakdown

---

## [0.9.1] - 2026-01-16

### Added - Earthdata Content Sync
- **earthdata-sync.gs** - Automated scraper for earthdata.nasa.gov solution pages
  - `syncAllSolutionContent()` - Sync all solutions that have earthdata URLs
  - `syncSolutionContent(solutionId)` - Sync a single solution
  - `scheduledEarthdataSync()` - Handler for time-based triggers (set up in GAS)
  - Extracts: purpose_mission, thematic_areas, platform, temporal_frequency, horizontal_resolution, geographic_domain, societal_impact
  - Updates MO-DB_Solutions columns directly
  - Email notifications on sync completion
- **scripts/extract_earthdata_content.py** - Utility script for one-time extraction
  - Generates CSV for manual database merge
  - Creates simplified JSON for script properties

### Changed
- **stakeholder-solution-alignment.gs** - Improved content loading
  - `getSolutionContent_()` now falls back to MO-DB_Solutions columns
  - Added `loadSolutionContent(json)` for manual JSON loading
  - Added `clearSolutionContent()` to clear cached data
  - Added `checkSolutionContent()` to verify data availability
  - Reports now work even without script properties set

### Fixed
- Advanced stakeholder reports now display data by reading from database columns

---

## [0.9.0] - 2026-01-16

### Added - Advanced Stakeholder Reports
- **stakeholder-solution-alignment.gs** - Four advanced report generators
  - **Need Alignment (Implementation)**: Compare solution characteristics with stakeholder engagement
    - Shows purpose, thematic areas, alignment score
    - Stakeholders by role, department, survey year
  - **Stakeholder Coverage (SEP)**: Department/agency engagement across solutions
    - Coverage by department with contact counts
    - Identifies solutions without stakeholder engagement (gaps)
  - **Engagement Funnel (SEP)**: Track stakeholder progression through pipeline
    - Survey Submitter → Secondary SME → Primary SME
    - Conversion rates, multi-role stakeholders
    - Solutions needing Primary SME engagement
  - **Department Reach (Comms)**: Solution coverage across federal departments
    - Broadest reach solutions, department engagement matrix
- **reports.html** - Added Advanced Stakeholder Reports section
  - Color-coded badges (Implementation/SEP/Comms)
  - Funnel visualization, alignment scores
  - Preview all four report types

### Changed
- Updated reports.html with section headers and new styling
- Added funnel, alignment score, and badge CSS styles

---

## [0.8.0] - 2026-01-16

### Added - Reports Tab (Phase 7 - Shared Resources)
- **Reports tab** (`reports.html`) - report generation and export UI
  - Card-based interface for each report type
  - Preview reports before downloading
  - Filter options (cycle, default solutions only)
- **QuickLook CSV Generator** (`quicklook-generator.gs`)
  - Milestone status report for leadership
  - Columns: Solution, Cycle, Phase, ATP DG, F2I DG, ORR, Closeout, Memos
  - Export to Google Drive with optional email notification
  - `generateQuickLookData()` - get report data as JSON
  - `generateQuickLookCSV()` - get CSV string
  - `exportQuickLookToGoogleDrive()` - save to Drive
  - `exportQuickLookWithEmail()` - save and send notification
  - `scheduledQuickLookExport()` - for time-based triggers
- **Quad Chart Data Generator** (`quadchart-data.gs`)
  - Weekly status summary for meeting slides
  - Four quadrants: Updates, Milestones, Actions, Decisions
  - `generateQuadChartData()` - complete quad chart JSON
  - `generateQuadChartText()` - plain text for copy/paste
  - `getMilestoneSummaryForSlides()` - milestone-focused view
  - Configurable lookback/lookahead periods
- **Detailed Milestone Report**
  - Full milestone analysis with statistics
  - Breakdowns by phase, cycle, document status

### Changed
- **index.html** - added routing for reports tab
- **reports/README.md** files now reference implemented generators

---

## [0.7.0] - 2026-01-16

### Added - Schedule Tab & Document Tracking
- **Schedule tab** (`schedule.html`) - milestone timeline and Gantt chart views
  - **Timeline view**: Milestones grouped by month, filterable by view/type/cycle/search
  - **Gantt view**: Google Charts Gantt showing project phases
    - Formulation (ATP → F2I), Implementation (F2I → ORR), Operations (ORR → Closeout)
    - Progress bars based on current date
    - Phase dependencies visualized
  - Stats dashboard: Upcoming (90 days), Overdue, Completed (YTD), Total
  - View toggle in header, filters adapt per view
- **Document tracking** in MO-DB_Solutions
  - 9 document columns: project_plan, science_sow, ipa, icd, tta, atp_memo, f2i_memo, orr_memo, closeout_memo
  - Status logic: empty = not started, "in_work" = in progress, date = complete
- **Document Administration panel** in Implementation-NSITE
  - Shows document completion counts across filtered solutions
- **Document Status section** in solution detail modal
  - Grid showing all 9 documents with status badges

### Changed
- **Milestones consolidated** into MO-DB_Solutions (removed separate MO-DB_Milestones)
  - 4 date columns: atp_date, f2i_date, orr_date, closeout_date
  - Status derived from date: past = completed, future = planned, empty = not started
- **Implementation Milestones panel** updated to show ATP DG, F2I DG, ORR, Closeout
- **index.html** - added routing for schedule tab

### Known Issues
- Blank page on repeated tab clicks (~3 times) - needs investigation

---

## [0.6.0] - 2026-01-15

### Added - Milestones & Solution Picker
- **MO-DB_Milestones database** - extracted from Solution Status Quick Look Excel
  - 53 milestones across 30 solutions
  - Schema: milestone_id, solution_id, solution_name, cycle, type, category, phase, target_date, actual_date, status, notes, source, last_updated
  - Implementation milestone types: HQ Kickoff, PS Kickoff, ATP DG, F2I DG, ORR, Operation Start, Operation End, Closeout DG
- **milestones-api.gs** - data access layer with query functions
  - getAllMilestones, getMilestonesBySolution, getSolutionMilestoneSummary
  - getUpcomingMilestones, getOverdueMilestones, getMilestoneStats
- **extract_milestones.py** - Python script for milestone extraction from Quick Look Excel
- **Solution picker** - multi-select dropdown for filtering solutions
  - Database-driven defaults via `show_in_default` column in MO-DB_Solutions
  - Solutions grouped into "Default Selection" and "Other Solutions"
  - Quick actions: Default, All, None
  - Click outside to close

### Changed
- **Implementation-NSITE** - major enhancements
  - Milestones section added to solution detail modals (timeline, next milestone, stats)
  - Solution picker replaces simple filter dropdown
  - All stats panels now update based on selected/filtered solutions (Portfolio Overview, MO Milestones, Tracking Summary)
  - Removed Sync button from header
- **MO-DB_Solutions schema** - added `show_in_default` column (Y = show in default selection)
- **docs/DATA_SCHEMA.md** - documented show_in_default column

---

## [0.5.0] - 2026-01-15

### Added - Contacts Directory (Phase 4)
- **MO-DB_Contacts database** - populated from 47 stakeholder Excel files
  - 4,221 contact-solution records, 423 unique contacts
  - Schema: contact_id, first_name, last_name, email, primary_email, phone, department, agency, organization, solution, role, survey_year, need_id, notes, last_updated
  - Data cleaning: email normalization, phone formatting (xxx-xxx-xxxx), name parsing, department standardization
- **contacts-api.gs** - comprehensive shared resource with 20+ query functions
  - Core queries: by solution, email, name, role, department, agency, survey year
  - Relationship queries: getContactSolutions, getContactsAcrossSolutions, getRelatedContacts
  - Statistics: getContactStats, getMostEngagedContacts, getStakeholderCountsBySolution
  - Dashboard helpers: getSolutionStakeholderSummary, getMailingList
- **contacts.html** - Contacts Directory tab UI
  - Stats dashboard: total contacts, departments, solutions, multi-solution contacts
  - Search and filters: department, solution, role, survey year
  - Card view and table view with pagination
  - Contact detail modal with solutions, roles, years, related contacts
  - Export to CSV functionality
- **contacts-menu.gs** - maintenance menu for MO-DB_Contacts sheet
  - Custom menu: Add Contact, Update Contact, Add Note, Find Contact, Find by Solution
  - Utilities: Validate Emails, Remove Duplicates, Sort by Solution

### Changed
- **Implementation-NSITE** - stakeholder integration in solution modals
  - Stakeholder section shows total contacts, role breakdown, primary SMEs, agencies
  - Async loading of stakeholder data per solution
- **index.html** - added routing for contacts tab
- **navigation.html** - contacts tab now active (was coming soon)

### Removed
- Debug files from deploy/: diagnose-null.gs, test-frontend.html, test-helpers.gs, troubleshoot-solutions.gs
- Intermediate CSV files from stakeholder-mapping/

---

## [0.4.0] - 2026-01-15

### Added - Implementation-NSITE (Phase 4)
- **Implementation-NSITE viewer** - complete solution tracking dashboard
  - Stats dashboard: total solutions, operational, implementation, formulation counts
  - Filter bar: cycle (C1-C6), phase, solution group, search
  - Solutions organized by cycle with collapsible sections
  - Solution cards with name, ID, phase badge, lead info, status summary
  - Quick action buttons: Drive folder, Earthdata page, Details
- **solutions-api.gs** - data access layer for MO-DB_Solutions
- **MO-DB_Solutions database** - 37 solutions with 49 columns in 13 logical groups

### Added - Supporting Scripts
- `scripts/reorganize-solutions-csv.py` - CSV column consolidation and renaming
- `scripts/merge-earthdata-to-csv.py` - merge earthdata content into Solutions CSV
- `scripts/fetch-earthdata-status.py` - fetch status from earthdata.nasa.gov pages
- `scripts/create-stakeholder-hyperlinks.gs` - Google Sheets stakeholder linking
- `scripts/link-contractual-docs.gs` - contractual document linking from Drive

### Changed
- **Naming convention**: Viewers now use "-NSITE" suffix ("in sight" wordplay)
  - Implementation-Viewer → Implementation-NSITE
  - SEP-Viewer → SEP-NSITE
  - Comms-Viewer → Comms-NSITE
- Navigation tabs updated with new naming and tooltips
- Platform index.html loads Implementation-NSITE dynamically
- Documentation updated to reflect NSITE naming pattern

### Data
- MO-DB_Solutions populated with data from:
  - GitHub nsite-mo-implementation issues (summary cards)
  - earthdata.nasa.gov solution pages (content and status)
  - Stakeholder list mappings
- Column groups: Identity, Lifecycle, Flags, Solution Lead, RA Representative,
  Earth Action, Stakeholder Engagement, Other Team, Content, Documentation Links,
  External Resources, SEP Materials, Status

---

## [0.3.0] - 2026-01-15

### Added - Quick Update Form (Phase 3)
- Quick Update Form with solution dropdown and meeting selection
- Submit updates to Internal Planning (Monday) and/or SEP Strategy (Tuesday) meetings
- Update type selection (Milestone, Action, General)
- SOLUTION_HEADINGS mapping for exact document heading matching
- Confirmation message with direct links to updated document location
- Double-submission prevention

### Changed
- UI redesign: Update textarea at top (primary field)
- Compact options row for Solution/Meeting/Type selections
- Separated Clear and Submit buttons to prevent accidental erasure
- Security notice moved to bottom (subtle)
- Added "Coming soon" notice pattern for future features

### Documentation
- Added UX pattern documentation for "Coming soon" notices
- Updated component READMEs with Coming Soon sections
- Updated INTEGRATION_PLAN.md with feature roadmap per component

---

## [0.2.0] - 2026-01-14

### Added - Platform Foundation (Phase 1)
- Platform shell with header, navigation, and footer
- Tab navigation system (Implementation, SEP, Comms, Quick Update, etc.)
- Routing via URL parameters
- Shared CSS variables and base styles
- Placeholder pages for all components
- Server-side includes for modular HTML

---

## Migration History

This repository consolidates code from multiple legacy repositories:

| Legacy Repo | Migration Status | Notes |
|-------------|------------------|-------|
| `nsite-viewer` | **Complete** | Quick Update Form → `src/quick-update/` |
| `nsite-mo-implementation` | **Complete** | Solution data → MO-DB_Solutions; UI → Implementation-NSITE |
| `nsite-SEPViewer` | **Complete** | SEP Viewer → SEP-NSITE with database-only approach |
| `snwg-automation/SolutionFlow` | Partial | Parsers pending → `parsers/`, `storage/` |

---

## Version History

### v0.1.0 - 2026-01-14
- Repository initialized
- Documentation structure created
- Migration planning complete
