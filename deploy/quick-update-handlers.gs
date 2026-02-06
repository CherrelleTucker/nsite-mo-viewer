/**
 * Quick Update Form - Server-side Handlers
 * =========================================
 * Handles submission of updates to meeting notes documents.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var MEETING_TYPES = {
  'internal-planning': {
    name: 'Weekly Internal Planning',
    configKey: 'INTERNAL_AGENDA_ID',
    structureType: 'tabbed-table',
    handler: 'handleInternalPlanningInsert'
  },
  'sep-strategy': {
    name: 'Weekly SEP Strategy Meeting',
    configKey: 'SEP_AGENDA_ID',
    structureType: 'continuous-sections',
    handler: 'handleSEPStrategyInsert'
  }
};

// Maps dropdown labels to exact document headings
var SOLUTION_HEADINGS = {
  // C5 - 2024
  '3D Topographic Mapping': 'Accessible 3D Topographic Mapping Software',
  'LST Products': 'High-Resolution Harmonized Land Surface Temperature (LST) Products within HLS',
  'FIRMS-2G': 'Second Generation of the Fire Information for Resource Management System (FIRMS-2G)',
  'HLS 10-m': '10-m Harmonized Landsat and Sentinel-2 (HLS) Product',
  'Evapotranspiration (ET)': 'High-Resolution Evapotranspiration (ET) Product within HLS',
  'Pandora': 'Ongoing and Mobile Pandora Measurements in Smoky Regions',

  // C4 - 2022
  'VLM': 'VLM (JPL)',
  'Remote Sensing Training': 'Targeted Remote Sensing Training (ARSET)',
  'TEMPO Enhanced': 'TEMPO Enhanced (SAO)',
  'MWOW': 'MWOW (JPL)',
  'HLS-LL': 'HLS-LL (MSFC)',
  'GABAN': 'GABAN (GSFC)',

  // Cycle 3 - 2020
  'TEMPO NRT': 'TEMPO NRT (SAO)',
  'PBL': 'PBL (JPL)',
  'HLS-VI': 'HLS-VI (MSFC)',
  'Air Quality': 'Air Quality (GSFC)',

  // Cycle 2 - 2018
  'Water Quality': 'Water Quality Product (GSFC)',
  'OPERA': 'OPERA (JPL)',
  'NISAR SM': 'NISAR SM (JPL)',
  'Internet of Animals': 'Internet of Animals (JPL)',
  'ICESat-2 - Lake Ice/Freeboard': 'Low Latency ICESat-2/ATLAS Products (GSFC)',
  'GCC': 'Global Cloud Composites from SatCORPS (GCC from SATCorps)',
  'GACR': 'GEOS-5 Atmospheric Composition Reanalysis (GACR) (GSFC)',

  // Cycle 1 - 2016
  'NISAR Downlink': 'NISAR Downlink (JPL)',
  'HLS': 'HLS (MSFC)',
  'DCD': 'DCD (MSFC)',
  'ADMG': 'ADMG (MSFC)'
};

/**
 * Get the document heading for a dropdown label
 */
function getDocumentHeading(dropdownLabel) {
  return SOLUTION_HEADINGS[dropdownLabel] || dropdownLabel;
}

// ============================================================================
// MAIN SUBMISSION FUNCTION
// ============================================================================

