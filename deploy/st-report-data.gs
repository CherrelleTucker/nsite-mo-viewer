/**
 * ST Monthly Report Data Generator
 * =================================
 * Aggregates data from multiple databases to generate the three sections
 * needed for ST Reporting SharePoint: Milestones, Accomplishments, Stoplights.
 *
 * Pattern: Same as quadchart-data.gs (deploy-only, calls existing API wrappers)
 *
 * @fileoverview Report generator for monthly ST Reporting
 */

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Generate complete ST Monthly Report data
 * @param {Object} options
 * @param {string} options.month - Target month as YYYY-MM (default: current month)
 * @returns {Object} Report data with milestones, accomplishments, stoplights
 */
function getSTMonthlyReport(options) {
  options = options || {};
  var reportMonth = options.month || getCurrentMonth_ST_();

  // Validate month format (YYYY-MM)
  if (typeof reportMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(reportMonth)) {
    return {
      milestones: [], accomplishments: [], stoplights: [], attentionCount: 0,
      generated: new Date().toISOString(), reportMonth: reportMonth,
      reportMonthDisplay: '', dataSources: {},
      error: 'Invalid month format. Expected YYYY-MM (e.g., 2026-02)'
    };
  }

  try {
    var range = getMonthDateRange_ST_(reportMonth);

    // Load all data sources once
    var allMilestones = getAllMilestones();
    var allSolutions = getAllSolutions();
    var allEvents = getAllEvents();
    var allStories = getAllStories();
    var allUpdates = getAllUpdates(null, 120);
    var allActions = getOpenActions();

    Logger.log('ST Report: Loaded ' + allMilestones.length + ' milestones, ' + allSolutions.length + ' solutions, ' + allEvents.length + ' events, ' + allStories.length + ' stories, ' + allUpdates.length + ' updates, ' + allActions.length + ' actions');

    var milestones = getSTMilestones_(range, allMilestones, allSolutions);
    var accomplishments = getSTAccomplishments_(range, allMilestones, allEvents, allStories, allUpdates, allSolutions);
    var stoplights = getSTStoplights_(allSolutions, allMilestones, allActions, allUpdates);

    // Count items needing attention
    var attentionCount = 0;
    milestones.forEach(function(m) { if (m.attention) attentionCount++; });

    Logger.log('ST Report: Generated ' + milestones.length + ' milestones (' + attentionCount + ' need attention), ' + accomplishments.length + ' accomplishments, ' + stoplights.length + ' stoplights');

    var result = {
      milestones: milestones,
      accomplishments: accomplishments,
      stoplights: stoplights,
      attentionCount: attentionCount,
      generated: new Date().toISOString(),
      reportMonth: reportMonth,
      reportMonthDisplay: formatMonthDisplay_ST_(reportMonth),
      dataSources: {
        'MO-DB_Milestones': allMilestones.length + ' milestones',
        'MO-DB_Solutions': allSolutions.length + ' solutions',
        'MO-DB_Outreach': allEvents.length + ' events',
        'MO-DB_Stories': allStories.length + ' stories',
        'MO-DB_Updates': allUpdates.length + ' updates',
        'MO-DB_Actions': allActions.length + ' actions'
      }
    };

    var serialized = JSON.stringify(result);
    Logger.log('ST Report: Response size = ' + serialized.length + ' chars (~' + Math.round(serialized.length / 1024) + ' KB)');
    return JSON.parse(serialized);

  } catch (e) {
    Logger.log('Error generating ST Monthly Report: ' + e.message + '\n' + e.stack);
    return {
      milestones: [],
      accomplishments: [],
      stoplights: [],
      generated: new Date().toISOString(),
      reportMonth: reportMonth,
      reportMonthDisplay: formatMonthDisplay_ST_(reportMonth),
      dataSources: {},
      error: e.message
    };
  }
}

// ============================================================================
// SECTION 1: MILESTONES
// ============================================================================

/**
 * Get milestones for ST Reporting
 * Pulls from MO-DB_Milestones + solution decision gate dates
 * Window: 1 month before report month through 2 months after
 */
