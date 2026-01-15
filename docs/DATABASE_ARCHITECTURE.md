# MO-Viewer Database Architecture

**Version:** 2.0.0
**Date:** 2026-01-15
**Status:** Recommendation

---

## Executive Summary

The recommended approach is a **Google Sheets-Only Architecture** that consolidates all data into Google Workspace, replacing GitHub Issues as a data store. This simplifies the architecture and keeps all data in familiar, queryable spreadsheets.

| Data Type | Store | Source |
|-----------|-------|--------|
| **Solutions** | Google Sheets | Solution Information Database |
| **Contacts** | Google Sheets | Master Contact List |
| **Stakeholders** | Google Sheets | SEP engagement tracking |
| **Actions** | Google Sheets | Meeting notes |
| **Milestones** | Google Sheets | Solution tracking |
| **Stories** | Google Sheets | Comms tracking |

**Key Decision:** GitHub repos (nsite-mo-implementation, nsite-mo-stakeholders) become **archived references**. Google Sheets becomes the single source of truth for structured data, while Google Docs remain the source of truth for meeting notes.

---

## Current Data Sources

### 1. Solution Information Database

**Source:** `SolutionInformationDatabase_NSITE MO_C0_2025.csv` (exported from Google Sheets)

**Current Structure:**
| Column | Description |
|--------|-------------|
| Cycle | Assessment cycle (1-5) |
| Solution | Solution name/acronym |
| Solution Lead | Primary implementation lead |
| Other Solution POCs | Additional points of contact |
| R&A Representative | Research & Analysis rep |
| Earth Action Representative | Earth Action rep |
| KV notes | Internal notes |

**This will be expanded** to include all Summary Card fields currently in GitHub.

---

### 2. Contacts Database

**Source:** `SNWG MO Master Contact List - All_Contacts.csv`

**Current Structure (denormalized):**
```
Contact-Solution Relationship Record:
├── SNWG Project (Cycle identifier)
├── Assessment Solution
├── Name
├── Role (Survey Submitter, Primary SME, Secondary SME, Director, etc.)
├── Contact Level (1-4: Primary → Stakeholder)
├── Email
├── Executive Department / Agency
├── Sub-Agency / Bureau
├── Organizational Unit
├── Contact info source
├── Year Survey Submitted
├── Science Focus Areas (9 boolean columns)
└── Notes
```

**Normalization needed:** One person (e.g., Aaron Johnston) has multiple rows for different solutions. Will normalize into Contacts + Contact_Solutions junction table.

---

### 3. Action Items

**Current Source:** https://docs.google.com/spreadsheets/d/1uYgX660tpizNbIy44ddQogrRphfwZqn1D0Oa2RlSYKg/

**Verdict:** Migrate structure to unified MO-Viewer Database.

---

## Recommended Architecture: Google Sheets Only

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MO-VIEWER DATABASE                                   │
│                   (Multiple Google Spreadsheets)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA TABLES                                  │   │
│  │                                                                      │   │
│  │  Solutions          Contacts           Stakeholders                 │   │
│  │  ├─ solution_id     ├─ contact_id      ├─ stakeholder_id           │   │
│  │  ├─ name            ├─ name            ├─ name                      │   │
│  │  ├─ cycle           ├─ email           ├─ organization             │   │
│  │  ├─ phase           ├─ agency          ├─ touchpoint_status        │   │
│  │  ├─ leads...        └─ org_unit        └─ solutions[]              │   │
│  │  └─ milestones                                                      │   │
│  │                                                                      │   │
│  │  Actions            Stories            Update_History               │   │
│  │  ├─ action_id       ├─ story_id        ├─ history_id               │   │
│  │  ├─ description     ├─ title           ├─ entity_type              │   │
│  │  ├─ owner           ├─ solution_id     ├─ update_text              │   │
│  │  ├─ status          ├─ status          └─ timestamp                │   │
│  │  └─ source          └─ channel                                      │   │
│  │                                                                      │   │
│  │  Contact_Solutions (junction)    Solution_Stakeholders (junction)   │   │
│  │  ├─ contact_id                   ├─ solution_id                     │   │
│  │  ├─ solution_id                  ├─ stakeholder_id                  │   │
│  │  └─ role                         └─ relationship_type               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      │ serves                               │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MO-VIEWER APP                                 │   │
│  │                   (Google Apps Script)                               │   │
│  │                                                                      │   │
│  │  Implementation-Viewer │ SEP-Viewer │ Comms-Viewer │ Quick Update   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      │ writes to                            │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     MEETING NOTES                                    │   │
│  │                   (Source of Truth)                                  │   │
│  │                                                                      │   │
│  │  Internal Agenda (Mon)  │  SEP Agenda (Tue)  │  Comms Tracking      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

