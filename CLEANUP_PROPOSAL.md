# File Structure Cleanup Proposal

**Date:** 2026-01-16
**Status:** COMPLETED (Option B)

---

## Cleanup Summary - COMPLETED

### Actions Taken:

**DELETED:**
- [x] `database-templates/` folder (7 obsolete CSV templates)
- [x] `nsite-mo-viewer/database-files/MO-DB_Milestones.csv` (superseded)
- [x] `database-files/MO-DB_Solutions.xlsx` (duplicate)
- [x] `nsite-mo-viewer/database-files/` folder (now empty)
- [ ] `~$SolutionInformationDatabase...xlsx` - SKIPPED (file locked by Excel)

**REORGANIZED:**
- [x] Created `source-archives/` folder
- [x] Moved `stakeholder-mapping/` → `source-archives/stakeholder-data/`
- [x] Moved 9 scattered files → `source-archives/raw-exports/`
- [x] Moved earthdata JSON/CSV files → `MO-Viewer Databases/`

### New Structure:
```
MO-development/
├── nsite-mo-viewer/              # Active project
├── database-files/
│   └── MO-Viewer Databases/      # AUTHORITATIVE (10 files)
│       ├── _Config.xlsx
│       ├── MO-BD_Needs.xlsx
│       ├── MO-DB_Actions.xlsx
│       ├── MO-DB_Contacts.xlsx
│       ├── MO-DB_Solutions.xlsx
│       ├── MO-DB_Update_History.xlsx
│       ├── MO-DB_Updates.xlsx
│       ├── earthdata-solutions-content.json
│       ├── earthdata-content-simplified.json
│       └── earthdata-content-for-merge.csv
├── source-archives/              # Historical data
│   ├── stakeholder-data/         # 47 stakeholder Excel files
│   └── raw-exports/              # 9 archived files
└── (legacy repos - kept for reference)
```

---

## Current State Summary

### Authoritative Database Location (Confirmed)
```
C:\Users\cjtucke3\Documents\Personal\MO-development\database-files\MO-Viewer Databases\
├── _Config.xlsx
├── MO-BD_Needs.xlsx
├── MO-DB_Actions.xlsx
├── MO-DB_Contacts.xlsx
├── MO-DB_Solutions.xlsx
├── MO-DB_Update_History.xlsx
└── MO-DB_Updates.xlsx
```

### Issues Found

#### 1. Outdated database-templates/ folder
**Location:** `C:\Users\cjtucke3\Documents\Personal\MO-development\database-templates\`
**Contents:** Old CSV templates (Solutions.csv, Contacts.csv, etc.)
**Status:** Superseded by MO-Viewer Databases
**Recommendation:** DELETE entire folder

#### 2. Duplicate/Old database files in database-files/ root
**Location:** `C:\Users\cjtucke3\Documents\Personal\MO-development\database-files\`
**Contents:**
- `MO-DB_Solutions.xlsx` (duplicate, 96 KB - older version)
- `earthdata-solutions-content.json` (201 KB)
- `earthdata-content-simplified.json` (30 KB)
- `earthdata-content-for-merge.csv` (24 KB)

**Recommendation:** Move earthdata files into MO-Viewer Databases subfolder or nsite-mo-viewer/data/

#### 3. Scattered files in root MO-development/
**Location:** `C:\Users\cjtucke3\Documents\Personal\MO-development\`
**Contents:**
- `SNWG MO Master Contact List - All_Contacts.csv` - raw data
- `SolutionInformationDatabase_NSITE MO_C0_2025.csv` - raw data
- `SolutionInformationDatabase_NSITE MO_C0_2025.xlsx` - raw data
- `~$SolutionInformationDatabase_NSITE MO_C0_2025.xlsx` - TEMP FILE (delete)
- `SolutionDB_Sheet1.csv`, `SolutionDB_Sheet1_Expanded.csv`, `SolutionDB_Sheet2.csv` - intermediate
- `mo-drive-file log.csv` - utility log
- `Solution Status Quick Look_C0_2025_v0.01.xlsx` - source document
- `NSITE Story Tracking.xlsx` - source document
- `ActionTracking_NSITE MO_C0_2026.xlsx` - source document

**Recommendation:** Create `raw-source-data/` folder to organize these, or archive

#### 4. stakeholder-mapping/ folder
**Location:** `C:\Users\cjtucke3\Documents\Personal\MO-development\stakeholder-mapping\`
**Contents:**
- `DB-Solution Stakeholder Lists/` - 47+ Excel files (source data for MO-DB_Needs)
- `MO-DB_Contacts_Cleaned.csv` - intermediate file

**Recommendation:** KEEP - this is source data for MO-DB_Needs extraction. Mark as "source archives"

#### 5. Legacy repositories
**Still present in MO-development/:**
- `nsite-implementation/` - old implementation repo
- `nsite-SEPViewer/` - old SEP viewer repo
- `snwg-automation/` - old automation scripts

**Recommendation:** These are migrated into nsite-mo-viewer. Consider archiving or removing.

#### 6. Within nsite-mo-viewer project
**Files that may be outdated:**

| File | Status | Recommendation |
|------|--------|----------------|
| `database-files/MO-DB_Milestones.csv` | Superseded - milestones now in MO-DB_Solutions | DELETE or move to data/ |
| `data/mo_db_needs.csv` (9 MB) | Current extraction output | KEEP |
| `src/` folder structure | Partially redundant with deploy/ | See note below |

---

## Proposed Clean Structure

### Option A: Minimal Cleanup (Conservative)

**DELETE:**
1. `database-templates/` folder (outdated)
2. `~$SolutionInformationDatabase_NSITE MO_C0_2025.xlsx` (temp file)
3. `nsite-mo-viewer/database-files/MO-DB_Milestones.csv` (superseded)
4. `database-files/MO-DB_Solutions.xlsx` (duplicate of MO-Viewer Databases version)

**KEEP AS-IS:**
- Everything else

### Option B: Moderate Cleanup (Recommended)

**DELETE:**
1. All items from Option A

**REORGANIZE in MO-development/:**
```
MO-development/
├── nsite-mo-viewer/           # Active project (keep as-is)
├── database-files/
│   └── MO-Viewer Databases/   # AUTHORITATIVE databases
│       ├── earthdata-*.json   # Move here
│       └── (all .xlsx files)
├── source-archives/           # NEW - rename stakeholder-mapping
│   ├── stakeholder-lists/     # The 47 Excel files
│   └── raw-exports/           # Move scattered CSVs/XLSX here
└── legacy-repos/              # NEW - optional
    ├── nsite-implementation/
    ├── nsite-SEPViewer/
    └── snwg-automation/
