/**
 * MO-APIs Library - Agencies API
 * ===============================
 * Organization hierarchy and agency profile management.
 * Three-level hierarchy: Departments → Agencies → Organizations
 *
 * DATABASE STRUCTURE (v4.0):
 * MO-DB_Agencies is a multi-tab Google Sheet:
 *   - "Departments" tab: One row per federal department (~15 rows)
 *   - "Agencies" tab: One row per agency with department_id FK (~45 rows)
 *   - "Organizations" tab: One row per sub-unit with agency_id FK (variable)
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs, contacts-api.gs (for getAgencyContacts)
 */

// ============================================================================
// DATA ACCESS — Multi-Tab Loading
// ============================================================================

var AGENCIES_CONFIG_KEY = 'AGENCIES_SHEET_ID';

/**
 * Load all departments from the Departments tab.
 * @returns {Array} Department records
 */
function loadDepartments_() {
  return loadSheetTab_(AGENCIES_CONFIG_KEY, 'Departments', '_departmentsCache');
}

/**
 * Load all agencies from the Agencies tab.
 * Filters to only records with a valid agency_id.
 * @returns {Array} Agency records
 */
function loadAllAgencies_() {
  var allData = loadSheetTab_(AGENCIES_CONFIG_KEY, 'Agencies', '_agenciesCache');
  return allData.filter(function(a) { return a.agency_id; });
}

/**
 * Load all organizations from the Organizations tab.
 * @returns {Array} Organization records
 */
function loadOrganizations_() {
  return loadSheetTab_(AGENCIES_CONFIG_KEY, 'Organizations', '_organizationsCache');
}

/**
 * Clear all agencies caches (Departments, Agencies, Organizations, resolver).
 */
function clearAgenciesCache_() {
  clearSheetDataCache('_departmentsCache');
  clearSheetDataCache('_agenciesCache');
  clearSheetDataCache('_organizationsCache');
  clearSheetDataCache('_agencyResolverCache');
}

// ============================================================================
// AGENCY RESOLVER — Central lookup for agency_id → display names
// ============================================================================

/**
 * Build cached lookup map: agency_id → { agency_name, department_name, ... }
 * Used by contacts-api, outreach-api, and other APIs to resolve agency_id FKs
 * to human-readable names without loading the full agencies database.
 * @returns {Object} Map of agency_id → resolved info
 */
function buildAgencyResolver_() {
  var cacheKey = '_agencyResolverCache';
  if (_sheetDataCache[cacheKey]) return _sheetDataCache[cacheKey];

  var agencies = loadAllAgencies_();

  // Build lookup map by agency_id for parent resolution
  var agencyMap = {};
  agencies.forEach(function(a) { agencyMap[a.agency_id] = a; });

  var resolver = {};
  agencies.forEach(function(a) {
    // Walk parent_department_id to find the top-level parent ("department")
    var parent = agencyMap[a.parent_department_id] || {};
    resolver[a.agency_id] = {
      agency_name: a.name || a.full_name || '',
      agency_abbreviation: a.abbreviation || '',
      agency_full_name: a.full_name || '',
      department_name: parent.name || parent.full_name || '',
      department_abbreviation: parent.abbreviation || '',
      department_id: a.parent_department_id || ''
    };
  });

  _sheetDataCache[cacheKey] = resolver;
  return resolver;
}

/**
 * Resolve a single agency_id to display info.
 * @param {string} agencyId - Agency ID to resolve
 * @returns {Object} { agency_name, agency_abbreviation, department_name, department_abbreviation, department_id }
 */
function resolveAgency_(agencyId) {
  if (!agencyId) return { agency_name: '', department_name: '', agency_abbreviation: '', department_abbreviation: '', department_id: '' };
  var resolver = buildAgencyResolver_();
  return resolver[agencyId] || { agency_name: '', department_name: '', agency_abbreviation: '', department_abbreviation: '', department_id: '' };
}

// ============================================================================
// DEPARTMENT CRUD
// ============================================================================

/**
 * Get all departments
 * @returns {Array} All department records
 */
function getAllDepartments() {
  return deepCopy(loadDepartments_());
}

/**
 * Get department by ID
 * @param {string} departmentId - Department ID
 * @returns {Object|null} Department record or null
 */
