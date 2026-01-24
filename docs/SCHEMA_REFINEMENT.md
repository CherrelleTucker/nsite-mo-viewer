# MO-DB_Solutions Schema Refinement

**Date:** 2026-01-17
**Status:** Proposed

---

## Overview

Standardize column naming for documents and decision gates to follow consistent patterns.

---

## Document Columns

Each document type follows the pattern: `{doc_type}_date`, `{doc_type}_url`

| Document Type | Date Column | URL Column | Description |
|---------------|-------------|------------|-------------|
| Science SOW | `science_sow_date` | `science_sow_url` | Science Statement of Work |
| Project Plan | `project_plan_date` | `project_plan_url` | Project Plan document |
| IPA | `ipa_date` | `ipa_url` | Interface Agreement with ESDIS |
| ICD | `icd_date` | `icd_url` | Interface Control Document with DAAC |
| TTA | `tta_date` | `tta_url` | Technology Transfer Agreement |
| Deep Dive | `deep_dive_date` | `deep_dive_url` | Deep Dive presentation |

### Column Mapping (Current → Proposed)

| Current Column | Proposed Column | Action |
|----------------|-----------------|--------|
| `science_sow_url` | `science_sow_url` | Keep |
| `science_sow` | `science_sow_date` | Rename (was empty) |
| `project_plan_url` | `project_plan_url` | Keep |
| `project_plan` | `project_plan_date` | Rename |
| `ipa` | `ipa_url` | Rename |
| *(new)* | `ipa_date` | Add |
| `icd` | `icd_url` | Rename |
| *(new)* | `icd_date` | Add |
| `tta` | `tta_url` | Rename |
| *(new)* | `tta_date` | Add |
| `deep_dive` | `deep_dive_url` | Rename |
| *(new)* | `deep_dive_date` | Add |

---

## Decision Gate Columns

Each decision gate follows the pattern: `{gate}_date`, `{gate}_memo_date`, `{gate}_memo_url`

| Decision Gate | Gate Date | Memo Date | Memo URL | Description |
|---------------|-----------|-----------|----------|-------------|
| ATP | `atp_date` | `atp_memo_date` | `atp_memo_url` | Authority to Proceed |
| F2I | `f2i_date` | `f2i_memo_date` | `f2i_memo_url` | Formulation to Implementation |
| ORR | `orr_date` | `orr_memo_date` | `orr_memo_url` | Operational Readiness Review |
| Closeout | `closeout_date` | `closeout_memo_date` | `closeout_memo_url` | Project Closeout |

### Column Mapping (Current → Proposed)

| Current Column | Proposed Column | Action |
|----------------|-----------------|--------|
| `atp_date` | `atp_date` | Keep |
| `atp_memo` | `atp_memo_url` | Rename |
| *(new)* | `atp_memo_date` | Add |
| `f2i_date` | `f2i_date` | Keep |
| `f2i_memo` | `f2i_memo_url` | Rename |
| *(new)* | `f2i_memo_date` | Add |
| `orr_date` | `orr_date` | Keep |
| `orr_memo` | `orr_memo_url` | Rename |
| *(new)* | `orr_memo_date` | Add |
| `closeout_date` | `closeout_date` | Keep |
| `closeout_memo` | `closeout_memo_url` | Rename |
| *(new)* | `closeout_memo_date` | Add |

---

## DAAC Assignment

| Current Column | Proposed Column | Description |
|----------------|-----------------|-------------|
| `daac` | `assigned_daac_location` | Assigned DAAC; blank = not yet assigned |

---

## Columns to Remove

| Column | Reason |
|--------|--------|
| `Unnamed: 39` | Empty artifact column |

---

## Future Feature: JPL Toggle

**Context:** JPL uses a different milestone system than standard NASA decision gates.

**Proposed Implementation:**
- Add boolean column: `uses_jpl_milestones` (default: FALSE)
- When TRUE, UI displays JPL-specific milestone names instead of ATP/F2I/ORR
- Data still stored in same columns, only display labels change

**JPL Milestone Mapping** (TBD - need JPL milestone names):
| Standard Gate | JPL Equivalent |
|---------------|----------------|
| ATP | *(TBD)* |
| F2I | *(TBD)* |
| ORR | *(TBD)* |
| Closeout | *(TBD)* |

---

## Complete Proposed Schema

### Identity & Classification
- `solution_id` (PK)
- `name`
- `full_title`
- `alternate_names`
- `solution_group`
- `cycle`
- `cycle_year`
- `phase`
- `uses_jpl_milestones` *(new)*

### Funding & Status
- `funding_status`
- `funded_by_ison`
- `funding_period`
- `on_official_webpage`
- `has_drive_folder`
- `is_commercial`

### Team Contacts
- `solution_lead`
- `solution_lead_title`
- `solution_lead_affiliation`
- `ra_representative`
- `ra_representative_affiliation`
- `earth_action_advocate`
- `earth_action_affiliation`
- `stakeholder_engagement_lead`
- `comms_lead`
- `stakeholder_list`
- `program_scientist`
- `ra_program_scientist`
- `primary_algo_developer`
- `other_contacts`

### Description
- `purpose_mission`
- `background`
- `societal_impact`
- `proposed_activity`
- `thematic_areas`
- `status_summary`
- `next_steps`
- `notes`

### Technical Specifications
- `platform`
- `temporal_frequency`
- `horizontal_resolution`
- `geographic_domain`
- `assigned_daac_location` *(renamed from daac)*

### Documents (date + url pairs)
- `science_sow_date`, `science_sow_url`
- `project_plan_date`, `project_plan_url`
- `ipa_date`, `ipa_url`
- `icd_date`, `icd_url`
- `tta_date`, `tta_url`
- `deep_dive_date`, `deep_dive_url`

### Decision Gates (date + memo_date + memo_url)
- `atp_date`, `atp_memo_date`, `atp_memo_url`
- `f2i_date`, `f2i_memo_date`, `f2i_memo_url`
- `orr_date`, `orr_memo_date`, `orr_memo_url`
- `closeout_date`, `closeout_memo_date`, `closeout_memo_url`

### Resources & Links
- `solution_resources`
- `drive_folder_url`
- `snwg_solution_page_url`
- `risk_register_url`
- `data_product_table_url`
- `training_resource_url`
- `fact_sheet_url`
- `lifecycle_docs_url`
- `stakeholder_survey_url`
- `nsite_sep_mandate`
- `project_deliverables`

### Sync & Metadata
- `last_earthdata_sync`
- `last_updated`
- `show_in_default`