ARCHIVED (Read-Only Reference):
┌─────────────────────────────────────────────────────────────────────────────┐
│  GitHub: nsite-mo-implementation  │  GitHub: nsite-mo-stakeholders          │
│  (Historical Summary Cards)       │  (Historical Stakeholder Issues)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Benefits of Sheets-Only Approach

1. **Single Source of Truth** - No sync complexity between GitHub and Sheets
2. **Familiar Interface** - Team already works in Google Workspace
3. **Fast Queries** - Native Apps Script integration, no API rate limits
4. **Easy Updates** - Direct editing without Git knowledge
5. **Simpler Architecture** - One data store to maintain
6. **Separate Files per Table** - Each table is its own Google Sheet for easier maintenance, staying within file size limits, and independent version history

---

## Google Sheets Database Design

Each table below is stored as a **separate Google Spreadsheet** (not tabs within one file). The `_Config` sheet stores the Sheet IDs for all tables.

**Naming Convention:** `MO-DB_[TableName]` (e.g., MO-DB_Solutions, MO-DB_Contacts)

### MO-DB_Solutions

Primary solution/project information. This replaces GitHub Summary Cards.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| solution_id | STRING | Yes | Primary key (e.g., "HLS", "OPERA") |
| name | STRING | Yes | Solution display name |
| full_name | STRING | No | Full descriptive name |
| cycle | NUMBER | Yes | Assessment cycle (1-6) |
| phase | STRING | Yes | Lifecycle phase (see enum) |
| provider | STRING | No | Provider center (MSFC, JPL, GSFC) |
| daac | STRING | No | Assigned DAAC |
| ownership | STRING | No | SEP ownership model |
| solution_lead | STRING | No | Primary implementation lead |
| other_pocs | STRING | No | Other points of contact (comma-separated) |
| program_scientist | STRING | No | Program scientist name |
| ra_representative | STRING | No | R&A representative |
| earth_action_rep | STRING | No | Earth Action representative |
| sep_lead | STRING | No | SEP engagement lead |
| comms_poc | STRING | No | Communications PoC |
| status_summary | STRING | No | Current status text |
| next_steps | STRING | No | Next steps summary |
| science_areas | STRING | No | Pipe-delimited focus areas |
| project_plan_url | STRING | No | Link to project plan |
| risk_register_url | STRING | No | Link to risk register |
| website_url | STRING | No | Public solution website |
| notes | STRING | No | Internal notes |
| last_updated | DATE | Yes | Last update timestamp |

**Phase Enum:** `Pre-Formulation | Formulation | Implementation | Operations | Closeout`

**Ownership Enum:** `SEP-Directed | Project-Led | SPoRT-Directed`

---

### MO-DB_Contacts

Normalized contact records (one row per person).

| Column | Type | Description |
|--------|------|-------------|
| contact_id | STRING | Primary key (auto-generated) |
| name | STRING | Full name |
| email | STRING | Email address |
| agency | STRING | Executive Department/Agency |
| sub_agency | STRING | Sub-Agency/Bureau |
| org_unit | STRING | Organizational Unit |
| role_type | STRING | Highest role (Director, Primary SME, etc.) |
| notes | STRING | Free-form notes |
| last_updated | DATE | Last update timestamp |

---

### MO-DB_Contact_Solutions (Junction Table)

Many-to-many relationship between contacts and solutions.

