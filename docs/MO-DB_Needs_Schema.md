# MO-DB_Needs Schema

**Purpose:** Capture all stakeholder survey responses as submitted, enabling granular analysis of user needs vs solution characteristics.

**Source:** DB-Solution Stakeholder Lists Excel files (2016-2024 surveys)

---

## Schema Design

### Identity & Context

| Column | Type | Description | Source Field |
|--------|------|-------------|--------------|
| `need_id` | String | Unique identifier (solution_year_row) | Generated |
| `solution` | String | Solution name | Filename |
| `survey_year` | Integer | Survey cycle (2016, 2018, 2020, 2022, 2024) | Sheet name |
| `submitter_name` | String | First + Last name | (1a), (1b) |
| `department` | String | Federal department | (1c) |
| `agency` | String | Agency within department | (1d) |
| `organization` | String | Specific organization/office | (1e) |
| `role` | String | Role (Survey Submitter, Secondary SME, Primary SME) | Derived |

### Strategic Objectives (Section 2)

| Column | Type | Description | Source Field |
|--------|------|-------------|--------------|
| `strategic_objective` | Text | Department/Agency strategic objective | (2a) |
| `application_description` | Text | Specific application requiring satellite data | (2b) |
| `similar_to_previous` | String | Is this similar to a previous submission? | (2c-1) |
| `need_nature_type` | String | Decision-making/operations vs research | (2d-1) |
| `need_nature_frequency` | String | Episodic, periodic, systematic, archival | (2e-1) |
| `archival_period` | String | How far back is archival data needed? | (2e-5) |

### Observation Requirements (Section 3a)

| Column | Type | Description | Source Field |
|--------|------|-------------|--------------|
| `feature_to_observe` | Text | Feature/quantity to observe | (3a-1) |
| `how_long_required` | String | How long has data been required? | (3a-2) |
| `degree_need_met` | Integer | 1-100 scale of how well need is met | (3a-4) |
| `efficiency_gain` | Text | How satellites increase efficiency | (3a-5) |

### Technical Requirements (Section 3b-3i)

| Column | Type | Description | Source Field |
|--------|------|-------------|--------------|
| `geographic_coverage` | String | Global, CONUS, states, bounding box | (3b-1) |
| `geographic_bounds` | String | Bounding box coordinates if specified | (3b-1) coords |
| `horizontal_resolution` | String | <1m, 1-5m, 10-30m, 100-250m, etc. | (3c-1) |
| `horizontal_resolution_acceptable` | String | Acceptable if ideal unavailable | (3c-1) alt |
| `vertical_resolution` | String | Atmospheric layers, depth, etc. | (3c-2) |
| `temporal_frequency` | String | Hourly, daily, weekly, monthly, etc. | (3d-1) |
| `temporal_frequency_acceptable` | String | Acceptable if ideal unavailable | (3d-1) alt |
| `data_latency` | String | Near real-time, hours, days | (3e-2) |
| `data_latency_acceptable` | String | Acceptable if ideal unavailable | (3e-2) alt |
| `spectral_bands` | String | VIS, NIR, SWIR, TIR, etc. (comma-separated) | (3f-2) |
| `measurement_uncertainty` | String | Required uncertainty level | (3g-2) |
| `other_attributes` | Text | Other limiting attributes | (3h-1), (3h-2) |
| `critical_attributes_ranking` | Text | Ranking of most critical attributes | (3i) |

### Mission & Product Preferences (Section 3j)

| Column | Type | Description | Source Field |
|--------|------|-------------|--------------|
| `preferred_missions` | Text | Satellite missions/sensors that meet needs | (3j-1) |
| `products_currently_used` | Text | Satellite products currently in use | (3j-3) |
| `impact_if_unavailable` | Text | Impact if mission/product becomes unavailable | (3j-4) |
| `impact_if_unmet` | Text | Impact if need not currently met | (3j-5) |

### Data Access & Processing (Section 4)

| Column | Type | Description | Source Field |
|--------|------|-------------|--------------|
| `has_infrastructure` | String | Do you have tools to use the data? | (4a-1) |
| `support_needed` | Text | Areas where support is needed | (4a-2) |
| `limiting_factors` | Text | Factors limiting ability to use data | (4a-3) |
| `discovery_tools` | Text | Data discovery tools used | (4b-1) |
| `preferred_access` | String | Cloud, download, API, etc. | (4c-1) |
| `required_processing_level` | String | ARD, L1, L2, derived products | (4d-1) |
| `preferred_format` | String | GeoTIFF, NetCDF, etc. | (4e-1) |
| `resources_needed` | Text | Resources needed to use NASA products | (4f) |
| `training_needs` | Text | Training needs | (4g-1) |
| `data_sharing_scope` | String | Data sharing requirements | (4h-1) |

---

## Notes

### Survey Year Variations
- **2016**: Older format with "Data Continuity" vs "Unmet Needs" columns
- **2018**: Added "How well is need met?" (1-100 scale)
- **2020**: Added measurement uncertainty, bounding box coordinates
- **2022**: Added acceptable resolution alternatives, training needs
- **2024**: Added archival period needs, refined latency options

### Column Mapping Strategy
- Map each year's columns to the unified schema
- Store raw values without interpretation
- Use NULL for fields not present in older surveys

### Alignment Analysis Use Cases
1. **Resolution Match**: Compare `horizontal_resolution` need vs solution `horizontal_resolution`
2. **Temporal Match**: Compare `temporal_frequency` need vs solution `temporal_frequency`
3. **Coverage Match**: Compare `geographic_coverage` need vs solution `geographic_domain`
4. **Gap Analysis**: Use `degree_need_met` to identify unmet needs
5. **Impact Assessment**: Use `impact_if_unmet` to prioritize solutions

---

## Record Count Estimate

Based on stakeholder files:
- ~47 solutions with stakeholder lists
- ~5 survey years per solution
- ~20-60 responses per solution per year
- **Estimated total: 4,000-10,000 need records**
