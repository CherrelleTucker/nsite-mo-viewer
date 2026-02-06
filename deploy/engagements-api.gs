/**
 * Engagements API - Thin Wrapper
 * ==============================
 * Delegates to MoApi library for Engagements data access.
 * Full implementation in: library/engagements-api.gs
 */

// Core CRUD Operations
function getAllEngagements(limit) {
  return MoApi.getAllEngagements(limit);
}

function getEngagementById(engagementId) {
  return MoApi.getEngagementById(engagementId);
}

function createEngagement(engagementData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createEngagement(engagementData);
}

function updateEngagement(engagementId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateEngagement(engagementId, updates);
}

function deleteEngagement(engagementId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteEngagement(engagementId);
}

// Query by Relationship
function getEngagementsByContact(contactId) {
  return MoApi.getEngagementsByContact(contactId);
}

function getEngagementsByAgency(agencyId) {
  return MoApi.getEngagementsByAgency(agencyId);
}

function getEngagementsBySolution(solutionId) {
  return MoApi.getEngagementsBySolution(solutionId);
}

// Query by Attributes
function getEngagementsByActivityType(activityType) {
  return MoApi.getEngagementsByActivityType(activityType);
}

function getEngagementsByTouchpoint(touchpoint) {
  return MoApi.getEngagementsByTouchpoint(touchpoint);
}

function getEngagementsByDateRange(startDate, endDate) {
  return MoApi.getEngagementsByDateRange(startDate, endDate);
}

// Recent & Upcoming Queries
function getRecentEngagements(days, limit) {
  return MoApi.getRecentEngagements(days, limit);
}

function getUpcomingFollowUps(days) {
  return MoApi.getUpcomingFollowUps(days);
}

function getOverdueFollowUps() {
  return MoApi.getOverdueFollowUps();
}

// Statistics & Aggregation
function getEngagementStats() {
  return MoApi.getEngagementStats();
}

function getSEPDashboardStats() {
  return MoApi.getSEPDashboardStats();
}

function getEngagementsByLogger(limit) {
  return MoApi.getEngagementsByLogger(limit);
}

function getEngagementCountsByAgency() {
  return MoApi.getEngagementCountsByAgency();
}

// Helper Functions
function getActivityTypeOptions() {
  return MoApi.getActivityTypeOptions();
}

function getDirectionOptions() {
  return MoApi.getDirectionOptions();
}

function logQuickEngagement(params) {
  return MoApi.logQuickEngagement(params);
}

// SEP Page Combined Init (Performance Optimization)
function getSEPInitData() {
  return MoApi.getSEPInitData();
}

// Event-Specific Queries
function getAllEvents(limit) {
  return MoApi.getAllEvents(limit);
}

function getEventsForSolution(solutionId) {
  return MoApi.getEventsForSolution(solutionId);
}

function getUpcomingEvents(limit) {
  return MoApi.getUpcomingEvents(limit);
}

function getEventsForContact(contactId) {
  return MoApi.getEventsForContact(contactId);
}

function getEventsByStatus(status) {
  return MoApi.getEventsByStatus(status);
}

// Event Artifact Management
function addArtifact(engagementId, artifact) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.addArtifact(engagementId, artifact);
}

function removeArtifact(engagementId, artifactIndex) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.removeArtifact(engagementId, artifactIndex);
}

function updateArtifactCommsAssetId(engagementId, artifactIndex, commsAssetId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateArtifactCommsAssetId(engagementId, artifactIndex, commsAssetId);
}

function getArtifacts(engagementId) {
  return MoApi.getArtifacts(engagementId);
}

function getEventStatusOptions() {
  return MoApi.getEventStatusOptions();
}

function getArtifactTypeOptions() {
  return MoApi.getArtifactTypeOptions();
}
