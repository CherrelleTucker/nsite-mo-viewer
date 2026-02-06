/**
 * Sync Common Functions
 * =====================
 * Shared utilities for all update sync scripts
 * Container-bound to MO-DB_Updates Google Sheet
 *
 * DATABASE STRUCTURE:
 * MO-DB_Updates uses yearly tabs for performance and scalability:
 *   - 2026, 2025, 2024 (yearly tabs)
 *   - Archive (pre-2024 data)
 *   - _Lookup (reference data)
 *
 * Updates are automatically written to the correct year tab based on
 * their meeting_date. This structure:
 *   - Prevents Google Sheets slowdown (>50K rows = sluggish)
 *   - Keeps API responses fast (query only relevant tabs)
 *   - Allows easy archiving of old data
 *
 * This file contains:
 * - Configuration and constants
 * - Document parsing functions (table and paragraph formats)
 * - Database sync functions (year-tab aware)
 * - Helper utilities
 *
 * @fileoverview Common functions shared by all sync scripts
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// The 🆕 emoji marker indicates new updates to capture from agenda documents
var NEW_MARKER = '🆕';

// Pattern to detect [core_id] in square brackets at end of text
// Matches: "Solution Name [core_id]" or "[core_id]" alone
// Example: "HLS (LP DAAC) [hls_ls]" captures "hls_ls"
// The captured group (1) contains the core_id without brackets
var CORE_ID_BRACKET_PATTERN = /\[([^\]]+)\]$/;

// Cache for config values
var _configCache = null;

/**
 * Source document configuration
 * configKey must match a key in MO-DB_Config
 */
var WEEKLY_SOURCES = {
  'internal': {
    configKey: 'INTERNAL_AGENDA_ID',
    category: 'MO',
    displayName: 'Internal Planning',
    format: 'table'
  },
  'sep': {
    configKey: 'SEP_AGENDA_ID',
    category: 'SEP',
    displayName: 'SEP Strategy',
    format: 'table'  // Now uses table format like Internal
  }
};

var MONTHLY_SOURCES = {
  'opera': {
    configKey: 'OPERA_MONTHLY_ID',
    category: 'OPERA',
    displayName: 'OPERA Monthly',
    format: 'table'
  },
  'pbl': {
    configKey: 'PBL_MONTHLY_ID',
    category: 'PBL',
    displayName: 'PBL Monthly',
    format: 'table'
  }
};

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Sync updates from a specific source (routine - latest tab only)
 * @param {Object} source - Source configuration object
 * @param {string} sourceKey - Key name for logging
 * @returns {Object} Sync results
 */
function syncFromSource_(source, sourceKey) {
  var docId = getConfigValue_(source.configKey);
  if (!docId) {
    Logger.log('No document ID configured for ' + sourceKey + ' (' + source.configKey + ')');
    return { newUpdates: 0, skippedUpdates: 0, message: 'Not configured' };
  }

  Logger.log('Syncing updates from ' + source.displayName + '...');

  var doc = DocumentApp.openById(docId);
  var docUrl = 'https://docs.google.com/document/d/' + docId;

  // Parse updates using table format
  var updates = parseUpdatesFromTableFormat_(doc, source, docUrl);

  Logger.log('Found ' + updates.length + ' :new: updates in ' + source.displayName);

  // Sync to database
  return syncUpdatesToDatabase_(updates);
}

/**
 * Sync all tabs from a specific source (historical backfill)
 * @param {Object} source - Source configuration object
 * @param {string} sourceKey - Key name for logging
 * @returns {Object} Sync results
 */
function syncFromSourceHistorical_(source, sourceKey) {
  var docId = getConfigValue_(source.configKey);
  if (!docId) {
    Logger.log('No document ID configured for ' + sourceKey + ' (' + source.configKey + ')');
    return { newUpdates: 0, skippedUpdates: 0, tabsProcessed: 0, message: 'Not configured' };
  }

  Logger.log('HISTORICAL: Syncing ALL tabs from ' + source.displayName + '...');

  var doc = DocumentApp.openById(docId);
  var docUrl = 'https://docs.google.com/document/d/' + docId;

  // Get all meeting notes tabs
  var tabs = getAllMeetingTabs_(doc);
  Logger.log('Found ' + tabs.length + ' meeting notes tabs');

  var allUpdates = [];

  // Process each tab
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    var tabName = tab.getTitle();
    var tabDate = parseTabDate_(tabName);
    var meetingDate = Utilities.formatDate(tabDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    Logger.log('Processing tab: ' + tabName + ' (' + meetingDate + ')');

    var body = tab.asDocumentTab().getBody();
    var updates = parseUpdatesFromBody_(body, source, docUrl, meetingDate, tabName);

    Logger.log('  Found ' + updates.length + ' :new: updates in tab ' + tabName);
    allUpdates = allUpdates.concat(updates);
  }

  Logger.log('Total: ' + allUpdates.length + ' :new: updates from ' + tabs.length + ' tabs');

  // Sync to database
  var syncResult = syncUpdatesToDatabase_(allUpdates);
  syncResult.tabsProcessed = tabs.length;

  return syncResult;
}