function submitSolutionUpdate(meetingTypes, solutionName, types, updateText) {
  try {
    var authCheck = checkAuthorization();
    if (!authCheck.authorized) {
      throw new Error(authCheck.message);
    }

    // Prevent double submissions server-side
    if (!acquireSubmissionLock(authCheck.email, solutionName, updateText)) {
      throw new Error('Duplicate submission detected. Please wait a moment before resubmitting.');
    }

    var meetingTypesArray = Array.isArray(meetingTypes) ? meetingTypes : [meetingTypes];

    if (meetingTypesArray.length === 0) {
      throw new Error('At least one meeting type must be specified');
    }

    Logger.log('Submission by: ' + authCheck.email +
               ' | Meetings: ' + meetingTypesArray.join(', ') +
               ' | Solution: ' + solutionName);

    var results = [];
    var links = [];
    var errors = [];

    for (var i = 0; i < meetingTypesArray.length; i++) {
      var meetingType = meetingTypesArray[i];

      try {
        var result = submitToSingleMeeting(meetingType, solutionName, types, updateText, authCheck.email);
        results.push(result.message);
        if (result.link) {
          links.push(result.link);
        }
      } catch (error) {
        var config = MEETING_TYPES[meetingType];
        var meetingName = config ? config.name : meetingType;
        errors.push(meetingName + ': ' + getErrorMessage(error));
        Logger.log('Error submitting to ' + meetingName + ': ' + error);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error('All submissions failed:\n\n' + errors.join('\n\n'));
    }

    var response = {
      message: results.join(' | '),
      links: links
    };

    if (errors.length > 0) {
      response.message += '\n\nSome submissions failed: ' + errors.join('; ');
    }

    return response;

  } catch (error) {
    Logger.log('Error in submitSolutionUpdate: ' + error);
    throw new Error('Failed to submit update: ' + getErrorMessage(error));
  }
}

function submitToSingleMeeting(meetingType, solutionName, types, updateText, userEmail) {
  var config = MEETING_TYPES[meetingType];
  if (!config) {
    throw new Error('Invalid meeting type: ' + meetingType);
  }

  var docId = getConfigValue(config.configKey);
  if (!docId) {
    throw new Error('Document ID not configured for: ' + config.name +
                    '\n\nPlease set ' + config.configKey + ' in MO-DB_Config sheet.');
  }

  if (config.handler === 'handleInternalPlanningInsert') {
    return handleInternalPlanningInsert(docId, solutionName, types, updateText, userEmail);
  } else if (config.handler === 'handleSEPStrategyInsert') {
    return handleSEPStrategyInsert(docId, solutionName, types, updateText, userEmail);
  } else {
    throw new Error('Unknown handler: ' + config.handler);
  }
}

// ============================================================================
// INTERNAL PLANNING HANDLER
// ============================================================================

function handleInternalPlanningInsert(docId, solutionName, types, updateText, userEmail) {
  try {
    var doc = DocumentApp.openById(docId);
    var docUrl = 'https://docs.google.com/document/d/' + docId + '/edit';
    var nextMonday = getNextMondayDate();
    var tabName = formatDateForTab(nextMonday);

    var tab = findTabOrError(doc, tabName);

    var body = tab.asDocumentTab().getBody();

    if (solutionName.toLowerCase() === 'walk on') {
      return addToWalkOnRow(body, solutionName, types, updateText, tabName, false, docUrl);
    }

    var solutionLocation = findSolutionInTable(body, solutionName);
    if (!solutionLocation) {
      return addToWalkOnRow(body, solutionName, types, updateText, tabName, true, docUrl);
    }

    var formattedUpdate = formatUpdateText(types, updateText);
    var cell = solutionLocation.cell;
    var solutionIndex = solutionLocation.solutionChildIndex;

    var solutionItem = cell.getChild(solutionIndex).asListItem();
    var solutionNestingLevel = solutionItem.getNestingLevel();
    var targetNestingLevel = solutionNestingLevel + 1;

    // Insert immediately after the solution heading (first position)
    var insertIndex = solutionIndex + 1;
    var newListItem = cell.insertListItem(insertIndex, '\uD83C\uDD95' + formattedUpdate);
    newListItem.setNestingLevel(targetNestingLevel);
    newListItem.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET);
    newListItem.setBold(false);

    return {
      message: 'Update added to ' + solutionName + ' in ' + tabName + '!',
      link: { name: 'Internal Planning', url: docUrl }
    };

  } catch (error) {
    Logger.log('Error in handleInternalPlanningInsert: ' + error);
    throw new Error('Failed to submit to Internal Planning: ' + getErrorMessage(error));
  }
}

// ============================================================================
// SEP STRATEGY HANDLER
// ============================================================================