| Column | Type | Description |
|--------|------|-------------|
| contact_id | STRING | FK to Contacts |
| solution_id | STRING | FK to Solutions |
| role | STRING | Role for this solution (Survey Submitter, SME, etc.) |
| contact_level | STRING | 1-4 (Primary → Stakeholder) |
| year_submitted | NUMBER | Year of survey/engagement |
| science_areas | STRING | Pipe-delimited science focus areas |
| source | STRING | Where this relationship was identified |

---

### MO-DB_Actions

Action items from all meeting sources.

| Column | Type | Description |
|--------|------|-------------|
| action_id | STRING | Primary key |
| description | STRING | Action item text |
| solution_id | STRING | FK to Solutions (optional) |
| owner | STRING | Assigned person |
| status | STRING | open, in_progress, closed, blocked |
| priority | STRING | high, medium, low |
| due_date | DATE | Target completion |
| completed_date | DATE | Actual completion |
| source | STRING | internal, sep, comms |
| source_tab | STRING | Meeting notes tab reference |
| created_at | DATE | When created |
| last_updated | DATE | Last update |

---

### MO-DB_Milestones

Milestone tracking for solutions.

| Column | Type | Description |
|--------|------|-------------|
| milestone_id | STRING | Primary key |
| solution_id | STRING | FK to Solutions |
| type | STRING | IPA, ICD, ATP, F2I, ORR, OPS, Closeout |
| target_date | DATE | Planned date |
| actual_date | DATE | Actual completion date |
| status | STRING | planned, completed, delayed |
| notes | STRING | Additional notes |
| source_tab | STRING | Source document tab |
| last_updated | DATE | Last update |

---

### MO-DB_Update_History

Audit log from Quick Update Form submissions.

| Column | Type | Description |
|--------|------|-------------|
| history_id | STRING | Primary key (UUID) |
| entity_type | STRING | solution, contact, action |
| entity_id | STRING | ID of updated entity |
| update_type | STRING | milestone, action, general |
| update_text | STRING | The update content |
| target_docs | STRING | Pipe-delimited (internal, sep, comms) |
| user_email | STRING | Who submitted |
| timestamp | DATETIME | When submitted |

---

### MO-DB_Config

System configuration and sync metadata.

| Column | Type | Description |
|--------|------|-------------|
| key | STRING | Config key |
| value | STRING | Config value |
| description | STRING | What this config does |
| last_updated | DATE | When modified |

**Example rows:**
```
| key                    | value                        |
|------------------------|------------------------------|
| GITHUB_SYNC_LAST       | 2026-01-15T10:30:00Z        |
| INTERNAL_AGENDA_ID     | 1abc...xyz                   |
| SEP_AGENDA_ID          | 2def...uvw                   |
| COMMS_TRACKING_ID      | 3ghi...rst                   |
```

---

## Data Management

### Direct Editing

Since all data lives in Google Sheets, team members can:
- Edit Solutions sheet directly for project updates
- Add/update Contacts as needed
- Manage Actions through the sheet or Quick Update Form

### Meeting Notes → Database Sync

Optional automated sync from meeting notes to extract action items:

```javascript
function syncActionsFromMeetingNotes() {
  // 1. Parse Internal Agenda for new actions
  var internalActions = parseInternalAgenda();
  upsertToSheet('Actions', internalActions, 'action_id');

  // 2. Update sync timestamp
  setConfig('NOTES_SYNC_LAST', new Date().toISOString());
}
```

### Quick Update Form Flow

```
User submits update
       │
       ├──► Write to Meeting Notes (source of truth)
       │
       └──► Log to Update_History sheet (audit trail)
```

---

## Data Flow for MO-Viewer