// ============================================================================
// TABLE FORMAT PARSING
// ============================================================================

/**
 * Parse updates from table-based format (routine - latest tab)
 * @param {Document} doc - Google Doc
 * @param {Object} source - Source configuration
 * @param {string} docUrl - Document URL
 * @returns {Array} Array of update objects
 */
function parseUpdatesFromTableFormat_(doc, source, docUrl) {
  var updates = [];
  var meetingDate = extractMeetingDateFromDoc_(doc);

  var bodyInfo = getDocumentBodyWithTabName_(doc);
  var body = bodyInfo.body;
  var tabName = bodyInfo.tabName;

  if (!body) {
    Logger.log('Could not get document body');
    return updates;
  }

  var tables = body.getTables();
  Logger.log('Found ' + tables.length + ' table(s) in ' + source.displayName);

  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var numRows = table.getNumRows();

    if (numRows < 3) continue;

    for (var r = 0; r < numRows; r++) {
      var row = table.getRow(r);

      if (row.getNumCells() >= 2) {
        var cell = row.getCell(1);
        var numChildren = cell.getNumChildren();

        var currentSolution = null;
        var currentSolutionNestingLevel = null;

        var listItems = [];
        for (var i = 0; i < numChildren; i++) {
          var child = cell.getChild(i);
          if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
            var listItem = child.asListItem();
            listItems.push({
              text: listItem.getText().trim(),
              nesting: listItem.getNestingLevel()
            });
          }
        }

        for (var j = 0; j < listItems.length; j++) {
          var item = listItems[j];

          if (!item.text) continue;

          // Check if line has [core_id] format (modern standard)
          var hasCoreId = CORE_ID_BRACKET_PATTERN.test(item.text);
          // Legacy format: "Sub-solution Name:" (colon at end, no brackets)
          // Used in older agendas before [core_id] format was adopted
          var isLegacySubSolutionMarker = /^[A-Za-z0-9\s\-\.]+:\s*$/.test(item.text);

          if (hasCoreId) {
            currentSolution = extractSolutionId_(item.text);
            currentSolutionNestingLevel = item.nesting;
          }
          else if (currentSolution === null || item.nesting <= currentSolutionNestingLevel) {
            if (item.text.indexOf(NEW_MARKER) === -1) {
              currentSolution = extractSolutionId_(item.text);
              currentSolutionNestingLevel = item.nesting;
            }
          }
          else if (isLegacySubSolutionMarker && item.nesting > currentSolutionNestingLevel) {
            var subSolutionName = item.text.replace(/:$/, '').trim();
            var baseSolution = currentSolution.split(' - ')[0];
            currentSolution = baseSolution + ' - ' + subSolutionName;
            currentSolutionNestingLevel = item.nesting;
          }

          // Found a 🆕 update - collect it and any nested child items
          if (item.text.includes(NEW_MARKER) && currentSolution) {
            var updateNestingLevel = item.nesting;
            var updateParts = [item.text.replace(NEW_MARKER, '').trim()];

            // Collect all child items (more deeply nested than this update)
            // They become part of the update text with indent preserved
            // Example agenda structure:
            //   🆕 Main update text [hls]
            //     ○ Sub-item 1        → "  • Sub-item 1"
            //       ■ Sub-sub-item    → "    • Sub-sub-item"
            for (var k = j + 1; k < listItems.length; k++) {
              var childItem = listItems[k];
              if (childItem.nesting <= updateNestingLevel) break;  // Stop at same/lower level
              if (childItem.text) {
                var indent = '  '.repeat(childItem.nesting - updateNestingLevel);
                updateParts.push(indent + '• ' + childItem.text);
              }
            }

            updates.push({
              solution: currentSolution,
              update_text: updateParts.join('\n'),
              source_document: source.displayName,
              source_category: source.category,
              source_url: docUrl,
              source_tab: tabName,
              meeting_date: meetingDate
            });
          }
        }
      }
    }
  }

  return updates;
}

