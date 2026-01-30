/**
 * Sync Actions from Agenda Documents
 * ===================================
 * Container-bound script for MO-DB_Actions
 *
 * Pulls action items from Internal Planning and SEP agenda documents
 * and syncs them to this spreadsheet.
 *
 * Setup:
 * 1. Bind this script to MO-DB_Actions spreadsheet
 * 2. Add MO-APIs Library (identifier: MoApi) - uses API_LIBRARY_ID from config
 * 3. Set Script Properties:
 *    - CONFIG_SHEET_ID: ID of MO-DB_Config spreadsheet
 * 4. Ensure MO-DB_Config has:
 *    - INTERNAL_AGENDA_ID: Google Doc ID for Internal Planning Meeting
 *    - SEP_AGENDA_ID: Google Doc ID for SEP Meeting
 * 5. Run syncAllActions() or use the menu
 */

// ============================================================================
// CONFIG
// ============================================================================

var _configCache = null;

/**
 * Load config values from MO-DB_Config sheet
 */
function loadConfig_() {
  if (_configCache) return _configCache;

  var configSheetId = PropertiesService.getScriptProperties().getProperty('CONFIG_SHEET_ID');
  if (!configSheetId) {
    throw new Error('CONFIG_SHEET_ID not set in Script Properties');
  }

  try {
    var ss = SpreadsheetApp.openById(configSheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    _configCache = {};
    for (var i = 1; i < data.length; i++) {
      var key = data[i][0];
      var value = data[i][1];
      if (key) {
        _configCache[key] = value || '';
      }
    }

    return _configCache;
  } catch (e) {
    throw new Error('Cannot read config sheet: ' + e.message);
  }
}

/**
 * Get a config value
 */
function getConfigValue_(key) {
  var config = loadConfig_();
  return config[key] || '';
}

// ============================================================================
// MENU
// ============================================================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Actions')
    .addItem('Pull from Internal Agenda', 'syncInternalActions')
    .addItem('Pull from SEP Agenda', 'syncSepActions')
    .addItem('Pull All', 'syncAllActions')
    .addSeparator()
    .addItem('Push All Statuses to Agendas', 'pushAllStatusesToAgendas')
    .addSeparator()
    .addItem('Verify Connections', 'verifyConnections')
    .addToUi();
}

// ============================================================================
// MAIN SYNC FUNCTIONS
// ============================================================================

/**
 * Sync actions from both agendas
 */
function syncAllActions() {
  var ui = SpreadsheetApp.getUi();
  var results = [];

  try {
    var internalCount = syncInternalActions_(false);
    results.push('Internal: ' + internalCount + ' actions synced');
  } catch (e) {
    results.push('Internal: Error - ' + e.message);
  }

  try {
    var sepCount = syncSepActions_(false);
    results.push('SEP: ' + sepCount + ' actions synced');
  } catch (e) {
    results.push('SEP: Error - ' + e.message);
  }

  ui.alert('Sync Complete', results.join('\n'), ui.ButtonSet.OK);
}

/**
 * Sync from Internal Planning agenda only
 */
