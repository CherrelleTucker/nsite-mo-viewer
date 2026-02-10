/**
 * MO-APIs Library - Goals API
 * ===========================
 * Track mission, vision, PI objectives with acceptance criteria.
 * Each Objectives row is one acceptance criterion.
 *
 * Database: MO-DB_Goals (4 tabs)
 *   - MissionVision: mission/vision statements
 *   - PIs: Program Increment definitions
 *   - Objectives: One row per acceptance criterion, grouped by category + solution
 *   - _Lookups: Cross-database FK references
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var GOALS_CONFIG_KEY_ = 'GOALS_SHEET_ID';

// Tab names
var GOALS_TAB_MISSION_VISION_ = 'MissionVision';
var GOALS_TAB_PIS_ = 'PIs';
var GOALS_TAB_OBJECTIVES_ = 'Objectives';

// Category display order
var GOALS_CATEGORY_ORDER_ = ['milestones', 'admin', 'assess', 'sep', 'c1', 'c2', 'c3', 'c4', 'c5'];

// ============================================================================
// ENUM CONSTANTS
// ============================================================================

var GOAL_PI_STATUSES = ['planning', 'active', 'completed'];

var GOAL_OBJECTIVE_STATUSES = ['not_started', 'in_progress', 'completed', 'deferred'];

var GOAL_OBJECTIVE_STATUS_INFO = {
  'not_started': { name: 'Not Started', color: '#9E9E9E', icon: 'hourglass_empty' },
  'in_progress': { name: 'In Progress', color: '#2196F3', icon: 'trending_up' },
  'completed':   { name: 'Completed',   color: '#4CAF50', icon: 'check_circle' },
  'deferred':    { name: 'Deferred',    color: '#FF9800', icon: 'pause_circle' }
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear all goals-related caches after mutations
 */
function clearGoalsCache_() {
  delete _sheetDataCache[GOALS_CONFIG_KEY_ + '_' + GOALS_TAB_MISSION_VISION_];
  delete _sheetDataCache[GOALS_CONFIG_KEY_ + '_' + GOALS_TAB_PIS_];
  delete _sheetDataCache[GOALS_CONFIG_KEY_ + '_' + GOALS_TAB_OBJECTIVES_];
}

// ============================================================================
// MISSION & VISION
// ============================================================================

/**
 * Get mission and vision statements
 * @returns {Object} { mission: string, vision: string, mission_updated_by: string, ... }
 */
function getMissionVision() {
  try {
    var rows = loadSheetTab_(GOALS_CONFIG_KEY_, GOALS_TAB_MISSION_VISION_);
    var result = {
      mission: '',
      vision: '',
      mission_updated_by: '',
      mission_updated_date: '',
      vision_updated_by: '',
      vision_updated_date: ''
    };

    rows.forEach(function(row) {
      var key = normalizeString(row.key);
      if (key === 'mission') {
        result.mission = row.content || '';
        result.mission_updated_by = row.updated_by || '';
        result.mission_updated_date = row.updated_date || '';
      } else if (key === 'vision') {
        result.vision = row.content || '';
        result.vision_updated_by = row.updated_by || '';
        result.vision_updated_date = row.updated_date || '';
      }
    });

    return result;
  } catch (e) {
    Logger.log('getMissionVision error: ' + e.message);
    return { mission: '', vision: '', mission_updated_by: '', mission_updated_date: '', vision_updated_by: '', vision_updated_date: '' };
  }
}

/**
 * Update mission or vision statement
 * @param {Object} data - { key: 'mission'|'vision', content: string, updated_by: string }
 * @returns {Object} { success: boolean, error?: string }
 */
