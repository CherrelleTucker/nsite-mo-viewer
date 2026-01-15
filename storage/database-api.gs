/**
 * MO-Viewer Database API
 * ======================
 * CRUD operations for the MO-Viewer database cache layer.
 * All operations read from/write to Google Sheets.
 *
 * Reference: docs/DATA_SCHEMA.md, storage/database-setup.gs
 *
 * @fileoverview Database read/write operations
 */

// ============================================================================
// GENERIC CRUD OPERATIONS
// ============================================================================

/**
 * Read all rows from a table
 *
 * @param {string} tableName - Table name (e.g., 'Solutions')
 * @returns {Object[]} Array of row objects
 */
function readAll(tableName) {
  var sheet = getTable(tableName);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];  // Only header or empty

  var headers = data[0];
  var rows = data.slice(1);

  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

/**
 * Read a single row by key
 *
 * @param {string} tableName - Table name
 * @param {string} keyColumn - Key column name
 * @param {string} keyValue - Key value to find
 * @returns {Object|null} Row object or null if not found
 */
function readOne(tableName, keyColumn, keyValue) {
  var all = readAll(tableName);
  for (var i = 0; i < all.length; i++) {
    if (String(all[i][keyColumn]) === String(keyValue)) {
      return all[i];
    }
  }
  return null;
}

/**
 * Read rows matching a filter
 *
 * @param {string} tableName - Table name
 * @param {Object} filters - Object of column:value pairs to match
 * @returns {Object[]} Matching rows
 */
function readFiltered(tableName, filters) {
  var all = readAll(tableName);

  return all.filter(function(row) {
    for (var key in filters) {
      if (String(row[key]) !== String(filters[key])) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Insert a new row
 *
 * @param {string} tableName - Table name
 * @param {Object} data - Row data object
 * @returns {Object} Inserted row with any auto-generated fields
 */
function insertOne(tableName, data) {
  var sheet = getTable(tableName);
  var schema = getSchemaForTable(tableName);

  if (!schema) {
    throw new Error('Unknown table: ' + tableName);
  }

  // Build row array from schema order
  var row = schema.headers.map(function(header) {
    if (header === 'created_at' && !data[header]) {
      return new Date();
    }
    if (header === 'last_updated' && !data[header]) {
      return new Date();
    }
    return data[header] || '';
  });

  // Append row
  sheet.appendRow(row);

  // Return the inserted data
  var result = {};
  schema.headers.forEach(function(header, i) {
    result[header] = row[i];
  });

  return result;
}

/**
 * Insert multiple rows
 *
 * @param {string} tableName - Table name
 * @param {Object[]} dataArray - Array of row data objects
 * @returns {number} Number of rows inserted
 */
function insertMany(tableName, dataArray) {
  var sheet = getTable(tableName);
  var schema = getSchemaForTable(tableName);

  if (!schema) {
    throw new Error('Unknown table: ' + tableName);
  }

  var rows = dataArray.map(function(data) {
    return schema.headers.map(function(header) {
      if (header === 'created_at' && !data[header]) {
        return new Date();
      }
      if (header === 'last_updated' && !data[header]) {
        return new Date();
      }
      return data[header] || '';
    });
  });

  if (rows.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, schema.headers.length).setValues(rows);
  }

  return rows.length;
}

/**
 * Update a row by key
 *
 * @param {string} tableName - Table name
 * @param {string} keyColumn - Key column name
 * @param {string} keyValue - Key value to find
 * @param {Object} updates - Object of column:value pairs to update
 * @returns {boolean} True if row was updated
 */
function updateOne(tableName, keyColumn, keyValue, updates) {
  var sheet = getTable(tableName);
  var schema = getSchemaForTable(tableName);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return false;

  var headers = data[0];
  var keyIndex = headers.indexOf(keyColumn);

  if (keyIndex === -1) {
    throw new Error('Key column not found: ' + keyColumn);
  }

  // Find the row
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyIndex]) === String(keyValue)) {
      // Update the row
      for (var col in updates) {
        var colIndex = headers.indexOf(col);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[col]);
        }
      }

      // Update last_updated
      var lastUpdatedIndex = headers.indexOf('last_updated');
      if (lastUpdatedIndex !== -1) {
        sheet.getRange(i + 1, lastUpdatedIndex + 1).setValue(new Date());
      }

      return true;
    }
  }

  return false;
}

