/**
 * Sync Actions to Database
 * =========================
 * Container-bound script for MO-DB_Actions Google Sheet
 * Pulls action items from source agenda documents into the database
 *
 * SETUP:
 * 1. Open MO-DB_Actions Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this code
 * 4. Add MO-APIs Library (identifier: MoApi) - uses API_LIBRARY_ID from config
 * 5. Set CONFIG_SHEET_ID in Script Properties (points to MO-DB_Config)
 * 6. Add document IDs to MO-DB_Config:
 *    - INTERNAL_AGENDA_ID
 *    - SEP_AGENDA_ID
 *    - OPERA_MONTHLY_ID (optional)
 *    - PBL_MONTHLY_ID (optional)
 * 7. Set up time-based trigger for syncAllActions()
 *
 * @fileoverview Centralized action sync from multiple source documents
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Source document configuration
 * Add new sources here as needed
 * configKey must match a key in MO-DB_Config
 */
var ACTION_SOURCES = {
  'internal': {
    configKey: 'INTERNAL_AGENDA_ID',
    category: 'MO',
    displayName: 'Internal Planning'
  },
  'sep': {
    configKey: 'SEP_AGENDA_ID',
    category: 'SEP',
    displayName: 'SEP Strategy'
  },
  'opera': {
    configKey: 'OPERA_MONTHLY_ID',
    category: 'OPERA',
    displayName: 'OPERA Monthly'
  },
  'pbl': {
    configKey: 'PBL_MONTHLY_ID',
    category: 'PBL',
    displayName: 'PBL Monthly'
  }
};

// Cache for config values
var _configCache = null;

// ============================================================================
// MAIN SYNC FUNCTIONS
// ============================================================================

/**
 * Main entry point - sync actions from all configured sources
 * Call this from a time-based trigger
 */
function syncAllActions() {
  var results = {
    sources: [],
    totalNew: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    errors: []
  };

  for (var sourceKey in ACTION_SOURCES) {
    try {
      var result = syncActionsFromSource(sourceKey);
      results.sources.push({
        source: sourceKey,
        ...result
      });
      results.totalNew += result.newActions;
      results.totalUpdated += result.updatedActions;
      results.totalSkipped += result.skippedActions;
    } catch (error) {
      results.errors.push({
        source: sourceKey,
        error: error.message
      });
      Logger.log('Error syncing ' + sourceKey + ': ' + error);
    }
  }

  // Log summary
  Logger.log('Sync complete: ' + results.totalNew + ' new, ' +
             results.totalUpdated + ' updated, ' +
             results.totalSkipped + ' skipped, ' +
             results.errors.length + ' errors');

  return results;
}

/**
 * Sync actions from a specific source
 * @param {string} sourceKey - Key from ACTION_SOURCES
 * @returns {Object} Sync results
 */
function syncActionsFromSource(sourceKey) {
  var source = ACTION_SOURCES[sourceKey];
  if (!source) {
    throw new Error('Unknown source: ' + sourceKey);
  }

  var docId = getConfigValue_(source.configKey);
  if (!docId) {
    Logger.log('No document ID configured for ' + sourceKey + ' (' + source.configKey + ')');
    return { newActions: 0, updatedActions: 0, skippedActions: 0, message: 'Not configured' };
  }

  Logger.log('Syncing actions from ' + source.displayName + '...');

  var doc = DocumentApp.openById(docId);
  var docUrl = 'https://docs.google.com/document/d/' + docId;

  // Find the action items table
  var tableInfo = findActionTableInDoc_(doc);
  if (!tableInfo.found) {
    Logger.log('No action table found in ' + source.displayName);
    return { newActions: 0, updatedActions: 0, skippedActions: 0, message: 'No action table found' };
  }

  // Parse actions from table
  var actions = parseActionTable_(tableInfo.table, {
    sourceDocument: source.displayName,
    sourceUrl: docUrl,
    category: source.category
  });

  Logger.log('Found ' + actions.length + ' actions in ' + source.displayName);

  // Sync to database
  return syncActionsToDatabase_(actions);
}

/**
 * Manual sync from Internal Agenda only
 */
function syncFromInternalAgenda() {
  return syncActionsFromSource('internal');
}

/**
 * Manual sync from SEP Agenda only
 */
function syncFromSEPAgenda() {
  return syncActionsFromSource('sep');
}

// ============================================================================
// TABLE PARSING
// ============================================================================