function syncInternalActions() {
  var ui = SpreadsheetApp.getUi();
  try {
    var count = syncInternalActions_(true);
    ui.alert('Sync Complete', 'Synced ' + count + ' actions from Internal Planning agenda.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Sync Error', 'Failed to sync Internal agenda:\n' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Sync from SEP agenda only
 */
function syncSepActions() {
  var ui = SpreadsheetApp.getUi();
  try {
    var count = syncSepActions_(true);
    ui.alert('Sync Complete', 'Synced ' + count + ' actions from SEP agenda.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Sync Error', 'Failed to sync SEP agenda:\n' + e.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// VERIFY CONNECTIONS
// ============================================================================

/**
 * Verify that config and agenda documents are accessible
 */
function verifyConnections() {
  var ui = SpreadsheetApp.getUi();
  var results = [];

  // Check Config Sheet
  var configSheetId = PropertiesService.getScriptProperties().getProperty('CONFIG_SHEET_ID');
  if (!configSheetId) {
    ui.alert('Setup Required', 'CONFIG_SHEET_ID not set in Script Properties.\n\nGo to: File > Project properties > Script properties', ui.ButtonSet.OK);
    return;
  }

  try {
    var config = loadConfig_();
    results.push('✅ Config Sheet: Connected');
    results.push('');
  } catch (e) {
    ui.alert('Config Error', 'Cannot read config sheet:\n' + e.message, ui.ButtonSet.OK);
    return;
  }

  // Check Internal Agenda
  var internalId = getConfigValue_('INTERNAL_AGENDA_ID');
  if (!internalId) {
    results.push('❌ INTERNAL_AGENDA_ID: Not set in config');
  } else {
    try {
      var doc = DocumentApp.openById(internalId);
      var title = doc.getName();
      var tableInfo = findActionTable_(doc);
      if (tableInfo.found) {
        results.push('✅ Internal Agenda: ' + title);
        if (tableInfo.tabName) {
          results.push('   → Tab: "' + tableInfo.tabName + '"');
        }
        results.push('   → Found Action Items table with ' + tableInfo.rows + ' rows');
      } else {
        results.push('⚠️ Internal Agenda: ' + title);
        results.push('   → Action Items table not found (checked all tabs)');
      }
    } catch (e) {
      results.push('❌ Internal Agenda: Cannot open - ' + e.message);
    }
  }

  results.push('');

  // Check SEP Agenda
  var sepId = getConfigValue_('SEP_AGENDA_ID');
  if (!sepId) {
    results.push('❌ SEP_AGENDA_ID: Not set in config');
  } else {
    try {
      var doc = DocumentApp.openById(sepId);
      var title = doc.getName();
      var tableInfo = findActionTable_(doc);
      if (tableInfo.found) {
        results.push('✅ SEP Agenda: ' + title);
        if (tableInfo.tabName) {
          results.push('   → Tab: "' + tableInfo.tabName + '"');
        }
        results.push('   → Found Action Items table with ' + tableInfo.rows + ' rows');
      } else {
        results.push('⚠️ SEP Agenda: ' + title);
        results.push('   → Action Items table not found (checked all tabs)');
      }
    } catch (e) {
      results.push('❌ SEP Agenda: Cannot open - ' + e.message);
    }
  }

  ui.alert('Connection Status', results.join('\n'), ui.ButtonSet.OK);
}

// ============================================================================
// SYNC IMPLEMENTATION
// ============================================================================

function syncInternalActions_(silent) {
  var docId = getConfigValue_('INTERNAL_AGENDA_ID');

  if (!docId) {
    throw new Error('INTERNAL_AGENDA_ID not set in MO-DB_Config');
  }

  return syncFromDocument_(docId, 'MO', 'Internal Planning');
}

function syncSepActions_(silent) {
  var docId = getConfigValue_('SEP_AGENDA_ID');

  if (!docId) {
    throw new Error('SEP_AGENDA_ID not set in MO-DB_Config');
  }

  return syncFromDocument_(docId, 'SEP', 'SEP Meeting');
}

/**
 * Sync actions from a specific Google Doc
 */
function syncFromDocument_(docId, category, docName) {
  var doc = DocumentApp.openById(docId);
  var tableInfo = findActionTable_(doc);

  if (!tableInfo.found) {
    Logger.log('Action Items table not found in ' + docName);
    return 0;
  }

  var actions = parseActionTable_(tableInfo.table, category, docName, docId);
  Logger.log('Parsed ' + actions.length + ' actions from ' + docName);

  var count = 0;
  actions.forEach(function(action) {
    if (upsertAction_(action)) {
      count++;
    }
  });

  Logger.log('Synced ' + count + ' actions from ' + docName);
  return count;
}

/**
 * Find the Action Items table in a document
 * Checks both main body and document tabs (for newer Google Docs with tabs)
 */
function findActionTable_(doc) {
  // First, try to find "Action Items" tab (Google Docs tabs feature)
  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabTitle = tab.getTitle();

        // Look for tab named "Action Items" or similar
        if (tabTitle && tabTitle.toLowerCase().indexOf('action') !== -1) {
          Logger.log('Found tab: ' + tabTitle);
          var tabBody = tab.asDocumentTab().getBody();
          var result = findTableInBody_(tabBody);
          if (result.found) {
            result.tabName = tabTitle;
            return result;
          }
        }
      }

      // If no Action Items tab found, check all tabs for the table
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabBody = tab.asDocumentTab().getBody();
        var result = findTableInBody_(tabBody);
        if (result.found) {
          result.tabName = tab.getTitle();
          return result;
        }
      }
    }
  } catch (e) {
    Logger.log('Tabs API not available or error: ' + e.message);
  }

  // Fallback: check main document body (for docs without tabs)
  var body = doc.getBody();
  return findTableInBody_(body);
}

/**
 * Find action items table in a document body
 */
function findTableInBody_(body) {
  var tables = body.getTables();

  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    if (table.getNumRows() > 0) {
      var headerRow = table.getRow(0);
      var headerText = '';
      for (var c = 0; c < headerRow.getNumCells(); c++) {
        headerText += headerRow.getCell(c).getText().toLowerCase() + ' ';
      }

      // Look for Status, Owner, Action columns
      if (headerText.indexOf('status') !== -1 &&
          headerText.indexOf('owner') !== -1 &&
          headerText.indexOf('action') !== -1) {
        return {
          found: true,
          table: table,
          rows: table.getNumRows() - 1 // Exclude header
        };
      }
    }
  }

  return { found: false };
}

/**
 * Parse an action items table
 */
function parseActionTable_(table, category, docName, docId) {
  var actions = [];
  var numRows = table.getNumRows();

  if (numRows < 2) return actions;

  // Parse header row to find column indices
  var headerRow = table.getRow(0);
  var colMap = {};
  for (var c = 0; c < headerRow.getNumCells(); c++) {
    var header = headerRow.getCell(c).getText().toLowerCase().trim();
    if (header.indexOf('status') !== -1) colMap.status = c;
    if (header.indexOf('owner') !== -1) colMap.owner = c;
    if (header.indexOf('action') !== -1 && header.indexOf('source') === -1) colMap.action = c;
    if (header.indexOf('source') !== -1) colMap.source = c;
  }

  if (colMap.action === undefined) {
    Logger.log('Could not find Action column');
    return actions;
  }

  // Parse data rows
  for (var r = 1; r < numRows; r++) {
    var row = table.getRow(r);

    var status = colMap.status !== undefined ? row.getCell(colMap.status).getText().trim() : '';
    var owner = colMap.owner !== undefined ? row.getCell(colMap.owner).getText().trim() : '';
    var task = colMap.action !== undefined ? row.getCell(colMap.action).getText().trim() : '';
    var sourceTab = colMap.source !== undefined ? row.getCell(colMap.source).getText().trim() : '';

    if (!task) continue;

    // Try to detect solution from task text
    var solution = detectSolution_(task, category);

    actions.push({
      source_document: docName,
      source_date: parseSourceTab_(sourceTab),
      source_url: 'https://docs.google.com/document/d/' + docId,
      category: category,
      solution_id: solution,
      status: normalizeStatus_(status),
      assigned_to: owner,
      task: task,
      due_date: '',
      priority: 'medium',
      notes: ''
    });
  }

  return actions;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Upsert an action (insert or update)
 * Matches on task + assigned_to + category to avoid duplicates
 */
function upsertAction_(actionData) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Find column indices
  var cols = {};
  headers.forEach(function(h, i) { cols[h] = i; });

  // Check for existing action
  var existingRow = -1;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[cols.task] === actionData.task &&
        row[cols.assigned_to] === actionData.assigned_to &&
        row[cols.category] === actionData.category) {
      existingRow = i + 1; // 1-indexed
      break;
    }
  }

  if (existingRow > 0) {
    // Update status if different
    var currentStatus = data[existingRow - 1][cols.status];
    if (currentStatus !== actionData.status) {
      sheet.getRange(existingRow, cols.status + 1).setValue(actionData.status);
      sheet.getRange(existingRow, cols.updated_at + 1).setValue(new Date().toISOString());
      return true;
    }
    return false; // No change needed
  }

  // Insert new action
  var timestamp = new Date().toISOString();
  var newRow = headers.map(function(h) {
    switch (h) {
      case 'action_id': return generateActionId_();
      case 'source_document': return actionData.source_document || '';
      case 'source_date': return actionData.source_date || '';
      case 'source_url': return actionData.source_url || '';
      case 'category': return actionData.category || '';
      case 'solution_id': return actionData.solution_id || actionData.category || '';
      case 'status': return actionData.status || 'not_started';
      case 'assigned_to': return actionData.assigned_to || '';
      case 'task': return actionData.task || '';
      case 'due_date': return actionData.due_date || '';
      case 'priority': return actionData.priority || 'medium';
      case 'notes': return actionData.notes || '';
      case 'created_at': return timestamp;
      case 'updated_at': return timestamp;
      case 'created_by': return 'sync_script';
      default: return '';
    }
  });

  sheet.appendRow(newRow);
  return true;
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeStatus_(status) {
  if (!status) return 'not_started';
  var s = status.toLowerCase().trim();

  if (s === 'done') return 'done';
  if (s === 'in progress') return 'in_progress';
  if (s === 'pending') return 'pending';
  if (s === 'not started') return 'not_started';

  return 'not_started';
}