```
┌─────────────────────────────────────────────────────────────────┐
│                        READ PATH                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User opens MO-Viewer                                          │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────────┐                                           │
│   │  Google Sheets  │  ◄── Direct queries (no sync needed)      │
│   │  (Database)     │                                           │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   Implementation-Viewer shows Solutions + Milestones            │
│   SEP-Viewer shows Stakeholders + Touchpoints                   │
│   Comms-Viewer shows Stories + Pipeline                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        WRITE PATH                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User submits Quick Update Form                                │
│         │                                                        │
│         ├──► Meeting Notes (narrative source of truth)          │
│         │                                                        │
│         └──► Update_History sheet (audit log)                   │
│                                                                  │
│   ─────────────────────────────────────────────────────────     │
│                                                                  │
│   Team member edits Sheets directly                             │
│         │                                                        │
│         └──► Solutions/Contacts/Actions sheets                  │
│              (structured data source of truth)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Two Sources of Truth

| Type | Source | Purpose |
|------|--------|---------|
| **Narrative** | Meeting Notes (Google Docs) | Weekly updates, discussions, context |
| **Structured** | Database (Google Sheets) | Queryable fields, status tracking |

The Quick Update Form writes to Meeting Notes. Database fields are updated directly in Sheets or via future automation.

---

## Migration Plan

### Phase 1: Set Up Database Structure
1. Create `MO-Viewer Database` Google Sheet
2. Create all sheet tabs with headers
3. Set up _Config sheet with document IDs

### Phase 2: Import Contact Data
1. Parse CSV to normalize contacts
2. Create Contact records (deduplicated by email)
3. Create Contact_Solutions junction records
4. Validate relationships

### Phase 3: GitHub Sync
1. Implement GitHub API integration
2. Create issue parser for Summary Cards
3. Run initial sync to Solutions cache
4. Test sync accuracy

### Phase 4: Connect Dashboard
1. Update MO-Viewer to read from Sheets database
2. Add "Sync Now" admin function
3. Implement caching for performance
4. Add "View on GitHub" links

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Solution data** | Google Sheets | Direct editing, no sync complexity |
| **Contact data** | Google Sheets | Normalize from CSV, fast queries |
| **Stakeholder data** | Google Sheets | Consolidate from GitHub Issues |
| **Action items** | Google Sheets | Already working, simple structure |
| **GitHub repos** | Archive | Keep as read-only historical reference |
| **Meeting notes** | Google Docs | Narrative source of truth (unchanged) |

---

## Migration Plan

### Phase 1: Create Database Structure
1. [ ] Create `MO-Viewer Database` Google Spreadsheet
2. [ ] Create all sheet tabs with headers per schema
3. [ ] Set up data validation for enum fields
4. [ ] Set up _Config sheet with document IDs

### Phase 2: Migrate Solution Data
1. [ ] Export data from GitHub Summary Cards
2. [ ] Map fields to new Solutions schema
3. [ ] Import into Solutions sheet
4. [ ] Verify all ~30 solutions imported correctly

### Phase 3: Migrate Contact Data
1. [ ] Parse Master Contact List CSV
2. [ ] Deduplicate contacts by email
3. [ ] Create Contacts sheet records
4. [ ] Create Contact_Solutions junction records
5. [ ] Validate relationships

### Phase 4: Migrate Stakeholder Data
1. [ ] Export from nsite-mo-stakeholders Issues
2. [ ] Map to Stakeholders schema
3. [ ] Create Solution_Stakeholders junctions
4. [ ] Import touchpoint status

### Phase 5: Archive GitHub Repos
1. [ ] Add deprecation notice to nsite-mo-implementation
2. [ ] Add deprecation notice to nsite-mo-stakeholders
3. [ ] Update all documentation references

### Phase 6: Connect Dashboard
1. [ ] Update MO-Viewer to read from new database
2. [ ] Test all viewer components
3. [ ] Deploy updated platform

---

## Open Questions

1. **Historical Data:** Import all contact history or just active contacts?
2. **Stakeholder vs Contact:** Are these the same entity or separate? (Contacts = internal team, Stakeholders = external?)
3. **Access Control:** Who can edit the database directly vs. only through the app?

---

## Next Steps

1. [ ] Review and approve this architecture
2. [ ] Clarify Contact vs Stakeholder distinction
3. [ ] Create MO-Viewer Database spreadsheet
4. [ ] Begin Phase 1 migration

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-15 | Initial recommendation (hybrid GitHub + Sheets) |
| 2.0.0 | 2026-01-15 | Revised to Sheets-only architecture, archive GitHub |
