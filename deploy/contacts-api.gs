/**
 * Contacts API - Thin Wrapper
 * ===========================
 * Delegates to MoApi library for Contacts data access.
 * Full implementation in: library/contacts-api.gs
 */

// Core Query Functions
function getAllContacts(limit) {
  return MoApi.getAllContacts(limit);
}

function getContactsBySolution(solutionName, exactMatch) {
  return MoApi.getContactsBySolution(solutionName, exactMatch);
}

function getContactsByEmail(email) {
  return MoApi.getContactsByEmail(email);
}

function getContactById(contactId) {
  return MoApi.getContactById(contactId);
}

function getContactsByIds(contactIds) {
  return MoApi.getContactsByIds(contactIds);
}

function getContactsByName(firstName, lastName) {
  return MoApi.getContactsByName(firstName, lastName);
}

function getContactsByRole(role) {
  return MoApi.getContactsByRole(role);
}

function getContactsByDepartment(department) {
  return MoApi.getContactsByDepartment(department);
}

function getContactsByAgency(agency) {
  return MoApi.getContactsByAgency(agency);
}

function getContactsBySurveyYear(year) {
  return MoApi.getContactsBySurveyYear(year);
}

// Advanced Query Functions
function getContactsMultiFilter(criteria) {
  return MoApi.getContactsMultiFilter(criteria);
}

function getUniqueContacts(contacts) {
  return MoApi.getUniqueContacts(contacts);
}

function getMailingList(solutionPattern) {
  return MoApi.getMailingList(solutionPattern);
}

// Relationship Queries
function getContactSolutions(email) {
  return MoApi.getContactSolutions(email);
}

function getContactsAcrossSolutions(solutionNames) {
  return MoApi.getContactsAcrossSolutions(solutionNames);
}

function getRelatedContacts(email) {
  return MoApi.getRelatedContacts(email);
}

// Statistics & Aggregation
function getContactStats() {
  return MoApi.getContactStats();
}

function getMostEngagedContacts(limit) {
  return MoApi.getMostEngagedContacts(limit);
}

function getStakeholderCountsBySolution() {
  return MoApi.getStakeholderCountsBySolution();
}

function getDepartmentParticipation() {
  return MoApi.getDepartmentParticipation();
}

// Solution-Specific Helpers
function getSolutionStakeholderSummary(solutionName) {
  return MoApi.getSolutionStakeholderSummary(solutionName);
}

function getMultipleSolutionStakeholders(solutionNames) {
  return MoApi.getMultipleSolutionStakeholders(solutionNames);
}

// SEP Pipeline Queries
function getContactsByTouchpoint(touchpoint) {
  return MoApi.getContactsByTouchpoint(touchpoint);
}

function getContactsByEngagementLevel(level) {
  return MoApi.getContactsByEngagementLevel(level);
}

function getContactsByLifecyclePhase(phase) {
  return MoApi.getContactsByLifecyclePhase(phase);
}

function getTouchpointPipelineCounts() {
  return MoApi.getTouchpointPipelineCounts();
}

function getContactsNeedingFollowUp(days) {
  return MoApi.getContactsNeedingFollowUp(days);
}

function getContactsOverdueFollowUp() {
  return MoApi.getContactsOverdueFollowUp();
}

function updateContactTouchpoint(email, touchpoint) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactTouchpoint(email, touchpoint);
}

function updateContactEngagement(email, level) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactEngagement(email, level);
}

function updateContactLastContactDate(email, date) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactLastContactDate(email, date);
}

function updateContactNextScheduledContact(email, date) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactNextScheduledContact(email, date);
}

function getSEPPipelineOverview() {
  return MoApi.getSEPPipelineOverview();
}

function getSEPPipelineContacts() {
  return MoApi.getSEPPipelineContacts();
}

function getTouchpointOptions() {
  return MoApi.getTouchpointOptions();
}

function getEngagementLevelOptions() {
  return MoApi.getEngagementLevelOptions();
}

// Contact Search & Agency Linking
function searchContacts(query) {
  return MoApi.searchContacts(query);
}

function updateContactAgency(email, agencyId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactAgency(email, agencyId);
}

function updateContactEmail(currentEmail, newEmail) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactEmail(currentEmail, newEmail);
}

function exportContactsToSheet(contacts) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.exportContactsToSheet(contacts);
}

// Contact Creation (Auth Required)
function createContact(contactData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createContact(contactData);
}

function createContactForAgency(contactData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createContactForAgency(contactData);
}

// Role Management (Auth Required)
function createRole(contactId, solutionId, role, surveyYear, needId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createRole_(contactId, solutionId, role, surveyYear, needId);
}

function removeRole(roleId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.removeRole_(roleId);
}

// Event Participation
function getContactEvents(contactId) {
  return MoApi.getContactEvents(contactId);
}

function getContactEventsSummary(contactId) {
  return MoApi.getContactEventsSummary(contactId);
}

// Champions Tracking
function getChampionStatusOptions() {
  return MoApi.getChampionStatusOptions();
}

function getChampions(status) {
  return MoApi.getChampions(status);
}

function getChampionsByOwner(ownerEmail) {
  return MoApi.getChampionsByOwner(ownerEmail);
}

function getChampionStats() {
  return MoApi.getChampionStats();
}

function updateContactChampionStatus(email, status) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactChampionStatus(email, status);
}

function updateContactRelationshipOwner(email, ownerEmail) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactRelationshipOwner(email, ownerEmail);
}

function updateContactChampionNotes(email, notes) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateContactChampionNotes(email, notes);
}
