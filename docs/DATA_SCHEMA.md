# MO-Viewer Data Schema

**Version:** 3.0.0
**Date:** 2026-02-06
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

### Standardized Lookup IDs

These are the cross-database foreign keys used throughout the system. Each database maintains a `_Lookups` tab with validated values from the source database.

| Lookup ID | Source Database | Format | Example |
|-----------|----------------|--------|---------|
| `solution_id` | MO-DB_Solutions | `solution_id` value | `hls`, `opera_dswx` |
| `contact_id` | MO-DB_Contacts (People tab) | `CON_` + first5 + last3 | `CON_leespa` |
| `agency_id` | MO-DB_Agencies | Agency key | `usgs`, `noaa_nws` |
| `need_id` | MO-DB_Needs | Need key | *(format TBD)* |

Not every database uses all four lookups, but these are the standardized IDs that will be referenced across the platform.

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

### 1. SOLUTIONS (MO-DB_Solutions)

**Status: ACTIVE** - 48 rows, 69 columns (Schema v2)

Primary table for Implementation-Viewer. Tracks all NSITE MO solutions across lifecycle phases.

**Schema v2** uses semantic prefixes for organization:

#### core_ - Identity (6 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `solution_id` | STRING | Yes | Primary key (e.g., "hls", "opera") |
| `core_official_name` | STRING | Yes | Full official name (e.g., "Harmonized Landsat Sentinel-2") |
| `core_alternate_names` | STRING | No | Pipe-delimited alternate names including colloquial (e.g., "HLS \| harmonized landsat") |
| `core_group` | STRING | No | Solution group for categorization |
| `core_cycle` | STRING | Yes | Assessment cycle (C1, C2, C3, C4, C5, C6) |
| `core_cycle_year` | INTEGER | No | Year of cycle (e.g., 2016, 2024) |
| `core_application_sectors` | STRING | No | Comma-separated application sectors. Used by sector analysis functions. May not be populated in all instances. |

#### funding_ - Funding Fields (3 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `funding_status` | STRING | Yes | Funding status (Funded, Unfunded, Pending) |
| `funding_period` | STRING | No | Funding period description |
| `funding_type` | STRING | No | Funding type (ISON, etc.) |

#### admin_ - Administrative (7 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `admin_lifecycle_phase` | STRING | Yes | Phase (Preformulation, Formulation, Implementation, Operations, Closeout) |
| `admin_default_in_dashboard` | BOOLEAN | No | Show in default selection (Y/N) |
| `sep_active` | BOOLEAN | No | Solution is active in SEP pipeline (TRUE/FALSE) |
| `admin_row_last_updated` | DATE | Yes | Last update timestamp |
| `admin_drive_folder` | STRING | No | Google Drive folder URL |
| `admin_shared_team_folder` | STRING | No | Google Drive folder URL for implementation team file sharing |
| `admin_solution_notes` | STRING | No | Internal notes |
| `admin_additional_resources` | STRING | No | Additional resource links |

