/**
 * Engagements API - SEP-NSITE
 * ===========================
 * Engagement logging and tracking for the Stakeholder Engagement Pipeline
 * Tracks all stakeholder interactions: emails, calls, meetings, etc.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Engagements sheet
 * Reads ENGAGEMENTS_SHEET_ID from MO-DB_Config
 */
function getEngagementsSheet_() {
  var sheetId = getConfigValue('ENGAGEMENTS_SHEET_ID');
  if (!sheetId) {
    throw new Error('ENGAGEMENTS_SHEET_ID not configured in MO-DB_Config');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for engagements data (refreshed per execution)
 */
var _engagementsCache = null;

/**
 * Load all engagements into memory for fast querying
 */
function loadAllEngagements_() {
  if (_engagementsCache !== null) {
    return _engagementsCache;
  }

  var sheet = getEngagementsSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _engagementsCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var engagement = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      if (value instanceof Date) {
        engagement[header] = value.toISOString();
      } else {
        engagement[header] = value;
      }
    });
    // Only include records with engagement_id
    if (engagement.engagement_id) {
      _engagementsCache.push(engagement);
    }
  }

  // Sort by date descending (most recent first)
  _engagementsCache.sort(function(a, b) {
    var dateA = a.date ? new Date(a.date) : new Date(0);
    var dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });

  return _engagementsCache;
}

/**
 * Clear engagements cache (call after mutations)
 */
function clearEngagementsCache_() {
  _engagementsCache = null;
}

// ============================================================================
// ACTIVITY TYPE CONSTANTS
// ============================================================================

/**
 * Valid activity types for engagements
 */
var ENGAGEMENT_ACTIVITY_TYPES = [
  'Email',
  'Phone',
  'Meeting',
  'Webinar',
  'Conference',
  'Site Visit',
  'Training'
];

/**
 * Valid direction values
 */
var ENGAGEMENT_DIRECTIONS = [
  'Outbound',
  'Inbound',
  'Bidirectional'
];

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Get all engagements
 * @param {number} limit - Optional max results
 * @returns {Array} All engagement records
 */
function getAllEngagements(limit) {
  var engagements = loadAllEngagements_();
  if (limit && limit > 0) {
    return JSON.parse(JSON.stringify(engagements.slice(0, limit)));
  }
  return JSON.parse(JSON.stringify(engagements));
}

/**
 * Get engagement by ID
 * @param {string} engagementId - Engagement ID
 * @returns {Object|null} Engagement record or null
 */
function getEngagementById(engagementId) {
  var engagements = loadAllEngagements_();
  var engagement = engagements.find(function(e) {
    return e.engagement_id === engagementId;
  });
  return engagement ? JSON.parse(JSON.stringify(engagement)) : null;
}

/**
 * Create a new engagement
 * @param {Object} engagementData - Engagement data
 * @returns {Object} Created engagement with ID
 */
function createEngagement(engagementData) {
  var sheet = getEngagementsSheet_();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Generate engagement_id if not provided
  if (!engagementData.engagement_id) {
    engagementData.engagement_id = 'ENG_' + new Date().getTime();
  }

  // Set created_at timestamp
  engagementData.created_at = new Date().toISOString();

  // Default date to today if not provided
  if (!engagementData.date) {
    engagementData.date = new Date().toISOString().split('T')[0];
  }

  // Build row from headers
  var newRow = headers.map(function(header) {
    return engagementData[header] !== undefined ? engagementData[header] : '';
  });

  sheet.appendRow(newRow);
  clearEngagementsCache_();

  return engagementData;
}

/**
 * Update an existing engagement
 * @param {string} engagementId - Engagement ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated engagement or null if not found
 */
function updateEngagement(engagementId, updates) {
  var sheet = getEngagementsSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('engagement_id');
  if (idColIndex === -1) {
    throw new Error('engagement_id column not found');
  }

  // Find row to update
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === engagementId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return null;
  }

  // Update cells
  headers.forEach(function(header, colIndex) {
    if (updates.hasOwnProperty(header) && header !== 'engagement_id' && header !== 'created_at') {
      sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[header]);
    }
  });

  clearEngagementsCache_();

  return getEngagementById(engagementId);
}

/**
 * Delete an engagement
 * @param {string} engagementId - Engagement ID to delete
 * @returns {boolean} Success status
 */
