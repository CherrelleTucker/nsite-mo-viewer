# Next Development Steps

**Last Updated:** 2026-01-15
**Current Version:** 0.4.0

---

## Completed This Session (2026-01-15)

- [x] Implementation-NSITE viewer - fully functional
- [x] MO-DB_Solutions database - populated with 37 solutions
- [x] Solutions API for data access
- [x] NSITE naming convention applied across platform
- [x] Documentation updated (README, ARCHITECTURE, CHANGELOG)

---

## Priority Tasks for Next Session

### 1. Implementation-NSITE Enhancements

**Solution Detail Modal** (Currently shows alert)
- [ ] Create modal/slide-out panel for solution details
- [ ] Display all solution fields in organized sections
- [ ] Add edit capability (if needed)
- [ ] Include team contacts, documentation links, stakeholder list

**Link Contractual Documents**
- [ ] Run `link-contractual-docs.gs` in Google Sheets to populate:
  - `science_sow_url`
  - `project_plan_url`
  - `risk_register_url`
  - `data_product_table_url`
  - `drive_folder_url`
- [ ] Verify document links in Implementation-NSITE cards

**Stakeholder List Hyperlinks**
- [ ] Run `create-stakeholder-hyperlinks.gs` to link stakeholder_list column
- [ ] Verify links work in solution detail view

### 2. SEP-NSITE (Phase 5) - Next Major Feature

**Data Preparation**
- [ ] Populate MO-DB_Contacts from stakeholder list Excel files
  - Source folder: `12Bo-ZTLBU_DLiaiWQ75kBbIZkdSXlGh1`
  - Parse stakeholder names, organizations, contact info
  - Link stakeholders to solutions
- [ ] Define contact schema (stakeholder_id, name, org, email, type, solutions[])

**UI Development**
- [ ] Create `src/sep-viewer/sep.html`
- [ ] Create `src/sep-viewer/sep-handlers.gs`
- [ ] Build touchpoint pipeline view (T4 → W1 → W2 → T7 → T8)
- [ ] Add people view and solution view toggle

### 3. MO-DB_Milestones

- [ ] Define milestone schema (milestone_id, solution_id, type, dates, status)
- [ ] Extract milestone data from existing sources
- [ ] Create milestones display in Implementation-NSITE

---

## Technical Debt / Improvements

### Implementation-NSITE
- [ ] Replace alert() detail view with proper modal
- [ ] Add loading states for async operations
- [ ] Implement actual export functionality (CSV download)
- [ ] Add error boundary/retry logic

### Platform
- [ ] Add global search functionality
- [ ] Implement sync functionality (refresh from data sources)
- [ ] Add help documentation/tour

### Data
- [ ] Automate data refresh from earthdata.nasa.gov
- [ ] Set up scheduled sync trigger
- [ ] Add data validation on import

---

## File References

### Scripts to Run (Google Apps Script)
1. `scripts/link-contractual-docs.gs` - Link docs in MO-DB_Solutions
2. `scripts/create-stakeholder-hyperlinks.gs` - Link stakeholder files

### Scripts to Run (Python)
1. `scripts/reorganize-solutions-csv.py` - If CSV needs re-processing

### Deploy Files to Update
After any changes, update these in Google Apps Script:
- `deploy/implementation.html`
- `deploy/solutions-api.gs`
- `deploy/index.html`
- `deploy/navigation.html`

---

## Data Sources Reference

| Source | Location | Purpose |
|--------|----------|---------|
| MO-DB_Solutions | Google Sheet | Primary solutions database |
| MO-DB_Config | Google Sheet | Configuration (sheet IDs) |
| Stakeholder Lists | Drive folder `12Bo-ZTLBU_DLiaiWQ75kBbIZkdSXlGh1` | Contact data |
| MO File Log | `mo-drive-file log.csv` | File inventory for linking |
| Earthdata content | `database-files/earthdata-solutions-content.json` | Cached web content |

---

## Architecture Decisions to Make

1. **SEP-NSITE data model**: How to link contacts to solutions?
2. **Milestones tracking**: Separate sheet or embedded in Solutions?
3. **Action items**: Unified tracker or per-viewer?
4. **Real-time sync**: Trigger-based or manual refresh?

---

## Session Checklist

Before starting next session:
- [ ] Review this document
- [ ] Check MO-DB_Solutions for any manual updates
- [ ] Verify deployment is still working
- [ ] Identify top priority from list above

After session:
- [ ] Update CHANGELOG.md
- [ ] Update this NEXT_STEPS.md
- [ ] Commit changes to git
- [ ] Deploy updated files to Google Apps Script
