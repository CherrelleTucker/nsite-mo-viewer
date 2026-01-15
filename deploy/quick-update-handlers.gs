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
    documentIdKey: 'INTERNAL_PLANNING_DOCUMENT_ID',
    structureType: 'tabbed-table',
    handler: 'handleInternalPlanningInsert'
  },
  'sep-strategy': {
    name: 'Weekly SEP Strategy Meeting',
    documentIdKey: 'SEP_STRATEGY_DOCUMENT_ID',
    structureType: 'continuous-sections',
    handler: 'handleSEPStrategyInsert'
  }
};

// ============================================================================
// MAIN SUBMISSION FUNCTION
// ============================================================================

function submitSolutionUpdate(meetingTypes, solutionName, types, updateText) {
  try {
    var authCheck = checkAuthorization();
    if (!authCheck.authorized) {
      throw new Error(authCheck.message);
    }

    var meetingTypesArray = Array.isArray(meetingTypes) ? meetingTypes : [meetingTypes];

    if (meetingTypesArray.length === 0) {
      throw new Error('At least one meeting type must be specified');
    }

    Logger.log('Submission by: ' + authCheck.email +
               ' | Meetings: ' + meetingTypesArray.join(', ') +
               ' | Solution: ' + solutionName);

    var results = [];
    var errors = [];

    for (var i = 0; i < meetingTypesArray.length; i++) {
      var meetingType = meetingTypesArray[i];

      try {
        var result = submitToSingleMeeting(meetingType, solutionName, types, updateText, authCheck.email);
        results.push(result);
      } catch (error) {
        var config = MEETING_TYPES[meetingType];
        var meetingName = config ? config.name : meetingType;
        errors.push(meetingName + ': ' + error.message);
        Logger.log('Error submitting to ' + meetingName + ': ' + error);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error('All submissions failed:\n\n' + errors.join('\n\n'));
    } else if (errors.length > 0) {
      return results.join('\n\n') + '\n\nSome submissions failed:\n' + errors.join('\n');
    } else {
      return results.join('\n\n');
    }

  } catch (error) {
    Logger.log('Error in submitSolutionUpdate: ' + error);
    throw new Error('Failed to submit update: ' + error.message);
  }
}

function submitToSingleMeeting(meetingType, solutionName, types, updateText, userEmail) {
  var config = MEETING_TYPES[meetingType];
  if (!config) {
    throw new Error('Invalid meeting type: ' + meetingType);
  }

  var docId = getProperty(config.documentIdKey);
  if (!docId) {
    throw new Error('Document ID not configured for: ' + config.name +
                    '\n\nPlease configure ' + config.documentIdKey + ' in Script Properties.');
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
    var nextMonday = getNextMondayDate();
    var tabName = formatDateForTab(nextMonday);

    var tab = findTabByName(doc, tabName);
    if (!tab) {
      return 'Could not find tab "' + tabName + '" for next Monday.';
    }

    var body = tab.asDocumentTab().getBody();

    if (solutionName.toLowerCase() === 'walk on') {
      return addToWalkOnRow(body, solutionName, types, updateText, tabName, false);
    }

    var solutionLocation = findSolutionInTable(body, solutionName);
    if (!solutionLocation) {
      return addToWalkOnRow(body, solutionName, types, updateText, tabName, true);
    }

    var formattedUpdate = formatUpdateText(types, updateText);
    var cell = solutionLocation.cell;
    var solutionIndex = solutionLocation.solutionChildIndex;

    var solutionItem = cell.getChild(solutionIndex).asListItem();
    var solutionNestingLevel = solutionItem.getNestingLevel();
    var targetNestingLevel = solutionNestingLevel + 1;

    var numChildren = cell.getNumChildren();
    var lastNestedIndex = solutionIndex;

    for (var i = solutionIndex + 1; i < numChildren; i++) {
      var child = cell.getChild(i);
      if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
        var listItem = child.asListItem();
        var itemNestingLevel = listItem.getNestingLevel();

        if (itemNestingLevel <= solutionNestingLevel) break;
        if (itemNestingLevel === targetNestingLevel) lastNestedIndex = i;
      }
    }

    var insertIndex = lastNestedIndex + 1;
    var newListItem = cell.insertListItem(insertIndex, '\uD83C\uDD95' + formattedUpdate);
    newListItem.setNestingLevel(targetNestingLevel);
    newListItem.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET);
    newListItem.setBold(false);

    return 'Update added to ' + solutionName + ' in the ' + tabName + ' tab!';

  } catch (error) {
    Logger.log('Error in handleInternalPlanningInsert: ' + error);
    throw new Error('Failed to submit to Internal Planning: ' + error.message);
  }
}

// ============================================================================
// SEP STRATEGY HANDLER
// ============================================================================

