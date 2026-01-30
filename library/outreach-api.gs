/**
 * Outreach API - Comms-NSITE
 * ==========================
 * Event and outreach opportunity tracking
 * Includes event discovery via web search
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Outreach sheet
 * Reads OUTREACH_SHEET_ID from MO-DB_Config
 */
function getOutreachSheet_() {
  var sheetId = getConfigValue('OUTREACH_SHEET_ID');
  if (!sheetId) {
    throw new Error('OUTREACH_SHEET_ID not configured in MO-DB_Config');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for outreach data
 */
var _outreachCache = null;

/**
 * Load all events into memory
 */
function loadAllEvents_() {
  if (_outreachCache !== null) {
    return _outreachCache;
  }

  var sheet = getOutreachSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _outreachCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var event = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      if (value instanceof Date) {
        event[header] = value.toISOString();
      } else {
        event[header] = value;
      }
    });
    if (event.event_id) {
      _outreachCache.push(event);
    }
  }

  // Sort by start_date ascending
  _outreachCache.sort(function(a, b) {
    var dateA = a.start_date ? new Date(a.start_date) : new Date('2099-12-31');
    var dateB = b.start_date ? new Date(b.start_date) : new Date('2099-12-31');
    return dateA - dateB;
  });

  return _outreachCache;
}

/**
 * Clear cache after mutations
 */
function clearOutreachCache_() {
  _outreachCache = null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Event types
 */
var EVENT_TYPES = ['conference', 'workshop', 'webinar', 'meeting', 'site_visit'];

/**
 * Event statuses
 */
var EVENT_STATUSES = ['potential', 'considering', 'confirmed', 'attended', 'cancelled'];

/**
 * Event status info
 */
var EVENT_STATUS_INFO = {
  'potential': { name: 'Potential', order: 1, color: '#9E9E9E', description: 'Discovered opportunity' },
  'considering': { name: 'Considering', order: 2, color: '#2196F3', description: 'Under evaluation' },
  'confirmed': { name: 'Confirmed', order: 3, color: '#FF9800', description: 'Will attend/present' },
  'attended': { name: 'Attended', order: 4, color: '#4CAF50', description: 'Completed' },
  'cancelled': { name: 'Cancelled', order: 5, color: '#607D8B', description: 'Not pursuing' }
};

/**
 * Priority sectors for event discovery
 */
var PRIORITY_SECTORS = [
  'Agriculture',
  'Water Resources',
  'Disasters',
  'Ecological Conservation',
  'Climate',
  'Wildland Fires',
  'Land Use',
  'Energy',
  'Urban Development'
];

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Get all events
 */
function getAllEvents(limit) {
  var events = loadAllEvents_();
  if (limit && limit > 0) {
    return deepCopy(events.slice(0, limit));
  }
  return deepCopy(events);
}

/**
 * Get event by ID
 */
function getEventById(eventId) {
  return getById(loadAllEvents_(), 'event_id', eventId);
}

/**
 * Create a new event
 * @param {Object} eventData - Event data object
 * @returns {Object} Result object {success: true, data: eventData} or {success: false, error: message}
 */
function createEvent(eventData) {
  try {
    var sheet = getOutreachSheet_();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (!eventData.event_id) {
      var timestamp = new Date().getTime();
      eventData.event_id = 'EVT_' + timestamp;
    }

    eventData.created_at = new Date().toISOString();
    eventData.status = eventData.status || 'potential';
    eventData.event_type = eventData.event_type || 'conference';

    var newRow = headers.map(function(header) {
      return eventData[header] !== undefined ? eventData[header] : '';
    });

    sheet.appendRow(newRow);
    clearOutreachCache_();

    return { success: true, data: eventData };
  } catch (error) {
    Logger.log('Error in createEvent: ' + error);
    return { success: false, error: 'Failed to create event: ' + error.message };
  }
}

/**
 * Update an event
 * @param {string} eventId - Event ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object} Result object {success: true, data: event} or {success: false, error: message}
 */
function updateEvent(eventId, updates) {
  try {
    var sheet = getOutreachSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idColIndex = headers.indexOf('event_id');
    if (idColIndex === -1) {
      return { success: false, error: 'event_id column not found' };
    }

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === eventId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Event not found' };
    }

    headers.forEach(function(header, colIndex) {
      if (updates.hasOwnProperty(header) && header !== 'event_id' && header !== 'created_at') {
        sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[header]);
      }
    });

    clearOutreachCache_();
    var updatedEvent = getEventById(eventId);
    return { success: true, data: updatedEvent };
  } catch (error) {
    Logger.log('Error in updateEvent: ' + error);
    return { success: false, error: 'Failed to update event: ' + error.message };
  }
}

/**
 * Update event status
 */
function updateEventStatus(eventId, newStatus) {
  return updateEvent(eventId, { status: newStatus });
}

/**
 * Delete an event
 * @param {string} eventId - Event ID to delete
 * @returns {Object} Result object {success: true} or {success: false, error: message}
 */
