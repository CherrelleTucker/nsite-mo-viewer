/**
 * Updates API
 * ===========
 * Data access layer for MO-DB_Updates
 * Provides query functions for solution updates
 */

// ============================================================================
// CACHE
// ============================================================================

var _updatesCache = null;
var _updatesCacheTime = null;
var UPDATES_CACHE_DURATION = 60 * 1000; // 1 minute

/**
 * Clear updates cache
 */
function clearUpdatesCache() {
  _updatesCache = null;
  _updatesCacheTime = null;
}

// ============================================================================
// CORE DATA ACCESS
// ============================================================================

/**
 * Get all updates from the database
 * @param {number} limit - Optional limit on results
 * @returns {Array} Array of update objects
 */
function getAllUpdates(limit) {
  // Check cache
  if (_updatesCache && _updatesCacheTime &&
      (new Date().getTime() - _updatesCacheTime) < UPDATES_CACHE_DURATION) {
    var cached = _updatesCache;
    if (limit) cached = cached.slice(0, limit);
    return cached;
  }

  try {
    var sheet = getDatabaseSheet('Updates');
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    var headers = data[0];
    var updates = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var update = {};

      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var value = row[j];

        // Format dates
        if ((key === 'meeting_date' || key === 'created_at') && value instanceof Date) {
          update[key] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else {
          update[key] = value !== undefined && value !== null ? value : '';
        }
      }

      if (update.update_id || update.update_text) {
        updates.push(update);
      }
    }

    // Sort by meeting_date descending (newest first)
    updates.sort(function(a, b) {
      var dateA = a.meeting_date ? new Date(a.meeting_date) : new Date(0);
      var dateB = b.meeting_date ? new Date(b.meeting_date) : new Date(0);
      return dateB - dateA;
    });

    // Update cache
    _updatesCache = updates;
    _updatesCacheTime = new Date().getTime();

    if (limit) {
      return updates.slice(0, limit);
    }

    return updates;
  } catch (error) {
    Logger.log('Error in getAllUpdates: ' + error);
    return [];
  }
}

// ============================================================================
// SOLUTION-SPECIFIC QUERIES
// ============================================================================

/**
 * Get updates for a specific solution
 * @param {string} solutionName - Solution name to filter by
 * @param {number} limit - Optional limit on results
 * @returns {Array} Updates for the solution
 */
