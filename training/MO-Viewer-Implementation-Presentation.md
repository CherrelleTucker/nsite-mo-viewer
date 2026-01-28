# MO Viewer - Implementation-View Presentation
## Information Management Platform | January 2026

---

## Slide 1: Title

**MO Viewer**

Information Management Platform

Implementation-View | January 2026

*[Dark blue background, white text, centered]*

---

## Slide 2: The Problem

**The Problem:** lots of data, not a lot of ways to quickly access the information it informs

### MO-wide:
- Over 9000 interconnected files stored in Google Drive, acting as a "database"
- Jenny, Cherrelle, Slack, emails, Teams, and various meetings acting as database interfaces
- Multiple copies of various files used to create actionable information conveyed in meetings → lacking a shared agreement or platform for Source of Truth

### Implementation-specific:
- 48 solutions across 5 assessment cycles (2016-2024)
- 33 data fields tracked per solution (lifecycle phase, milestones, documents, contracts)
- 4 major milestones per solution (ATP, F2I, ORR, Closeout) with 9 document deliverables each
- ~4,200+ stakeholder contacts linked to solutions
- Historical updates scattered across 4+ years of meeting notes

---

## Slide 3: Early Solution Attempts (Visual)

**Early Solution attempts**

*[Show timeline with screenshots: 2022-2023, 2024, 2025]*

- 2022-2023: SNWG MO Landing Site (Google Sites)
- 2024: Google Sheets with ~40 AppScripts
- 2025: GitHub-based SEP Viewer with custom templates

---

## Slide 4: Early Solution Attempts (Comparison Table)

**Early Solution attempts**

| | 2022-2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|
| **Storage** | files in GWorkspace | files in GWorkspace | files in GWorkspace | files in GWorkspace |
| **Data Processing** | manually entered, tracked, transformed, analyzed; viewed through Google Site | manually entered, automatically transformed with ~40 AppsScripts; direct file access | pulled from GWorkspace, applied to GitHub templates, displayed via AppScript | pulled from Source of Truth files into Databases |
| **Access Model** | view-only; links to source files; no edit access | linking network of source files; full edit access (working directly in all files) | view-only, linking of source files; additional interface layer; heavy maintenance | direct interaction with maintained data; transforms into information as needed; no risk to Source of Truth |

---

## Slide 5: The Meta-Analysis

**The Meta-Analysis**

- Conducted analysis of the Implementation tracking process as a proposed Solution to address documented Needs
  - Evaluated how solution data flows across all MO activities from multiple perspectives

- Identified design concerns with existing tracking methods:
  - Solution data scattered across individual Drive folders, QuickLook sheets, and meeting notes
  - No single view of "where is this solution right now?"
  - Milestone and document status requires opening multiple files to piece together

- Discovered: ability to consolidate solution metadata into structured database while maintaining links to source files
  - **Single source of truth for solution status with full audit trail back to original documents**

---

## Slide 6: How We Work (Whiteboard Diagram)

**How we work, in terms of an Information Management System**

*[Show whiteboard photo or recreate diagram showing:]*

**Inputs** → **Storage** → **Outputs**

- Source of Truth: Internal Agenda, SEP Agenda, Comms Entry/Updates
- Databases: DB-Solutions, DB-Contacts, DB-Needs, DB-Actions, DB-Updates, DB-Agencies, DB-Engagements, DB-Outreach
- NSITE Dashboard: Implementation Dashboard, Comms Dashboard, SEP Dashboard, Solution Management, Contact Lists, Reports

---

## Slide 7: Context - Why MO Viewer

**Context: Why MO Viewer and not just Implementation Tracker?**

| **SEP** | **Comms** | **Team** |
|---|---|---|
| SEP milestones map directly to Implementation lifecycle phases | Solution updates become Comms stories and talking points | Actions from Implementation meetings need tracking and assignment |
| Stakeholder engagement aligns with solution readiness | Milestone achievements are outreach opportunities | Meeting notes feed solution update database |
| Working sessions prepare stakeholders for transitions | Success stories amplify Implementation wins | Availability affects milestone scheduling |

**Implementation is the foundation:**

✓ SEP – SEP wraps around the Solution Lifecycle framework; solution data had to be built first because SEP engagement maps directly to solution phases and milestones

✓ Comms – Every solution milestone is a potential story; Implementation provides the "what happened" that Comms amplifies

✓ Team – Internal planning meetings generate updates and actions that feed back into Implementation tracking

✓ Reports – Quad charts, milestone reports, and historical updates all pull from Implementation data

---

## Slide 8: Answering Implementation's Questions

**Answering Implementation's Questions with MO Viewer**

### 1. Where Are We?
What phase is this solution in and what milestones are coming up?

### 2. What's the Status?
Are documents complete? What deliverables are pending?

### 3. What's Happening?
What are the recent updates and who are the stakeholders?

*[Show screenshot of Implementation-NSITE dashboard]*

---

## Slide 9: Q1 - Where Are We?

**Q1: Where Are We in the Lifecycle?**

