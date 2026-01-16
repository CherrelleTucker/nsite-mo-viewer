# Next Development Steps

**Last Updated:** 2026-01-16
**Current Version:** 1.0.0

---

## Completed This Session (2026-01-16) - SEP-NSITE Complete

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

### 1. Comms-NSITE Viewer (Phase 6)

**Data Preparation**
- [ ] Define story schema (story_id, title, solution_id, status, channel, etc.)
- [ ] Create MO-DB_Stories database
- [ ] Build stories-api.gs

**UI Development**
- [ ] Create `comms.html` - communications pipeline view
- [ ] Build story cards with status badges
- [ ] Add kanban-style pipeline view

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
- [ ] **Blank page on repeated tab clicks** - Page goes blank after clicking tabs ~3 times

### Implementation-NSITE
- [ ] Add loading states for async operations
- [ ] Implement actual export functionality (CSV download)

### Contacts Directory
- [ ] Add inline editing capability
- [ ] Add bulk email functionality
- [ ] Add contact merge for duplicates

### Platform
- [ ] Add global search functionality
- [ ] Add help documentation/tour
- [ ] Add Glossary shared resource

---

## Deploy Files Reference

Current deploy/ folder contents:
```
deploy/
├── Code.gs                 # Main Apps Script entry point
├── agencies-api.gs         # Agencies data API (NEW)
├── contacts.html           # Contacts Directory UI
├── contacts-api.gs         # Contacts data API (enhanced with SEP)
├── contacts-menu.gs        # Contacts sheet menu
├── earthdata-sync.gs       # Earthdata.nasa.gov content scraper/sync
├── engagements-api.gs      # Engagements data API (NEW)
├── implementation.html     # Implementation-NSITE UI
├── index.html              # Platform shell
├── milestones-api.gs       # Milestones data API
├── navigation.html         # Tab navigation
├── quadchart-data.gs       # Quad Chart report generator
├── quick-update.html       # Quick Update Form UI
├── quick-update-handlers.gs # Quick Update backend
├── quicklook-generator.gs  # QuickLook CSV report generator
├── reports.html            # Reports tab UI
├── schedule.html           # Schedule timeline view
├── sep.html                # SEP-NSITE UI (NEW)
├── stakeholder-solution-alignment.gs  # Advanced stakeholder reports
├── solutions-api.gs        # Solutions data API
└── styles.html             # Shared CSS
```

---

## Data Sources Reference

| Database | Google Sheet | Local Backup | Records | Status |
|----------|--------------|--------------|---------|--------|
| MO-DB_Solutions | Yes | `MO-Viewer Databases/` | 37 solutions | **Populated** |
| MO-DB_Contacts | Yes | `MO-Viewer Databases/` | 4,221 records | **Enhanced** |
| MO-DB_Agencies | Yes | `MO-Viewer Databases/` | 43 agencies | **Populated** |
| MO-DB_Engagements | Yes | `MO-Viewer Databases/` | -- | **Ready** |
| MO-DB_Needs | Yes | `MO-Viewer Databases/` | 2,049 responses | **Populated** |
| MO-DB_Config | Yes | `MO-Viewer Databases/` | Configuration | **Active** |
| MO-DB_Stories | Planned | -- | -- | Planned |

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
