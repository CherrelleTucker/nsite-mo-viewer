# Next Development Steps

**Last Updated:** 2026-01-16
**Current Version:** 0.9.1

---

## Completed This Session (2026-01-16) - Earthdata Sync & Advanced Reports Fix

- [x] Created `earthdata-sync.gs` - automated earthdata.nasa.gov content scraper
  - Fetches solution pages and extracts characteristics
  - Updates MO-DB_Solutions with: purpose_mission, thematic_areas, platform, resolution, etc.
  - `syncAllSolutionContent()` - sync all solutions
  - `syncSolutionContent(id)` - sync single solution
  - `scheduledEarthdataSync()` - handler for time-based triggers
- [x] Updated `stakeholder-solution-alignment.gs` - improved content loading
  - Falls back to MO-DB_Solutions columns if script properties not set
  - Added `loadSolutionContent()` for manual JSON loading
  - Added `checkSolutionContent()` to verify data availability
- [x] Created `scripts/extract_earthdata_content.py` - one-time extraction utility
  - Generates CSV for manual database merge if needed
  - Creates simplified JSON for script properties

## Completed Earlier This Session (2026-01-16) - Advanced Stakeholder Reports

- [x] Created `stakeholder-solution-alignment.gs` - four advanced report generators
  - Need Alignment (Implementation): solution characteristics vs stakeholder engagement
  - Stakeholder Coverage (SEP): department/agency engagement across solutions
  - Engagement Funnel (SEP): track stakeholder progression (Survey → SME)
  - Department Reach (Comms): solution coverage across federal departments
- [x] Updated `reports.html` with Advanced Stakeholder Reports section
  - Color-coded badges (Implementation/SEP/Comms)
  - Funnel visualization, alignment scores
  - Preview all four report types

## Completed Earlier This Session (2026-01-16) - Reports

- [x] Created `reports.html` - Reports tab UI with card-based interface
- [x] Created `quicklook-generator.gs` - QuickLook CSV report generator
  - Milestone status report for leadership
  - Export to Google Drive with email notification option
  - Scheduled export function for triggers
- [x] Created `quadchart-data.gs` - Quad Chart data generator
  - Four quadrants: Updates, Milestones, Actions, Decisions
  - Configurable lookback/lookahead periods
  - Text export for copy/paste into slides
- [x] Added routing for Reports tab in index.html
- [x] Preview functionality for all reports
- [x] Detailed milestone report with statistics

## Completed Earlier This Session (2026-01-16) - Schedule

- [x] Consolidated milestones into MO-DB_Solutions (atp_date, f2i_date, orr_date, closeout_date)
- [x] Updated Implementation Milestones panel to show ATP DG, F2I DG, ORR, Closeout
- [x] Added document tracking columns (project_plan, science_sow, ipa, icd, tta, atp_memo, f2i_memo, orr_memo, closeout_memo)
- [x] Added Document Administration panel with status counts
- [x] Added Document Status section to solution detail modal
- [x] Created `schedule.html` - milestone timeline view with filters and stats
- [x] Wired Schedule tab into app routing
- [x] Added Google Charts Gantt view with phase visualization (Formulation/Implementation/Operations)
- [x] View toggle (Timeline/Gantt) in Schedule header

## Completed Previous Session (2026-01-15)

- [x] MO-DB_Milestones database - extracted from Quick Look Excel (53 milestones, 30 solutions)
- [x] milestones-api.gs - data access layer with query functions
- [x] Implementation-NSITE - milestones section added to solution detail modals
- [x] Solution picker - multi-select dropdown with database-driven defaults
- [x] Added `show_in_default` column to MO-DB_Solutions for managing default selection
- [x] All stats panels now update based on selected/filtered solutions
- [x] Removed Sync button from Implementation-NSITE header
- [x] extract_milestones.py - Python script for milestone extraction

---

## Priority Tasks for Next Session

### 1. SEP-NSITE Viewer (Phase 5)

**UI Development**
- [ ] Create `sep.html` - stakeholder engagement pipeline view
- [ ] Build touchpoint pipeline visualization (T4 → W1 → W2 → T7 → T8)
- [ ] Add people view and solution view toggle
- [ ] Create stakeholder cards with engagement status

**Data Integration**
- [ ] Leverage contacts-api.gs for stakeholder data
- [ ] Add touchpoint tracking to contacts schema
- [ ] Build engagement funnel statistics

### 2. Comms-NSITE Viewer (Phase 6)

**Data Preparation**
- [ ] Define story schema (story_id, title, solution_id, status, channel, etc.)
- [ ] Create MO-DB_Stories database
- [ ] Build stories-api.gs

**UI Development**
- [ ] Create `comms.html` - communications pipeline view
- [ ] Build story cards with status badges
- [ ] Add kanban-style pipeline view

---

## Technical Debt / Improvements

### Known Bugs
- [ ] **Blank page on repeated tab clicks** - Page goes blank after clicking tabs ~3 times. Needs investigation.

### Implementation-NSITE
- [ ] Add loading states for async operations
- [ ] Implement actual export functionality (CSV download)
- [ ] Add error boundary/retry logic

### Contacts Directory
- [ ] Add inline editing capability
- [ ] Add bulk email functionality
- [ ] Add contact merge for duplicates

### Platform
- [ ] Add global search functionality
- [ ] Implement sync functionality (refresh from data sources)
- [ ] Add help documentation/tour
- [ ] Add Glossary shared resource

---

## Deploy Files Reference

Current deploy/ folder contents:
```
deploy/
├── Code.gs                 # Main Apps Script entry point
├── contacts.html           # Contacts Directory UI
├── contacts-api.gs         # Contacts data API
├── contacts-menu.gs        # Contacts sheet menu
├── earthdata-sync.gs       # Earthdata.nasa.gov content scraper/sync
├── implementation.html     # Implementation-NSITE UI (with milestones & docs)
├── index.html              # Platform shell
├── milestones-api.gs       # Milestones data API
├── navigation.html         # Tab navigation
├── quadchart-data.gs       # Quad Chart report generator
├── quick-update.html       # Quick Update Form UI
├── quick-update-handlers.gs # Quick Update backend
├── quicklook-generator.gs  # QuickLook CSV report generator
├── reports.html            # Reports tab UI
├── schedule.html           # Schedule timeline view
├── stakeholder-solution-alignment.gs  # Advanced stakeholder reports
├── solutions-api.gs        # Solutions data API
└── styles.html             # Shared CSS
```

---

## Data Sources Reference

| Database | Location | Records | Status |
|----------|----------|---------|--------|
| MO-DB_Solutions | Google Sheet | 37 solutions (includes milestone dates, document status) | **Populated** |
| MO-DB_Contacts | Google Sheet | 4,221 records (423 unique) | **Populated** |
| MO-DB_Config | Google Sheet | Configuration | **Active** |
| MO-DB_Stories | Google Sheet | -- | Planned |

---

## Session Checklist

Before starting next session:
- [ ] Review this document
- [ ] Check MO-DB_Solutions and MO-DB_Contacts for any manual updates
- [ ] Verify deployment is still working
- [ ] Identify top priority from list above

After session:
- [ ] Update CHANGELOG.md
- [ ] Update this NEXT_STEPS.md
- [ ] Commit changes to git
- [ ] Deploy updated files to Google Apps Script