function handleSEPStrategyInsert(docId, solutionName, types, updateText, userEmail) {
  try {
    var doc = DocumentApp.openById(docId);
    var docUrl = 'https://docs.google.com/document/d/' + docId + '/edit';
    var body = doc.getBody();

    var sectionHeading = findSectionByHeading(body, 'CoDesign Project Actions');
    if (!sectionHeading) {
      throw new Error('Could not find "CoDesign Project Actions" section in SEP document');
    }

    if (solutionName.toLowerCase() === 'walk on') {
      return addToSEPWalkOn(body, solutionName, types, updateText, false, docUrl);
    }

    var solutionLocation = findSolutionInSEPSection(body, solutionName, sectionHeading.index);
    if (!solutionLocation) {
      return addToSEPWalkOn(body, solutionName, types, updateText, true, docUrl);
    }

    var formattedUpdate = formatUpdateText(types, updateText);
    insertInSEPSolution(solutionLocation, formattedUpdate);

    return {
      message: 'Update added to ' + solutionName + ' in SEP Strategy!',
      link: { name: 'SEP Strategy', url: docUrl }
    };

  } catch (error) {
    Logger.log('Error in handleSEPStrategyInsert: ' + error);
    throw new Error('Failed to submit to SEP Strategy: ' + getErrorMessage(error));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNextMondayDate() {
  var today = new Date();
  var dayOfWeek = today.getDay();
  var daysUntilMonday;

  if (dayOfWeek === 1) {
    daysUntilMonday = 0;
  } else if (dayOfWeek === 0) {
    daysUntilMonday = 1;
  } else {
    daysUntilMonday = 8 - dayOfWeek;
  }

  var nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday;
}

function formatDateForTab(date) {
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return month + '_' + day;
}

function findTabByName(doc, tabName) {
  var tabs = doc.getTabs();
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getTitle() === tabName) {
      return tabs[i];
    }
  }
  return null;
}

/**
 * Find a tab by name, or throw user-friendly error if not found
 * @param {Document} doc - The document
 * @param {string} tabName - Name of the tab to find (e.g., "01_20")
 * @returns {Tab} The found tab
 * @throws {Error} If tab not found
 */
function findTabOrError(doc, tabName) {
  var existingTab = findTabByName(doc, tabName);
  if (existingTab) {
    return existingTab;
  }

  throw new Error("Next week's agenda (" + tabName + ") not yet created.");
}

/**
 * Sanitize user input before inserting into document
 * Removes control characters and limits length
 */
function sanitizeInput(text) {
  if (!text) return '';

  // Remove control characters (except newlines/tabs which might be intentional)
  var sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove zero-width characters that could cause issues
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');

  // Limit length to prevent abuse (2000 chars should be plenty for an update)
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000) + '...';
  }

  return sanitized.trim();
}

function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch (e) {
      return String(error);
    }
  }
  return String(error);
}

/**
 * Creates a submission lock to prevent double submissions
 * Returns true if lock acquired, false if duplicate submission detected
 */
function acquireSubmissionLock(email, solutionName, updateText) {
  var cache = CacheService.getUserCache();
  // Create a unique key from email, solution, and first 50 chars of update text
  var lockKey = 'qu_lock_' + email + '_' + solutionName + '_' + updateText.substring(0, 50);

  // Check if this exact submission was made in the last 30 seconds
  var existing = cache.get(lockKey);
  if (existing) {
    Logger.log('Duplicate submission blocked for: ' + email + ' / ' + solutionName);
    return false;
  }

  // Set lock for 30 seconds to prevent rapid duplicates
  cache.put(lockKey, 'locked', 30);
  return true;
}

function formatUpdateText(types, text) {
  var sanitizedText = sanitizeInput(text);
  var prefixes = [];
  if (types.includes('milestone')) prefixes.push('Milestone');
  if (types.includes('action')) prefixes.push('Action');

  if (prefixes.length === 0) return sanitizedText;
  return prefixes.join(', ') + ': ' + sanitizedText;
}

function normalizeSolutionName(text) {
  var cleaned = text.replace(/^[\u25CF\u25CB\u2022]\s*/, '');
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Only remove SHORT parenthetical content (org codes, acronyms) - 2-6 chars
  // Keeps longer ones like (Freeboard/IceThickness)
  cleaned = cleaned.replace(/\s*\([^)]{1,6}\)\s*/g, ' ');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  return cleaned.toLowerCase();
}