function getDepartmentById(departmentId) {
  return getById(loadDepartments_(), 'department_id', departmentId);
}

/**
 * Get agencies belonging to a department
 * @param {string} departmentId - Department ID
 * @returns {Array} Agencies in this department
 */
function getAgenciesByDepartment(departmentId) {
  return filterByProperty(loadAllAgencies_(), 'parent_department_id', departmentId, true);
}

/**
 * Create a new department
 * @param {Object} deptData - Department data
 * @returns {Object} {success, data, error}
 */
function createDepartment(deptData) {
  try {
    if (!deptData.name || !String(deptData.name).trim()) {
      return { success: false, error: 'Department name is required' };
    }

    var sheetInfo = getSheetTabForWrite_(AGENCIES_CONFIG_KEY, 'Departments');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    if (!deptData.department_id) {
      var abbr = (deptData.abbreviation || deptData.name || '').substring(0, 5).toLowerCase();
      deptData.department_id = 'DEP_' + abbr;
    }

    var newRow = headers.map(function(header) {
      return deptData[header] !== undefined ? deptData[header] : '';
    });

    sheet.appendRow(newRow);
    clearAgenciesCache_();

    return { success: true, data: deptData };
  } catch (e) {
    Logger.log('Error in createDepartment: ' + e.message);
    return { success: false, error: 'Failed to create department: ' + e.message };
  }
}

/**
 * Update a department
 * @param {string} departmentId - Department ID
 * @param {Object} updates - Fields to update
 * @returns {Object} {success, data, error}
 */
function updateDepartment(departmentId, updates) {
  try {
    if (!departmentId) {
      return { success: false, error: 'Department ID is required' };
    }

    var sheetInfo = getSheetTabForWrite_(AGENCIES_CONFIG_KEY, 'Departments');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    var rowIndex = findRowByField_(sheet, headers, 'department_id', departmentId);
    if (rowIndex === -1) {
      return { success: false, error: 'Department not found: ' + departmentId };
    }

    headers.forEach(function(header, colIndex) {
      if (updates.hasOwnProperty(header) && header !== 'department_id') {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updates[header]);
      }
    });

    clearAgenciesCache_();
    return { success: true, data: getDepartmentById(departmentId) };
  } catch (e) {
    Logger.log('Error in updateDepartment: ' + e.message);
    return { success: false, error: 'Failed to update department: ' + e.message };
  }
}

// ============================================================================
// AGENCY CRUD (updated for multi-tab)
// ============================================================================

/**
 * Get all agencies
 * @returns {Array} All agency records
 */
function getAllAgencies() {
  return deepCopy(loadAllAgencies_());
}

/**
 * Get agency by ID
 * @param {string} agencyId - Agency ID
 * @returns {Object|null} Agency record or null
 */
function getAgencyById(agencyId) {
  return getById(loadAllAgencies_(), 'agency_id', agencyId);
}

/**
 * Create a new agency
 * @param {Object} agencyData - Agency data
 * @returns {Object} {success, data, error}
 */
function createAgency(agencyData) {
  try {
    if (!agencyData.name || !String(agencyData.name).trim()) {
      return { success: false, error: 'Agency name is required' };
    }

    var sheetInfo = getSheetTabForWrite_(AGENCIES_CONFIG_KEY, 'Agencies');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    if (!agencyData.agency_id) {
      agencyData.agency_id = 'AGY_' + new Date().getTime();
    }

    var now = new Date().toISOString();
    agencyData.created_at = now;
    agencyData.updated_at = now;

    var newRow = headers.map(function(header) {
      return agencyData[header] !== undefined ? agencyData[header] : '';
    });

    sheet.appendRow(newRow);
    clearAgenciesCache_();

    return { success: true, data: agencyData };
  } catch (e) {
    Logger.log('Error in createAgency: ' + e.message);
    return { success: false, error: 'Failed to create agency: ' + e.message };
  }
}

/**
 * Update an existing agency
 * @param {string} agencyId - Agency ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object} {success, data, error}
 */
