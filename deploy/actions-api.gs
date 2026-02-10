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

function getActionsByAssigneeId(contactId) {
  return MoApi.getActionsByAssigneeId(contactId);
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

// Create/Update Operations (Auth Required)
function createAction(actionData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createAction(actionData);
}

function updateAction(actionId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateAction(actionId, updates);
}

function updateActionStatus(actionId, newStatus) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateActionStatus(actionId, newStatus);
}

function deleteAction(actionId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteAction(actionId);
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

// Team Assignment
function getTeamMembersForAssignment() {
  return MoApi.getTeamMembersForAssignment();
}

function assignAction(actionId, assigneeName, assigneeEmail, sendNotification) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.assignAction(actionId, assigneeName, assigneeEmail, sendNotification);
}

function appendToActionNotes(actionId, noteText) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.appendToActionNotes(actionId, noteText);
}
