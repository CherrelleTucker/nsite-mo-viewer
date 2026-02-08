/**
 * Sync Updates to Database
 * =========================
 * Container-bound script for MO-DB_Updates Google Sheet
 * Pulls 🆕 updates from source agenda documents into the database
 *
 * TWO MODES:
 * 1. ROUTINE (Latest Tab) - For ongoing weekly syncs
 *    - Only processes the most recent meeting notes tab
 *    - Use: Update Sync → Routine (Latest Tab) → ...
 *    - Trigger: syncAllUpdates()
 *
 * 2. HISTORICAL (All Tabs) - For initial database setup
 *    - Processes ALL date-formatted tabs in each document
 *    - Use once for backfilling historical data
 *    - Use: Update Sync → Historical (All Tabs) → ...
 *    - Trigger: syncAllUpdatesHistorical()
 *
 * DATABASE COLUMNS:
 * update_id, solution_id, update_text, source_document, source_category,
 * source_url, source_tab, meeting_date, created_at, created_by
 *
 * SETUP:
 * 1. Open MO-DB_Updates Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this code
 * 4. Set CONFIG_SHEET_ID in Script Properties (points to MO-DB_Config)
 * 5. Add document IDs to MO-DB_Config:
 *    - INTERNAL_AGENDA_ID
 *    - SEP_AGENDA_ID
 *    - OPERA_MONTHLY_ID (optional)
 *    - PBL_MONTHLY_ID (optional)
 * 6. Run Historical sync ONCE to backfill data
 * 7. Set up time-based trigger for syncAllUpdates() for ongoing routine syncs
 *
 * @fileoverview Centralized update sync from multiple source documents
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Source document configuration
 * Add new sources here as needed
 * configKey must match a key in MO-DB_Config
 */
var UPDATE_SOURCES = {
  'internal': {
    configKey: 'INTERNAL_AGENDA_ID',
    category: 'MO',
    displayName: 'Internal Planning',
    format: 'table'  // Two-column table format
  },
  'sep': {
    configKey: 'SEP_AGENDA_ID',
    category: 'SEP',
    displayName: 'SEP Strategy',
    format: 'paragraph'  // Heading/paragraph format
  },
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

// The :new: emoji marker
var NEW_MARKER = '🆕';

// Pattern to detect [solution_id] in square brackets
var SOLUTION_ID_BRACKET_PATTERN = /\[([^\]]+)\]$/;

// Cache for config values
var _configCache = null;

// ============================================================================
// MAIN SYNC FUNCTIONS
// ============================================================================

/**
 * Main entry point - sync updates from all configured sources
 * Call this from a time-based trigger
 */
function syncAllUpdates() {
  var results = {
    sources: [],
    totalNew: 0,
    totalSkipped: 0,
    errors: []
  };

  for (var sourceKey in UPDATE_SOURCES) {
    try {
      var result = syncUpdatesFromSource(sourceKey);
      results.sources.push({
        source: sourceKey,
        newUpdates: result.newUpdates,
        skippedUpdates: result.skippedUpdates,
        message: result.message
      });
      results.totalNew += result.newUpdates;
      results.totalSkipped += result.skippedUpdates;
    } catch (error) {
      results.errors.push({
        source: sourceKey,
        error: error.message
      });
      Logger.log('Error syncing ' + sourceKey + ': ' + error);
    }
  }

  // Log summary
  Logger.log('Sync complete: ' + results.totalNew + ' new updates, ' +
             results.totalSkipped + ' skipped, ' +
             results.errors.length + ' errors');

  return results;
}

/**
 * Sync updates from a specific source
 * @param {string} sourceKey - Key from UPDATE_SOURCES
 * @returns {Object} Sync results
 */