/**
 * Upsert a row (insert or update)
 *
 * @param {string} tableName - Table name
 * @param {string} keyColumn - Key column name
 * @param {Object} data - Row data (must include key column)
 * @returns {Object} {action: 'inserted'|'updated', data: Object}
 */
function upsertOne(tableName, keyColumn, data) {
  var keyValue = data[keyColumn];
  var existing = readOne(tableName, keyColumn, keyValue);

  if (existing) {
    updateOne(tableName, keyColumn, keyValue, data);
    return { action: 'updated', data: data };
  } else {
    var inserted = insertOne(tableName, data);
    return { action: 'inserted', data: inserted };
  }
}

/**
 * Delete a row by key
 *
 * @param {string} tableName - Table name
 * @param {string} keyColumn - Key column name
 * @param {string} keyValue - Key value to find
 * @returns {boolean} True if row was deleted
 */
function deleteOne(tableName, keyColumn, keyValue) {
  var sheet = getTable(tableName);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return false;

  var headers = data[0];
  var keyIndex = headers.indexOf(keyColumn);

  if (keyIndex === -1) {
    throw new Error('Key column not found: ' + keyColumn);
  }

  // Find and delete the row
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyIndex]) === String(keyValue)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  return false;
}

// ============================================================================
// ENTITY-SPECIFIC OPERATIONS
// ============================================================================

/**
 * Get all solutions with optional filters
 *
 * @param {Object} filters - Optional filters {cycle, phase, provider}
 * @returns {Object[]} Array of solution objects
 */
function getSolutions(filters) {
  if (filters && Object.keys(filters).length > 0) {
    return readFiltered('Solutions', filters);
  }
  return readAll('Solutions');
}

/**
 * Get a solution by ID
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object|null} Solution object or null
 */
function getSolution(solutionId) {
  return readOne('Solutions', 'solution_id', solutionId);
}

/**
 * Save or update a solution
 *
 * @param {Object} solution - Solution data
 * @returns {Object} Result with action and data
 */
function saveSolution(solution) {
  return upsertOne('Solutions', 'solution_id', solution);
}

/**
 * Get all stakeholders with optional filters
 *
 * @param {Object} filters - Optional filters {type, organization, touchpoint_status}
 * @returns {Object[]} Array of stakeholder objects
 */
function getStakeholders(filters) {
  if (filters && Object.keys(filters).length > 0) {
    return readFiltered('Stakeholders', filters);
  }
  return readAll('Stakeholders');
}

/**
 * Get a stakeholder by ID
 *
 * @param {string} stakeholderId - Stakeholder ID
 * @returns {Object|null} Stakeholder object or null
 */
function getStakeholder(stakeholderId) {
  return readOne('Stakeholders', 'stakeholder_id', stakeholderId);
}

/**
 * Save or update a stakeholder
 *
 * @param {Object} stakeholder - Stakeholder data
 * @returns {Object} Result with action and data
 */
function saveStakeholder(stakeholder) {
  return upsertOne('Stakeholders', 'stakeholder_id', stakeholder);
}

/**
 * Get all stories with optional filters
 *
 * @param {Object} filters - Optional filters {status, channel, solution_id}
 * @returns {Object[]} Array of story objects
 */
function getStories(filters) {
  if (filters && Object.keys(filters).length > 0) {
    return readFiltered('Stories', filters);
  }
  return readAll('Stories');
}

/**
 * Get a story by ID
 *
 * @param {string} storyId - Story ID
 * @returns {Object|null} Story object or null
 */
