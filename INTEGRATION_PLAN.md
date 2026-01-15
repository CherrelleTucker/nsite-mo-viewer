# MO-Viewer Integration Plan

**Version:** 2.0.0
**Date:** 2026-01-14
**Reference:** [MO-VIEWER_MASTER_ARCHITECTURE.md](./MO-VIEWER_MASTER_ARCHITECTURE.md)

---

## Executive Summary

This plan outlines how to build **MO-Viewer** - a unified dashboard platform for the NSITE MO (NASA's Support to the satellite Needs working group Implementation TEam Management Office) that consolidates solution tracking, stakeholder engagement, and communications management into a single interface.

**Core Principle:** Weekly meeting notes and tracking documents are the single source of truth. The database is a cache layer. Everything else is auto-generated.

### Platform Components

| Component | Focus | Source Document |
|-----------|-------|-----------------|
| **Implementation-Viewer** | Solutions/Projects | Internal Agenda (Weekly Planning Notes) |
| **SEP-Viewer** | People/Stakeholders | SEP Agenda (Weekly Meeting Notes) |
| **Comms-Viewer** | Stories/Communications | Comms Tracking (Story Tracking Workbook) |
| **Quick Update Form** | Input | Writes to all source documents |
| **Shared Resources** | Cross-cutting | Multiple sources |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MO-VIEWER PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐         │
│  │ Implementation-   │ │    SEP-Viewer     │ │   Comms-Viewer    │         │
│  │     Viewer        │ │                   │ │                   │         │
│  │ Solution/Project  │ │  People Focused   │ │  Story Focused    │         │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Shared Resources: Contacts │ Reports │ Schedule │ Actions │ Templates │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Quick Update Form (Embedded)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │  Database (Cache)   │
                           │  Google Sheets      │
                           └─────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │   Internal   │  │     SEP      │  │    Comms     │
           │    Agenda    │  │    Agenda    │  │   Tracking   │
           │  (Mondays)   │  │  (Tuesdays)  │  │  (Ongoing)   │
           └──────────────┘  └──────────────┘  └──────────────┘
                         SOURCES OF TRUTH
```

---

## Phase 1: Platform Foundation

### Goal
Create the MO-Viewer platform shell with navigation and shared infrastructure.

### Deliverables

**1.1 Mono-Repo Setup**
```
mo-viewer/
├── README.md
├── MO-VIEWER_MASTER_ARCHITECTURE.md
├── docs/
├── src/
│   ├── platform/
│   ├── implementation-viewer/
│   ├── sep-viewer/
│   ├── comms-viewer/
│   ├── shared/
│   └── quick-update/
├── parsers/
├── storage/
└── config/
```

**1.2 Platform Shell**
- `src/platform/Code.gs` - Main entry point with routing
- `src/platform/index.html` - Platform HTML with tab navigation
- `src/platform/styles.css` - Shared CSS variables and base styles

**1.3 Database Setup**
- `storage/database-setup.gs` - Create Google Sheets database structure
- Tables: Solutions, Stakeholders, Stories, Actions, Milestones, UpdateHistory

### Files to Create
```
mo-viewer/src/platform/Code.gs
mo-viewer/src/platform/index.html
mo-viewer/src/platform/navigation.html
mo-viewer/src/platform/styles.css
mo-viewer/storage/database-setup.gs
mo-viewer/storage/database-api.gs
```

### Technical Approach

**Routing Pattern:**
```javascript
function doGet(e) {
  var page = e.parameter.page || 'implementation';

  var template = HtmlService.createTemplateFromFile('index');
  template.activePage = page;

  return template.evaluate()
    .setTitle('MO-Viewer | NSITE MO Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

**Tab Navigation:**
```html
<nav class="viewer-tabs">
  <a href="?page=implementation" class="tab">Implementation</a>
  <a href="?page=sep" class="tab">SEP</a>
  <a href="?page=comms" class="tab">Comms</a>
</nav>
```

---

## Phase 2: Implementation-Viewer

### Goal
Build the Solution/Project focused dashboard view.

### Data Source
**Internal Agenda** (Weekly Planning Notes) - Monday meetings

### Features
- Solutions organized by Cycle (C1-C6)
- MO Milestones tracking (IPA, ICD, F2I, OPS)
- Document Administration status
- Per-Solution tracking (DAAC, Deep Dives, Actions)

### Deliverables

**2.1 Internal Agenda Parser**
- `parsers/internal-agenda-parser.gs`
- Parse table-based meeting notes structure
- Extract: Cycle, Solution Name, Provider, Status bullets, Actions

**2.2 Implementation-Viewer UI**
- `src/implementation-viewer/implementation.html`
- `src/implementation-viewer/implementation.js`
- Solution cards with phase badges
- Filter by Cycle, Phase, Provider
- Search by solution name

**2.3 Storage Integration**
- Write parsed data to Solutions table
- Write actions to Actions table
- Write milestones to Milestones table

### Parser Output Schema
```json
{
  "solutions": [{
    "name": "HLS",
    "cycle": "C1",
    "provider": "MSFC",
    "phase": "Operations",
    "ownership": "SEP-Directed",
    "status": "Product operations ongoing",
    "actions": ["Schedule deep dive for Q2"],
    "milestones": {
      "IPA": "2024-03-15",
      "ICD": "2024-06-01",
      "F2I": "2025-01-15",
      "OPS": "2025-08-20"
    },
    "lastUpdated": "2026-01-14",
    "sourceTab": "01_13"
  }]
}
```

### Files to Create
```
mo-viewer/parsers/internal-agenda-parser.gs
mo-viewer/src/implementation-viewer/implementation.html
mo-viewer/src/implementation-viewer/implementation.js
mo-viewer/src/implementation-viewer/README.md
```

---

## Phase 3: Quick Update Form

### Goal
Embed the update submission form within MO-Viewer platform.

### Data Targets
- Internal Agenda (for solution updates)
- SEP Agenda (for stakeholder updates)
- Comms Tracking (for story updates)

### Features
- Select target document type
- Select solution/stakeholder/story
- Choose update type (Action, Milestone, General)
- Submit directly to source document
- Confirmation with link to updated location

### Deliverables

**3.1 Form UI**
- `src/quick-update/quick-update.html`
- `src/quick-update/quick-update.js`
- Dropdown for document type
- Dynamic solution/entity list based on selection
- Update type checkboxes
- Text area for update content

**3.2 Submission Handlers**
- `src/quick-update/submission-handlers.gs`
- `submitToInternalAgenda(solution, types, text)`
- `submitToSEPAgenda(solution, types, text)`
- `submitToCommsTracking(story, types, text)`

**3.3 Document Writers**
- Reuse and refactor existing NSITEViewer logic
- Support both table-based and section-based documents
- Find correct tab/section and insert update

### Migration from NSITEViewer
```
OLD: nsite-viewer/src/web-app/Code.gs
NEW: mo-viewer/src/quick-update/submission-handlers.gs

OLD: nsite-viewer/src/web-app/quickUpdateWebApp.html
NEW: mo-viewer/src/quick-update/quick-update.html
```

### Files to Create
```
mo-viewer/src/quick-update/quick-update.html
mo-viewer/src/quick-update/quick-update.js
mo-viewer/src/quick-update/submission-handlers.gs
mo-viewer/src/quick-update/README.md
```

---

## Phase 4: SEP-Viewer

### Goal
Build the People/Stakeholder focused dashboard view.

### Data Source
**SEP Agenda** (Weekly Meeting Notes) - Tuesday meetings

### Features
- Stakeholder Touchpoint Pipeline (T4 → W1 → W2 → T7 → T8)
- People View and Solution View toggles
- Key Metrics with targets
- Contact Tools integration
- Solution Ownership Model display

### Deliverables

**4.1 SEP Agenda Parser**
- `parsers/sep-agenda-parser.gs`
- Parse section-based meeting notes structure
- Extract: Solution, SEP PoC, Touchpoint status, Current Needs, Next Steps

**4.2 SEP-Viewer UI**
- `src/sep-viewer/sep.html`
- `src/sep-viewer/sep.js`
- Touchpoint pipeline visualization
- Stakeholder cards with engagement status
- Toggle between People View / Solution View

**4.3 Stakeholder Data Integration**
- Merge with existing stakeholder database
- Link stakeholders to solutions (many-to-many)
- Track touchpoint progression

### Parser Output Schema
```json
{
  "solutions": [{
    "name": "HLS",
    "sepPoC": "Pontus",
    "ownership": "SEP-Directed",
    "touchpointStatus": "T7",
    "currentNeeds": ["Develop stakeholder transition plan"],
    "nextSteps": ["Schedule HLS Workshop Planning meeting"],
    "stakeholders": ["Stakeholder A", "Stakeholder B"],
    "lastUpdated": "2026-01-14"
  }]
}
```

### Migration from SEPViewer
```
OLD: nsite-SEPViewer/src/viewer/
NEW: mo-viewer/src/sep-viewer/

Refactor to integrate with unified platform navigation and shared styles.
```

### Files to Create
```
mo-viewer/parsers/sep-agenda-parser.gs
mo-viewer/src/sep-viewer/sep.html
mo-viewer/src/sep-viewer/sep.js
mo-viewer/src/sep-viewer/README.md
```

---

## Phase 5: Comms-Viewer

### Goal
Build the Story/Communications focused dashboard view.

### Data Source
**Comms Tracking** (Story Tracking Workbook) - Ongoing

### Features
- Story Pipeline Funnel (Ideas → Drafts → Reviewed → Submitted)
- Solution Coverage Gaps identification
- Content Tracking (Web, Slides, Science Stories, Key Dates)
- Outreach Channels overview

### Deliverables

**5.1 Comms Tracking Parser**
- `parsers/comms-tracker-parser.gs`
- Parse Story Tracking Workbook structure
- Extract: Story title, Solution link, Status, Channel, Priority

**5.2 Comms-Viewer UI**
- `src/comms-viewer/comms.html`
- `src/comms-viewer/comms.js`
- Pipeline funnel visualization
- Story cards with status badges
- Coverage gap highlighting

**5.3 Metrics Dashboard**
- Stories by status
- Solutions without stories (coverage gaps)
- Upcoming scheduled content
- Channel distribution

### Parser Output Schema
```json
{
  "stories": [{
    "id": "STORY_001",
    "title": "HLS Impact Story",
    "solution": "HLS",
    "status": "draft",
    "channel": "web",
    "priority": "high",
    "scheduledDate": "2026-02-15",
    "lastUpdated": "2026-01-14"
  }],
  "metrics": {
    "byStatus": {"idea": 27, "draft": 5, "reviewed": 3, "submitted": 1},
    "coverageGaps": ["OPERA", "VLM"],
    "upcoming": 3
  }
}
```

### Files to Create
```
mo-viewer/parsers/comms-tracker-parser.gs
mo-viewer/src/comms-viewer/comms.html
mo-viewer/src/comms-viewer/comms.js
mo-viewer/src/comms-viewer/README.md
```

---

## Phase 6: Shared Resources

### Goal
Build cross-cutting components used by all viewer tabs.

### Components

**6.1 Contact Lists**
- Stakeholder contacts
- Admin contacts
- Outreach contacts
- Unified search across all contact types

**6.2 Reports**
- Milestone reports (auto-generated from database)
- General status reports
- Export to CSV/PDF

**6.3 Master Schedule**
- Deep Dives calendar
- Decision Gates timeline
- Events and conferences

**6.4 Action Tracker**
- Unified view of all actions across all sources
- Owner assignment
- Status tracking (Open/Closed)
- Source document linking

**6.5 Templates & Guides**
- Style Guide
- Desk Guide
- Slide Templates
- Quick links to resources

### Files to Create
```
mo-viewer/src/shared/contacts.html
mo-viewer/src/shared/reports.html
mo-viewer/src/shared/schedule.html
mo-viewer/src/shared/actions.html
mo-viewer/src/shared/templates.html
mo-viewer/src/shared/shared.js
mo-viewer/src/shared/README.md
```

---

## Phase 7: Automation & Sync

### Goal
Automate data synchronization and report generation.

### Deliverables

**7.1 Scheduled Sync**
- Time-based trigger: Sync all parsers hourly
- On-demand sync via "Sync to MO-Viewer" menu in source docs

**7.2 Container-Bound Menus**
- Add "Sync to MO-Viewer" menu to each source document
- One-click sync without opening the platform

**7.3 QuickLook CSV Generator**
- Auto-generate milestone CSV from database
- Export to Google Drive
- Email notification option

**7.4 Quad Chart Integration**
- Pull weekly updates from database
- Format for quad chart slide generation

### Files to Create
```
mo-viewer/storage/database-sync.gs
mo-viewer/src/platform/triggers.gs
mo-viewer/reports/quicklook-generator.gs
mo-viewer/reports/quadchart-data.gs
```

---

## Phase 8: Polish & Deploy

### Goal
Final polish, testing, and production deployment.

### Deliverables

**8.1 UI Polish**
- Responsive design testing
- Mobile optimization
- Loading states and error handling
- Accessibility review

**8.2 Documentation**
- User Guide
- Setup Guide
- API Reference
- Troubleshooting Guide

**8.3 Production Deployment**
- Deploy as Web App
- Configure access permissions
- Set up monitoring
- Create backup procedures

**8.4 Team Rollout**
- Demo to team leads
- Training session
- Feedback collection
- Iteration based on feedback

---

## Data Flow Diagram

```
┌─────────────────┐
│  Quick Update   │
│     Form        │
│  (Embedded)     │
└────────┬────────┘
         │ writes to
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SOURCES OF TRUTH                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Internal   │  │    SEP      │  │   Comms     │              │
│  │   Agenda    │  │   Agenda    │  │  Tracking   │              │
│  │  (Monday)   │  │  (Tuesday)  │  │  (Ongoing)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
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
                  │ └─ UpdateHistory    │
                  └──────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Implementation- │ │   SEP-Viewer    │ │  Comms-Viewer   │
│     Viewer      │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   Shared Resources  │
                  │ Contacts │ Reports  │
                  │ Schedule │ Actions  │
                  └─────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   Report Outputs    │
                  │ ├─ QuickLook CSV    │
                  │ ├─ Quad Chart Data  │
                  │ └─ Status Reports   │
                  └─────────────────────┘
```

---

## Migration Strategy

### From Existing Systems

| Old System | New Location | Migration Notes |
|------------|--------------|-----------------|
| NSITEViewer (nsite-viewer/) | mo-viewer/src/quick-update/ | Refactor as embedded form |
| SEPViewer (nsite-SEPViewer/) | mo-viewer/src/sep-viewer/ | Integrate with platform shell |
| SolutionFlow (snwg-automation/SolutionFlow/) | mo-viewer/src/implementation-viewer/ + parsers/ | Split UI from parsing logic |

### Legacy Repos

After migration, the following repos become **archived references**:
- `nsite-viewer/` → Archived, replaced by mo-viewer
- `nsite-SEPViewer/` → Archived, replaced by mo-viewer
- `snwg-automation/SolutionFlow/` → Archived, replaced by mo-viewer

The following remain **active**:
- `snwg-automation/` (other scripts like ActionFlow, QuickGit)
- `nsite-implementation/` (GitHub Issues for solutions)
- `NSITE-MO-Stakeholders/` (GitHub Issues for stakeholders)

---

## Success Criteria

### Platform Success
- [ ] Single URL for all NSITE MO dashboard needs
- [ ] Sub-3-second page load times
- [ ] Mobile-responsive design
- [ ] No separate logins required

### User Success
- [ ] Answer "What's the status of X?" in under 10 seconds
- [ ] Submit updates without leaving the dashboard
- [ ] Find any solution, stakeholder, or story via search
- [ ] Export data for external reporting

### Team Success
- [ ] Reduce manual status compilation from hours to minutes
- [ ] Single source of truth for all NSITE MO tracking
- [ ] Clear audit trail for all updates
- [ ] Self-service access without asking the coordinator

### Adoption Metrics
- [ ] 80%+ of team using MO-Viewer weekly
- [ ] Quick Update Form submissions replacing email updates
- [ ] Zero "what's the status?" questions that require manual lookup

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Parser fails on edge cases | Test with 10+ real meeting tabs per source type |
| Team doesn't adopt platform | Make it faster than current workflow; demo wins early |
| Document structure changes | Keep parsers flexible; detect patterns not rigid structure |
| Database sync falls behind | Hourly auto-sync + on-demand manual sync option |
| Performance degrades with scale | Partition data by year; cache frequently accessed data |

---

## Implementation Timeline

| Phase | Focus | Dependencies |
|-------|-------|--------------|
| **Phase 1** | Platform Foundation | None |
| **Phase 2** | Implementation-Viewer | Phase 1 |
| **Phase 3** | Quick Update Form | Phase 1 |
| **Phase 4** | SEP-Viewer | Phase 1 |
| **Phase 5** | Comms-Viewer | Phase 1 |
| **Phase 6** | Shared Resources | Phases 2-5 |
| **Phase 7** | Automation & Sync | Phases 2-5 |
| **Phase 8** | Polish & Deploy | All phases |

**Note:** Phases 2-5 can be developed in parallel after Phase 1 is complete.

---

## Next Steps

### Immediate Actions
1. [ ] Review and approve this integration plan
2. [ ] Create `mo-viewer` GitHub repository
3. [ ] Initialize mono-repo structure
4. [ ] Begin Phase 1: Platform Foundation

### Questions to Resolve
- [ ] Confirm Comms Tracking Workbook structure for parser development
- [ ] Identify any additional shared resources needed
- [ ] Determine hosting approach (single deployment vs. multiple)

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [MO-VIEWER_MASTER_ARCHITECTURE.md](./MO-VIEWER_MASTER_ARCHITECTURE.md) | Authoritative architecture reference |
| [nsite-architecture-diagram.html](./nsite-architecture-diagram.html) | Visual architecture diagram |
| DATA_SCHEMA.md (to be created) | Detailed data model documentation |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-12 | Initial SolutionFlow-focused plan |
| 2.0.0 | 2026-01-14 | Rewritten for unified MO-Viewer platform |

---

*This plan aligns with the MO-Viewer Master Architecture. All implementation should reference the architecture document for component specifications and naming conventions.*