function findWalkOnCell(body) {
  var tables = body.getTables();
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var numRows = table.getNumRows();

    for (var r = numRows - 1; r >= 0; r--) {
      var row = table.getRow(r);
      if (row.getNumCells() >= 2) {
        var cell0Text = row.getCell(0).getText().trim().toLowerCase();
        if (cell0Text === 'walk on') {
          return row.getCell(1);
        }
      }
    }
  }
  return null;
}

/**
 * Check if two solution names match (exact or close match)
 * Avoids partial matches like "HLS" matching "HLS-LL"
 */
function solutionNamesMatch(docText, searchText) {
  var doc = docText.toLowerCase().trim();
  var search = searchText.toLowerCase().trim();

  // Exact match
  if (doc === search) return true;

  // Document text starts with search text and next char is space or (
  if (doc.indexOf(search) === 0) {
    var nextChar = doc.charAt(search.length);
    if (nextChar === '' || nextChar === ' ' || nextChar === '(') {
      return true;
    }
  }

  // Search text starts with document text (doc is shorter)
  if (search.indexOf(doc) === 0) {
    var nextChar = search.charAt(doc.length);
    if (nextChar === '' || nextChar === ' ' || nextChar === '(') {
      return true;
    }
  }

  return false;
}

function findSolutionInTable(body, solutionName) {
  var tables = body.getTables();
  // Get the exact heading to search for
  var searchHeading = getDocumentHeading(solutionName);

  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var numRows = table.getNumRows();

    for (var r = 3; r < numRows; r++) {
      var row = table.getRow(r);

      if (row.getNumCells() >= 2) {
        var cell = row.getCell(1);
        var numChildren = cell.getNumChildren();

        for (var i = 0; i < numChildren; i++) {
          var child = cell.getChild(i);

          if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
            var childText = child.asListItem().getText().trim();
            if (childText) {
              // Clean up zero-width chars and compare
              var cleanText = childText.replace(/[\u200B-\u200D\uFEFF]/g, '');
              if (solutionNamesMatch(cleanText, searchHeading)) {
                return { cell: cell, solutionChildIndex: i };
              }
            }
          }
        }
      }
    }
  }
  return null;
}

function addToWalkOnRow(body, solutionName, types, updateText, tabName, isNotFound, docUrl) {
  var walkOnCell = findWalkOnCell(body);
  if (!walkOnCell) {
    return {
      message: 'Could not find "Walk on" row in the ' + tabName + ' tab.',
      link: { name: 'Internal Planning', url: docUrl }
    };
  }

  var formattedUpdate = formatUpdateText(types, updateText);
  var finalText = isNotFound ?
    '\uD83C\uDD95[' + solutionName + '] ' + formattedUpdate :
    '\uD83C\uDD95' + formattedUpdate;

  var numChildren = walkOnCell.getNumChildren();
  var lastContentIndex = -1;

  for (var i = numChildren - 1; i >= 0; i--) {
    var child = walkOnCell.getChild(i);
    var text = child.getType() === DocumentApp.ElementType.PARAGRAPH ?
      child.asParagraph().getText().trim() :
      child.asListItem().getText().trim();
    if (text.length > 0) {
      lastContentIndex = i;
      break;
    }
  }

  var insertIndex = (lastContentIndex === -1) ? 0 : lastContentIndex + 1;
  var newListItem = walkOnCell.insertListItem(insertIndex, finalText);
  newListItem.setGlyphType(DocumentApp.GlyphType.BULLET);
  newListItem.setBold(false);

  if (isNotFound) {
    newListItem.setForegroundColor('#ff0000');
  }

  var message = 'Update added to Walk on in ' + tabName + '!';
  if (isNotFound) {
    message += ' (Note: "' + solutionName + '" not found)';
  }
  return {
    message: message,
    link: { name: 'Internal Planning', url: docUrl }
  };
}

function findSectionByHeading(body, headingText) {
  var numChildren = body.getNumChildren();
  for (var i = 0; i < numChildren; i++) {
    var child = body.getChild(i);
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var para = child.asParagraph();
      var text = para.getText();
      if (text.includes(headingText)) {
        return { element: para, index: i };
      }
    }
  }
  return null;
}

