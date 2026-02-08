/**
 * MO-APIs Library - Engagements API
 * ==================================
 * Engagement logging and tracking for the Stakeholder Engagement Pipeline
 * Tracks all stakeholder interactions: emails, calls, meetings, etc.
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Uses shared utilities from config-helpers.gs:
// - loadSheetData_() for cached data loading
// - getSheetForWrite_(), findRowByField_() for write operations
// - filterByProperty(), countByField(), getById() for queries
// - deepCopy() for safe object copying

/**
 * Load all engagements into memory for fast querying
 * Uses shared loadSheetData_() with filtering and sorting
 */
function loadAllEngagements_() {
  var allData = loadSheetData_('ENGAGEMENTS_SHEET_ID', '_engagements');

  // Filter to only include records with engagement_id
  var filtered = allData.filter(function(e) { return e.engagement_id; });

  // Sort by date descending (most recent first)
  filtered.sort(function(a, b) {
    var dateA = a.date ? new Date(a.date) : new Date(0);
    var dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });

  return filtered;
}

/**
 * Clear engagements cache (call after mutations)
 */
function clearEngagementsCache_() {
  clearSheetDataCache('_engagements');
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
  'Workshop',
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

/**
 * Valid event status values
 */
var EVENT_STATUS_VALUES = [
  'Planning',
  'Confirmed',
  'Completed',
  'Postponed',
  'Cancelled'
];

/**
 * Valid artifact types for events
 */
var ARTIFACT_TYPES = [
  'presentation',
  'recording',
  'notes',
  'photos'
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
  var result;
  if (limit && limit > 0) {
    result = deepCopy(engagements.slice(0, limit));
  } else {
    result = deepCopy(engagements);
  }
  logResponseSize(result, 'getAllEngagements');
  return result;
}

/**
 * Get engagement by ID
 * @param {string} engagementId - Engagement ID
 * @returns {Object|null} Engagement record or null
 */
function getEngagementById(engagementId) {
  return getById(loadAllEngagements_(), 'engagement_id', engagementId);
}

/**
 * Validate engagement data before write
 * @param {Object} data - Engagement data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateEngagementData_(data) {
  var errors = [];

  // Required fields
  if (!data.subject || !String(data.subject).trim()) {
    errors.push('Subject is required');
  }

  if (!data.activity_type || !String(data.activity_type).trim()) {
    errors.push('Activity type is required');
  }

  // Primary solution is required
  if (!data.solution_id || !String(data.solution_id).trim()) {
    errors.push('Primary solution is required');
  }

  // Valid activity type
  if (data.activity_type && !ENGAGEMENT_ACTIVITY_TYPES.includes(data.activity_type)) {
    errors.push('Invalid activity type: ' + data.activity_type + '. Valid types: ' + ENGAGEMENT_ACTIVITY_TYPES.join(', '));
  }

  // Valid direction (if provided)
  if (data.direction && !ENGAGEMENT_DIRECTIONS.includes(data.direction)) {
    errors.push('Invalid direction: ' + data.direction + '. Valid directions: ' + ENGAGEMENT_DIRECTIONS.join(', '));
  }

  // Date format validation (if provided)
  if (data.date) {
    var dateStr = String(data.date);
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      errors.push('Invalid date format. Expected YYYY-MM-DD, got: ' + dateStr);
    }
  }

  // Summary length check (optional but good practice)
  if (data.summary && String(data.summary).length > 2000) {
    errors.push('Summary exceeds maximum length of 2000 characters');
  }

  return { valid: errors.length === 0, errors: errors };
}

/**
 * Create a new engagement
 * @param {Object} engagementData - Engagement data
 * @returns {Object} Result object {success: true, data: engagement} or {success: false, error: message}
 */
function createEngagement(engagementData) {
  try {
    // Validate input
    var validation = validateEngagementData_(engagementData);
    if (!validation.valid) {
      return { success: false, error: 'Validation failed: ' + validation.errors.join('; ') };
    }

    var sheetInfo = getSheetForWrite_('ENGAGEMENTS_SHEET_ID');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

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

    return { success: true, data: engagementData };
  } catch (error) {
    Logger.log('Error in createEngagement: ' + error);
    return { success: false, error: 'Failed to create engagement: ' + error.message };
  }
}

/**
 * Update an existing engagement
 * @param {string} engagementId - Engagement ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated engagement or null if not found
 */
function updateEngagement(engagementId, updates) {
  var sheetInfo = getSheetForWrite_('ENGAGEMENTS_SHEET_ID');
  var sheet = sheetInfo.sheet;
  var headers = sheetInfo.headers;

  // Find row using shared utility
  var rowIndex = findRowByField_(sheet, headers, 'engagement_id', engagementId);
  if (rowIndex === -1) {
    return null;
  }

  // Update cells (rowIndex is already 1-indexed)
  headers.forEach(function(header, colIndex) {
    if (updates.hasOwnProperty(header) && header !== 'engagement_id' && header !== 'created_at') {
      sheet.getRange(rowIndex, colIndex + 1).setValue(updates[header]);
    }
  });

  clearEngagementsCache_();

  return getEngagementById(engagementId);
}

/**
 * Delete an engagement
 * @param {string} engagementId - Engagement ID to delete
 * @returns {Object} Success status object
 */
function deleteEngagement(engagementId) {
  var sheetInfo = getSheetForWrite_('ENGAGEMENTS_SHEET_ID');
  var sheet = sheetInfo.sheet;
  var headers = sheetInfo.headers;

  // Find row using shared utility
  var rowIndex = findRowByField_(sheet, headers, 'engagement_id', engagementId);
  if (rowIndex === -1) {
    return createResult(false, null, 'Engagement not found');
  }

  sheet.deleteRow(rowIndex);
  clearEngagementsCache_();
  return createResult(true);
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
      if (ids.includes(contactId)) return true;
    }
    // Check participants field (comma-separated emails)
    if (e.participants) {
      var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
      if (participants.includes(contactId.toLowerCase())) return true;
    }
    return false;
  });
  return deepCopy(results);
}