function deleteEvent(eventId) {
  try {
    var sheet = getOutreachSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idColIndex = headers.indexOf('event_id');
    if (idColIndex === -1) {
      return { success: false, error: 'event_id column not found' };
    }

    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === eventId) {
        sheet.deleteRow(i + 1);
        clearOutreachCache_();
        return { success: true };
      }
    }

    return { success: false, error: 'Event not found' };
  } catch (error) {
    Logger.log('Error in deleteEvent: ' + error);
    return { success: false, error: 'Failed to delete event: ' + error.message };
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get events by status
 */
function getEventsByStatus(status) {
  return filterByProperty(loadAllEvents_(), 'status', status, true);
}

/**
 * Get events by year
 */
function getEventsByYear(year) {
  var events = loadAllEvents_();
  var results = events.filter(function(e) {
    return e.year === year || (e.start_date && new Date(e.start_date).getFullYear() === year);
  });
  return deepCopy(results);
}

/**
 * Get events by type
 */
function getEventsByType(eventType) {
  return filterByProperty(loadAllEvents_(), 'event_type', eventType, true);
}

/**
 * Get events by sector
 */
function getEventsBySector(sector) {
  // Use contains match (exactMatch=false) since sector may have multiple values
  return filterByProperty(loadAllEvents_(), 'sector', sector, false);
}

/**
 * Get upcoming events
 */
function getUpcomingEvents(days) {
  days = days || 90;
  var events = loadAllEvents_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  var results = events.filter(function(e) {
    if (!e.start_date) return false;
    if (e.status === 'cancelled' || e.status === 'attended') return false;
    var startDate = new Date(e.start_date);
    return startDate >= today && startDate <= cutoff;
  });

  return deepCopy(results);
}

/**
 * Get events with upcoming deadlines
 */
function getUpcomingDeadlines(days) {
  days = days || 30;
  var events = loadAllEvents_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  var results = events.filter(function(e) {
    if (!e.deadline) return false;
    if (e.status === 'cancelled' || e.status === 'attended') return false;
    var deadlineDate = new Date(e.deadline);
    return deadlineDate >= today && deadlineDate <= cutoff;
  });

  // Sort by deadline
  results.sort(function(a, b) {
    return new Date(a.deadline) - new Date(b.deadline);
  });

  return deepCopy(results);
}

/**
 * Get confirmed events (calendar view)
 */
function getConfirmedEvents(year) {
  var events = loadAllEvents_();
  var results = events.filter(function(e) {
    if (e.status !== 'confirmed' && e.status !== 'considering') return false;
    if (year) {
      var eventYear = e.year || (e.start_date ? new Date(e.start_date).getFullYear() : 0);
      return eventYear === year;
    }
    return true;
  });
  return deepCopy(results);
}

/**
 * Get potential events (opportunities)
 */
function getPotentialEvents() {
  return filterByProperty(loadAllEvents_(), 'status', 'potential', true);
}

/**
 * Search events by name
 */
function searchEvents(query) {
  var events = loadAllEvents_();
  var queryLower = query.toLowerCase();

  var results = events.filter(function(e) {
    return (e.name && e.name.toLowerCase().includes(queryLower)) ||
           (e.stakeholders && e.stakeholders.toLowerCase().includes(queryLower)) ||
           (e.sector && e.sector.toLowerCase().includes(queryLower));
  });

  return deepCopy(results);
}

// ============================================================================
// EVENT DISCOVERY (WEB SEARCH)
// ============================================================================

/**
 * Search for events related to a topic using web search
 * @param {string} topic - Search topic (e.g., "agriculture remote sensing conference 2026")
 * @param {number} maxResults - Maximum results to return
 * @returns {Array} Discovered events
 */
function discoverEvents(topic, maxResults) {
  maxResults = maxResults || 10;

  // Build search query
  var searchQuery = topic + ' conference 2026 2027';

  try {
    // Use Google Custom Search API if configured, otherwise use UrlFetchApp
    var results = performEventSearch_(searchQuery, maxResults);
    return results;
  } catch (error) {
    Logger.log('Event discovery error: ' + error);
    return [];
  }
}

/**
 * Perform web search for events
 * @private
 */
function performEventSearch_(query, maxResults) {
  // Try to use Google Custom Search API
  var apiKey = getConfigValue('GOOGLE_SEARCH_API_KEY');
  var searchEngineId = getConfigValue('GOOGLE_SEARCH_ENGINE_ID');

  if (apiKey && searchEngineId) {
    return searchWithGoogleAPI_(query, apiKey, searchEngineId, maxResults);
  }

  // Fallback: return suggested search queries for manual discovery
  return generateSearchSuggestions_(query);
}

/**
 * Search using Google Custom Search API
 * @private
 */
function searchWithGoogleAPI_(query, apiKey, searchEngineId, maxResults) {
  var url = 'https://www.googleapis.com/customsearch/v1' +
            '?key=' + encodeURIComponent(apiKey) +
            '&cx=' + encodeURIComponent(searchEngineId) +
            '&q=' + encodeURIComponent(query) +
            '&num=' + Math.min(maxResults, 10);

  try {
    var response = UrlFetchApp.fetch(url);
    var data = JSON.parse(response.getContentText());

    if (!data.items) return [];

    return data.items.map(function(item, idx) {
      return {
        event_id: 'DISC_' + new Date().getTime() + '_' + idx,
        name: item.title,
        event_type: detectEventType_(item.title),
        status: 'potential',
        source: 'web_search',
        event_url: item.link,
        notes: item.snippet,
        search_query: query,
        created_at: new Date().toISOString(),
        created_by: 'web_search'
      };
    });
  } catch (error) {
    Logger.log('Google Search API error: ' + error);
    return [];
  }
}

/**
 * Generate search suggestions when API not available
 * @private
 */
function generateSearchSuggestions_(query) {
  var suggestions = [];
  var baseTerms = query.split(' ').filter(function(t) { return t.length > 2; });

  // Generate search URLs for common conference sites
  var sites = [
    { name: 'Google Search', url: 'https://www.google.com/search?q=' },
    { name: 'AGU Events', url: 'https://www.agu.org/search?q=' },
    { name: 'IEEE Events', url: 'https://www.ieee.org/search?q=' },
    { name: 'ESRI Events', url: 'https://www.esri.com/en-us/about/events/index?q=' }
  ];

  var searchTerms = encodeURIComponent(query + ' conference 2026');

  sites.forEach(function(site, idx) {
    suggestions.push({
      suggestion_id: 'SUG_' + idx,
      site_name: site.name,
      search_url: site.url + searchTerms,
      query: query,
      type: 'search_suggestion'
    });
  });

  return suggestions;
}

/**
 * Detect event type from title
 * @private
 */
function detectEventType_(title) {
  if (!title) return 'conference';

  var titleLower = title.toLowerCase();

  if (titleLower.includes('workshop')) return 'workshop';
  if (titleLower.includes('webinar') || titleLower.includes('virtual')) return 'webinar';
  if (titleLower.includes('meeting') || titleLower.includes('summit')) return 'meeting';

  return 'conference';
}

/**
 * Add discovered event to database
 * @param {Object} eventData - Event data from discovery
 * @returns {Object} Created event
 */
function addDiscoveredEvent(eventData) {
  // Ensure it's marked as from web search
  eventData.source = 'web_search';
  eventData.status = 'potential';
  eventData.created_by = 'web_search';

  return createEvent(eventData);
}

/**
 * Discover events by sector/priority
 * @param {string} sector - Sector to search for
 * @returns {Array} Discovered events
 */
function discoverEventsBySector(sector) {
  var searchTerms = sector + ' remote sensing earth observation conference symposium 2026 2027';
  return discoverEvents(searchTerms, 10);
}

/**
 * Batch discover events for all priority sectors
 * @returns {Object} Results by sector
 */
function discoverEventsForAllSectors() {
  var results = {};

  PRIORITY_SECTORS.forEach(function(sector) {
    try {
      results[sector] = discoverEventsBySector(sector);
    } catch (error) {
      Logger.log('Error discovering events for ' + sector + ': ' + error);
      results[sector] = [];
    }
  });

  return results;
}

// ============================================================================
// STATISTICS & OVERVIEW
// ============================================================================

/**
 * Get outreach statistics
 */
function getOutreachStats() {
  var events = loadAllEvents_();

  var byStatus = {};
  var byType = {};
  var byYear = {};
  var bySector = {};

  events.forEach(function(e) {
    if (e.status) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }
    if (e.event_type) {
      byType[e.event_type] = (byType[e.event_type] || 0) + 1;
    }
    var year = e.year || (e.start_date ? new Date(e.start_date).getFullYear() : 0);
    if (year > 0) {
      byYear[year] = (byYear[year] || 0) + 1;
    }
    if (e.sector) {
      e.sector.split(',').forEach(function(s) {
        var sector = s.trim();
        if (sector) {
          bySector[sector] = (bySector[sector] || 0) + 1;
        }
      });
    }
  });

  var upcoming = getUpcomingEvents(90);
  var deadlines = getUpcomingDeadlines(30);

  return {
    total_events: events.length,
    upcoming_90_days: upcoming.length,
    upcoming_deadlines: deadlines.length,
    potential_opportunities: (byStatus['potential'] || 0),
    confirmed_events: (byStatus['confirmed'] || 0) + (byStatus['considering'] || 0),
    by_status: byStatus,
    by_type: byType,
    by_year: byYear,
    by_sector: bySector
  };
}