/**
 * Detect solution name from task text
 * Uses MoApi library (findSolutionIdsInText) which reads from the database
 * Returns solution ID if found, otherwise returns category default
 */
function detectSolution_(taskText, category) {
  if (!taskText) return category;

  // Use the MoApi library function
  // This reads solution names from the database (including alternate_names)
  var foundIds = [];
  try {
    foundIds = MoApi.findSolutionIdsInText(taskText);
  } catch (e) {
    Logger.log('MoApi library not available or error: ' + e.message);
    foundIds = [];
  }

  if (foundIds.length > 0) {
    return foundIds[0];
  }

  // No solution found - return category as default
  // Map category to delegation group
  var defaultMap = {
    'MO': 'MO',
    'SEP': 'SEP',
    'Implementation': 'Impl',
    'Comms': 'Comms'
  };

  return defaultMap[category] || category;
}

function parseSourceTab_(sourceTab) {
  if (!sourceTab) return '';

  // Format: MM_DD (e.g., 12_08)
  var match = sourceTab.match(/^(\d{1,2})_(\d{1,2})$/);
  if (match) {
    var month = match[1].padStart(2, '0');
    var day = match[2].padStart(2, '0');
    var year = new Date().getFullYear();
    var currentMonth = new Date().getMonth() + 1;
    // If month is significantly ahead, assume previous year
    if (parseInt(month, 10) > currentMonth + 1) {
      year = year - 1;
    }
    return year + '-' + month + '-' + day;
  }

  return sourceTab;
}