| **Solution Picker** | **Milestone Timeline** |
|---|---|
| Filter by cycle (1-5) | Visual progress indicators |
| Filter by lifecycle phase | ATP, F2I, ORR, Closeout tracking |
| Filter by group (HLS, OPERA, etc.) | Color-coded completion status |
| Search across all solutions | Date-based milestone planning |

### Lifecycle Phases Tracked in MO Viewer:
- **Formulation** → Initial planning and requirements gathering
- **Implementation** → Active development and integration
- **Operations** → Production use and maintenance
- **Closeout** → Transition and archival

---

## Slide 10: Demo - Solution Lifecycle

**Demo: Solution Lifecycle Tracking**

**LIVE DEMO**

Implementation Dashboard → Select "Active Solutions" → MWOW → Details Card

*[Show two screenshots:]*
1. Implementation dashboard with solution cards showing phase badges
2. MWOW detail modal showing milestones section with ATP complete, dates for upcoming milestones

---

## Slide 11: Q2 - What's the Status?

**Q2: What's the Document & Deliverable Status?**

| **Document Links** | **Document Status Grid** | **Milestone Documents** |
|---|---|---|
| Drive Folder | Project Plan status | ATP Memo & Presentation |
| Earthdata Page | Science SOW status | F2I Memo & Presentation |
| Project Plan | IRA/TTA status | ORR Memo & Presentation |
| Science SOW | ICD status | Closeout Memo & Presentation |
| Risk Register | All 9 deliverables tracked | One-click access to all docs |

### How MO Viewer Tracks Document Status:
✓ 9 key documents tracked per solution with completion status
✓ Direct links to source documents in Drive
✓ Visual indicators: Complete (green), In Progress (yellow), Not Started (gray)
✓ Quick access to Earthdata page and external resources

---

## Slide 12: Demo - Document Status

**Demo: Document Status Tracking**

**LIVE DEMO**

Implementation Dashboard → HLS → Details Card → Document Status section

*[Show screenshot of solution detail modal with:]*
- Document Links row (Drive Folder, Earthdata Page, Project Plan, Science SOW, Risk Register)
- Document Status grid showing Complete/In Progress/Not Started for each deliverable

---

## Slide 13: Q3 - What's Happening?

**Q3: What's Happening with This Solution?**

| **Recent Updates** | **Stakeholder Summary** | **Team & Contacts** |
|---|---|---|
| Updates from meeting notes | Total contacts count | Team lead assignment |
| Chronological timeline | Survey submitters | IRA representative |
| Source document links | Primary/Secondary SMEs | Agency breakdown |
| Last 30/60/90 day filters | Agency affiliations | Email all stakeholders |

### Update Tracking in MO Viewer:
→ Updates automatically extracted from Internal Planning and SEP meeting notes
→ Linked to source documents for full context
→ Filterable by date range and solution
→ Exportable for reports and presentations

---

## Slide 14: Demo - Updates & Stakeholders

**Demo: Updates and Stakeholder Tracking**

**LIVE DEMO**

Implementation Dashboard → GABAN → Details Card → Recent Updates
Implementation Dashboard → GABAN → Details Card → Stakeholders section

*[Show screenshots of:]*
1. Solution detail modal showing Recent Updates section with dates and source links
2. Stakeholder summary showing contact counts by role and agency list

---

## Slide 15: Summary - Answering All Questions

**MO Viewer: Answering Implementation Questions**

| **Q1: Where Are We?** | **Q2: What's the Status?** | **Q3: What's Happening?** |
|---|---|---|
| Solution Picker & Milestone Timeline | Document Status Grid & Links | Recent Updates & Stakeholders |
| track lifecycle phase and upcoming milestones | see deliverable completion at a glance | stay current on activities and contacts |
| *[Green border]* | *[Blue border]* | *[Orange border]* |

**One platform for complete solution portfolio visibility**

---

## Slide 16: Thank You

**Thank You**

Questions?

*[Dark blue background, white text, centered]*

---

# Speaker Notes

## Slide 2 (The Problem)
- Emphasize the 48 solutions and how hard it is to get a quick answer about any single one
- The 33 data fields means lots of places for information to get out of sync

## Slide 8 (Three Questions)
- These are the questions Jenny/leadership ask most frequently
- MO Viewer was designed to answer these in seconds, not minutes of searching

## Slide 10 Demo
- Show how clicking a solution card opens the detail view
- Highlight the phase badge and milestone indicators
- Show grouping: select HLS to see HLS, HLS-VI, HLS-LL together

## Slide 12 Demo
- Click through document links to show they open actual Drive files
- Point out the color coding for status
- Show how this replaces checking multiple folders

## Slide 14 Demo
- Show updates with dates and the "Internal Planning" or "SEP" source tags
- Click through to the stakeholder section
- Demonstrate "Email All" functionality

## Key Differentiators from SEP Presentation
- Implementation focuses on PROJECT status (documents, milestones, deliverables)
- SEP focuses on PEOPLE status (engagements, relationships, needs)
- Both pull from same underlying data but present different views
