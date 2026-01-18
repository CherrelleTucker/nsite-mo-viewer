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
  return MoApi.updateEvent(eventId, updates);
}

function updateEventStatus(eventId, newStatus) {
  return MoApi.updateEventStatus(eventId, newStatus);
}

function deleteEvent(eventId) {
  return MoApi.deleteEvent(eventId);
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
