# Solution Lookup Implementation Guide

**Date:** 2026-01-23
**Purpose:** Standardize solution identification across all MO databases using `core_id` from MO-DB_Solutions

---

## Overview

All databases that reference solutions need a `_Lookups` tab that pulls valid `core_id` values from MO-DB_Solutions. This enables:
- Data validation dropdowns for solution selection
- Consistent solution IDs across all databases
- Easier cross-database queries and reporting

---

## Source of Truth

**MO-DB_Solutions** contains the master list of solutions with `core_id` as the primary key.

Example `core_id` values: `hls`, `opera`, `vlm`, `nisar-sm`, `dswx`, `dist`, etc.

---

## Databases to Update

| # | Database | Current Column(s) | Action Required |
|---|----------|-------------------|-----------------|
| 1 | MO-DB_Actions | `solution` (free text) | Add `_Lookups` tab, add data validation |
| 2 | MO-DB_Contacts | `solution_id`, `solution` | Add `_Lookups` tab, add data validation |
| 3 | MO-DB_Engagements | `solution_ids` | Add `_Lookups` tab, add data validation |
| 4 | MO-DB_Milestones | `solution_id`, `solution_name` | Add `_Lookups` tab, add data validation |
| 5 | MO-DB_Needs | (check existing columns) | Add `_Lookups` tab, add/update solution column |
| 6 | MO-DB_Outreach | `solution_names` | Add `_Lookups` tab, rename to `solution_ids` |
| 7 | MO-DB_Stories | `solution_ids`, `solution_names` | Add `_Lookups` tab, delete `solution_names` |
| 8 | MO-DB_Updates | `solution` (free text) | Add `_Lookups` tab, add data validation |

---

## Step-by-Step Implementation

### For Each Database:

#### Step 1: Add `_Lookups` Tab

1. Open the database spreadsheet
2. Click the **+** button to add a new tab
3. Rename the tab to `_Lookups`
4. In cell **A1**, enter: `core_id`
5. In cell **A2**, enter this formula:

```
=IMPORTRANGE("SOLUTIONS_SHEET_ID", "Solutions!A2:A")
```

Replace `SOLUTIONS_SHEET_ID` with the actual sheet ID from MO-DB_Config.

6. Click "Allow access" when prompted to connect the sheets

#### Step 2: Add Data Validation to Solution Column

1. Go to the main data tab
2. Select the entire solution column (excluding header)
3. Go to **Data > Data validation**
4. Set criteria to: **Dropdown (from a range)**
5. Enter range: `_Lookups!A:A`
6. Check "Show dropdown list in cell"
7. Set "If data is invalid" to: **Show warning** (allows existing data while warning about non-matching values)
8. Click **Done**

---

## Database-Specific Instructions

### 1. MO-DB_Actions

**Current state:** `solution` column contains free text solution names

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. Add a new column `solution_id` next to existing `solution` column
3. Add data validation to `solution_id` column
4. Migrate existing data: Use VLOOKUP to map solution names to core_id
5. After verification, hide (don't delete) the old `solution` column

**Migration formula (temporary column):**
```
=IFERROR(VLOOKUP(LOWER(TRIM(A2)), _Lookups!A:A, 1, FALSE), "")
```

---

### 2. MO-DB_Contacts

**Current state:**
- `solution_id` column (may contain old IDs)
- `solution` column (contains solution names)

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. Add data validation to `solution_id` column
3. Verify existing `solution_id` values match `core_id` format
4. Keep `solution` column as display name (denormalized for convenience)

---

### 3. MO-DB_Engagements

**Current state:** `solution_ids` column (comma-separated)

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. For single-solution engagements: Add data validation
3. For multi-solution engagements: Document that values should be comma-separated `core_id` values

**Note:** Google Sheets data validation doesn't support multiple comma-separated values, but the lookup provides a reference.

---

### 4. MO-DB_Milestones

**Current state:**
- `solution_id` column
- `solution_name` column

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. Add data validation to `solution_id` column
3. Verify existing IDs match `core_id` format
4. Keep `solution_name` for display purposes

---

### 5. MO-DB_Needs

**Current state:** Check existing schema

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. Add `solution_id` column if not present
3. Add data validation to solution column

---

### 6. MO-DB_Outreach

**Current state:** `solution_names` column (comma-separated names)

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. **Rename** `solution_names` to `solution_ids`
3. Migrate existing data from names to `core_id` values
4. Add data validation (for single-solution events)

---

### 7. MO-DB_Stories

**Current state:**
- `solution_ids` column (comma-separated)
- `solution_names` column (comma-separated)

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. Verify `solution_ids` contains valid `core_id` values
3. **Delete** `solution_names` column (redundant - names can be looked up from Solutions DB)
4. Add data validation to `solution_ids` (for single-solution stories)

---

### 8. MO-DB_Updates

**Current state:** `solution` column (free text names)

**Changes:**
1. Add `_Lookups` tab with `core_id` values
2. Add `solution_id` column
3. Migrate existing solution names to `core_id` values
4. Add data validation to `solution_id` column
5. Hide (don't delete) old `solution` column after migration

---

## API Code Updates Required

After updating the sheets, the following API files need updates to use the new column names:

### stories-api.gs
- Remove references to `solution_names` column
- Update `getStoriesBySolution()` to only use `solution_ids`

### outreach-api.gs
- Change `solution_names` references to `solution_ids`

### actions-api.gs
- Change `solution` references to `solution_id`
- Update `getUniqueSolutions()` function

### updates-api.gs
- Change `solution` references to `solution_id`
- Update `getUpdatesBySolution()` function

---

## Verification Checklist

After implementation, verify:

- [ ] Each database has a `_Lookups` tab
- [ ] `_Lookups!A:A` contains current `core_id` values from Solutions
- [ ] IMPORTRANGE is connected and updating
- [ ] Data validation is set on solution columns
- [ ] Existing data has been migrated to `core_id` format
- [ ] API code has been updated for renamed columns
- [ ] Deploy updated API files to MO-APIs Library
- [ ] Test engagement logging in SEP-NSITE page

---

## IMPORTRANGE Formula Reference

For each database, use this formula in `_Lookups!A2`:

```
=IMPORTRANGE("1ABC...XYZ", "Solutions!A2:A")
```

Where `1ABC...XYZ` is replaced with the SOLUTIONS_SHEET_ID value from MO-DB_Config.

To get the ID:
1. Open MO-DB_Config
2. Find key: `SOLUTIONS_SHEET_ID`
3. Copy the value

---

## Rollback Plan

If issues arise:
1. Data validation can be removed without data loss
2. Hidden columns can be unhidden
3. API code changes can be reverted via git
4. `_Lookups` tabs can be deleted if IMPORTRANGE causes performance issues

---

## Document History

| Date | Change |
|------|--------|
| 2026-01-23 | Initial implementation guide created |