function updateMissionVision(data) {
  try {
    if (!data || !data.key) {
      return { success: false, error: 'Key is required (mission or vision)' };
    }
    var key = normalizeString(data.key);
    if (key !== 'mission' && key !== 'vision') {
      return { success: false, error: 'Key must be "mission" or "vision"' };
    }
    if (data.content === undefined || data.content === null) {
      return { success: false, error: 'Content is required' };
    }

    var writeInfo = getSheetTabForWrite_(GOALS_CONFIG_KEY_, GOALS_TAB_MISSION_VISION_);
    var sheet = writeInfo.sheet;
    var headers = writeInfo.headers;

    var rowNum = findRowByField_(sheet, headers, 'key', key);

    var now = new Date().toISOString().split('T')[0];

    if (rowNum === -1) {
      // Row doesn't exist yet — append
      var newRow = headers.map(function(h) {
        if (h === 'key') return key;
        if (h === 'content') return data.content;
        if (h === 'updated_by') return data.updated_by || '';
        if (h === 'updated_date') return now;
        return '';
      });
      sheet.appendRow(newRow);
    } else {
      // Update existing row
      headers.forEach(function(h, colIndex) {
        if (h === 'content') {
          sheet.getRange(rowNum, colIndex + 1).setValue(data.content);
        } else if (h === 'updated_by') {
          sheet.getRange(rowNum, colIndex + 1).setValue(data.updated_by || '');
        } else if (h === 'updated_date') {
          sheet.getRange(rowNum, colIndex + 1).setValue(now);
        }
      });
    }

    clearGoalsCache_();
    return { success: true };
  } catch (e) {
    Logger.log('updateMissionVision error: ' + e.message);
    return { success: false, error: 'Failed to update: ' + e.message };
  }
}

// ============================================================================
// PROGRAM INCREMENTS (PIs)
// ============================================================================

/**
 * Get all PIs, sorted by fiscal_year desc then quarter desc
 * @returns {Array} PI objects
 */
function getAllPIs() {
  try {
    var rows = loadSheetTab_(GOALS_CONFIG_KEY_, GOALS_TAB_PIS_);
    var pis = deepCopy(rows).filter(function(pi) { return pi.pi_id; });

    // Normalize enum
    pis.forEach(function(pi) {
      if (pi.status) pi.status = normalizeString(pi.status);
    });

    // Sort: most recent first
    pis.sort(function(a, b) {
      var fyA = a.fiscal_year || '';
      var fyB = b.fiscal_year || '';
      if (fyA !== fyB) return fyB.localeCompare(fyA);
      return (b.quarter || 0) - (a.quarter || 0);
    });

    return pis;
  } catch (e) {
    Logger.log('getAllPIs error: ' + e.message);
    return [];
  }
}

/**
 * Get the currently active PI (or most recent)
 * @returns {Object|null} Active PI or null
 */
function getActivePI() {
  var pis = getAllPIs();
  var active = pis.find(function(pi) { return pi.status === 'active'; });
  return active || (pis.length > 0 ? pis[0] : null);
}

/**
 * Create a new PI
 * @param {Object} data - PI data
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
function createPI(data) {
  try {
    if (!data || !data.pi_id || !String(data.pi_id).trim()) {
      return { success: false, error: 'PI ID is required' };
    }
    if (!data.fiscal_year || !String(data.fiscal_year).trim()) {
      return { success: false, error: 'Fiscal year is required' };
    }

    var statusCheck = validateEnumField(data.status, GOAL_PI_STATUSES, 'status');
    if (!statusCheck.valid) return { success: false, error: statusCheck.error };

    var writeInfo = getSheetTabForWrite_(GOALS_CONFIG_KEY_, GOALS_TAB_PIS_);
    data.status = data.status || 'planning';

    var newRow = writeInfo.headers.map(function(h) {
      return data[h] !== undefined ? data[h] : '';
    });

    writeInfo.sheet.appendRow(newRow);
    clearGoalsCache_();

    return { success: true, data: data };
  } catch (e) {
    Logger.log('createPI error: ' + e.message);
    return { success: false, error: 'Failed to create PI: ' + e.message };
  }
}

/**
 * Update an existing PI
 * @param {string} piId - PI ID
 * @param {Object} updates - Fields to update
 * @returns {Object} { success: boolean, error?: string }
 */
function updatePI(piId, updates) {
  try {
    if (!piId) return { success: false, error: 'PI ID is required' };

    if (updates.status) {
      var statusCheck = validateEnumField(updates.status, GOAL_PI_STATUSES, 'status');
      if (!statusCheck.valid) return { success: false, error: statusCheck.error };
    }

    var writeInfo = getSheetTabForWrite_(GOALS_CONFIG_KEY_, GOALS_TAB_PIS_);
    var rowNum = findRowByField_(writeInfo.sheet, writeInfo.headers, 'pi_id', piId);
    if (rowNum === -1) return { success: false, error: 'PI not found' };

    writeInfo.headers.forEach(function(h, colIndex) {
      if (updates.hasOwnProperty(h) && h !== 'pi_id') {
        writeInfo.sheet.getRange(rowNum, colIndex + 1).setValue(updates[h]);
      }
    });

    clearGoalsCache_();
    return { success: true };
  } catch (e) {
    Logger.log('updatePI error: ' + e.message);
    return { success: false, error: 'Failed to update PI: ' + e.message };
  }
}

