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
function clearActionsCache_() {
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
    // Missing dates default to epoch (1970) so they sort to the bottom
    actions.sort(function(a, b) {
      var dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      var dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;  // Negative = a after b (descending)
    });

    // Update cache
    _actionsCache = actions;
    _actionsCacheTime = new Date().getTime();

    var result = limit ? actions.slice(0, limit) : actions;
    logResponseSize(result, 'getAllActions');
    return result;
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
  return getById(getAllActions(), 'action_id', actionId);
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
  return filterByProperty(getAllActions(), 'status', status, true);
}

/**
 * Get actions by category
 * @param {string} category - Category to filter by (MO, SEP, DevSeed, Assessment, AdHoc)
 * @returns {Array} Filtered actions
 */
function getActionsByCategory(category) {
  return filterByProperty(getAllActions(), 'category', category, true);
}

/**
 * Get actions assigned to a specific person
 * @param {string} assignee - Person name
 * @returns {Array} Filtered actions
 */
function getActionsByAssignee(assignee) {
  // Use contains match (exactMatch=false) since assigned_to may have multiple names
  return filterByProperty(getAllActions(), 'assigned_to', assignee, false);
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
  return countByField(getAllActions(), 'category');
}

/**
 * Get counts by assignee
 * @returns {Object} Counts by assignee
 */
function getActionAssigneeCounts() {
  return countByField(getOpenActions(), 'assigned_to');
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
// INPUT VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail_(email) {
  if (!email) return true; // Empty is OK for optional fields
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid date format
 */
function isValidDateFormat_(dateStr) {
  if (!dateStr) return true; // Empty is OK for optional fields
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim());
}

/**
 * Sanitize text to prevent formula injection in Google Sheets
 * Cells starting with =, +, -, @, or tab can be interpreted as formulas
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text safe for sheet cells
 */