#### Team Contact FKs (7 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `lead_contact_id` | STRING | No | FK to MO-DB_Contacts (solution lead) |
| `lead_agency_id` | STRING | No | FK to MO-DB_Agencies (lead's organization) |
| `scientist_contact_id` | STRING | No | FK to MO-DB_Contacts (project scientist) |
| `scientist_agency_id` | STRING | No | FK to MO-DB_Agencies (scientist's organization) |
| `ra_rep_contact_id` | STRING | No | FK to MO-DB_Contacts (RA representative) |
| `ra_rep_agency_id` | STRING | No | FK to MO-DB_Agencies (RA rep's organization) |
| `ea_advocate_contact_id` | STRING | No | FK to MO-DB_Contacts (Earth Action advocate) |
| `ea_advocate_agency_id` | STRING | No | FK to MO-DB_Agencies (EA advocate's organization) |
| `team_stakeholder_list_url` | STRING | No | URL to stakeholder list spreadsheet |

**Resolved fields** (added by `enrichSolutionTeamNames_()` at API level, not stored in sheet):
- `lead_name`, `scientist_name`, `ra_rep_name`, `ea_advocate_name` — from contact_id → Contacts
- `lead_agency_name`, `scientist_agency_name`, `ra_rep_agency_name`, `ea_advocate_agency_name` — from agency_id → Agencies

#### earthdata_ - Earthdata.nasa.gov Content (6 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `earthdata_purpose` | STRING | No | Purpose/mission from earthdata page |
| `earthdata_background` | STRING | No | Background description |
| `earthdata_societal_impact` | STRING | No | Societal impact statement |
| `earthdata_status_summary` | STRING | No | Current status summary |
| `earthdata_solution_page_url` | STRING | No | URL to earthdata.nasa.gov solution page |
| `earthdata_last_sync` | DATE | No | Last sync timestamp from earthdata |

#### comms_ - Communications Fields (7 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `comms_key_messages` | STRING | No | Core messaging points |
| `comms_focus_type` | STRING | No | Primary focus area (Climate, Disasters, etc.) |
| `comms_thematic_areas` | STRING | No | Thematic areas covered |
| `comms_industry` | STRING | No | Industry connections |
| `comms_science` | STRING | No | Scientific advancement contributions |
| `comms_agency_impact` | STRING | No | Agency use and impact |
| `comms_public_links` | STRING | No | Links to public communications |

#### product_ - Technical Specifications (9 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `product_platform` | STRING | No | Platform/sensor (e.g., "Landsat 8/9, Sentinel-2") |
| `product_temporal_freq` | STRING | No | Temporal frequency (e.g., "2-3 days") |
| `product_horiz_resolution` | STRING | No | Horizontal resolution (e.g., "30m") |
| `product_geo_domain` | STRING | No | Geographic domain (Global, CONUS, etc.) |
| `product_latency` | STRING | No | Data latency (e.g., "< 3 days") |
| `product_spectral_bands` | STRING | No | Spectral bands available |
| `product_vertical_resolution` | STRING | No | Vertical resolution (for 3D products) |
| `product_assigned_daac` | STRING | No | Assigned DAAC (LP DAAC, PO.DAAC, etc.) |
| `product_data_products` | STRING | No | URL to data products table |

#### alignment_ - Need Alignment Status (8 columns)
Tracks whether deviations between stakeholder needs and solution capabilities are acceptable.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `alignment_horiz_resolution` | STRING | No | Acceptable / Gap / N/A |
| `alignment_temporal_freq` | STRING | No | Acceptable / Gap / N/A |
| `alignment_geo_domain` | STRING | No | Acceptable / Gap / N/A |
| `alignment_latency` | STRING | No | Acceptable / Gap / N/A |
| `alignment_spectral_bands` | STRING | No | Acceptable / Gap / N/A |
| `alignment_vertical_resolution` | STRING | No | Acceptable / Gap / N/A |
| `alignment_notes` | STRING | No | Explanation for alignment decisions |
| `alignment_last_reviewed` | DATE | No | Date of last alignment review (YYYY-MM-DD) |

**Alignment Values:**
- **Acceptable** - Deviation exists but stakeholders accept it
- **Gap** - Deviation exists and needs addressing
- **N/A** - Characteristic doesn't apply to this solution (service solutions, admin entries)

#### milestone_ - Decision Gates (20 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `milestone_jpl_milestones` | BOOLEAN | No | Uses JPL milestone system |
| `milestone_atp_date` | DATE | No | ATP Decision Gate date |
| `milestone_atp_memo_date` | DATE | No | ATP memo signature date |
| `milestone_atp_presentation_url` | STRING | No | ATP presentation URL |
| `milestone_atp_memo_url` | STRING | No | ATP memo URL |
| `milestone_f2i_date` | DATE | No | F2I Decision Gate date |
| `milestone_f2i_memo_date` | DATE | No | F2I memo signature date |
| `milestone_f2i_presentation_url` | STRING | No | F2I presentation URL |
| `milestone_f2i_memo_url` | STRING | No | F2I memo URL |
| `milestone_orr_date` | DATE | No | ORR date |
| `milestone_orr_memo_date` | DATE | No | ORR memo signature date |
| `milestone_orr_presentation_url` | STRING | No | ORR presentation URL |
| `milestone_orr_memo_url` | STRING | No | ORR memo URL |
| `milestone_closeout_date` | DATE | No | Closeout date |
| `milestone_closeout_memo_date` | DATE | No | Closeout memo signature date |
| `milestone_closeout_presentation_url` | STRING | No | Closeout presentation URL |
| `milestone_closeout_memo_url` | STRING | No | Closeout memo URL |
| `milestone_deep_dive_date` | DATE | No | Deep dive date |
| `milestone_deep_dive_presentation_url` | STRING | No | Deep dive presentation URL |
| `milestone_deep_dive_url` | STRING | No | Deep dive URL |

#### docs_ - Key Documents (7 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `docs_project_plan` | STRING | No | Project Plan URL (status derived from presence) |
| `docs_science_sow` | STRING | No | Science SOW URL |
| `docs_ipa` | STRING | No | IPA URL |
| `docs_icd` | STRING | No | ICD URL |
| `docs_tta` | STRING | No | TTA URL |
| `docs_fact_sheet` | STRING | No | Fact sheet URL |
| `docs_risk_register` | STRING | No | Risk register URL |

**Indexes:**
- Primary: `solution_id`
- Secondary: `core_cycle`, `admin_lifecycle_phase`, `product_assigned_daac`

**Example:**
```json
{
  "solution_id": "hls",
  "core_official_name": "Harmonized Landsat Sentinel-2",
  "core_alternate_names": "HLS | harmonized landsat",
  "core_cycle": "C1",
  "core_cycle_year": 2016,
  "admin_lifecycle_phase": "Operations",
  "admin_default_in_dashboard": true,
  "product_assigned_daac": "LP DAAC",
  "milestone_atp_date": "2024-03-15",
  "milestone_f2i_date": "2024-09-01",
  "docs_project_plan": "https://drive.google.com/...",
  "admin_row_last_updated": "2026-01-22"
}
```

---

### 2. CONTACTS (MO-DB_Contacts)

**Status: POPULATED** - Multi-tab Google Sheet (v3.0)

Primary contact database for the Contacts Directory. Two-tab structure:
- **People tab** (~423 rows): One row per unique person (by email)
- **Roles tab** (~4,221 rows): One row per person-solution-role relationship

API functions use `loadPeople_()` for person-only queries (faster) or `loadContactsJoined_()` for backward-compatible joined data.

#### People Tab

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `contact_id` | STRING | Yes | PK: CON_ + first 5 chars of first_name + first 3 chars of last_name |
| `first_name` | STRING | No | First name (no middle initials or honorifics) |
| `last_name` | STRING | No | Last name (no suffixes like Ph.D., Jr.) |
| `email` | STRING | Yes | Email address(es), comma-separated if multiple. First value is primary. |
| `agency_id` | STRING | No | FK to MO-DB_Agencies (via _Lookups). Resolves to agency name, department, hierarchy. |
| `title` | STRING | No | Job title |
| `region` | STRING | No | Geographic region |
| | | | |
| **Engagement Tracking** | | | |
| `engagement_level` | STRING | No | Could benefit, Interested, Info & Feedback, Collaborate, CoOwners |
| `last_contact_date` | DATE | No | Date of last contact/interaction |
| `next_scheduled_contact` | DATE | No | Next scheduled contact date |
| | | | |
| **SNWG Champion** | | | |
| `champion_status` | STRING | No | Active, Prospective, Alumni, Inactive |
| `relationship_owner` | STRING | No | Email of MO team member (FK to internal contacts) |
| `champion_notes` | STRING | No | Free-form notes about champion relationship |
| | | | |
| **Internal Team** | | | |
| `is_internal` | STRING | No | 'Y' = MO team member, blank = external stakeholder |
| `internal_title` | STRING | No | Internal role title |
| `internal_team` | STRING | No | Team assignment (Implementation, SEP, Comms) |
| `supervisor` | STRING | No | Supervisor name |
| `start_date` | DATE | No | When joined the MO team |
| `active` | STRING | No | 'Y' = current, 'N' = former |
| | | | |
| **About Me** | | | |
| `education` | STRING | No | Educational background |
| `job_duties` | STRING | No | Job duties description |
| `professional_skills` | STRING | No | Professional skills |
| `non_work_skills` | STRING | No | Non-work skills and talents |
| `hobbies` | STRING | No | Hobbies and interests |
| `goals` | STRING | No | Personal/professional goals |
| `relax` | STRING | No | How they relax/unwind |
| `early_job` | STRING | No | First/early career job |
| | | | |
| `notes` | STRING | No | Relationship notes |
| `last_updated` | DATE | Yes | Last update timestamp |

**Dropped columns:** `phone` (removed in v3.0)

#### Roles Tab

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `role_id` | STRING | Yes | PK: ROLE_xxxxx (auto-generated) |
| `contact_id` | STRING | Yes | FK to People tab contact_id |
| `solution_id` | STRING | Yes | FK to MO-DB_Solutions.solution_id |
| `role` | STRING | No | Primary SME, Secondary SME, Survey Submitter, Stakeholder, etc. |
| `survey_year` | INTEGER | No | Year of survey participation (2016-2024) |
| `need_id` | STRING | No | Linked stakeholder need identifier |

**SNWG Champion Status Values:**
| Status | Description |
|--------|-------------|
| `Active` | Currently engaged champion actively supporting SNWG |
| `Prospective` | Potential champion being cultivated |
| `Alumni` | Former champion, still friendly, less active |
| `Inactive` | Champion relationship has gone dormant |

**Indexes:**
- People: Primary `contact_id`, Secondary `email`, `department`, `is_internal`, `champion_status`, `relationship_owner`
- Roles: Primary `role_id`, Secondary `contact_id`, `solution_id`, `role`, `survey_year`

**Data Source:** Extracted from 47 stakeholder Excel files, migrated via `scripts/migrate_contacts_split.py`

**Example (People tab):**
```json
{
  "contact_id": "CON_leespa",
  "first_name": "Lee",
  "last_name": "Spaulding",
  "email": "lee.spaulding@example.gov",
  "agency_id": "usgs",
  "engagement_level": "Collaborate",
  "champion_status": "Active",
  "last_updated": "2026-02-06"
}
```

**Example (Roles tab):**
```json
{
  "role_id": "ROLE_00001",
  "contact_id": "CON_leespa",
  "solution_id": "hls",
  "role": "Primary SME",
  "survey_year": 2022,
  "need_id": ""
}
```

**Example (Internal Team Member — People tab):**
```json
{
  "contact_id": "CON_janesmi",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@nasa.gov",
  "agency_id": "gsfc",
  "is_internal": "Y",
  "internal_title": "Solution Lead",
  "internal_team": "Implementation",
  "supervisor": "John Manager",
  "start_date": "2024-06-01",
  "active": "Y",
  "last_updated": "2026-02-06"
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

### 4. STORIES (MO-DB_Stories)

**Status: ACTIVE** - Communications pipeline and content tracking

Primary table for Comms-Viewer. Tracks communications pipeline from idea to publication, including Highlighter Blurbs for HQ reporting.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `story_id` | STRING | Yes | Primary key (e.g., "STY_001", "HLB_001") |
| `title` | STRING | Yes | Story title/headline |
| `solution_id` | STRING | No | Foreign key to SOLUTIONS (solution_id) |
| `content_type` | STRING | Yes | Content type (see ContentType enum) |
| `status` | STRING | Yes | Pipeline status (see StoryStatus enum) |
| `channel` | STRING | No | Target channel (see Channel enum) |
| `priority` | STRING | No | Priority level (high, medium, low) |
| `admin_priority` | STRING | No | NASA admin priority alignment |
| `description` | STRING | No | Story description/summary |
| `key_message` | STRING | No | Key message to communicate |
| `background_info` | STRING | No | Background context for Highlighter Blurbs (technical details, team, SNWG boilerplate) |
| `blurb_content` | STRING | No | Complete blurb text as submitted to HQ portal (Title + Description + Background) |
| `target_audience` | STRING | No | Intended audience |
| `target_date` | DATE | No | Target completion/submission date |
| `publish_date` | DATE | No | Actual publication date |
| `hq_submission_date` | DATE | No | Date submitted to HQ portal (Highlighter Blurbs) |
| `url` | STRING | No | Published URL |
| `author` | STRING | No | Story author |
| `notes` | STRING | No | Internal notes |
| `source_doc` | STRING | No | Source document type |
| `idea_date` | DATE | No | Date idea was captured |
| `created_date` | DATE | Yes | Record creation timestamp |
| `last_updated` | DATE | Yes | Last update timestamp |

**Content Types:**
| Type | ID Prefix | Description |
|------|-----------|-------------|
| `story` | STY | Impact story / feature article |
| `web_content` | WEB | Website content |
| `social_media` | SOC | Social media post |
| `external_mention` | EXT | External press/blog mention |
| `nugget` | NUG | Nugget slide |
| `key_date` | KEY | Key date/anniversary |
| `highlighter_blurb` | HLB | HQ Highlighter report blurb (weekly Tuesday deadline) |

**Indexes:**
- Primary: `story_id`
- Secondary: `solution_id`, `status`, `channel`

**Example:**
```json
{
  "story_id": "STORY_001",
  "title": "HLS Enables Global Agriculture Monitoring",
  "solution_id": "hls",
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
  "solution_id": "hls",
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
| `owner` | STRING | No | Person responsible (name) |
| `assigned_to_id` | STRING | No | Assigned contact_id (CON_xxx, falls back to name) |
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
  "solution_id": "hls",
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

### 7. ENGAGEMENTS (MO-DB_Engagements)

**Status: ACTIVE** - SEP Page / Stakeholder Engagement Tracking

Tracks all stakeholder interactions: emails, calls, meetings, webinars, conferences, site visits, and training sessions. Used for the SEP (Stakeholder Engagement Pipeline) dashboard.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `engagement_id` | STRING | Yes | Primary key (auto-generated, e.g., "ENG_1706000000000") |
| `date` | DATE | Yes | Date of the engagement (YYYY-MM-DD) |
| `activity_type` | STRING | Yes | Type of interaction (Email, Phone, Meeting, Webinar, Conference, Site Visit, Training) |
| `direction` | STRING | No | Direction of communication (Outbound, Inbound, Bidirectional) |
| `subject` | STRING | Yes | Brief subject line for the engagement |
| `participants` | STRING | No | Comma-separated list of participant emails |
| `contact_ids` | STRING | No | Comma-separated list of contact IDs |
| `agency_id` | STRING | No | Foreign key to MO-DB_Agencies |
| `solution_id` | STRING | Yes | Primary solution ID (foreign key to MO-DB_Solutions.solution_id) |
| `secondary_solution_id` | STRING | No | Secondary solution ID (optional) |
| `additional_solution_ids` | STRING | No | Comma-separated additional solution IDs (optional) |
| `summary` | STRING | No | Detailed summary of the engagement (max 2000 chars) |
| `touchpoint_reference` | STRING | No | SEP touchpoint reference (T4, W1, W2, T5, T6, T7, T8) |
| `follow_up_date` | DATE | No | Scheduled follow-up date (YYYY-MM-DD) |
| `related_engagement_ids` | STRING | No | Comma-separated engagement IDs for linked engagements |
| `supplementary_notes` | STRING | No | Additional context from other sources (max 2000 chars) |
| `logged_by` | STRING | No | Email of user who logged the engagement |
| `created_at` | DATETIME | Yes | Record creation timestamp |
| | | | |
| **Event Fields** | | | *(Presence of `event_date` indicates this engagement is an event)* |
| `event_date` | DATE | No | Event date (YYYY-MM-DD). Presence distinguishes events from regular engagements |
| `event_name` | STRING | No | Display name for the event (e.g., "HLS Workshop 2026") |
| `event_status` | STRING | No | Planning, Confirmed, Completed, Postponed, Cancelled |
| `event_location` | STRING | No | Physical or virtual location |
| `event_url` | STRING | No | Event page or registration URL |
| `event_owner` | STRING | No | FK to MO-DB_Contacts (team member leading the event) |
| `event_planning_doc_url` | STRING | No | Link to planning document |
| `event_attendee_ids` | STRING | No | Comma-separated contact IDs of attendees |
| `event_artifacts` | STRING | No | JSON array of artifacts (see structure below) |

**Indexes:**
- Primary: `engagement_id`
- Secondary: `date`, `solution_id`, `participants`, `agency_id`, `event_date`

**Event Status Values:**
| Status | Description |
|--------|-------------|
| `Planning` | Event is being planned |
| `Confirmed` | Event date/details confirmed |
| `Completed` | Event has occurred |
| `Postponed` | Event delayed to future date |
| `Cancelled` | Event cancelled |

**event_artifacts JSON Structure:**
```json
[
  {
    "type": "presentation|recording|notes|photos",
    "name": "Display name for the artifact",
    "url": "Link to the resource",
    "comms_asset_id": "CA-XXX"  // Optional - populated if promoted to CommsAssets
  }
]
```

**Event Detection:**
An engagement is treated as an event when `event_date` is present. This allows filtering events from regular engagements while keeping all data in one table.

**Engagement Linking:**
Engagements can reference other related engagements through the `related_engagement_ids` field. This enables:
- Tracking follow-up conversations
- Linking related discussions across different dates/contacts
- Building an engagement thread for complex stakeholder relationships

**Multi-Solution Support:**
Engagements can be tagged with multiple solutions:
- `solution_id` - Primary solution (required)
- `secondary_solution_id` - Secondary solution (optional)
- `additional_solution_ids` - Additional solutions as comma-separated list (optional)

When searching for engagements by solution (e.g., in the SEP dashboard), all three fields are searched.

**Example:**
```json
{
  "engagement_id": "ENG_1706000000000",
  "date": "2026-01-30",
  "activity_type": "Meeting",
  "direction": "Bidirectional",
  "subject": "HLS/OPERA Integration Planning",
  "participants": "john.doe@usgs.gov, jane.smith@noaa.gov",
  "contact_ids": "",
  "agency_id": "usgs",
  "solution_id": "hls",
  "secondary_solution_id": "opera",
  "additional_solution_ids": "",
  "summary": "Discussed cross-solution data integration opportunities between HLS and OPERA products.",
  "touchpoint_reference": "T5",
  "follow_up_date": "2026-02-15",
  "related_engagement_ids": "ENG_1705900000000",
  "supplementary_notes": "Team member mentioned USGS is also interested in NISAR products per hallway conversation.",
  "logged_by": "user@nasa.gov",
  "created_at": "2026-01-30T14:30:00Z"
}
```

---

### 8. OUTREACH / EVENTS (MO-DB_Outreach)

**Status: ACTIVE** - Events and outreach tracking

Single-tab event database for conferences, workshops, webinars, and other outreach activities.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `event_id` | STRING | Yes | Primary key, auto-generated (EVT_timestamp) |
| `name` | STRING | Yes | Event name |
| `event_type` | ENUM | Yes | Event category |
| `status` | ENUM | Yes | Event lifecycle status |
| `start_date` | DATE | No | Event start date |
| `end_date` | DATE | No | Event end date |
| `location` | STRING | No | Event location |
| `description` | STRING | No | Event description |
| `priority` | STRING | No | Priority level |
| `sector` | STRING | No | Priority sector |
| `solution_ids` | STRING | No | Comma-separated solution IDs |
| `guest_list` | STRING | No | JSON array of guest objects |
| `actual_attendees` | STRING | No | JSON actual attendance records |
| `contact_person` | STRING | No | Primary contact for event |
| `notes` | STRING | No | Free-form notes |
| `submission_deadline` | DATE | No | Abstract/proposal submission deadline |
| `url` | STRING | No | Event website URL |
| `created_at` | DATE | Yes | Auto-generated creation timestamp |
| `updated_at` | DATE | No | Last update timestamp |

**Event Type Values:**
| Value | Description |
|-------|-------------|
| `conference` | Multi-day conference |
| `workshop` | Interactive workshop |
| `webinar` | Online presentation |
| `meeting` | In-person or virtual meeting |
| `site_visit` | On-site visit |
| `presentation` | One-way presentation |
| `training` | Training session |
| `other` | Other event type |

**Status Values:**
| Value | Description |
|-------|-------------|
| `potential` | Event identified, not yet decided |
| `considering` | Under evaluation |
| `confirmed` | Confirmed participation |
| `submitted` | Abstract/proposal submitted |
| `attended` | Event completed |
| `cancelled` | Event cancelled |

---

### 9. UPDATES (MO-DB_Updates)

**Status: ACTIVE** - Solution updates synced from meeting agendas

Multi-tab structure with year-based tabs (2026, 2025, 2024, Archive). Updates are synced from meeting notes via sync scripts in MO-DB_Updates container.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `meeting_date` | DATE | Yes | Date of the meeting where update was given |
| `solution_id` | STRING | Yes | Solution ID (FK to MO-DB_Solutions.solution_id) |
| `update_text` | STRING | Yes | Update content text (may contain bullet points) |
| `source_document` | STRING | No | Source document name (e.g., "Internal Planning 2026-01-29") |
| `source_url` | STRING | No | URL to source Google Doc |
| `created_at` | DATE | No | When synced to database |

**Tab Structure:**
| Tab Name | Content |
|----------|---------|
| `2026` | Current year updates |
| `2025` | Previous year updates |
| `2024` | Two years ago |
| `Archive` | Older updates |

**Data Source:** Synced from weekly/monthly meeting agendas via sync scripts (sync-weekly-current.gs, sync-monthly-current.gs, etc.)

---

### 10. UPDATE_HISTORY

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

### 11. SOLUTION_STAKEHOLDERS (Junction Table - Planned)

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
  "solution_id": "hls",
  "stakeholder_id": "STK_001",
  "relationship_type": "primary",
  "created_at": "2025-06-01"
}
```

---

### 12. AVAILABILITY (MO-DB_Availability)

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

### 13. MEETINGS (MO-DB_Meetings)

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

### 14. GLOSSARY (MO-DB_Glossary)

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

### 15. KUDOS (MO-DB_Kudos)

**Status: ACTIVE** - Team Viewer / Peer Recognition

Peer recognition system for the MO team. Feeds into quarterly report staff recognition suggestions. Optionally posts to Slack #odsi-kudos channel.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `kudos_id` | STRING | Yes | Primary key (e.g., "KUDOS_1706000000000") |
| `from_name` | STRING | Yes | Name of person giving kudos |
| `to_name` | STRING | Yes | Name of person receiving kudos |
| `message` | STRING | Yes | Recognition message (max 280 chars) |
| `category` | STRING | Yes | Category (see KudosCategory enum) |
| `created_at` | DATE | Yes | Timestamp when kudos was submitted |
| `quarter` | STRING | Yes | Fiscal quarter (e.g., "Q1 FY26") |
| `slack_posted` | BOOLEAN | No | Whether kudos was posted to Slack |

**Indexes:**
- Primary: `kudos_id`
- Secondary: `to_name`, `quarter`, `category`

**Slack Integration:**
Add `SLACK_KUDOS_WEBHOOK_URL` to MO-DB_Config with an incoming webhook URL for your #odsi-kudos channel.

**Example:**
```json
{
  "kudos_id": "KUDOS_1706000000000",
  "from_name": "Jane Smith",
  "to_name": "Bob Johnson",
  "message": "Thanks for staying late to help debug the stakeholder sync issue. Your persistence saved the day!",
  "category": "above_and_beyond",
  "created_at": "2026-01-22T15:30:00Z",
  "quarter": "Q2 FY26",
  "slack_posted": true
}
```

---

### 16. CONFIG (MO-DB_Config)

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
| **Database Sheets** | SOLUTIONS_SHEET_ID, CONTACTS_SHEET_ID, NEEDS_SHEET_ID, AGENCIES_SHEET_ID, ENGAGEMENTS_SHEET_ID, UPDATES_SHEET_ID, ACTIONS_SHEET_ID, STORIES_SHEET_ID, OUTREACH_SHEET_ID, TEMPLATES_SHEET_ID |
| **Team Sheets** | AVAILABILITY_SHEET_ID, MEETINGS_SHEET_ID, GLOSSARY_SHEET_ID, KUDOS_SHEET_ID |
| **Source Documents** | INTERNAL_AGENDA_ID, SEP_AGENDA_ID, OPERA_MONTHLY_ID, PBL_MONTHLY_ID |
| **Folders** | MONTHLY_FOLDER_ID |
| **Directing Documents** | MO_PROJECT_PLAN_DOC_ID, HQ_PROJECT_PLAN_DOC_ID, SEP_PLAN_DOC_ID, SEP_BLUEPRINT_DOC_ID, COMMS_PLAN_DOC_ID, STYLE_GUIDE_DOC_ID, ASSESSEMENT_PROCESS_DOC_ID, ASSESSEMENT_CHEATSHEET_DOC_ID, MO_RISK_REGISTER_DOC_ID, INFO_MANAGEMENT_PLAN_DOC_ID, etc. |
| **Integrations** | SLACK_KUDOS_WEBHOOK_URL |
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

### 17. TEMPLATES (MO-DB_Templates)

**Status: NEW** - Email/Meeting Templates for SEP and Comms

Comprehensive email and meeting templates for stakeholder engagement and communications.
56 templates across 6 categories extracted from the Meeting Invite Language PDF.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `template_id` | STRING | Yes | Primary key (e.g., "SEP_TP1", "IMPL_ATP_DG") |
| `category` | STRING | Yes | Category: Assessment, Implementation, SEP, Supplementary, Outreach, Blurbs |
| `subcategory` | STRING | No | Sub-grouping (Workshops, Kickoff, Decision Gate, Touchpoint, Working Session, etc.) |
| `phase` | STRING | No | Lifecycle phase: Assessment, Pre-Formulation, Formulation, Implementation, Operations, Closeout |
| `name` | STRING | Yes | Template display name |
| `meeting_title` | STRING | No | Meeting title for calendar invites |
| `attendees` | STRING | No | Typical attendees list |
| `key_points` | STRING | No | Agenda points / key discussion items |
| `email_subject` | STRING | No | Email subject line template with {placeholders} |
| `email_body` | STRING | No | Email body template with {placeholders} |
| `attachments_notes` | STRING | No | Notes about attachments or follow-up materials |
| `is_active` | BOOLEAN | Yes | Whether template is active |
| `sort_order` | INTEGER | No | Display order within category |

**Template Categories:**

| Category | Count | Description |
|----------|-------|-------------|
| Assessment | 3 | Solution assessment workshops (Asana/Interview, Solution, Report-Writing) |
| Implementation | 22 | Kickoff meetings, Decision Gates (ATP, F2I, ORR), DAAC, Closeout, Recurring |
| SEP | 13 | Touchpoints 1-8, Working Sessions 1-5, Milestone Notification, Prototype Feedback |
| Supplementary | 5 | Deep Dive sessions, NASA SNWG Lunch & Learn |
| Outreach | 5 | Introduction, Follow-up, Meeting Request, Update, Thank You |
| Blurbs | 6 | ODSI reporting blurbs for milestones |

**Placeholder Variables:**

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{solution}` | Solution name | "OPERA Land Surface Disturbance" |
| `{firstName}` | Recipient's first name | "John" |
| `{agency}` | Stakeholder's agency name | "USGS" |
| `{date}` | Relevant date | "January 15, 2026" |
| `{deadline}` | Response deadline | "January 22, 2026" |
| `{milestone}` | Milestone name | "ATP Decision Gate" |
| `{DAAC}` | Assigned DAAC name | "LP DAAC" |
| `{solutionContext}` | Solution description paragraph | "OPERA provides..." |
| `{capabilities}` | Solution capabilities summary | "land surface disturbance monitoring" |

**API Functions:**
- `getAllTemplates()`, `getTemplateById(templateId)`
- `getTemplatesByCategory(category)`, `getTemplatesBySubcategory(subcategory)`, `getTemplatesByPhase(phase)`
- `getSEPTemplates()`, `getSEPTouchpointTemplates(touchpointId)`, `getSEPWorkingSessionTemplates(sessionId)`
- `getImplementationTemplates()`, `getDecisionGateTemplates(gateType)`, `getKickoffTemplates()`
- `getOutreachTemplates()`, `getBlurbTemplates()`, `getBlurbForMilestone(milestoneType)`
- `applyTemplate(templateId, variables)` - Variable substitution
- `searchTemplates(query)`, `getTemplateStats()`, `getTemplateCategories()`
- `getEmailTemplatesForSEP()` - Backward compatible with existing SEP email modal
- `getCommsTemplates()` - Templates organized for Comms page

---

### 18. NEEDS (MO-DB_Needs)

**Status: ACTIVE** - Schema v3 (rebuilt 2026-01-29) - Survey response data from stakeholder lists

Stores stakeholder survey responses extracted from Solution Stakeholder Lists. This database links stakeholder requirements to solutions and captures measurement requirements, satisfaction metrics, and impact assessments.

**Schema v3** was rebuilt from source files in `source-archives/stakeholder-data/DB-Solution Stakeholder Lists/` to ensure data fidelity across all survey years (2016, 2018, 2020, 2022, 2024).

#### Identity (4 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `solution_id` | STRING | Yes | Foreign key to MO-DB_Solutions.solution_id |
| `solution` | STRING | Yes | Original survey solution name |
| `survey_year` | INTEGER | Yes | Survey year (2016, 2018, 2020, 2022, 2024) |
| `need_id` | STRING | No | Original survey need/requirement ID |

#### Contact (7 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `submitter_name` | STRING | No | Survey respondent name |
| `submitter_email` | STRING | No | Survey respondent email |
| `sme_name` | STRING | No | Subject matter expert name |
| `sme_email` | STRING | No | Subject matter expert email |
| `department` | STRING | No | Executive department or agency |
| `agency` | STRING | No | Sub-agency or bureau |
| `organization` | STRING | No | Organizational unit |

#### Application Context (7 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `strategic_objective` | STRING | No | Department/agency strategic objective |
| `application_description` | STRING | No | Application area description |
| `similar_to_previous` | STRING | No | Whether similar to previous surveys |
| `need_nature_type` | STRING | No | Nature of the need (monitoring, assessment, etc.) |
| `need_nature_frequency` | STRING | No | How often the need applies |
| `feature_to_observe` | STRING | No | Feature or phenomenon to observe |
| `how_long_required` | STRING | No | Duration the data is needed |

#### Measurement Requirements (12 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `horizontal_resolution` | STRING | No | Required horizontal resolution |
| `acceptable_horizontal_resolution` | STRING | No | Acceptable alternative resolution (2022+) |
| `vertical_resolution` | STRING | No | Required vertical resolution |
| `temporal_frequency` | STRING | No | Required temporal frequency |
| `geographic_coverage` | STRING | No | Required geographic coverage area |
| `data_latency_critical` | STRING | No | Whether data latency is critical (Yes/No) |
| `data_latency_value` | STRING | No | Required data latency timeframe |
| `acceptable_latency` | STRING | No | Acceptable latency alternative (2022+) |
| `spectral_bands_critical` | STRING | No | Whether spectral bands are critical (Yes/No) |
| `spectral_bands_value` | STRING | No | Required spectral bands |
| `uncertainty_critical` | STRING | No | Whether uncertainty is critical (Yes/No) |
| `uncertainty_type` | STRING | No | Required measurement uncertainty type |

#### Satisfaction Metrics (5 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `degree_need_met` | FLOAT | No | Degree to which need is met (0-100 scale, normalized) |
| `efficiency_gain` | STRING | No | Efficiency improvement if need is met |
| `geo_coverage_met` | STRING | No | Whether geographic coverage met |
| `resolution_met` | STRING | No | Whether resolution requirement met |
| `frequency_met` | STRING | No | Whether frequency requirement met |

#### Impact (2 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `impact_if_unavailable` | STRING | No | Impact if data becomes unavailable |
| `impact_if_unmet` | STRING | No | Impact if requirement not met |

#### Infrastructure (5 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `has_infrastructure` | STRING | No | Whether infrastructure exists to use data |
| `support_needed` | STRING | No | Support needed to use data |
| `limiting_factors` | STRING | No | Factors limiting use |
| `discovery_tools` | STRING | No | Data discovery tools currently used |
| `preferred_access` | STRING | No | Preferred data access method |

#### Data Format (4 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `required_processing_level` | STRING | No | Required data processing level |
| `preferred_format` | STRING | No | Preferred data format |
| `preferred_missions` | STRING | No | Preferred satellite missions |
| `products_currently_used` | STRING | No | Products currently being used |

#### Training and Resources (3 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `training_needs` | STRING | No | Training needs identified |
| `data_sharing_scope` | STRING | No | Scope of data sharing requirements |
| `resources_needed` | STRING | No | Resources needed to utilize data |

#### Other (3 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `critical_attributes_ranking` | STRING | No | Ranking of critical attributes |
| `other_attributes` | STRING | No | Other limiting attributes |
| `additional_comments` | STRING | No | Additional comments or information |

#### Metadata (3 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `source_file` | STRING | Yes | Source Excel filename |
| `source_url` | STRING | No | Google Sheets URL for source |
| `extracted_at` | DATE | Yes | Extraction date (YYYY-MM-DD) |

**Key Relationships:**
- `solution_id` → `MO-DB_Solutions.solution_id` (many-to-one)
- Survey responses can be aggregated by solution, year, department, or agency

**API Functions:**
- `getAllNeeds()` - Load all needs
- `getNeedsForSolution(solution)` - Filter by solution using `matchSolutionToNeeds_()`
- `analyzeNeeds_(needs)` - Aggregate characteristics, satisfaction, and demographics

---

### 19. COMMS ASSETS (MO-DB_CommsAssets)

**Status: NEW** - Unified communications content library

Consolidates all reusable communications content: blurbs, quotes, facts, talking points, sound bites, boilerplate, and connections. Replaces scattered content from MO-DB_Solutions (comms_* columns) and MO-DB_Stories (highlighter_blurb content_type).

**Asset Types (Text Content):**
| Type | Description | Use Case |
|------|-------------|----------|
| `blurb` | 2-3 sentence descriptions | HQ updates, newsletters |
| `talking_point` | Key messages with supporting detail | Briefings, meetings |
| `quote` | Stakeholder/leadership quotes | Presentations, press |
| `fact` | Statistics, metrics, data points | Reports, infographics |
| `soundbite` | Short punchy statements | Elevator pitches, social |
| `boilerplate` | Standard program descriptions | Consistent messaging |
| `connection` | Solution-agency relationships | Relationship context |

**Asset Types (File Assets):**
| Type | Description | Use Case |
|------|-------------|----------|
| `image` | Photos, screenshots, diagrams | Presentations, reports |
| `presentation` | PowerPoint/Google Slides files | Briefings, external talks |
| `pdf` | PDF documents | Factsheets, handouts |
| `video` | Video files or links | Demos, explainers |
| `document` | Word/Google Docs files | Templates, guides |
| `graphic` | Infographics, charts, visualizations | Social, reports |

#### Identity (4 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `asset_id` | STRING | Yes | Primary key (CA-001, CA-002, etc.) |
| `asset_type` | ENUM | Yes | Type of asset (see Asset Types above) |
| `title` | STRING | Yes | Short title for quick scanning |
| `content` | TEXT | Yes | The actual content text |

#### File Assets (3 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `asset_url` | STRING | No | Google Drive link to file (for images, presentations, etc.) |
| `asset_file_type` | ENUM | No | image, presentation, pdf, video, document, graphic |
| `thumbnail_url` | STRING | No | Preview image URL (optional) |

#### Source & Attribution (7 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `source_name` | STRING | No | Person, document, or event name |
| `source_type` | ENUM | No | stakeholder, leadership, publication, event, internal |
| `source_url` | STRING | No | Link to original source |
| `attribution_text` | STRING | No | How to cite (e.g., "Dr. Jane Smith, USDA") |
| `date_captured` | DATE | No | When content was captured |
| `usage_rights` | ENUM | No | public-domain, nasa-media, internal-only, attribution-required |
| `rights_holder` | STRING | No | Who owns the content (for attribution) |

#### Context & Linking (4 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `solution_ids` | STRING | No | Comma-separated solution IDs |
| `agency_ids` | STRING | No | Comma-separated agency IDs |
| `contact_ids` | STRING | No | Comma-separated contact_ids in CON_xxx format |
| `tags` | STRING | No | Comma-separated tags for searchability |

#### Usage Guidance (4 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `audience` | ENUM | No | internal, external, leadership, public, technical, all |
| `channels` | STRING | No | Comma-separated: email, social, presentation, report, flyer, all |
| `tone` | ENUM | No | formal, casual, technical, inspirational |
| `usage_notes` | TEXT | No | Any caveats or context needed |

#### Status & Approval (4 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `status` | ENUM | Yes | draft, approved, needs_update, archived |
| `approved_by` | STRING | No | Who approved the content |
| `approved_date` | DATE | No | When content was approved |
| `expiration_date` | DATE | No | When content should be reviewed |

#### Metadata (5 columns)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `created_by` | STRING | No | Who created the record |
| `created_at` | DATE | Yes | Creation date |
| `updated_at` | DATE | Yes | Last update date |
| `use_count` | INTEGER | No | Track how often copied/used |
| `last_used_date` | DATE | No | Last time content was copied |
| | | | |
| **Source Tracking** | | | |
| `source_engagement_id` | STRING | No | FK to MO-DB_Engagements (for assets promoted from event artifacts) |

**Key Relationships:**
- `solution_ids` → `MO-DB_Solutions.solution_id` (many-to-many via comma-separated)
- `agency_ids` → `MO-DB_Agencies.agency_id` (many-to-many via comma-separated)
- `contact_ids` → `MO-DB_Contacts.contact_id` (many-to-many via comma-separated CON_xxx)

**API Functions:**
- `getAllCommsAssets(limit)` - Get all assets
- `getCommsAssetById(assetId)` - Get single asset
- `getCommsAssetsByType(type)` - Filter by asset type
- `getCommsAssetsBySolution(solutionId)` - Get assets for a solution
- `queryCommsAssets(filters)` - Multi-filter query
- `searchCommsAssets(query)` - Full-text search
- `searchWhatToSay(query)` - "What do I say about X?" search, returns grouped results
- `createCommsAsset(data)` - Create new asset
- `updateCommsAsset(assetId, updates)` - Update asset
- `recordCommsAssetUsage(assetId)` - Track usage

**Backward Compatibility:**
- `getHighlighterBlurbs()` now checks CommsAssets first, falls back to Stories
- `getKeyMessages()` now checks CommsAssets first, falls back to Solutions columns

---

### 20. AGENCIES (MO-DB_Agencies)

Multi-tab structure (v4.0): Departments + Agencies + Organizations.
Hierarchy: Department → Agency → Organization.

#### Departments Tab

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `department_id` | STRING | **PK** | e.g., `dep_doi` |
| `name` | STRING | Yes | Short name (e.g., "Interior") |
| `full_name` | STRING | No | e.g., "Department of the Interior" |
| `abbreviation` | STRING | No | e.g., "DOI" |

#### Agencies Tab

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `agency_id` | STRING | **PK** | e.g., `usgs`, `noaa_nws` |
| `department_id` | STRING | No | FK to Departments tab |
| `name` | STRING | Yes | Short name |
| `full_name` | STRING | No | Full official name |
| `abbreviation` | STRING | No | Common abbreviation |
| `agency_type` | STRING | No | federal, state, academic, etc. |
| `relationship_status` | STRING | No | active, prospective, inactive |
| `geographic_scope` | STRING | No | national, regional, state |
| `parent_agency_id` | STRING | No | FK to self (sub-agency hierarchy) |
| `leadership_contact_id` | STRING | No | FK to MO-DB_Contacts (agency leader) |
| `poc_contact_id` | STRING | No | FK to MO-DB_Contacts (primary point of contact) |
| `website` | STRING | No | Agency website URL |
| `notes` | STRING | No | Free text notes |
| `last_updated` | DATE | No | YYYY-MM-DD |

#### Organizations Tab

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `org_id` | STRING | **PK** | e.g., `org_eros` |
| `agency_id` | STRING | Yes | FK to Agencies tab |
| `name` | STRING | Yes | Short name |
| `full_name` | STRING | No | Full official name |
| `abbreviation` | STRING | No | Optional abbreviation |

**Agency Resolver:**
- `resolveAgency_(agencyId)` returns `{ agency_name, agency_abbreviation, department_name, department_abbreviation, department_id }`
- Used by contacts-api, outreach-api, and agencies-api for agency_id → name resolution

**API Functions:**
- Department CRUD: `getAllDepartments()`, `getDepartmentById()`, `getAgenciesByDepartment()`, `createDepartment()`, `updateDepartment()`
- Agency CRUD: `getAllAgencies()`, `getAgencyById()`, `createAgency()`, `updateAgency()`, `deleteAgency()`
- Organization CRUD: `getAllOrganizations()`, `getOrganizationById()`, `getOrganizationsByAgency()`, `createOrganization()`, `updateOrganization()`
- Hierarchy: `getAgencyHierarchy()` (3-level tree), `getAgencyAncestry()`
- Search: `searchAgencies()`, `getAgenciesByType()`, `getAgenciesByRelationshipStatus()`

---

### 21. LOOKUPS (MO-DB_Lookups)

Centralized database for all standardized lookup IDs. Each consuming database has a local `_Lookups` tab that IMPORTRANGEs from here.

| Tab | Column | Source |
|-----|--------|--------|
| Solutions | `solution_id` | MO-DB_Solutions > Core |
| Contacts | `contact_id` | MO-DB_Contacts > People |
| Agencies | `agency_id` | MO-DB_Agencies > Agencies |
| Departments | `department_id` | MO-DB_Agencies > Departments |
| Organizations | `org_id` | MO-DB_Agencies > Organizations |
| Needs | `need_id` | MO-DB_Needs |

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

### ContentType (Stories)
```
story | web_content | social_media | external_mention | nugget | key_date | highlighter_blurb
```

| Code | ID Prefix | Description |
|------|-----------|-------------|
| story | STY | Impact story / feature article |
| web_content | WEB | Website content |
| social_media | SOC | Social media post |
| external_mention | EXT | External press/blog mention |
| nugget | NUG | Nugget slide |
| key_date | KEY | Key date/anniversary |
| highlighter_blurb | HLB | HQ Highlighter report blurb |

### StoryStatus
```
idea | researching | drafting | review | published | archived
```

| Code | Name | Order | Description |
|------|------|-------|-------------|
| idea | Idea | 1 | Initial idea captured |
| researching | Researching | 2 | Gathering information |
| drafting | Drafting | 3 | Writing in progress |
| review | Review | 4 | Under review |
| published | Published | 5 | Live/published |
| archived | Archived | 6 | No longer active |

### Channel
```
web | social | slide | external | newsletter
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

### KudosCategory
```
teamwork | innovation | above_and_beyond | mentorship | delivery
```

| Code | Name | Description | Icon |
|------|------|-------------|------|
| teamwork | Teamwork | Collaboration and helping others | group |
| innovation | Innovation | Creative solutions and new ideas | lightbulb |
| above_and_beyond | Above & Beyond | Going the extra mile | star |
| mentorship | Mentorship | Teaching and guiding others | school |
| delivery | Delivery | Getting things done, meeting deadlines | check_circle |

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
| 2.8.0 | 2026-02-06 | **Schema additions**: Added 16 undocumented Contact fields (8 Engagement Tracking + 8 About Me/Personal Profile columns). Added `core_application_sectors` to Solutions. Added formal OUTREACH/EVENTS schema (section 8) and UPDATES schema (section 9). Renumbered sections 8-17 to 10-19. |
| 2.7.0 | 2026-02-04 | **SNWG Champions**: Added 3 new columns to CONTACTS (champion_status, relationship_owner, champion_notes). Added Champion Status Values table. Updated indexes to include champion_status and relationship_owner. |
| 2.6.0 | 2026-02-04 | **Event/Workshop Tracking**: Added 9 event columns to ENGAGEMENTS (event_date, event_name, event_status, event_location, event_url, event_owner, event_planning_doc_url, event_attendee_ids, event_artifacts). Added event_artifacts JSON structure documentation. Added source_engagement_id to COMMS_ASSETS for artifact promotion tracking. Event detection via event_date presence. |
| 2.5.0 | 2026-02-02 | **STORIES Schema Update**: Added `background_info` (for Highlighter Blurb background sections), `hq_submission_date` (HQ portal submission tracking), `content_type` (with 7 types including `highlighter_blurb`). Added Content Types table. Renamed columns for consistency: `scheduled_date`→`target_date`, `published_date`→`publish_date`, `created_at`→`created_date`. |
| 2.4.0 | 2026-01-30 | Added ENGAGEMENTS table (section 7) with multi-solution support: `solution_id` (primary, required), `secondary_solution_id` (optional), `additional_solution_ids` (optional, comma-separated). Renumbered subsequent sections 8-16. |
| 2.3.0 | 2026-01-29 | Added `admin_shared_team_folder` column to SOLUTIONS for implementation team file sharing functionality. |
| 2.0.0 | 2026-01-22 | **SOLUTIONS Schema v2**: Refactored with 9 semantic prefixes (core_, funding_, admin_, team_, earthdata_, comms_, product_, milestone_, docs_). Reduced from 76 to 64 columns. Added presentation URLs for milestones. Column names use underscores for JS compatibility. |
| 1.1.0 | 2026-01-18 | Added Team Viewer tables: AVAILABILITY, MEETINGS, GLOSSARY, CONFIG. Added new enumerations for availability and meeting types. |
| 1.0.1 | 2026-01-17 | Added Data Sources section with Monthly Meeting Presentations sync documentation |
| 1.0.0 | 2026-01-14 | Initial schema definition |