/**
 * Get outreach overview for dashboard
 */
function getOutreachOverview() {
  var stats = getOutreachStats();
  var upcoming = getUpcomingEvents(60);
  var deadlines = getUpcomingDeadlines(14);
  var potential = getPotentialEvents();

  return {
    stats: stats,
    upcoming_events: upcoming.slice(0, 5),
    upcoming_deadlines: deadlines.slice(0, 5),
    potential_count: potential.length,
    potential_events: potential.slice(0, 5)
  };
}

/**
 * Get events for UI display
 */
function getEventsForUI() {
  var events = loadAllEvents_();

  // Filter to non-cancelled
  var active = events.filter(function(e) {
    return e.status !== 'cancelled';
  });

  return active.map(function(e) {
    return {
      event_id: e.event_id,
      name: e.name,
      event_type: e.event_type,
      status: e.status,
      source: e.source,
      start_date: e.start_date,
      end_date: e.end_date,
      deadline: e.deadline,
      location: e.location,
      solution_id: e.solution_id,
      team_members: e.team_members,
      stakeholders: e.stakeholders,
      sector: e.sector,
      priority: e.priority,
      year: e.year,
      event_url: e.event_url
    };
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get event type options for UI
 */
function getEventTypeOptions() {
  return EVENT_TYPES.map(function(type) {
    return {
      value: type,
      name: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
    };
  });
}

/**
 * Get event status options for UI
 */
function getEventStatusOptions() {
  return EVENT_STATUSES.map(function(status) {
    var info = EVENT_STATUS_INFO[status] || {};
    return {
      value: status,
      name: info.name || status,
      order: info.order || 0,
      color: info.color || '#9E9E9E',
      description: info.description || ''
    };
  });
}

/**
 * Get priority sector options for UI
 */
function getPrioritySectorOptions() {
  return PRIORITY_SECTORS.map(function(sector) {
    return { value: sector, name: sector };
  });
}

/**
 * Check if event name already exists
 */
function eventExists(eventName) {
  var events = loadAllEvents_();
  var nameLower = eventName.toLowerCase().trim();

  return events.some(function(e) {
    return e.name && e.name.toLowerCase().trim() === nameLower;
  });
}

// ============================================================================
// GUEST LIST MANAGEMENT
// ============================================================================

/**
 * Add a guest (contact) to an event's guest list
 * @param {string} eventId - Event ID
 * @param {string} contactEmail - Contact email to add
 * @returns {Object} Updated event or error
 */
function addGuestToEvent(eventId, contactEmail) {
  // Read directly from sheet to avoid any caching issues
  var sheet = getOutreachSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('event_id');
  var guestListColIndex = headers.indexOf('guest_list');

  if (idColIndex === -1) {
    return { success: false, error: 'event_id column not found' };
  }
  if (guestListColIndex === -1) {
    return { success: false, error: 'guest_list column not found in spreadsheet. Please add it.' };
  }

  // Find the event row
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === eventId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Event not found' };
  }

  // Get current guest list directly from the cell
  var currentGuestListValue = data[rowIndex][guestListColIndex];
  var currentGuestListStr = currentGuestListValue ? String(currentGuestListValue) : '';

  var email = contactEmail.toLowerCase().trim();
  var currentGuests = currentGuestListStr ? currentGuestListStr.split(',').map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean) : [];

  if (currentGuests.includes(email)) {
    return { success: false, error: 'Contact already in guest list' };
  }

  currentGuests.push(email);
  var updatedGuestList = currentGuests.join(', ');

  // Write directly to the cell
  sheet.getRange(rowIndex + 1, guestListColIndex + 1).setValue(updatedGuestList);
  SpreadsheetApp.flush();

  // Clear cache so subsequent reads get fresh data
  clearOutreachCache_();

  return { success: true, guest_list: updatedGuestList };
}

/**
 * Remove a guest from an event's guest list
 * @param {string} eventId - Event ID
 * @param {string} contactEmail - Contact email to remove
 * @returns {Object} Updated event or error
 */
function removeGuestFromEvent(eventId, contactEmail) {
  // Read directly from sheet
  var sheet = getOutreachSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('event_id');
  var guestListColIndex = headers.indexOf('guest_list');

  if (idColIndex === -1 || guestListColIndex === -1) {
    return { success: false, error: 'Required columns not found' };
  }

  // Find the event row
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === eventId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Event not found' };
  }

  var currentGuestListValue = data[rowIndex][guestListColIndex];
  var currentGuestListStr = currentGuestListValue ? String(currentGuestListValue) : '';

  var email = contactEmail.toLowerCase().trim();
  var currentGuests = currentGuestListStr ? currentGuestListStr.split(',').map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean) : [];

  var index = currentGuests.indexOf(email);
  if (index === -1) {
    return { success: false, error: 'Contact not in guest list' };
  }

  currentGuests.splice(index, 1);
  var updatedGuestList = currentGuests.join(', ');

  sheet.getRange(rowIndex + 1, guestListColIndex + 1).setValue(updatedGuestList);
  SpreadsheetApp.flush();
  clearOutreachCache_();

  return { success: true, guest_list: updatedGuestList };
}