// ============================================================================
// OBJECTIVES (each row = one acceptance criterion)
// ============================================================================

/**
 * Load all objectives rows (internal, cached)
 * @returns {Array} Objective row objects
 */
function loadAllObjectives_() {
  var rows = loadSheetTab_(GOALS_CONFIG_KEY_, GOALS_TAB_OBJECTIVES_);
  var objs = rows.filter(function(o) { return o.objective_id; });
  objs.forEach(function(o) {
    if (o.status) o.status = normalizeString(o.status);
  });
  return objs;
}

/**
 * Build a "milestones" category group from milestones within PI date range.
 * Each milestone becomes a criterion in this auto-derived category.
 *
 * @param {Object} pi - PI object with start_date and end_date
 * @returns {Object|null} CategoryGroup for milestones, or null if no milestones
 */
function buildMilestoneCategoryGroup_(pi) {
  if (!pi || !pi.start_date || !pi.end_date) return null;

  var milestones = getMilestonesForPI(pi.start_date, pi.end_date);
  if (milestones.length === 0) return null;

  // Group by solution_id
  var solutionMap = {};
  milestones.forEach(function(m) {
    var sol = m.solution_id || 'unknown';
    if (!solutionMap[sol]) {
      solutionMap[sol] = [];
    }
    solutionMap[sol].push({
      objective_id: 'ms_' + m.milestone_id,
      acceptance_criteria: (m.milestone_name || m.milestone_type || 'Milestone') + ' \u2014 ' + (m.solution_id || 'Unknown'),
      status: (m.status === 'completed') ? 'completed' : 'not_started',
      is_milestone: true,
      milestone_id: m.milestone_id,
      target_date: m.target_date || '',
      actual_date: m.date || '',
      milestone_type: m.milestone_type || '',
      milestone_name: m.milestone_name || '',
      solution_id: m.solution_id || '',
      url: m.url || '',
      memo_date: m.memo_date || '',
      memo_url: m.memo_url || '',
      notes: m.notes || '',
      created_date: m.created_date || ''
    });
  });

  // Build solutions array with per-solution stats
  var solutions = [];
  var totalCriteria = 0;
  var completedCriteria = 0;

  Object.keys(solutionMap).sort().forEach(function(solId) {
    var criteria = solutionMap[solId];
    var solComplete = criteria.filter(function(c) { return c.status === 'completed'; }).length;

    solutions.push({
      solution_id: solId,
      criteria: criteria,
      criteria_total: criteria.length,
      criteria_complete: solComplete,
      progress_pct: criteria.length > 0 ? Math.round((solComplete / criteria.length) * 100) : 0
    });

    totalCriteria += criteria.length;
    completedCriteria += solComplete;
  });

  return {
    category_title: 'milestones',
    category_summary: 'Milestones with target dates in this PI',
    dependencies: '',
    risks: '',
    future_pi: '',
    criteria_owner_contact_id: '',
    created_date: '',
    updated_date: '',
    solutions: solutions,
    criteria_total: totalCriteria,
    criteria_complete: completedCriteria,
    progress_pct: totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0,
    is_milestone_category: true
  };
}

/**
 * Get objectives for a specific PI, grouped by category then solution.
 * Returns array of category groups, each with nested solution groups containing criteria.
 *
 * @param {string} piId - PI ID
 * @returns {Array} Category groups with solutions and criteria
 */