function updateAgency(agencyId, updates) {
  try {
    if (!agencyId) {
      return { success: false, error: 'Agency ID is required' };
    }

    var sheetInfo = getSheetTabForWrite_(AGENCIES_CONFIG_KEY, 'Agencies');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    var rowIndex = findRowByField_(sheet, headers, 'agency_id', agencyId);
    if (rowIndex === -1) {
      return { success: false, error: 'Agency not found: ' + agencyId };
    }

    updates.updated_at = new Date().toISOString();

    headers.forEach(function(header, colIndex) {
      if (updates.hasOwnProperty(header) && header !== 'agency_id' && header !== 'created_at') {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updates[header]);
      }
    });

    clearAgenciesCache_();

    var updatedAgency = getAgencyById(agencyId);
    return { success: true, data: updatedAgency };
  } catch (e) {
    Logger.log('Error in updateAgency: ' + e.message);
    return { success: false, error: 'Failed to update agency: ' + e.message };
  }
}

/**
 * Delete an agency
 * @param {string} agencyId - Agency ID to delete
 * @returns {Object} {success, error}
 */
function deleteAgency(agencyId) {
  try {
    if (!agencyId) {
      return { success: false, error: 'Agency ID is required' };
    }

    var sheetInfo = getSheetTabForWrite_(AGENCIES_CONFIG_KEY, 'Agencies');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    var rowIndex = findRowByField_(sheet, headers, 'agency_id', agencyId);
    if (rowIndex === -1) {
      return { success: false, error: 'Agency not found: ' + agencyId };
    }

    sheet.deleteRow(rowIndex);
    clearAgenciesCache_();
    return { success: true };
  } catch (e) {
    Logger.log('Error in deleteAgency: ' + e.message);
    return { success: false, error: 'Failed to delete agency: ' + e.message };
  }
}

// ============================================================================
// ORGANIZATION CRUD
// ============================================================================

/**
 * Get all organizations
 * @returns {Array} All organization records
 */
function getAllOrganizations() {
  return deepCopy(loadOrganizations_());
}

/**
 * Get organization by ID
 * @param {string} orgId - Organization ID
 * @returns {Object|null} Organization record or null
 */
function getOrganizationById(orgId) {
  return getById(loadOrganizations_(), 'org_id', orgId);
}

/**
 * Get organizations belonging to an agency
 * @param {string} agencyId - Agency ID
 * @returns {Array} Organizations under this agency
 */
function getOrganizationsByAgency(agencyId) {
  return filterByProperty(loadOrganizations_(), 'agency_id', agencyId, true);
}

/**
 * Create a new organization
 * @param {Object} orgData - Organization data
 * @returns {Object} {success, data, error}
 */
function createOrganization(orgData) {
  try {
    if (!orgData.name || !String(orgData.name).trim()) {
      return { success: false, error: 'Organization name is required' };
    }
    if (!orgData.agency_id) {
      return { success: false, error: 'agency_id is required' };
    }

    var sheetInfo = getSheetTabForWrite_(AGENCIES_CONFIG_KEY, 'Organizations');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    if (!orgData.org_id) {
      var abbr = (orgData.abbreviation || orgData.name || '').substring(0, 8).toLowerCase().replace(/\s+/g, '');
      orgData.org_id = 'ORG_' + abbr;
    }

    var newRow = headers.map(function(header) {
      return orgData[header] !== undefined ? orgData[header] : '';
    });

    sheet.appendRow(newRow);
    clearAgenciesCache_();

    return { success: true, data: orgData };
  } catch (e) {
    Logger.log('Error in createOrganization: ' + e.message);
    return { success: false, error: 'Failed to create organization: ' + e.message };
  }
}

/**
 * Update an organization
 * @param {string} orgId - Organization ID
 * @param {Object} updates - Fields to update
 * @returns {Object} {success, data, error}
 */
function updateOrganization(orgId, updates) {
  try {
    if (!orgId) {
      return { success: false, error: 'Organization ID is required' };
    }

    var sheetInfo = getSheetTabForWrite_(AGENCIES_CONFIG_KEY, 'Organizations');
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    var rowIndex = findRowByField_(sheet, headers, 'org_id', orgId);
    if (rowIndex === -1) {
      return { success: false, error: 'Organization not found: ' + orgId };
    }

    headers.forEach(function(header, colIndex) {
      if (updates.hasOwnProperty(header) && header !== 'org_id') {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updates[header]);
      }
    });

    clearAgenciesCache_();
    return { success: true, data: getOrganizationById(orgId) };
  } catch (e) {
    Logger.log('Error in updateOrganization: ' + e.message);
    return { success: false, error: 'Failed to update organization: ' + e.message };
  }
}