function getStory(storyId) {
  return readOne('Stories', 'story_id', storyId);
}

/**
 * Save or update a story
 *
 * @param {Object} story - Story data
 * @returns {Object} Result with action and data
 */
function saveStory(story) {
  return upsertOne('Stories', 'story_id', story);
}

/**
 * Get actions with optional filters
 *
 * @param {Object} filters - Optional filters {status, solution_id, owner}
 * @returns {Object[]} Array of action objects
 */
function getActions(filters) {
  if (filters && Object.keys(filters).length > 0) {
    return readFiltered('Actions', filters);
  }
  return readAll('Actions');
}

/**
 * Get open actions only
 *
 * @returns {Object[]} Array of open action objects
 */
function getOpenActions() {
  return readFiltered('Actions', { status: 'open' });
}

/**
 * Save or update an action
 *
 * @param {Object} action - Action data
 * @returns {Object} Result with action and data
 */
function saveAction(action) {
  return upsertOne('Actions', 'action_id', action);
}

/**
 * Get milestones for a solution
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object[]} Array of milestone objects
 */
function getMilestones(solutionId) {
  return readFiltered('Milestones', { solution_id: solutionId });
}

/**
 * Save or update a milestone
 *
 * @param {Object} milestone - Milestone data
 * @returns {Object} Result with action and data
 */
function saveMilestone(milestone) {
  return upsertOne('Milestones', 'milestone_id', milestone);
}

// ============================================================================
// UPDATE HISTORY
// ============================================================================

/**
 * Record an update in the history log
 *
 * @param {string} entityType - Entity type (solution, stakeholder, story)
 * @param {string} entityId - Entity ID
 * @param {string} updateText - Update content
 * @param {string} updateType - Update type (milestone, action, general)
 * @param {string} submittedBy - User email
 * @param {string} sourceDoc - Target document
 * @param {string} sourceTab - Target tab
 * @returns {Object} Inserted history record
 */
function recordUpdate(entityType, entityId, updateText, updateType, submittedBy, sourceDoc, sourceTab) {
  var historyId = 'UPD_' + Date.now();

  return insertOne('UpdateHistory', {
    history_id: historyId,
    entity_type: entityType,
    entity_id: entityId,
    update_text: updateText,
    update_type: updateType,
    submitted_by: submittedBy,
    source_doc: sourceDoc,
    source_tab: sourceTab,
    timestamp: new Date()
  });
}

/**
 * Get update history for an entity
 *
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @returns {Object[]} Array of history records, newest first
 */
