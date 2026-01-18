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
