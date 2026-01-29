/**
 * MO-APIs Library - Parking Lot API
 * ==================================
 * Capture ideas, discussion topics, stakeholder connections, and other items
 * that don't have a clear home yet.
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Parking Lot database sheet
 * Reads PARKING_LOT_SHEET_ID from MO-DB_Config
 */
function getParkingLotSheet_() {
  var sheetId = getConfigValue('PARKING_LOT_SHEET_ID');
  if (!sheetId) {
    throw new Error('PARKING_LOT_SHEET_ID not configured in MO-DB_Config');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for parking lot items (refreshed per execution)
 */
var _parkingLotCache = null;

/**
 * Load all parking lot items into memory
 */
function loadAllParkingLotItems_() {
  if (_parkingLotCache !== null) {
    return _parkingLotCache;
  }

  var sheet = getParkingLotSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _parkingLotCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var item = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      if (value instanceof Date) {
        item[header] = value.toISOString();
      } else {
        item[header] = value;
      }
    });
    // Only include records with item_id
    if (item.item_id) {
      _parkingLotCache.push(item);
    }
  }

  // Sort by created_at descending (most recent first)
  _parkingLotCache.sort(function(a, b) {
    var dateA = a.created_at ? new Date(a.created_at) : new Date(0);
    var dateB = b.created_at ? new Date(b.created_at) : new Date(0);
    return dateB - dateA;
  });

  return _parkingLotCache;
}

/**
 * Clear parking lot cache (call after mutations)
 */
function clearParkingLotCache() {
  _parkingLotCache = null;
}

// ============================================================================
// ITEM TYPE & STATUS CONSTANTS
// ============================================================================

/**
 * Valid item types
 */
var PARKING_LOT_TYPES = [
  'idea',
  'discussion_topic',
  'stakeholder_connection',
  'process_suggestion',
  'follow_up',
  'random_info'
];

/**
 * Item type display names and icons
 */
var PARKING_LOT_TYPE_INFO = {
  'idea': { name: 'Idea', icon: 'lightbulb', color: '#FFC107' },
  'discussion_topic': { name: 'Discussion Topic', icon: 'forum', color: '#2196F3' },
  'stakeholder_connection': { name: 'Stakeholder Connection', icon: 'people', color: '#4CAF50' },
  'process_suggestion': { name: 'Process Suggestion', icon: 'settings', color: '#9C27B0' },
  'follow_up': { name: 'Follow-up', icon: 'flag', color: '#FF5722' },
  'random_info': { name: 'Random Info', icon: 'info', color: '#607D8B' }
};

/**
 * Valid statuses
 */
var PARKING_LOT_STATUSES = [
  'new',
  'discussed',
  'assigned',
  'in_progress',
  'resolved',
  'archived'
];

/**
 * Status display names and colors
 */
var PARKING_LOT_STATUS_INFO = {
  'new': { name: 'New', color: '#2196F3', order: 1 },
  'discussed': { name: 'Discussed', color: '#FF9800', order: 2 },
  'assigned': { name: 'Assigned', color: '#9C27B0', order: 3 },
  'in_progress': { name: 'In Progress', color: '#00BCD4', order: 4 },
  'resolved': { name: 'Resolved', color: '#4CAF50', order: 5 },
  'archived': { name: 'Archived', color: '#9E9E9E', order: 6 }
};

/**
 * Priority levels
 */
var PARKING_LOT_PRIORITIES = ['low', 'medium', 'high'];

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Get all parking lot items
 * @param {boolean} includeArchived - Include archived items (default: false)
 * @returns {Array} All parking lot items
 */
function getAllParkingLotItems(includeArchived) {
  var items = loadAllParkingLotItems_();
  if (!includeArchived) {
    items = items.filter(function(item) {
      return item.status !== 'archived';
    });
  }
  return deepCopy(items);
}

/**
 * Get parking lot item by ID
 * @param {string} itemId - Item ID
 * @returns {Object|null} Item or null
 */
function getParkingLotItemById(itemId) {
  var items = loadAllParkingLotItems_();
  var item = items.find(function(i) {
    return i.item_id === itemId;
  });
  return item ? deepCopy(item) : null;
}

/**
 * Create a new parking lot item
 * @param {Object} itemData - Item data
 * @returns {Object} Created item with ID
 */
