/**
 * Milestones API
 * ==============
 * Data access functions for MO-DB_Milestones.
 * Reads from the Milestones sheet configured in MO-DB_Config.
 *
 * @fileoverview Milestones data access layer for Implementation-NSITE
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Milestones sheet ID from config
 */
function getMilestonesSheetId_() {
  return getConfigValue('MILESTONES_SHEET_ID');
}

/**
 * Load all milestones from the database
 */
function loadAllMilestones_() {
  try {
    var sheetId = getMilestonesSheetId_();
    if (!sheetId) {
      Logger.log('MILESTONES_SHEET_ID not configured');
      return [];
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Milestones') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) return [];

    var headers = data[0];
    var rows = data.slice(1);

    var milestones = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) {
        var value = row[i];
        if (value instanceof Date) {
          obj[header] = value.toISOString().split('T')[0];
        } else {
          obj[header] = value;
        }
      });
      // Normalize enum fields to lowercase — sheet data may have mixed case
      if (obj.status) obj.status = String(obj.status).toLowerCase().trim();
      if (obj.milestone_type) obj.milestone_type = String(obj.milestone_type).toLowerCase().trim();
      return obj;
    }).filter(function(m) {
      return m.milestone_id && String(m.milestone_id).trim();
    });

    return milestones;
  } catch (e) {
    Logger.log('Error loading milestones: ' + e.message);
    return [];
  }
}

// ============================================================================
// CORE QUERY FUNCTIONS
// ============================================================================

/**
 * Get all milestones
 * @returns {Array} All milestone records
 */
function getAllMilestones() {
  var milestones = loadAllMilestones_();
  return deepCopy(milestones);
}

/**
 * Get milestones for a specific solution
 * @param {string} solutionId - Solution ID or name
 * @returns {Array} Milestones for the solution
 */
function getMilestonesBySolution(solutionId) {
  if (!solutionId) return [];

  var searchTerm = String(solutionId).toLowerCase().trim();
  var milestones = loadAllMilestones_().filter(function(m) {
    var id = String(m.solution_id || '').toLowerCase();
    return id.includes(searchTerm);
  });

  // Sort by phase order
  var phaseOrder = {
    'Pre-Formulation': 1,
    'Formulation': 2,
    'Implementation': 3,
    'Production': 4,
    'Closeout': 5
  };

  milestones.sort(function(a, b) {
    var orderA = phaseOrder[a.phase] || 99;
    var orderB = phaseOrder[b.phase] || 99;
    return orderA - orderB;
  });

  return deepCopy(milestones);
}

/**
 * Get milestones by type (e.g., "F2I DG", "ORR", "Operation Start")
 * @param {string} type - Milestone type
 * @returns {Array} Milestones of this type
 */
function getMilestonesByType(type) {
  if (!type) return [];

  var searchTerm = String(type).toLowerCase().trim();
  var milestones = loadAllMilestones_().filter(function(m) {
    return String(m.type || '').toLowerCase().includes(searchTerm);
  });

  return deepCopy(milestones);
}

/**
 * Get milestones by status
 * @param {string} status - Status (planned, completed, overdue, not_started)
 * @returns {Array} Milestones with this status
 */
function getMilestonesByStatus(status) {
  if (!status) return [];

  var searchTerm = String(status).toLowerCase().trim();
  var milestones = loadAllMilestones_().filter(function(m) {
    return String(m.status || '').toLowerCase() === searchTerm;
  });

  return deepCopy(milestones);
}

/**
 * Get milestones by cycle
 * @param {number|string} cycle - Cycle number (1-6)
 * @returns {Array} Milestones for this cycle
 */
function getMilestonesByCycle(cycle) {
  if (!cycle) return [];

  var cycleNum = String(cycle);
  var milestones = loadAllMilestones_().filter(function(m) {
    return String(m.cycle) === cycleNum;
  });

  return deepCopy(milestones);
}

/**
 * Get upcoming milestones (next 90 days)
 * @param {number} days - Number of days to look ahead (default 90)
 * @returns {Array} Upcoming milestones sorted by date
 */
function getUpcomingMilestones(days) {
  days = days || 90;
  var today = new Date();
  var futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));

  var milestones = loadAllMilestones_().filter(function(m) {
    if (!m.target_date || m.status === 'completed') return false;

    try {
      var targetDate = new Date(m.target_date);
      return targetDate >= today && targetDate <= futureDate;
    } catch (e) {
      return false;
    }
  });

  // Sort by date
  milestones.sort(function(a, b) {
    return new Date(a.target_date) - new Date(b.target_date);
  });

  return deepCopy(milestones);
}

/**
 * Get overdue milestones
 * @returns {Array} Milestones past their target date that aren't completed
 */
