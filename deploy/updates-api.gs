/**
 * Updates API - Thin Wrapper
 * ==========================
 * Delegates to MoApi library for Updates data access.
 * Full implementation in: library/updates-api.gs
 */

// Cache Management
function clearUpdatesCache() {
  return MoApi.clearUpdatesCache();
}

// Core Data Access
function getAllUpdates(limit, daysBack) {
  return MoApi.getAllUpdates(limit, daysBack);
}

// Solution-Specific Queries
function getUpdatesBySolution(solutionName, limit, daysBack) {
  return MoApi.getUpdatesBySolution(solutionName, limit, daysBack);
}

function getRecentUpdatesBySolution(solutionName, days) {
  return MoApi.getRecentUpdatesBySolution(solutionName, days);
}

function getUpdatesBySolutionInRange(solutionName, daysBack) {
  return MoApi.getUpdatesBySolutionInRange(solutionName, daysBack);
}

function getUpdatesForSolutionCard(solutionName) {
  return MoApi.getUpdatesForSolutionCard(solutionName);
}

// Cross-Solution Queries
function getRecentUpdates(days, limit) {
  return MoApi.getRecentUpdates(days, limit);
}

function getUpdatesGroupedBySolution(daysBack) {
  return MoApi.getUpdatesGroupedBySolution(daysBack);
}

// Statistics
function getUpdatesStats(daysBack) {
  return MoApi.getUpdatesStats(daysBack);
}

// Report Data
function getHistoricalUpdatesForReport(solutionName) {
  return MoApi.getHistoricalUpdatesForReport(solutionName);
}

function getAllHistoricalUpdatesForReport(yearTabs, solutionFilter, maxUpdates) {
  // Query specific year tabs and filter by solution server-side
  return MoApi.getAllHistoricalUpdatesForReport(yearTabs, solutionFilter, maxUpdates || 500);
}

// Debug
function debugUpdatesData() {
  return MoApi.debugUpdatesData();
}
