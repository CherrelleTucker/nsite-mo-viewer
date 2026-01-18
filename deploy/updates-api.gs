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
function getAllUpdates(limit) {
  return MoApi.getAllUpdates(limit);
}

// Solution-Specific Queries
function getUpdatesBySolution(solutionName, limit) {
  return MoApi.getUpdatesBySolution(solutionName, limit);
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

function getUpdatesGroupedBySolution() {
  return MoApi.getUpdatesGroupedBySolution();
}

// Statistics
function getUpdatesStats() {
  return MoApi.getUpdatesStats();
}

// Report Data
function getHistoricalUpdatesForReport(solutionName) {
  return MoApi.getHistoricalUpdatesForReport(solutionName);
}

function getAllHistoricalUpdatesForReport() {
  return MoApi.getAllHistoricalUpdatesForReport();
}