function syncUpdatesFromSource(sourceKey) {
  var source = UPDATE_SOURCES[sourceKey];
  if (!source) {
    throw new Error('Unknown source: ' + sourceKey);
  }

  var docId = getConfigValue_(source.configKey);
  if (!docId) {
    Logger.log('No document ID configured for ' + sourceKey + ' (' + source.configKey + ')');
    return { newUpdates: 0, skippedUpdates: 0, message: 'Not configured' };
  }

  Logger.log('Syncing updates from ' + source.displayName + '...');

  var doc = DocumentApp.openById(docId);
  var docUrl = 'https://docs.google.com/document/d/' + docId;
  var docName = doc.getName();

  // Parse updates based on format
  var updates = [];
  if (source.format === 'table') {
    updates = parseUpdatesFromTableFormat_(doc, source, docUrl, docName);
  } else if (source.format === 'paragraph') {
    updates = parseUpdatesFromParagraphFormat_(doc, source, docUrl, docName);
  }

  Logger.log('Found ' + updates.length + ' :new: updates in ' + source.displayName);

  // Sync to database
  return syncUpdatesToDatabase_(updates);
}

/**
 * Manual sync from Internal Agenda only
 */
function syncFromInternalAgenda() {
  return syncUpdatesFromSource('internal');
}

/**
 * Manual sync from SEP Agenda only
 */
function syncFromSEPAgenda() {
  return syncUpdatesFromSource('sep');
}

/**
 * Manual sync from OPERA Monthly
 */
function syncFromOPERA() {
  return syncUpdatesFromSource('opera');
}

/**
 * Manual sync from PBL Monthly
 */
function syncFromPBL() {
  return syncUpdatesFromSource('pbl');
}

// ============================================================================
// HISTORICAL SYNC FUNCTIONS (All Tabs)
// ============================================================================

/**
 * HISTORICAL: Sync ALL tabs from all configured sources
 * Use this for initial database setup and historical record keeping
 * Processes every date-formatted tab in each document
 */
function syncAllUpdatesHistorical() {
  var results = {
    sources: [],
    totalNew: 0,
    totalSkipped: 0,
    totalTabs: 0,
    errors: []
  };

  for (var sourceKey in UPDATE_SOURCES) {
    try {
      var result = syncUpdatesFromSourceHistorical(sourceKey);
      results.sources.push({
        source: sourceKey,
        newUpdates: result.newUpdates,
        skippedUpdates: result.skippedUpdates,
        tabsProcessed: result.tabsProcessed,
        message: result.message
      });
      results.totalNew += result.newUpdates;
      results.totalSkipped += result.skippedUpdates;
      results.totalTabs += result.tabsProcessed;
    } catch (error) {
      results.errors.push({
        source: sourceKey,
        error: error.message
      });
      Logger.log('Error syncing ' + sourceKey + ' (historical): ' + error);
    }
  }

  // Log summary
  Logger.log('Historical sync complete: ' + results.totalNew + ' new updates from ' +
             results.totalTabs + ' tabs, ' + results.totalSkipped + ' skipped, ' +
             results.errors.length + ' errors');

  return results;
}

/**
 * HISTORICAL: Sync ALL tabs from a specific source
 * @param {string} sourceKey - Key from UPDATE_SOURCES
 * @returns {Object} Sync results
 */
function syncUpdatesFromSourceHistorical(sourceKey) {
  var source = UPDATE_SOURCES[sourceKey];
  if (!source) {
    throw new Error('Unknown source: ' + sourceKey);
  }

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

    // Parse updates based on format
    var updates = [];
    if (source.format === 'table') {
      updates = parseUpdatesFromBody_(body, source, docUrl, meetingDate, tabName);
    } else if (source.format === 'paragraph') {
      updates = parseUpdatesFromBodyParagraph_(body, source, docUrl, meetingDate, tabName);
    }

    Logger.log('  Found ' + updates.length + ' :new: updates in tab ' + tabName);
    allUpdates = allUpdates.concat(updates);
  }

  Logger.log('Total: ' + allUpdates.length + ' :new: updates from ' + tabs.length + ' tabs');

  // Sync to database
  var syncResult = syncUpdatesToDatabase_(allUpdates);
  syncResult.tabsProcessed = tabs.length;

  return syncResult;
}

/**
 * HISTORICAL: Sync all tabs from Internal Agenda
 */
function syncFromInternalAgendaHistorical() {
  return syncUpdatesFromSourceHistorical('internal');
}

/**
 * HISTORICAL: Sync all tabs from SEP Agenda
 */
