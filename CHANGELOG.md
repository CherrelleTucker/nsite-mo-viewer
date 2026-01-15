# Changelog

All notable changes to the MO-Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Phase 5: SEP-NSITE (stakeholder engagement tracking)
- Phase 6: Comms-NSITE (communications/story tracking)
- Phase 7: Shared Resources (contacts, milestones, reports)
- Phase 8: Automation & Sync

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
