/**
 * Team API - Thin Wrapper
 * =======================
 * Delegates to MoApi library for Team data access.
 * Full implementation in: library/team-api.gs
 */

// Internal Team (from Contacts)
function getInternalTeam() {
  return MoApi.getInternalTeam();
}

function getInternalTeamByTeam(teamName) {
  return MoApi.getInternalTeamByTeam(teamName);
}

function getInternalTeamStats() {
  return MoApi.getInternalTeamStats();
}

// Team Profiles (About Me) - profile fields are now in MO-DB_Contacts
// getInternalTeam() includes profile fields directly
function getInternalTeamWithProfiles() {
  return MoApi.getInternalTeamWithProfiles();
}

// Availability
function getAvailability() {
  return MoApi.getAvailability();
}

function getAvailabilityByContact(contactName) {
  return MoApi.getAvailabilityByContact(contactName);
}

function getAvailabilityInRange(startDate, endDate) {
  return MoApi.getAvailabilityInRange(startDate, endDate);
}

function getUpcomingAvailability(days) {
  return MoApi.getUpcomingAvailability(days);
}

function addAvailability(data) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.addAvailability(data);
}

function updateAvailability(availabilityId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateAvailability(availabilityId, updates);
}

function deleteAvailability(availabilityId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteAvailability(availabilityId);
}

// Meetings
function getAllMeetings() {
  return MoApi.getAllMeetings();
}

function getMeetingById(meetingId) {
  return MoApi.getMeetingById(meetingId);
}

function getMeetingsByDay(day) {
  return MoApi.getMeetingsByDay(day);
}

function getMeetingsByCategory(category) {
  return MoApi.getMeetingsByCategory(category);
}

function getActiveMeetings() {
  return MoApi.getActiveMeetings();
}

function getWeeklySchedule() {
  return MoApi.getWeeklySchedule();
}

function addMeeting(data) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.addMeeting(data);
}

function updateMeeting(meetingId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateMeeting(meetingId, updates);
}

function deleteMeeting(meetingId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteMeeting(meetingId);
}

// Glossary
function getGlossaryTerms() {
  return MoApi.getGlossaryTerms();
}

function getGlossaryTermById(termId) {
  return MoApi.getGlossaryTermById(termId);
}

function searchGlossary(query) {
  return MoApi.searchGlossary(query);
}

function getGlossaryByCategory(category) {
  return MoApi.getGlossaryByCategory(category);
}

function addGlossaryTerm(data) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.addGlossaryTerm(data);
}

function updateGlossaryTerm(termId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateGlossaryTerm(termId, updates);
}

function deleteGlossaryTerm(termId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteGlossaryTerm(termId);
}

// Team Overview
function getTeamOverview() {
  return MoApi.getTeamOverview();
}

// Directing Documents
function getDirectingDocuments() {
  return MoApi.getDirectingDocuments();
}

function getDirectingDocumentsByCategory() {
  return MoApi.getDirectingDocumentsByCategory();
}

function getDirectingDocumentsCount() {
  return MoApi.getDirectingDocumentsCount();
}

// Email Templates
function getEmailTemplatesDocUrl() {
  return MoApi.getEmailTemplatesDocUrl();
}

function getEmailTemplates() {
  return MoApi.getEmailTemplates();
}
