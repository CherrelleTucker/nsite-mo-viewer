# MO-APIs Library

**Status:** Deployed and Active

Shared data access layer for MO-Viewer databases. This library provides consistent, centralized access to all MO-DB databases from any Google Apps Script project.

The NSITE-MO-Viewer project uses thin wrapper files that delegate to this library, enabling a single source of truth for all data access logic.

## Files

| File | Purpose |
|------|---------|
| `config-helpers.gs` | Configuration loading and database sheet access |
| `solutions-api.gs` | MO-DB_Solutions data access + solution name mapping |
| `contacts-api.gs` | MO-DB_Contacts queries (stakeholders, SEP pipeline) |
| `agencies-api.gs` | MO-DB_Agencies hierarchy and queries |
| `updates-api.gs` | MO-DB_Updates queries (solution updates) |
| `engagements-api.gs` | MO-DB_Engagements logging and queries |

## Setup

### 1. Create Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Create a new project named "MO-APIs Library"
3. Copy all `.gs` files from this folder into the project

### 2. Configure MO-DB_Config Sheet ID

1. In the Apps Script project, go to **Project Settings** (gear icon)
2. Scroll to **Script Properties**
3. Add property: `CONFIG_SHEET_ID` = `[your MO-DB_Config Google Sheet ID]`

### 3. Deploy as Library

1. Click **Deploy** > **New deployment**
2. Select type: **Library**
3. Add a description (e.g., "MO-APIs v1.0")
4. Click **Deploy**
5. Copy the **Script ID** shown

### 4. Add to Other Projects

In any project that needs to use the library:

1. In Apps Script editor, click **+** next to **Libraries**
2. Paste the Script ID from step 3
3. Select the latest version
4. Set an identifier (e.g., `MoApi`)
5. Click **Add**

## Usage

After adding the library, call functions with the library identifier prefix:

```javascript
// Using the library (identifier: MoApi)
var solutions = MoApi.getAllSolutions();
var contacts = MoApi.getContactsBySolution('HLS');
var updates = MoApi.getUpdatesBySolution('OPERA');

// Solution name matching (uses alternate_names from database)
var id = MoApi.getSolutionIdByName('Harmonized Landsat Sentinel-2'); // Returns 'HLS'
var ids = MoApi.findSolutionIdsInText('Working on HLS and VLM products'); // Returns ['HLS', 'VLM']
```

## Key Functions

### config-helpers.gs

```javascript
getConfigValue(key)           // Get config from MO-DB_Config
getDatabaseSheet(tableName)   // Get sheet by table name
initializeLibrary(configId)   // Set CONFIG_SHEET_ID
testLibraryConfig()           // Verify all databases accessible
```

### solutions-api.gs

```javascript
getAllSolutions()             // Get all solutions
getSolution(solutionId)       // Get by ID
searchSolutions(query)        // Full-text search

// Name mapping (reads alternate_names from database)
buildSolutionNameMap()        // Build lowercase name -> ID map
getSolutionIdByName(name)     // Look up ID by any name variant
findSolutionIdsInText(text)   // Find all solution mentions in text
```

### contacts-api.gs

```javascript
getAllContacts()              // Get all contacts
getContactsBySolution(name)   // Filter by solution
getUniqueContacts()           // Deduplicated by email
getMailingList(pattern)       // Email list for solutions

// SEP Pipeline
getContactsByTouchpoint(tp)   // Filter by touchpoint (T4-T8)
getTouchpointPipelineCounts() // Count by touchpoint
getSEPPipelineOverview()      // Full pipeline stats
```

### updates-api.gs

```javascript
getAllUpdates()               // Get all updates
getUpdatesBySolution(name)    // Filter by solution
getRecentUpdates(days)        // Recent across all solutions
getUpdatesStats()             // Statistics
```

## MO-DB_Config Required Keys

The library reads these keys from MO-DB_Config:

| Key | Database |
|-----|----------|
| `SOLUTIONS_SHEET_ID` | MO-DB_Solutions |
| `CONTACTS_SHEET_ID` | MO-DB_Contacts |
| `AGENCIES_SHEET_ID` | MO-DB_Agencies |
| `ENGAGEMENTS_SHEET_ID` | MO-DB_Engagements |
| `UPDATES_SHEET_ID` | MO-DB_Updates |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial library extraction from MO-Viewer |