function findSolutionInSEPSection(body, solutionName, sectionStartIndex) {
  // Get the exact heading to search for
  var searchHeading = getDocumentHeading(solutionName);
  var numChildren = body.getNumChildren();

  var majorSections = [
    'SEP Comms and Promotion',
    'SEP Document Administration',
    'External Collaboration',
    'Natasha priority tasks',
    'Walk-ons',
    'Walk on'
  ];

  for (var i = sectionStartIndex + 1; i < numChildren; i++) {
    var child = body.getChild(i);

    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var para = child.asParagraph();
      var text = para.getText().trim();

      if (!text) continue;

      var heading = para.getHeading();
      var cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

      if (solutionNamesMatch(cleanText, searchHeading)) {
        return { element: para, index: i };
      }

      if (heading === DocumentApp.ParagraphHeading.HEADING1) break;

      if (heading === DocumentApp.ParagraphHeading.HEADING2) {
        for (var j = 0; j < majorSections.length; j++) {
          if (text.includes(majorSections[j])) {
            return null;
          }
        }
      }

    } else if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
      var listItem = child.asListItem();
      var text = listItem.getText().trim();

      if (!text) continue;

      var cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

      if (solutionNamesMatch(cleanText, searchHeading)) {
        return { element: listItem, index: i };
      }
    }
  }

  return null;
}

function insertInSEPSolution(solutionLocation, formattedUpdate) {
  var element = solutionLocation.element;
  var index = solutionLocation.index;
  var body = element.getParent();

  var newListItem = body.insertListItem(index + 1, '\uD83C\uDD95' + formattedUpdate);
  newListItem.setGlyphType(DocumentApp.GlyphType.BULLET);
  newListItem.setBold(false);

  return true;
}

function addToSEPWalkOn(body, solutionName, types, updateText, isNotFound, docUrl) {
  var walkOnHeading = findSectionByHeading(body, 'Walk-ons');

  if (!walkOnHeading) {
    walkOnHeading = findSectionByHeading(body, 'Walk on');
  }

  if (!walkOnHeading) {
    var numChildren = body.getNumChildren();
    body.appendParagraph('Walk-ons').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    walkOnHeading = { element: body.getChild(numChildren), index: numChildren };
  }

  var formattedUpdate = formatUpdateText(types, updateText);
  var finalText = isNotFound ?
    '\uD83C\uDD95[' + solutionName + '] ' + formattedUpdate :
    '\uD83C\uDD95' + formattedUpdate;

  var newListItem = body.insertListItem(walkOnHeading.index + 1, finalText);
  newListItem.setGlyphType(DocumentApp.GlyphType.BULLET);
  newListItem.setBold(false);

  if (isNotFound) {
    newListItem.setForegroundColor('#ff0000');
  }

  var message = 'Update added to Walk on in SEP Strategy!';
  if (isNotFound) {
    message += ' (Note: "' + solutionName + '" not found)';
  }
  return {
    message: message,
    link: { name: 'SEP Strategy', url: docUrl }
  };
}

/**
 * Get solution names from database
 * Falls back to hardcoded list if database not configured
 */