function getObjectivesByPI(piId) {
  try {
    if (!piId) return [];

    var allRows = loadAllObjectives_();

    // Filter rows for this PI
    var piRows = allRows.filter(function(o) { return o.pi_id === piId; });

    // Group by category_title
    var categoryMap = {};
    piRows.forEach(function(row) {
      var cat = row.category_title || 'uncategorized';
      if (!categoryMap[cat]) {
        categoryMap[cat] = [];
      }
      categoryMap[cat].push(deepCopy(row));
    });

    // Build category groups
    var categories = [];
    var categoryKeys = Object.keys(categoryMap);

    categoryKeys.forEach(function(cat) {
      var rows = categoryMap[cat];
      var firstRow = rows[0];

      // Sub-group by solution_id
      var solutionMap = {};
      rows.forEach(function(row) {
        var sol = row.solution_id || 'unknown';
        if (!solutionMap[sol]) {
          solutionMap[sol] = [];
        }
        solutionMap[sol].push({
          objective_id: row.objective_id,
          acceptance_criteria: row.acceptance_criteria || '',
          status: row.status || 'not_started'
        });
      });

      // Build solutions array with per-solution stats
      var solutions = [];
      var totalCriteria = 0;
      var completedCriteria = 0;

      Object.keys(solutionMap).sort().forEach(function(solId) {
        var criteria = solutionMap[solId];
        var solComplete = criteria.filter(function(c) { return c.status === 'completed'; }).length;

        solutions.push({
          solution_id: solId,
          criteria: criteria,
          criteria_total: criteria.length,
          criteria_complete: solComplete,
          progress_pct: criteria.length > 0 ? Math.round((solComplete / criteria.length) * 100) : 0
        });

        totalCriteria += criteria.length;
        completedCriteria += solComplete;
      });

      categories.push({
        category_title: cat,
        category_summary: firstRow.category_summary || '',
        dependencies: firstRow.dependencies || '',
        risks: firstRow.risks || '',
        future_pi: firstRow.future_pi || '',
        criteria_owner_contact_id: firstRow.criteria_owner_contact_id || '',
        created_date: firstRow.created_date || '',
        updated_date: firstRow.updated_date || '',
        solutions: solutions,
        criteria_total: totalCriteria,
        criteria_complete: completedCriteria,
        progress_pct: totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0
      });
    });

    // Inject milestones category (auto-derived from MO-DB_Milestones)
    // Wrapped in own try/catch so milestone errors don't kill all goals
    try {
      var pi = getAllPIs().find(function(p) { return p.pi_id === piId; });
      if (pi) {
        var msCategory = buildMilestoneCategoryGroup_(pi);
        if (msCategory) categories.push(msCategory);
      }
    } catch (msErr) {
      Logger.log('Milestone injection skipped: ' + msErr.message);
    }

    // Sort by defined category order (milestones first)
    categories.sort(function(a, b) {
      var idxA = GOALS_CATEGORY_ORDER_.indexOf(a.category_title);
      var idxB = GOALS_CATEGORY_ORDER_.indexOf(b.category_title);
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });

    return categories;
  } catch (e) {
    Logger.log('getObjectivesByPI error: ' + e.message);
    return [];
  }
}

/**
 * Toggle an objective row's status (for checkbox clicks)
 * @param {string} objectiveId - objective_id of the criterion row
 * @param {string} newStatus - New status value
 * @returns {Object} { success: boolean, error?: string }
 */
function toggleObjectiveStatus(objectiveId, newStatus) {
  try {
    if (!objectiveId) return { success: false, error: 'Objective ID is required' };

    var statusCheck = validateEnumField(newStatus, GOAL_OBJECTIVE_STATUSES, 'status');
    if (!statusCheck.valid) return { success: false, error: statusCheck.error };

    var writeInfo = getSheetTabForWrite_(GOALS_CONFIG_KEY_, GOALS_TAB_OBJECTIVES_);
    var rowNum = findRowByField_(writeInfo.sheet, writeInfo.headers, 'objective_id', objectiveId);
    if (rowNum === -1) return { success: false, error: 'Objective not found' };

    var now = new Date().toISOString().split('T')[0];

    writeInfo.headers.forEach(function(h, colIndex) {
      if (h === 'status') {
        writeInfo.sheet.getRange(rowNum, colIndex + 1).setValue(newStatus);
      } else if (h === 'updated_date') {
        writeInfo.sheet.getRange(rowNum, colIndex + 1).setValue(now);
      }
    });

    clearGoalsCache_();
    return { success: true };
  } catch (e) {
    Logger.log('toggleObjectiveStatus error: ' + e.message);
    return { success: false, error: 'Failed to toggle status: ' + e.message };
  }
}

