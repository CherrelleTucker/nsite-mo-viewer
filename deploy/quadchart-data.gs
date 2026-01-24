/**
 * Quad Chart Data Generator
 * =========================
 * Generates data for weekly quad chart slides.
 * Four quadrants: Updates, Milestones, Actions, Decisions
 *
 * @fileoverview Report generator for weekly meeting slides
 */

// ============================================================================
// QUAD CHART GENERATION
// ============================================================================

/**
 * Generate complete quad chart data
 * @param {Object} options - Optional settings
 * @param {number} options.daysBack - Days to look back for updates (default: 7)
 * @param {number} options.daysAhead - Days to look ahead for milestones (default: 30)
 * @param {boolean} options.defaultOnly - Only include default solutions
 * @returns {Object} Quad chart data with all four quadrants
 */
function generateQuadChartData(options) {
  options = options || {};
  var daysBack = options.daysBack || 7;
  var daysAhead = options.daysAhead || 30;

  try {
    var result = {
      generated: new Date().toISOString(),
      reportPeriod: {
        from: getDateOffset_(-daysBack),
        to: getDateOffset_(daysAhead)
      },
      quadrants: {
        updates: getQuadrantUpdates_(daysBack, options.defaultOnly),
        milestones: getQuadrantMilestones_(daysAhead, options.defaultOnly),
        actions: getQuadrantActions_(options.defaultOnly),
        decisions: getQuadrantDecisions_(options.defaultOnly)
      },
      summary: {}
    };

    // Calculate summary stats
    result.summary = {
      totalUpdates: result.quadrants.updates.items.length,
      totalMilestones: result.quadrants.milestones.items.length,
      totalActions: result.quadrants.actions.items.length,
      totalDecisions: result.quadrants.decisions.items.length,
      solutionsTracked: getAllSolutions().length
    };

    return result;

  } catch (e) {
    Logger.log('Error generating quad chart data: ' + e.message);
    throw new Error('Failed to generate quad chart: ' + e.message);
  }
}

// ============================================================================
// QUADRANT 1: SOLUTIONS UPDATED THIS WEEK
// ============================================================================

/**
 * Get solutions with recent updates
 */
function getQuadrantUpdates_(daysBack, defaultOnly) {
  var solutions = getAllSolutions();
  var cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  if (defaultOnly) {
    solutions = solutions.filter(function(s) {
      return s.admin_default_in_dashboard === 'Y';
    });
  }

  // Filter to recently updated solutions
  var updated = solutions.filter(function(sol) {
    if (!sol.last_updated) return false;
    try {
      var updateDate = new Date(sol.last_updated);
      return updateDate >= cutoffDate;
    } catch (e) {
      return false;
    }
  });

  // Sort by most recent first
  updated.sort(function(a, b) {
    return new Date(b.last_updated) - new Date(a.last_updated);
  });

  // Format for display
  var items = updated.map(function(sol) {
    return {
      solution: sol.core_id,
      cycle: 'C' + (sol.core_cycle || '?'),
      phase: sol.admin_lifecycle_phase || '',
      summary: sol.earthdata_status_summary || sol.earthdata_purpose || '',
      lastUpdated: formatDateShort_(sol.last_updated)
    };
  });

  return {
    title: 'Solutions Updated This Week',
    subtitle: 'Last ' + daysBack + ' days',
    items: items,
    count: items.length
  };
}

// ============================================================================
// QUADRANT 2: UPCOMING MILESTONES
// ============================================================================

/**
 * Get upcoming milestones from solution date columns
 */
