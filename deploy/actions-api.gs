/**
 * Actions API - Thin Wrapper
 * ==========================
 * Delegates to MoApi library for Actions data access.
 * Full implementation in: library/actions-api.gs
 */

// Cache Management
function clearActionsCache() {
  return MoApi.clearActionsCache();
}

// Core Data Access
function getAllActions(limit) {
  return MoApi.getAllActions(limit);
}

function getActionById(actionId) {
  return MoApi.getActionById(actionId);
}

// Filtered Queries
function getActionsByStatus(status) {
  return MoApi.getActionsByStatus(status);
}

function getActionsByCategory(category) {
  return MoApi.getActionsByCategory(category);
}

function getActionsByAssignee(assignee) {
  return MoApi.getActionsByAssignee(assignee);
}

function getOpenActions() {
  return MoApi.getOpenActions();
}

function getOverdueActions() {
  return MoApi.getOverdueActions();
}

// Statistics
function getActionPipelineCounts() {
  return MoApi.getActionPipelineCounts();
}

function getActionCategoryCounts() {
  return MoApi.getActionCategoryCounts();
}

function getActionAssigneeCounts() {
  return MoApi.getActionAssigneeCounts();
}

function getActionsStats() {
  return MoApi.getActionsStats();
}

function getActionsOverview() {
  return MoApi.getActionsOverview();
}

// Create/Update Operations
function createAction(actionData) {
  return MoApi.createAction(actionData);
}

function updateAction(actionId, updates) {
  return MoApi.updateAction(actionId, updates);
}

function updateActionStatus(actionId, newStatus) {
  return MoApi.updateActionStatus(actionId, newStatus);
}

// Helpers
function getUniqueAssignees() {
  return MoApi.getUniqueAssignees();
}

function getUniqueCategories() {
  return MoApi.getUniqueCategories();
}

function getUniqueSolutions() {
  return MoApi.getUniqueSolutions();
}
