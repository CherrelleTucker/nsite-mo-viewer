# MO-Viewer Data Schema

**Version:** 1.1.0
**Date:** 2026-01-18
**Reference:** [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Overview

This document defines the unified data schema for the MO-Viewer platform. The schema supports three viewer components (Implementation-Viewer, SEP-Viewer, Comms-Viewer) with shared resources across all views.

### Design Principles

1. **Source of Truth:** Weekly meeting notes and tracking documents remain authoritative
2. **Cache Layer:** Database is a queryable cache, not the master record
3. **Audit Trail:** All changes tracked with timestamps and source references
4. **Flexible Schema:** Optional fields accommodate real-world data variations
5. **Cross-Linking:** Entities connect across viewer boundaries (solutions ↔ stakeholders ↔ stories)

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    SOLUTIONS    │       │  STAKEHOLDERS   │       │     STORIES     │
│                 │       │                 │       │                 │
│  solution_id PK │◄─────►│ stakeholder_id  │       │   story_id PK   │
│  name           │   M:N │ name            │       │   title         │
│  cycle          │       │ organization    │       │   solution_id FK│──┐
│  phase          │       │ type            │       │   status        │  │
│  provider       │       │ touchpoint      │       │   channel       │  │
└────────┬────────┘       └─────────────────┘       └─────────────────┘  │
         │                                                               │
         │ 1:N                                                           │
         ▼                                                               │
┌─────────────────┐       ┌─────────────────┐                           │
│   MILESTONES    │       │    ACTIONS      │                           │
│                 │       │                 │                           │
│ milestone_id PK │       │  action_id PK   │                           │
│ solution_id  FK │       │  solution_id FK │◄──────────────────────────┘
│ type            │       │  description    │
│ target_date     │       │  owner          │
│ status          │       │  status         │
└─────────────────┘       └─────────────────┘

                    ┌─────────────────┐
                    │ UPDATE_HISTORY  │
                    │                 │
                    │ history_id   PK │
                    │ entity_type     │  ← 'solution' | 'stakeholder' | 'story'
                    │ entity_id       │
                    │ update_text     │
                    │ timestamp       │
                    └─────────────────┘

                    ┌─────────────────┐
                    │ SOLUTION_       │
                    │ STAKEHOLDERS    │  ← Junction table (M:N)
                    │                 │
                    │ solution_id  FK │
                    │ stakeholder_id FK│
                    └─────────────────┘
```

---

## Table Definitions

### 1. SOLUTIONS

Primary table for Implementation-Viewer. Tracks all NSITE MO solutions across lifecycle phases.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `solution_id` | STRING | Yes | Primary key (e.g., "SOL_HLS", "SOL_OPERA") |
| `name` | STRING | Yes | Solution display name (e.g., "HLS", "OPERA") |
| `full_name` | STRING | No | Full solution name (e.g., "Harmonized Landsat Sentinel-2") |
| `cycle` | STRING | Yes | Assessment cycle (C1, C2, C3, C4, C5, C6) |
| `phase` | STRING | Yes | Lifecycle phase (see Phase enum) |
| `provider` | STRING | No | Provider center (e.g., "MSFC", "GSFC", "JPL") |
| `daac` | STRING | No | Assigned DAAC (e.g., "LP DAAC", "PO.DAAC") |
| `ownership` | STRING | No | SEP ownership model (see Ownership enum) |
| `sep_poc` | STRING | No | SEP Point of Contact name |
| `status_text` | STRING | No | Current status summary (free text) |
| `next_steps` | STRING | No | Next steps summary (free text) |
| `source_doc` | STRING | No | Source document type ('internal' | 'sep') |
| `source_tab` | STRING | No | Source document tab name (e.g., "01_13") |
| `show_in_default` | STRING | No | Show in default selection ('Y' = yes, blank = no). Controls which solutions appear selected by default in Implementation-NSITE. |
| `alternate_names` | STRING | No | Pipe-delimited list of alternate names for matching (e.g., "Harmonized Landsat Sentinel-2\|harmonized landsat\|HLS v2"). Used by sync scripts to match solution names in source documents. |
| `atp_date` | DATE | No | Authority to Proceed Decision Gate date. Past = completed, future = planned. |
| `f2i_date` | DATE | No | Formulation to Implementation Decision Gate date. Past = completed, future = planned. |
| `orr_date` | DATE | No | Operational Readiness Review date. Past = completed, future = planned. |
| `closeout_date` | DATE | No | Closeout Decision Gate date. Past = completed, future = planned. |
| `project_plan` | STRING/DATE | No | Project Plan status. Empty = not started, "in_work" = in progress, date = completed. |
| `science_sow` | STRING/DATE | No | Science SOW status. Empty = not started, "in_work" = in progress, date = completed. |
| `ipa` | STRING/DATE | No | Interproject Agreement status. Empty = not started, "in_work" = in progress, date = completed. |
| `icd` | STRING/DATE | No | Interface Control Document status. Empty = not started, "in_work" = in progress, date = completed. |
| `tta` | STRING/DATE | No | Technical Task Agreement status. Empty = not started, "in_work" = in progress, date = completed. |
| `atp_memo` | STRING/DATE | No | ATP Decision Gate Memo status. |
| `f2i_memo` | STRING/DATE | No | F2I Decision Gate Memo status. |
| `orr_memo` | STRING/DATE | No | ORR Decision Gate Memo status. |
| `closeout_memo` | STRING/DATE | No | Closeout Decision Gate Memo status. |
| `last_updated` | DATE | Yes | Last update timestamp |
| `created_at` | DATE | Yes | Record creation timestamp |

**Indexes:**
- Primary: `solution_id`
- Secondary: `cycle`, `phase`, `provider`

**Example:**
```json
{
  "solution_id": "SOL_HLS",
  "name": "HLS",
  "full_name": "Harmonized Landsat Sentinel-2",
  "cycle": "C1",
  "phase": "Operations",
  "provider": "MSFC",
  "daac": "LP DAAC",
  "ownership": "SEP-Directed",
  "sep_poc": "Pontus",
  "status_text": "Product operations ongoing. Version 2.0 in development.",
  "next_steps": "Schedule deep dive for Q2",
  "source_doc": "internal",
  "source_tab": "01_13",
  "show_in_default": "Y",
  "atp_date": "2024-03-15",
  "f2i_date": "2024-09-01",
  "orr_date": "2025-01-15",
  "closeout_date": "",
  "last_updated": "2026-01-14",
  "created_at": "2024-01-15"
}
```

---

### 2. CONTACTS (MO-DB_Contacts)

**Status: POPULATED** - 4,221 records (423 unique contacts across 47 solutions)

Primary contact database for the Contacts Directory. One row per contact-solution-role relationship (denormalized for query flexibility).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `contact_id` | STRING | Yes | Primary key (auto-generated) |
| `first_name` | STRING | No | First name (no middle initials or honorifics) |
| `last_name` | STRING | No | Last name (no suffixes like Ph.D., Jr.) |
| `email` | STRING | Yes | Email address (lowercase, normalized) |
| `primary_email` | STRING | No | Primary email for people with multiple addresses |
| `phone` | STRING | No | Phone number (xxx-xxx-xxxx format) |
| `department` | STRING | No | Standardized department name |
| `agency` | STRING | No | Agency/bureau |
| `organization` | STRING | No | Organization name |
| `solution` | STRING | No | Solution name (denormalized) |
| `role` | STRING | No | Role in solution (Primary SME, Secondary SME, Survey Submitter, etc.) |
| `survey_year` | INTEGER | No | Year of survey participation (2016-2024) |
| `need_id` | STRING | No | Linked need identifier |
| `notes` | STRING | No | Free-form notes |
| `last_updated` | DATE | Yes | Last update timestamp |
| | | | |
| **Internal Team Columns** | | | |
| `is_internal` | STRING | No | 'Y' = MO team member, blank = external stakeholder |
| `internal_title` | STRING | No | Internal role title (e.g., "Solution Lead", "RA Representative") |
| `internal_team` | STRING | No | Team assignment (e.g., "Implementation", "SEP", "Comms") |
| `supervisor` | STRING | No | Supervisor name (for org chart) |
| `start_date` | DATE | No | When joined the MO team |
| `active` | STRING | No | 'Y' = current team member, 'N' = former |

**Indexes:**
- Primary: `contact_id`
- Secondary: `email`, `solution`, `role`, `department`, `survey_year`, `is_internal`

**Data Source:** Extracted from 47 stakeholder Excel files in `DB-Solution Stakeholder Lists/`

**Example (External Stakeholder):**
```json
{
  "contact_id": "CON_001",
  "first_name": "Lee",
  "last_name": "Spaulding",
  "email": "lee.spaulding@example.gov",
  "primary_email": "lee.spaulding@example.gov",
  "phone": "555-123-4567",
  "department": "Department of the Interior",
  "agency": "USGS",
  "organization": "",
  "solution": "HLS",
  "role": "Primary SME",
  "survey_year": 2022,
  "need_id": "",
  "notes": "",
  "last_updated": "2026-01-15",
  "is_internal": "",
  "internal_title": "",
  "internal_team": "",
  "supervisor": "",
  "start_date": "",
  "active": ""
}
```

**Example (Internal Team Member):**
```json
{
  "contact_id": "CON_500",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@nasa.gov",
  "primary_email": "jane.smith@nasa.gov",
  "phone": "555-987-6543",
  "department": "NASA",
  "agency": "GSFC",
  "organization": "NSITE MO",
  "solution": "OPERA",
  "role": "Solution Lead",
  "survey_year": "",
  "need_id": "",
  "notes": "Manages OPERA solution lifecycle",
  "last_updated": "2026-01-17",
  "is_internal": "Y",
  "internal_title": "Solution Lead",
  "internal_team": "Implementation",
  "supervisor": "John Manager",
  "start_date": "2024-06-01",
  "active": "Y"
}
```

---

### 3. STAKEHOLDERS (Planned - SEP-NSITE)

Future table for SEP-NSITE viewer. Will track stakeholder engagement across the touchpoint pipeline.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `stakeholder_id` | STRING | Yes | Primary key (e.g., "STK_001") |
| `name` | STRING | Yes | Stakeholder name or group name |
| `organization` | STRING | Yes | Organization/institution |
| `type` | STRING | Yes | Stakeholder type (see StakeholderType enum) |
| `region` | STRING | No | Geographic region |
| `touchpoint_status` | STRING | No | Current touchpoint (see Touchpoint enum) |
| `needs` | STRING[] | No | Array of identified needs |
| `barriers` | STRING[] | No | Array of identified barriers |
| `workflow` | STRING | No | Workflow description |
| `decision_context` | STRING | No | Decision-making context |
| `notes` | STRING | No | Free-form notes |
| `email` | STRING | No | Contact email |
| `last_contact` | DATE | No | Date of last contact |
| `next_communication` | DATE | No | Next scheduled communication |
| `source_doc` | STRING | No | Source document type |
| `last_updated` | DATE | Yes | Last update timestamp |
| `created_at` | DATE | Yes | Record creation timestamp |

**Indexes:**
- Primary: `stakeholder_id`
- Secondary: `type`, `organization`, `touchpoint_status`

**Example:**
```json
{
  "stakeholder_id": "STK_001",
  "name": "Example Agency Science Team",
  "organization": "Example Agency",
  "type": "Assessment",
  "region": "North America",
  "touchpoint_status": "T7",
  "needs": ["Faster data delivery", "Training resources"],
  "barriers": ["Limited bandwidth", "Staff availability"],
  "workflow": "Uses EO data weekly for regional planning",
  "decision_context": "Supports state-level environmental decisions",
  "notes": "Met during assessment interviews. Very engaged.",
  "email": "contact@example.gov",
  "last_contact": "2026-01-10",
  "next_communication": "2026-02-15",
  "source_doc": "sep",
  "last_updated": "2026-01-14",
  "created_at": "2025-06-01"
}
```

---

### 4. STORIES

Primary table for Comms-Viewer. Tracks communications pipeline from idea to publication.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `story_id` | STRING | Yes | Primary key (e.g., "STORY_001") |
| `title` | STRING | Yes | Story title/headline |
| `solution_id` | STRING | No | Foreign key to SOLUTIONS |
| `status` | STRING | Yes | Pipeline status (see StoryStatus enum) |
| `channel` | STRING | No | Target channel (see Channel enum) |
| `priority` | STRING | No | Priority level (high, medium, low) |
| `admin_priority` | STRING | No | NASA admin priority alignment |
| `description` | STRING | No | Story description/summary |
| `key_message` | STRING | No | Key message to communicate |
| `target_audience` | STRING | No | Intended audience |
| `scheduled_date` | DATE | No | Target publication date |
| `published_date` | DATE | No | Actual publication date |
| `url` | STRING | No | Published URL |
| `author` | STRING | No | Story author |
| `source_doc` | STRING | No | Source document type |
| `last_updated` | DATE | Yes | Last update timestamp |
| `created_at` | DATE | Yes | Record creation timestamp |

**Indexes:**
- Primary: `story_id`
- Secondary: `solution_id`, `status`, `channel`

**Example:**
```json
{
  "story_id": "STORY_001",
  "title": "HLS Enables Global Agriculture Monitoring",
  "solution_id": "SOL_HLS",
  "status": "draft",
  "channel": "web",
  "priority": "high",
  "admin_priority": "Climate",
  "description": "Feature story on HLS impact for agricultural stakeholders",
  "key_message": "Free, open data enables global food security monitoring",
  "target_audience": "Agricultural researchers, policy makers",
  "scheduled_date": "2026-03-15",
  "published_date": null,
  "url": null,
  "author": "Comms Team",
  "source_doc": "comms",
  "last_updated": "2026-01-14",
  "created_at": "2026-01-10"
}
```

---

### 5. MILESTONES

Tracks date-based milestones for solutions. Linked to SOLUTIONS table.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `milestone_id` | STRING | Yes | Primary key (e.g., "MS_HLS_F2I") |
| `solution_id` | STRING | Yes | Foreign key to SOLUTIONS |
| `type` | STRING | Yes | Milestone type (see MilestoneType enum) |
| `target_date` | DATE | No | Planned date |
| `actual_date` | DATE | No | Actual completion date |
| `status` | STRING | Yes | Status (planned, completed, delayed) |
| `notes` | STRING | No | Additional notes |
| `source_tab` | STRING | No | Source document tab |
| `last_updated` | DATE | Yes | Last update timestamp |

**Indexes:**
- Primary: `milestone_id`
- Secondary: `solution_id`, `type`, `status`

**Example:**
```json
{
  "milestone_id": "MS_HLS_F2I",
  "solution_id": "SOL_HLS",
  "type": "F2I",
  "target_date": "2025-01-15",
  "actual_date": "2025-01-15",
  "status": "completed",
  "notes": "Passed F2I Decision Gate",
  "source_tab": "01_13",
  "last_updated": "2026-01-14"
}
```

---

### 6. ACTIONS

Tracks action items from all source documents.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `action_id` | STRING | Yes | Primary key (e.g., "ACT_001") |
| `description` | STRING | Yes | Action item description |
| `solution_id` | STRING | No | Foreign key to SOLUTIONS (if solution-related) |
| `owner` | STRING | No | Person responsible |
| `status` | STRING | Yes | Status (open, in_progress, closed) |
| `priority` | STRING | No | Priority (high, medium, low) |
| `due_date` | DATE | No | Due date |
| `completed_date` | DATE | No | Completion date |
| `source` | STRING | Yes | Source type (internal, sep, comms) |
| `source_tab` | STRING | No | Source document tab |
| `last_updated` | DATE | Yes | Last update timestamp |
| `created_at` | DATE | Yes | Record creation timestamp |

**Indexes:**
- Primary: `action_id`
- Secondary: `solution_id`, `owner`, `status`, `source`

**Example:**
```json
{
  "action_id": "ACT_001",
  "description": "Schedule HLS deep dive for Q2",
  "solution_id": "SOL_HLS",
  "owner": "John Smith",
  "status": "open",
  "priority": "medium",
  "due_date": "2026-02-28",
  "completed_date": null,
  "source": "internal",
  "source_tab": "01_13",
  "last_updated": "2026-01-14",
  "created_at": "2026-01-13"
}
```

---

### 7. UPDATE_HISTORY

Audit log of all updates to any entity.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `history_id` | STRING | Yes | Primary key (auto-generated UUID) |
| `entity_type` | STRING | Yes | Type of entity (solution, stakeholder, story, action) |
| `entity_id` | STRING | Yes | ID of the entity updated |
| `update_type` | STRING | No | Type of update (milestone, action, general) |
| `update_text` | STRING | Yes | The update content |
| `source_doc` | STRING | Yes | Source document type |
| `source_tab` | STRING | No | Source document tab |
| `user_email` | STRING | No | User who submitted (if via Quick Update) |
| `timestamp` | DATETIME | Yes | When the update occurred |

**Indexes:**
- Primary: `history_id`
- Secondary: `entity_type` + `entity_id`, `timestamp`

**Example:**
```json
{
  "history_id": "uuid-12345",
  "entity_type": "solution",
  "entity_id": "SOL_HLS",
  "update_type": "milestone",
  "update_text": "F2I Decision Gate passed successfully",
  "source_doc": "internal",
  "source_tab": "01_13",
  "user_email": "user@nasa.gov",
  "timestamp": "2026-01-14T10:30:00Z"
}
```

---

### 8. SOLUTION_STAKEHOLDERS (Junction Table - Planned)

Many-to-many relationship between solutions and stakeholders.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `solution_id` | STRING | Yes | Foreign key to SOLUTIONS |
| `stakeholder_id` | STRING | Yes | Foreign key to STAKEHOLDERS |
| `relationship_type` | STRING | No | Type of relationship (primary, secondary, advisory) |
| `created_at` | DATE | Yes | When relationship was established |

**Primary Key:** Composite (`solution_id`, `stakeholder_id`)

**Example:**
```json
{
  "solution_id": "SOL_HLS",
  "stakeholder_id": "STK_001",
  "relationship_type": "primary",
  "created_at": "2025-06-01"
}
```

---

### 9. AVAILABILITY (MO-DB_Availability)

**Status: ACTIVE** - Team Viewer

Tracks team member availability, office closures, and travel schedules.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `availability_id` | STRING | Yes | Primary key (e.g., "AVAIL_0001") |
| `contact_id` | STRING | No | Foreign key to CONTACTS (blank for office-wide events) |
| `contact_name` | STRING | No | Display name (denormalized for performance) |
| `type` | STRING | Yes | Type (see AvailabilityType enum) |
| `start_date` | DATE | Yes | Start date (YYYY-MM-DD) |
| `end_date` | DATE | Yes | End date (YYYY-MM-DD) |
| `recurrence` | STRING | No | Recurrence pattern (see RecurrenceType enum) |
| `holiday_name` | STRING | No | Name of holiday (for type=holiday) |
| `partners` | STRING | No | Comma-separated list of affected partners (NASA, UAH, DevSeed) |
| `location` | STRING | No | Location (e.g., "AGU Conference", "HQ") |
| `notes` | STRING | No | Additional notes |
| `created_at` | DATE | Yes | Record creation timestamp |

**Indexes:**
- Primary: `availability_id`
- Secondary: `contact_id`, `type`, `start_date`

**Example (Personal):**
```json
{
  "availability_id": "AVAIL_0001",
  "contact_id": "CON_500",
  "contact_name": "Jane Smith",
  "type": "vacation",
  "start_date": "2026-02-15",
  "end_date": "2026-02-22",
  "recurrence": "none",
  "holiday_name": "",
  "partners": "",
  "location": "",
  "notes": "Annual leave",
  "created_at": "2026-01-18"
}
```

**Example (Holiday):**
```json
{
  "availability_id": "AVAIL_0010",
  "contact_id": "",
  "contact_name": "",
  "type": "holiday",
  "start_date": "2026-05-25",
  "end_date": "2026-05-25",
  "recurrence": "annually",
  "holiday_name": "Memorial Day",
  "partners": "NASA, UAH",
  "location": "",
  "notes": "",
  "created_at": "2026-01-18"
}
```

---

### 10. MEETINGS (MO-DB_Meetings)

**Status: ACTIVE** - Team Viewer

Tracks recurring and ad-hoc meetings for the MO team.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `meeting_id` | STRING | Yes | Primary key (e.g., "MTG_0001") |
| `name` | STRING | Yes | Meeting name |
| `category` | STRING | Yes | Category (see MeetingCategory enum) |
| `type` | STRING | Yes | Type (see MeetingType enum) |
| `cadence` | STRING | No | Frequency (Weekly, Bi-Weekly, Monthly, etc.) |
| `day_of_week` | STRING | No | Day (Monday, Tuesday, etc.) |
| `time` | STRING | No | Time (e.g., "2:00 PM ET") |
| `duration_minutes` | INTEGER | No | Duration in minutes (default: 60) |
| `purpose` | STRING | No | Meeting purpose/description |
| `online_link` | STRING | No | Video conference URL |
| `drive_folder_url` | STRING | No | Google Drive folder URL |
| `agenda_url` | STRING | No | Agenda document URL |
| `notes_url` | STRING | No | Notes document URL |
| `slides_url` | STRING | No | Slides document URL |
| `recording_url` | STRING | No | Recording URL |
| `is_active` | BOOLEAN | Yes | Whether meeting is currently active |
| `created_at` | DATE | Yes | Record creation timestamp |

**Indexes:**
- Primary: `meeting_id`
- Secondary: `category`, `day_of_week`, `is_active`

**Example:**
```json
{
  "meeting_id": "MTG_0001",
  "name": "MO Weekly Sync",
  "category": "MO",
  "type": "Status/Sync",
  "cadence": "Weekly",
  "day_of_week": "Monday",
  "time": "10:00 AM ET",
  "duration_minutes": 60,
  "purpose": "Weekly team sync to discuss priorities and blockers",
  "online_link": "https://meet.google.com/xxx-xxx-xxx",
  "drive_folder_url": "https://drive.google.com/drive/folders/xxx",
  "agenda_url": "https://docs.google.com/document/d/xxx",
  "notes_url": "",
  "slides_url": "",
  "recording_url": "",
  "is_active": true,
  "created_at": "2026-01-18"
}
```

---

### 11. GLOSSARY (MO-DB_Glossary)

**Status: ACTIVE** - Team Viewer / Shared Resource

Glossary of terms, acronyms, and definitions used across NSITE MO.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `term_id` | STRING | Yes | Primary key (e.g., "TERM_0001") |
| `term` | STRING | Yes | Term or acronym |
| `definition` | STRING | Yes | Definition/explanation |
| `category` | STRING | No | Category (e.g., "Technical", "Process", "Organization") |
| `related_terms` | STRING | No | Pipe-delimited related terms |
| `source` | STRING | No | Source of definition |
| `created_at` | DATE | Yes | Record creation timestamp |

**Indexes:**
- Primary: `term_id`
- Secondary: `term`, `category`

**Example:**
```json
{
  "term_id": "TERM_0001",
  "term": "SNWG",
  "definition": "Satellite Needs Working Group - An interagency working group that identifies and prioritizes satellite data needs across federal agencies.",
  "category": "Organization",
  "related_terms": "NSITE|MO|Assessment",
  "source": "SNWG Charter",
  "created_at": "2026-01-18"
}
```

---

### 12. CONFIG (MO-DB_Config)

**Status: ACTIVE** - System Configuration

Central configuration store for all document IDs, sheet IDs, and system settings.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `key` | STRING | Yes | Configuration key name |
| `value` | STRING | Yes | Configuration value (typically a Google ID or URL) |
| `description` | STRING | No | Human-readable description |
| `category` | STRING | No | Category for grouping |

**Key Categories:**

| Category | Keys |
|----------|------|
| **Database Sheets** | SOLUTIONS_SHEET_ID, CONTACTS_SHEET_ID, NEEDS_SHEET_ID, AGENCIES_SHEET_ID, ENGAGEMENTS_SHEET_ID, UPDATES_SHEET_ID, ACTIONS_SHEET_ID, STORIES_SHEET_ID, OUTREACH_SHEET_ID |
| **Team Sheets** | AVAILABILITY_SHEET_ID, MEETINGS_SHEET_ID, GLOSSARY_SHEET_ID |
| **Source Documents** | INTERNAL_AGENDA_ID, SEP_AGENDA_ID, OPERA_MONTHLY_ID, PBL_MONTHLY_ID |
| **Folders** | MONTHLY_FOLDER_ID |
| **Directing Documents** | MO_PROJECT_PLAN_DOC_ID, HQ_PROJECT_PLAN_DOC_ID, SEP_PLAN_DOC_ID, SEP_BLUEPRINT_DOC_ID, COMMS_PLAN_DOC_ID, STYLE_GUIDE_DOC_ID, ASSESSEMENT_PROCESS_DOC_ID, ASSESSEMENT_CHEATSHEET_DOC_ID, MO_RISK_REGISTER_DOC_ID, INFO_MANAGEMENT_PLAN_DOC_ID, etc. |
| **System** | API_LIBRARY_ID, ACCESS_FILE_ID |

**Example:**
```
| key                    | value                              | description                |
|------------------------|------------------------------------|-----------------------------|
| SOLUTIONS_SHEET_ID     | 1abc...xyz                         | MO-DB_Solutions sheet ID   |
| INTERNAL_AGENDA_ID     | 1def...uvw                         | Internal Planning agenda   |
| MO_PROJECT_PLAN_DOC_ID | 1ghi...rst                         | MO Project Plan document   |
```

---

## Enumerations

### Phase
```
Preformulation | Formulation | Implementation | Operations | Closeout
```

### Ownership
```
SEP-Directed | Project-Led | SPoRT-Directed
```

### StakeholderType
```
Assessment | SME | Partner | Internal | Advisory | Collaborator
```

### Touchpoint
```
T1 | T2 | T3 | T4 | W1 | W2 | T5 | T6 | T7 | T8
```

Touchpoint definitions:
| Code | Name | Description |
|------|------|-------------|
| T1 | Initial Outreach | First contact with stakeholder |
| T2 | Needs Assessment | Formal needs assessment |
| T3 | Requirements Review | Review of requirements |
| T4 | Invitation to CoDesign | Invite to CoDesign process |
| W1 | CoDesign 101 | CoDesign introductory workshop |
| W2 | SEP CoDesign Strategy | Strategy workshop |
| T5 | Design Review | Review of design |
| T6 | Beta Testing | Beta test participation |
| T7 | Soft Launch & Training | Training and soft launch |
| T8 | Closeout Stories | Final success stories |

### StoryStatus
```
idea | draft | reviewed | submitted | published | archived
```

### Channel
```
web | social | newsletter | webinar | conference | press | slides
```

### MilestoneType
```
IPA | ICD | ATP | F2I | ORR | OPS | Closeout | Custom
```

Milestone definitions:
| Code | Name | Description |
|------|------|-------------|
| IPA | Interface Plan Agreement | Initial planning agreement |
| ICD | Interface Control Document | Technical interface documentation |
| ATP | Authority to Proceed | Approval to proceed |
| F2I | Formulation to Implementation | Transition decision gate |
| ORR | Operational Readiness Review | Operations readiness |
| OPS | Operations Start | Begin operations |
| Closeout | Project Closeout | Project completion |

### ActionStatus
```
open | in_progress | closed | blocked
```

### AvailabilityType
```
vacation | work_travel | ooo | 9_80 | holiday | special_event
```

| Code | Description |
|------|-------------|
| vacation | Personal vacation/leave |
| work_travel | Work-related travel |
| ooo | Out of Office (other reasons) |
| 9_80 | 9/80 schedule day off |
| holiday | Office-wide holiday |
| special_event | Office-wide special event |

### RecurrenceType
```
none | weekly | biweekly | monthly | annually
```

### MeetingCategory
```
MO | Assessment | SEP | Comms | Implementation | Operations | Ad Hoc
```

### MeetingType
```
Planning | Working | Brainstorm | Status/Sync | Review | Training
```

---

## Google Sheets Implementation

### Sheet Structure

Each table maps to a separate sheet within the database spreadsheet:

```
MO-Viewer Database (Google Spreadsheet)
├── Solutions        (sheet)
├── Stakeholders     (sheet)
├── Stories          (sheet)
├── Milestones       (sheet)
├── Actions          (sheet)
├── UpdateHistory    (sheet)
├── SolutionStakeholders (sheet)
└── _Config          (sheet - metadata)
```

### Column Naming Convention

- Use camelCase for column headers: `solutionId`, `lastUpdated`
- First row is header row
- Data starts at row 2

### Array Fields

For array fields (like `needs`, `barriers`), use pipe-delimited strings:

```
"Faster data delivery|Training resources|Better documentation"
```

Parse with:
```javascript
var needs = row.needs.split('|').map(s => s.trim());
```

---

## Data Sources

### Source Documents Overview

| Source | Type | Sync Script | Target Table | Frequency |
|--------|------|-------------|--------------|-----------|
| Internal Planning Agenda | Google Doc | `sync-updates-to-db.gs` | MO-DB_Updates | Weekly (manual) |
| SEP Strategy Agenda | Google Doc | `sync-updates-to-db.gs` | MO-DB_Updates | Weekly (manual) |
| OPERA Monthly Agenda | Google Doc | `sync-updates-to-db.gs` | MO-DB_Updates | Monthly (manual) |
| PBL Monthly Agenda | Google Doc | `sync-updates-to-db.gs` | MO-DB_Updates | Monthly (manual) |
| Monthly Meeting Presentations | Google Slides | `sync-monthly-presentations.gs` | MO-DB_Updates | Monthly (manual) |

### Monthly Meeting Presentations

**Location:** `MONTHLY_FOLDER_ID` (with FY subfolders for historical data)

**Format:** Google Slides - one presentation per month (e.g., "2026-01 NSITE Monthly Meeting...")

**Structure:**
- Title slide with meeting date
- Agenda slide listing solutions by cycle
- HQ/MO update slides
- Cycle divider slides ("Cycle 1 (2016)", etc.)
- Solution slides with standardized sections

**Solution Slide Structure:**
```
┌────────────────────────────────────────────────────────────┐
│ [Vertical: Solution Name]  │  Project Status               │
│ [Vertical: Speaker Name]   │  -------------------------    │
│                            │  What have I done to ensure   │
│                            │  right fit / intended impact? │
│                            │  -------------------------    │
│                            │  The SNWG MO can help me...   │
│                            │  -------------------------    │
│                            │  Programmatic milestones...   │
│                            │  -------------------------    │
│                            │  Development milestones...    │
│                            │                               │
│                            │  Update as of: [DATE]         │
└────────────────────────────────────────────────────────────┘
```

**Solution Identification:**

**For new presentations** - use speaker notes (preferred):

Each solution slide should have `solution_id` in the speaker notes:
```
solution_id: HLS
```

For multi-solution slides (e.g., ESDIS):
```
solution_ids: DSWx, DIST, DISP
```

The sync script extracts solution IDs from speaker notes using pattern matching. Other content in speaker notes is ignored.

**For historical presentations** - automatic name mapping:

When speaker notes don't contain `solution_id`, the script falls back to matching solution names found in the slide content against `SOLUTION_NAME_MAP`. This includes:
- Short names: HLS, OPERA, DSWx, DIST, VLM, etc.
- Full names: "Harmonized Landsat Sentinel-2", "Vertical Land Motion", etc.
- Common variations: "OPERA DSWx", "NISAR Downlink", etc.

Run `testExtractAllSolutionIds()` to see which slides match via speaker notes vs. name mapping.

**Update Categories:**

Content is categorized based on slide section:

| Category | Trigger Keywords |
|----------|------------------|
| `programmatic` | "programmatic", "project timeline", "milestone" |
| `development` | "software", "hardware", "location", "product development" |
| `engagement` | "ensure", "right fit", "end users", "intended impact" |
| `roadblock` | "help me with", "roadblock", "challenge" |
| `general` | Default for uncategorized content |

**Sync Functions:**
- `syncLatestMonthlyPresentation()` - Sync most recent presentation
- `syncAllMonthlyPresentations()` - Historical backfill (all FYs)
- `syncPresentationById(id)` - Sync specific presentation

---

## Data Sync Patterns

### Full Sync

Rebuild entire table from source documents:

```javascript
function fullSync() {
  clearTable('Solutions');
  var data = parseAllInternalAgendaTabs();
  writeToTable('Solutions', data);
}
```

### Incremental Sync

Only process tabs newer than last sync:

```javascript
function incrementalSync() {
  var lastSync = getLastSyncTimestamp();
  var newTabs = getTabsAfterDate(lastSync);
  for (var tab of newTabs) {
    var data = parseTab(tab);
    upsertToTable('Solutions', data);
  }
  setLastSyncTimestamp(new Date());
}
```

### Upsert Logic

Update existing records or insert new:

```javascript
function upsert(table, record, keyField) {
  var existing = findByKey(table, record[keyField]);
  if (existing) {
    updateRecord(table, existing.row, record);
  } else {
    appendRecord(table, record);
  }
}
```

---

## Query Patterns

### By Solution

```javascript
function getSolutionsByCycle(cycle) {
  return queryTable('Solutions', { cycle: cycle });
}

function getSolutionsByPhase(phase) {
  return queryTable('Solutions', { phase: phase });
}
```

### By Stakeholder

```javascript
function getStakeholdersByTouchpoint(touchpoint) {
  return queryTable('Stakeholders', { touchpoint_status: touchpoint });
}

function getStakeholdersForSolution(solutionId) {
  var links = queryTable('SolutionStakeholders', { solution_id: solutionId });
  return links.map(link => getStakeholder(link.stakeholder_id));
}
```

### By Story

```javascript
function getStoriesByStatus(status) {
  return queryTable('Stories', { status: status });
}

function getStoriesForSolution(solutionId) {
  return queryTable('Stories', { solution_id: solutionId });
}
```

### Cross-Entity Queries

```javascript
function getSolutionsWithoutStories() {
  var solutions = getAllSolutions();
  var storySolutionIds = getUniqueValues('Stories', 'solution_id');
  return solutions.filter(s => !storySolutionIds.includes(s.solution_id));
}
```

---

## Validation Rules

### Required Fields

| Table | Required Fields |
|-------|-----------------|
| Solutions | solution_id, name, cycle, phase, last_updated, created_at |
| Stakeholders | stakeholder_id, name, organization, type, last_updated, created_at |
| Stories | story_id, title, status, last_updated, created_at |
| Milestones | milestone_id, solution_id, type, status, last_updated |
| Actions | action_id, description, status, source, last_updated, created_at |

### Foreign Key Validation

```javascript
function validateForeignKeys(record, table) {
  if (table === 'Stories' && record.solution_id) {
    if (!solutionExists(record.solution_id)) {
      throw new Error('Invalid solution_id: ' + record.solution_id);
    }
  }
  // ... similar for other FKs
}
```

### Enum Validation

```javascript
function validateEnums(record, table) {
  if (table === 'Solutions') {
    if (!VALID_PHASES.includes(record.phase)) {
      throw new Error('Invalid phase: ' + record.phase);
    }
    if (record.cycle && !VALID_CYCLES.includes(record.cycle)) {
      throw new Error('Invalid cycle: ' + record.cycle);
    }
  }
  // ... similar for other enums
}
```

---

## Migration Notes

### From SolutionFlow

The original SolutionFlow schema maps to this unified schema:

| SolutionFlow Field | Unified Schema Location |
|--------------------|-------------------------|
| `solutions[].name` | Solutions.name |
| `solutions[].cycle` | Solutions.cycle |
| `solutions[].provider` | Solutions.provider |
| `solutions[].status` | Solutions.status_text |
| `solutions[].actions[]` | Actions table (separate records) |
| `solutions[].rawBullets[]` | UpdateHistory table |

### From SEPViewer

| SEPViewer Field | Unified Schema Location |
|-----------------|-------------------------|
| `stakeholders[].name` | Stakeholders.name |
| `stakeholders[].type` | Stakeholders.type |
| `stakeholders[].needs[]` | Stakeholders.needs (array) |
| `stakeholders[].touchpoints` | Stakeholders.touchpoint_status |

---

## Appendix: Sample Data

### Solutions Sample

| solution_id | name | cycle | phase | provider | ownership |
|-------------|------|-------|-------|----------|-----------|
| SOL_HLS | HLS | C1 | Operations | MSFC | SEP-Directed |
| SOL_OPERA | OPERA | C2 | Operations | JPL | Project-Led |
| SOL_NISAR_DL | NISAR DL | C1 | Implementation | JPL | SEP-Directed |
| SOL_VLM | VLM | C4 | Formulation | GSFC | SEP-Directed |
| SOL_LST | LST | C5 | Preformulation | JPL | SEP-Directed |

### Milestones Sample

| milestone_id | solution_id | type | target_date | status |
|--------------|-------------|------|-------------|--------|
| MS_HLS_IPA | SOL_HLS | IPA | 2024-03-15 | completed |
| MS_HLS_F2I | SOL_HLS | F2I | 2025-01-15 | completed |
| MS_VLM_ATP | SOL_VLM | ATP | 2026-06-01 | planned |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-01-18 | Added Team Viewer tables: AVAILABILITY, MEETINGS, GLOSSARY, CONFIG. Added new enumerations for availability and meeting types. |
| 1.0.1 | 2026-01-17 | Added Data Sources section with Monthly Meeting Presentations sync documentation |
| 1.0.0 | 2026-01-14 | Initial schema definition |