/**
 * Get all guests for an event with full contact profile data
 * @param {string} eventId - Event ID
 * @returns {Array} Array of contact objects with profile data
 */
function getEventGuests(eventId) {
  // Read guest_list directly from sheet to avoid cache issues
  var sheet = getOutreachSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('event_id');
  var guestListColIndex = headers.indexOf('guest_list');
  var attendeesColIndex = headers.indexOf('actual_attendees');

  if (idColIndex === -1 || guestListColIndex === -1) {
    return [];
  }

  // Find the event row
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === eventId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return [];
  }

  var guestListValue = data[rowIndex][guestListColIndex];
  var guestListStr = guestListValue ? String(guestListValue) : '';

  if (!guestListStr) {
    return [];
  }

  var guestEmails = guestListStr.split(',').map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean);
  if (guestEmails.length === 0) {
    return [];
  }

  // Get actual attendees for post-event display
  var actualAttendeesValue = attendeesColIndex !== -1 ? data[rowIndex][attendeesColIndex] : '';
  var actualAttendeesStr = actualAttendeesValue ? String(actualAttendeesValue) : '';
  var actualAttendees = actualAttendeesStr ? actualAttendeesStr.split(',').map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean) : [];

  // Load contacts (using contacts-api.gs functions)
  var allContacts = getAllContacts();
  var uniqueContacts = {};

  allContacts.forEach(function(c) {
    var email = (c.email || '').toLowerCase();
    if (guestEmails.includes(email) && !uniqueContacts[email]) {
      uniqueContacts[email] = {
        email: email,
        first_name: c.first_name,
        last_name: c.last_name,
        agency: c.agency,
        agency_id: c.agency_id,
        organization: c.organization,
        title: c.title,
        department: c.department,
        phone: c.phone,
        // Profile fields for prep report
        education: c.education,
        job_duties: c.job_duties,
        professional_skills: c.professional_skills,
        non_work_skills: c.non_work_skills,
        hobbies: c.hobbies,
        goals: c.goals,
        relax: c.relax,
        early_job: c.early_job,
        // Engagement data
        solution_id: c.solution_id,
        solutions: []
      };
    }
  });

  // Aggregate solutions per contact
  allContacts.forEach(function(c) {
    var email = (c.email || '').toLowerCase();
    if (uniqueContacts[email] && c.solution_id) {
      if (uniqueContacts[email].solutions.indexOf(c.solution_id) === -1) {
        uniqueContacts[email].solutions.push(c.solution_id);
      }
    }
  });

  // Mark attendance status (actualAttendees already loaded from sheet above)
  return Object.values(uniqueContacts).map(function(contact) {
    contact.attended = actualAttendees.includes(contact.email);
    return contact;
  });
}