/**
 * Find the Action Items table in a document
 * Checks tabs first, then main body
 * @param {Document} doc - Google Doc
 * @returns {Object} { found: boolean, table: Table }
 */
function findActionTableInDoc_(doc) {
  // Try tabs first (newer docs have tabs)
  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      // Look for "Action Items" tab first
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabTitle = tab.getTitle();
        if (tabTitle && tabTitle.toLowerCase().includes('action')) {
          var result = findTableWithActionColumns_(tab.asDocumentTab().getBody());
          if (result.found) {
            Logger.log('Found action table in tab: ' + tabTitle);
            return result;
          }
        }
      }
      // Check all tabs
      for (var i = 0; i < tabs.length; i++) {
        var result = findTableWithActionColumns_(tabs[i].asDocumentTab().getBody());
        if (result.found) {
          return result;
        }
      }
    }
  } catch (e) {
    // Tabs API not available, fall through
  }

  // Fallback to main body
  return findTableWithActionColumns_(doc.getBody());
}

/**
 * Find a table with Status, Owner, Action columns
 * @param {Body} body - Document body
 * @returns {Object} { found: boolean, table: Table }
 */
function findTableWithActionColumns_(body) {
  var tables = body.getTables();

  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    if (table.getNumRows() > 0) {
      var headerRow = table.getRow(0);
      var headerText = '';
      for (var c = 0; c < headerRow.getNumCells(); c++) {
        headerText += headerRow.getCell(c).getText().toLowerCase() + ' ';
      }
      // Look for tables with action-related headers
      if ((headerText.includes('status') || headerText.includes('complete')) &&
          (headerText.includes('owner') || headerText.includes('assigned')) &&
          (headerText.includes('action') || headerText.includes('task'))) {
        return { found: true, table: table };
      }
    }
  }
  return { found: false };
}

/**
 * Parse actions from a table
 * @param {Table} table - Google Docs table
 * @param {Object} sourceInfo - Source metadata
 * @returns {Array} Array of action objects
 */
function parseActionTable_(table, sourceInfo) {
  var actions = [];
  var numRows = table.getNumRows();

  if (numRows < 2) return actions;

  // Parse header row
  var headerRow = table.getRow(0);
  var colMap = {};

  for (var c = 0; c < headerRow.getNumCells(); c++) {
    var header = headerRow.getCell(c).getText().toLowerCase().trim();
    if (header.includes('status') || header.includes('complete')) {
      colMap.status = c;
    }
    if (header.includes('owner') || header.includes('assigned')) {
      colMap.owner = c;
    }
    if ((header.includes('action') || header.includes('task')) &&
        !header.includes('source')) {
      colMap.action = c;
    }
    if (header.includes('due') || header.includes('date')) {
      colMap.dueDate = c;
    }
    if (header.includes('note') || header.includes('comment')) {
      colMap.notes = c;
    }
    if (header.includes('solution') || header.includes('project')) {
      colMap.solution = c;
    }
  }

  // Validate required columns
  if (colMap.action === undefined) {
    Logger.log('Could not find action/task column');
    return actions;
  }

  // Parse data rows
  for (var r = 1; r < numRows; r++) {
    var row = table.getRow(r);

    var taskText = colMap.action !== undefined ?
                   row.getCell(colMap.action).getText().trim() : '';

    // Skip empty rows
    if (!taskText || taskText.length < 3) continue;

    var action = {
      task: taskText,
      assigned_to: colMap.owner !== undefined ?
                   row.getCell(colMap.owner).getText().trim() : '',
      status: colMap.status !== undefined ?
              normalizeStatus_(row.getCell(colMap.status).getText().trim()) : 'not_started',
      due_date: colMap.dueDate !== undefined ?
                parseDateFromCell_(row.getCell(colMap.dueDate).getText().trim()) : '',
      notes: colMap.notes !== undefined ?
             row.getCell(colMap.notes).getText().trim() : '',
      solution: colMap.solution !== undefined ?
                row.getCell(colMap.solution).getText().trim() : '',
      source_document: sourceInfo.sourceDocument,
      source_url: sourceInfo.sourceUrl,
      category: sourceInfo.category,
      source_date: new Date().toISOString().split('T')[0]
    };

    // If no solution specified, try to detect from task text
    if (!action.solution) {
      action.solution = detectSolutionFromText_(action.task) || sourceInfo.category;
    }

    actions.push(action);
  }

  return actions;
}