function getOverdueMilestones() {
  var today = new Date();

  var milestones = loadAllMilestones_().filter(function(m) {
    if (!m.target_date || m.status === 'completed') return false;

    try {
      var targetDate = new Date(m.target_date);
      return targetDate < today;
    } catch (e) {
      return false;
    }
  });

  // Sort by date (oldest first)
  milestones.sort(function(a, b) {
    return new Date(a.target_date) - new Date(b.target_date);
  });

  return deepCopy(milestones);
}

// ============================================================================
// STATISTICS & SUMMARIES
// ============================================================================

/**
 * Get milestone statistics
 * @returns {Object} Statistics about milestones
 */
function getMilestoneStats() {
  var milestones = loadAllMilestones_();

  var stats = {
    total: milestones.length,
    byStatus: {},
    byPhase: {},
    byType: {},
    byCycle: {},
    upcoming30: 0,
    upcoming90: 0,
    overdue: 0
  };

  var today = new Date();
  var thirtyDays = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
  var ninetyDays = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000));

  milestones.forEach(function(m) {
    // By status
    var status = m.status || 'unknown';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // By phase
    var phase = m.phase || 'Unknown';
    stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

    // By type
    var type = m.type || 'Other';
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // By cycle
    var cycle = m.cycle || 'Unknown';
    stats.byCycle[cycle] = (stats.byCycle[cycle] || 0) + 1;

    // Upcoming and overdue
    if (m.target_date && m.status !== 'completed') {
      try {
        var targetDate = new Date(m.target_date);
        if (targetDate < today) {
          stats.overdue++;
        } else if (targetDate <= thirtyDays) {
          stats.upcoming30++;
        } else if (targetDate <= ninetyDays) {
          stats.upcoming90++;
        }
      } catch (e) {}
    }
  });

  return stats;
}

/**
 * Get solution milestone summary (for Implementation-NSITE detail view)
 * @param {string} solutionId - Solution ID or name
 * @returns {Object} Summary of solution's milestones
 */
function getSolutionMilestoneSummary(solutionId) {
  var milestones = getMilestonesBySolution(solutionId);

  var summary = {
    solution_id: solutionId,
    total: milestones.length,
    completed: 0,
    planned: 0,
    overdue: 0,
    not_started: 0,
    next_milestone: null,
    milestones: milestones
  };

  var today = new Date();

  milestones.forEach(function(m) {
    if (m.status === 'completed') {
      summary.completed++;
    } else if (m.status === 'planned') {
      summary.planned++;
      if (m.target_date) {
        try {
          var targetDate = new Date(m.target_date);
          if (targetDate < today) {
            summary.overdue++;
          }
          // Track next upcoming milestone
          if (!summary.next_milestone || targetDate < new Date(summary.next_milestone.target_date)) {
            if (targetDate >= today) {
              summary.next_milestone = m;
            }
          }
        } catch (e) {}
      }
    } else {
      summary.not_started++;
    }
  });

  return summary;
}

/**
 * Get milestone timeline for a solution (for visualization)
 * @param {string} solutionId - Solution ID or name
 * @returns {Array} Timeline entries with phase groupings
 */
function getSolutionMilestoneTimeline(solutionId) {
  var milestones = getMilestonesBySolution(solutionId);

  var phases = ['Pre-Formulation', 'Formulation', 'Implementation', 'Production', 'Closeout'];

  var timeline = phases.map(function(phase) {
    var phaseMilestones = milestones.filter(function(m) {
      return m.phase === phase;
    });

    return {
      phase: phase,
      milestones: phaseMilestones,
      completed: phaseMilestones.filter(function(m) { return m.status === 'completed'; }).length,
      total: phaseMilestones.length
    };
  }).filter(function(p) {
    return p.total > 0;
  });

  return timeline;
}

// ============================================================================
// DASHBOARD HELPERS
// ============================================================================

/**
 * Get milestones summary for multiple solutions (bulk query)
 * @param {Array} solutionIds - Array of solution IDs
 * @returns {Object} Map of solution ID to milestone summary
 */
function getMultipleSolutionMilestones(solutionIds) {
  if (!solutionIds || !solutionIds.length) return {};

  var result = {};
  solutionIds.forEach(function(id) {
    result[id] = getSolutionMilestoneSummary(id);
  });

  return result;
}

/**
 * Get milestone counts by solution (for Implementation-NSITE cards)
 * @returns {Object} Map of solution_id to {completed, planned, total}
 */
