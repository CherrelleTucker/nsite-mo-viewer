/**
 * MO-Viewer Database Setup
 * =========================
 * Creates and initializes the Google Sheets database structure
 * for the MO-Viewer platform cache layer.
 *
 * Reference: docs/DATA_SCHEMA.md
 *
 * @fileoverview Database initialization and schema management
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Database sheet names and their column headers
 * Matches the schema defined in DATA_SCHEMA.md
 */
var DB_SCHEMA = {
  SOLUTIONS: {
    name: 'Solutions',
    headers: [
      'solution_id',      // Primary key
      'name',             // Display name
      'full_name',        // Full solution name
      'cycle',            // C1-C6
      'phase',            // Lifecycle phase
      'provider',         // Provider center
      'daac',             // Assigned DAAC
      'ownership',        // SEP ownership model
      'sep_poc',          // SEP Point of Contact
      'status_text',      // Current status
      'next_steps',       // Next steps
      'source_doc',       // Source document type
      'source_tab',       // Source tab name
      'last_updated',     // Last update timestamp
      'created_at'        // Creation timestamp
    ],
    keyColumn: 'solution_id'
  },

  STAKEHOLDERS: {
    name: 'Stakeholders',
    headers: [
      'stakeholder_id',       // Primary key
      'name',                 // Stakeholder name
      'organization',         // Organization
      'type',                 // Stakeholder type
      'region',               // Geographic region
      'touchpoint_status',    // Current touchpoint (T4-T8)
      'needs',                // JSON array of needs
      'barriers',             // JSON array of barriers
      'workflow',             // Workflow description
      'decision_context',     // Decision context
      'notes',                // Free-form notes
      'email',                // Contact email
      'last_contact',         // Last contact date
      'next_communication',   // Next scheduled contact
      'source_doc',           // Source document type
      'last_updated',         // Last update timestamp
      'created_at'            // Creation timestamp
    ],
    keyColumn: 'stakeholder_id'
  },

  STORIES: {
    name: 'Stories',
    headers: [
      'story_id',         // Primary key
      'title',            // Story title
      'solution_id',      // Foreign key to Solutions
      'status',           // Pipeline status
      'channel',          // Target channel
      'priority',         // Priority level
      'admin_priority',   // NASA admin priority
      'description',      // Story description
      'key_message',      // Key message
      'target_audience',  // Intended audience
      'scheduled_date',   // Target date
      'published_date',   // Actual date
      'url',              // Published URL
      'author',           // Story author
      'source_doc',       // Source document
      'last_updated',     // Last update timestamp
      'created_at'        // Creation timestamp
    ],
    keyColumn: 'story_id'
  },

  MILESTONES: {
    name: 'Milestones',
    headers: [
      'milestone_id',     // Primary key
      'solution_id',      // Foreign key to Solutions
      'type',             // Milestone type (IPA, ICD, F2I, OPS)
      'target_date',      // Target date
      'actual_date',      // Actual completion date
      'status',           // Status (pending, complete, delayed)
      'notes',            // Notes
      'source_tab',       // Source tab
      'last_updated',     // Last update timestamp
      'created_at'        // Creation timestamp
    ],
    keyColumn: 'milestone_id'
  },

  ACTIONS: {
    name: 'Actions',
    headers: [
      'action_id',        // Primary key
      'solution_id',      // Foreign key to Solutions (optional)
      'stakeholder_id',   // Foreign key to Stakeholders (optional)
      'story_id',         // Foreign key to Stories (optional)
      'description',      // Action description
      'owner',            // Action owner
      'due_date',         // Due date
      'status',           // Status (open, in_progress, closed)
      'source_doc',       // Source document
      'source_tab',       // Source tab
      'last_updated',     // Last update timestamp
      'created_at'        // Creation timestamp
    ],
    keyColumn: 'action_id'
  },

  UPDATE_HISTORY: {
    name: 'UpdateHistory',
    headers: [
      'history_id',       // Primary key
      'entity_type',      // solution, stakeholder, story, action
      'entity_id',        // Foreign key to entity
      'update_text',      // Update content
      'update_type',      // Type (milestone, action, general)
      'submitted_by',     // User email
      'source_doc',       // Target document
      'source_tab',       // Target tab
      'timestamp',        // Submission timestamp
      'created_at'        // Record creation timestamp
    ],
    keyColumn: 'history_id'
  },

  SOLUTION_STAKEHOLDERS: {
    name: 'SolutionStakeholders',
    headers: [
      'solution_id',      // Foreign key to Solutions
      'stakeholder_id',   // Foreign key to Stakeholders
      'role',             // Role in solution
      'engagement_level', // Engagement level
      'created_at'        // Creation timestamp
    ],
    keyColumn: null  // Composite key
  },

  CONFIG: {
    name: '_Config',
    headers: [
      'key',
      'value',
      'description',
      'last_updated'
    ],
    keyColumn: 'key'
  }
};

