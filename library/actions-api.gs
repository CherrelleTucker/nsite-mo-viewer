/**
 * Actions API
 * ===========
 * Data access layer for MO-DB_Actions
 * Provides CRUD operations and action tracking queries
 */

// ============================================================================
// CACHE
// ============================================================================

var _actionsCache = null;
var _actionsCacheTime = null;
var ACTIONS_CACHE_DURATION = 60 * 1000; // 1 minute

/**
 * Clear actions cache
 */
function clearActionsCache() {
  _actionsCache = null;
  _actionsCacheTime = null;
}

// ============================================================================
// CORE DATA ACCESS
// ============================================================================

/**
 * Get all actions from the database
 * @param {number} limit - Optional limit on results
 * @returns {Array} Array of action objects
 */
function getAllActions(limit) {
  // Check cache
  if (_actionsCache && _actionsCacheTime &&
      (new Date().getTime() - _actionsCacheTime) < ACTIONS_CACHE_DURATION) {
    var cached = _actionsCache;
    if (limit) cached = cached.slice(0, limit);
    return cached;
  }

  try {
    var sheet = getDatabaseSheet('Actions');
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    var headers = data[0];
    var actions = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var action = {};

      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var value = row[j];

        // Format dates
        if ((key === 'due_date' || key === 'source_date' || key === 'created_at' || key === 'updated_at') && value instanceof Date) {
          action[key] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else {
          action[key] = value !== undefined && value !== null ? value : '';
        }
      }

      if (action.action_id || action.task) {
        actions.push(action);
      }
    }

    // Sort by created_at descending (newest first)
    actions.sort(function(a, b) {
      var dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      var dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    });

    // Update cache
    _actionsCache = actions;
    _actionsCacheTime = new Date().getTime();

    if (limit) {
      return actions.slice(0, limit);
    }

    return actions;
  } catch (error) {
    Logger.log('Error in getAllActions: ' + error);
    throw new Error('Failed to load actions: ' + error.message);
  }
}

/**
 * Get a single action by ID
 * @param {string} actionId - The action ID
 * @returns {Object|null} Action object or null
 */
function getActionById(actionId) {
  var actions = getAllActions();
  for (var i = 0; i < actions.length; i++) {
    if (actions[i].action_id === actionId) {
      return actions[i];
    }
  }
  return null;
}

// ============================================================================
// FILTERED QUERIES
// ============================================================================

/**
 * Get actions by status
 * @param {string} status - Status to filter by
 * @returns {Array} Filtered actions
 */
function getActionsByStatus(status) {
  var actions = getAllActions();
  var statusLower = status.toLowerCase();

  return actions.filter(function(action) {
    var actionStatus = (action.status || '').toLowerCase();
    return actionStatus === statusLower;
  });
}

/**
 * Get actions by category
 * @param {string} category - Category to filter by (MO, SEP, DevSeed, Assessment, AdHoc)
 * @returns {Array} Filtered actions
 */
function getActionsByCategory(category) {
  var actions = getAllActions();
  var categoryLower = category.toLowerCase();

  return actions.filter(function(action) {
    var actionCategory = (action.category || '').toLowerCase();
    return actionCategory === categoryLower;
  });
}

/**
 * Get actions assigned to a specific person
 * @param {string} assignee - Person name
 * @returns {Array} Filtered actions
 */
function getActionsByAssignee(assignee) {
  var actions = getAllActions();
  var assigneeLower = assignee.toLowerCase();

  return actions.filter(function(action) {
    var assigned = (action.assigned_to || '').toLowerCase();
    return assigned.indexOf(assigneeLower) !== -1;
  });
}

/**
 * Get open (non-done) actions
 * @returns {Array} Open actions
 */
function getOpenActions() {
  var actions = getAllActions();

  return actions.filter(function(action) {
    var status = (action.status || '').toLowerCase();
    return status !== 'done';
  });
}

/**
 * Get overdue actions
 * @returns {Array} Overdue actions
 */
