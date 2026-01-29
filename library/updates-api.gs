/**
 * MO-APIs Library - Updates API
 * =============================
 * Data access layer for MO-DB_Updates
 * Provides query functions for solution updates
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 *
 * DATABASE STRUCTURE:
 * MO-DB_Updates uses yearly tabs for performance and scalability:
 *   - 2026, 2025, 2024 (yearly tabs)
 *   - Archive (pre-2024 data)
 *   - _Lookup (reference data, not queried)
 *
 * This structure prevents Google Sheets performance degradation
 * (>50K rows = sluggish) and keeps API responses fast by querying
 * only relevant year tabs based on date range.
 *
 * Google Sheets limits:
 *   - 10M cells per spreadsheet
 *   - 50K characters per cell
 *   - ~5MB practical limit for google.script.run responses
 */

// ============================================================================
// CACHE
// ============================================================================

var _updatesCache = {};  // Keyed by tab name
var _updatesCacheTime = {};
var UPDATES_CACHE_DURATION = 60 * 1000; // 1 minute

/**
 * Clear updates cache
 */
function clearUpdatesCache() {
  _updatesCache = {};
  _updatesCacheTime = {};
}

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

/**
 * Get the list of year tabs to query based on date range
 * Tab structure: 2026, 2025, 2024, Archive (pre-2024), _Lookup (not queried)
 * @param {number} daysBack - Days to look back (null = current year only)
 * @returns {Array} Tab names to query, e.g., ['2026', '2025']
 */
function getYearTabsForRange_(daysBack) {
  var currentYear = new Date().getFullYear();
  var tabs = [String(currentYear)];

  if (!daysBack) return tabs;

  var startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  var startYear = startDate.getFullYear();

  // Add years between start and current (2024 is oldest yearly tab)
  for (var year = currentYear - 1; year >= startYear && year >= 2024; year--) {
    tabs.push(String(year));
  }

  // Add Archive if going back before 2024
  if (startYear < 2024) {
    tabs.push('Archive');
  }

  return tabs;
}

/**
 * Get updates from a specific tab
 * @param {string} tabName - Tab name (e.g., '2026', 'Archive')
 * @returns {Array} Updates from that tab
 */