function handleSEPStrategyInsert(docId, solutionName, types, updateText, userEmail) {
  try {
    var doc = DocumentApp.openById(docId);
    var body = doc.getBody();

    var sectionHeading = findSectionByHeading(body, 'CoDesign Project Actions');
    if (!sectionHeading) {
      throw new Error('Could not find "CoDesign Project Actions" section in SEP document');
    }

    if (solutionName.toLowerCase() === 'walk on') {
      return addToSEPWalkOn(body, solutionName, types, updateText);
    }

    var solutionLocation = findSolutionInSEPSection(body, solutionName, sectionHeading.index);
    if (!solutionLocation) {
      return addToSEPWalkOn(body, solutionName, types, updateText, true);
    }

    var formattedUpdate = formatUpdateText(types, updateText);
    insertInSEPSolution(solutionLocation, formattedUpdate);

    return 'Update added to ' + solutionName + ' in SEP Strategy Meeting!';

  } catch (error) {
    Logger.log('Error in handleSEPStrategyInsert: ' + error);
    throw new Error('Failed to submit to SEP Strategy: ' + error.message);
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

function formatUpdateText(types, text) {
  var prefixes = [];
  if (types.indexOf('milestone') !== -1) prefixes.push('Milestone');
  if (types.indexOf('action') !== -1) prefixes.push('Action');

  if (prefixes.length === 0) return text;
  return prefixes.join(', ') + ': ' + text;
}

function normalizeSolutionName(text) {
  var cleaned = text.replace(/^[\u25CF\u25CB\u2022]\s*/, '');
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/\s*\((JPL|GSFC|MSFC|SAO|ARSET)\)\s*$/i, '');
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

function findSolutionInTable(body, solutionName) {
  var tables = body.getTables();
  var searchName = normalizeSolutionName(solutionName);

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
              var normalizedText = normalizeSolutionName(childText);
              // Partial match - search term found within document text
              if (normalizedText.indexOf(searchName) !== -1 ||
                  searchName.indexOf(normalizedText) !== -1) {
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

function addToWalkOnRow(body, solutionName, types, updateText, tabName, isNotFound) {
  var walkOnCell = findWalkOnCell(body);
  if (!walkOnCell) {
    return 'Could not find "Walk on" row in the ' + tabName + ' tab.';
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

  var message = 'Update added to Walk on section in ' + tabName + ' tab!';
  if (isNotFound) {
    message += '\n\nNote: "' + solutionName + '" was not found in the meeting notes.';
  }
  return message;
}

function findSectionByHeading(body, headingText) {
  var numChildren = body.getNumChildren();
  for (var i = 0; i < numChildren; i++) {
    var child = body.getChild(i);
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var para = child.asParagraph();
      var text = para.getText();
      if (text.indexOf(headingText) !== -1) {
        return { element: para, index: i };
      }
    }
  }
  return null;
}

function findSolutionInSEPSection(body, solutionName, sectionStartIndex) {
  var normalized = normalizeSolutionName(solutionName);
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
      var normalizedText = normalizeSolutionName(text);

      if (normalizedText.indexOf(normalized) !== -1 ||
          normalized.indexOf(normalizedText) !== -1 ||
          text.toLowerCase().indexOf(solutionName.toLowerCase()) !== -1) {
        return { element: para, index: i };
      }

      if (heading === DocumentApp.ParagraphHeading.HEADING1) break;

      if (heading === DocumentApp.ParagraphHeading.HEADING2) {
        for (var j = 0; j < majorSections.length; j++) {
          if (text.indexOf(majorSections[j]) !== -1) {
            return null;
          }
        }
      }

    } else if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
      var listItem = child.asListItem();
      var text = listItem.getText().trim();

      if (!text) continue;

      var normalizedText = normalizeSolutionName(text);

      if (normalizedText.indexOf(normalized) !== -1 ||
          normalized.indexOf(normalizedText) !== -1 ||
          text.toLowerCase().indexOf(solutionName.toLowerCase()) !== -1) {
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

function addToSEPWalkOn(body, solutionName, types, updateText, isNotFound) {
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

  var message = 'Update added to Walk on section in SEP Strategy Meeting!';
  if (isNotFound) {
    message += '\n\nNote: "' + solutionName + '" was not found in the SEP meeting notes.';
  }
  return message;
}

function getSolutionNames() {
  return [
    'Walk on',
    'Accessible 3D Topographic Mapping Software',
    'ADMG (MSFC)',
    'Air Quality (GSFC)',
    'DCD (MSFC)',
    'GABAN (GSFC)',
    'GEOS-5 Atmospheric Composition Reanalysis (GACR) (GSFC)',
    'Global Cloud Composites from SatCORPS (GCC from SATCorps)',
    'HLS (MSFC)',
    'HLS-LL (MSFC)',
    'HLS-VI (MSFC)',
    'High-Resolution Harmonized Land Surface Temperature (LST) Products within HLS',
    'ICESat-2/ATLAS (Freeboard/IceThickness) (GSFC)',
    'Internet of Animals (JPL)',
    'MWOW (JPL)',
    'NISAR Downlink (JPL)',
    'NISAR SM (JPL)',
    'OPERA (JPL)',
    'PBL (JPL)',
    'Second Generation of the Fire Information for Resource Management System (FIRMS-2G)',
    'TEMPO Enhanced (SAO)',
    'TEMPO NRT (SAO)',
    'Targeted Remote Sensing Training (ARSET)',
    'VLM (JPL)',
    'Water Quality Product (GSFC)'
  ].sort();
}