function getQuadrantMilestones_(daysAhead, defaultOnly) {
  var solutions = getAllSolutions();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var futureDate = new Date(today.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

  if (defaultOnly) {
    solutions = solutions.filter(function(s) {
      return s.admin_default_in_dashboard === 'Y';
    });
  }

  var milestones = [];

  // Extract milestones from each solution
  solutions.forEach(function(sol) {
    var solutionMilestones = [
      { type: 'ATP DG', date: sol.milestone_atp_date },
      { type: 'F2I DG', date: sol.milestone_f2i_date },
      { type: 'ORR', date: sol.milestone_orr_date },
      { type: 'Closeout', date: sol.milestone_closeout_date }
    ];

    solutionMilestones.forEach(function(ms) {
      if (ms.date) {
        try {
          var msDate = new Date(ms.date);
          msDate.setHours(0, 0, 0, 0);
          if (msDate >= today && msDate <= futureDate) {
            milestones.push({
              solution: sol.core_id,
              cycle: 'C' + (sol.core_cycle || '?'),
              type: ms.type,
              date: msDate,
              dateStr: formatDateShort_(msDate),
              daysUntil: Math.ceil((msDate - today) / (1000 * 60 * 60 * 24))
            });
          }
        } catch (e) {}
      }
    });
  });

  // Sort by date
  milestones.sort(function(a, b) {
    return a.date - b.date;
  });

  // Format for display
  var items = milestones.map(function(ms) {
    var urgency = ms.daysUntil <= 7 ? 'urgent' : (ms.daysUntil <= 14 ? 'soon' : 'upcoming');
    return {
      solution: ms.solution,
      cycle: ms.cycle,
      milestone: ms.type,
      date: ms.dateStr,
      daysUntil: ms.daysUntil,
      urgency: urgency
    };
  });

  return {
    title: 'Upcoming Milestones',
    subtitle: 'Next ' + daysAhead + ' days',
    items: items,
    count: items.length
  };
}

// ============================================================================
// QUADRANT 3: OPEN ACTION ITEMS
// ============================================================================

/**
 * Get open action items
 * Note: Uses solutions with status_summary containing action-like text
 * until dedicated Actions table is populated
 */
function getQuadrantActions_(defaultOnly) {
  var solutions = getAllSolutions();

  if (defaultOnly) {
    solutions = solutions.filter(function(s) {
      return s.admin_default_in_dashboard === 'Y';
    });
  }

  // Extract action-like items from status summaries
  // Look for patterns like "Action:", "TODO:", "Next:", etc.
  var actionPatterns = /(?:action|todo|next step|pending|need to|waiting for|schedule|coordinate)/i;

  var items = [];

  solutions.forEach(function(sol) {
    var text = (sol.earthdata_status_summary || '') + ' ' + (sol.next_steps || '');

    if (actionPatterns.test(text)) {
      // Extract the action text
      var actionText = extractActionText_(text);
      if (actionText) {
        items.push({
          solution: sol.core_id,
          cycle: 'C' + (sol.core_cycle || '?'),
          action: actionText,
          owner: sol.team_lead || '',
          priority: 'medium'
        });
      }
    }
  });

  // Limit to most relevant
  items = items.slice(0, 10);

  return {
    title: 'Open Action Items',
    subtitle: 'From MO-DB_Actions',
    items: items,
    count: items.length
  };
}

/**
 * Extract action text from a longer string
 */
function extractActionText_(text) {
  // Try to find action-specific sentences
  var sentences = text.split(/[.;]/);

  for (var i = 0; i < sentences.length; i++) {
    var s = sentences[i].trim();
    if (s.length > 10 && s.length < 200) {
      if (/(?:action|todo|next|need|waiting|schedule|coordinate)/i.test(s)) {
        return s;
      }
    }
  }

  // Fallback: return truncated text
  if (text.length > 100) {
    return text.substring(0, 100) + '...';
  }

  return text.trim() || null;
}

// ============================================================================
// QUADRANT 4: KEY DECISIONS NEEDED
// ============================================================================

/**
 * Get key decisions needed
 * Identifies solutions with upcoming milestones or blockers
 */
function getQuadrantDecisions_(defaultOnly) {
  var solutions = getAllSolutions();
  var today = new Date();

  if (defaultOnly) {
    solutions = solutions.filter(function(s) {
      return s.admin_default_in_dashboard === 'Y';
    });
  }

  var items = [];

  // Look for solutions needing decisions
  solutions.forEach(function(sol) {
    var decisions = [];

    // Check for upcoming decision gates
    var gates = [
      { type: 'ATP DG', date: sol.milestone_atp_date, memo: sol.milestone_atp_memo_url },
      { type: 'F2I DG', date: sol.milestone_f2i_date, memo: sol.milestone_f2i_memo_url },
      { type: 'ORR', date: sol.milestone_orr_date, memo: sol.milestone_orr_memo_url }
    ];

    gates.forEach(function(gate) {
      if (gate.date && !gate.memo) {
        try {
          var gateDate = new Date(gate.date);
          var daysUntil = Math.ceil((gateDate - today) / (1000 * 60 * 60 * 24));
          if (daysUntil > 0 && daysUntil <= 60) {
            decisions.push({
              type: gate.type + ' memo needed',
              urgency: daysUntil <= 14 ? 'high' : (daysUntil <= 30 ? 'medium' : 'low'),
              daysUntil: daysUntil
            });
          }
        } catch (e) {}
      }
    });

    // Check for documents in_work that may need decisions
    var docs = [
      { name: 'IPA', status: sol.ipa },
      { name: 'ICD', status: sol.icd },
      { name: 'Project Plan', status: sol.project_plan }
    ];

    docs.forEach(function(doc) {
      if (String(doc.status).toLowerCase() === 'in_work') {
        decisions.push({
          type: doc.name + ' approval pending',
          urgency: 'medium'
        });
      }
    });

    if (decisions.length > 0) {
      items.push({
        solution: sol.core_id,
        cycle: 'C' + (sol.core_cycle || '?'),
        phase: sol.admin_lifecycle_phase || '',
        decisions: decisions,
        count: decisions.length
      });
    }
  });

  // Sort by decision count (most decisions first)
  items.sort(function(a, b) {
    return b.count - a.count;
  });

  // Limit to top items
  items = items.slice(0, 8);

  return {
    title: 'Key Decisions Needed',
    subtitle: 'Pending approvals and memos',
    items: items,
    count: items.reduce(function(sum, item) { return sum + item.count; }, 0)
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get date offset from today
 */
function getDateOffset_(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Format date as short string (Mon DD)
 */
function formatDateShort_(date) {
  if (!date) return '';
  try {
    var d = new Date(date);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  } catch (e) {
    return String(date);
  }
}

// ============================================================================
// API FUNCTIONS (for frontend)
// ============================================================================

/**
 * Get quad chart data for UI display
 * @param {Object} options - Filter options
 * @returns {Object} Quad chart data (JSON-safe)
 */
function getQuadChartReport(options) {
  var data = generateQuadChartData(options);
  return JSON.parse(JSON.stringify(data));
}

/**
 * Get just the updates quadrant
 * @param {number} daysBack - Days to look back
 * @returns {Object} Updates quadrant data
 */
function getRecentUpdates(daysBack) {
  return JSON.parse(JSON.stringify(getQuadrantUpdates_(daysBack || 7, false)));
}

/**
 * Get just the milestones quadrant
 * @param {number} daysAhead - Days to look ahead
 * @returns {Object} Milestones quadrant data
 */
function getUpcomingMilestonesReport(daysAhead) {
  return JSON.parse(JSON.stringify(getQuadrantMilestones_(daysAhead || 30, false)));
}

/**
 * Get milestone summary for slides
 * Formatted specifically for copy-paste into slides
 * @param {Object} options - Options
 * @returns {Object} Formatted milestone data
 */
function getMilestoneSummaryForSlides(options) {
  options = options || {};
  var daysAhead = options.daysAhead || 30;

  var milestones = getQuadrantMilestones_(daysAhead, options.defaultOnly);

  // Group by time period
  var thisWeek = [];
  var nextWeek = [];
  var thisMonth = [];

  milestones.items.forEach(function(ms) {
    if (ms.daysUntil <= 7) {
      thisWeek.push(ms);
    } else if (ms.daysUntil <= 14) {
      nextWeek.push(ms);
    } else {
      thisMonth.push(ms);
    }
  });

  return {
    title: 'Milestone Summary',
    generated: new Date().toISOString(),
    thisWeek: {
      label: 'This Week',
      items: thisWeek,
      count: thisWeek.length
    },
    nextWeek: {
      label: 'Next Week',
      items: nextWeek,
      count: nextWeek.length
    },
    thisMonth: {
      label: 'This Month',
      items: thisMonth,
      count: thisMonth.length
    },
    total: milestones.count
  };
}

// ============================================================================
// SLIDE GENERATION HELPERS
// ============================================================================

/**
 * Generate text summary for quad chart slide
 * Returns plain text suitable for copying into slides
 * @param {Object} options - Options
 * @returns {string} Formatted text
 */
function generateQuadChartText(options) {
  var data = generateQuadChartData(options);
  var lines = [];

  lines.push('MO-NSITE Weekly Status');
  lines.push('Generated: ' + formatDateShort_(new Date()));
  lines.push('');

  // Quadrant 1: Updates
  lines.push('SOLUTIONS UPDATED THIS WEEK (' + data.quadrants.updates.count + ')');
  lines.push('-'.repeat(40));
  data.quadrants.updates.items.slice(0, 5).forEach(function(item) {
    lines.push('• ' + item.solution + ' (' + item.cycle + ') - ' + item.phase);
  });
  if (data.quadrants.updates.count > 5) {
    lines.push('  ...and ' + (data.quadrants.updates.count - 5) + ' more');
  }
  lines.push('');

  // Quadrant 2: Milestones
  lines.push('UPCOMING MILESTONES (' + data.quadrants.milestones.count + ')');
  lines.push('-'.repeat(40));
  data.quadrants.milestones.items.slice(0, 5).forEach(function(item) {
    lines.push('• ' + item.solution + ': ' + item.milestone + ' - ' + item.date);
  });
  if (data.quadrants.milestones.count > 5) {
    lines.push('  ...and ' + (data.quadrants.milestones.count - 5) + ' more');
  }
  lines.push('');

  // Quadrant 3: Actions
  lines.push('OPEN ACTIONS (' + data.quadrants.actions.count + ')');
  lines.push('-'.repeat(40));
  data.quadrants.actions.items.slice(0, 5).forEach(function(item) {
    lines.push('• ' + item.solution + ': ' + item.action.substring(0, 60));
  });
  lines.push('');

  // Quadrant 4: Decisions
  lines.push('DECISIONS NEEDED (' + data.quadrants.decisions.count + ')');
  lines.push('-'.repeat(40));
  data.quadrants.decisions.items.slice(0, 5).forEach(function(item) {
    var decisionTexts = item.decisions.map(function(d) { return d.type; }).join(', ');
    lines.push('• ' + item.solution + ': ' + decisionTexts);
  });

  return lines.join('\n');
}
