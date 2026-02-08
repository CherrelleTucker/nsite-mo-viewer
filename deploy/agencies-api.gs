/**
 * Agencies API - Thin Wrapper
 * ===========================
 * Delegates to MoApi library for Agencies data access.
 * Full implementation in: library/agencies-api.gs
 *
 * DATABASE STRUCTURE (v4.0):
 * MO-DB_Agencies: Multi-tab (Departments + Agencies + Organizations)
 */

// Department CRUD
function getAllDepartments() {
  return MoApi.getAllDepartments();
}

function getDepartmentById(departmentId) {
  return MoApi.getDepartmentById(departmentId);
}

function getAgenciesByDepartment(departmentId) {
  return MoApi.getAgenciesByDepartment(departmentId);
}

function createDepartment(deptData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createDepartment(deptData);
}

function updateDepartment(departmentId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateDepartment(departmentId, updates);
}

// Agency CRUD
function getAllAgencies() {
  return MoApi.getAllAgencies();
}

function getAgencyById(agencyId) {
  return MoApi.getAgencyById(agencyId);
}

function createAgency(agencyData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createAgency(agencyData);
}

function updateAgency(agencyId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateAgency(agencyId, updates);
}

function deleteAgency(agencyId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.deleteAgency(agencyId);
}

// Organization CRUD
function getAllOrganizations() {
  return MoApi.getAllOrganizations();
}

function getOrganizationById(orgId) {
  return MoApi.getOrganizationById(orgId);
}

function getOrganizationsByAgency(agencyId) {
  return MoApi.getOrganizationsByAgency(agencyId);
}

function createOrganization(orgData) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.createOrganization(orgData);
}

function updateOrganization(orgId, updates) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.updateOrganization(orgId, updates);
}

// Agency Resolver (read-only — no auth needed)
function resolveAgency(agencyId) {
  return MoApi.resolveAgency_(agencyId);
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

// Engagement Integration
function getAgencyEngagementStats(agencyId) {
  return MoApi.getAgencyEngagementStats(agencyId);
}

function getAgencyEngagementTimeline(agencyId, limit) {
  return MoApi.getAgencyEngagementTimeline(agencyId, limit);
}

function getContactSolutionTags(email) {
  return MoApi.getContactSolutionTags(email);
}

function getAgencyContactsWithTags(agencyId) {
  return MoApi.getAgencyContactsWithTags(agencyId);
}

function getCrossAgencyNetwork(agencyId) {
  return MoApi.getCrossAgencyNetwork(agencyId);
}