// ============================================================================
// DATABASE CREATION
// ============================================================================

/**
 * Create a new database spreadsheet with all required sheets
 * Run this once to initialize the database
 *
 * @returns {string} The ID of the created spreadsheet
 */
function createDatabase() {
  // Create new spreadsheet
  var ss = SpreadsheetApp.create('MO-Viewer Database');
  var ssId = ss.getId();

  Logger.log('Created database spreadsheet: ' + ssId);

  // Get the default sheet and rename it
  var sheets = ss.getSheets();
  var defaultSheet = sheets[0];

  // Create each table sheet
  var isFirst = true;
  for (var key in DB_SCHEMA) {
    var schema = DB_SCHEMA[key];

    var sheet;
    if (isFirst) {
      // Rename the default sheet
      defaultSheet.setName(schema.name);
      sheet = defaultSheet;
      isFirst = false;
    } else {
      // Create new sheet
      sheet = ss.insertSheet(schema.name);
    }

    // Set up headers
    setupSheetHeaders(sheet, schema.headers);

    Logger.log('Created sheet: ' + schema.name);
  }

  // Add initial config values
  initializeConfig(ss);

  // Store the database ID in script properties
  PropertiesService.getScriptProperties().setProperty('DATABASE_SHEET_ID', ssId);

  Logger.log('Database setup complete. ID: ' + ssId);
  Logger.log('Database URL: ' + ss.getUrl());

  return ssId;
}

/**
 * Set up sheet headers with formatting
 *
 * @param {Sheet} sheet - The sheet to set up
 * @param {string[]} headers - Array of column headers
 */
function setupSheetHeaders(sheet, headers) {
  // Set headers in first row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // Format headers
  headerRange
    .setFontWeight('bold')
    .setBackground('#0B3D91')  // NASA Blue
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center');

  // Freeze header row
  sheet.setFrozenRows(1);

  // Set column widths
  for (var i = 1; i <= headers.length; i++) {
    var width = getColumnWidth(headers[i - 1]);
    sheet.setColumnWidth(i, width);
  }
}

/**
 * Get recommended column width based on column name
 *
 * @param {string} columnName - Column header name
 * @returns {number} Width in pixels
 */
function getColumnWidth(columnName) {
  // Wider columns for text fields
  var wideColumns = ['description', 'status_text', 'next_steps', 'notes', 'update_text', 'key_message', 'workflow'];
  var mediumColumns = ['name', 'full_name', 'organization', 'title', 'author'];
  var narrowColumns = ['cycle', 'phase', 'type', 'status', 'priority', 'role'];

  if (wideColumns.indexOf(columnName) !== -1) return 300;
  if (mediumColumns.indexOf(columnName) !== -1) return 200;
  if (narrowColumns.indexOf(columnName) !== -1) return 100;

  // Default for IDs and dates
  if (columnName.indexOf('_id') !== -1) return 120;
  if (columnName.indexOf('date') !== -1 || columnName.indexOf('_at') !== -1) return 120;

  return 150;
}

/**
 * Initialize config sheet with default values
 *
 * @param {Spreadsheet} ss - The database spreadsheet
 */