function syncFromSEPAgendaHistorical() {
  return syncUpdatesFromSourceHistorical('sep');
}

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

        // Check if this is a meeting notes tab (date format like "01/09/26" or "01_20")
        if (tabName && tabName.match(/\d{1,2}[/_]\d{1,2}([/_]\d{2,4})?/)) {
          meetingTabs.push({
            tab: tab,
            date: parseTabDate_(tabName)
          });
        }
      }

      // Sort by date (oldest first for historical processing)
      meetingTabs.sort(function(a, b) {
        return a.date - b.date;
      });

      // Return just the tab objects
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
 * Parse updates from a specific body (table format)
 * Used by historical sync to process individual tabs
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

        // Track current solution - items with [solution_id] set the solution directly
        var currentSolution = null;
        var currentSolutionNestingLevel = null;

        for (var j = 0; j < listItems.length; j++) {
          var item = listItems[j];

          if (!item.text) continue;

          // Check if this item has a [solution_id] marker
          var hasSolutionId = SOLUTION_ID_BRACKET_PATTERN.test(item.text);

          // Check if this item is a legacy sub-solution marker (ends with ":")
          var isLegacySubSolutionMarker = /^[A-Za-z0-9\s\-\.]+:\s*$/.test(item.text);

          // Items with [solution_id] become the current solution at any nesting level
          if (hasSolutionId) {
            currentSolution = extractSolutionName_(item.text);
            currentSolutionNestingLevel = item.nesting;
          }
          // Items at base nesting or shallower reset the solution (grouping headers)
          else if (currentSolution === null || item.nesting <= currentSolutionNestingLevel) {
            // Only set as solution if it's not a 🆕 update itself
            if (item.text.indexOf(NEW_MARKER) === -1) {
              currentSolution = extractSolutionName_(item.text);
              currentSolutionNestingLevel = item.nesting;
            }
          }
          // Legacy support: items ending with ":" at deeper nesting are sub-solutions
          else if (isLegacySubSolutionMarker && item.nesting > currentSolutionNestingLevel) {
            var subSolutionName = item.text.replace(/:$/, '').trim();
            currentSolution = currentSolution + ' - ' + subSolutionName;
            currentSolutionNestingLevel = item.nesting;
          }

          // Check for 🆕 updates
          if (item.text.includes(NEW_MARKER) && currentSolution) {
            var updateNestingLevel = item.nesting;
            var updateParts = [item.text.replace(NEW_MARKER, '').trim()];

            for (var k = j + 1; k < listItems.length; k++) {
              var childItem = listItems[k];
              if (childItem.nesting <= updateNestingLevel) break;
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
 * Parse updates from a specific body (paragraph format)
 * Used by historical sync to process individual tabs
 */
function parseUpdatesFromBodyParagraph_(body, source, docUrl, meetingDate, tabName) {
  var updates = [];

  var numElements = body.getNumChildren();
  var elements = [];

  for (var i = 0; i < numElements; i++) {
    var element = body.getChild(i);
    var elementType = element.getType();

    if (elementType === DocumentApp.ElementType.PARAGRAPH) {
      var para = element.asParagraph();
      var text = para.getText().trim();
      var heading = para.getHeading();
      var isBold = false;
      try {
        if (text.length > 0) {
          isBold = para.editAsText().isBold(0);
        }
      } catch (e) {}

      elements.push({
        type: 'paragraph',
        text: text,
        isHeading: heading !== DocumentApp.ParagraphHeading.NORMAL || isBold,
        nesting: 0
      });
    }
    else if (elementType === DocumentApp.ElementType.LIST_ITEM) {
      var listItem = element.asListItem();
      elements.push({
        type: 'list_item',
        text: listItem.getText().trim(),
        isHeading: false,
        nesting: listItem.getNestingLevel()
      });
    }
  }

  // Track current solution - items with [solution_id] set the solution directly
  var currentSolution = null;
  var currentSolutionNestingLevel = null;

  for (var j = 0; j < elements.length; j++) {
    var elem = elements[j];

    if (!elem.text) continue;

    // Check if this item has a [solution_id] marker
    var hasSolutionId = SOLUTION_ID_BRACKET_PATTERN.test(elem.text);

    // Check if this item is a legacy sub-solution marker (ends with ":")
    var isLegacySubSolutionMarker = elem.type === 'list_item' && /^[A-Za-z0-9\s\-\.]+:\s*$/.test(elem.text);

    // Headings set the solution (grouping or with [solution_id])
    if (elem.isHeading) {
      currentSolution = extractSolutionName_(elem.text);
      currentSolutionNestingLevel = 0;
      continue;
    }

    // Items with [solution_id] become the current solution at any nesting level
    if (hasSolutionId) {
      currentSolution = extractSolutionName_(elem.text);
      currentSolutionNestingLevel = elem.nesting;
      continue;
    }

    // Legacy support: items ending with ":" are sub-solutions (create composite name)
    if (currentSolution && isLegacySubSolutionMarker) {
      var subSolutionName = elem.text.replace(/:$/, '').trim();
      // Only create composite if current solution doesn't already have this sub-solution
      if (currentSolution.indexOf(' - ' + subSolutionName) === -1) {
        var baseSolution = currentSolution.split(' - ')[0];
        currentSolution = baseSolution + ' - ' + subSolutionName;
      }
      currentSolutionNestingLevel = elem.nesting;
      continue;
    }

    if (currentSolution && elem.type === 'list_item' && elem.text.includes(NEW_MARKER)) {
      var updateNestingLevel = elem.nesting;
      var updateParts = [elem.text.replace(NEW_MARKER, '').trim()];

      for (var k = j + 1; k < elements.length; k++) {
        var childElem = elements[k];
        if (childElem.isHeading) break;
        if (childElem.type === 'list_item' && childElem.nesting <= updateNestingLevel) break;
        if (childElem.type === 'list_item' && childElem.text) {
          var indent = '  '.repeat(childElem.nesting - updateNestingLevel);
          updateParts.push(indent + '• ' + childElem.text);
        }
      }

      var isDuplicate = updates.some(function(u) {
        return u.update_text === updateParts.join('\n') && u.solution === currentSolution;
      });

      if (!isDuplicate) {
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

  return updates;
}

// ============================================================================
// TABLE FORMAT PARSING (Internal Planning, OPERA, PBL)
// ============================================================================

/**
 * Parse updates from table-based format
 * Internal Planning has a two-column table:
 * - Column 0: Categories/headers
 * - Column 1: List items with solution name at first level, updates at nested level
 * Updates marked with 🆕 are extracted, including all nested children
 *
 * Structure example:
 * - Solution Name (nesting 0)
 *   - 🆕 Update headline (nesting 1) ← captured with children below
 *     - Child detail 1 (nesting 2) ← included in update
 *     - Child detail 2 (nesting 2) ← included in update
 *   - 🆕 Another update (nesting 1)
 *
 * @param {Document} doc - Google Doc
 * @param {Object} source - Source configuration
 * @param {string} docUrl - Document URL
 * @param {string} docName - Document name
 * @returns {Array} Array of update objects
 */
function parseUpdatesFromTableFormat_(doc, source, docUrl, docName) {
  var updates = [];
  var meetingDate = null;

  // Try to get meeting date from document name or tabs
  meetingDate = extractMeetingDateFromDoc_(doc);

  // Get the body and tab name (try tabs first)
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

    // Skip small tables (probably headers or other content)
    if (numRows < 3) continue;

    for (var r = 0; r < numRows; r++) {
      var row = table.getRow(r);

      if (row.getNumCells() >= 2) {
        var cell = row.getCell(1); // Updates column (second column)
        var numChildren = cell.getNumChildren();

        var currentSolution = null;
        var currentSolutionNestingLevel = null;

        // First pass: collect all list items with their indices and nesting levels
        var listItems = [];
        for (var i = 0; i < numChildren; i++) {
          var child = cell.getChild(i);
          if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
            var listItem = child.asListItem();
            var itemText = listItem.getText().trim();
            var nestingLevel = listItem.getNestingLevel();
            listItems.push({
              index: i,
              text: itemText,
              nesting: nestingLevel
            });
          }
        }

        // Second pass: process list items and capture :new: updates with children
        for (var j = 0; j < listItems.length; j++) {
          var item = listItems[j];

          if (!item.text) continue;

          // Check if this item has a [solution_id] marker
          var hasSolutionId = SOLUTION_ID_BRACKET_PATTERN.test(item.text);

          // Check if this item is a legacy sub-solution marker (ends with ":")
          var isLegacySubSolutionMarker = /^[A-Za-z0-9\s\-\.]+:\s*$/.test(item.text);

          // Items with [solution_id] become the current solution at any nesting level
          if (hasSolutionId) {
            currentSolution = extractSolutionName_(item.text);
            currentSolutionNestingLevel = item.nesting;
          }
          // Items at base nesting or shallower reset the solution (grouping headers)
          else if (currentSolution === null || item.nesting <= currentSolutionNestingLevel) {
            // Only set as solution if it's not a 🆕 update itself
            if (item.text.indexOf(NEW_MARKER) === -1) {
              currentSolution = extractSolutionName_(item.text);
              currentSolutionNestingLevel = item.nesting;
            }
          }
          // Legacy support: items ending with ":" at deeper nesting are sub-solutions
          else if (isLegacySubSolutionMarker && item.nesting > currentSolutionNestingLevel) {
            var subSolutionName = item.text.replace(/:$/, '').trim();
            var baseSolution = currentSolution.split(' - ')[0];
            currentSolution = baseSolution + ' - ' + subSolutionName;
            currentSolutionNestingLevel = item.nesting;
          }

          // Check for 🆕 updates
          if (item.text.includes(NEW_MARKER) && currentSolution) {
            var updateNestingLevel = item.nesting;
            var updateParts = [item.text.replace(NEW_MARKER, '').trim()];

            // Collect all children at deeper nesting levels
            for (var k = j + 1; k < listItems.length; k++) {
              var childItem = listItems[k];

              // Stop if we reach same or shallower nesting (sibling or parent)
              if (childItem.nesting <= updateNestingLevel) {
                break;
              }

              // This is a child of the :new: item
              if (childItem.text) {
                // Indent children with bullet for readability
                var indent = '  '.repeat(childItem.nesting - updateNestingLevel);
                updateParts.push(indent + '• ' + childItem.text);
              }
            }

            // Combine the update headline with its children
            var fullUpdateText = updateParts.join('\n');

            updates.push({
              solution: currentSolution,
              update_text: fullUpdateText,
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
// PARAGRAPH FORMAT PARSING (SEP Strategy)
// ============================================================================

/**
 * Parse updates from paragraph-based format
 * SEP Strategy has:
 * - Solution names as headings or bold paragraphs
 * - Updates as bulleted list items under each solution
 * Updates marked with 🆕 are extracted, including all nested children
 *
 * Structure example:
 * **Solution Name** (heading/bold)
 * • 🆕 Update headline ← captured with children below
 *   ◦ Child detail 1 ← included in update
 *   ◦ Child detail 2 ← included in update
 * • 🆕 Another update
 *
 * @param {Document} doc - Google Doc
 * @param {Object} source - Source configuration
 * @param {string} docUrl - Document URL
 * @param {string} docName - Document name
 * @returns {Array} Array of update objects
 */
function parseUpdatesFromParagraphFormat_(doc, source, docUrl, docName) {
  var updates = [];
  var meetingDate = null;

  // Try to get meeting date from document name or tabs
  meetingDate = extractMeetingDateFromDoc_(doc);

  // Get the body and tab name (try tabs first)
  var bodyInfo = getDocumentBodyWithTabName_(doc);
  var body = bodyInfo.body;
  var tabName = bodyInfo.tabName;

  if (!body) {
    Logger.log('Could not get document body');
    return updates;
  }

  // Process body elements to find solutions and list items
  var numElements = body.getNumChildren();
  var currentSolution = null;

  // First pass: collect all elements with their types and metadata
  var elements = [];
  for (var i = 0; i < numElements; i++) {
    var element = body.getChild(i);
    var elementType = element.getType();

    if (elementType === DocumentApp.ElementType.PARAGRAPH) {
      var para = element.asParagraph();
      var text = para.getText().trim();
      var heading = para.getHeading();
      var isBold = false;
      try {
        if (text.length > 0) {
          isBold = para.editAsText().isBold(0);
        }
      } catch (e) {
        isBold = false;
      }

      elements.push({
        type: 'paragraph',
        text: text,
        isHeading: heading !== DocumentApp.ParagraphHeading.NORMAL || isBold,
        nesting: 0
      });
    }
    else if (elementType === DocumentApp.ElementType.LIST_ITEM) {
      var listItem = element.asListItem();
      var itemText = listItem.getText().trim();
      var nestingLevel = listItem.getNestingLevel();

      elements.push({
        type: 'list_item',
        text: itemText,
        isHeading: false,
        nesting: nestingLevel
      });
    }
  }

  // Track current solution - items with [solution_id] set the solution directly
  var currentSolutionNestingLevel = null;

  // Second pass: process elements and capture :new: updates with children
  for (var j = 0; j < elements.length; j++) {
    var elem = elements[j];

    if (!elem.text) continue;

    // Check if this item has a [solution_id] marker
    var hasSolutionId = SOLUTION_ID_BRACKET_PATTERN.test(elem.text);

    // Check if this item is a legacy sub-solution marker (ends with ":")
    var isLegacySubSolutionMarker = elem.type === 'list_item' && /^[A-Za-z0-9\s\-\.]+:\s*$/.test(elem.text);

    // Headings set the solution (grouping or with [solution_id])
    if (elem.isHeading) {
      currentSolution = extractSolutionName_(elem.text);
      currentSolutionNestingLevel = 0;
      continue;
    }

    // Items with [solution_id] become the current solution at any nesting level
    if (hasSolutionId) {
      currentSolution = extractSolutionName_(elem.text);
      currentSolutionNestingLevel = elem.nesting;
      continue;
    }

    // Legacy support: items ending with ":" are sub-solutions (create composite name)
    if (currentSolution && isLegacySubSolutionMarker) {
      var subSolutionName = elem.text.replace(/:$/, '').trim();
      var baseSolution = currentSolution.split(' - ')[0];
      currentSolution = baseSolution + ' - ' + subSolutionName;
      currentSolutionNestingLevel = elem.nesting;
      continue;
    }

    // Check for :new: updates in list items
    if (currentSolution && elem.type === 'list_item' && elem.text.includes(NEW_MARKER)) {
      var updateNestingLevel = elem.nesting;
      var updateParts = [elem.text.replace(NEW_MARKER, '').trim()];

      // Collect all children at deeper nesting levels
      for (var k = j + 1; k < elements.length; k++) {
        var childElem = elements[k];

        // Stop if we hit a heading (new solution)
        if (childElem.isHeading) {
          break;
        }

        // Stop if we reach same or shallower nesting (sibling or parent)
        if (childElem.type === 'list_item' && childElem.nesting <= updateNestingLevel) {
          break;
        }

        // This is a child of the :new: item
        if (childElem.type === 'list_item' && childElem.text) {
          // Indent children with bullet for readability
          var indent = '  '.repeat(childElem.nesting - updateNestingLevel);
          updateParts.push(indent + '• ' + childElem.text);
        }
      }

      // Combine the update headline with its children
      var fullUpdateText = updateParts.join('\n');

      // Check if we already added this (avoid duplicates)
      var isDuplicate = updates.some(function(u) {
        return u.update_text === fullUpdateText && u.solution === currentSolution;
      });

      if (!isDuplicate) {
        updates.push({
          solution: currentSolution,
          update_text: fullUpdateText,
          source_document: source.displayName,
          source_category: source.category,
          source_url: docUrl,
          source_tab: tabName,
          meeting_date: meetingDate
        });

        Logger.log('  Found :new: update with ' + (updateParts.length - 1) + ' children: ' +
                   updateParts[0].substring(0, 50) + '...');
      }
    }
  }

  return updates;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get document body with tab name, trying tabs first then main body
 * @param {Document} doc - Google Doc
 * @returns {Object} { body: Body, tabName: string }
 */
function getDocumentBodyWithTabName_(doc) {
  // Try tabs first (newer docs have tabs)
  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      // Look for most recent meeting notes tab (date format)
      var mostRecentTab = null;
      var mostRecentDate = null;

      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabTitle = tab.getTitle();

        // Check if this is a meeting notes tab (date format like "01/09/26" or "01_20")
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

      // Fall back to first tab
      return {
        body: tabs[0].asDocumentTab().getBody(),
        tabName: tabs[0].getTitle()
      };
    }
  } catch (e) {
    // Tabs API not available
  }

  // Fallback to main body
  return {
    body: doc.getBody(),
    tabName: ''
  };
}

/**
 * Get document body, trying tabs first then main body (legacy)
 * @param {Document} doc - Google Doc
 * @returns {Body} Document body
 */
function getDocumentBody_(doc) {
  // Try tabs first (newer docs have tabs)
  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      // Look for most recent meeting notes tab (date format)
      var mostRecentTab = null;
      var mostRecentDate = null;

      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabName = tab.getTitle();

        // Check if this is a meeting notes tab (date format like "01/09/26" or "01_20")
        if (tabName && tabName.match(/\d{1,2}[/_]\d{1,2}([/_]\d{2,4})?/)) {
          var tabDate = parseTabDate_(tabName);
          if (!mostRecentDate || tabDate > mostRecentDate) {
            mostRecentDate = tabDate;
            mostRecentTab = tab;
          }
        }
      }

      if (mostRecentTab) {
        Logger.log('Using most recent tab: ' + mostRecentTab.getTitle());
        return mostRecentTab.asDocumentTab().getBody();
      }

      // Fall back to first tab
      return tabs[0].asDocumentTab().getBody();
    }
  } catch (e) {
    // Tabs API not available
  }

  // Fallback to main body
  return doc.getBody();
}

/**
 * Parse a tab name date
 * @param {string} tabName - Tab name like "01_13" or "01/13/26"
 * @returns {Date} Parsed date
 */
function parseTabDate_(tabName) {
  var parts = tabName.split(/[/_]/);
  if (parts.length >= 2) {
    var month = parseInt(parts[0], 10) - 1;
    var day = parseInt(parts[1], 10);
    var year = parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();

    // Handle 2-digit years
    if (year < 100) {
      year += 2000;
    }

    return new Date(year, month, day);
  }
  return new Date(0);
}

/**
 * Extract meeting date from document
 * @param {Document} doc - Google Doc
 * @returns {string} Meeting date in YYYY-MM-DD format or null
 */
function extractMeetingDateFromDoc_(doc) {
  // Try to extract from document name
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

  // Try to get from most recent tab name
  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      var mostRecentTab = null;
      var mostRecentDate = null;

      for (var i = 0; i < tabs.length; i++) {
        var tabName = tabs[i].getTitle();
        if (tabName && tabName.match(/\d{1,2}[/_]\d{1,2}([/_]\d{2,4})?/)) {
          var tabDate = parseTabDate_(tabName);
          if (!mostRecentDate || tabDate > mostRecentDate) {
            mostRecentDate = tabDate;
            mostRecentTab = tabs[i];
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

  // Default to today
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Extract solution identifier from text
 * Supports formats:
 * 1. "Solution Name [solution_id]" - extracts solution_id from square brackets (preferred)
 * 2. "Solution Name (Provider)" - removes provider info in parentheses, returns solution name
 * 3. "Solution Name" - returns as-is
 *
 * Square brackets are used for solution_id to avoid confusion with provider info in parentheses.
 * Database solution_id pattern: lowercase letters, numbers, underscores, hyphens, dots
 * Examples: aq_gmao, hls_vi, opera_dswx, aq_pm2.5, 3d-topo
 *
 * @param {string} text - Raw text like "GMAO [aq_gmao]" or "PBL (JPL)" or "Air Quality"
 * @returns {string} The solution_id if found in brackets, otherwise the cleaned solution name
 */
function extractSolutionName_(text) {
  if (!text) return '';

  text = text.trim();

  // Check for solution_id in square brackets [solution_id]
  // Pattern 1: "Solution Name [solution_id]" - text before brackets
  var bracketMatch = text.match(/^(.+?)\s*\[([^\]]+)\]$/);
  if (bracketMatch) {
    var solId = bracketMatch[2].trim();
    // Return the solution_id directly
    return solId;
  }

  // Pattern 2: "[solution_id]" - just the brackets with no preceding text
  var onlyBracketMatch = text.match(/^\[([^\]]+)\]$/);
  if (onlyBracketMatch) {
    return onlyBracketMatch[1].trim();
  }

  // Check for provider info in parentheses (JPL, GSFC, etc.) - strip it
  var parenMatch = text.match(/^(.+?)\s*\([^)]+\)$/);
  if (parenMatch) {
    return parenMatch[1].trim();
  }

  // No brackets or parentheses - return as-is
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
function syncUpdatesToDatabase_(updates) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Build column index map
  var colIndex = {};
  for (var i = 0; i < headers.length; i++) {
    colIndex[headers[i]] = i;
  }

  // Build existing updates lookup by solution + update_text (for deduplication)
  var existingUpdates = {};
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var key = createUpdateKey_(
      row[colIndex['solution_id']] || '',
      row[colIndex['update_text']] || ''
    );
    existingUpdates[key] = {
      rowIndex: r + 1, // 1-indexed
      data: row
    };
  }

  var results = {
    newUpdates: 0,
    skippedUpdates: 0
  };

  for (var i = 0; i < updates.length; i++) {
    var update = updates[i];
    var key = createUpdateKey_(update.solution, update.update_text);

    if (existingUpdates[key]) {
      // Update already exists
      results.skippedUpdates++;
    } else {
      // New update
      appendNewUpdate_(sheet, headers, update);
      results.newUpdates++;
      // Add to lookup to avoid duplicates within same run
      existingUpdates[key] = true;
    }
  }

  return results;
}

/**
 * Create a key for update deduplication
 * @param {string} solution - Solution name
 * @param {string} updateText - Update text
 * @returns {string} Key
 */
function createUpdateKey_(solution, updateText) {
  // Normalize for comparison
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

  // Routine sync submenu (most recent tab only)
  var routineMenu = ui.createMenu('Routine (Latest Tab)')
    .addItem('Sync All Sources', 'syncAllUpdates')
    .addSeparator()
    .addItem('Internal Agenda', 'syncFromInternalAgenda')
    .addItem('SEP Agenda', 'syncFromSEPAgenda')
    .addItem('OPERA Monthly', 'syncFromOPERA')
    .addItem('PBL Monthly', 'syncFromPBL');

  // Historical sync submenu (all tabs)
  var historicalMenu = ui.createMenu('Historical (All Tabs)')
    .addItem('Sync All Sources', 'syncAllUpdatesHistorical')
    .addSeparator()
    .addItem('Internal Agenda', 'syncFromInternalAgendaHistorical')
    .addItem('SEP Agenda', 'syncFromSEPAgendaHistorical');

  ui.createMenu('Update Sync')
    .addSubMenu(routineMenu)
    .addSubMenu(historicalMenu)
    .addSeparator()
    .addItem('Show Configuration Status', 'showConfigStatus')
    .addToUi();
}

/**
 * Show current configuration status
 */
function showConfigStatus() {
  var config = loadConfigFromSheet_();
  var status = [];

  for (var sourceKey in UPDATE_SOURCES) {
    var source = UPDATE_SOURCES[sourceKey];
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
    '\n\nTo configure, add document IDs to MO-DB_Config sheet.\n\n' +
    'Required keys:\n' +
    '- INTERNAL_AGENDA_ID\n' +
    '- SEP_AGENDA_ID\n' +
    'Optional:\n' +
    '- OPERA_MONTHLY_ID\n' +
    '- PBL_MONTHLY_ID',
    ui.ButtonSet.OK);
}

/**
 * Test function - parse updates from a specific document
 * @param {string} docId - Document ID to test
 */
function testParseDocument(docId) {
  var doc = DocumentApp.openById(docId);
  var docUrl = 'https://docs.google.com/document/d/' + docId;
  var docName = doc.getName();

  Logger.log('Testing document: ' + docName);

  // Try table format first
  var tableUpdates = parseUpdatesFromTableFormat_(doc, {
    displayName: 'Test',
    category: 'TEST'
  }, docUrl, docName);

  Logger.log('Table format found ' + tableUpdates.length + ' updates');

  // Try paragraph format
  var paragraphUpdates = parseUpdatesFromParagraphFormat_(doc, {
    displayName: 'Test',
    category: 'TEST'
  }, docUrl, docName);

  Logger.log('Paragraph format found ' + paragraphUpdates.length + ' updates');

  return {
    tableUpdates: tableUpdates,
    paragraphUpdates: paragraphUpdates
  };
}