/**
 * Mark a guest as attended or not attended for an event
 * @param {string} eventId - Event ID
 * @param {string} contactEmail - Contact email
 * @param {boolean} attended - Whether they attended
 * @returns {Object} Success/failure result
 */
function markGuestAttended(eventId, contactEmail, attended) {
  // Read directly from sheet
  var sheet = getOutreachSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('event_id');
  var attendeesColIndex = headers.indexOf('actual_attendees');

  if (idColIndex === -1) {
    return { success: false, error: 'event_id column not found' };
  }
  if (attendeesColIndex === -1) {
    return { success: false, error: 'actual_attendees column not found in spreadsheet. Please add it.' };
  }

  // Find the event row
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === eventId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Event not found' };
  }

  var currentAttendeesValue = data[rowIndex][attendeesColIndex];
  var currentAttendeesStr = currentAttendeesValue ? String(currentAttendeesValue) : '';

  var email = contactEmail.toLowerCase().trim();
  var currentAttendees = currentAttendeesStr ? currentAttendeesStr.split(',').map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean) : [];

  var index = currentAttendees.indexOf(email);

  if (attended && index === -1) {
    currentAttendees.push(email);
  } else if (!attended && index !== -1) {
    currentAttendees.splice(index, 1);
  }

  var updatedAttendees = currentAttendees.join(', ');

  sheet.getRange(rowIndex + 1, attendeesColIndex + 1).setValue(updatedAttendees);
  SpreadsheetApp.flush();
  clearOutreachCache_();

  return { success: true, actual_attendees: updatedAttendees };
}

// ============================================================================
// PREP REPORT
// ============================================================================

/**
 * Generate a comprehensive prep report for an event
 * @param {string} eventId - Event ID
 * @returns {Object} Prep report with guests, agencies, connections, and conversation starters
 */
function getEventPrepReport(eventId) {
  var event = getEventById(eventId);
  if (!event) {
    return { error: 'Event not found' };
  }

  var guests = getEventGuests(eventId);
  var guestEmails = guests.map(function(g) { return g.email.toLowerCase(); });

  // Event info with linked solutions
  var linkedSolutions = [];
  if (event.solution_id) {
    linkedSolutions = event.solution_id.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  }

  var eventInfo = {
    event_id: event.event_id,
    name: event.name,
    event_type: event.event_type,
    start_date: event.start_date,
    end_date: event.end_date,
    location: event.location,
    sector: event.sector,
    linked_solutions: linkedSolutions
  };

  // Find potential guests from solution engagements
  var potentialGuests = findPotentialGuestsFromEngagements_(linkedSolutions, guestEmails, event.name);

  // Agencies represented
  var agencyMap = {};
  guests.forEach(function(guest) {
    var agencyName = guest.agency || guest.organization || 'Unknown';
    if (!agencyMap[agencyName]) {
      agencyMap[agencyName] = {
        name: agencyName,
        count: 0,
        contacts: []
      };
    }
    agencyMap[agencyName].count++;
    agencyMap[agencyName].contacts.push({
      name: (guest.first_name || '') + ' ' + (guest.last_name || ''),
      email: guest.email,
      title: guest.title
    });
  });

  var agencies = Object.values(agencyMap).sort(function(a, b) {
    return b.count - a.count;
  });

  // Find potential connections
  var connections = findPotentialConnections_(guests);

  // Generate conversation starters
  var conversationStarters = guests.map(function(guest) {
    var topics = [];

    if (guest.hobbies) {
      topics.push({ type: 'hobby', text: 'Hobbies: ' + guest.hobbies });
    }
    if (guest.early_job) {
      topics.push({ type: 'icebreaker', text: 'First job: ' + guest.early_job });
    }
    if (guest.goals) {
      topics.push({ type: 'professional', text: 'Goals: ' + guest.goals });
    }
    if (guest.relax) {
      topics.push({ type: 'personal', text: 'Unwinds by: ' + guest.relax });
    }
    if (guest.non_work_skills) {
      topics.push({ type: 'skill', text: 'Outside work: ' + guest.non_work_skills });
    }
    if (guest.solutions && guest.solutions.length > 0) {
      topics.push({ type: 'work', text: 'Engaged with: ' + guest.solutions.slice(0, 3).join(', ') });
    }

    return {
      name: (guest.first_name || '') + ' ' + (guest.last_name || ''),
      email: guest.email,
      agency: guest.agency || guest.organization,
      topics: topics
    };
  }).filter(function(g) {
    return g.topics.length > 0;
  });

  return {
    event: eventInfo,
    guests: guests.map(function(g) {
      return {
        name: (g.first_name || '') + ' ' + (g.last_name || ''),
        email: g.email,
        agency: g.agency || g.organization,
        title: g.title,
        hobbies: g.hobbies,
        goals: g.goals,
        education: g.education,
        professional_skills: g.professional_skills,
        non_work_skills: g.non_work_skills,
        early_job: g.early_job,
        relax: g.relax,
        solutions: g.solutions,
        attended: g.attended
      };
    }),
    agencies_represented: agencies,
    potential_connections: connections,
    conversation_starters: conversationStarters,
    potential_guests: potentialGuests,
    summary: {
      total_guests: guests.length,
      total_agencies: agencies.length,
      total_connections: connections.length,
      total_potential_guests: potentialGuests.length,
      linked_solutions: linkedSolutions.length
    }
  };
}