function getUpdateHistory(entityType, entityId) {
  var all = readFiltered('UpdateHistory', {
    entity_type: entityType,
    entity_id: entityId
  });

  // Sort by timestamp descending
  return all.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

/**
 * Get recent updates across all entities
 *
 * @param {number} limit - Maximum number of records to return
 * @returns {Object[]} Array of history records, newest first
 */
function getRecentUpdates(limit) {
  limit = limit || 50;
  var all = readAll('UpdateHistory');

  // Sort by timestamp descending
  all.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return all.slice(0, limit);
}

// ============================================================================
// SOLUTION-STAKEHOLDER RELATIONSHIPS
// ============================================================================

/**
 * Link a stakeholder to a solution
 *
 * @param {string} solutionId - Solution ID
 * @param {string} stakeholderId - Stakeholder ID
 * @param {string} role - Role in solution
 * @param {string} engagementLevel - Engagement level
 * @returns {Object} Inserted link record
 */
function linkStakeholderToSolution(solutionId, stakeholderId, role, engagementLevel) {
  // Check if link already exists
  var existing = readFiltered('SolutionStakeholders', {
    solution_id: solutionId,
    stakeholder_id: stakeholderId
  });

  if (existing.length > 0) {
    // Update existing
    return updateSolutionStakeholderLink(solutionId, stakeholderId, role, engagementLevel);
  }

  return insertOne('SolutionStakeholders', {
    solution_id: solutionId,
    stakeholder_id: stakeholderId,
    role: role || '',
    engagement_level: engagementLevel || ''
  });
}

/**
 * Update a solution-stakeholder link
 *
 * @param {string} solutionId - Solution ID
 * @param {string} stakeholderId - Stakeholder ID
 * @param {string} role - Role in solution
 * @param {string} engagementLevel - Engagement level
 * @returns {boolean} True if updated
 */
function updateSolutionStakeholderLink(solutionId, stakeholderId, role, engagementLevel) {
  var sheet = getTable('SolutionStakeholders');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var solIdIndex = headers.indexOf('solution_id');
  var stkIdIndex = headers.indexOf('stakeholder_id');
  var roleIndex = headers.indexOf('role');
  var engageIndex = headers.indexOf('engagement_level');

  for (var i = 1; i < data.length; i++) {
    if (data[i][solIdIndex] === solutionId && data[i][stkIdIndex] === stakeholderId) {
      if (role !== undefined) sheet.getRange(i + 1, roleIndex + 1).setValue(role);
      if (engagementLevel !== undefined) sheet.getRange(i + 1, engageIndex + 1).setValue(engagementLevel);
      return true;
    }
  }

  return false;
}

/**
 * Get stakeholders for a solution
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object[]} Array of stakeholder objects with role info
 */
function getStakeholdersForSolution(solutionId) {
  var links = readFiltered('SolutionStakeholders', { solution_id: solutionId });

  return links.map(function(link) {
    var stakeholder = getStakeholder(link.stakeholder_id);
    if (stakeholder) {
      stakeholder.role = link.role;
      stakeholder.engagement_level = link.engagement_level;
    }
    return stakeholder;
  }).filter(function(s) { return s !== null; });
}

/**
 * Get solutions for a stakeholder
 *
 * @param {string} stakeholderId - Stakeholder ID
 * @returns {Object[]} Array of solution objects with role info
 */
function getSolutionsForStakeholder(stakeholderId) {
  var links = readFiltered('SolutionStakeholders', { stakeholder_id: stakeholderId });

  return links.map(function(link) {
    var solution = getSolution(link.solution_id);
    if (solution) {
      solution.role = link.role;
      solution.engagement_level = link.engagement_level;
    }
    return solution;
  }).filter(function(s) { return s !== null; });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get schema definition for a table
 *
 * @param {string} tableName - Table name
 * @returns {Object|null} Schema object or null
 */
function getSchemaForTable(tableName) {
  for (var key in DB_SCHEMA) {
    if (DB_SCHEMA[key].name === tableName) {
      return DB_SCHEMA[key];
    }
  }
  return null;
}

/**
 * Generate a unique ID with prefix
 *
 * @param {string} prefix - ID prefix (e.g., 'SOL', 'STK', 'STORY')
 * @returns {string} Unique ID
 */
function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36).toUpperCase();
}

/**
 * Get database summary for dashboard
 *
 * @returns {Object} Summary statistics
 */
function getDatabaseSummary() {
  return {
    solutions: getTableRowCount('Solutions'),
    stakeholders: getTableRowCount('Stakeholders'),
    stories: getTableRowCount('Stories'),
    actions: getActions({ status: 'open' }).length,
    recentUpdates: getRecentUpdates(10).length,
    lastSync: getConfigValue('last_sync')
  };
}

/**
 * Get a config value
 *
 * @param {string} key - Config key
 * @returns {string} Config value
 */
function getConfigValue(key) {
  var config = readOne('_Config', 'key', key);
  return config ? config.value : null;
}

/**
 * Set a config value
 *
 * @param {string} key - Config key
 * @param {string} value - Config value
 */
function setConfigValue(key, value) {
  upsertOne('_Config', 'key', {
    key: key,
    value: value,
    last_updated: new Date()
  });
}

/**
 * Update last sync timestamp
 */
function updateLastSync() {
  setConfigValue('last_sync', new Date().toISOString());
}
