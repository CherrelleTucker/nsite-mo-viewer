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
    return JSON.parse(JSON.stringify(events.slice(0, limit)));
  }
  return JSON.parse(JSON.stringify(events));
}

/**
 * Get event by ID
 */
function getEventById(eventId) {
  var events = loadAllEvents_();
  var event = events.find(function(e) {
    return e.event_id === eventId;
  });
  return event ? JSON.parse(JSON.stringify(event)) : null;
}

/**
 * Create a new event (internal - used by web search)
 */
function createEvent_(eventData) {
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

  return eventData;
}

/**
 * Update an event
 */
function updateEvent(eventId, updates) {
  var sheet = getOutreachSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('event_id');
  if (idColIndex === -1) {
    throw new Error('event_id column not found');
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === eventId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return null;
  }

  headers.forEach(function(header, colIndex) {
    if (updates.hasOwnProperty(header) && header !== 'event_id' && header !== 'created_at') {
      sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[header]);
    }
  });

  clearOutreachCache_();
  return getEventById(eventId);
}

/**
 * Update event status
 */
function updateEventStatus(eventId, newStatus) {
  return updateEvent(eventId, { status: newStatus });
}

/**
 * Delete an event
 */
function deleteEvent(eventId) {
  var sheet = getOutreachSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('event_id');
  if (idColIndex === -1) return false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === eventId) {
      sheet.deleteRow(i + 1);
      clearOutreachCache_();
      return true;
    }
  }

  return false;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get events by status
 */
function getEventsByStatus(status) {
  var events = loadAllEvents_();
  var results = events.filter(function(e) {
    return e.status && e.status.toLowerCase() === status.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get events by year
 */
function getEventsByYear(year) {
  var events = loadAllEvents_();
  var results = events.filter(function(e) {
    return e.year === year || (e.start_date && new Date(e.start_date).getFullYear() === year);
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get events by type
 */
function getEventsByType(eventType) {
  var events = loadAllEvents_();
  var results = events.filter(function(e) {
    return e.event_type && e.event_type.toLowerCase() === eventType.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get events by sector
 */
function getEventsBySector(sector) {
  var events = loadAllEvents_();
  var sectorLower = sector.toLowerCase();
  var results = events.filter(function(e) {
    return e.sector && e.sector.toLowerCase().indexOf(sectorLower) !== -1;
  });
  return JSON.parse(JSON.stringify(results));
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

  return JSON.parse(JSON.stringify(results));
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

  return JSON.parse(JSON.stringify(results));
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
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get potential events (opportunities)
 */
function getPotentialEvents() {
  var events = loadAllEvents_();
  var results = events.filter(function(e) {
    return e.status === 'potential';
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Search events by name
 */
function searchEvents(query) {
  var events = loadAllEvents_();
  var queryLower = query.toLowerCase();

  var results = events.filter(function(e) {
    return (e.name && e.name.toLowerCase().indexOf(queryLower) !== -1) ||
           (e.stakeholders && e.stakeholders.toLowerCase().indexOf(queryLower) !== -1) ||
           (e.sector && e.sector.toLowerCase().indexOf(queryLower) !== -1);
  });

  return JSON.parse(JSON.stringify(results));
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

  if (titleLower.indexOf('workshop') !== -1) return 'workshop';
  if (titleLower.indexOf('webinar') !== -1 || titleLower.indexOf('virtual') !== -1) return 'webinar';
  if (titleLower.indexOf('meeting') !== -1 || titleLower.indexOf('summit') !== -1) return 'meeting';

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

  return createEvent_(eventData);
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
      solution_names: e.solution_names,
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