/**
 * Get engagements for a specific agency
 * @param {string} agencyId - Agency ID
 * @returns {Array} Engagements involving this agency
 */
function getEngagementsByAgency(agencyId) {
  return filterByProperty(loadAllEngagements_(), 'agency_id', agencyId, true);
}

/**
 * Get engagements for a specific solution
 * Searches across primary (solution_id), secondary (secondary_solution_id),
 * and additional (additional_solution_ids) solution fields
 * @param {string} solutionId - Solution ID or name
 * @returns {Array} Engagements involving this solution
 */
function getEngagementsBySolution(solutionId) {
  var engagements = loadAllEngagements_();
  var results = engagements.filter(function(e) {
    // Check primary solution
    if (e.solution_id === solutionId) {
      return true;
    }
    // Check secondary solution
    if (e.secondary_solution_id === solutionId) {
      return true;
    }
    // Check additional solutions (comma-separated)
    if (e.additional_solution_ids) {
      var additionalIds = e.additional_solution_ids.split(',').map(function(id) { return id.trim(); });
      if (additionalIds.includes(solutionId)) {
        return true;
      }
    }
    return false;
  });
  return deepCopy(results);
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
  return filterByProperty(loadAllEngagements_(), 'activity_type', activityType, true);
}

/**
 * Get engagements by touchpoint reference
 * @param {string} touchpoint - Touchpoint (T4, W1, W2, T5, T6, T7, T8)
 * @returns {Array} Engagements for this touchpoint
 */