// ============================================================================
// HIERARCHY QUERIES — 3-level: Departments → Agencies → Organizations
// ============================================================================

/**
 * Get root-level agencies (no parent_agency_id within the Agencies tab)
 * @returns {Array} Top-level agencies
 */
function getRootAgencies() {
  var agencies = loadAllAgencies_();
  var roots = agencies.filter(function(a) {
    return !a.parent_agency_id || a.parent_agency_id === '';
  });
  return deepCopy(roots);
}

/**
 * Get sub-agencies (children) of an agency
 * @param {string} parentId - Parent agency ID
 * @returns {Array} Child agencies
 */
function getSubAgencies(parentId) {
  return filterByProperty(loadAllAgencies_(), 'parent_agency_id', parentId, true);
}

/**
 * Get full 3-level hierarchy: Departments → Agencies → Organizations
 * @returns {Array} Hierarchical tree with departments at root
 */
function getAgencyHierarchy() {
  var agencies = loadAllAgencies_();

  // Build map of all agencies by agency_id
  var agencyMap = {};
  agencies.forEach(function(a) {
    agencyMap[a.agency_id] = deepCopy(a);
    agencyMap[a.agency_id].children = [];
  });

  // Build tree: attach children to parents via parent_department_id
  var roots = [];
  agencies.forEach(function(a) {
    if (a.parent_department_id && agencyMap[a.parent_department_id]) {
      agencyMap[a.parent_department_id].children.push(agencyMap[a.agency_id]);
    } else {
      roots.push(agencyMap[a.agency_id]);
    }
  });

  // Sort everything by name
  function sortByName(arr) {
    arr.sort(function(a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  sortByName(roots);
  roots.forEach(function(node) {
    sortByName(node.children);
    node.children.forEach(function(child) {
      sortByName(child.children);
    });
  });

  return roots;
}

/**
 * Get agency ancestry (path from agency up to department)
 * @param {string} agencyId - Agency ID
 * @returns {Array} Array from [agency, ...parent agencies, department]
 */
function getAgencyAncestry(agencyId) {
  var agencies = loadAllAgencies_();
  var agencyMap = {};
  agencies.forEach(function(a) { agencyMap[a.agency_id] = a; });

  var ancestry = [];
  var current = agencyMap[agencyId];
  var visited = {};

  // Walk up the parent_department_id chain
  while (current && !visited[current.agency_id]) {
    visited[current.agency_id] = true;
    ancestry.push(deepCopy(current));
    if (current.parent_department_id && agencyMap[current.parent_department_id]) {
      current = agencyMap[current.parent_department_id];
    } else {
      break;
    }
  }

  return ancestry;
}

// ============================================================================
// SEARCH & FILTER QUERIES
// ============================================================================

/**
 * Search agencies by name or abbreviation
 * @param {string} query - Search query
 * @returns {Array} Matching agencies
 */
function searchAgencies(query) {
  var agencies = loadAllAgencies_();
  var queryLower = query.toLowerCase();

  var results = agencies.filter(function(a) {
    return (a.name && a.name.toLowerCase().includes(queryLower)) ||
           (a.full_name && a.full_name.toLowerCase().includes(queryLower)) ||
           (a.abbreviation && a.abbreviation.toLowerCase().includes(queryLower));
  });

  return deepCopy(results);
}

/**
 * Get agencies by type
 * @param {string} agencyType - Type (Federal Agency, Bureau, Office, Lab)
 * @returns {Array} Matching agencies
 */
function getAgenciesByType(agencyType) {
  return filterByProperty(loadAllAgencies_(), 'type', agencyType, true);
}

/**
 * Get agencies by relationship status
 * @param {string} status - Relationship status (New, Developing, Established, Strong, Dormant)
 * @returns {Array} Matching agencies
 */
function getAgenciesByRelationshipStatus(status) {
  return filterByProperty(loadAllAgencies_(), 'relationship_status', status, true);
}

/**
 * Get agencies by geographic scope
 * @param {string} scope - Geographic scope (National, Regional, State, Local, International)
 * @returns {Array} Matching agencies
 */
function getAgenciesByGeographicScope(scope) {
  return filterByProperty(loadAllAgencies_(), 'geographic_scope', scope, true);
}

// ============================================================================
// CONTACT INTEGRATION — Uses People tab (agency_id FK)
// ============================================================================

/**
 * Get contacts associated with an agency.
 * Queries the People tab directly (agency_id is a person-level field).
 * @param {string} agencyId - Agency ID
 * @returns {Array} People linked to this agency
 */
function getAgencyContacts(agencyId) {
  return filterByProperty(loadPeople_(), 'agency_id', agencyId, true);
}

/**
 * Get agency statistics
 * @param {string} agencyId - Agency ID (optional, returns all if not specified)
 * @returns {Object|Array} Stats for one or all agencies
 */
function getAgencyStats(agencyId) {
  var agencies = loadAllAgencies_();
  var people = loadPeople_();

  function calcStats(agency) {
    var agencyPeople = people.filter(function(p) {
      return p.agency_id === agency.agency_id;
    });

    return {
      agency_id: agency.agency_id,
      agency_name: agency.name,
      parent_department_id: agency.parent_department_id || '',
      total_contacts: agencyPeople.length,
      by_engagement: countByField(agencyPeople, 'engagement_level')
    };
  }

  if (agencyId) {
    var agency = getById(agencies, 'agency_id', agencyId);
    if (!agency) return null;
    return calcStats(agency);
  }

  return agencies.map(function(a) { return calcStats(a); });
}

// ============================================================================
// SUMMARY QUERIES
// ============================================================================

/**
 * Get agency overview stats
 * @returns {Object} Summary statistics
 */
function getAgenciesOverview() {
  var agencies = loadAllAgencies_();
  var departments = loadDepartments_();
  var organizations = loadOrganizations_();

  return {
    total_departments: departments.length,
    total_agencies: agencies.length,
    total_organizations: organizations.length,
    root_agencies: agencies.filter(function(a) { return !a.parent_agency_id; }).length,
    by_type: countByField(agencies, 'type'),
    by_relationship_status: countByField(agencies, 'relationship_status'),
    by_geographic_scope: countByField(agencies, 'geographic_scope')
  };
}

// ============================================================================
// ENGAGEMENT INTEGRATION
// ============================================================================

/**
 * Get engagement statistics for an agency
 * @param {string} agencyId - Agency ID
 * @returns {Object} Engagement stats with heat status
 */
function getAgencyEngagementStats(agencyId) {
  var contacts = getAgencyContacts(agencyId);
  var contactEmails = contacts.map(function(c) { return (c.email || '').toLowerCase(); });

  if (contactEmails.length === 0) {
    return {
      total_engagements: 0,
      last_engagement_date: null,
      days_since_last: null,
      heat_status: 'cold',
      solutions_engaged: [],
      by_type: {},
      by_solution: {}
    };
  }

  var engagements = loadAllEngagements_();

  var agencyEngagements = engagements.filter(function(e) {
    if (!e.participants) return false;
    var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
    return participants.some(function(p) { return contactEmails.includes(p); });
  });

  // Find last engagement date
  var lastDate = null;
  agencyEngagements.forEach(function(e) {
    if (e.date) {
      var d = new Date(e.date);
      if (!lastDate || d > lastDate) lastDate = d;
    }
  });

  var daysSince = null;
  if (lastDate) {
    daysSince = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
  }

  var heatStatus = 'cold';
  if (daysSince !== null) {
    if (daysSince <= 30) heatStatus = 'hot';
    else if (daysSince <= 90) heatStatus = 'warm';
  }

  var byType = countByField(agencyEngagements, 'activity_type');

  var bySolution = {};
  var byMonth = {};
  var solutionsSet = {};
  var engagedContactEmails = {};

  agencyEngagements.forEach(function(e) {
    var solIds = e.solution_id || '';
    if (solIds) {
      solIds.split(',').forEach(function(sid) {
        var trimmed = sid.trim();
        if (trimmed) {
          bySolution[trimmed] = (bySolution[trimmed] || 0) + 1;
          solutionsSet[trimmed] = true;
        }
      });
    }
    if (e.date) {
      var monthKey = e.date.substring(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }
    if (e.participants) {
      e.participants.split(',').forEach(function(p) {
        var email = p.trim().toLowerCase();
        if (contactEmails.includes(email)) {
          engagedContactEmails[email] = true;
        }
      });
    }
  });

  return {
    total_engagements: agencyEngagements.length,
    last_engagement_date: lastDate ? lastDate.toISOString().split('T')[0] : null,
    days_since_last: daysSince,
    heat_status: heatStatus,
    solutions_engaged: Object.keys(solutionsSet),
    contacts_engaged: Object.keys(engagedContactEmails).length,
    by_type: byType,
    by_solution: bySolution,
    by_month: byMonth
  };
}

/**
 * Get engagement timeline for an agency
 * @param {string} agencyId - Agency ID
 * @param {number} limit - Max results (default 50)
 * @returns {Array} Engagements sorted by date descending
 */
function getAgencyEngagementTimeline(agencyId, limit) {
  limit = limit || 50;
  var contacts = getAgencyContacts(agencyId);
  var contactEmails = contacts.map(function(c) { return (c.email || '').toLowerCase(); });

  if (contactEmails.length === 0) return [];

  var engagements = loadAllEngagements_();

  var agencyEngagements = engagements.filter(function(e) {
    if (!e.participants) return false;
    var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
    return participants.some(function(p) { return contactEmails.includes(p); });
  }).map(function(e) {
    var matchedContacts = [];
    if (e.participants) {
      var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
      participants.forEach(function(p) {
        var contact = contacts.find(function(c) { return (c.email || '').toLowerCase() === p; });
        if (contact) {
          matchedContacts.push({
            email: contact.email,
            name: (contact.first_name || '') + ' ' + (contact.last_name || '')
          });
        }
      });
    }
    e.matched_contacts = matchedContacts;
    return e;
  });

  return deepCopy(agencyEngagements.slice(0, limit));
}

/**
 * Get solutions a contact has engaged with
 * @param {string} email - Contact email
 * @returns {Array} Solution IDs this contact has engaged with
 */
function getContactSolutionTags(email) {
  var engagements = loadAllEngagements_();
  var emailLower = (email || '').toLowerCase();

  var solutionsSet = {};
  engagements.forEach(function(e) {
    if (!e.participants || !e.solution_id) return;
    var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
    if (participants.includes(emailLower)) {
      solutionsSet[e.solution_id] = true;
    }
  });

  return Object.keys(solutionsSet);
}

/**
 * Get contacts with their solution tags for an agency
 * @param {string} agencyId - Agency ID
 * @returns {Array} Contacts with solution_tags array added
 */
function getAgencyContactsWithTags(agencyId) {
  var contacts = getAgencyContacts(agencyId);
  var engagements = loadAllEngagements_();

  var emailToSolutions = {};
  engagements.forEach(function(e) {
    if (!e.participants || !e.solution_id) return;
    var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
    participants.forEach(function(p) {
      if (!emailToSolutions[p]) emailToSolutions[p] = {};
      emailToSolutions[p][e.solution_id] = true;
    });
  });

  contacts.forEach(function(c) {
    var emailLower = (c.email || '').toLowerCase();
    c.solution_tags = emailToSolutions[emailLower] ? Object.keys(emailToSolutions[emailLower]) : [];
  });

  return deepCopy(contacts);
}

/**
 * Get cross-agency network data for visualization
 * @param {string} agencyId - Starting agency ID
 * @returns {Object} Network data with nodes and edges
 */
function getCrossAgencyNetwork(agencyId) {
  var allContacts = loadPeople_();
  var engagements = loadAllEngagements_();
  var allAgencies = loadAllAgencies_();

  var emailToContact = {};
  var emailToAgency = {};
  allContacts.forEach(function(c) {
    if (c.email) {
      var emailLower = c.email.toLowerCase();
      emailToContact[emailLower] = c;
      if (c.agency_id) {
        emailToAgency[emailLower] = c.agency_id;
      }
    }
  });

  var agencyById = {};
  allAgencies.forEach(function(a) {
    if (a.agency_id) agencyById[a.agency_id] = a;
  });

  var startAgencyContacts = allContacts.filter(function(c) {
    return c.agency_id === agencyId;
  });
  var startContactEmails = {};
  startAgencyContacts.forEach(function(c) {
    if (c.email) startContactEmails[c.email.toLowerCase()] = true;
  });

  var emailToSolutions = {};
  var solutionToEmails = {};
  engagements.forEach(function(e) {
    if (!e.participants || !e.solution_id) return;
    var solId = e.solution_id.trim();
    var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
    participants.forEach(function(email) {
      if (!emailToSolutions[email]) emailToSolutions[email] = {};
      emailToSolutions[email][solId] = true;
      if (!solutionToEmails[solId]) solutionToEmails[solId] = {};
      solutionToEmails[solId][email] = true;
    });
  });

  var startAgencySolutions = {};
  Object.keys(startContactEmails).forEach(function(email) {
    if (emailToSolutions[email]) {
      Object.keys(emailToSolutions[email]).forEach(function(sol) {
        startAgencySolutions[sol] = true;
      });
    }
  });

  var connectedEmails = {};
  Object.keys(startAgencySolutions).forEach(function(solId) {
    if (solutionToEmails[solId]) {
      Object.keys(solutionToEmails[solId]).forEach(function(email) {
        connectedEmails[email] = true;
      });
    }
  });

  var nodes = [];
  var edges = [];
  var addedAgencies = {};
  var addedContacts = {};
  var addedSolutions = {};

  var startAgency = agencyById[agencyId];
  if (startAgency) {
    nodes.push({
      id: 'agency_' + agencyId,
      label: startAgency.abbreviation || startAgency.name || agencyId,
      title: startAgency.full_name || startAgency.name || agencyId,
      type: 'agency',
      isStart: true
    });
    addedAgencies[agencyId] = true;
  }

  Object.keys(connectedEmails).forEach(function(email) {
    var contact = emailToContact[email];
    var contactAgencyId = emailToAgency[email];
    if (!contact) return;

    var contactName = ((contact.first_name || '') + ' ' + (contact.last_name || '')).trim() || email;
    var isStartAgency = startContactEmails[email];

    if (!addedContacts[email]) {
      nodes.push({
        id: 'contact_' + email,
        label: contactName.split(' ').map(function(n) { return n.charAt(0); }).join(''),
        title: contactName + (contact.title ? '\n' + contact.title : ''),
        type: 'contact',
        isStart: isStartAgency
      });
      addedContacts[email] = true;
    }

    if (contactAgencyId && !addedAgencies[contactAgencyId]) {
      var contactAgency = agencyById[contactAgencyId];
      if (contactAgency) {
        nodes.push({
          id: 'agency_' + contactAgencyId,
          label: contactAgency.abbreviation || contactAgency.name || contactAgencyId,
          title: contactAgency.full_name || contactAgency.name || contactAgencyId,
          type: 'agency',
          isStart: false
        });
        addedAgencies[contactAgencyId] = true;
      }
    }

    if (contactAgencyId) {
      edges.push({
        from: 'contact_' + email,
        to: 'agency_' + contactAgencyId,
        type: 'member'
      });
    }

    if (emailToSolutions[email]) {
      Object.keys(emailToSolutions[email]).forEach(function(solId) {
        if (!startAgencySolutions[solId]) return;

        if (!addedSolutions[solId]) {
          nodes.push({
            id: 'solution_' + solId,
            label: solId.toUpperCase(),
            title: 'Solution: ' + solId,
            type: 'solution'
          });
          addedSolutions[solId] = true;
        }

        edges.push({
          from: 'contact_' + email,
          to: 'solution_' + solId,
          type: 'engagement'
        });
      });
    }
  });

  return {
    nodes: nodes,
    edges: edges,
    stats: {
      agencies: Object.keys(addedAgencies).length,
      contacts: Object.keys(addedContacts).length,
      solutions: Object.keys(addedSolutions).length
    }
  };
}

/**
 * Check if an agency is active (not closed/merged)
 * @param {Object} agency - Agency object
 * @returns {boolean} True if active
 */
function isAgencyActive(agency) {
  if (!agency.status) return true;
  var status = String(agency.status).toLowerCase();
  return status === 'active' || status === '';
}