function getUpdatesFromTab_(tabName) {
  // Check cache
  var cacheKey = tabName;
  if (_updatesCache[cacheKey] && _updatesCacheTime[cacheKey] &&
      (new Date().getTime() - _updatesCacheTime[cacheKey]) < UPDATES_CACHE_DURATION) {
    return _updatesCache[cacheKey];
  }

  try {
    var sheetId = getConfigValue('UPDATES_SHEET_ID');
    if (!sheetId) {
      Logger.log('UPDATES_SHEET_ID not configured');
      return [];
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(tabName);

    if (!sheet) {
      Logger.log('Tab not found: ' + tabName);
      return [];
    }

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

    // Update cache
    _updatesCache[cacheKey] = updates;
    _updatesCacheTime[cacheKey] = new Date().getTime();

    return updates;
  } catch (error) {
    Logger.log('Error reading tab ' + tabName + ': ' + error);
    return [];
  }
}

// ============================================================================
// CORE DATA ACCESS
// ============================================================================

/**
 * Get all updates from the database (current year by default)
 * @param {number} limit - Optional limit on results
 * @param {number} daysBack - Optional days to look back (queries multiple tabs)
 * @returns {Array} Array of update objects
 */
function getAllUpdates(limit, daysBack) {
  try {
    var tabs = getYearTabsForRange_(daysBack);
    var allUpdates = [];

    // Query each relevant tab
    for (var i = 0; i < tabs.length; i++) {
      var tabUpdates = getUpdatesFromTab_(tabs[i]);
      allUpdates = allUpdates.concat(tabUpdates);
    }

    // Sort by meeting_date descending (newest first)
    allUpdates.sort(function(a, b) {
      var dateA = a.meeting_date ? new Date(a.meeting_date) : new Date(0);
      var dateB = b.meeting_date ? new Date(b.meeting_date) : new Date(0);
      return dateB - dateA;
    });

    if (limit) {
      return allUpdates.slice(0, limit);
    }

    return allUpdates;
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
 * @param {string} solutionId - Solution ID (core_id) to filter by
 * @param {number} limit - Optional limit on results
 * @param {number} daysBack - Optional days to look back (queries relevant year tabs)
 * @returns {Array} Updates for the solution
 */
function getUpdatesBySolution(solutionId, limit, daysBack) {
  // Default to 2 years of data for solution queries
  daysBack = daysBack || 730;
  var updates = getAllUpdates(null, daysBack);
  var solutionLower = (solutionId || '').toLowerCase().trim();

  var filtered = updates.filter(function(update) {
    var updateSolutionId = (update.solution_id || '').toLowerCase().trim();
    return updateSolutionId === solutionLower ||
           updateSolutionId.includes(solutionLower) ||
           solutionLower.includes(updateSolutionId);
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
  // Query only current year tab for recent updates
  var updates = getAllUpdates(null, days);
  var solutionLower = (solutionName || '').toLowerCase().trim();

  return updates.filter(function(update) {
    var updateSolutionId = (update.solution_id || '').toLowerCase().trim();
    var matches = updateSolutionId === solutionLower ||
                  updateSolutionId.includes(solutionLower) ||
                  solutionLower.includes(updateSolutionId);
    if (!matches) return false;

    if (!update.meeting_date) return false;
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
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

  // Query relevant year tabs
  var updates = getAllUpdates(null, daysBack);
  var solutionLower = (solutionName || '').toLowerCase().trim();

  return updates.filter(function(update) {
    var updateSolutionId = (update.solution_id || '').toLowerCase().trim();
    var matches = updateSolutionId === solutionLower ||
                  updateSolutionId.includes(solutionLower) ||
                  solutionLower.includes(updateSolutionId);
    if (!matches) return false;

    if (!update.meeting_date) return true; // Include undated updates
    var updateDate = new Date(update.meeting_date);
    return updateDate >= cutoffDate;
  });
}

/**
 * Get updates for Implementation-NSITE solution cards
 * Returns structured data with recent (30 days) and extended (6 months) updates
 * Limited and truncated to avoid exceeding google.script.run response size limits
 * @param {string} solutionName - Solution name
 * @returns {Object} { recent: Array, extended: Array, hasMore: boolean }
 */
function getUpdatesForSolutionCard(solutionName) {
  var MAX_RECENT = 10;      // Limit recent updates shown
  var MAX_EXTENDED = 10;    // Limit extended updates shown
  var MAX_TEXT_LENGTH = 300; // Truncate long update text

  // Query 6 months of data (covers recent + extended)
  var allSolutionUpdates = getUpdatesBySolution(solutionName, null, 180);

  var now = new Date();
  var thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  var sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  var recent = [];
  var extended = [];
  var recentTotal = 0;
  var extendedTotal = 0;

  allSolutionUpdates.forEach(function(update) {
    var updateDate = update.meeting_date ? new Date(update.meeting_date) : null;

    if (updateDate && updateDate >= thirtyDaysAgo) {
      recentTotal++;
      if (recent.length < MAX_RECENT) {
        recent.push(truncateUpdate_(update, MAX_TEXT_LENGTH));
      }
    } else if (updateDate && updateDate >= sixMonthsAgo) {
      extendedTotal++;
      if (extended.length < MAX_EXTENDED) {
        extended.push(truncateUpdate_(update, MAX_TEXT_LENGTH));
      }
    }
  });

  return {
    recent: recent,
    extended: extended,
    hasMore: extendedTotal > 0,
    recentTotal: recentTotal,
    extendedTotal: extendedTotal,
    totalCount: allSolutionUpdates.length
  };
}

/**
 * Truncate update object for card display
 * @param {Object} update - Update object
 * @param {number} maxLength - Max text length
 * @returns {Object} Truncated update
 */
function truncateUpdate_(update, maxLength) {
  var text = update.update_text || '';
  var truncated = text.length > maxLength;

  return {
    update_id: update.update_id,
    meeting_date: update.meeting_date,
    update_text: truncated ? text.substring(0, maxLength) + '...' : text,
    source_document: update.source_document,
    truncated: truncated
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

  // Query only current year for recent updates
  var updates = getAllUpdates(null, days);

  var recent = updates.filter(function(update) {
    if (!update.meeting_date) return false;
    var updateDate = new Date(update.meeting_date);
    return updateDate >= cutoffDate;
  });

  return recent.slice(0, limit);
}

/**
 * Get updates grouped by solution ID
 * @param {number} daysBack - Days to look back (default: current year)
 * @returns {Object} Map of solution_id to updates array
 */
function getUpdatesGroupedBySolution(daysBack) {
  var updates = getAllUpdates(null, daysBack);
  var grouped = {};

  updates.forEach(function(update) {
    var solutionId = update.solution_id || 'Unknown';
    if (!grouped[solutionId]) {
      grouped[solutionId] = [];
    }
    grouped[solutionId].push(update);
  });

  return grouped;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get update statistics (current year only for performance)
 * @param {number} daysBack - Days to look back (default: 365)
 * @returns {Object} Statistics object
 */
function getUpdatesStats(daysBack) {
  daysBack = daysBack || 365;
  var updates = getAllUpdates(null, daysBack);

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

    // Count by solution_id
    var solutionId = update.solution_id || 'Unknown';
    solutions[solutionId] = (solutions[solutionId] || 0) + 1;

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
 * Debug function to test updates data access
 * @returns {Object} Debug info about updates
 */
function debugUpdatesData() {
  try {
    var sheetId = getConfigValue('UPDATES_SHEET_ID');
    if (!sheetId) {
      return { success: false, error: 'UPDATES_SHEET_ID not configured' };
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheets = ss.getSheets();
    var tabInfo = [];

    sheets.forEach(function(sheet) {
      var name = sheet.getName();
      if (name !== '_Lookup') {
        var rowCount = sheet.getLastRow() - 1;  // Exclude header
        tabInfo.push({ name: name, rows: rowCount > 0 ? rowCount : 0 });
      }
    });

    // Get headers from first data tab
    var firstTab = ss.getSheetByName(String(new Date().getFullYear()));
    var headers = firstTab ? firstTab.getRange(1, 1, 1, firstTab.getLastColumn()).getValues()[0] : [];

    return {
      success: true,
      tabs: tabInfo,
      headers: headers,
      totalRows: tabInfo.reduce(function(sum, t) { return sum + t.rows; }, 0)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get full historical updates for a solution (for reports)
 * @param {string} solutionName - Solution name
 * @param {number} daysBack - Days to look back (default: 730 = 2 years)
 * @returns {Array} All updates for the solution, sorted by date
 */
function getHistoricalUpdatesForReport(solutionName, daysBack) {
  return getUpdatesBySolution(solutionName, null, daysBack || 730);
}

/**
 * Get all updates for historical report (all solutions)
 * @param {number} daysBack - Days to look back (default: 180 = 6 months)
 * @returns {Object} { solutions: Array of {name, updates}, stats: Object }
 */
function getAllHistoricalUpdatesForReport(yearTabs, solutionFilter, maxUpdates) {
  try {
    // Handle yearTabs - might come as array or string
    if (!yearTabs) {
      yearTabs = [String(new Date().getFullYear())];
    } else if (typeof yearTabs === 'string') {
      yearTabs = [yearTabs];
    } else if (!Array.isArray(yearTabs)) {
      yearTabs = [String(yearTabs)];
    }
    maxUpdates = maxUpdates || 500;

    Logger.log('getAllHistoricalUpdatesForReport: querying tabs = ' + yearTabs.join(', '));
    Logger.log('getAllHistoricalUpdatesForReport: solutionFilter = ' + solutionFilter);

    // Query specified year tabs directly
    var allUpdates = [];
    for (var i = 0; i < yearTabs.length; i++) {
      var tabUpdates = getUpdatesFromTab_(yearTabs[i]);
      allUpdates = allUpdates.concat(tabUpdates);
    }

    Logger.log('getAllHistoricalUpdatesForReport: allUpdates count = ' + allUpdates.length);

    // Prepare solution filter (case-insensitive, partial match)
    var filterLower = solutionFilter ? solutionFilter.toLowerCase().trim() : null;

    // Filter by solution (server-side)
    var filteredUpdates = allUpdates.filter(function(update) {
      // Skip if no update content
      if (!update.update_text && !update.update_id) return false;

      // Filter by solution_id if specified (partial match, case-insensitive)
      if (filterLower) {
        var solutionId = (update.solution_id || '').toLowerCase();
        if (solutionId.indexOf(filterLower) === -1) return false;
      }

      return true;
    });

    Logger.log('getAllHistoricalUpdatesForReport: filteredUpdates count = ' + filteredUpdates.length);

    // Sort by meeting_date descending (newest first)
    filteredUpdates.sort(function(a, b) {
      var dateA = a.meeting_date ? new Date(a.meeting_date) : new Date(0);
      var dateB = b.meeting_date ? new Date(b.meeting_date) : new Date(0);
      return dateB - dateA;
    });

    // Limit and truncate to reduce response size
    var totalFound = filteredUpdates.length;
    var limitedUpdates = filteredUpdates.slice(0, maxUpdates);

    // Truncate and sanitize update texts to reduce response size and ensure valid JSON
    limitedUpdates = limitedUpdates.map(function(update) {
      var text = update.update_text || '';
      // Truncate at 1000 chars (increased from 500 to preserve URLs)
      if (text.length > 1000) {
        text = text.substring(0, 1000) + '...';
      }
      // Remove control characters that break JSON serialization
      text = text.replace(/[\x00-\x1F\x7F]/g, ' ');

      return {
        update_id: String(update.update_id || ''),
        solution_id: String(update.solution_id || ''),
        update_text: text,
        meeting_date: String(update.meeting_date || ''),
        source_document: String(update.source_document || ''),
        source_url: String(update.source_url || ''),
        source_tab: String(update.source_tab || '')
      };
    });

    // Group filtered updates by solution_id
    var grouped = {};
    limitedUpdates.forEach(function(update) {
      var solutionId = update.solution_id || 'Unknown';
      if (!grouped[solutionId]) {
        grouped[solutionId] = [];
      }
      grouped[solutionId].push(update);
    });

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

    Logger.log('getAllHistoricalUpdatesForReport: returning ' + solutions.length + ' solutions');

    var result = {
      solutions: solutions,
      stats: {
        total: limitedUpdates.length,
        totalFound: totalFound,
        solutionCount: Object.keys(grouped).length,
        yearTabs: yearTabs.join(', '),
        solutionFilter: solutionFilter || 'all',
        wasLimited: totalFound > maxUpdates
      }
    };

    // Test serialization before returning
    try {
      var testJson = JSON.stringify(result);
      Logger.log('getAllHistoricalUpdatesForReport: result JSON size = ' + testJson.length + ' bytes');
    } catch (jsonError) {
      Logger.log('getAllHistoricalUpdatesForReport: JSON serialization error = ' + jsonError);
      // Return a safe result
      return {
        solutions: [],
        stats: {
          total: 0,
          solutionCount: 0,
          yearTabs: yearTabs.join(', '),
          error: 'JSON serialization failed: ' + jsonError.message
        }
      };
    }

    return result;
  } catch (error) {
    Logger.log('getAllHistoricalUpdatesForReport error: ' + error.toString());
    Logger.log('getAllHistoricalUpdatesForReport stack: ' + error.stack);
    return {
      solutions: [],
      stats: { total: 0, solutionCount: 0, yearTabs: (yearTabs || []).join(', '), error: error.message || error.toString() }
    };
  }
}
