# MO-Viewer Master Architecture

**Version:** 1.1.0
**Date:** 2026-01-15
**Status:** Active Development

---

## Executive Summary

MO-Viewer is a unified dashboard platform for the **NSITE MO** (NASA's Support to the satellite Needs working group Implementation TEam Management Office) that consolidates solution tracking, stakeholder engagement, and communications management into a single interface. It replaces multiple standalone tools with one coherent system while maintaining weekly meeting notes as the authoritative source of truth.

---

## Naming Conventions

| Term | Scope | Description |
|------|-------|-------------|
| **MO-Viewer** | Platform | The complete dashboard platform containing all viewer components |
| **Implementation-NSITE** | Component | Solution/Project focused dashboard view ("Implementation is in sight") |
| **SEP-NSITE** | Component | People/Stakeholder focused dashboard view ("SEP is in sight") |
| **Comms-NSITE** | Component | Story/Communications focused dashboard view ("Comms is in sight") |
| **Quick Update Form** | Component | Embedded input form for submitting updates |
| **Shared Resources** | Component | Cross-cutting data accessible from all viewers |

### NSITE Naming Pattern

The "-NSITE" suffix in viewer names is a wordplay: "NSITE" sounds like "in sight", meaning the data is visible and accessible. This creates a meaningful connection to the NSITE MO team name while emphasizing the dashboard's purpose of making information visible.

### Usage Examples

- "MO-Viewer is deployed at [URL]" (referring to the platform)
- "Implementation-NSITE shows solutions by cycle" (referring to a component)
- "SEP is in sight with SEP-NSITE" (using the wordplay)
- "Data flows from MO-DB_Solutions into MO-Viewer" (platform context)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   MO-VIEWER                                      │
│                              (Unified Platform)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │ Implementation-  │  │    SEP-Viewer    │  │   Comms-Viewer   │              │
│  │     Viewer       │  │                  │  │                  │              │
│  │                  │  │                  │  │                  │              │
│  │ Solution/Project │  │  People Focused  │  │  Story Focused   │              │
│  │    Focused       │  │                  │  │                  │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         Shared Resources                                  │  │
│  │  Contact Lists │ Reports │ Master Schedule │ Action Tracker │ Templates  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        Quick Update Form                                  │  │
│  │                    (Embedded Input Interface)                             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ reads from
                                       ▼
                          ┌─────────────────────────┐
                          │       Database          │
                          │    (Cache Layer)        │
                          │   Google Sheets-based   │
                          └─────────────────────────┘
                                       │
                                       │ synced from
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SOURCES OF TRUTH                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │ Internal Agenda  │  │   SEP Agenda     │  │  Comms Tracking  │              │
│  │                  │  │                  │  │                  │              │
│  │ Weekly Planning  │  │ Weekly Meeting   │  │ Story Tracking   │              │
│  │     Notes        │  │     Notes        │  │    Workbook      │              │
│  │                  │  │                  │  │                  │              │
│  │   (Mondays)      │  │   (Tuesdays)     │  │   (Ongoing)      │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────┐
│  Quick Update   │
│     Form        │
└────────┬────────┘
         │ writes to
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SOURCES OF TRUTH                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Internal   │  │    SEP      │  │   Comms     │              │
│  │   Agenda    │  │   Agenda    │  │  Tracking   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          │ parsed by      │ parsed by      │ parsed by
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Internal Agenda │ │   SEP Agenda    │ │  Comms Tracker  │
│     Parser      │ │     Parser      │ │     Parser      │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │      Database       │
                  │   (Cache Layer)     │
                  │                     │
                  │ ├─ Solutions        │
                  │ ├─ Stakeholders     │
                  │ ├─ Stories          │
                  │ ├─ Actions          │
                  │ ├─ Milestones       │
                  │ └─ History          │
                  └──────────┬──────────┘
                             │
                             │ serves
                             ▼
                  ┌─────────────────────┐
                  │     MO-Viewer       │
                  │    (Platform)       │
                  └─────────────────────┘
```

### Key Principle: Notes Are Source of Truth

The database is a **cache layer**, not the authoritative source. This design ensures:

1. Ad-hoc updates made directly in meeting notes are captured
2. Meeting notes remain the team's familiar working environment
3. No data is lost if the database needs to be rebuilt
4. Historical context preserved in document revision history

---

## Component Specifications

### 1. Implementation-NSITE - **COMPLETE**

**Focus:** Solutions and Projects ("Implementation is in sight")

**Primary Questions Answered:**
- What is the status of Solution X?
- Which solutions are in which lifecycle phase?
- What are the upcoming milestones?
- Who is the solution lead?

**Data Displayed:**

| Section | Content | Status |
|---------|---------|--------|
| Stats Dashboard | Total, Operational, Implementation, Formulation counts | **Implemented** |
| Solutions by Cycle | C1-C6 (2016-2026), grouped by assessment cycle | **Implemented** |
| Filters | Cycle, Phase, Group, Search | **Implemented** |
| Solution Cards | Name, ID, phase, lead, status summary, quick links | **Implemented** |
| MO Milestones | IPA, ICD, F2I DG, OPS for each solution | Planned |
| Document Links | Drive folder, Earthdata page | **Implemented** |

**Data Source:**
- **MO-DB_Solutions** Google Sheet (49 columns organized in 13 groups)
  - Identity: solution_id, name, full_title, solution_group
  - Lifecycle: cycle, cycle_year, phase, funding_status
  - Team: solution_lead, ra_representative, earth_action_advocate
  - Content: purpose_mission, status_summary, solution_characteristics
  - Links: drive_folder_url, snwg_solution_page_url

---

### 2. SEP-NSITE - **NEXT PHASE**

**Focus:** People and Stakeholder Engagement ("SEP is in sight")

**Primary Questions Answered:**
- Where is Stakeholder X in the engagement pipeline?
- Which solutions need stakeholder touchpoints?
- What is our engagement rate?
- Who are the SEP Points of Contact?

**Data Displayed:**

| Section | Content | Status |
|---------|---------|--------|
| Touchpoint Pipeline | T4 → W1 → W2 → T7 → T8 progression | Planned |
| Views | People View (by stakeholder) and Solution View (by project) | Planned |
| Key Metrics | Engagement Rate, Transition Success, Impact Docs, Training Resources | Planned |
| Contact Tools | Email Records, Assessment Context, Interview Artifacts | Planned |
| Ownership Model | SEP-Directed (8), Project-Led (4), SPoRT-Directed (4) | Planned |

**Data Source:**
- **MO-DB_Contacts** Google Sheet (to be populated from stakeholder lists)
- Stakeholder list files in Google Drive folder `12Bo-ZTLBU_DLiaiWQ75kBbIZkdSXlGh1`

---

### 3. Comms-NSITE - **PLANNED**

**Focus:** Stories and Communications ("Comms is in sight")

**Primary Questions Answered:**
- What stories are in the pipeline?
- Which solutions lack communications coverage?
- What content is scheduled for release?
- How are we tracking against outreach goals?

**Data Displayed:**

| Section | Content | Status |
|---------|---------|--------|
| Story Pipeline Funnel | Ideas → Drafts → Reviewed → Submitted | Planned |
| Key Metrics | Solution Coverage Gaps, Admin Priority Alignment, External Mentions, Social Media Reach | Planned |
| Content Tracking | Web Content, Featured Slides, Science Stories, Key Dates | Planned |
| Outreach Channels | Social Media, Newsletters, Webinars, Conferences | Planned |

**Data Source:**
- Comms Tracking (Story Tracking Workbook) - to be integrated

---

### 4. Shared Resources

**Scope:** Cross-cutting data used by all viewer components

| Resource | Description | Used By |
|----------|-------------|---------|
| Contact Lists | Stakeholders, Admin contacts, Outreach contacts | All viewers |
| Reports | Milestone reports, General status reports | Implementation, SEP |
| Master Schedule | Deep Dives, Decision Gates, Events | Implementation, SEP |
| Action Tracker | Owner, Status, Source Agenda for all actions | All viewers |
| Templates & Guides | Style Guide, Desk Guide, Slide Templates | All viewers |

---

### 5. Quick Update Form

**Purpose:** Embedded input interface for submitting updates to source documents

**Update Types:**
- Action (task to be done)
- Milestone (date-based achievement)
- General (status update)

**Target Documents:**
- Internal Agenda (for solution updates)
- SEP Agenda (for stakeholder updates)
- Comms Tracking (for story updates)

**Behavior:**
- Form is embedded within MO-Viewer (not a separate application)
- Submissions write directly to the appropriate source document
- Database is updated on next sync cycle

---

## Database Schema

### Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE TABLES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SOLUTIONS                    STAKEHOLDERS                       │
│  ├─ solution_id (PK)          ├─ stakeholder_id (PK)            │
│  ├─ name                      ├─ name                           │
│  ├─ cycle (C1-C6)             ├─ organization                   │
│  ├─ phase                     ├─ type (SME, Partner, etc.)      │
│  ├─ provider                  ├─ solutions[] (FK)               │
│  ├─ daac_assignment           ├─ touchpoint_status              │
│  ├─ ownership_model           ├─ last_contact                   │
│  ├─ status_text               ├─ notes                          │
│  ├─ last_updated              └─ last_updated                   │
│  └─ source_tab                                                  │
│                                                                  │
│  STORIES                      ACTIONS                            │
│  ├─ story_id (PK)             ├─ action_id (PK)                 │
│  ├─ title                     ├─ description                    │
│  ├─ solution_id (FK)          ├─ owner                          │
│  ├─ status (idea/draft/etc)   ├─ status (open/closed)           │
│  ├─ priority                  ├─ source (internal/sep/comms)    │
│  ├─ channel                   ├─ solution_id (FK)               │
│  ├─ scheduled_date            ├─ due_date                       │
│  └─ last_updated              └─ last_updated                   │
│                                                                  │
│  MILESTONES                   UPDATE_HISTORY                     │
│  ├─ milestone_id (PK)         ├─ history_id (PK)                │
│  ├─ solution_id (FK)          ├─ entity_type                    │
│  ├─ type (IPA/ICD/F2I/OPS)    ├─ entity_id                      │
│  ├─ target_date               ├─ update_text                    │
│  ├─ actual_date               ├─ source_document                │
│  ├─ status                    ├─ source_tab                     │
│  └─ notes                     ├─ user_email                     │
│                               └─ timestamp                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Relationships

```
Solutions ─────┬───── Stakeholders (many-to-many via solution_stakeholders)
               │
               ├───── Stories (one-to-many)
               │
               ├───── Actions (one-to-many)
               │
               └───── Milestones (one-to-many)
```

---

## Mono-Repo Structure

```
mo-viewer/
├── README.md                           # Platform overview
├── MO-VIEWER_MASTER_ARCHITECTURE.md    # This document
├── CONTRIBUTING.md                     # Contribution guidelines
├── CHANGELOG.md                        # Version history
│
├── docs/
│   ├── DATA_SCHEMA.md                  # Detailed schema documentation
│   ├── SETUP_GUIDE.md                  # Installation and configuration
│   ├── DEPLOYMENT_GUIDE.md             # Deployment instructions
│   ├── API_REFERENCE.md                # API documentation
│   └── USER_GUIDE.md                   # End-user documentation
│
├── src/
│   ├── platform/                       # MO-Viewer platform shell
│   │   ├── Code.gs                     # Main entry point
│   │   ├── index.html                  # Platform HTML shell
│   │   ├── navigation.html             # Tab navigation component
│   │   └── styles.css                  # Shared styles
│   │
│   ├── implementation-viewer/          # Solution/Project focused
│   │   ├── implementation.html         # Implementation view template
│   │   ├── implementation.js           # Implementation view logic
│   │   └── README.md                   # Component documentation
│   │
│   ├── sep-viewer/                     # People focused
│   │   ├── sep.html                    # SEP view template
│   │   ├── sep.js                      # SEP view logic
│   │   └── README.md                   # Component documentation
│   │
│   ├── comms-viewer/                   # Story focused
│   │   ├── comms.html                  # Comms view template
│   │   ├── comms.js                    # Comms view logic
│   │   └── README.md                   # Component documentation
│   │
│   ├── shared/                         # Cross-cutting components
│   │   ├── contacts.html               # Contact lists component
│   │   ├── reports.html                # Reports component
│   │   ├── schedule.html               # Master schedule component
│   │   ├── actions.html                # Action tracker component
│   │   ├── templates.html              # Templates & guides component
│   │   └── README.md                   # Shared components documentation
│   │
│   └── quick-update/                   # Embedded input form
│       ├── quick-update.html           # Form template
│       ├── quick-update.js             # Form logic
│       └── README.md                   # Form documentation
│
├── parsers/                            # Document parsers
│   ├── internal-agenda-parser.gs       # Internal Planning Notes parser
│   ├── sep-agenda-parser.gs            # SEP Meeting Notes parser
│   ├── comms-tracker-parser.gs         # Story Tracking Workbook parser
│   ├── parser-utils.gs                 # Shared parsing utilities
│   └── README.md                       # Parser documentation
│
├── storage/                            # Database layer
│   ├── database-setup.gs               # Database initialization
│   ├── database-sync.gs                # Sync from source docs
│   ├── database-api.gs                 # CRUD operations
│   └── README.md                       # Storage documentation
│
├── config/                             # Configuration
│   ├── script-properties.md            # Script Properties reference
│   ├── document-ids.md                 # Source document IDs
│   └── deployment-config.md            # Deployment settings
│
├── tests/                              # Testing
│   ├── parser-tests.gs                 # Parser unit tests
│   ├── api-tests.gs                    # API integration tests
│   └── README.md                       # Testing documentation
│
└── legacy/                             # Migration from old systems
    ├── nsite-viewer-migration.md       # NSITEViewer migration notes
    ├── sep-viewer-migration.md         # SEPViewer migration notes
    └── solutionflow-migration.md       # SolutionFlow migration notes
```

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | HTML, CSS, JavaScript (vanilla) | No framework dependencies |
| Backend | Google Apps Script | Integrated with Google Workspace |
| Database | Google Sheets | Cache layer, partitioned by data type |
| Source Documents | Google Docs | Multi-tab meeting notes |
| Hosting | Google Apps Script Web App | Deployed as web application |
| Authentication | Google OAuth 2.0 | Via Google Workspace |

---

## Deployment Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPS SCRIPT PROJECT                           │
│                      "MO-Viewer"                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Web App Deployment                                              │
│  ├─ Execute as: Me (script owner)                               │
│  ├─ Access: Anyone with Google account                          │
│  └─ URL: https://script.google.com/macros/s/[ID]/exec           │
│                                                                  │
│  Triggers                                                        │
│  ├─ Time-based: Sync database every hour                        │
│  └─ onOpen: Add menu to source documents                        │
│                                                                  │
│  Container-Bound Scripts (optional)                              │
│  ├─ Internal Agenda doc: "Sync to MO-Viewer" menu               │
│  ├─ SEP Agenda doc: "Sync to MO-Viewer" menu                    │
│  └─ Comms Tracking: "Sync to MO-Viewer" menu                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Path

### Phase 1: Foundation - **COMPLETE**
- [x] Create mono-repo structure
- [x] Migrate MO-VIEWER_MASTER_ARCHITECTURE.md
- [x] Set up database schema in Google Sheets
- [x] Create MO-DB_Config for centralized configuration

### Phase 2: Core Platform - **COMPLETE**
- [x] Build platform shell (navigation, routing)
- [x] Deploy basic web app
- [x] Implement tab-based navigation with URL routing

### Phase 3: Quick Update Form - **COMPLETE**
- [x] Implement Quick Update Form (migrate from NSITEViewer)
- [x] Server-side rendering for form
- [x] Integration with source documents

### Phase 4: Implementation-NSITE - **COMPLETE** (2026-01-15)
- [x] Bootstrap MO-DB_Solutions from GitHub issues and earthdata.nasa.gov
- [x] Fetch solution content from earthdata.nasa.gov pages
- [x] Reorganize CSV columns (49 columns in 13 logical groups)
- [x] Build Implementation-NSITE UI with:
  - Stats dashboard (total, operational, implementation, formulation counts)
  - Filter by cycle, phase, group, search
  - Solutions organized by cycle with collapsible sections
  - Solution cards with status, lead, and quick links
- [x] Create solutions-api.gs for data access
- [x] Deploy and verify functionality

### Phase 5: SEP-NSITE - **NEXT**
- [ ] Populate MO-DB_Contacts from stakeholder lists
- [ ] Build SEP-NSITE UI (touchpoint pipeline view)
- [ ] Integrate stakeholder engagement data

### Phase 6: Comms-NSITE - PLANNED
- [ ] Build Comms Tracking parser (new)
- [ ] Build Comms-NSITE UI (story pipeline view)
- [ ] Integrate story pipeline data

### Phase 7: Shared Resources - PLANNED
- [ ] Populate MO-DB_Milestones
- [ ] Build contacts component
- [ ] Build reports component
- [ ] Build schedule component
- [ ] Complete platform integration

---

## Success Criteria

### Platform Success
- Single URL for all NSITE MO dashboard needs
- Sub-3-second page load times
- Mobile-responsive design
- No separate logins required

### User Success
- Answer "What's the status of X?" in under 10 seconds
- Submit updates without leaving the dashboard
- Find any solution, stakeholder, or story via search
- Export data for external reporting

### Team Success
- Reduce manual status compilation from hours to minutes
- Single source of truth for all NSITE MO tracking
- Clear audit trail for all updates
- Self-service access without asking the coordinator

---

## Governance

### Ownership
- **Platform Owner:** NSITE MO Program Coordinator
- **Technical Maintainer:** [TBD]
- **Content Owners:**
  - Implementation-Viewer: NSITE MO PC
  - SEP-Viewer: SEP Lead
  - Comms-Viewer: Comms Lead

### Update Cadence
- Source documents: Real-time (as meetings occur)
- Database sync: Hourly (automated) + on-demand
- Platform releases: As needed, semantic versioning

### Access Control
- View access: All team members via Google Workspace
- Edit access (source docs): Role-based per document
- Admin access (platform): NSITE MO PC + designated maintainers

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Cycle** | Two-year assessment period (C1=2016, C2=2018, etc.) |
| **DAAC** | Distributed Active Archive Center |
| **DG** | Decision Gate |
| **F2I** | Formulation to Implementation |
| **ICD** | Interface Control Document |
| **IPA** | Interface Plan Agreement |
| **MO** | Management Office (in this context, refers to NSITE MO) |
| **MO-Viewer** | The unified dashboard platform for NSITE MO (this system) |
| **NSITE** | NASA's Support to the satellite Needs working group Implementation TEam |
| **NSITE MO** | NSITE Management Office (full: NASA's Support to the satellite Needs working group Implementation TEam Management Office) |
| **OPS** | Operations |
| **SEP** | Stakeholder Engagement Process |
| **SNWG** | Satellite Needs Working Group (legacy name, now part of NSITE acronym) |
| **SPoRT** | Short-term Prediction Research and Transition |
| **Touchpoint** | Defined stakeholder engagement milestone |

---

## Appendix B: Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| nsite-architecture-diagram.html | mo-viewer/docs/ | Visual architecture reference |
| DATA_SCHEMA.md | mo-viewer/docs/ | Detailed data model |
| SETUP_GUIDE.md | mo-viewer/docs/ | Installation instructions |
| DEPLOYMENT_GUIDE.md | mo-viewer/docs/ | Deployment procedures |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-14 | NSITE MO | Initial draft |
| 1.1.0 | 2026-01-15 | NSITE MO | Updated naming to NSITE pattern; marked Phases 1-4 complete; documented MO-DB_Solutions as primary data source |

---

*This document is the authoritative reference for MO-Viewer architecture. All component documentation should align with and reference this document.*
