/**
 * MO-APIs Library - Team API
 * ==========================
 * Query functions for Team-related data:
 * - Internal team members (from Contacts)
 * - Office availability/outages
 * - Office meetings
 * - Glossary terms
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 */

// ============================================================================
// INTERNAL TEAM (from Contacts where is_internal = TRUE)
// ============================================================================

/**
 * Cache for internal team data
 */
var _internalTeamCache = null;

/**
 * Get all internal team members
 * @returns {Array} Array of internal team member objects
 */
function getInternalTeam() {
  if (_internalTeamCache !== null) {
    return JSON.parse(JSON.stringify(_internalTeamCache));
  }

  try {
    var sheetId = getConfigValue('CONTACTS_SHEET_ID');
    if (!sheetId) {
      Logger.log('CONTACTS_SHEET_ID not configured');
      return [];
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    var headers = data[0];
    var results = [];

    // Find column indices
    var colMap = {};
    headers.forEach(function(h, i) {
      colMap[h] = i;
    });

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var isInternal = row[colMap['is_internal']];

      if (isInternal === true || isInternal === 'TRUE' || isInternal === 1) {
        // Check if profile fields exist
        var hasProfile = !!(row[colMap['education']] || row[colMap['hobbies']] || row[colMap['goals']]);

        results.push({
          contact_id: row[colMap['contact_id']] || '',
          first_name: row[colMap['first_name']] || '',
          last_name: row[colMap['last_name']] || '',
          email: row[colMap['email']] || '',
          internal_title: row[colMap['internal_title']] || '',
          internal_team: row[colMap['internal_team']] || '',
          supervisor: row[colMap['supervisor']] || '',
          active: row[colMap['active']] !== false,
          // Profile fields (About Me) - read directly from contacts
          has_profile: hasProfile,
          education: row[colMap['education']] || '',
          job_duties: row[colMap['job_duties']] || '',
          professional_skills: row[colMap['professional_skills']] || '',
          non_work_skills: row[colMap['non_work_skills']] || '',
          hobbies: row[colMap['hobbies']] || '',
          goals: row[colMap['goals']] || '',
          relax: row[colMap['relax']] || '',
          early_job: row[colMap['early_job']] || ''
        });
      }
    }

    // Sort by team, then last name
    results.sort(function(a, b) {
      if (a.internal_team !== b.internal_team) {
        return (a.internal_team || '').localeCompare(b.internal_team || '');
      }
      return (a.last_name || '').localeCompare(b.last_name || '');
    });

    _internalTeamCache = results;
    return JSON.parse(JSON.stringify(results));
  } catch (e) {
    Logger.log('Error in getInternalTeam: ' + e);
    return [];
  }
}

/**
 * Get internal team members by team name
 * @param {string} teamName - Team name to filter by
 * @returns {Array} Matching team members
 */
function getInternalTeamByTeam(teamName) {
  var team = getInternalTeam();
  return team.filter(function(m) {
    return m.internal_team && m.internal_team.toLowerCase() === teamName.toLowerCase();
  });
}

/**
 * Get internal team statistics
 * @returns {Object} Team stats (counts by team, total)
 */
function getInternalTeamStats() {
  var team = getInternalTeam();
  var byTeam = {};

  team.forEach(function(m) {
    var t = m.internal_team || 'Unassigned';
    byTeam[t] = (byTeam[t] || 0) + 1;
  });

  return {
    total: team.length,
    by_team: byTeam
  };
}

// ============================================================================
// TEAM PROFILES (About Me data)
// ============================================================================
// Profile fields are now stored directly in MO-DB_Contacts:
// education, job_duties, professional_skills, non_work_skills, hobbies, goals, relax, early_job
// These fields are read by getInternalTeam() above.

/**
 * Get internal team members with profiles
 * Alias for getInternalTeam() - profiles are now included directly from contacts
 * @returns {Array} Array of team member objects with profile data
 */
function getInternalTeamWithProfiles() {
  return getInternalTeam();
}

// ============================================================================
// AVAILABILITY
// ============================================================================

