/**
 * Agencies API - Thin Wrapper
 * ===========================
 * Delegates to MoApi library for Agencies data access.
 * Full implementation in: library/agencies-api.gs
 */

// Core CRUD Operations
function getAllAgencies() {
  return MoApi.getAllAgencies();
}

function getAgencyById(agencyId) {
  return MoApi.getAgencyById(agencyId);
}

function createAgency(agencyData) {
  return MoApi.createAgency(agencyData);
}

function updateAgency(agencyId, updates) {
  return MoApi.updateAgency(agencyId, updates);
}

function deleteAgency(agencyId) {
  return MoApi.deleteAgency(agencyId);
}

// Hierarchy Queries
function getRootAgencies() {
  return MoApi.getRootAgencies();
}

function getSubAgencies(parentId) {
  return MoApi.getSubAgencies(parentId);
}

function getAgencyHierarchy() {
  return MoApi.getAgencyHierarchy();
}

function getAgencyAncestry(agencyId) {
  return MoApi.getAgencyAncestry(agencyId);
}

// Search & Filter Queries
function searchAgencies(query) {
  return MoApi.searchAgencies(query);
}

function getAgenciesByType(agencyType) {
  return MoApi.getAgenciesByType(agencyType);
}

function getAgenciesByRelationshipStatus(status) {
  return MoApi.getAgenciesByRelationshipStatus(status);
}

function getAgenciesByGeographicScope(scope) {
  return MoApi.getAgenciesByGeographicScope(scope);
}

// Contact Integration
function getAgencyContacts(agencyId) {
  return MoApi.getAgencyContacts(agencyId);
}

function getAgencyStats(agencyId) {
  return MoApi.getAgencyStats(agencyId);
}

// Summary Queries
function getAgenciesOverview() {
  return MoApi.getAgenciesOverview();
}