function getEngagementsByTouchpoint(touchpoint) {
  return filterByProperty(loadAllEngagements_(), 'touchpoint_reference', touchpoint, true);
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
  return deepCopy(results);
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

  return deepCopy(results.slice(0, limit));
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

  return deepCopy(results);
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

  return deepCopy(results);
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

  // Use shared utilities for simple counting
  var byType = countByField(engagements, 'activity_type');
  var byDirection = countByField(engagements, 'direction');
  var byTouchpoint = countByField(engagements, 'touchpoint_reference');

  // Month counting needs date substring extraction (keep custom)
  var byMonth = {};
  engagements.forEach(function(e) {
    if (e.date) {
      var monthKey = e.date.substring(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }
  });

  // Get unique contacts/agencies involved (comma-separated fields need custom logic)
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
 * Get SEP dashboard statistics (for the main SEP dashboard view)
 * Returns stats for current month and heat level indicator
 * @returns {Object} Dashboard statistics
 */
function getSEPDashboardStats() {
  var engagements = loadAllEngagements_();

  // Calculate date ranges
  var now = new Date();
  var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  var oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  var twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Filter engagements for this month
  var thisMonthEngagements = engagements.filter(function(e) {
    return e.date && new Date(e.date) >= firstOfMonth;
  });

  // Count unique contacts this month (from participants field)
  var uniqueContacts = {};
  thisMonthEngagements.forEach(function(e) {
    if (e.participants) {
      e.participants.split(',').forEach(function(p) {
        var email = p.trim().toLowerCase();
        if (email) uniqueContacts[email] = true;
      });
    }
  });

  // Count unique solutions this month (from primary, secondary, and additional solution fields)
  var uniqueSolutions = {};
  thisMonthEngagements.forEach(function(e) {
    if (e.solution_id) {
      uniqueSolutions[e.solution_id] = true;
    }
    if (e.secondary_solution_id) {
      uniqueSolutions[e.secondary_solution_id] = true;
    }
    if (e.additional_solution_ids) {
      e.additional_solution_ids.split(',').forEach(function(id) {
        var trimmed = id.trim();
        if (trimmed) uniqueSolutions[trimmed] = true;
      });
    }
  });

  // Calculate heat level based on recent activity
  // Hot: 5+ engagements in past week
  // Warm: 3-4 engagements in past week OR 5+ in past 2 weeks
  // Cold: Less than that
  var lastWeekCount = engagements.filter(function(e) {
    return e.date && new Date(e.date) >= oneWeekAgo;
  }).length;

  var lastTwoWeeksCount = engagements.filter(function(e) {
    return e.date && new Date(e.date) >= twoWeeksAgo;
  }).length;

  var heatLevel = 'cold';
  var heatIcon = 'ac_unit';
  if (lastWeekCount >= 5) {
    heatLevel = 'hot';
    heatIcon = 'whatshot';
  } else if (lastWeekCount >= 3 || lastTwoWeeksCount >= 5) {
    heatLevel = 'warm';
    heatIcon = 'wb_sunny';
  }

  return {
    engagements_this_month: thisMonthEngagements.length,
    contacts_this_month: Object.keys(uniqueContacts).length,
    solutions_this_month: Object.keys(uniqueSolutions).length,
    heat_level: heatLevel,
    heat_icon: heatIcon,
    last_week_count: lastWeekCount,
    last_two_weeks_count: lastTwoWeeksCount
  };
}

/**
 * Get engagement activity by person (who logged the most)
 * @param {number} limit - Max results
 * @returns {Array} Top loggers
 */
function getEngagementsByLogger(limit) {
  limit = limit || 10;

  // Use shared utility for counting
  var byLogger = countByField(loadAllEngagements_(), 'logged_by');

  var results = Object.keys(byLogger).map(function(logger) {
    return { logged_by: logger, count: byLogger[logger] };
  });

  results.sort(function(a, b) {
    return b.count - a.count;
  });

  return results.slice(0, limit);
}

/**
 * Get engagement counts grouped by agency
 * Used for agency tree heat indicators
 * Counts engagements via contact participants (not direct agency_id field)
 * @returns {Object} Map of agency_id to engagement count
 */
function getEngagementCountsByAgency() {
  var engagements = loadAllEngagements_();

  // Get all contacts to map emails to agencies
  var contacts = getAllContacts();
  var emailToAgency = {};
  contacts.forEach(function(c) {
    if (c.email && c.agency_id) {
      emailToAgency[c.email.toLowerCase()] = c.agency_id;
    }
  });

  // Count engagements per agency based on participant emails
  var countsByAgency = {};
  engagements.forEach(function(e) {
    if (e.participants) {
      var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
      var agenciesCounted = {}; // Avoid double-counting same engagement for same agency

      participants.forEach(function(email) {
        var agencyId = emailToAgency[email];
        if (agencyId && !agenciesCounted[agencyId]) {
          agenciesCounted[agencyId] = true;
          countsByAgency[agencyId] = (countsByAgency[agencyId] || 0) + 1;
        }
      });
    }
  });

  return countsByAgency;
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
    logged_by: params.logged_by || 'manual'
  });
}