/**
 * Create a new objective (criterion row)
 * Generates objective_id = obj_[pi_id]-[solution_id]-#
 * @param {Object} data - { pi_id, category_title, solution_id, category_summary, acceptance_criteria, status, ... }
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
function createObjective(data) {
  try {
    if (!data || !data.pi_id || !String(data.pi_id).trim()) {
      return { success: false, error: 'PI ID is required' };
    }
    if (!data.solution_id || !String(data.solution_id).trim()) {
      return { success: false, error: 'Solution ID is required' };
    }
    if (!data.category_title || !String(data.category_title).trim()) {
      return { success: false, error: 'Category is required' };
    }

    if (data.status) {
      var statusCheck = validateEnumField(data.status, GOAL_OBJECTIVE_STATUSES, 'status');
      if (!statusCheck.valid) return { success: false, error: statusCheck.error };
    }

    // Generate objective_id: find max sequence for this pi_id + solution_id
    var allRows = loadAllObjectives_();
    var prefix = 'obj_' + data.pi_id + '-' + data.solution_id + '-';
    var maxSeq = 0;
    allRows.forEach(function(row) {
      if (row.objective_id && row.objective_id.indexOf(prefix) === 0) {
        var seqStr = row.objective_id.substring(prefix.length);
        var seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });

    var writeInfo = getSheetTabForWrite_(GOALS_CONFIG_KEY_, GOALS_TAB_OBJECTIVES_);
    var now = new Date().toISOString().split('T')[0];

    data.objective_id = prefix + (maxSeq + 1);
    data.status = data.status || 'not_started';
    data.created_date = now;
    data.updated_date = now;

    var newRow = writeInfo.headers.map(function(h) {
      return data[h] !== undefined ? data[h] : '';
    });

    writeInfo.sheet.appendRow(newRow);
    clearGoalsCache_();

    return { success: true, data: data };
  } catch (e) {
    Logger.log('createObjective error: ' + e.message);
    return { success: false, error: 'Failed to create objective: ' + e.message };
  }
}

/**
 * Update an existing objective row.
 * If updating shared fields (category_summary, dependencies, risks, future_pi,
 * criteria_owner_contact_id), updates ALL rows with same pi_id + category_title.
 * @param {string} objectiveId - Objective ID
 * @param {Object} updates - Fields to update
 * @returns {Object} { success: boolean, error?: string }
 */
function updateObjective(objectiveId, updates) {
  try {
    if (!objectiveId) return { success: false, error: 'Objective ID is required' };

    if (updates.status) {
      var statusCheck = validateEnumField(updates.status, GOAL_OBJECTIVE_STATUSES, 'status');
      if (!statusCheck.valid) return { success: false, error: statusCheck.error };
    }

    var writeInfo = getSheetTabForWrite_(GOALS_CONFIG_KEY_, GOALS_TAB_OBJECTIVES_);
    var sheet = writeInfo.sheet;
    var headers = writeInfo.headers;
    var rowNum = findRowByField_(sheet, headers, 'objective_id', objectiveId);
    if (rowNum === -1) return { success: false, error: 'Objective not found' };

    var now = new Date().toISOString().split('T')[0];
    updates.updated_date = now;

    // Check if any shared fields are being updated
    var sharedFields = ['category_summary', 'dependencies', 'risks', 'future_pi', 'criteria_owner_contact_id'];
    var hasSharedUpdate = sharedFields.some(function(f) { return updates.hasOwnProperty(f); });

    if (hasSharedUpdate) {
      // Get the pi_id and category_title of this row to find siblings
      var allData = sheet.getDataRange().getValues();
      var piIdCol = headers.indexOf('pi_id');
      var catCol = headers.indexOf('category_title');
      var targetPiId = allData[rowNum - 1][piIdCol];
      var targetCat = allData[rowNum - 1][catCol];

      // Update all sibling rows (same pi_id + category_title)
      for (var i = 1; i < allData.length; i++) {
        if (allData[i][piIdCol] === targetPiId && allData[i][catCol] === targetCat) {
          var siblingRowNum = i + 1;
          headers.forEach(function(h, colIndex) {
            if (sharedFields.includes(h) && updates.hasOwnProperty(h)) {
              sheet.getRange(siblingRowNum, colIndex + 1).setValue(updates[h]);
            }
            if (h === 'updated_date') {
              sheet.getRange(siblingRowNum, colIndex + 1).setValue(now);
            }
          });
        }
      }
    }

    // Update the specific row's non-shared fields
    headers.forEach(function(h, colIndex) {
      if (updates.hasOwnProperty(h) && h !== 'objective_id' && h !== 'created_date') {
        if (!hasSharedUpdate || !sharedFields.includes(h)) {
          sheet.getRange(rowNum, colIndex + 1).setValue(updates[h]);
        }
      }
    });

    clearGoalsCache_();
    return { success: true };
  } catch (e) {
    Logger.log('updateObjective error: ' + e.message);
    return { success: false, error: 'Failed to update objective: ' + e.message };
  }
}

