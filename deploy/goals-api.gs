/**
 * Goals API - Thin Wrapper
 * ========================
 * Delegates to MoApi library for Goals data access.
 * Full implementation in: library/goals-api.gs
 */

// Mission & Vision
function getMissionVision() {
  return MoApi.getMissionVision();
}

function updateMissionVision(data) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateMissionVision(data);
}

// Program Increments
function getAllPIs() {
  return MoApi.getAllPIs();
}

function getActivePI() {
  return MoApi.getActivePI();
}

function createPI(data) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createPI(data);
}

function updatePI(piId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updatePI(piId, updates);
}

// Objectives (each row = one acceptance criterion)
function getObjectivesByPI(piId) {
  return MoApi.getObjectivesByPI(piId);
}

function createObjective(data) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createObjective(data);
}

function updateObjective(objectiveId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateObjective(objectiveId, updates);
}

function deleteObjective(objectiveId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteObjective(objectiveId);
}

function toggleObjectiveStatus(objectiveId, newStatus) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.toggleObjectiveStatus(objectiveId, newStatus);
}

// Statistics & Init
function getGoalsStats() {
  return MoApi.getGoalsStats();
}

function getGoalsInitData() {
  return MoApi.getGoalsInitData();
}

function getGoalObjectiveStatusOptions() {
  return MoApi.getGoalObjectiveStatusOptions();
}