function getSolutionNames() {
  try {
    var solutionsSheetId = getConfigValue('SOLUTIONS_SHEET_ID');
    if (solutionsSheetId) {
      var ss = SpreadsheetApp.openById(solutionsSheetId);
      var sheet = ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();

      // Find solution_id column (should be first column)
      var headers = data[0];
      var idCol = headers.indexOf('solution_id');
      var nameCol = headers.indexOf('name');

      // Use name column if available, otherwise solution_id
      var useCol = (nameCol !== -1) ? nameCol : (idCol !== -1 ? idCol : 0);

      var names = ['Walk on']; // Always include Walk on first
      for (var i = 1; i < data.length; i++) {
        var name = data[i][useCol];
        if (name && name.toString().trim()) {
          names.push(name.toString().trim());
        }
      }

      // Sort alphabetically (keeping Walk on which will sort to end, then we move it)
      names.sort();
      // Move "Walk on" to the beginning
      var walkOnIndex = names.indexOf('Walk on');
      if (walkOnIndex > 0) {
        names.splice(walkOnIndex, 1);
        names.unshift('Walk on');
      }

      return names;
    }
  } catch (error) {
    Logger.log('Error loading solutions from database: ' + error);
  }

  // Fallback to hardcoded list if database not available
  return [
    'Walk on',
    '3D Topographic Mapping',
    'ADMG',
    'Air Quality',
    'Remote Sensing Training',
    'DCD',
    'Evapotranspiration (ET)',
    'FIRMS-2G',
    'ICESat-2 - Lake Ice/Freeboard',
    'GABAN',
    'GACR',
    'GCC',
    'HLS',
    'HLS 10-m',
    'HLS-LL',
    'HLS-VI',
    'Internet of Animals',
    'LST Products',
    'MWOW',
    'NISAR Downlink',
    'NISAR SM',
    'OPERA',
    'Pandora',
    'PBL',
    'TEMPO Enhanced',
    'TEMPO NRT',
    'VLM',
    'Water Quality'
  ].sort();
}

// ============================================================================
// TEST FUNCTIONS - Run from Apps Script Editor
// ============================================================================

/**
 * Test all solutions on both agendas
 * Run this from the Apps Script editor: Run > testAllSolutions
 * Check the Execution Log for results
 */
function testAllSolutions() {
  var solutions = getSolutionNames();
  var results = {
    internal: { found: [], notFound: [], errors: [] },
    sep: { found: [], notFound: [], errors: [] }
  };

  Logger.log('========================================');
  Logger.log('TESTING ALL SOLUTIONS');
  Logger.log('========================================\n');

  // Test Internal Planning
  Logger.log('--- INTERNAL PLANNING ---');
  var internalDocId = getConfigValue('INTERNAL_AGENDA_ID');
  if (internalDocId) {
    try {
      var doc = DocumentApp.openById(internalDocId);
      var nextMonday = getNextMondayDate();
      var tabName = formatDateForTab(nextMonday);
      var tab = findTabByName(doc, tabName);

      if (tab) {
        var body = tab.asDocumentTab().getBody();

        for (var i = 0; i < solutions.length; i++) {
          var solution = solutions[i];
          if (solution.toLowerCase() === 'walk on') continue;

          var location = findSolutionInTable(body, solution);
          if (location) {
            results.internal.found.push(solution);
          } else {
            results.internal.notFound.push(solution);
          }
        }
      } else {
        Logger.log('ERROR: Tab "' + tabName + '" not found');
      }
    } catch (e) {
      Logger.log('ERROR accessing Internal Planning: ' + e.message);
    }
  } else {
    Logger.log('ERROR: INTERNAL_AGENDA_ID not configured in MO-DB_Config');
  }

  Logger.log('Found (' + results.internal.found.length + '): ' + results.internal.found.join(', '));
  Logger.log('NOT Found (' + results.internal.notFound.length + '): ' + results.internal.notFound.join(', '));

  // Test SEP Strategy
  Logger.log('\n--- SEP STRATEGY ---');
  var sepDocId = getConfigValue('SEP_AGENDA_ID');
  if (sepDocId) {
    try {
      var doc = DocumentApp.openById(sepDocId);
      var body = doc.getBody();

      var sectionHeading = findSectionByHeading(body, 'CoDesign Project Actions');
      if (sectionHeading) {
        for (var i = 0; i < solutions.length; i++) {
          var solution = solutions[i];
          if (solution.toLowerCase() === 'walk on') continue;

          var location = findSolutionInSEPSection(body, solution, sectionHeading.index);
          if (location) {
            results.sep.found.push(solution);
          } else {
            results.sep.notFound.push(solution);
          }
        }
      } else {
        Logger.log('ERROR: CoDesign Project Actions section not found');
      }
    } catch (e) {
      Logger.log('ERROR accessing SEP Strategy: ' + e.message);
    }
  } else {
    Logger.log('ERROR: SEP_AGENDA_ID not configured in MO-DB_Config');
  }

  Logger.log('Found (' + results.sep.found.length + '): ' + results.sep.found.join(', '));
  Logger.log('NOT Found (' + results.sep.notFound.length + '): ' + results.sep.notFound.join(', '));

  // Summary
  Logger.log('\n========================================');
  Logger.log('SUMMARY');
  Logger.log('========================================');
  Logger.log('Internal Planning: ' + results.internal.found.length + ' found, ' + results.internal.notFound.length + ' not found');
  Logger.log('SEP Strategy: ' + results.sep.found.length + ' found, ' + results.sep.notFound.length + ' not found');

  if (results.internal.notFound.length > 0 || results.sep.notFound.length > 0) {
    Logger.log('\n--- SOLUTIONS NEEDING ATTENTION ---');
    var allNotFound = {};
    results.internal.notFound.forEach(function(s) { allNotFound[s] = (allNotFound[s] || '') + ' [Internal]'; });
    results.sep.notFound.forEach(function(s) { allNotFound[s] = (allNotFound[s] || '') + ' [SEP]'; });

    Object.keys(allNotFound).sort().forEach(function(s) {
      Logger.log('  ' + s + ':' + allNotFound[s]);
    });
  }

  return results;
}