/**
 * Delete a single objective row
 * @param {string} objectiveId - Objective ID
 * @returns {Object} { success: boolean, error?: string }
 */
function deleteObjective(objectiveId) {
  try {
    if (!objectiveId) return { success: false, error: 'Objective ID is required' };

    var writeInfo = getSheetTabForWrite_(GOALS_CONFIG_KEY_, GOALS_TAB_OBJECTIVES_);
    var rowNum = findRowByField_(writeInfo.sheet, writeInfo.headers, 'objective_id', objectiveId);
    if (rowNum === -1) return { success: false, error: 'Objective not found' };

    writeInfo.sheet.deleteRow(rowNum);
    clearGoalsCache_();

    return { success: true };
  } catch (e) {
    Logger.log('deleteObjective error: ' + e.message);
    return { success: false, error: 'Failed to delete objective: ' + e.message };
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get goals statistics for the active PI.
 * Counts individual criteria rows (not categories).
 * @returns {Object} Stats summary
 */
function getGoalsStats() {
  try {
    var activePI = getActivePI();
    if (!activePI) {
      return { total: 0, completed: 0, in_progress: 0, not_started: 0, deferred: 0, pi_name: '', progress_pct: 0 };
    }

    var allRows = loadAllObjectives_();
    var piRows = allRows.filter(function(o) { return o.pi_id === activePI.pi_id; });

    var completed = 0;
    var inProgress = 0;
    var notStarted = 0;
    var deferred = 0;

    piRows.forEach(function(row) {
      if (row.status === 'completed') completed++;
      else if (row.status === 'in_progress') inProgress++;
      else if (row.status === 'deferred') deferred++;
      else notStarted++;
    });

    // Include milestone criteria in stats
    // Wrapped in own try/catch so milestone errors don't break stats
    var msCount = 0;
    try {
      if (activePI.start_date && activePI.end_date) {
        var msMilestones = getMilestonesForPI(activePI.start_date, activePI.end_date);
        msCount = msMilestones.length;
        msMilestones.forEach(function(m) {
          if (m.status === 'completed') completed++;
          else notStarted++;
        });
      }
    } catch (msErr) {
      Logger.log('Milestone stats skipped: ' + msErr.message);
    }

    var total = piRows.length + msCount;

    return {
      total: total,
      completed: completed,
      in_progress: inProgress,
      not_started: notStarted,
      deferred: deferred,
      pi_id: activePI.pi_id,
      pi_name: activePI.name || activePI.pi_id,
      criteria_total: total,
      criteria_complete: completed,
      progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  } catch (e) {
    Logger.log('getGoalsStats error: ' + e.message);
    return { total: 0, completed: 0, in_progress: 0, not_started: 0, deferred: 0, pi_name: '', progress_pct: 0 };
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR UI
// ============================================================================

/**
 * Get objective status options for dropdowns
 * @returns {Array} Status options with metadata
 */
function getGoalObjectiveStatusOptions() {
  return GOAL_OBJECTIVE_STATUSES.map(function(status) {
    var info = GOAL_OBJECTIVE_STATUS_INFO[status] || {};
    return {
      value: status,
      name: info.name || status,
      color: info.color || '#9E9E9E',
      icon: info.icon || 'help'
    };
  });
}

/**
 * Get all goals data for initial load (combines multiple queries)
 * @returns {Object} { missionVision, pis, activePI, objectives, stats, objectiveStatusOptions }
 */
function getGoalsInitData() {
  var missionVision = getMissionVision();
  var pis = getAllPIs();
  var activePI = getActivePI();
  var objectives = activePI ? getObjectivesByPI(activePI.pi_id) : [];
  var stats = getGoalsStats();

  return {
    missionVision: missionVision,
    pis: pis,
    activePI: activePI,
    objectives: objectives,
    stats: stats,
    objectiveStatusOptions: getGoalObjectiveStatusOptions()
  };
}