function getSTMilestones_(range, allMilestones, allSolutions) {
  var windowStart = new Date(range.start);
  windowStart.setMonth(windowStart.getMonth() - 1);
  var windowEnd = new Date(range.end);
  windowEnd.setMonth(windowEnd.getMonth() + 2);

  var items = [];
  var seen = {};

  // Source A: MO-DB_Milestones
  allMilestones.forEach(function(m) {
    var targetDate = parseDate_ST_(m.target_date);
    var actualDate = parseDate_ST_(m.actual_date);
    var relevantDate = actualDate || targetDate;

    if (!relevantDate) return;
    if (relevantDate < windowStart || relevantDate > windowEnd) return;

    var solutionName = findSolutionName_ST_(m.solution_id, allSolutions);
    var title = solutionName + ' ' + (m.type || m.milestone_type || '');
    var dedupeKey = (m.solution_id || '').toLowerCase() + '|' + (m.type || m.milestone_type || '').toLowerCase();
    seen[dedupeKey] = true;

    var msStatus = mapMilestoneStatus_ST_(m, relevantDate);
    items.push({
      start_date: formatDateISO_ST_(relevantDate),
      end_date: formatDateISO_ST_(relevantDate),
      title: title.trim(),
      additional_info: m.notes || ('Cycle ' + (m.cycle || '')),
      status: msStatus,
      is_event: false,
      source: 'MO-DB_Milestones',
      solution_id: m.solution_id || '',
      attention: getAttention_ST_(m, msStatus)
    });
  });

  // Source B: Solution decision gate dates (fill gaps not in MO-DB_Milestones)
  var gateColumns = [
    { field: 'milestone_atp_date', type: 'ATP DG', memo: 'milestone_atp_memo_date' },
    { field: 'milestone_f2i_date', type: 'F2I DG', memo: 'milestone_f2i_memo_date' },
    { field: 'milestone_orr_date', type: 'ORR', memo: 'milestone_orr_memo_date' },
    { field: 'milestone_closeout_date', type: 'Closeout', memo: 'milestone_closeout_memo_date' },
    { field: 'milestone_deep_dive_date', type: 'Deep Dive', memo: null }
  ];

  allSolutions.forEach(function(sol) {
    gateColumns.forEach(function(gate) {
      var dateVal = parseDate_ST_(sol[gate.field]);
      if (!dateVal) return;
      if (dateVal < windowStart || dateVal > windowEnd) return;

      var dedupeKey = (sol.solution_id || '').toLowerCase() + '|' + gate.type.toLowerCase();
      if (seen[dedupeKey]) return;

      var hasMemo = gate.memo && sol[gate.memo];
      var gateStatus = hasMemo ? 'Actual' : (dateVal < new Date() ? 'Actual' : 'Planned');
      // Build synthetic milestone for attention check
      var gateMilestone = {
        actual_date: hasMemo ? sol[gate.field] : null,
        target_date: sol[gate.field]
      };

      items.push({
        start_date: formatDateISO_ST_(dateVal),
        end_date: formatDateISO_ST_(dateVal),
        title: (sol.core_official_name || sol.solution_id) + ' ' + gate.type,
        additional_info: 'Cycle ' + (sol.core_cycle || ''),
        status: gateStatus,
        is_event: gate.type === 'Deep Dive',
        source: 'MO-DB_Solutions',
        solution_id: sol.solution_id || '',
        attention: getAttention_ST_(gateMilestone, gateStatus)
      });
    });
  });

  // Sort by date ascending
  items.sort(function(a, b) {
    return new Date(a.start_date) - new Date(b.start_date);
  });

  return items;
}

/**
 * Map milestone status to ST Reporting values
 */
function mapMilestoneStatus_ST_(milestone, relevantDate) {
  if (milestone.status === 'completed' || milestone.actual_date) return 'Actual';
  if (relevantDate && relevantDate < new Date()) return 'Actual';
  return 'Planned';
}

/**
 * Determine if a milestone needs attention in SharePoint
 * Returns an attention tag or null. Tags indicate the item likely needs
 * an update in the external ST Reporting system.
 * @param {Object} milestone - Raw milestone data
 * @param {string} status - Mapped status (Planned/Actual)
 * @returns {string|null} Attention tag
 */
function getAttention_ST_(milestone, status) {
  var today = new Date();
  var sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  var thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  var actualDate = parseDate_ST_(milestone.actual_date);
  var targetDate = parseDate_ST_(milestone.target_date);

  // Recently completed: actual_date set within last 60 days
  // User needs to flip SharePoint status from Planned → Actual
  if (actualDate && actualDate >= sixtyDaysAgo && actualDate <= today) {
    return 'RECENTLY COMPLETED';
  }

  // Overdue: past target_date, not completed
  // User may need to reschedule in SharePoint
  if (status !== 'Actual' && targetDate && targetDate < today) {
    return 'OVERDUE';
  }

  // Upcoming: target_date within next 30 days, not yet completed
  // Heads up — this will need attention soon
  if (status !== 'Actual' && targetDate && targetDate >= today && targetDate <= thirtyDaysFromNow) {
    return 'UPCOMING';
  }

  return null;
}

