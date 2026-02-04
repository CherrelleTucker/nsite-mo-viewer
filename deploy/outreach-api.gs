/**
 * Outreach API - Thin Wrapper
 * ===========================
 * Delegates to MoApi library for Outreach/Events data access.
 * Full implementation in: library/outreach-api.gs
 */

// Core CRUD Operations
function getAllEvents(limit) {
  return MoApi.getAllEvents(limit);
}

function getEventById(eventId) {
  return MoApi.getEventById(eventId);
}

function updateEvent(eventId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateEvent(eventId, updates);
}

function updateEventStatus(eventId, newStatus) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateEventStatus(eventId, newStatus);
}

function deleteEvent(eventId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteEvent(eventId);
}

function createEvent(eventData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createEvent(eventData);
}

// Query Functions
function getEventsByStatus(status) {
  return MoApi.getEventsByStatus(status);
}

function getEventsByYear(year) {
  return MoApi.getEventsByYear(year);
}

function getEventsByType(eventType) {
  return MoApi.getEventsByType(eventType);
}

function getEventsBySector(sector) {
  return MoApi.getEventsBySector(sector);
}

function getUpcomingEvents(days) {
  return MoApi.getUpcomingEvents(days);
}

function getUpcomingDeadlines(days) {
  return MoApi.getUpcomingDeadlines(days);
}

function getConfirmedEvents(year) {
  return MoApi.getConfirmedEvents(year);
}

function getPotentialEvents() {
  return MoApi.getPotentialEvents();
}

function searchEvents(query) {
  return MoApi.searchEvents(query);
}

// Event Discovery
function discoverEvents(topic, maxResults) {
  return MoApi.discoverEvents(topic, maxResults);
}

function addDiscoveredEvent(eventData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.addDiscoveredEvent(eventData);
}

function discoverEventsBySector(sector) {
  return MoApi.discoverEventsBySector(sector);
}

function discoverEventsForAllSectors() {
  return MoApi.discoverEventsForAllSectors();
}

// Statistics & Overview
function getOutreachStats() {
  return MoApi.getOutreachStats();
}

function getOutreachOverview() {
  return MoApi.getOutreachOverview();
}

function getEventsForUI() {
  return MoApi.getEventsForUI();
}

// Helper Functions
function getEventTypeOptions() {
  return MoApi.getEventTypeOptions();
}

function getEventStatusOptions() {
  return MoApi.getEventStatusOptions();
}

function getPrioritySectorOptions() {
  return MoApi.getPrioritySectorOptions();
}

function eventExists(eventName) {
  return MoApi.eventExists(eventName);
}

// Guest List Management
function addGuestToEvent(eventId, contactEmail) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.addGuestToEvent(eventId, contactEmail);
}

function removeGuestFromEvent(eventId, contactEmail) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.removeGuestFromEvent(eventId, contactEmail);
}

function getEventGuests(eventId) {
  return MoApi.getEventGuests(eventId);
}

function markGuestAttended(eventId, contactEmail, attended) {
  return MoApi.markGuestAttended(eventId, contactEmail, attended);
}

// Prep Report
function getEventPrepReport(eventId) {
  return MoApi.getEventPrepReport(eventId);
}

function exportPrepReportToDoc(eventId) {
  return MoApi.exportPrepReportToDoc(eventId);
}