function initializeConfig(ss) {
  var configSheet = ss.getSheetByName('_Config');
  if (!configSheet) return;

  var configValues = [
    ['schema_version', '1.0.0', 'Database schema version', new Date()],
    ['created_at', new Date().toISOString(), 'Database creation timestamp', new Date()],
    ['last_sync', '', 'Last data sync timestamp', new Date()],
    ['sync_enabled', 'true', 'Whether auto-sync is enabled', new Date()]
  ];

  if (configValues.length > 0) {
    configSheet.getRange(2, 1, configValues.length, 4).setValues(configValues);
  }
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

/**
 * Validate existing database matches expected schema
 * Useful after updates to ensure compatibility
 *
 * @param {string} ssId - Spreadsheet ID to validate
 * @returns {Object} Validation results
 */
function validateDatabaseSchema(ssId) {
  var ss = SpreadsheetApp.openById(ssId);
  var results = {
    valid: true,
    errors: [],
    warnings: []
  };

  for (var key in DB_SCHEMA) {
    var schema = DB_SCHEMA[key];
    var sheet = ss.getSheetByName(schema.name);

    if (!sheet) {
      results.valid = false;
      results.errors.push('Missing sheet: ' + schema.name);
      continue;
    }

    // Check headers
    var headers = sheet.getRange(1, 1, 1, schema.headers.length).getValues()[0];

    for (var i = 0; i < schema.headers.length; i++) {
      if (headers[i] !== schema.headers[i]) {
        results.valid = false;
        results.errors.push(
          schema.name + ': Column ' + (i + 1) +
          ' expected "' + schema.headers[i] +
          '" but found "' + headers[i] + '"'
        );
      }
    }
  }

  return results;
}

/**
 * Run schema migration if needed
 * Adds new columns, doesn't remove existing ones
 *
 * @param {string} ssId - Spreadsheet ID to migrate
 * @returns {Object} Migration results
 */
function migrateSchema(ssId) {
  var ss = SpreadsheetApp.openById(ssId);
  var results = {
    sheetsCreated: [],
    columnsAdded: [],
    errors: []
  };

  for (var key in DB_SCHEMA) {
    var schema = DB_SCHEMA[key];
    var sheet = ss.getSheetByName(schema.name);

    if (!sheet) {
      // Create missing sheet
      sheet = ss.insertSheet(schema.name);
      setupSheetHeaders(sheet, schema.headers);
      results.sheetsCreated.push(schema.name);
      continue;
    }

    // Check for missing columns
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    for (var i = 0; i < schema.headers.length; i++) {
      var expectedHeader = schema.headers[i];
      if (existingHeaders.indexOf(expectedHeader) === -1) {
        // Add missing column at the end
        var newCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, newCol).setValue(expectedHeader);
        results.columnsAdded.push(schema.name + '.' + expectedHeader);
      }
    }
  }

  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the database spreadsheet
 *
 * @returns {Spreadsheet} The database spreadsheet
 */
function getDatabase() {
  var ssId = PropertiesService.getScriptProperties().getProperty('DATABASE_SHEET_ID');
  if (!ssId) {
    throw new Error('Database not configured. Run createDatabase() first.');
  }
  return SpreadsheetApp.openById(ssId);
}

/**
 * Get a specific sheet from the database
 *
 * @param {string} tableName - Table name (e.g., 'Solutions')
 * @returns {Sheet} The sheet
 */
function getTable(tableName) {
  var ss = getDatabase();
  var sheet = ss.getSheetByName(tableName);
  if (!sheet) {
    throw new Error('Table not found: ' + tableName);
  }
  return sheet;
}

/**
 * Clear all data from a table (keeps headers)
 *
 * @param {string} tableName - Table name
 */
function clearTable(tableName) {
  var sheet = getTable(tableName);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  Logger.log('Cleared table: ' + tableName);
}

/**
 * Get row count for a table (excluding header)
 *
 * @param {string} tableName - Table name
 * @returns {number} Number of data rows
 */
function getTableRowCount(tableName) {
  var sheet = getTable(tableName);
  return Math.max(0, sheet.getLastRow() - 1);
}

/**
 * Log database statistics
 */
function logDatabaseStats() {
  var stats = {};

  for (var key in DB_SCHEMA) {
    var schema = DB_SCHEMA[key];
    try {
      stats[schema.name] = getTableRowCount(schema.name);
    } catch (e) {
      stats[schema.name] = 'Error: ' + e.message;
    }
  }

  Logger.log('Database Statistics:');
  for (var table in stats) {
    Logger.log('  ' + table + ': ' + stats[table] + ' rows');
  }

  return stats;
}