// ============================================================================
// SECTION 2: ACCOMPLISHMENTS
// ============================================================================

/**
 * Get accomplishments for ST Reporting
 * Aggregates: completed milestones, attended events, published stories, notable updates
 */
function getSTAccomplishments_(range, allMilestones, allEvents, allStories, allUpdates, allSolutions) {
  var items = [];

  // Source A: Completed milestones in report month
  allMilestones.forEach(function(m) {
    if (m.status !== 'completed') return;
    var completionDate = parseDate_ST_(m.actual_date || m.target_date);
    if (!completionDate) return;
    if (!isInRange_ST_(completionDate, range)) return;

    items.push({
      date: formatDateISO_ST_(completionDate),
      title: findSolutionName_ST_(m.solution_id, allSolutions) + ' ' + (m.type || m.milestone_type || '') + ' Completed',
      additional_info: m.notes || '',
      source: 'Milestone'
    });
  });

  // Source B: Attended/completed events in report month
  allEvents.forEach(function(e) {
    var eventStatus = (e.status || '').toLowerCase();
    if (eventStatus !== 'attended' && eventStatus !== 'completed') return;
    var eventDate = parseDate_ST_(e.start_date);
    if (!eventDate) return;
    if (!isInRange_ST_(eventDate, range)) return;

    items.push({
      date: formatDateISO_ST_(eventDate),
      title: e.name || 'Event',
      additional_info: [e.event_type || '', e.description || ''].filter(Boolean).join(' - '),
      source: 'Event'
    });
  });

  // Source C: Published stories in report month
  allStories.forEach(function(s) {
    var storyStatus = (s.status || '').toLowerCase();
    if (storyStatus !== 'published') return;
    var pubDate = parseDate_ST_(s.publish_date);
    if (!pubDate) return;
    if (!isInRange_ST_(pubDate, range)) return;

    items.push({
      date: formatDateISO_ST_(pubDate),
      title: s.title || 'Story Published',
      additional_info: s.summary || '',
      source: 'Story'
    });
  });

  // Source D: Notable updates in report month (keyword-filtered)
  var significancePattern = /\b(decision|approved|launched|completed|signed|released|delivered|awarded|partnered|milestone|inaugural|first|new\s+partnership|memorandum|agreement)\b/i;

  allUpdates.forEach(function(u) {
    var updateDate = parseDate_ST_(u.meeting_date);
    if (!updateDate) return;
    if (!isInRange_ST_(updateDate, range)) return;

    var text = u.update_text || '';
    if (!significancePattern.test(text)) return;

    items.push({
      date: formatDateISO_ST_(updateDate),
      title: (u.solution_id || 'Update') + ' - Notable Update',
      additional_info: text.length > 200 ? text.substring(0, 200) + '...' : text,
      source: 'Update'
    });
  });

  // Deduplicate by title similarity
  var uniqueItems = [];
  var seenTitles = {};
  items.forEach(function(item) {
    var key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seenTitles[key]) {
      seenTitles[key] = true;
      uniqueItems.push(item);
    }
  });

  // Sort by date ascending
  uniqueItems.sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });

  return uniqueItems;
}

// ============================================================================
// SECTION 3: STOPLIGHTS (RAG)
// ============================================================================

/**
 * Derive RAG stoplight status for each active solution
 */