/**
 * Normalize status text to standard values
 * @param {string} statusText - Raw status text
 * @returns {string} Normalized status
 */
function normalizeStatus_(statusText) {
  var text = statusText.toLowerCase();

  if (text === '' || text === 'not started' || text === 'new' || text === 'open') {
    return 'not_started';
  }
  if (text === 'done' || text === 'complete' || text === 'completed' || text === 'closed') {
    return 'done';
  }
  if (text === 'in progress' || text === 'in-progress' || text === 'working' || text === 'started') {
    return 'in_progress';
  }
  if (text === 'blocked' || text === 'waiting' || text === 'on hold') {
    return 'blocked';
  }
  if (text === 'pending' || text === 'review') {
    return 'pending';
  }

  return 'not_started';
}

/**
 * Try to parse a date from cell text
 * @param {string} text - Date text
 * @returns {string} ISO date string or empty
 */
function parseDateFromCell_(text) {
  if (!text) return '';

  try {
    var date = new Date(text);
    if (!isNaN(date.getTime())) {
      return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  } catch (e) {
    // Parse failed
  }

  return '';
}

/**
 * Try to detect solution name from task text
 * Uses MoApi library (findSolutionIdsInText) which reads from the database
 * @param {string} text - Task text
 * @returns {string|null} Solution ID or null
 */
function detectSolutionFromText_(text) {
  if (!text) return null;

  // Use the MoApi library function
  // This reads solution names from the database (including alternate_names)
  var foundIds = MoApi.findSolutionIdsInText(text);

  // Return the first match, or null if none found
  return foundIds.length > 0 ? foundIds[0] : null;
}

// ============================================================================
// DATABASE SYNC
// ============================================================================

/**
 * Sync parsed actions to the database
 * @param {Array} actions - Parsed action objects
 * @returns {Object} Sync results
 */
function syncActionsToDatabase_(actions) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Build column index map
  var colIndex = {};
  for (var i = 0; i < headers.length; i++) {
    colIndex[headers[i]] = i;
  }

  // Build existing actions lookup by task text + assigned_to
  var existingActions = {};
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var key = createActionKey_(
      row[colIndex['task']] || '',
      row[colIndex['assigned_to']] || ''
    );
    existingActions[key] = {
      rowIndex: r + 1, // 1-indexed
      data: row
    };
  }

  var results = {
    newActions: 0,
    updatedActions: 0,
    skippedActions: 0
  };

  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];
    var key = createActionKey_(action.task, action.assigned_to);

    if (existingActions[key]) {
      // Action exists - check if update needed
      var existing = existingActions[key];
      var existingStatus = existing.data[colIndex['status']] || '';

      // Update if status changed (and new status is more "complete")
      if (shouldUpdateStatus_(existingStatus, action.status)) {
        updateActionRow_(sheet, existing.rowIndex, colIndex, action);
        results.updatedActions++;
      } else {
        results.skippedActions++;
      }
    } else {
      // New action
      appendNewAction_(sheet, headers, action);
      results.newActions++;
    }
  }

  return results;
}

/**
 * Create a key for action deduplication
 * @param {string} task - Task text
 * @param {string} assignee - Assigned to
 * @returns {string} Key
 */
function createActionKey_(task, assignee) {
  // Normalize for comparison
  var normalizedTask = (task || '').toLowerCase().trim().substring(0, 100);
  var normalizedAssignee = (assignee || '').toLowerCase().trim();
  return normalizedTask + '|' + normalizedAssignee;
}

/**
 * Determine if status should be updated
 * @param {string} existingStatus - Current status in DB
 * @param {string} newStatus - Status from source doc
 * @returns {boolean} True if should update
 */
function shouldUpdateStatus_(existingStatus, newStatus) {
  // Status priority (higher = more "done")
  var priority = {
    'not_started': 1,
    'pending': 2,
    'in_progress': 3,
    'blocked': 2,
    'done': 4
  };

  var existingPriority = priority[existingStatus] || 1;
  var newPriority = priority[newStatus] || 1;

  // Update if new status is more progressed
  return newPriority > existingPriority;
}

/**
 * Update an existing action row
 */
function updateActionRow_(sheet, rowIndex, colIndex, action) {
  var timestamp = new Date().toISOString();

  if (colIndex['status'] !== undefined) {
    sheet.getRange(rowIndex, colIndex['status'] + 1).setValue(action.status);
  }
  if (colIndex['updated_at'] !== undefined) {
    sheet.getRange(rowIndex, colIndex['updated_at'] + 1).setValue(timestamp);
  }

  Logger.log('Updated action: ' + (action.task || '').substring(0, 50));
}