function deleteEngagement(engagementId) {
  var sheet = getEngagementsSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('engagement_id');
  if (idColIndex === -1) {
    return false;
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === engagementId) {
      sheet.deleteRow(i + 1);
      clearEngagementsCache_();
      return true;
    }
  }

  return false;
}

// ============================================================================
// QUERY BY RELATIONSHIP
// ============================================================================

/**
 * Get engagements for a specific contact
 * @param {string} contactId - Contact ID or email
 * @returns {Array} Engagements involving this contact
 */
function getEngagementsByContact(contactId) {
  var engagements = loadAllEngagements_();
  var results = engagements.filter(function(e) {
    // Check contact_ids field (comma-separated)
    if (e.contact_ids) {
      var ids = e.contact_ids.split(',').map(function(id) { return id.trim(); });
      if (ids.indexOf(contactId) !== -1) return true;
    }
    // Check participants field (comma-separated emails)
    if (e.participants) {
      var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
      if (participants.indexOf(contactId.toLowerCase()) !== -1) return true;
    }
    return false;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get engagements for a specific agency
 * @param {string} agencyId - Agency ID
 * @returns {Array} Engagements involving this agency
 */
function getEngagementsByAgency(agencyId) {
  var engagements = loadAllEngagements_();
  var results = engagements.filter(function(e) {
    return e.agency_id === agencyId;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get engagements for a specific solution
 * @param {string} solutionId - Solution ID or name
 * @returns {Array} Engagements involving this solution
 */
function getEngagementsBySolution(solutionId) {
  var engagements = loadAllEngagements_();
  var results = engagements.filter(function(e) {
    if (e.solution_ids) {
      var ids = e.solution_ids.split(',').map(function(id) { return id.trim(); });
      return ids.indexOf(solutionId) !== -1;
    }
    return false;
  });
  return JSON.parse(JSON.stringify(results));
}

// ============================================================================
// QUERY BY ATTRIBUTES
// ============================================================================

/**
 * Get engagements by activity type
 * @param {string} activityType - Activity type (Email, Phone, Meeting, etc.)
 * @returns {Array} Matching engagements
 */
function getEngagementsByActivityType(activityType) {
  var engagements = loadAllEngagements_();
  var results = engagements.filter(function(e) {
    return e.activity_type && e.activity_type.toLowerCase() === activityType.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get engagements by touchpoint reference
 * @param {string} touchpoint - Touchpoint (T4, W1, W2, T5, T6, T7, T8)
 * @returns {Array} Engagements for this touchpoint
 */
function getEngagementsByTouchpoint(touchpoint) {
  var engagements = loadAllEngagements_();
  var results = engagements.filter(function(e) {
    return e.touchpoint_reference === touchpoint;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get engagements within a date range
 * @param {string} startDate - Start date (ISO string or YYYY-MM-DD)
 * @param {string} endDate - End date (ISO string or YYYY-MM-DD)
 * @returns {Array} Engagements within range
 */
function getEngagementsByDateRange(startDate, endDate) {
  var engagements = loadAllEngagements_();
  var start = new Date(startDate);
  var end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include full end day

  var results = engagements.filter(function(e) {
    if (!e.date) return false;
    var engDate = new Date(e.date);
    return engDate >= start && engDate <= end;
  });
  return JSON.parse(JSON.stringify(results));
}

// ============================================================================
// RECENT & UPCOMING QUERIES
// ============================================================================

/**
 * Get recent engagements
 * @param {number} days - Number of days to look back (default 30)
 * @param {number} limit - Max results (default 20)
 * @returns {Array} Recent engagements
 */
function getRecentEngagements(days, limit) {
  days = days || 30;
  limit = limit || 20;

  var engagements = loadAllEngagements_();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  var results = engagements.filter(function(e) {
    if (!e.date) return false;
    return new Date(e.date) >= cutoff;
  });

  return JSON.parse(JSON.stringify(results.slice(0, limit)));
}

/**
 * Get upcoming follow-ups
 * @param {number} days - Number of days to look ahead (default 14)
 * @returns {Array} Engagements with upcoming follow-up dates
 */
function getUpcomingFollowUps(days) {
  days = days || 14;

  var engagements = loadAllEngagements_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  var results = engagements.filter(function(e) {
    if (!e.follow_up_date) return false;
    var followUp = new Date(e.follow_up_date);
    return followUp >= today && followUp <= cutoff;
  });

  // Sort by follow_up_date ascending
  results.sort(function(a, b) {
    return new Date(a.follow_up_date) - new Date(b.follow_up_date);
  });

  return JSON.parse(JSON.stringify(results));
}

/**
 * Get overdue follow-ups
 * @returns {Array} Engagements with past follow-up dates
 */
function getOverdueFollowUps() {
  var engagements = loadAllEngagements_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var results = engagements.filter(function(e) {
    if (!e.follow_up_date) return false;
    var followUp = new Date(e.follow_up_date);
    return followUp < today;
  });

  // Sort by follow_up_date ascending (oldest first)
  results.sort(function(a, b) {
    return new Date(a.follow_up_date) - new Date(b.follow_up_date);
  });

  return JSON.parse(JSON.stringify(results));
}

// ============================================================================
// STATISTICS & AGGREGATION
// ============================================================================

/**
 * Get engagement statistics
 * @returns {Object} Summary statistics
 */
function getEngagementStats() {
  var engagements = loadAllEngagements_();

  var byType = {};
  var byDirection = {};
  var byTouchpoint = {};
  var byMonth = {};

  engagements.forEach(function(e) {
    if (e.activity_type) {
      byType[e.activity_type] = (byType[e.activity_type] || 0) + 1;
    }
    if (e.direction) {
      byDirection[e.direction] = (byDirection[e.direction] || 0) + 1;
    }
    if (e.touchpoint_reference) {
      byTouchpoint[e.touchpoint_reference] = (byTouchpoint[e.touchpoint_reference] || 0) + 1;
    }
    if (e.date) {
      var monthKey = e.date.substring(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }
  });

  // Get unique contacts/agencies involved
  var uniqueContacts = {};
  var uniqueAgencies = {};
  engagements.forEach(function(e) {
    if (e.participants) {
      e.participants.split(',').forEach(function(p) {
        uniqueContacts[p.trim().toLowerCase()] = true;
      });
    }
    if (e.agency_id) {
      uniqueAgencies[e.agency_id] = true;
    }
  });

  // Recent activity (last 30 days)
  var thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  var recentCount = engagements.filter(function(e) {
    return e.date && new Date(e.date) >= thirtyDaysAgo;
  }).length;

  // This week
  var weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  var thisWeekCount = engagements.filter(function(e) {
    return e.date && new Date(e.date) >= weekAgo;
  }).length;

  return {
    total_engagements: engagements.length,
    recent_30_days: recentCount,
    this_week: thisWeekCount,
    unique_contacts: Object.keys(uniqueContacts).length,
    unique_agencies: Object.keys(uniqueAgencies).length,
    by_activity_type: byType,
    by_direction: byDirection,
    by_touchpoint: byTouchpoint,
    by_month: byMonth,
    pending_follow_ups: getUpcomingFollowUps(14).length,
    overdue_follow_ups: getOverdueFollowUps().length
  };
}

/**
 * Get engagement activity by person (who logged the most)
 * @param {number} limit - Max results
 * @returns {Array} Top loggers
 */
function getEngagementsByLogger(limit) {
  limit = limit || 10;
  var engagements = loadAllEngagements_();

  var byLogger = {};
  engagements.forEach(function(e) {
    if (e.logged_by) {
      byLogger[e.logged_by] = (byLogger[e.logged_by] || 0) + 1;
    }
  });

  var results = Object.keys(byLogger).map(function(logger) {
    return { logged_by: logger, count: byLogger[logger] };
  });

  results.sort(function(a, b) {
    return b.count - a.count;
  });

  return results.slice(0, limit);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get activity type options for UI dropdowns
 * @returns {Array} Activity type options
 */
function getActivityTypeOptions() {
  return ENGAGEMENT_ACTIVITY_TYPES.slice();
}

/**
 * Get direction options for UI dropdowns
 * @returns {Array} Direction options
 */
function getDirectionOptions() {
  return ENGAGEMENT_DIRECTIONS.slice();
}

/**
 * Log a quick engagement (simplified creation)
 * @param {Object} params - Quick log parameters
 * @returns {Object} Created engagement
 */
function logQuickEngagement(params) {
  return createEngagement({
    date: params.date || new Date().toISOString().split('T')[0],
    activity_type: params.activity_type || 'Email',
    direction: params.direction || 'Outbound',
    subject: params.subject || '',
    participants: params.participants || '',
    contact_ids: params.contact_ids || '',
    agency_id: params.agency_id || '',
    summary: params.summary || '',
    logged_by: params.logged_by || Session.getEffectiveUser().getEmail()
  });
}
