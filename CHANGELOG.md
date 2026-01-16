# Changelog

All notable changes to the MO-Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Phase 5: SEP-NSITE (stakeholder engagement tracking)
- Phase 6: Comms-NSITE (communications/story tracking)
- Phase 8: Automation & Sync (scheduled exports, email notifications)

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
| `nsite-SEPViewer` | Pending | SEP Viewer → `src/sep-viewer/` |
| `snwg-automation/SolutionFlow` | Partial | Parsers pending → `parsers/`, `storage/` |

---

## Version History

### v0.1.0 - 2026-01-14
- Repository initialized
- Documentation structure created
- Migration planning complete