/**
 * Parse updates from a specific body (historical - individual tab)
 * @param {Body} body - Document body
 * @param {Object} source - Source configuration
 * @param {string} docUrl - Document URL
 * @param {string} meetingDate - Meeting date string
 * @param {string} tabName - Tab name
 * @returns {Array} Array of update objects
 */
function parseUpdatesFromBody_(body, source, docUrl, meetingDate, tabName) {
  var updates = [];

  var tables = body.getTables();

  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var numRows = table.getNumRows();

    if (numRows < 3) continue;

    for (var r = 0; r < numRows; r++) {
      var row = table.getRow(r);

      if (row.getNumCells() >= 2) {
        var cell = row.getCell(1);
        var numChildren = cell.getNumChildren();

        var currentSolution = null;
        var currentSolutionNestingLevel = null;

        var listItems = [];
        for (var i = 0; i < numChildren; i++) {
          var child = cell.getChild(i);
          if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
            var listItem = child.asListItem();
            listItems.push({
              text: listItem.getText().trim(),
              nesting: listItem.getNestingLevel()
            });
          }
        }

        for (var j = 0; j < listItems.length; j++) {
          var item = listItems[j];

          if (!item.text) continue;

          // Check if line has [core_id] format (modern standard)
          var hasCoreId = CORE_ID_BRACKET_PATTERN.test(item.text);
          // Legacy format: "Sub-solution Name:" (colon at end, no brackets)
          // Used in older agendas before [core_id] format was adopted
          var isLegacySubSolutionMarker = /^[A-Za-z0-9\s\-\.]+:\s*$/.test(item.text);

          if (hasCoreId) {
            currentSolution = extractSolutionId_(item.text);
            currentSolutionNestingLevel = item.nesting;
          }
          else if (currentSolution === null || item.nesting <= currentSolutionNestingLevel) {
            if (item.text.indexOf(NEW_MARKER) === -1) {
              currentSolution = extractSolutionId_(item.text);
              currentSolutionNestingLevel = item.nesting;
            }
          }
          else if (isLegacySubSolutionMarker && item.nesting > currentSolutionNestingLevel) {
            var subSolutionName = item.text.replace(/:$/, '').trim();
            var baseSolution = currentSolution.split(' - ')[0];
            currentSolution = baseSolution + ' - ' + subSolutionName;
            currentSolutionNestingLevel = item.nesting;
          }

          // Found a 🆕 update - collect it and any nested child items
          if (item.text.includes(NEW_MARKER) && currentSolution) {
            var updateNestingLevel = item.nesting;
            var updateParts = [item.text.replace(NEW_MARKER, '').trim()];

            // Collect all child items (more deeply nested than this update)
            // They become part of the update text with indent preserved
            // Example agenda structure:
            //   🆕 Main update text [hls]
            //     ○ Sub-item 1        → "  • Sub-item 1"
            //       ■ Sub-sub-item    → "    • Sub-sub-item"
            for (var k = j + 1; k < listItems.length; k++) {
              var childItem = listItems[k];
              if (childItem.nesting <= updateNestingLevel) break;  // Stop at same/lower level
              if (childItem.text) {
                var indent = '  '.repeat(childItem.nesting - updateNestingLevel);
                updateParts.push(indent + '• ' + childItem.text);
              }
            }

            updates.push({
              solution: currentSolution,
              update_text: updateParts.join('\n'),
              source_document: source.displayName,
              source_category: source.category,
              source_url: docUrl,
              source_tab: tabName,
              meeting_date: meetingDate
            });
          }
        }
      }
    }
  }

  return updates;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all meeting notes tabs from a document (date-formatted tabs)
 * @param {Document} doc - Google Doc
 * @returns {Array} Array of Tab objects sorted by date (oldest first)
 */
function getAllMeetingTabs_(doc) {
  var meetingTabs = [];

  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabName = tab.getTitle();

        if (tabName && tabName.match(/\d{1,2}[/_]\d{1,2}([/_]\d{2,4})?/)) {
          meetingTabs.push({
            tab: tab,
            date: parseTabDate_(tabName)
          });
        }
      }

      meetingTabs.sort(function(a, b) {
        return a.date - b.date;
      });

      return meetingTabs.map(function(item) {
        return item.tab;
      });
    }
  } catch (e) {
    Logger.log('Error getting tabs: ' + e);
  }

  return [];
}

/**
 * Get document body with tab name
 * @param {Document} doc - Google Doc
 * @returns {Object} { body: Body, tabName: string }
 */