function createParkingLotItem(itemData) {
  var sheet = getParkingLotSheet_();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Generate item_id
  var timestamp = new Date().getTime();
  var typePrefix = {
    'idea': 'IDEA',
    'discussion_topic': 'DISC',
    'stakeholder_connection': 'CONN',
    'process_suggestion': 'PROC',
    'follow_up': 'FLUP',
    'random_info': 'INFO'
  }[itemData.item_type] || 'ITEM';
  itemData.item_id = typePrefix + '_' + timestamp;

  // Set defaults
  itemData.created_at = new Date().toISOString();
  itemData.updated_at = new Date().toISOString();
  itemData.status = itemData.status || 'new';
  itemData.priority = itemData.priority || 'medium';
  itemData.item_type = itemData.item_type || 'random_info';

  // Build row from headers
  var newRow = headers.map(function(header) {
    return itemData[header] !== undefined ? itemData[header] : '';
  });

  sheet.appendRow(newRow);
  clearParkingLotCache();

  return itemData;
}

/**
 * Update an existing parking lot item
 * @param {string} itemId - Item ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated item or null if not found
 */
function updateParkingLotItem(itemId, updates) {
  var sheet = getParkingLotSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('item_id');
  if (idColIndex === -1) {
    throw new Error('item_id column not found');
  }

  // Find row to update
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === itemId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return null;
  }

  // Update updated_at automatically
  updates.updated_at = new Date().toISOString();

  // Update cells
  headers.forEach(function(header, colIndex) {
    if (updates.hasOwnProperty(header) && header !== 'item_id' && header !== 'created_at') {
      sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[header]);
    }
  });

  clearParkingLotCache();

  return getParkingLotItemById(itemId);
}

/**
 * Delete a parking lot item
 * @param {string} itemId - Item ID to delete
 * @returns {boolean} Success status
 */
function deleteParkingLotItem(itemId) {
  var sheet = getParkingLotSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('item_id');
  if (idColIndex === -1) {
    return false;
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === itemId) {
      sheet.deleteRow(i + 1);
      clearParkingLotCache();
      return true;
    }
  }

  return false;
}

/**
 * Archive a parking lot item (soft delete)
 * @param {string} itemId - Item ID to archive
 * @returns {Object|null} Updated item or null
 */
