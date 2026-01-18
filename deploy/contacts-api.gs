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
  return MoApi.updateContactTouchpoint(email, touchpoint);
}

function updateContactEngagement(email, level) {
  return MoApi.updateContactEngagement(email, level);
}

function updateContactLastContactDate(email, date) {
  return MoApi.updateContactLastContactDate(email, date);
}

function updateContactNextScheduledContact(email, date) {
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