// ============================================================================
// EVENT-SPECIFIC QUERIES
// ============================================================================

/**
 * Check if an engagement is an event (has event_date)
 * @param {Object} engagement - Engagement record
 * @returns {boolean} True if this is an event
 */
function isEvent_(engagement) {
  return engagement && engagement.event_date;
}

/**
 * Get all events (engagements with event_date)
 * @param {number} limit - Optional max results
 * @returns {Array} Events sorted by event_date descending
 */
function getAllEvents(limit) {
  var engagements = loadAllEngagements_();
  var events = engagements.filter(function(e) {
    return isEvent_(e);
  });

  // Sort by event_date descending (most recent first)
  events.sort(function(a, b) {
    var dateA = a.event_date ? new Date(a.event_date) : new Date(0);
    var dateB = b.event_date ? new Date(b.event_date) : new Date(0);
    return dateB - dateA;
  });

  if (limit && limit > 0) {
    return deepCopy(events.slice(0, limit));
  }
  return deepCopy(events);
}

/**
 * Get events for a specific solution
 * @param {string} solutionId - Solution ID
 * @returns {Array} Events for this solution, sorted by event_date desc
 */
function getEventsForSolution(solutionId) {
  var engagements = loadAllEngagements_();
  var events = engagements.filter(function(e) {
    if (!isEvent_(e)) return false;
    // Check primary, secondary, and additional solution IDs
    if (e.solution_id === solutionId) return true;
    if (e.secondary_solution_id === solutionId) return true;
    if (e.additional_solution_ids) {
      var additionalIds = e.additional_solution_ids.split(',').map(function(id) { return id.trim(); });
      if (additionalIds.includes(solutionId)) return true;
    }
    return false;
  });

  // Sort by event_date descending
  events.sort(function(a, b) {
    var dateA = a.event_date ? new Date(a.event_date) : new Date(0);
    var dateB = b.event_date ? new Date(b.event_date) : new Date(0);
    return dateB - dateA;
  });

  return deepCopy(events);
}

/**
 * Get upcoming events (event_date >= today)
 * @param {number} limit - Optional max results
 * @returns {Array} Upcoming events sorted by event_date ascending
 */
function getUpcomingEvents(limit) {
  var engagements = loadAllEngagements_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var events = engagements.filter(function(e) {
    if (!isEvent_(e)) return false;
    var eventDate = new Date(e.event_date);
    return eventDate >= today;
  });

  // Sort by event_date ascending (soonest first)
  events.sort(function(a, b) {
    var dateA = new Date(a.event_date);
    var dateB = new Date(b.event_date);
    return dateA - dateB;
  });

  if (limit && limit > 0) {
    return deepCopy(events.slice(0, limit));
  }
  return deepCopy(events);
}

/**
 * Get events where a contact is an attendee
 * @param {string} contactId - Contact ID to search for in event_attendee_ids
 * @returns {Array} Events this contact attended/will attend
 */
function getEventsForContact(contactId) {
  var engagements = loadAllEngagements_();
  var events = engagements.filter(function(e) {
    if (!isEvent_(e)) return false;
    if (!e.event_attendee_ids) return false;
    var attendeeIds = e.event_attendee_ids.split(',').map(function(id) { return id.trim(); });
    return attendeeIds.includes(contactId);
  });

  // Sort by event_date descending
  events.sort(function(a, b) {
    var dateA = a.event_date ? new Date(a.event_date) : new Date(0);
    var dateB = b.event_date ? new Date(b.event_date) : new Date(0);
    return dateB - dateA;
  });

  return deepCopy(events);
}

/**
 * Get events by status
 * @param {string} status - Event status (Planning, Confirmed, Completed, Postponed, Cancelled)
 * @returns {Array} Events with this status
 */
function getEventsByStatus(status) {
  var engagements = loadAllEngagements_();
  var events = engagements.filter(function(e) {
    return isEvent_(e) && e.event_status === status;
  });
  return deepCopy(events);
}

// ============================================================================
// EVENT ARTIFACT MANAGEMENT
// ============================================================================

/**
 * Parse artifacts JSON from engagement
 * @private
 * @param {Object} engagement - Engagement record
 * @returns {Array} Parsed artifacts array or empty array
 */