function generateActionId_() {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var random = Math.floor(Math.random() * 9000) + 1000;
  return 'ACT_' + dateStr + '_' + random;
}

// ============================================================================
// PUSH STATUS CHANGES TO AGENDA DOCUMENTS
// ============================================================================

/**
 * Trigger function - runs when spreadsheet is edited
 * Pushes status changes back to source agenda documents
 */
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;

  // Only process edits to status column
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var statusCol = headers.indexOf('status') + 1;

  if (range.getColumn() !== statusCol) return;
  if (range.getRow() === 1) return; // Skip header row

  // Get the action data for this row
  var row = range.getRow();
  var data = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  var action = {};
  headers.forEach(function(h, i) {
    action[h] = data[i];
  });

  // Push the status change to the source document
  try {
    pushStatusToAgenda_(action);
  } catch (err) {
    Logger.log('Failed to push status to agenda: ' + err);
  }
}

/**
 * Push a status change back to the source agenda document
 */
function pushStatusToAgenda_(action) {
  if (!action.source_url) {
    Logger.log('No source URL for action: ' + action.action_id);
    return false;
  }

  // Extract doc ID from source URL
  var match = action.source_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    Logger.log('Invalid source URL: ' + action.source_url);
    return false;
  }

  var docId = match[1];

  try {
    var doc = DocumentApp.openById(docId);
    var tableInfo = findActionTable_(doc);

    if (!tableInfo.found) {
      Logger.log('Action Items table not found in source document');
      return false;
    }

    // Find and update the matching row
    var updated = updateActionInTable_(tableInfo.table, action);

    if (updated) {
      Logger.log('Pushed status "' + action.status + '" to agenda for: ' + action.task.substring(0, 50));
    }

    return updated;
  } catch (err) {
    Logger.log('Error pushing to agenda: ' + err);
    return false;
  }
}