function getUpdatesBySolution(solutionName, limit) {
  var updates = getAllUpdates();
  var solutionLower = (solutionName || '').toLowerCase().trim();

  var filtered = updates.filter(function(update) {
    var updateSolution = (update.solution || '').toLowerCase().trim();
    return updateSolution === solutionLower ||
           updateSolution.indexOf(solutionLower) !== -1 ||
           solutionLower.indexOf(updateSolution) !== -1;
  });

  if (limit) {
    return filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Get recent updates for a solution (last N days)
 * @param {string} solutionName - Solution name
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Array} Recent updates
 */
function getRecentUpdatesBySolution(solutionName, days) {
  days = days || 30;
  var cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  var solutionUpdates = getUpdatesBySolution(solutionName);

  return solutionUpdates.filter(function(update) {
    if (!update.meeting_date) return false;
    var updateDate = new Date(update.meeting_date);
    return updateDate >= cutoffDate;
  });
}

/**
 * Get updates for a solution within a date range
 * @param {string} solutionName - Solution name
 * @param {number} daysBack - Days to look back (e.g., 180 for 6 months)
 * @returns {Array} Updates within range
 */
function getUpdatesBySolutionInRange(solutionName, daysBack) {
  var cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  var solutionUpdates = getUpdatesBySolution(solutionName);

  return solutionUpdates.filter(function(update) {
    if (!update.meeting_date) return true; // Include undated updates
    var updateDate = new Date(update.meeting_date);
    return updateDate >= cutoffDate;
  });
}

/**
 * Get updates for Implementation-NSITE solution cards
 * Returns structured data with recent (30 days) and extended (6 months) updates
 * @param {string} solutionName - Solution name
 * @returns {Object} { recent: Array, extended: Array, hasMore: boolean }
 */
function getUpdatesForSolutionCard(solutionName) {
  var allSolutionUpdates = getUpdatesBySolution(solutionName);

  var now = new Date();
  var thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  var sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  var recent = [];
  var extended = [];
  var historical = [];

  allSolutionUpdates.forEach(function(update) {
    var updateDate = update.meeting_date ? new Date(update.meeting_date) : null;

    if (updateDate && updateDate >= thirtyDaysAgo) {
      recent.push(update);
    } else if (updateDate && updateDate >= sixMonthsAgo) {
      extended.push(update);
    } else {
      historical.push(update);
    }
  });

  return {
    recent: recent,           // Last 30 days - shown by default
    extended: extended,       // 30 days to 6 months - shown on "see more"
    hasMore: extended.length > 0,
    hasHistorical: historical.length > 0,
    totalCount: allSolutionUpdates.length
  };
}

// ============================================================================
// CROSS-SOLUTION QUERIES
// ============================================================================

/**
 * Get recent updates across all solutions
 * @param {number} days - Number of days to look back (default 7)
 * @param {number} limit - Maximum updates to return
 * @returns {Array} Recent updates
 */
function getRecentUpdates(days, limit) {
  days = days || 7;
  limit = limit || 20;

  var cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  var updates = getAllUpdates();

  var recent = updates.filter(function(update) {
    if (!update.meeting_date) return false;
    var updateDate = new Date(update.meeting_date);
    return updateDate >= cutoffDate;
  });

  return recent.slice(0, limit);
}

/**
 * Get updates grouped by solution
 * @returns {Object} Map of solution name to updates array
 */
function getUpdatesGroupedBySolution() {
  var updates = getAllUpdates();
  var grouped = {};

  updates.forEach(function(update) {
    var solution = update.solution || 'Unknown';
    if (!grouped[solution]) {
      grouped[solution] = [];
    }
    grouped[solution].push(update);
  });

  return grouped;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get update statistics
 * @returns {Object} Statistics object
 */
function getUpdatesStats() {
  var updates = getAllUpdates();

  var now = new Date();
  var weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  var monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  var thisWeek = 0;
  var thisMonth = 0;
  var solutions = {};
  var sources = {};

  updates.forEach(function(update) {
    var updateDate = update.meeting_date ? new Date(update.meeting_date) : null;

    if (updateDate) {
      if (updateDate >= weekAgo) thisWeek++;
      if (updateDate >= monthAgo) thisMonth++;
    }

    // Count by solution
    var solution = update.solution || 'Unknown';
    solutions[solution] = (solutions[solution] || 0) + 1;

    // Count by source
    var source = update.source_document || 'Unknown';
    sources[source] = (sources[source] || 0) + 1;
  });

  return {
    total: updates.length,
    thisWeek: thisWeek,
    thisMonth: thisMonth,
    bySolution: solutions,
    bySource: sources,
    solutionCount: Object.keys(solutions).length
  };
}

// ============================================================================
// REPORT DATA
// ============================================================================

/**
 * Get full historical updates for a solution (for reports)
 * @param {string} solutionName - Solution name
 * @returns {Array} All updates for the solution, sorted by date
 */
function getHistoricalUpdatesForReport(solutionName) {
  return getUpdatesBySolution(solutionName);
}

/**
 * Get all updates for historical report (all solutions)
 * @returns {Object} { solutions: Array of {name, updates}, stats: Object }
 */
function getAllHistoricalUpdatesForReport() {
  var grouped = getUpdatesGroupedBySolution();
  var solutions = [];

  for (var solutionName in grouped) {
    solutions.push({
      name: solutionName,
      updates: grouped[solutionName],
      updateCount: grouped[solutionName].length
    });
  }

  // Sort by solution name
  solutions.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  return {
    solutions: solutions,
    stats: getUpdatesStats()
  };
}