/**
 * Test a single solution on both agendas
 * Usage: testSingleSolution('GABAN')
 */
function testSingleSolution(solutionName) {
  Logger.log('Testing: ' + solutionName);
  Logger.log('Normalized: ' + normalizeSolutionName(solutionName));

  // Test Internal
  var internalDocId = getConfigValue('INTERNAL_AGENDA_ID');
  if (internalDocId) {
    var doc = DocumentApp.openById(internalDocId);
    var nextMonday = getNextMondayDate();
    var tabName = formatDateForTab(nextMonday);
    var tab = findTabByName(doc, tabName);

    if (tab) {
      var body = tab.asDocumentTab().getBody();
      var location = findSolutionInTable(body, solutionName);
      Logger.log('Internal Planning (' + tabName + '): ' + (location ? 'FOUND' : 'NOT FOUND'));
    }
  }

  // Test SEP
  var sepDocId = getConfigValue('SEP_AGENDA_ID');
  if (sepDocId) {
    var doc = DocumentApp.openById(sepDocId);
    var body = doc.getBody();
    var sectionHeading = findSectionByHeading(body, 'CoDesign Project Actions');

    if (sectionHeading) {
      var location = findSolutionInSEPSection(body, solutionName, sectionHeading.index);
      Logger.log('SEP Strategy: ' + (location ? 'FOUND' : 'NOT FOUND'));
    }
  }
}

/**
 * List all solution names found in Internal Planning document
 * Useful for debugging what text is actually in the document
 */
function listInternalSolutions() {
  var internalDocId = getConfigValue('INTERNAL_AGENDA_ID');
  if (!internalDocId) {
    Logger.log('INTERNAL_AGENDA_ID not configured in MO-DB_Config');
    return;
  }

  var doc = DocumentApp.openById(internalDocId);
  var nextMonday = getNextMondayDate();
  var tabName = formatDateForTab(nextMonday);
  var tab = findTabByName(doc, tabName);

  if (!tab) {
    Logger.log('Tab "' + tabName + '" not found');
    return;
  }

  var body = tab.asDocumentTab().getBody();
  var tables = body.getTables();
  var solutions = [];

  Logger.log('Solutions found in Internal Planning (' + tabName + '):');
  Logger.log('----------------------------------------');

  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var numRows = table.getNumRows();

    for (var r = 3; r < numRows; r++) {
      var row = table.getRow(r);
      if (row.getNumCells() >= 2) {
        var cell = row.getCell(1);
        var numChildren = cell.getNumChildren();

        for (var i = 0; i < numChildren; i++) {
          var child = cell.getChild(i);
          if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
            var listItem = child.asListItem();
            if (listItem.getNestingLevel() === 0) {
              var text = listItem.getText().trim();
              if (text) {
                Logger.log('  "' + text + '"');
                Logger.log('    -> normalized: "' + normalizeSolutionName(text) + '"');
                solutions.push(text);
              }
            }
          }
        }
      }
    }
  }

  Logger.log('\nTotal: ' + solutions.length + ' solutions');
  return solutions;
}