/**
 * Find potential connections between guests
 * @private
 */
function findPotentialConnections_(guests) {
  var connections = [];

  for (var i = 0; i < guests.length; i++) {
    for (var j = i + 1; j < guests.length; j++) {
      var guest1 = guests[i];
      var guest2 = guests[j];
      var reasons = [];

      // Check shared solutions
      if (guest1.solutions && guest2.solutions) {
        var sharedSolutions = guest1.solutions.filter(function(s) {
          return guest2.solutions.includes(s);
        });
        if (sharedSolutions.length > 0) {
          reasons.push('Both engaged with ' + sharedSolutions[0]);
        }
      }

      // Check shared hobbies (simple word match)
      if (guest1.hobbies && guest2.hobbies) {
        var hobbies1 = guest1.hobbies.toLowerCase().split(/[,;]/);
        var hobbies2 = guest2.hobbies.toLowerCase().split(/[,;]/);
        hobbies1.forEach(function(h1) {
          h1 = h1.trim();
          hobbies2.forEach(function(h2) {
            h2 = h2.trim();
            if (h1 && h2 && (h1.includes(h2) || h2.includes(h1))) {
              reasons.push('Shared interest: ' + h1);
            }
          });
        });
      }

      // Check same agency
      if (guest1.agency && guest2.agency && guest1.agency === guest2.agency) {
        reasons.push('Same agency: ' + guest1.agency);
      }

      if (reasons.length > 0) {
        connections.push({
          contact1: {
            name: (guest1.first_name || '') + ' ' + (guest1.last_name || ''),
            email: guest1.email
          },
          contact2: {
            name: (guest2.first_name || '') + ' ' + (guest2.last_name || ''),
            email: guest2.email
          },
          reason: reasons[0]
        });
      }
    }
  }

  return connections.slice(0, 20); // Limit to top 20 connections
}

/**
 * Export prep report to Google Doc
 * @param {string} eventId - Event ID
 * @returns {Object} Result with document URL
 */