function getMilestoneCountsBySolution() {
  var milestones = loadAllMilestones_();
  var counts = {};

  milestones.forEach(function(m) {
    var id = m.solution_id;
    if (!id) return;

    if (!counts[id]) {
      counts[id] = { completed: 0, planned: 0, total: 0, next_date: null };
    }

    counts[id].total++;

    if (m.status === 'completed') {
      counts[id].completed++;
    } else if (m.status === 'planned' && m.target_date) {
      counts[id].planned++;
      // Track earliest upcoming date
      if (!counts[id].next_date || m.target_date < counts[id].next_date) {
        counts[id].next_date = m.target_date;
      }
    }
  });

  return counts;
}

/**
 * Search milestones
 * @param {string} query - Search term
 * @returns {Array} Matching milestones
 */
function searchMilestones(query) {
  if (!query || query.length < 2) return [];

  var searchTerm = String(query).toLowerCase().trim();

  var milestones = loadAllMilestones_().filter(function(m) {
    var searchable = [
      m.solution_id, m.type, m.phase, m.notes
    ].join(' ').toLowerCase();
    return searchable.includes(searchTerm);
  });

  return deepCopy(milestones);
}

// ============================================================================
// PI INTEGRATION & WRITE FUNCTIONS
// ============================================================================

/**
 * Get milestones within a date range (for PI Goals integration).
 * Returns milestones where target_date falls within [startDate, endDate].
 *
 * @param {string} startDate - PI start date (YYYY-MM-DD)
 * @param {string} endDate - PI end date (YYYY-MM-DD)
 * @returns {Array} Milestones within the date range, sorted by target_date asc
 */
function getMilestonesForPI(startDate, endDate) {
  if (!startDate || !endDate) return [];

  var start = new Date(startDate);
  var end = new Date(endDate);

  var milestones = loadAllMilestones_().filter(function(m) {
    if (!m.target_date) return false;
    try {
      var td = new Date(m.target_date);
      return td >= start && td <= end;
    } catch (e) {
      return false;
    }
  });

  milestones.sort(function(a, b) {
    return new Date(a.target_date) - new Date(b.target_date);
  });

  return deepCopy(milestones);
}

/**
 * Toggle a milestone's completion status.
 * When completed: sets actual_date to today, status to 'completed'.
 * When uncompleted: clears actual_date, sets status to 'planned'.
 *
 * @param {string} milestoneId - milestone_id to toggle
 * @param {boolean} completed - true to mark completed, false to unmark
 * @returns {Object} { success: boolean, error?: string }
 */
function toggleMilestoneCompletion(milestoneId, completed) {
  try {
    if (!milestoneId) return { success: false, error: 'Milestone ID is required' };

    var writeInfo = getSheetTabForWrite_('MILESTONES_SHEET_ID', 'Milestones');
    var rowNum = findRowByField_(writeInfo.sheet, writeInfo.headers, 'milestone_id', milestoneId);
    if (rowNum === -1) return { success: false, error: 'Milestone not found: ' + milestoneId };

    var now = new Date().toISOString().split('T')[0];

    writeInfo.headers.forEach(function(h, colIndex) {
      if (h === 'status') {
        writeInfo.sheet.getRange(rowNum, colIndex + 1).setValue(completed ? 'completed' : 'planned');
      } else if (h === 'date') {
        writeInfo.sheet.getRange(rowNum, colIndex + 1).setValue(completed ? now : '');
      }
    });

    return { success: true };
  } catch (e) {
    Logger.log('toggleMilestoneCompletion error: ' + e.message);
    return { success: false, error: 'Failed to toggle milestone: ' + e.message };
  }
}

/**
 * Update a milestone's editable fields.
 *
 * @param {string} milestoneId - milestone_id to update
 * @param {Object} updates - Key-value pairs of fields to update
 * @returns {Object} { success: boolean, error?: string }
 */
function updateMilestone(milestoneId, updates) {
  try {
    if (!milestoneId) return { success: false, error: 'Milestone ID is required' };
    if (!updates || typeof updates !== 'object') return { success: false, error: 'Updates object is required' };

    var WRITABLE_FIELDS = ['target_date', 'date', 'status', 'url', 'memo_date', 'memo_url', 'notes'];

    var writeInfo = getSheetTabForWrite_('MILESTONES_SHEET_ID', 'Milestones');
    var rowNum = findRowByField_(writeInfo.sheet, writeInfo.headers, 'milestone_id', milestoneId);
    if (rowNum === -1) return { success: false, error: 'Milestone not found: ' + milestoneId };

    writeInfo.headers.forEach(function(h, colIndex) {
      if (WRITABLE_FIELDS.indexOf(h) !== -1 && updates.hasOwnProperty(h)) {
        writeInfo.sheet.getRange(rowNum, colIndex + 1).setValue(updates[h]);
      }
    });

    return { success: true };
  } catch (e) {
    Logger.log('updateMilestone error: ' + e.message);
    return { success: false, error: 'Failed to update milestone: ' + e.message };
  }
}