function getDocumentBodyWithTabName_(doc) {
  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      var mostRecentTab = null;
      var mostRecentDate = null;

      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabTitle = tab.getTitle();

        if (tabTitle && tabTitle.match(/\d{1,2}[/_]\d{1,2}([/_]\d{2,4})?/)) {
          var tabDate = parseTabDate_(tabTitle);
          if (!mostRecentDate || tabDate > mostRecentDate) {
            mostRecentDate = tabDate;
            mostRecentTab = tab;
          }
        }
      }

      if (mostRecentTab) {
        Logger.log('Using most recent tab: ' + mostRecentTab.getTitle());
        return {
          body: mostRecentTab.asDocumentTab().getBody(),
          tabName: mostRecentTab.getTitle()
        };
      }

      return {
        body: tabs[0].asDocumentTab().getBody(),
        tabName: tabs[0].getTitle()
      };
    }
  } catch (e) {
    // Tabs API not available
  }

  return {
    body: doc.getBody(),
    tabName: ''
  };
}

/**
 * Parse a tab name date
 * Supports formats: "01_13", "01/13", "01_13_26", "01/13/2026"
 * @param {string} tabName - Tab name like "01_13" or "01/13/26"
 * @returns {Date} Parsed date (or epoch if unparseable)
 */
function parseTabDate_(tabName) {
  var parts = tabName.split(/[/_]/);  // Split on underscore or slash
  if (parts.length >= 2) {
    var month = parseInt(parts[0], 10) - 1;  // JS months are 0-indexed
    var day = parseInt(parts[1], 10);
    // If no year provided, assume current year
    var year = parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();

    // Convert 2-digit years to 4-digit: 26 → 2026, 99 → 2099
    // Safe assumption since this codebase started in 2024
    if (year < 100) {
      year += 2000;
    }

    return new Date(year, month, day);
  }
  return new Date(0);  // Return epoch (1970) for unparseable dates - sorts to bottom
}

/**
 * Extract meeting date from document
 * @param {Document} doc - Google Doc
 * @returns {string} Meeting date in YYYY-MM-DD format
 */
function extractMeetingDateFromDoc_(doc) {
  var docName = doc.getName();
  var dateMatch = docName.match(/(\d{1,2})[/_-](\d{1,2})[/_-](\d{2,4})/);
  if (dateMatch) {
    var month = dateMatch[1].padStart(2, '0');
    var day = dateMatch[2].padStart(2, '0');
    var year = dateMatch[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    return year + '-' + month + '-' + day;
  }

  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      var mostRecentDate = null;

      for (var i = 0; i < tabs.length; i++) {
        var tabName = tabs[i].getTitle();
        if (tabName && tabName.match(/\d{1,2}[/_]\d{1,2}([/_]\d{2,4})?/)) {
          var tabDate = parseTabDate_(tabName);
          if (!mostRecentDate || tabDate > mostRecentDate) {
            mostRecentDate = tabDate;
          }
        }
      }

      if (mostRecentDate) {
        return Utilities.formatDate(mostRecentDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
    }
  } catch (e) {
    // Tabs API not available
  }

  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Extract solution identifier (core_id) from text
 * Supports: "Name [core_id]", "[core_id]", "Name (Provider)"
 * @param {string} text - Raw text
 * @returns {string} The core_id or cleaned solution name
 */
function extractSolutionId_(text) {
  if (!text) return '';

  text = text.trim();

  // Pattern 1: "Solution Name [core_id]"
  var bracketMatch = text.match(/^(.+?)\s*\[([^\]]+)\]$/);
  if (bracketMatch) {
    return bracketMatch[2].trim();
  }

  // Pattern 2: "[core_id]" only
  var onlyBracketMatch = text.match(/^\[([^\]]+)\]$/);
  if (onlyBracketMatch) {
    return onlyBracketMatch[1].trim();
  }

  // Pattern 3: "Name (Provider)" - strip provider
  var parenMatch = text.match(/^(.+?)\s*\([^)]+\)$/);
  if (parenMatch) {
    return parenMatch[1].trim();
  }

  return text;
}

// ============================================================================
// DATABASE SYNC
// ============================================================================

/**
 * Sync parsed updates to the database
 * @param {Array} updates - Parsed update objects
 * @returns {Object} Sync results
 */
/**
 * Sync updates to the database, writing to the correct year tab
 * MO-DB_Updates uses yearly tabs: 2026, 2025, 2024, 2023, Archive
 * Updates are written to the tab matching their meeting_date year
 */
