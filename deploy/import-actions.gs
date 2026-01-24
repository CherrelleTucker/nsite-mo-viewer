/**
 * Import Actions
 * ==============
 * Migration from ActionTracking_NSITE MO spreadsheet to MO-DB_Actions
 *
 * Bind this script to MO-DB_Actions spreadsheet, then:
 * 1. Set ACTIONS_SOURCE_ID in Script Properties (source tracker spreadsheet ID)
 * 2. Run importActions() from the Apps Script editor
 */

// ============================================================================
// SCHEMA
// ============================================================================

var ACTIONS_SCHEMA = [
  'action_id',
  'source_document',
  'source_date',
  'source_url',
  'category',
  'status',
  'assigned_to',
  'task',
  'due_date',
  'priority',
  'notes',
  'created_at',
  'updated_at',
  'created_by'
];

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

/**
 * Main import function - run this from the Apps Script editor
 */
function importActions() {
  Logger.log('='.repeat(50));
  Logger.log('Actions Import');
  Logger.log('='.repeat(50));

  // Get source spreadsheet from Script Properties
  var sourceId = PropertiesService.getScriptProperties().getProperty('ACTIONS_SOURCE_ID');
  if (!sourceId) {
    throw new Error('Set ACTIONS_SOURCE_ID in Script Properties (File > Project properties > Script properties).');
  }

  // Target is this container spreadsheet
  var targetSS = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = targetSS.getSheets()[0];

  Logger.log('Source: ' + sourceId);
  Logger.log('Target: ' + targetSS.getName() + ' (this spreadsheet)');

  // Open source spreadsheet
  var sourceSS = SpreadsheetApp.openById(sourceId);

  Logger.log('Source sheets: ' + sourceSS.getSheets().map(function(s) { return s.getName(); }).join(', '));

  // Import all action sheets
  Logger.log('');
  Logger.log('Importing actions...');
  var allRecords = [];
  var idCounter = 1;

  // Category sheets to import
  var categorySheets = [
    { name: 'MO', category: 'MO' },
    { name: 'SEP', category: 'SEP' },
    { name: 'DevSeed', category: 'DevSeed' },
    { name: 'AssessmentHQ', category: 'Assessment' },
    { name: 'AdHoc', category: 'AdHoc' }
  ];

  categorySheets.forEach(function(sheetInfo) {
    var records = importActionSheet_(sourceSS, sheetInfo.name, sheetInfo.category, idCounter);
    allRecords = allRecords.concat(records);
    idCounter += records.length + 50;
  });

  // Deduplicate by task content (same task text = same action)
  Logger.log('');
  Logger.log('Deduplicating...');
  var seen = {};
  allRecords.forEach(function(record) {
    var key = (record.task || '').toLowerCase().trim();
    if (!key) return;

    if (!seen[key]) {
      seen[key] = record;
    } else {
      // Keep the one with more recent update
      var existingDate = seen[key].created_at ? new Date(seen[key].created_at) : new Date(0);
      var newDate = record.created_at ? new Date(record.created_at) : new Date(0);
      if (newDate > existingDate) {
        seen[key] = record;
      }
    }
  });

  var dedupedRecords = Object.values(seen);
  Logger.log('  Reduced ' + allRecords.length + ' to ' + dedupedRecords.length + ' unique actions');

  // Sort by status (open first) then by created date
  dedupedRecords.sort(function(a, b) {
    var statusOrder = { 'not_started': 0, 'in_progress': 1, 'blocked': 2, 'done': 3 };
    var statusA = statusOrder[a.status] || 0;
    var statusB = statusOrder[b.status] || 0;
    if (statusA !== statusB) return statusA - statusB;

    var dateA = a.created_at ? new Date(a.created_at) : new Date(0);
    var dateB = b.created_at ? new Date(b.created_at) : new Date(0);
    return dateB - dateA;
  });

  // Write to target sheet
  Logger.log('');
  Logger.log('Writing ' + dedupedRecords.length + ' records to target...');

  // Clear existing data and write headers
  targetSheet.clear();
  targetSheet.getRange(1, 1, 1, ACTIONS_SCHEMA.length).setValues([ACTIONS_SCHEMA]);

  // Write data
  if (dedupedRecords.length > 0) {
    var dataRows = dedupedRecords.map(function(record) {
      return ACTIONS_SCHEMA.map(function(col) {
        return record[col] || '';
      });
    });
    targetSheet.getRange(2, 1, dataRows.length, ACTIONS_SCHEMA.length).setValues(dataRows);
  }

  // Format header row
  var headerRange = targetSheet.getRange(1, 1, 1, ACTIONS_SCHEMA.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');
  targetSheet.setFrozenRows(1);

  Logger.log('');
  Logger.log('Import complete!');
  Logger.log('Total records: ' + dedupedRecords.length);

  // Summary by status
  var statusCounts = {};
  dedupedRecords.forEach(function(r) {
    var status = r.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  Logger.log('');
  Logger.log('Records by status:');
  Object.keys(statusCounts).forEach(function(status) {
    Logger.log('  ' + status + ': ' + statusCounts[status]);
  });

  // Summary by category
  var categoryCounts = {};
  dedupedRecords.forEach(function(r) {
    var category = r.category || 'unknown';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  Logger.log('');
  Logger.log('Records by category:');
  Object.keys(categoryCounts).forEach(function(category) {
    Logger.log('  ' + category + ': ' + categoryCounts[category]);
  });

  return dedupedRecords.length;
}

// ============================================================================
// IMPORT HELPERS
// ============================================================================

/**
 * Import a single action sheet
 */
function importActionSheet_(sourceSS, sheetName, category, startId) {
  var sheet = sourceSS.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('  Sheet "' + sheetName + '" not found');
    return [];
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('  Sheet "' + sheetName + '" is empty');
    return [];
  }

  var headers = data[0];
  var records = [];

  // Find column indices
  var taskCol = findColumnIndex_(headers, ['Task', 'Action']);
  var statusCol = findColumnIndex_(headers, ['Status']);
  var assignedCol = findColumnIndex_(headers, ['Assigned to', 'Assigned']);
  var sourceCol = findColumnIndex_(headers, ['Action Source', 'Source']);
  var urlCol = findColumnIndex_(headers, ['Extracted urls', 'URL', 'Link']);
  var notesCol = findColumnIndex_(headers, ['Notes']);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var task = taskCol !== -1 ? cleanText_(row[taskCol]) : '';
    if (!task) continue;

    var sourceRaw = sourceCol !== -1 ? cleanText_(row[sourceCol]) : '';
    var sourceUrl = urlCol !== -1 ? cleanText_(row[urlCol]) : '';

    // If source looks like a URL, swap
    if (sourceRaw && sourceRaw.indexOf('http') === 0 && !sourceUrl) {
      sourceUrl = sourceRaw;
      sourceRaw = '';
    }

    // Parse source_date and source_document from Action Source
    // Formats: "2025-03-04  SNWG SEP Weekly Meeting" or "2025_Weekly Internal Planning Meeting_SNWG MO"
    var sourceDate = '';
    var sourceDoc = sourceRaw;

    // Try to extract date from beginning (YYYY-MM-DD format)
    var dateMatch = sourceRaw.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    if (dateMatch) {
      sourceDate = dateMatch[1];
      sourceDoc = dateMatch[2].trim();
    } else {
      // Try YYYY_ prefix format (extract year only)
      var yearMatch = sourceRaw.match(/^(\d{4})_(.+)$/);
      if (yearMatch) {
        sourceDate = yearMatch[1]; // Just the year
        sourceDoc = yearMatch[2].replace(/_/g, ' ').trim();
      }
    }

    var status = statusCol !== -1 ? normalizeStatus_(row[statusCol]) : 'not_started';
    var assigned = assignedCol !== -1 ? cleanText_(row[assignedCol]) : '';
    var notes = notesCol !== -1 ? cleanText_(row[notesCol]) : '';

    // Clean up assigned names (remove @ symbol)
    if (assigned.indexOf('@') === 0) {
      assigned = assigned.substring(1);
    }

    var timestamp = new Date().toISOString();

    records.push({
      action_id: generateActionId_(startId + i),
      source_document: sourceDoc,
      source_date: sourceDate,
      source_url: sourceUrl,
      category: category,
      status: status,
      assigned_to: assigned,
      task: task,
      due_date: '',
      priority: 'medium',
      notes: notes,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: 'import_script'
    });
  }

  Logger.log('  Imported ' + records.length + ' records from ' + sheetName);
  return records;
}

/**
 * Find column index by possible header names
 */
function findColumnIndex_(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toString().toLowerCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (header.indexOf(possibleNames[j].toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return -1;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function cleanText_(val) {
  if (val === null || val === undefined || val === '') return '';
  return String(val).trim();
}

function normalizeStatus_(val) {
  if (!val) return 'not_started';
  var s = val.toString().toLowerCase().trim();

  if (s === 'done') return 'done';
  if (s === 'in progress') return 'in_progress';
  if (s === 'blocked') return 'blocked';
  if (s === 'not started') return 'not_started';

  return 'not_started';
}

function generateActionId_(index) {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var paddedIndex = ('0000' + index).slice(-4);
  return 'ACT_' + dateStr + '_' + paddedIndex;
}