function exportPrepReportToDoc(eventId) {
  try {
    var report = getEventPrepReport(eventId);
    if (report.error) {
      return { success: false, error: report.error };
    }

    var event = report.event;
    var docTitle = 'Event Prep Report - ' + (event.name || 'Unnamed Event');

    // Format date for title
    if (event.start_date) {
      var startDate = new Date(event.start_date);
      var dateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'MMM d, yyyy');
      docTitle += ' (' + dateStr + ')';
    }

    // Create the document
    var doc = DocumentApp.create(docTitle);
    var body = doc.getBody();

    // Set up styles
    var titleStyle = {};
    titleStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    titleStyle[DocumentApp.Attribute.BOLD] = true;
    titleStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#1a73e8';

    var heading1Style = {};
    heading1Style[DocumentApp.Attribute.FONT_SIZE] = 14;
    heading1Style[DocumentApp.Attribute.BOLD] = true;
    heading1Style[DocumentApp.Attribute.FOREGROUND_COLOR] = '#202124';

    var heading2Style = {};
    heading2Style[DocumentApp.Attribute.FONT_SIZE] = 12;
    heading2Style[DocumentApp.Attribute.BOLD] = true;

    var normalStyle = {};
    normalStyle[DocumentApp.Attribute.FONT_SIZE] = 11;
    normalStyle[DocumentApp.Attribute.BOLD] = false;

    var labelStyle = {};
    labelStyle[DocumentApp.Attribute.FONT_SIZE] = 10;
    labelStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#5f6368';
    labelStyle[DocumentApp.Attribute.BOLD] = true;

    // Title
    var title = body.appendParagraph('Event Prep Report');
    title.setAttributes(titleStyle);
    title.setSpacingAfter(4);

    // Event name
    var eventName = body.appendParagraph(event.name || 'Unnamed Event');
    eventName.setAttributes(heading1Style);
    eventName.setSpacingAfter(12);

    // Event details
    var detailsTable = body.appendTable();
    detailsTable.setBorderWidth(0);

    if (event.start_date) {
      var row = detailsTable.appendTableRow();
      var cell1 = row.appendTableCell('Date:');
      cell1.setWidth(80);
      cell1.getChild(0).asText().setAttributes(labelStyle);
      var dateVal = Utilities.formatDate(new Date(event.start_date), Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy');
      if (event.end_date && event.end_date !== event.start_date) {
        dateVal += ' - ' + Utilities.formatDate(new Date(event.end_date), Session.getScriptTimeZone(), 'MMMM d, yyyy');
      }
      row.appendTableCell(dateVal);
    }

    if (event.location) {
      var row = detailsTable.appendTableRow();
      var cell1 = row.appendTableCell('Location:');
      cell1.setWidth(80);
      cell1.getChild(0).asText().setAttributes(labelStyle);
      row.appendTableCell(event.location);
    }

    if (event.event_type) {
      var row = detailsTable.appendTableRow();
      var cell1 = row.appendTableCell('Type:');
      cell1.setWidth(80);
      cell1.getChild(0).asText().setAttributes(labelStyle);
      row.appendTableCell(event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1));
    }

    body.appendParagraph('').setSpacingAfter(8);

    // Summary Stats
    var summaryHeading = body.appendParagraph('Summary');
    summaryHeading.setAttributes(heading1Style);
    summaryHeading.setSpacingAfter(8);

    var summary = report.summary;
    var summaryText = summary.total_guests + ' Guests • ' +
                      summary.total_agencies + ' Agencies • ' +
                      summary.total_connections + ' Connections';
    if (summary.linked_solutions > 0) {
      summaryText += ' • ' + summary.linked_solutions + ' Linked Solutions';
    }
    var summaryPara = body.appendParagraph(summaryText);
    summaryPara.setAttributes(normalStyle);
    summaryPara.setSpacingAfter(16);

    // Agencies Represented
    if (report.agencies_represented && report.agencies_represented.length > 0) {
      var agenciesHeading = body.appendParagraph('Agencies Represented');
      agenciesHeading.setAttributes(heading1Style);
      agenciesHeading.setSpacingAfter(8);

      var agencyList = report.agencies_represented.map(function(a) {
        return a.name + ' (' + a.count + ')';
      }).join(', ');
      var agencyPara = body.appendParagraph(agencyList);
      agencyPara.setAttributes(normalStyle);
      agencyPara.setSpacingAfter(16);
    }

    // Potential Connections
    if (report.potential_connections && report.potential_connections.length > 0) {
      var connHeading = body.appendParagraph('Potential Connections');
      connHeading.setAttributes(heading1Style);
      connHeading.setSpacingAfter(8);

      report.potential_connections.forEach(function(conn) {
        var connPara = body.appendParagraph('• ' + conn.contact1.name + ' & ' + conn.contact2.name);
        connPara.setAttributes(normalStyle);
        var reasonPara = body.appendParagraph('  ' + conn.reason);
        reasonPara.setAttributes(labelStyle);
        reasonPara.setSpacingAfter(4);
      });
      body.appendParagraph('').setSpacingAfter(12);
    }

    // Conversation Starters
    if (report.conversation_starters && report.conversation_starters.length > 0) {
      var startersHeading = body.appendParagraph('Conversation Starters');
      startersHeading.setAttributes(heading1Style);
      startersHeading.setSpacingAfter(8);

      report.conversation_starters.forEach(function(starter) {
        var namePara = body.appendParagraph(starter.name);
        namePara.setAttributes(heading2Style);
        namePara.setSpacingAfter(2);

        starter.topics.forEach(function(topic) {
          var topicPara = body.appendParagraph('• ' + topic.text);
          topicPara.setAttributes(normalStyle);
        });
        body.appendParagraph('').setSpacingAfter(8);
      });
    }

    // Linked Solutions
    if (event.linked_solutions && event.linked_solutions.length > 0) {
      var solHeading = body.appendParagraph('Linked Solutions');
      solHeading.setAttributes(heading1Style);
      solHeading.setSpacingAfter(8);

      var solPara = body.appendParagraph(event.linked_solutions.join(', '));
      solPara.setAttributes(normalStyle);
      solPara.setSpacingAfter(16);
    }

    // Guest Profiles
    var profilesHeading = body.appendParagraph('Guest Profiles');
    profilesHeading.setAttributes(heading1Style);
    profilesHeading.setSpacingAfter(12);

    report.guests.forEach(function(guest) {
      // Guest name
      var guestName = body.appendParagraph(guest.name);
      guestName.setAttributes(heading2Style);
      guestName.setSpacingAfter(2);

      // Title and agency
      var subtitle = [];
      if (guest.title) subtitle.push(guest.title);
      if (guest.agency) subtitle.push(guest.agency);
      if (subtitle.length > 0) {
        var subtitlePara = body.appendParagraph(subtitle.join(' | '));
        subtitlePara.setAttributes(labelStyle);
        subtitlePara.setSpacingAfter(4);
      }

      // Profile details
      var details = [];
      if (guest.education) details.push({ label: 'Education', value: guest.education });
      if (guest.hobbies) details.push({ label: 'Hobbies', value: guest.hobbies });
      if (guest.goals) details.push({ label: 'Goals', value: guest.goals });
      if (guest.early_job) details.push({ label: 'First Job', value: guest.early_job });
      if (guest.relax) details.push({ label: 'Unwinds By', value: guest.relax });
      if (guest.solutions && guest.solutions.length > 0) {
        details.push({ label: 'Solutions', value: guest.solutions.join(', ') });
      }

      if (details.length > 0) {
        details.forEach(function(d) {
          var detailPara = body.appendParagraph(d.label + ': ' + d.value);
          detailPara.setAttributes(normalStyle);
        });
      }

      body.appendParagraph('').setSpacingAfter(12);
    });

    // Footer with generation timestamp
    body.appendParagraph('').setSpacingAfter(20);
    var footerPara = body.appendParagraph('Generated ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy \'at\' h:mm a') + ' via MO-Viewer');
    footerPara.setAttributes(labelStyle);

    // Save and close
    doc.saveAndClose();

    return {
      success: true,
      url: doc.getUrl(),
      docId: doc.getId(),
      title: docTitle
    };
  } catch (e) {
    Logger.log('Error exporting prep report: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Find potential guests based on solution engagements
 * Looks for contacts who have engaged with the event's linked solutions
 * @param {Array} linkedSolutions - Solutions linked to the event
 * @param {Array} existingGuestEmails - Emails of guests already on the list
 * @param {string} eventName - Event name (used to infer solutions)
 * @returns {Array} Potential guests with engagement info
 * @private
 */
function findPotentialGuestsFromEngagements_(linkedSolutions, existingGuestEmails, eventName) {
  var potentialGuests = {};
  var solutionsToSearch = linkedSolutions.slice(); // Copy array

  // Try to infer solutions from event name if none linked
  if (solutionsToSearch.length === 0 && eventName) {
    // Get all solutions and check if any appear in the event name
    try {
      var allSolutions = getSolutions ? getSolutions() : [];
      var eventNameLower = eventName.toLowerCase();
      allSolutions.forEach(function(sol) {
        var solName = sol.core_official_name || sol.core_id || '';
        if (solName && eventNameLower.includes(solName.toLowerCase())) {
          solutionsToSearch.push(solName);
        }
      });
    } catch (e) {
      // getSolutions may not be available
    }
  }

  if (solutionsToSearch.length === 0) {
    return [];
  }

  // Get engagements for each solution
  solutionsToSearch.forEach(function(solutionId) {
    try {
      var engagements = getEngagementsBySolution(solutionId);
      engagements.forEach(function(eng) {
        // Get participant emails from engagement (comma-separated)
        var participantEmails = [];
        if (eng.participants) {
          participantEmails = eng.participants.split(',').map(function(p) {
            return p.trim().toLowerCase();
          }).filter(Boolean);
        }

        // Process each participant
        participantEmails.forEach(function(contactEmail) {
          // Skip if already on guest list
          if (existingGuestEmails.includes(contactEmail)) return;

          // Add or update potential guest entry
          if (!potentialGuests[contactEmail]) {
            potentialGuests[contactEmail] = {
              email: contactEmail,
              contact_name: '',
              agency: eng.agency || eng.agency_id || '',
              solutions: [],
              engagements: [],
              engagement_count: 0,
              last_engagement: null,
              touchpoints: []
            };
          }

          var pg = potentialGuests[contactEmail];
          pg.engagement_count++;

          // Track solutions they've engaged with
          if (solutionId && pg.solutions.indexOf(solutionId) === -1) {
            pg.solutions.push(solutionId);
          }

          // Track engagement types
          if (eng.activity_type && pg.engagements.indexOf(eng.activity_type) === -1) {
            pg.engagements.push(eng.activity_type);
          }

          // Track touchpoints
          if (eng.touchpoint && pg.touchpoints.indexOf(eng.touchpoint) === -1) {
            pg.touchpoints.push(eng.touchpoint);
          }

          // Track most recent engagement
          if (eng.date) {
            var engDate = new Date(eng.date);
            if (!pg.last_engagement || engDate > new Date(pg.last_engagement)) {
              pg.last_engagement = eng.date;
            }
          }
        });
      });
    } catch (e) {
      // getEngagementsBySolution may fail
    }
  });

  // Try to enrich with contact details
  try {
    var allContacts = getAllContacts();
    var contactMap = {};
    allContacts.forEach(function(c) {
      var email = (c.email || '').toLowerCase();
      if (email && !contactMap[email]) {
        contactMap[email] = c;
      }
    });

    Object.keys(potentialGuests).forEach(function(email) {
      var contact = contactMap[email];
      if (contact) {
        var pg = potentialGuests[email];
        pg.first_name = contact.first_name;
        pg.last_name = contact.last_name;
        pg.contact_name = (contact.first_name || '') + ' ' + (contact.last_name || '');
        pg.title = contact.title;
        pg.agency = contact.agency || contact.organization || pg.agency;
        pg.department = contact.department;
      }
    });
  } catch (e) {
    // getAllContacts may fail
  }

  // Convert to array and sort by engagement count
  var result = Object.values(potentialGuests);
  result.sort(function(a, b) {
    return b.engagement_count - a.engagement_count;
  });

  // Return top 15 potential guests
  return result.slice(0, 15).map(function(pg) {
    return {
      email: pg.email,
      name: pg.contact_name || pg.email,
      first_name: pg.first_name,
      last_name: pg.last_name,
      agency: pg.agency,
      title: pg.title,
      solutions: pg.solutions,
      engagement_count: pg.engagement_count,
      engagement_types: pg.engagements,
      touchpoints: pg.touchpoints,
      last_engagement: pg.last_engagement,
      reason: 'Engaged with ' + pg.solutions.join(', ') + ' (' + pg.engagement_count + ' engagements)'
    };
  });
}