function getOverdueActions() {
  var actions = getAllActions();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  return actions.filter(function(action) {
    if (!action.due_date) return false;
    var status = (action.status || '').toLowerCase();
    if (status === 'done') return false;

    var dueDate = new Date(action.due_date);
    return dueDate < today;
  });
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get action pipeline counts by status
 * @returns {Object} Counts by status
 */
function getActionPipelineCounts() {
  var actions = getAllActions();
  var counts = {
    not_started: 0,
    in_progress: 0,
    done: 0,
    blocked: 0,
    total: actions.length
  };

  actions.forEach(function(action) {
    var status = (action.status || 'not_started').toLowerCase().replace(' ', '_');
    if (counts.hasOwnProperty(status)) {
      counts[status]++;
    } else {
      counts.not_started++;
    }
  });

  return counts;
}

/**
 * Get counts by category
 * @returns {Object} Counts by category
 */
function getActionCategoryCounts() {
  var actions = getAllActions();
  var counts = {};

  actions.forEach(function(action) {
    var category = action.category || 'Other';
    counts[category] = (counts[category] || 0) + 1;
  });

  return counts;
}

/**
 * Get counts by assignee
 * @returns {Object} Counts by assignee
 */
function getActionAssigneeCounts() {
  var actions = getOpenActions();
  var counts = {};

  actions.forEach(function(action) {
    var assignee = action.assigned_to || 'Unassigned';
    counts[assignee] = (counts[assignee] || 0) + 1;
  });

  return counts;
}

/**
 * Get comprehensive actions statistics
 * @returns {Object} Statistics object
 */
function getActionsStats() {
  var actions = getAllActions();
  var openActions = getOpenActions();
  var overdueActions = getOverdueActions();

  // Recent activity (last 7 days)
  var weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  var recentlyCreated = actions.filter(function(action) {
    if (!action.created_at) return false;
    return new Date(action.created_at) >= weekAgo;
  }).length;

  var recentlyUpdated = actions.filter(function(action) {
    if (!action.updated_at) return false;
    return new Date(action.updated_at) >= weekAgo;
  }).length;

  return {
    total: actions.length,
    open: openActions.length,
    overdue: overdueActions.length,
    recentlyCreated: recentlyCreated,
    recentlyUpdated: recentlyUpdated,
    pipeline: getActionPipelineCounts(),
    byCategory: getActionCategoryCounts(),
    byAssignee: getActionAssigneeCounts()
  };
}

/**
 * Get actions overview for dashboard
 * @returns {Object} Overview data
 */
function getActionsOverview() {
  return {
    stats: getActionsStats(),
    recentActions: getAllActions(10),
    overdueActions: getOverdueActions().slice(0, 5)
  };
}

// ============================================================================
// CREATE/UPDATE OPERATIONS
// ============================================================================

/**
 * Create a new action
 * @param {Object} actionData - Action data
 * @returns {string} New action ID
 */
function createAction(actionData) {
  try {
    var sheet = getDatabaseSheet('Actions');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    var timestamp = new Date().toISOString();
    var actionId = generateActionId_();

    var newRow = headers.map(function(header) {
      switch (header) {
        case 'action_id':
          return actionId;
        case 'source_document':
          return actionData.source_document || '';
        case 'source_date':
          return actionData.source_date || '';
        case 'source_url':
          return actionData.source_url || '';
        case 'category':
          return actionData.category || 'MO';
        case 'solution':
          return actionData.solution || actionData.category || 'MO';
        case 'status':
          return actionData.status || 'not_started';
        case 'assigned_to':
          return actionData.assigned_to || '';
        case 'task':
          return actionData.task || '';
        case 'due_date':
          return actionData.due_date || '';
        case 'priority':
          return actionData.priority || 'medium';
        case 'notes':
          return actionData.notes || '';
        case 'created_at':
          return timestamp;
        case 'updated_at':
          return timestamp;
        case 'created_by':
          return actionData.created_by || Session.getEffectiveUser().getEmail() || 'manual';
        default:
          return '';
      }
    });

    sheet.appendRow(newRow);
    clearActionsCache();

    return actionId;
  } catch (error) {
    Logger.log('Error in createAction: ' + error);
    throw new Error('Failed to create action: ' + error.message);
  }
}

/**
 * Update an existing action
 * @param {string} actionId - Action ID to update
 * @param {Object} updates - Fields to update
 * @returns {boolean} Success status
 */
function updateAction(actionId, updates) {
  try {
    var sheet = getDatabaseSheet('Actions');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idCol = headers.indexOf('action_id');
    if (idCol === -1) throw new Error('action_id column not found');

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === actionId) {
        rowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Action not found: ' + actionId);
    }

    // Update fields
    for (var field in updates) {
      var colIndex = headers.indexOf(field);
      if (colIndex !== -1 && field !== 'action_id') {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updates[field]);
      }
    }

    // Update timestamp
    var updatedAtCol = headers.indexOf('updated_at');
    if (updatedAtCol !== -1) {
      sheet.getRange(rowIndex, updatedAtCol + 1).setValue(new Date().toISOString());
    }

    clearActionsCache();
    return true;
  } catch (error) {
    Logger.log('Error in updateAction: ' + error);
    throw new Error('Failed to update action: ' + error.message);
  }
}

