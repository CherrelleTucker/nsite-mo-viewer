# MO-Viewer Master Architecture

**Version:** 1.0.0
**Date:** 2026-01-14
**Status:** Draft

---

## Executive Summary

MO-Viewer is a unified dashboard platform for the **NSITE MO** (NASA's Support to the satellite Needs working group Implementation TEam Management Office) that consolidates solution tracking, stakeholder engagement, and communications management into a single interface. It replaces multiple standalone tools with one coherent system while maintaining weekly meeting notes as the authoritative source of truth.

---

## Naming Conventions

| Term | Scope | Description |
|------|-------|-------------|
| **MO-Viewer** | Platform | The complete dashboard platform containing all viewer components |
| **Implementation-Viewer** | Component | Solution/Project focused dashboard view |
| **SEP-Viewer** | Component | People/Stakeholder focused dashboard view |
| **Comms-Viewer** | Component | Story/Communications focused dashboard view |
| **Quick Update Form** | Component | Embedded input form for submitting updates |
| **Shared Resources** | Component | Cross-cutting data accessible from all viewers |

### Usage Examples

- "MO-Viewer is deployed at [URL]" (referring to the platform)
- "The Implementation-Viewer shows solutions by cycle" (referring to a component)
- "Data flows from meeting notes into MO-Viewer" (platform context)

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

### 1. Implementation-Viewer

**Focus:** Solutions and Projects

**Primary Questions Answered:**
- What is the status of Solution X?
- Which solutions are in which lifecycle phase?
- What are the upcoming milestones?
- Who is assigned to which DAAC?

**Data Displayed:**

| Section | Content |
|---------|---------|
| Solutions by Cycle | C1-C6 (2016-2026), grouped by assessment cycle |
| MO Milestones | IPA, ICD, F2I DG, OPS for each solution |
| Document Administration | Project Plans, SEP Plan, Comms Plan, IM Plan status |
| Per-Solution Tracking | DAAC Assignment, Deep Dives scheduled, Action Items |

**Source Documents:**
- Internal Agenda (Weekly Planning Notes)

---

### 2. SEP-Viewer

**Focus:** People and Stakeholder Engagement

**Primary Questions Answered:**
- Where is Stakeholder X in the engagement pipeline?
- Which solutions need stakeholder touchpoints?
- What is our engagement rate?
- Who are the SEP Points of Contact?

**Data Displayed:**

| Section | Content |
|---------|---------|
| Touchpoint Pipeline | T4 → W1 → W2 → T7 → T8 progression |
| Views | People View (by stakeholder) and Solution View (by project) |
| Key Metrics | Engagement Rate, Transition Success, Impact Docs, Training Resources |
| Contact Tools | Email Records, Assessment Context, Interview Artifacts |
| Ownership Model | SEP-Directed (8), Project-Led (4), SPoRT-Directed (4) |

**Source Documents:**
- SEP Agenda (Weekly Meeting Notes)
- Stakeholder database (existing)

---

### 3. Comms-Viewer

**Focus:** Stories and Communications

**Primary Questions Answered:**
- What stories are in the pipeline?
- Which solutions lack communications coverage?
- What content is scheduled for release?
- How are we tracking against outreach goals?

**Data Displayed:**

| Section | Content |
|---------|---------|
| Story Pipeline Funnel | Ideas → Drafts → Reviewed → Submitted |
| Key Metrics | Solution Coverage Gaps, Admin Priority Alignment, External Mentions, Social Media Reach |
| Content Tracking | Web Content, Featured Slides, Science Stories, Key Dates |
| Outreach Channels | Social Media, Newsletters, Webinars, Conferences |

**Source Documents:**
- Comms Tracking (Story Tracking Workbook)

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

### Phase 1: Foundation
- [ ] Create mono-repo structure
- [ ] Migrate MO-VIEWER_MASTER_ARCHITECTURE.md
- [ ] Set up database schema in Google Sheets

### Phase 2: Core Platform
- [ ] Build platform shell (navigation, routing)
- [ ] Implement Quick Update Form (migrate from NSITEViewer)
- [ ] Deploy basic web app

### Phase 3: Implementation-Viewer
- [ ] Migrate SolutionFlow parser
- [ ] Build Implementation-Viewer UI
- [ ] Connect to database

### Phase 4: SEP-Viewer
- [ ] Migrate SEPViewer components
- [ ] Build SEP-Viewer UI
- [ ] Integrate stakeholder data

### Phase 5: Comms-Viewer
- [ ] Build Comms Tracking parser (new)
- [ ] Build Comms-Viewer UI
- [ ] Integrate story pipeline data

### Phase 6: Shared Resources
- [ ] Build shared components
- [ ] Integrate cross-cutting data
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
| 1.0.0 | 2026-01-14 | [Your Name] | Initial draft |

---

*This document is the authoritative reference for MO-Viewer architecture. All component documentation should align with and reference this document.*