function getSTStoplights_(allSolutions, allMilestones, allActions, allUpdates) {
  var items = [];
  var today = new Date();

  // Index milestones, actions, updates by solution_id for fast lookup
  var milestonesBySolution = indexBySolution_ST_(allMilestones);
  var actionsBySolution = indexBySolution_ST_(allActions);
  var updatesBySolution = indexBySolution_ST_(allUpdates);

  allSolutions.forEach(function(sol) {
    var phase = (sol.admin_lifecycle_phase || '').toLowerCase();
    // Skip archived/closeout solutions
    if (phase === 'closeout' || phase === 'archived' || phase === 'close-out') return;
    // Skip solutions not default in dashboard
    if (sol.admin_default_in_dashboard && sol.admin_default_in_dashboard !== 'Y') return;

    var solId = (sol.solution_id || '').toLowerCase();
    var solMilestones = milestonesBySolution[solId] || [];
    var solActions = actionsBySolution[solId] || [];
    var solUpdates = updatesBySolution[solId] || [];

    var flags = { red: [], yellow: [] };

    // Check overdue milestones
    var overdueMilestones = solMilestones.filter(function(m) {
      if (m.status === 'completed') return false;
      var target = parseDate_ST_(m.target_date);
      return target && target < today;
    });

    if (overdueMilestones.length >= 2) {
      flags.red.push(overdueMilestones.length + ' overdue milestones');
    } else if (overdueMilestones.length === 1) {
      flags.yellow.push('1 overdue milestone: ' + (overdueMilestones[0].type || overdueMilestones[0].milestone_type || ''));
    }

    // Check blocked actions
    var blockedActions = solActions.filter(function(a) {
      return (a.status || '').toLowerCase() === 'blocked';
    });
    var overdueActions = solActions.filter(function(a) {
      var dueDate = parseDate_ST_(a.due_date);
      return dueDate && dueDate < today && (a.status || '').toLowerCase() !== 'done';
    });

    if (blockedActions.length > 0) {
      flags.red.push(blockedActions.length + ' blocked action(s)');
    }
    if (overdueActions.length >= 2) {
      flags.yellow.push(overdueActions.length + ' overdue actions');
    }

    // Check update recency
    var latestUpdate = null;
    solUpdates.forEach(function(u) {
      var d = parseDate_ST_(u.meeting_date);
      if (d && (!latestUpdate || d > latestUpdate)) latestUpdate = d;
    });

    var daysSinceUpdate = latestUpdate
      ? Math.floor((today - latestUpdate) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceUpdate >= 90) {
      flags.red.push('No updates in ' + daysSinceUpdate + ' days');
    } else if (daysSinceUpdate >= 60) {
      flags.yellow.push('No updates in ' + daysSinceUpdate + ' days');
    }

    // Determine overall color
    var color = 'Green';
    var justification = [];

    if (flags.red.length > 0) {
      color = 'Red';
      justification = flags.red.concat(flags.yellow);
    } else if (flags.yellow.length > 0) {
      color = 'Yellow';
      justification = flags.yellow;
    } else {
      justification.push('On track');
    }

    items.push({
      solution_id: sol.solution_id || '',
      solution_name: sol.core_official_name || sol.solution_id || '',
      cycle: sol.core_cycle || '',
      phase: sol.admin_lifecycle_phase || '',
      color: color,
      justification: justification.join('; '),
      overdue_milestones: overdueMilestones.length,
      overdue_actions: overdueActions.length,
      blocked_actions: blockedActions.length,
      days_since_update: daysSinceUpdate === 999 ? -1 : daysSinceUpdate
    });
  });

  // Sort: Red first, Yellow, Green last; within same color sort by name
  var colorOrder = { 'Red': 0, 'Yellow': 1, 'Green': 2 };
  items.sort(function(a, b) {
    var colorDiff = (colorOrder[a.color] || 3) - (colorOrder[b.color] || 3);
    if (colorDiff !== 0) return colorDiff;
    return (a.solution_name || '').localeCompare(b.solution_name || '');
  });

  return items;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current month as YYYY-MM
 */
function getCurrentMonth_ST_() {
  var now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

/**
 * Get first and last day of a month
 * @param {string} monthStr - YYYY-MM format
 * @returns {Object} { start: Date, end: Date }
 */
function getMonthDateRange_ST_(monthStr) {
  var parts = monthStr.split('-');
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10) - 1;

  var start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);

  var end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start: start, end: end };
}

/**
 * Format month string for display
 */
function formatMonthDisplay_ST_(monthStr) {
  var parts = monthStr.split('-');
  var months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  var monthIdx = parseInt(parts[1], 10) - 1;
  return months[monthIdx] + ' ' + parts[0];
}

/**
 * Parse a date value (string or Date) into a Date object
 */
function parseDate_ST_(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  try {
    var d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

/**
 * Format Date as YYYY-MM-DD
 */
function formatDateISO_ST_(date) {
  if (!date) return '';
  try {
    var d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

/**
 * Check if a date falls within a range (inclusive)
 */
function isInRange_ST_(date, range) {
  return date >= range.start && date <= range.end;
}

/**
 * Find solution display name by solution_id
 */
function findSolutionName_ST_(solutionId, allSolutions) {
  if (!solutionId) return '';
  var id = String(solutionId).toLowerCase();
  for (var i = 0; i < allSolutions.length; i++) {
    if ((allSolutions[i].solution_id || '').toLowerCase() === id) {
      return allSolutions[i].core_official_name || allSolutions[i].solution_id;
    }
  }
  return solutionId;
}

/**
 * Index an array of objects by solution_id for fast lookup
 * @returns {Object} Map of lowercase solution_id to array of items
 */
function indexBySolution_ST_(items) {
  var index = {};
  items.forEach(function(item) {
    var key = (item.solution_id || '').toLowerCase();
    if (!key) return;
    if (!index[key]) index[key] = [];
    index[key].push(item);
  });
  return index;
}