function archiveParkingLotItem(itemId) {
  return updateParkingLotItem(itemId, { status: 'archived' });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get items by type
 * @param {string} itemType - Item type
 * @returns {Array} Items of this type
 */
function getParkingLotItemsByType(itemType) {
  var items = loadAllParkingLotItems_();
  var results = items.filter(function(item) {
    return item.status !== 'archived' &&
           item.item_type === itemType;
  });
  return deepCopy(results);
}

/**
 * Get items by status
 * @param {string} status - Status
 * @returns {Array} Items with this status
 */
function getParkingLotItemsByStatus(status) {
  var items = loadAllParkingLotItems_();
  var results = items.filter(function(item) {
    return item.status === status;
  });
  return deepCopy(results);
}

/**
 * Get items assigned to a team member
 * @param {string} assignee - Assignee email or name
 * @returns {Array} Items assigned to this person
 */
function getParkingLotItemsByAssignee(assignee) {
  var items = loadAllParkingLotItems_();
  var assigneeLower = (assignee || '').toLowerCase();
  var results = items.filter(function(item) {
    return item.status !== 'archived' &&
           item.assigned_to &&
           item.assigned_to.toLowerCase().includes(assigneeLower);
  });
  return deepCopy(results);
}

/**
 * Get items related to a solution
 * @param {string} solutionId - Solution ID
 * @returns {Array} Items related to this solution
 */
function getParkingLotItemsBySolution(solutionId) {
  var items = loadAllParkingLotItems_();
  var results = items.filter(function(item) {
    return item.status !== 'archived' &&
           item.solution_id === solutionId;
  });
  return deepCopy(results);
}

/**
 * Get items submitted by a team member
 * @param {string} submitter - Submitter email or name
 * @returns {Array} Items submitted by this person
 */
function getParkingLotItemsBySubmitter(submitter) {
  var items = loadAllParkingLotItems_();
  var submitterLower = (submitter || '').toLowerCase();
  var results = items.filter(function(item) {
    return item.submitted_by &&
           item.submitted_by.toLowerCase().includes(submitterLower);
  });
  return deepCopy(results);
}

/**
 * Get new/unassigned items (for review)
 * @returns {Array} Items needing attention
 */
function getParkingLotItemsNeedingAttention() {
  var items = loadAllParkingLotItems_();
  var results = items.filter(function(item) {
    return item.status === 'new' || item.status === 'discussed';
  });
  return deepCopy(results);
}

/**
 * Get items by priority
 * @param {string} priority - Priority level (low, medium, high)
 * @returns {Array} Items with this priority
 */
function getParkingLotItemsByPriority(priority) {
  var items = loadAllParkingLotItems_();
  var results = items.filter(function(item) {
    return item.status !== 'archived' &&
           item.priority === priority;
  });
  return deepCopy(results);
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search parking lot items
 * @param {string} query - Search query
 * @returns {Array} Matching items
 */
function searchParkingLotItems(query) {
  var items = loadAllParkingLotItems_();
  var queryLower = (query || '').toLowerCase();

  var results = items.filter(function(item) {
    if (item.status === 'archived') return false;
    return (item.title && item.title.toLowerCase().includes(queryLower)) ||
           (item.description && item.description.toLowerCase().includes(queryLower)) ||
           (item.tags && item.tags.toLowerCase().includes(queryLower)) ||
           (item.notes && item.notes.toLowerCase().includes(queryLower));
  });

  return deepCopy(results);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get parking lot statistics
 * @returns {Object} Summary statistics
 */
function getParkingLotStats() {
  var items = loadAllParkingLotItems_();

  var byType = {};
  var byStatus = {};
  var byPriority = {};
  var byAssignee = {};

  items.forEach(function(item) {
    if (item.status === 'archived') return;

    // By type
    if (item.item_type) {
      byType[item.item_type] = (byType[item.item_type] || 0) + 1;
    }

    // By status
    if (item.status) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    // By priority
    if (item.priority) {
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
    }

    // By assignee
    if (item.assigned_to) {
      byAssignee[item.assigned_to] = (byAssignee[item.assigned_to] || 0) + 1;
    }
  });

  var activeItems = items.filter(function(i) { return i.status !== 'archived'; });
  var newItems = items.filter(function(i) { return i.status === 'new'; });
  var highPriority = items.filter(function(i) { return i.priority === 'high' && i.status !== 'archived' && i.status !== 'resolved'; });

  return {
    total: activeItems.length,
    new_items: newItems.length,
    high_priority: highPriority.length,
    by_type: byType,
    by_status: byStatus,
    by_priority: byPriority,
    by_assignee: byAssignee
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get item type options for UI
 * @returns {Array} Type options with metadata
 */
function getParkingLotTypeOptions() {
  return PARKING_LOT_TYPES.map(function(type) {
    var info = PARKING_LOT_TYPE_INFO[type] || {};
    return {
      value: type,
      name: info.name || type,
      icon: info.icon || 'help',
      color: info.color || '#9E9E9E'
    };
  });
}

/**
 * Get status options for UI
 * @returns {Array} Status options with metadata
 */
function getParkingLotStatusOptions() {
  return PARKING_LOT_STATUSES.map(function(status) {
    var info = PARKING_LOT_STATUS_INFO[status] || {};
    return {
      value: status,
      name: info.name || status,
      color: info.color || '#9E9E9E',
      order: info.order || 99
    };
  });
}

/**
 * Get priority options for UI
 * @returns {Array} Priority options
 */
function getParkingLotPriorityOptions() {
  return [
    { value: 'low', name: 'Low', color: '#4CAF50' },
    { value: 'medium', name: 'Medium', color: '#FF9800' },
    { value: 'high', name: 'High', color: '#F44336' }
  ];
}

/**
 * Assign item to team member
 * @param {string} itemId - Item ID
 * @param {string} assignee - Assignee email
 * @returns {Object|null} Updated item
 */
function assignParkingLotItem(itemId, assignee) {
  return updateParkingLotItem(itemId, {
    assigned_to: assignee,
    status: 'assigned'
  });
}

/**
 * Update item status
 * @param {string} itemId - Item ID
 * @param {string} newStatus - New status
 * @returns {Object|null} Updated item
 */
function updateParkingLotItemStatus(itemId, newStatus) {
  return updateParkingLotItem(itemId, { status: newStatus });
}

/**
 * Add a note to an item
 * @param {string} itemId - Item ID
 * @param {string} note - Note to add
 * @returns {Object|null} Updated item
 */
function addNoteToParkingLotItem(itemId, note) {
  var item = getParkingLotItemById(itemId);
  if (!item) return null;

  var timestamp = new Date().toISOString().split('T')[0];
  var existingNotes = item.notes || '';
  var newNotes = existingNotes ?
    existingNotes + '\n\n[' + timestamp + '] ' + note :
    '[' + timestamp + '] ' + note;

  return updateParkingLotItem(itemId, { notes: newNotes });
}

// ============================================================================
// TEAM PAGE INTEGRATION
// ============================================================================

/**
 * Get parking lot overview for Team page
 * @returns {Object} Overview data for dashboard display
 */
function getParkingLotOverview() {
  var stats = getParkingLotStats();
  var newItems = getParkingLotItemsByStatus('new').slice(0, 5);
  var highPriority = getParkingLotItemsByPriority('high')
    .filter(function(i) { return i.status !== 'resolved'; })
    .slice(0, 5);

  return {
    stats: stats,
    recent_new: newItems,
    high_priority: highPriority
  };
}