function sanitizeForSheet_(text) {
  if (!text) return '';
  var str = String(text).trim();
  // If starts with formula trigger character, prefix with single quote
  if (/^[=+\-@\t]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Validate and sanitize action data for create/update
 * @param {Object} data - Action data to validate
 * @param {boolean} isUpdate - Whether this is an update (less strict)
 * @returns {Object} {valid: boolean, errors: string[], sanitized: Object}
 */
function validateActionData_(data, isUpdate) {
  var errors = [];
  var sanitized = {};

  // Task is required for new actions
  if (!isUpdate) {
    if (!data.task || !String(data.task).trim()) {
      errors.push('Task description is required');
    }
  }

  // Validate and sanitize each field
  if (data.task !== undefined) {
    var task = String(data.task).trim();
    if (task.length > 2000) {
      errors.push('Task description must be under 2000 characters');
    }
    sanitized.task = sanitizeForSheet_(task);
  }

  if (data.assigned_to !== undefined) {
    var assignee = String(data.assigned_to).trim();
    if (assignee.length > 100) {
      errors.push('Assigned to must be under 100 characters');
    }
    sanitized.assigned_to = sanitizeForSheet_(assignee);
  }

  if (data.due_date !== undefined && data.due_date !== '') {
    if (!isValidDateFormat_(data.due_date)) {
      errors.push('Due date must be in YYYY-MM-DD format');
    } else {
      sanitized.due_date = data.due_date;
    }
  } else if (data.due_date === '') {
    sanitized.due_date = '';
  }

  if (data.source_date !== undefined && data.source_date !== '') {
    if (!isValidDateFormat_(data.source_date)) {
      errors.push('Source date must be in YYYY-MM-DD format');
    } else {
      sanitized.source_date = data.source_date;
    }
  } else if (data.source_date === '') {
    sanitized.source_date = '';
  }

  if (data.notes !== undefined) {
    var notes = String(data.notes);
    if (notes.length > 5000) {
      errors.push('Notes must be under 5000 characters');
    }
    sanitized.notes = sanitizeForSheet_(notes);
  }

  // Validate enum fields
  var validStatuses = ['not_started', 'in_progress', 'done', 'blocked', 'pending'];
  if (data.status !== undefined) {
    var status = String(data.status).toLowerCase().trim();
    if (status && !validStatuses.includes(status)) {
      errors.push('Invalid status value');
    } else {
      sanitized.status = status || 'not_started';
    }
  }

  var validPriorities = ['low', 'medium', 'high', 'critical'];
  if (data.priority !== undefined) {
    var priority = String(data.priority).toLowerCase().trim();
    if (priority && !validPriorities.includes(priority)) {
      errors.push('Invalid priority value');
    } else {
      sanitized.priority = priority || 'medium';
    }
  }

  // Pass through other safe fields with sanitization
  var safeFields = ['source_document', 'source_url', 'category', 'solution_id', 'created_by'];
  safeFields.forEach(function(field) {
    if (data[field] !== undefined) {
      var value = String(data[field]).trim();
      if (value.length > 500) {
        errors.push(field + ' must be under 500 characters');
      } else {
        sanitized[field] = sanitizeForSheet_(value);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors,
    sanitized: sanitized
  };
}

// ============================================================================
// CREATE/UPDATE OPERATIONS
// ============================================================================

/**
 * Create a new action
 * @param {Object} actionData - Action data
 * @returns {Object} Result with success status and data (action ID) or error
 */
function createAction(actionData) {
  try {
    // Security: Validate and sanitize all input
    var validation = validateActionData_(actionData, false);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    var sanitized = validation.sanitized;
    var sheet = getDatabaseSheet('Actions');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    var timestamp = new Date().toISOString();
    var actionId = generateActionId_();

    var newRow = headers.map(function(header) {
      switch (header) {
        case 'action_id':
          return actionId;
        case 'source_document':
          return sanitized.source_document || '';
        case 'source_date':
          return sanitized.source_date || '';
        case 'source_url':
          return sanitized.source_url || '';
        case 'category':
          return sanitized.category || 'MO';
        case 'solution_id':
          return sanitized.solution_id || sanitized.category || 'MO';
        case 'status':
          return sanitized.status || 'not_started';
        case 'assigned_to':
          return sanitized.assigned_to || '';
        case 'task':
          return sanitized.task || '';
        case 'due_date':
          return sanitized.due_date || '';
        case 'priority':
          return sanitized.priority || 'medium';
        case 'notes':
          return sanitized.notes || '';
        case 'created_at':
          return timestamp;
        case 'updated_at':
          return timestamp;
        case 'created_by':
          return sanitized.created_by || 'manual';
        default:
          return '';
      }
    });

    sheet.appendRow(newRow);
    clearActionsCache_();

    // Send Slack notification if assigned to someone
    var assignee = actionData.assigned_to || '';
    if (assignee) {
      try {
        var slackUserId = getSlackUserIdForMember_(assignee);
        if (slackUserId) {
          var action = {
            action_id: actionId,
            task: actionData.task || '',
            solution_id: actionData.solution_id || actionData.category || '',
            due_date: actionData.due_date || ''
          };
          sendSlackAssignmentNotification_(action, assignee, slackUserId, null);
        }
      } catch (notifyError) {
        Logger.log('Error sending Slack notification for new action: ' + notifyError);
        // Don't fail action creation if notification fails
      }
    }

    return { success: true, data: actionId };
  } catch (error) {
    Logger.log('Error in createAction: ' + error);
    return { success: false, error: 'Failed to create action: ' + error.message };
  }
}

/**
 * Update an existing action
 * @param {string} actionId - Action ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object} Result with success status and error if failed
 */
function updateAction(actionId, updates) {
  try {
    // Security: Validate actionId format
    if (!actionId || typeof actionId !== 'string' || !/^ACT_\d{8}_\d{4}$/.test(actionId)) {
      return { success: false, error: 'Invalid action ID format' };
    }

    // Security: Validate and sanitize update data
    var validation = validateActionData_(updates, true);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    var sanitized = validation.sanitized;
    var sheet = getDatabaseSheet('Actions');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idCol = headers.indexOf('action_id');
    if (idCol === -1) {
      return { success: false, error: 'action_id column not found' };
    }

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === actionId) {
        rowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Action not found' };
    }

    // Update fields with sanitized values
    for (var field in sanitized) {
      var colIndex = headers.indexOf(field);
      if (colIndex !== -1 && field !== 'action_id') {
        sheet.getRange(rowIndex, colIndex + 1).setValue(sanitized[field]);
      }
    }

    // Update timestamp
    var updatedAtCol = headers.indexOf('updated_at');
    if (updatedAtCol !== -1) {
      sheet.getRange(rowIndex, updatedAtCol + 1).setValue(new Date().toISOString());
    }

    clearActionsCache_();
    return { success: true };
  } catch (error) {
    Logger.log('Error in updateAction: ' + error);
    return { success: false, error: 'Failed to update action: ' + error.message };
  }
}

/**
 * Delete an action by ID
 * @param {string} actionId - Action ID to delete
 * @returns {Object} Result with success status
 */
function deleteAction(actionId) {
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
      return { success: false, error: 'Action not found: ' + actionId };
    }

    // Delete the row
    sheet.deleteRow(rowIndex);
    clearActionsCache_();

    return { success: true };
  } catch (error) {
    Logger.log('Error in deleteAction: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * Fast append to action notes - reads only the specific row
 * @param {string} actionId - Action ID
 * @param {string} noteText - Text to append
 * @returns {Object} Result with success status and error if failed
 */
function appendToActionNotes(actionId, noteText) {
  try {
    var sheet = getDatabaseSheet('Actions');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idCol = headers.indexOf('action_id');
    var notesCol = headers.indexOf('notes');
    var updatedAtCol = headers.indexOf('updated_at');

    if (idCol === -1 || notesCol === -1) {
      return { success: false, error: 'Required columns not found' };
    }

    // Find the row
    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === actionId) {
        var rowIndex = i + 1;
        var currentNotes = data[i][notesCol] || '';
        var updatedNotes = currentNotes ? currentNotes + '\n\n' + noteText : noteText;

        // Update notes
        sheet.getRange(rowIndex, notesCol + 1).setValue(updatedNotes);

        // Update timestamp
        if (updatedAtCol !== -1) {
          sheet.getRange(rowIndex, updatedAtCol + 1).setValue(new Date().toISOString());
        }

        clearActionsCache_();
        return { success: true };
      }
    }

    return { success: false, error: 'Action not found: ' + actionId };
  } catch (error) {
    Logger.log('Error in appendToActionNotes: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick status update for an action
 * Also pushes the status change back to the source agenda document
 * @param {string} actionId - Action ID
 * @param {string} newStatus - New status value
 * @returns {Object} Result with success status and error if failed
 */
function updateActionStatus(actionId, newStatus) {
  // Update in database
  var result = updateAction(actionId, { status: newStatus });

  if (result.success) {
    // Get the full action data to push to agenda
    clearActionsCache_();
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

  return result;
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
        if (tabTitle && tabTitle.toLowerCase().includes('action')) {
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
      if (headerText.includes('status') &&
          headerText.includes('owner') &&
          headerText.includes('action')) {
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
    if (header.includes('status')) colMap.status = c;
    if (header.includes('owner')) colMap.owner = c;
    if (header.includes('action') && !header.includes('source')) colMap.action = c;
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
 * Format: ACT_YYYYMMDD_RRRR (e.g., ACT_20260130_5432)
 * @returns {string} Action ID
 */
function generateActionId_() {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  // Generate 4-digit random number (1000-9999) for uniqueness within a day
  // Math: random() * 9000 gives 0-8999, + 1000 shifts to 1000-9999
  var random = Math.floor(Math.random() * 9000) + 1000;
  return 'ACT_' + dateStr + '_' + random;
}

/**
 * Get unique assignees for filters
 * @returns {Array} List of unique assignees
 */
function getUniqueAssignees() {
  return getUniqueValues(getAllActions(), 'assigned_to');
}

/**
 * Get unique categories for filters
 * @returns {Array} List of unique categories
 */
function getUniqueCategories() {
  return getUniqueValues(getAllActions(), 'category');
}

/**
 * Get unique solution IDs for filters
 * @returns {Array} List of unique solution IDs
 */
function getUniqueSolutions() {
  return getUniqueValues(getAllActions(), 'solution_id');
}

// ============================================================================
// TEAM MEMBER FUNCTIONS (for assignment dropdown)
// ============================================================================

/**
 * Get internal team members for assignment dropdown
 * @returns {Array} Array of {name, email} objects
 */
function getTeamMembersForAssignment() {
  try {
    var contacts = getAllContacts();
    var teamMembers = contacts.filter(function(c) {
      // Check for various is_internal formats: 'Y', 'true', '1', true
      var isInternal = c.is_internal === 'Y' || c.is_internal === 'true' ||
                       c.is_internal === '1' || c.is_internal === true;
      return isInternal && c.active !== 'N';
    });

    // Deduplicate by email and build name/email pairs
    var seen = {};
    var result = [];

    teamMembers.forEach(function(c) {
      var firstName = (c.first_name || '').trim();
      var email = (c.email || '').toLowerCase().trim();
      // Deduplicate by first name (since actions use first names only)
      if (firstName && !seen[firstName.toLowerCase()]) {
        seen[firstName.toLowerCase()] = true;
        result.push({
          name: firstName,
          email: email
        });
      }
    });

    // Sort by name
    result.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    return result;
  } catch (e) {
    Logger.log('Error getting team members: ' + e);
    return [];
  }
}

/**
 * Assign an action to a team member and optionally notify them
 * @param {string} actionId - Action ID
 * @param {string} assigneeName - Name of person to assign to
 * @param {string} assigneeEmail - Email of person (optional, for email fallback)
 * @param {boolean} sendNotification - Whether to send notification
 * @returns {Object} {success: boolean, message: string, notificationSent: boolean, notificationType: string}
 */
function assignAction(actionId, assigneeName, assigneeEmail, sendNotification) {
  try {
    // Get the action first
    var action = getActionById(actionId);
    if (!action) {
      return { success: false, message: 'Action not found' };
    }

    var previousAssignee = action.assigned_to || 'Unassigned';

    // Update the action
    var updated = updateAction(actionId, { assigned_to: assigneeName });
    if (!updated) {
      return { success: false, message: 'Failed to update action' };
    }

    var notificationSent = false;
    var notificationType = 'none';

    // Send notification if requested
    if (sendNotification) {
      // Try Slack first
      var slackUserId = getSlackUserIdForMember_(assigneeName);
      if (slackUserId) {
        try {
          var slackSent = sendSlackAssignmentNotification_(action, assigneeName, slackUserId, previousAssignee);
          if (slackSent) {
            notificationSent = true;
            notificationType = 'slack';
          }
        } catch (slackErr) {
          Logger.log('Slack notification failed: ' + slackErr);
        }
      }

      // Fall back to email if Slack didn't work and email is provided
      if (!notificationSent && assigneeEmail) {
        try {
          sendAssignmentNotification_(action, assigneeName, assigneeEmail, previousAssignee);
          notificationSent = true;
          notificationType = 'email';
        } catch (emailErr) {
          Logger.log('Email notification failed: ' + emailErr);
        }
      }
    }

    var message = 'Action assigned to ' + assigneeName;
    if (sendNotification) {
      if (notificationSent) {
        message += ' (notified via ' + notificationType + ')';
      } else {
        message += ' (notification could not be sent)';
      }
    }

    return {
      success: true,
      message: message,
      notificationSent: notificationSent,
      notificationType: notificationType
    };
  } catch (e) {
    Logger.log('Error in assignAction: ' + e);
    return { success: false, message: 'Error: ' + e.message };
  }
}

/**
 * Send Slack DM notification for action assignment
 * @param {Object} action - The action object
 * @param {string} assigneeName - Name of new assignee
 * @param {string} slackUserId - Slack user ID of assignee
 * @param {string} previousAssignee - Previous assignee name
 * @returns {boolean} Success status
 */
function sendSlackAssignmentNotification_(action, assigneeName, slackUserId, previousAssignee) {
  var token = getConfigValue('SLACK_BOT_TOKEN');
  if (!token) {
    Logger.log('SLACK_BOT_TOKEN not configured');
    return false;
  }

  // Security: Validate Slack user ID format (starts with U or W)
  if (!slackUserId || !/^[UW][A-Z0-9]{8,}$/.test(slackUserId)) {
    Logger.log('Invalid Slack user ID: ' + slackUserId);
    return false;
  }

  // Security: Sanitize all user-provided content for Slack
  // Escape Slack's markdown-like formatting characters
  function sanitizeForSlack(text, maxLength) {
    if (!text) return '';
    maxLength = maxLength || 200;
    return String(text)
      .replace(/[\r\n]/g, ' ')           // Remove newlines
      .replace(/[<>&]/g, '')             // Remove Slack special chars
      .replace(/[^\x20-\x7E]/g, '')      // Remove non-printable
      .trim()
      .substring(0, maxLength);
  }

  var safeTask = sanitizeForSlack(action.task, 150);
  if (safeTask.length < (action.task || '').length) safeTask += '...';
  var safeSolution = sanitizeForSlack(action.solution_id, 50);
  var safeDueDate = sanitizeForSlack(action.due_date, 20);
  var safePreviousAssignee = sanitizeForSlack(previousAssignee, 50);

  // Build Slack message with blocks for rich formatting
  var blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*An action item has been assigned to you:*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '> ' + safeTask
      }
    },
    {
      type: 'context',
      elements: []
    }
  ];

  // Add context elements with sanitized content
  var contextElements = blocks[2].elements;
  if (safeSolution) {
    contextElements.push({ type: 'mrkdwn', text: '*Solution:* ' + safeSolution });
  }
  if (safeDueDate) {
    contextElements.push({ type: 'mrkdwn', text: '*Due:* ' + safeDueDate });
  }
  if (safePreviousAssignee && safePreviousAssignee !== 'Unassigned') {
    contextElements.push({ type: 'mrkdwn', text: '_Previously:_ ' + safePreviousAssignee });
  }

  // Add action buttons
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Mark Done', emoji: true },
        style: 'primary',
        action_id: 'action_done',
        value: action.action_id
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Add Update', emoji: true },
        action_id: 'add_update',
        value: action.action_id
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'View in MO-Viewer', emoji: true },
        url: getConfigValue('APP_URL') || 'https://script.google.com/macros/s/...',
        action_id: 'view_action'
      }
    ]
  });

  var payload = {
    channel: slackUserId,
    text: 'Action assigned: ' + taskPreview,  // Fallback text
    blocks: blocks,
    unfurl_links: false
  };

  try {
    var response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());
    if (result.ok) {
      Logger.log('Slack notification sent to ' + slackUserId);
      return true;
    } else {
      Logger.log('Slack API error: ' + result.error);
      return false;
    }
  } catch (e) {
    Logger.log('Failed to send Slack notification: ' + e);
    return false;
  }
}

/**
 * Get Slack user ID for a team member by name or email
 * @param {string} nameOrEmail - Name or email to look up
 * @returns {string|null} Slack user ID or null
 */
function getSlackUserIdForMember_(nameOrEmail) {
  try {
    var contacts = getAllContacts();
    var searchTerm = (nameOrEmail || '').toLowerCase().trim();

    var contact = contacts.find(function(c) {
      // Check for various is_internal formats: 'Y', 'true', '1', true
      var isInternal = c.is_internal === 'Y' || c.is_internal === 'true' ||
                       c.is_internal === '1' || c.is_internal === true;
      if (!isInternal) return false;

      var firstName = (c.first_name || '').toLowerCase().trim();
      var lastName = (c.last_name || '').toLowerCase().trim();
      var fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase().trim();
      var email = (c.email || '').toLowerCase().trim();

      // Match by first name, full name, or email
      return firstName === searchTerm ||
             fullName === searchTerm ||
             email === searchTerm;
    });

    return contact ? (contact.slack_user_id || null) : null;
  } catch (e) {
    Logger.log('Error looking up Slack user ID: ' + e);
    return null;
  }
}

/**
 * Sanitize text for safe use in email body
 * Removes newlines and control characters to prevent header injection
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length (default 200)
 * @returns {string} Sanitized text
 */
function sanitizeEmailText_(text, maxLength) {
  if (!text) return '';
  maxLength = maxLength || 200;
  return String(text)
    .replace(/[\r\n\t]/g, ' ')           // Replace newlines/tabs with spaces
    .replace(/[^\x20-\x7E]/g, '')        // Remove non-printable ASCII
    .replace(/\s+/g, ' ')                // Collapse multiple spaces
    .trim()
    .substring(0, maxLength);
}

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmailAddress_(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/**
 * Send email notification for action assignment
 * @private
 */
function sendAssignmentNotification_(action, assigneeName, assigneeEmail, previousAssignee) {
  // Security: Validate email before sending
  if (!isValidEmailAddress_(assigneeEmail)) {
    Logger.log('Invalid email address for notification: ' + assigneeEmail);
    return;
  }

  var subject = '[MO-Viewer] Action Item Assigned to You';

  // Security: Sanitize all user-provided content
  var safeName = sanitizeEmailText_(assigneeName, 50);
  var safeFirstName = safeName.split(' ')[0] || 'Team Member';
  var safeTask = sanitizeEmailText_(action.task, 100);
  var safeSolution = sanitizeEmailText_(action.solution_id, 50);
  var safeDueDate = sanitizeEmailText_(action.due_date, 20);
  var safePreviousAssignee = sanitizeEmailText_(previousAssignee, 50);

  if (safeTask.length < (action.task || '').length) safeTask += '...';

  var body = 'Hi ' + safeFirstName + ',\n\n';
  body += 'An action item has been assigned to you in MO-Viewer:\n\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  body += 'TASK: ' + safeTask + '\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (safeSolution) {
    body += 'Solution: ' + safeSolution + '\n';
  }
  if (safeDueDate) {
    body += 'Due Date: ' + safeDueDate + '\n';
  }
  if (safePreviousAssignee && safePreviousAssignee !== 'Unassigned') {
    body += 'Previously assigned to: ' + safePreviousAssignee + '\n';
  }

  body += '\nView in MO-Viewer Actions page to update status.\n\n';
  body += '---\n';
  body += 'This is an automated notification from MO-Viewer.';

  MailApp.sendEmail({
    to: assigneeEmail,
    subject: subject,
    body: body
  });

  Logger.log('Assignment notification sent to: ' + assigneeEmail);
}
