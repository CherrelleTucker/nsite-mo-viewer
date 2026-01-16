# Next Development Steps

**Last Updated:** 2026-01-15
**Current Version:** 0.6.0

---

## Completed This Session (2026-01-15)

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
├── implementation.html     # Implementation-NSITE UI (with milestones)
├── index.html              # Platform shell
├── milestones-api.gs       # Milestones data API
├── navigation.html         # Tab navigation
├── quick-update.html       # Quick Update Form UI
├── quick-update-handlers.gs # Quick Update backend
├── solutions-api.gs        # Solutions data API
└── styles.html             # Shared CSS
```

---

## Data Sources Reference

| Database | Location | Records | Status |
|----------|----------|---------|--------|
| MO-DB_Solutions | Google Sheet | 37 solutions (includes milestone dates) | **Populated** |
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