/**
 * List all solution names found in SEP Strategy document
 */
/**
 * Debug function - Check Quick Update configuration
 * Run this to verify document IDs are correct
 */
function debugQuickUpdateConfig() {
  Logger.log('=== QUICK UPDATE CONFIG DEBUG ===\n');

  var internalId = getConfigValue('INTERNAL_AGENDA_ID');
  var sepId = getConfigValue('SEP_AGENDA_ID');

  Logger.log('INTERNAL_AGENDA_ID: ' + (internalId || 'NOT SET'));
  Logger.log('SEP_AGENDA_ID: ' + (sepId || 'NOT SET'));
  Logger.log('');

  // Check Internal Planning
  if (internalId) {
    try {
      var doc = DocumentApp.openById(internalId);
      Logger.log('Internal Planning document: ' + doc.getName());
      Logger.log('  URL: https://docs.google.com/document/d/' + internalId);

      // Check for tabs
      var tabs = doc.getTabs();
      Logger.log('  Tabs found: ' + tabs.length);
      if (tabs.length > 0) {
        Logger.log('  First tab: ' + tabs[0].getTitle());
        Logger.log('  Last tab: ' + tabs[tabs.length - 1].getTitle());
      }
    } catch (e) {
      Logger.log('ERROR opening Internal Planning: ' + e.message);
    }
  }

  Logger.log('');

  // Check SEP Strategy
  if (sepId) {
    try {
      var doc = DocumentApp.openById(sepId);
      Logger.log('SEP Strategy document: ' + doc.getName());
      Logger.log('  URL: https://docs.google.com/document/d/' + sepId);

      // Check for CoDesign section
      var body = doc.getBody();
      var section = findSectionByHeading(body, 'CoDesign Project Actions');
      Logger.log('  CoDesign Project Actions section: ' + (section ? 'FOUND' : 'NOT FOUND'));
    } catch (e) {
      Logger.log('ERROR opening SEP Strategy: ' + e.message);
    }
  }

  Logger.log('\n=== END DEBUG ===');
}

function listSEPSolutions() {
  var sepDocId = getConfigValue('SEP_AGENDA_ID');
  if (!sepDocId) {
    Logger.log('SEP_AGENDA_ID not configured in MO-DB_Config');
    return;
  }

  var doc = DocumentApp.openById(sepDocId);
  var body = doc.getBody();
  var sectionHeading = findSectionByHeading(body, 'CoDesign Project Actions');

  if (!sectionHeading) {
    Logger.log('CoDesign Project Actions section not found');
    return;
  }

  var solutions = [];
  var numChildren = body.getNumChildren();

  var majorSections = [
    'SEP Comms and Promotion',
    'SEP Document Administration',
    'External Collaboration',
    'Natasha priority tasks',
    'Walk-ons',
    'Walk on'
  ];

  Logger.log('Solutions found in SEP Strategy (CoDesign Project Actions):');
  Logger.log('------------------------------------------------------------');

  for (var i = sectionHeading.index + 1; i < numChildren; i++) {
    var child = body.getChild(i);

    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var para = child.asParagraph();
      var text = para.getText().trim();
      var heading = para.getHeading();

      if (!text) continue;

      // Stop at major sections
      if (heading === DocumentApp.ParagraphHeading.HEADING1) break;

      if (heading === DocumentApp.ParagraphHeading.HEADING2) {
        var isMajor = false;
        for (var j = 0; j < majorSections.length; j++) {
          if (text.includes(majorSections[j])) {
            isMajor = true;
            break;
          }
        }
        if (isMajor) break;
      }

      // Log headings that might be solutions
      if (heading === DocumentApp.ParagraphHeading.HEADING3 ||
          heading === DocumentApp.ParagraphHeading.HEADING4) {
        Logger.log('  "' + text + '"');
        Logger.log('    -> normalized: "' + normalizeSolutionName(text) + '"');
        solutions.push(text);
      }
    }
  }

  Logger.log('\nTotal: ' + solutions.length + ' solutions');
  return solutions;
}
