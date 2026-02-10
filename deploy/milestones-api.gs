/**
 * Milestones API - Thin Wrapper
 * =============================
 * Delegates to MoApi library for Milestones data access.
 * Full implementation in: library/milestones-api.gs
 */

// Core Query Functions
function getAllMilestones() {
  return MoApi.getAllMilestones();
}

function getMilestonesBySolution(solutionId) {
  return MoApi.getMilestonesBySolution(solutionId);
}

function getMilestonesByType(type) {
  return MoApi.getMilestonesByType(type);
}

function getMilestonesByStatus(status) {
  return MoApi.getMilestonesByStatus(status);
}

function getMilestonesByCycle(cycle) {
  return MoApi.getMilestonesByCycle(cycle);
}

function getUpcomingMilestones(days) {
  return MoApi.getUpcomingMilestones(days);
}

function getOverdueMilestones() {
  return MoApi.getOverdueMilestones();
}

// Statistics & Summaries
function getMilestoneStats() {
  return MoApi.getMilestoneStats();
}

function getSolutionMilestoneSummary(solutionId) {
  return MoApi.getSolutionMilestoneSummary(solutionId);
}

function getSolutionMilestoneTimeline(solutionId) {
  return MoApi.getSolutionMilestoneTimeline(solutionId);
}

// Dashboard Helpers
function getMultipleSolutionMilestones(solutionIds) {
  return MoApi.getMultipleSolutionMilestones(solutionIds);
}

function getMilestoneCountsBySolution() {
  return MoApi.getMilestoneCountsBySolution();
}

function searchMilestones(query) {
  return MoApi.searchMilestones(query);
}

// PI Integration & Write Functions
function getMilestonesForPI(startDate, endDate) {
  return MoApi.getMilestonesForPI(startDate, endDate);
}

function toggleMilestoneCompletion(milestoneId, completed) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.toggleMilestoneCompletion(milestoneId, completed);
}

function updateMilestone(milestoneId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateMilestone(milestoneId, updates);
}
