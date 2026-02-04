/**
 * Solutions API - Thin Wrapper
 * ============================
 * Delegates to MoApi library for Solutions data access.
 * Full implementation in: library/solutions-api.gs
 */

function getAllSolutions() {
  return MoApi.getAllSolutions();
}

function getSolutions() {
  return MoApi.getSolutions();
}

function getSolution(solutionId) {
  return MoApi.getSolution(solutionId);
}

function getSolutionsByCycle(cycle) {
  return MoApi.getSolutionsByCycle(cycle);
}

function getSolutionsByPhase(phase) {
  return MoApi.getSolutionsByPhase(phase);
}

function searchSolutions(query) {
  return MoApi.searchSolutions(query);
}

function getSolutionGroups() {
  return MoApi.getSolutionGroups();
}

function getSolutionStats() {
  return MoApi.getSolutionStats();
}

function debugGetSolutions() {
  return MoApi.debugGetSolutions();
}

function getSampleSolutions() {
  return MoApi.getSampleSolutions();
}

function getImplementationViewerHTML() {
  return MoApi.getImplementationViewerHTML();
}

function buildSolutionNameMap() {
  return MoApi.buildSolutionNameMap();
}

function getSolutionIdByName(name) {
  return MoApi.getSolutionIdByName(name);
}

function getSolutionShortNames() {
  return MoApi.getSolutionShortNames();
}

function findSolutionIdsInText(text) {
  return MoApi.findSolutionIdsInText(text);
}

function clearSolutionNameMapCache() {
  return MoApi.clearSolutionNameMapCache();
}

function clearSolutionsCache() {
  return MoApi.clearSolutionsCache();
}

// Key Messages Functions
function getKeyMessages(solutionId) {
  return MoApi.getKeyMessages(solutionId);
}

function getSolutionsWithKeyMessages() {
  return MoApi.getSolutionsWithKeyMessages();
}

function getKeyMessagesSummary() {
  return MoApi.getKeyMessagesSummary();
}

function searchKeyMessages(query) {
  return MoApi.searchKeyMessages(query);
}

// SEP Milestone Functions
function getSEPMilestones() {
  return MoApi.getSEPMilestones();
}

function getSolutionSEPProgress(solution) {
  return MoApi.getSolutionSEPProgress(solution);
}

function getSolutionsWithSEPProgress() {
  return MoApi.getSolutionsWithSEPProgress();
}

function getSolutionsBySEPMilestone() {
  return MoApi.getSolutionsBySEPMilestone();
}

function getSEPPipelineStats() {
  return MoApi.getSEPPipelineStats();
}

function updateSolutionSEPMilestone(solutionId, milestoneId, date) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateSolutionSEPMilestone(solutionId, milestoneId, date);
}

function getSEPCycles() {
  return MoApi.getSEPCycles();
}

function getSolutionsNeedingOutreach(threshold) {
  return MoApi.getSolutionsNeedingOutreach(threshold);
}

// Application Sector Functions
function getApplicationSectors() {
  return MoApi.getApplicationSectors();
}

function getSolutionsBySector(sector) {
  return MoApi.getSolutionsBySector(sector);
}

function getSurveysBySector(sector) {
  return MoApi.getSurveysBySector(sector);
}

function getSectorSummary() {
  return MoApi.getSectorSummary();
}

// Recent Activity (Aggregated)
function getSolutionRecentActivity(solutionId, days) {
  return MoApi.getSolutionRecentActivity(solutionId, days);
}