/**
 * Get the Availability sheet
 * @private
 */
function getAvailabilitySheet_() {
  var sheetId = getConfigValue('AVAILABILITY_SHEET_ID');
  if (!sheetId) {
    throw new Error('AVAILABILITY_SHEET_ID not configured');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for availability data
 */
var _availabilityCache = null;

/**
 * Load all availability entries
 * @private
 */
function loadAllAvailability_() {
  if (_availabilityCache !== null) {
    return _availabilityCache;
  }

  try {
    var sheet = getAvailabilitySheet_();
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    var headers = data[0];
    var results = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      headers.forEach(function(h, j) {
        var val = row[j];
        // Format dates
        if ((h === 'start_date' || h === 'end_date') && val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        obj[h] = val;
      });
      results.push(obj);
    }

    _availabilityCache = results;
    return results;
  } catch (e) {
    Logger.log('Error in loadAllAvailability_: ' + e);
    return [];
  }
}

/**
 * Get all availability entries
 * @returns {Array} Array of availability objects
 */
function getAvailability() {
  var avail = loadAllAvailability_();
  return JSON.parse(JSON.stringify(avail));
}

/**
 * Get availability by contact name
 * @param {string} contactName - Contact name to filter by
 * @returns {Array} Matching availability entries
 */
function getAvailabilityByContact(contactName) {
  var avail = loadAllAvailability_();
  var nameLower = contactName.toLowerCase();
  var results = avail.filter(function(a) {
    return a.contact_name && a.contact_name.toLowerCase().indexOf(nameLower) !== -1;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get availability for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Availability entries overlapping the range
 */
function getAvailabilityInRange(startDate, endDate) {
  var avail = loadAllAvailability_();
  var start = new Date(startDate);
  var end = new Date(endDate);

  var results = avail.filter(function(a) {
    var aStart = new Date(a.start_date);
    var aEnd = new Date(a.end_date);
    // Check for overlap
    return aStart <= end && aEnd >= start;
  });

  return JSON.parse(JSON.stringify(results));
}

/**
 * Get current and upcoming availability (next N days)
 * @param {number} days - Number of days to look ahead (default 30)
 * @returns {Array} Upcoming availability entries
 */
function getUpcomingAvailability(days) {
  days = days || 30;
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var endStr = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  return getAvailabilityInRange(todayStr, endStr);
}

/**
 * Add a new availability entry
 * @param {Object} data - Availability data
 * @returns {Object} Result with success status
 */
function addAvailability(data) {
  try {
    var sheet = getAvailabilitySheet_();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Generate ID
    var lastRow = sheet.getLastRow();
    var newId = 'AVAIL_' + String(lastRow).padStart(4, '0');

    // Build row
    var newRow = headers.map(function(h) {
      if (h === 'availability_id') return newId;
      if (h === 'created_at') return new Date();
      return data[h] || '';
    });

    sheet.appendRow(newRow);
    _availabilityCache = null; // Clear cache

    return { success: true, availability_id: newId };
  } catch (e) {
    Logger.log('Error in addAvailability: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Update an availability entry
 * @param {string} availabilityId - Availability ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object} Result with success status
 */
function updateAvailability(availabilityId, updates) {
  try {
    var sheet = getAvailabilitySheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('availability_id');

    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === availabilityId) {
        // Update the row
        headers.forEach(function(h, col) {
          if (updates.hasOwnProperty(h) && h !== 'availability_id' && h !== 'created_at') {
            sheet.getRange(i + 1, col + 1).setValue(updates[h]);
          }
        });
        _availabilityCache = null; // Clear cache
        return { success: true, availability_id: availabilityId };
      }
    }

    return { success: false, error: 'Availability not found' };
  } catch (e) {
    Logger.log('Error in updateAvailability: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete an availability entry
 * @param {string} availabilityId - Availability ID to delete
 * @returns {Object} Result with success status
 */
function deleteAvailability(availabilityId) {
  try {
    var sheet = getAvailabilitySheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('availability_id');

    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === availabilityId) {
        sheet.deleteRow(i + 1);
        _availabilityCache = null;
        return { success: true };
      }
    }

    return { success: false, error: 'Availability not found' };
  } catch (e) {
    Logger.log('Error in deleteAvailability: ' + e);
    return { success: false, error: e.message };
  }
}

// ============================================================================
// MEETINGS
// ============================================================================

/**
 * Get the Meetings sheet
 * @private
 */
function getMeetingsSheet_() {
  var sheetId = getConfigValue('MEETINGS_SHEET_ID');
  if (!sheetId) {
    throw new Error('MEETINGS_SHEET_ID not configured');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for meetings data
 */
var _meetingsCache = null;

/**
 * Load all meetings
 * @private
 */
function loadAllMeetings_() {
  if (_meetingsCache !== null) {
    return _meetingsCache;
  }

  try {
    var sheet = getMeetingsSheet_();
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    var headers = data[0];
    var results = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      headers.forEach(function(h, j) {
        obj[h] = row[j];
      });
      results.push(obj);
    }

    // Sort by day of week, then time
    var dayOrder = {'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, '': 6};
    results.sort(function(a, b) {
      var dayA = dayOrder[a.day_of_week] || 6;
      var dayB = dayOrder[b.day_of_week] || 6;
      if (dayA !== dayB) return dayA - dayB;
      return (a.time || '').localeCompare(b.time || '');
    });

    _meetingsCache = results;
    return results;
  } catch (e) {
    Logger.log('Error in loadAllMeetings_: ' + e);
    return [];
  }
}

/**
 * Get all meetings
 * @returns {Array} Array of meeting objects
 */
function getAllMeetings() {
  var meetings = loadAllMeetings_();
  return JSON.parse(JSON.stringify(meetings));
}

/**
 * Get meeting by ID
 * @param {string} meetingId - Meeting ID
 * @returns {Object} Meeting object or null
 */
function getMeetingById(meetingId) {
  var meetings = loadAllMeetings_();
  var found = meetings.find(function(m) {
    return m.meeting_id === meetingId;
  });
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

/**
 * Get meetings by day of week
 * @param {string} day - Day name (Monday, Tuesday, etc.)
 * @returns {Array} Meetings on that day
 */
function getMeetingsByDay(day) {
  var meetings = loadAllMeetings_();
  var results = meetings.filter(function(m) {
    return m.day_of_week && m.day_of_week.toLowerCase() === day.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get meetings by category
 * @param {string} category - Category (MO, Assessment, SEP, Comms, etc.)
 * @returns {Array} Meetings in that category
 */
function getMeetingsByCategory(category) {
  var meetings = loadAllMeetings_();
  var results = meetings.filter(function(m) {
    return m.category && m.category.toLowerCase() === category.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get active meetings only
 * @returns {Array} Active meetings
 */
function getActiveMeetings() {
  var meetings = loadAllMeetings_();
  var results = meetings.filter(function(m) {
    return m.is_active === true || m.is_active === 'TRUE' || m.is_active === 1;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get weekly meeting schedule (grouped by day)
 * @returns {Object} Meetings grouped by day of week
 */
function getWeeklySchedule() {
  var meetings = getActiveMeetings();
  var schedule = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: []
  };

  meetings.forEach(function(m) {
    if (m.day_of_week && schedule.hasOwnProperty(m.day_of_week)) {
      schedule[m.day_of_week].push(m);
    }
  });

  return schedule;
}

/**
 * Add a new meeting
 * @param {Object} data - Meeting data
 * @returns {Object} Result with success status
 */
function addMeeting(data) {
  try {
    var sheet = getMeetingsSheet_();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Generate ID
    var lastRow = sheet.getLastRow();
    var newId = 'MTG_' + String(lastRow).padStart(4, '0');

    // Build row
    var newRow = headers.map(function(h) {
      if (h === 'meeting_id') return newId;
      if (h === 'is_active') return true;
      if (h === 'created_at') return new Date();
      return data[h] || '';
    });

    sheet.appendRow(newRow);
    _meetingsCache = null;

    return { success: true, meeting_id: newId };
  } catch (e) {
    Logger.log('Error in addMeeting: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Update an existing meeting
 * @param {string} meetingId - Meeting ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Result with success status
 */
function updateMeeting(meetingId, updates) {
  try {
    var sheet = getMeetingsSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Find row with matching ID
    var idCol = headers.indexOf('meeting_id');
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === meetingId) {
        rowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Meeting not found: ' + meetingId);
    }

    // Update cells
    for (var key in updates) {
      var colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updates[key]);
      }
    }

    _meetingsCache = null;
    return { success: true };
  } catch (e) {
    Logger.log('Error in updateMeeting: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete a meeting
 * @param {string} meetingId - Meeting ID to delete
 * @returns {Object} Result with success status
 */
function deleteMeeting(meetingId) {
  try {
    var sheet = getMeetingsSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('meeting_id');

    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === meetingId) {
        sheet.deleteRow(i + 1);
        _meetingsCache = null;
        return { success: true };
      }
    }

    return { success: false, error: 'Meeting not found' };
  } catch (e) {
    Logger.log('Error in deleteMeeting: ' + e);
    return { success: false, error: e.message };
  }
}

// ============================================================================
// GLOSSARY
// ============================================================================

/**
 * Get the Glossary sheet
 * @private
 */
function getGlossarySheet_() {
  var sheetId = getConfigValue('GLOSSARY_SHEET_ID');
  if (!sheetId) {
    throw new Error('GLOSSARY_SHEET_ID not configured');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for glossary data
 */
var _glossaryCache = null;

/**
 * Load all glossary terms
 * @private
 */
function loadAllGlossaryTerms_() {
  if (_glossaryCache !== null) {
    return _glossaryCache;
  }

  try {
    var sheet = getGlossarySheet_();
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    var headers = data[0];
    var results = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      headers.forEach(function(h, j) {
        obj[h] = row[j];
      });
      results.push(obj);
    }

    // Sort alphabetically by term
    results.sort(function(a, b) {
      return (a.term || '').localeCompare(b.term || '');
    });

    _glossaryCache = results;
    return results;
  } catch (e) {
    Logger.log('Error in loadAllGlossaryTerms_: ' + e);
    return [];
  }
}

/**
 * Get all glossary terms
 * @returns {Array} Array of term objects
 */
function getGlossaryTerms() {
  var terms = loadAllGlossaryTerms_();
  return JSON.parse(JSON.stringify(terms));
}

/**
 * Get glossary term by ID
 * @param {string} termId - Term ID
 * @returns {Object} Term object or null
 */
function getGlossaryTermById(termId) {
  var terms = loadAllGlossaryTerms_();
  var found = terms.find(function(t) {
    return t.term_id === termId;
  });
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

/**
 * Search glossary terms
 * @param {string} query - Search query
 * @returns {Array} Matching terms
 */
function searchGlossary(query) {
  var terms = loadAllGlossaryTerms_();
  var queryLower = (query || '').toLowerCase();

  var results = terms.filter(function(t) {
    return (t.term || '').toLowerCase().indexOf(queryLower) !== -1 ||
           (t.definition || '').toLowerCase().indexOf(queryLower) !== -1;
  });

  return JSON.parse(JSON.stringify(results));
}

/**
 * Get glossary terms by category
 * @param {string} category - Category to filter by
 * @returns {Array} Terms in that category
 */
function getGlossaryByCategory(category) {
  var terms = loadAllGlossaryTerms_();
  var results = terms.filter(function(t) {
    return t.category && t.category.toLowerCase() === category.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Add a glossary term
 * @param {Object} data - Term data
 * @returns {Object} Result with success status
 */
function addGlossaryTerm(data) {
  try {
    var sheet = getGlossarySheet_();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Generate ID
    var lastRow = sheet.getLastRow();
    var newId = 'TERM_' + String(lastRow).padStart(4, '0');

    // Build row
    var newRow = headers.map(function(h) {
      if (h === 'term_id') return newId;
      if (h === 'created_at') return new Date();
      return data[h] || '';
    });

    sheet.appendRow(newRow);
    _glossaryCache = null;

    return { success: true, term_id: newId };
  } catch (e) {
    Logger.log('Error in addGlossaryTerm: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Update a glossary term
 * @param {string} termId - Term ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Result with success status
 */
function updateGlossaryTerm(termId, updates) {
  try {
    var sheet = getGlossarySheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idCol = headers.indexOf('term_id');
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === termId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Term not found: ' + termId);
    }

    for (var key in updates) {
      var colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updates[key]);
      }
    }

    _glossaryCache = null;
    return { success: true };
  } catch (e) {
    Logger.log('Error in updateGlossaryTerm: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete a glossary term
 * @param {string} termId - Term ID to delete
 * @returns {Object} Result with success status
 */
function deleteGlossaryTerm(termId) {
  try {
    var sheet = getGlossarySheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('term_id');

    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === termId) {
        sheet.deleteRow(i + 1);
        _glossaryCache = null;
        return { success: true };
      }
    }

    return { success: false, error: 'Term not found' };
  } catch (e) {
    Logger.log('Error in deleteGlossaryTerm: ' + e);
    return { success: false, error: e.message };
  }
}

// ============================================================================
// TEAM OVERVIEW (Aggregated stats)
// ============================================================================

/**
 * Get team overview for dashboard
 * @returns {Object} Comprehensive team statistics
 */
function getTeamOverview() {
  var team = getInternalTeam();
  var availability = getUpcomingAvailability(30);
  var meetings = getActiveMeetings();

  // Count upcoming OOO/travel
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var currentlyOut = availability.filter(function(a) {
    return a.start_date <= todayStr && a.end_date >= todayStr;
  });

  var upcomingOut = availability.filter(function(a) {
    return a.start_date > todayStr;
  });

  // Team counts
  var teamStats = getInternalTeamStats();

  // Meeting counts by category
  var meetingsByCategory = {};
  meetings.forEach(function(m) {
    var cat = m.category || 'Other';
    meetingsByCategory[cat] = (meetingsByCategory[cat] || 0) + 1;
  });

  return {
    team: {
      total: teamStats.total,
      by_team: teamStats.by_team
    },
    availability: {
      currently_out: currentlyOut.length,
      upcoming_out: upcomingOut.length,
      currently_out_names: currentlyOut.map(function(a) { return a.contact_name; })
    },
    meetings: {
      total_active: meetings.length,
      by_category: meetingsByCategory
    }
  };
}

// ============================================================================
// DIRECTING DOCUMENTS
// ============================================================================

/**
 * Document definitions with config keys, display names, descriptions, and categories
 * @private
 */
var DIRECTING_DOCUMENTS = [
  // Core Documents
  {
    configKey: 'MO_PROJECT_PLAN_DOC_ID',
    name: 'MO Project Plan',
    description: 'Overall project plan for NSITE Management Office operations',
    category: 'Core',
    icon: 'description'
  },
  {
    configKey: 'HQ_PROJECT_PLAN_DOC_ID',
    name: 'HQ Project Plan',
    description: 'NASA Headquarters project plan and directives',
    category: 'Core',
    icon: 'description'
  },
  {
    configKey: 'SOLUTION_REQUIREMENTS_EXPECTATIONS_DOC_ID',
    name: 'Solution Requirements & Expectations',
    description: 'Requirements and expectations for SNWG solutions',
    category: 'Core',
    icon: 'assignment'
  },

  // SEP Documents
  {
    configKey: 'SEP_PLAN_DOC_ID',
    name: 'SEP Plan',
    description: 'Stakeholder Engagement Program strategic plan',
    category: 'SEP',
    icon: 'group'
  },
  {
    configKey: 'SEP_BLUEPRINT_DOC_ID',
    name: 'SEP Blueprint',
    description: 'Detailed blueprint for stakeholder engagement activities',
    category: 'SEP',
    icon: 'map'
  },
  {
    configKey: 'CODESIGN_PIPELINE_DOC_ID',
    name: 'CoDesign Pipeline',
    description: 'CoDesign process pipeline and workflow documentation',
    category: 'SEP',
    icon: 'merge_type'
  },

  // Comms Documents
  {
    configKey: 'COMMS_PLAN_DOC_ID',
    name: 'Communications Plan',
    description: 'Strategic communications and outreach plan',
    category: 'Comms',
    icon: 'chat'
  },
  {
    configKey: 'STYLE_GUIDE_DOC_ID',
    name: 'Style Guide',
    description: 'Brand and style guidelines for NSITE MO communications',
    category: 'Comms',
    icon: 'palette'
  },
  {
    configKey: 'HIGHLIGHTER_BLURBS_DOC_ID',
    name: 'Highlighter Blurbs',
    description: 'Pre-approved highlight content and blurbs',
    category: 'Comms',
    icon: 'star'
  },
  {
    configKey: 'WEBPAGE_LOG_DOC_ID',
    name: 'Webpage Log',
    description: 'Log of website updates and changes',
    category: 'Comms',
    icon: 'public'
  },

  // Assessment Documents
  {
    configKey: 'ASSESSEMENT_PROCESS_DOC_ID',
    name: 'Assessment Process',
    description: 'Detailed assessment cycle process documentation',
    category: 'Assessment',
    icon: 'check_circle'
  },
  {
    configKey: 'ASSESSEMENT_CHEATSHEET_DOC_ID',
    name: 'Assessment Cheatsheet',
    description: 'Quick reference guide for assessment activities',
    category: 'Assessment',
    icon: 'bolt'
  },

  // Operations Documents
  {
    configKey: 'MO_RISK_REGISTER_DOC_ID',
    name: 'MO Risk Register',
    description: 'Management Office risk tracking and mitigation',
    category: 'Operations',
    icon: 'warning'
  },
  {
    configKey: 'RISK_REGISTER_DOC_ID',
    name: 'Risk Register',
    description: 'Program-wide risk register',
    category: 'Operations',
    icon: 'warning'
  },
  {
    configKey: 'INFO_MANAGEMENT_PLAN_DOC_ID',
    name: 'Information Management Plan',
    description: 'Data and information management guidelines',
    category: 'Operations',
    icon: 'storage'
  },
  {
    configKey: 'AUDIT_LOG_DOC_ID',
    name: 'Audit Log',
    description: 'Audit trail and change log',
    category: 'Operations',
    icon: 'list'
  },

  // Templates & Boilerplates
  {
    configKey: 'TEMPLATE_MEETING_NOTES_DOC_ID',
    name: 'Meeting Notes Template',
    description: 'Standard template for meeting notes and action items',
    category: 'Templates',
    icon: 'note_add'
  },
  {
    configKey: 'TEMPLATE_SOLUTION_BRIEF_DOC_ID',
    name: 'Solution Brief Template',
    description: 'Template for solution overview briefs',
    category: 'Templates',
    icon: 'article'
  },
  {
    configKey: 'TEMPLATE_STAKEHOLDER_REPORT_DOC_ID',
    name: 'Stakeholder Report Template',
    description: 'Template for stakeholder engagement reports',
    category: 'Templates',
    icon: 'summarize'
  },
  {
    configKey: 'TEMPLATE_PRESENTATION_DOC_ID',
    name: 'Presentation Template',
    description: 'Standard slide deck template for presentations',
    category: 'Templates',
    icon: 'slideshow'
  },
  {
    configKey: 'TEMPLATE_EMAIL_OUTREACH_DOC_ID',
    name: 'Email Outreach Templates',
    description: 'Boilerplate emails for stakeholder outreach',
    category: 'Templates',
    icon: 'forward_to_inbox'
  },
  {
    configKey: 'TEMPLATE_ONE_PAGER_DOC_ID',
    name: 'One-Pager Template',
    description: 'Template for solution one-pagers and fact sheets',
    category: 'Templates',
    icon: 'request_page'
  }
];

/**
 * Get all directing documents with URLs from config
 * @returns {Array} Array of document objects with name, description, category, url, icon
 */
function getDirectingDocuments() {
  var config = loadConfigFromSheet();
  var results = [];

  DIRECTING_DOCUMENTS.forEach(function(doc) {
    var docId = config[doc.configKey];

    // Only include documents that have an ID configured
    if (docId) {
      results.push({
        id: doc.configKey,
        name: doc.name,
        description: doc.description,
        category: doc.category,
        icon: doc.icon,
        url: 'https://docs.google.com/document/d/' + docId + '/edit',
        configured: true
      });
    }
  });

  // Sort by category, then by name
  var categoryOrder = ['Core', 'SEP', 'Comms', 'Assessment', 'Operations'];
  results.sort(function(a, b) {
    var catA = categoryOrder.indexOf(a.category);
    var catB = categoryOrder.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Get directing documents grouped by category
 * @returns {Object} Documents grouped by category
 */
function getDirectingDocumentsByCategory() {
  var docs = getDirectingDocuments();
  var grouped = {};

  docs.forEach(function(doc) {
    if (!grouped[doc.category]) {
      grouped[doc.category] = [];
    }
    grouped[doc.category].push(doc);
  });

  return grouped;
}

/**
 * Get count of configured directing documents
 * @returns {number} Count of documents with URLs configured
 */
function getDirectingDocumentsCount() {
  return getDirectingDocuments().length;
}

// ============================================================================
// EMAIL TEMPLATES (delegates to templates-api.gs if TEMPLATES_SHEET_ID configured)
// ============================================================================

/**
 * Get the email templates sheet URL for editing
 * Prefers TEMPLATES_SHEET_ID, falls back to EMAIL_TEMPLATES_SHEET_ID
 * @returns {Object} { url: string, configured: boolean }
 */
function getEmailTemplatesDocUrl() {
  // Try new templates database first
  var templatesSheetId = getConfigValue('TEMPLATES_SHEET_ID');
  if (templatesSheetId) {
    return {
      url: 'https://docs.google.com/spreadsheets/d/' + templatesSheetId + '/edit',
      configured: true
    };
  }

  // Fall back to legacy email templates
  var sheetId = getConfigValue('EMAIL_TEMPLATES_SHEET_ID');
  if (!sheetId) {
    return { url: null, configured: false };
  }
  return {
    url: 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit',
    configured: true
  };
}

/**
 * Get all active email templates from the database
 * Prefers TEMPLATES_SHEET_ID (comprehensive), falls back to EMAIL_TEMPLATES_SHEET_ID (legacy)
 * @returns {Array} Array of { id, name, category, subject, body }
 */
function getEmailTemplates() {
  // Try new comprehensive templates database first
  var templatesSheetId = getConfigValue('TEMPLATES_SHEET_ID');
  if (templatesSheetId) {
    try {
      return getEmailTemplatesForSEP();
    } catch (e) {
      Logger.log('Error loading from TEMPLATES_SHEET_ID, falling back: ' + e);
    }
  }

  // Fall back to legacy EMAIL_TEMPLATES_SHEET_ID
  var sheetId = getConfigValue('EMAIL_TEMPLATES_SHEET_ID');
  if (!sheetId) {
    Logger.log('Neither TEMPLATES_SHEET_ID nor EMAIL_TEMPLATES_SHEET_ID configured');
    return [];
  }

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    var headers = data[0];
    var colMap = {};
    headers.forEach(function(h, i) {
      colMap[h.toLowerCase().trim()] = i;
    });

    var templates = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      // Skip inactive templates
      var isActive = row[colMap['is_active']];
      if (isActive === false || isActive === 'FALSE' || isActive === 0) {
        continue;
      }

      var templateId = row[colMap['template_id']];
      if (!templateId) continue;

      templates.push({
        id: String(templateId),
        name: row[colMap['name']] || templateId,
        category: row[colMap['category']] || 'General',
        subject: row[colMap['subject']] || '',
        body: row[colMap['body']] || '',
        sort_order: row[colMap['sort_order']] || 999
      });
    }

    // Sort by sort_order, then by name
    templates.sort(function(a, b) {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

    return templates;
  } catch (e) {
    Logger.log('Error loading email templates: ' + e);
    return [];
  }
}