/**
 * Quick status update for an action
 * Also pushes the status change back to the source agenda document
 * @param {string} actionId - Action ID
 * @param {string} newStatus - New status value
 * @returns {boolean} Success status
 */
function updateActionStatus(actionId, newStatus) {
  // Update in database
  var success = updateAction(actionId, { status: newStatus });

  if (success) {
    // Get the full action data to push to agenda
    clearActionsCache();
    var action = getActionById(actionId);
    if (action) {
      try {
        pushStatusToSourceAgenda_(action);
      } catch (err) {
        Logger.log('Failed to push status to agenda: ' + err);
        // Don't fail the update if push fails
      }
    }
  }

  return success;
}

/**
 * Push a status change back to the source agenda document
 * @param {Object} action - Action object with source_url, task, assigned_to, status
 */
function pushStatusToSourceAgenda_(action) {
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
    var tableInfo = findActionTableInDoc_(doc);

    if (!tableInfo.found) {
      Logger.log('Action Items table not found in source document');
      return false;
    }

    // Find and update the matching row
    var updated = updateActionRowInTable_(tableInfo.table, action);

    if (updated) {
      Logger.log('Pushed status "' + action.status + '" to agenda for: ' + (action.task || '').substring(0, 50));
    }

    return updated;
  } catch (err) {
    Logger.log('Error pushing to agenda: ' + err);
    return false;
  }
}

/**
 * Find the Action Items table in a document (checks tabs)
 */
function findActionTableInDoc_(doc) {
  // Try to find "Action Items" tab
  try {
    var tabs = doc.getTabs();
    if (tabs && tabs.length > 0) {
      // First look for tab named "Action Items"
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabTitle = tab.getTitle();
        if (tabTitle && tabTitle.toLowerCase().indexOf('action') !== -1) {
          var result = findTableWithActionColumns_(tab.asDocumentTab().getBody());
          if (result.found) {
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
    // Tabs API not available
  }

  // Fallback to main body
  return findTableWithActionColumns_(doc.getBody());
}

/**
 * Find a table with Status, Owner, Action columns
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
      if (headerText.indexOf('status') !== -1 &&
          headerText.indexOf('owner') !== -1 &&
          headerText.indexOf('action') !== -1) {
        return { found: true, table: table };
      }
    }
  }
  return { found: false };
}

/**
 * Find and update an action's status in the table
 */
function updateActionRowInTable_(table, action) {
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
    return false;
  }

  // Find matching row by task text
  for (var r = 1; r < numRows; r++) {
    var row = table.getRow(r);
    var taskText = row.getCell(colMap.action).getText().trim();

    if (taskText === action.task) {
      // Verify owner if available
      if (colMap.owner !== undefined && action.assigned_to) {
        var owner = row.getCell(colMap.owner).getText().trim();
        if (owner !== action.assigned_to) {
          continue;
        }
      }

      // Update the status
      var displayStatus = formatStatusForDisplay_(action.status);
      row.getCell(colMap.status).setText(displayStatus);
      return true;
    }
  }

  return false;
}

/**
 * Format status for display in agenda (title case)
 */
function formatStatusForDisplay_(status) {
  var map = {
    'done': 'Done',
    'in_progress': 'In Progress',
    'pending': 'Pending',
    'not_started': 'Not Started'
  };
  return map[status] || status;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique action ID
 * @returns {string} Action ID
 */
function generateActionId_() {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var random = Math.floor(Math.random() * 9000) + 1000;
  return 'ACT_' + dateStr + '_' + random;
}

/**
 * Get unique assignees for filters
 * @returns {Array} List of unique assignees
 */
function getUniqueAssignees() {
  var actions = getAllActions();
  var assignees = {};

  actions.forEach(function(action) {
    var assignee = action.assigned_to;
    if (assignee && assignee.trim()) {
      assignees[assignee.trim()] = true;
    }
  });

  return Object.keys(assignees).sort();
}

/**
 * Get unique categories for filters
 * @returns {Array} List of unique categories
 */
function getUniqueCategories() {
  var actions = getAllActions();
  var categories = {};

  actions.forEach(function(action) {
    var category = action.category;
    if (category && category.trim()) {
      categories[category.trim()] = true;
    }
  });

  return Object.keys(categories).sort();
}

/**
 * Get unique solutions for filters
 * @returns {Array} List of unique solutions
 */
function getUniqueSolutions() {
  var actions = getAllActions();
  var solutions = {};

  actions.forEach(function(action) {
    var solution = action.solution;
    if (solution && solution.trim()) {
      solutions[solution.trim()] = true;
    }
  });

  return Object.keys(solutions).sort();
}