function parseArtifacts_(engagement) {
  if (!engagement || !engagement.event_artifacts) {
    return [];
  }
  try {
    var artifacts = JSON.parse(engagement.event_artifacts);
    return Array.isArray(artifacts) ? artifacts : [];
  } catch (e) {
    Logger.log('Error parsing artifacts for engagement ' + engagement.engagement_id + ': ' + e.message);
    return [];
  }
}

/**
 * Validate artifact data
 * @private
 * @param {Object} artifact - Artifact to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateArtifact_(artifact) {
  var errors = [];

  if (!artifact.type) {
    errors.push('Artifact type is required');
  } else if (!ARTIFACT_TYPES.includes(artifact.type)) {
    errors.push('Invalid artifact type: ' + artifact.type + '. Valid types: ' + ARTIFACT_TYPES.join(', '));
  }

  if (!artifact.name || !String(artifact.name).trim()) {
    errors.push('Artifact name is required');
  }

  if (!artifact.url || !String(artifact.url).trim()) {
    errors.push('Artifact URL is required');
  }

  return { valid: errors.length === 0, errors: errors };
}

/**
 * Add an artifact to an event
 * @param {string} engagementId - Engagement ID
 * @param {Object} artifact - Artifact to add {type, name, url}
 * @returns {Object} Result with success/error and updated artifacts
 */