/**
 * Append a new action row
 */
function appendNewAction_(sheet, headers, action) {
  var timestamp = new Date().toISOString();
  var actionId = generateActionId_();

  var newRow = headers.map(function(header) {
    switch (header) {
      case 'action_id': return actionId;
      case 'source_document': return action.source_document || '';
      case 'source_date': return action.source_date || '';
      case 'source_url': return action.source_url || '';
      case 'category': return action.category || 'MO';
      case 'solution': return action.solution || action.category || 'MO';
      case 'status': return action.status || 'not_started';
      case 'assigned_to': return action.assigned_to || '';
      case 'task': return action.task || '';
      case 'due_date': return action.due_date || '';
      case 'priority': return 'medium';
      case 'notes': return action.notes || '';
      case 'created_at': return timestamp;
      case 'updated_at': return timestamp;
      case 'created_by': return 'sync';
      default: return '';
    }
  });

  sheet.appendRow(newRow);
  Logger.log('Added new action: ' + (action.task || '').substring(0, 50));
}

/**
 * Generate a unique action ID
 */
function generateActionId_() {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var random = Math.floor(Math.random() * 9000) + 1000;
  return 'ACT_' + dateStr + '_' + random;
}

// ============================================================================
// CONFIG SHEET ACCESS
// ============================================================================

/**
 * Load all config values from MO-DB_Config sheet
 * Caches results for the duration of the script execution
 * @returns {Object} Key-value map of config settings
 */
function loadConfigFromSheet_() {
  if (_configCache !== null) {
    return _configCache;
  }

  var configSheetId = PropertiesService.getScriptProperties().getProperty('CONFIG_SHEET_ID');
  if (!configSheetId) {
    Logger.log('CONFIG_SHEET_ID not set in Script Properties');
    return {};
  }

  try {
    var ss = SpreadsheetApp.openById(configSheetId);
    var sheet = ss.getSheetByName('Config') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    _configCache = {};

    // Skip header row, read key-value pairs
    for (var i = 1; i < data.length; i++) {
      var key = data[i][0];
      var value = data[i][1];
      if (key) {
        _configCache[key] = value || '';
      }
    }

    return _configCache;
  } catch (error) {
    Logger.log('Error loading config sheet: ' + error);
    return {};
  }
}

/**
 * Get a config value from MO-DB_Config sheet
 * @param {string} key - Config key name
 * @returns {string} Config value or empty string
 */
function getConfigValue_(key) {
  var config = loadConfigFromSheet_();
  return config[key] || '';
}

// ============================================================================
// MENU & SETUP
// ============================================================================

/**
 * Create custom menu when sheet opens
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Action Sync')
    .addItem('Sync All Sources', 'syncAllActions')
    .addSeparator()
    .addItem('Sync Internal Agenda', 'syncFromInternalAgenda')
    .addItem('Sync SEP Agenda', 'syncFromSEPAgenda')
    .addItem('Sync OPERA Monthly', 'syncFromOPERA')
    .addItem('Sync PBL Monthly', 'syncFromPBL')
    .addSeparator()
    .addItem('Show Configuration Status', 'showConfigStatus')
    .addToUi();
}

/**
 * Manual sync from OPERA Monthly
 */
function syncFromOPERA() {
  return syncActionsFromSource('opera');
}

/**
 * Manual sync from PBL Monthly
 */
function syncFromPBL() {
  return syncActionsFromSource('pbl');
}

/**
 * Show current configuration status
 */
function showConfigStatus() {
  var config = loadConfigFromSheet_();
  var status = [];

  for (var sourceKey in ACTION_SOURCES) {
    var source = ACTION_SOURCES[sourceKey];
    var docId = config[source.configKey] || '';
    var configured = docId ? 'Configured' : 'Not configured';
    status.push(source.displayName + ': ' + configured);
    if (docId) {
      status.push('  ID: ' + docId.substring(0, 20) + '...');
    }
  }

  var ui = SpreadsheetApp.getUi();
  ui.alert('Configuration Status',
    'Source documents (from MO-DB_Config):\n\n' + status.join('\n') +
    '\n\nTo configure, add document IDs to MO-DB_Config sheet.',
    ui.ButtonSet.OK);
}