function syncUpdatesToDatabase_(updates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Group updates by year
  var updatesByYear = {};
  updates.forEach(function(update) {
    var year = getYearFromDate_(update.meeting_date);
    if (!updatesByYear[year]) {
      updatesByYear[year] = [];
    }
    updatesByYear[year].push(update);
  });

  var results = {
    newUpdates: 0,
    skippedUpdates: 0
  };

  // Process each year's updates
  for (var year in updatesByYear) {
    var yearUpdates = updatesByYear[year];
    var tabName = getTabNameForYear_(year);

    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      Logger.log('Tab not found: ' + tabName + ', creating it...');
      sheet = createYearTab_(ss, tabName);
    }

    var tabResults = syncUpdatesToTab_(sheet, yearUpdates);
    results.newUpdates += tabResults.newUpdates;
    results.skippedUpdates += tabResults.skippedUpdates;
  }

  return results;
}

/**
 * Get the year from a date string or default to current year
 */
function getYearFromDate_(dateStr) {
  if (!dateStr) return new Date().getFullYear();
  var date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
}

/**
 * Get tab name for a year
 * Tab structure: 2026, 2025, 2024, Archive (pre-2024), _Lookup
 *
 * Years < 2024 go to "Archive" (consolidates historical data)
 * 2024+ get their own yearly tabs (keeps recent data organized)
 *
 * Why 2024? The MO-Viewer project started in 2024; earlier data
 * is historical backfill that doesn't need per-year organization.
 */
function getTabNameForYear_(year) {
  year = parseInt(year, 10);
  if (year < 2024) return 'Archive';
  return String(year);
}

/**
 * Create a new year tab with standard headers
 */
function createYearTab_(ss, tabName) {
  var sheet = ss.insertSheet(tabName);
  var headers = [
    'update_id', 'solution_id', 'update_text', 'source_document',
    'source_category', 'source_url', 'source_tab', 'meeting_date',
    'created_at', 'created_by'
  ];
  sheet.appendRow(headers);
  return sheet;
}

/**
 * Sync updates to a specific tab
 */
function syncUpdatesToTab_(sheet, updates) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var colIndex = {};
  for (var i = 0; i < headers.length; i++) {
    colIndex[headers[i]] = i;
  }

  var existingUpdates = {};
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var key = createUpdateKey_(
      row[colIndex['solution_id']] || '',
      row[colIndex['update_text']] || ''
    );
    existingUpdates[key] = true;
  }

  var results = {
    newUpdates: 0,
    skippedUpdates: 0
  };

  for (var i = 0; i < updates.length; i++) {
    var update = updates[i];
    var key = createUpdateKey_(update.solution, update.update_text);

    if (existingUpdates[key]) {
      results.skippedUpdates++;
    } else {
      appendNewUpdate_(sheet, headers, update);
      results.newUpdates++;
      existingUpdates[key] = true;
    }
  }

  return results;
}

/**
 * Create a key for update deduplication
 * Key format: "solution_id|first_150_chars_of_text"
 *
 * Truncate at 150 chars because:
 * - Long update texts with minor variations would be treated as duplicates
 * - First 150 chars typically capture the essence of the update
 * - Keeps key comparison fast for large datasets
 */
function createUpdateKey_(solution, updateText) {
  var normalizedSolution = (solution || '').toLowerCase().trim();
  var normalizedText = (updateText || '').toLowerCase().trim().substring(0, 150);
  return normalizedSolution + '|' + normalizedText;
}

/**
 * Append a new update row
 */
function appendNewUpdate_(sheet, headers, update) {
  var timestamp = new Date().toISOString();
  var updateId = generateUpdateId_();

  var newRow = headers.map(function(header) {
    switch (header) {
      case 'update_id': return updateId;
      case 'solution_id': return update.solution || '';
      case 'update_text': return update.update_text || '';
      case 'source_document': return update.source_document || '';
      case 'source_category': return update.source_category || '';
      case 'source_url': return update.source_url || '';
      case 'source_tab': return update.source_tab || '';
      case 'meeting_date': return update.meeting_date || '';
      case 'created_at': return timestamp;
      case 'created_by': return 'sync';
      default: return '';
    }
  });

  sheet.appendRow(newRow);
  Logger.log('Added new update for ' + (update.solution || 'unknown') + ': ' +
             (update.update_text || '').substring(0, 50));
}

/**
 * Generate a unique update ID
 */
function generateUpdateId_() {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var random = Math.floor(Math.random() * 9000) + 1000;
  return 'UPD_' + dateStr + '_' + random;
}

// ============================================================================
// CONFIG SHEET ACCESS
// ============================================================================

/**
 * Load all config values from MO-DB_Config sheet
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
  } catch (error) {
    Logger.log('Error loading config sheet: ' + error);
    return {};
  }
}

/**
 * Get a config value
 */
function getConfigValue_(key) {
  var config = loadConfigFromSheet_();
  return config[key] || '';
}