/**
 * Find and update an action's status in the table
 */
function updateActionInTable_(table, action) {
  var numRows = table.getNumRows();
  if (numRows < 2) return false;

  // Parse header row to find column indices
  var headerRow = table.getRow(0);
  var colMap = {};
  for (var c = 0; c < headerRow.getNumCells(); c++) {
    var header = headerRow.getCell(c).getText().toLowerCase().trim();
    if (header.indexOf('status') !== -1) colMap.status = c;
    if (header.indexOf('owner') !== -1) colMap.owner = c;
    if (header.indexOf('action') !== -1 && header.indexOf('source') === -1) colMap.action = c;
  }

  if (colMap.status === undefined || colMap.action === undefined) {
    Logger.log('Required columns not found');
    return false;
  }

  // Find matching row by task text (and optionally owner)
  for (var r = 1; r < numRows; r++) {
    var row = table.getRow(r);
    var taskText = row.getCell(colMap.action).getText().trim();

    // Match by task text
    if (taskText === action.task) {
      // Optionally verify owner matches too
      if (colMap.owner !== undefined) {
        var owner = row.getCell(colMap.owner).getText().trim();
        if (owner !== action.assigned_to && action.assigned_to) {
          continue; // Owner doesn't match, keep looking
        }
      }

      // Update the status
      var displayStatus = formatStatusForAgenda_(action.status);
      row.getCell(colMap.status).setText(displayStatus);
      return true;
    }
  }

  Logger.log('Action not found in table: ' + action.task.substring(0, 50));
  return false;
}

/**
 * Format status for display in agenda (title case)
 */
function formatStatusForAgenda_(status) {
  var map = {
    'done': 'Done',
    'in_progress': 'In Progress',
    'pending': 'Pending',
    'not_started': 'Not Started'
  };
  return map[status] || status;
}

/**
 * Manual function to push all status changes to agendas
 * Useful for bulk updates or fixing sync issues
 */
function pushAllStatusesToAgendas() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var successCount = 0;
  var failCount = 0;

  for (var i = 1; i < data.length; i++) {
    var action = {};
    headers.forEach(function(h, j) {
      action[h] = data[i][j];
    });

    if (action.source_url && action.task) {
      try {
        if (pushStatusToAgenda_(action)) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }
  }

  ui.alert('Push Complete',
           'Successfully pushed: ' + successCount + '\n' +
           'Failed: ' + failCount,
           ui.ButtonSet.OK);
}