function addArtifact(engagementId, artifact) {
  try {
    // Validate artifact
    var validation = validateArtifact_(artifact);
    if (!validation.valid) {
      return { success: false, error: 'Validation failed: ' + validation.errors.join('; ') };
    }

    // Get existing engagement
    var engagement = getEngagementById(engagementId);
    if (!engagement) {
      return { success: false, error: 'Engagement not found: ' + engagementId };
    }

    if (!isEvent_(engagement)) {
      return { success: false, error: 'This engagement is not an event (no event_date)' };
    }

    // Parse existing artifacts and add new one
    var artifacts = parseArtifacts_(engagement);
    artifacts.push({
      type: artifact.type,
      name: artifact.name.trim(),
      url: artifact.url.trim(),
      comms_asset_id: artifact.comms_asset_id || ''
    });

    // Update engagement
    var updated = updateEngagement(engagementId, {
      event_artifacts: JSON.stringify(artifacts)
    });

    if (!updated) {
      return { success: false, error: 'Failed to update engagement' };
    }

    clearEngagementsCache_();
    return { success: true, data: { artifacts: artifacts, engagement: updated } };
  } catch (e) {
    Logger.log('Error in addArtifact: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Remove an artifact from an event
 * @param {string} engagementId - Engagement ID
 * @param {number} artifactIndex - Index of artifact to remove
 * @returns {Object} Result with success/error and updated artifacts
 */
function removeArtifact(engagementId, artifactIndex) {
  try {
    // Get existing engagement
    var engagement = getEngagementById(engagementId);
    if (!engagement) {
      return { success: false, error: 'Engagement not found: ' + engagementId };
    }

    var artifacts = parseArtifacts_(engagement);

    if (artifactIndex < 0 || artifactIndex >= artifacts.length) {
      return { success: false, error: 'Invalid artifact index: ' + artifactIndex };
    }

    // Remove artifact at index
    artifacts.splice(artifactIndex, 1);

    // Update engagement
    var updated = updateEngagement(engagementId, {
      event_artifacts: JSON.stringify(artifacts)
    });

    if (!updated) {
      return { success: false, error: 'Failed to update engagement' };
    }

    clearEngagementsCache_();
    return { success: true, data: { artifacts: artifacts, engagement: updated } };
  } catch (e) {
    Logger.log('Error in removeArtifact: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Update an artifact's comms_asset_id after promotion
 * @param {string} engagementId - Engagement ID
 * @param {number} artifactIndex - Index of artifact to update
 * @param {string} commsAssetId - ID of the created CommsAsset
 * @returns {Object} Result with success/error
 */
function updateArtifactCommsAssetId(engagementId, artifactIndex, commsAssetId) {
  try {
    var engagement = getEngagementById(engagementId);
    if (!engagement) {
      return { success: false, error: 'Engagement not found: ' + engagementId };
    }

    var artifacts = parseArtifacts_(engagement);

    if (artifactIndex < 0 || artifactIndex >= artifacts.length) {
      return { success: false, error: 'Invalid artifact index: ' + artifactIndex };
    }

    // Update the comms_asset_id
    artifacts[artifactIndex].comms_asset_id = commsAssetId;

    // Update engagement
    var updated = updateEngagement(engagementId, {
      event_artifacts: JSON.stringify(artifacts)
    });

    if (!updated) {
      return { success: false, error: 'Failed to update engagement' };
    }

    clearEngagementsCache_();
    return { success: true, data: { artifact: artifacts[artifactIndex] } };
  } catch (e) {
    Logger.log('Error in updateArtifactCommsAssetId: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get artifacts for an event
 * @param {string} engagementId - Engagement ID
 * @returns {Array} Artifacts array or empty array if not found
 */
function getArtifacts(engagementId) {
  var engagement = getEngagementById(engagementId);
  if (!engagement) {
    return [];
  }
  return parseArtifacts_(engagement);
}

/**
 * Get event status options for UI dropdowns
 * @returns {Array} Event status options
 */
function getEventStatusOptions() {
  return EVENT_STATUS_VALUES.slice();
}

/**
 * Get artifact type options for UI dropdowns
 * @returns {Array} Artifact type options
 */
function getArtifactTypeOptions() {
  return ARTIFACT_TYPES.slice();
}

// ============================================================================
// SEP PAGE COMBINED INIT (Performance Optimization)
// ============================================================================

/**
 * Get all data needed for SEP page initialization in a single call
 * Reduces 9 separate API calls to 1 combined call
 * @returns {Object} Combined SEP init data
 */
function getSEPInitData() {
  try {
    var result = {
      dashboardStats: null,
      solutionsByMilestone: {},
      solutions: [],
      cycles: [],
      needsOutreach: [],
      agencyHierarchy: [],
      agencyEngagementCounts: {},
      recentEngagements: []
    };

    // Load dashboard stats
    try {
      result.dashboardStats = getSEPDashboardStats();
    } catch (e) {
      Logger.log('getSEPInitData - dashboardStats error: ' + e.message);
    }

    // Load solutions grouped by milestone
    try {
      result.solutionsByMilestone = getSolutionsBySEPMilestone();
    } catch (e) {
      Logger.log('getSEPInitData - solutionsByMilestone error: ' + e.message);
    }

    // Load full solutions list
    try {
      var allSolutions = getAllSolutions();
      result.solutions = allSolutions.filter(function(s) { return s && s.solution_id; });
    } catch (e) {
      Logger.log('getSEPInitData - solutions error: ' + e.message);
    }

    // Load SEP cycles
    try {
      result.cycles = getSEPCycles();
    } catch (e) {
      Logger.log('getSEPInitData - cycles error: ' + e.message);
    }

    // Load solutions needing outreach
    try {
      result.needsOutreach = getSolutionsNeedingOutreach(2);
    } catch (e) {
      Logger.log('getSEPInitData - needsOutreach error: ' + e.message);
    }

    // Load agency hierarchy
    try {
      result.agencyHierarchy = getAgencyHierarchy();
    } catch (e) {
      Logger.log('getSEPInitData - agencyHierarchy error: ' + e.message);
    }

    // Load agency engagement counts
    try {
      result.agencyEngagementCounts = getEngagementCountsByAgency();
    } catch (e) {
      Logger.log('getSEPInitData - agencyEngagementCounts error: ' + e.message);
    }

    // Load recent engagements
    try {
      result.recentEngagements = getRecentEngagements(30, 10);
    } catch (e) {
      Logger.log('getSEPInitData - recentEngagements error: ' + e.message);
    }

    // Log response size for monitoring
    logResponseSize(result, 'getSEPInitData');

    return result;
  } catch (error) {
    Logger.log('getSEPInitData error: ' + error.message);
    return {
      dashboardStats: null,
      solutionsByMilestone: {},
      solutions: [],
      cycles: [],
      needsOutreach: [],
      agencyHierarchy: [],
      agencyEngagementCounts: {},
      recentEngagements: [],
      error: error.message
    };
  }
}