```

### Option C: Full Cleanup (Aggressive)

All of Option B, plus:

**ARCHIVE/DELETE:**
- `nsite-implementation/`
- `nsite-SEPViewer/`
- `snwg-automation/`

**SIMPLIFY nsite-mo-viewer:**
- Remove `src/` folder (deploy/ is the active code)
- Remove empty placeholder folders (parsers/, tests/)
- Keep only: deploy/, docs/, scripts/, data/, legacy/

---

## Alignment with Architecture

### Current Architecture Goals (from ARCHITECTURE.md v1.1.0)

1. **MO-Viewer is the unified platform** ✓
   - nsite-mo-viewer is the single active project
   - Legacy repos are fully migrated

2. **Database is a cache layer** ✓
   - MO-Viewer Databases/ contains Google Sheets copies
   - Sources of truth are the meeting notes documents

3. **Deploy/ folder is production-ready** ✓
   - 18 files ready for Apps Script deployment
   - This is the active codebase

### src/ vs deploy/ Clarification

The `src/` folder appears to be an earlier organizational structure that has evolved:
- **src/platform/** - Original modular structure
- **deploy/** - Current flat structure for Google Apps Script

**Reality:** Deploy/ is the active code. Consider:
- Keeping src/ as architectural reference
- OR removing src/ entirely since deploy/ is authoritative

---

## Recommended Actions

### Immediate (Low Risk)
1. [ ] Delete `database-templates/` folder
2. [ ] Delete temp file `~$SolutionInformationDatabase...xlsx`
3. [ ] Delete `database-files/MO-DB_Solutions.xlsx` (duplicate)
4. [ ] Delete `nsite-mo-viewer/database-files/MO-DB_Milestones.csv`

### Short-term (Moderate)
5. [ ] Move earthdata JSON/CSV files to MO-Viewer Databases/
6. [ ] Create `source-archives/` for raw data files
7. [ ] Update README to reflect clean structure

### Optional (Your Preference)
8. [ ] Archive or delete legacy repos (nsite-implementation, nsite-SEPViewer, snwg-automation)
9. [ ] Simplify nsite-mo-viewer by removing src/ or empty folders

---

## Questions for You

1. **Legacy repos** - Do you need nsite-implementation, nsite-SEPViewer, snwg-automation? Or can they be archived/deleted?

2. **Source data files** - Keep scattered Excel/CSV files for reference, or move to archive folder?

3. **src/ folder** - Keep as architectural reference or remove since deploy/ is active?

---

*Please review and let me know which cleanup option you prefer, or if you have different preferences.*
