/**
 * MO-APIs Library - Contacts API
 * ===============================
 * Comprehensive query functions for MO-DB_Contacts
 * Used by Implementation, SEP, Comms, and Contacts views
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs (shared utilities)
 *
 * DATABASE STRUCTURE (v3.0):
 * MO-DB_Contacts is a multi-tab Google Sheet:
 *   - "People" tab: One row per unique person (~423 rows)
 *   - "Roles" tab: One row per person-solution-role relationship (~4,221 rows)
 *
 * Uses shared utilities from config-helpers.gs:
 * - loadSheetTab_() for tab-aware caching
 * - filterByProperty() / filterByProperties() for filtering
 * - deepCopy() for safe object copies
 */

// ============================================================================
// DATA ACCESS — Dual-Tab Loading
// ============================================================================

var CONTACTS_CONFIG_KEY = 'CONTACTS_SHEET_ID';
var PEOPLE_CACHE_KEY = '_peopleCache';
var ROLES_CACHE_KEY = '_rolesCache';
var JOINED_CACHE_KEY = '_contactsJoinedCache';

/**
 * Load person records from the People tab.
 * One row per unique person (by email). Contains identity, profile,
 * engagement, champion, and internal team fields.
 * @returns {Array} Array of person objects
 */
function loadPeople_() {
  return loadSheetTab_(CONTACTS_CONFIG_KEY, 'People', PEOPLE_CACHE_KEY);
}

/**
 * Load role records from the Roles tab.
 * One row per person-solution-role relationship. Contains role_id,
 * contact_id (FK to People), solution_id, role, survey_year, need_id.
 * @returns {Array} Array of role objects
 */
function loadRoles_() {
  return loadSheetTab_(CONTACTS_CONFIG_KEY, 'Roles', ROLES_CACHE_KEY);
}

/**
 * Load joined People+Roles data (backward-compatible with old flat table).
 * Produces one row per person-solution-role pair by joining People and Roles
 * on contact_id. Same shape as the old single-tab loadAllContacts_().
 * @returns {Array} Array of merged person+role objects
 */
function loadContactsJoined_() {
  if (_sheetDataCache[JOINED_CACHE_KEY]) {
    return _sheetDataCache[JOINED_CACHE_KEY];
  }

  var people = loadPeople_();
  var roles = loadRoles_();

  var peopleMap = {};
  people.forEach(function(p) { peopleMap[p.contact_id] = p; });

  var joined = [];
  // Join: for each role, merge in the person fields
  roles.forEach(function(r) {
    var person = peopleMap[r.contact_id];
    if (!person) return; // Skip orphaned roles
    var merged = {};
    Object.keys(person).forEach(function(k) { merged[k] = person[k]; });
    Object.keys(r).forEach(function(k) { merged[k] = r[k]; });
    joined.push(merged);
  });

  // Also include people with NO roles (contact-only records)
  var peopleWithRoles = {};
  roles.forEach(function(r) { peopleWithRoles[r.contact_id] = true; });
  people.forEach(function(p) {
    if (!peopleWithRoles[p.contact_id]) {
      var copy = {};
      Object.keys(p).forEach(function(k) { copy[k] = p[k]; });
      copy.solution_id = '';
      copy.role = '';
      copy.survey_year = '';
      copy.need_id = '';
      copy.role_id = '';
      joined.push(copy);
    }
  });

  _sheetDataCache[JOINED_CACHE_KEY] = joined;
  return joined;
}

/**
 * Backward-compatible alias — returns joined People+Roles data.
 * @returns {Array} Same as loadContactsJoined_()
 */
function loadAllContacts_() {
  return loadContactsJoined_();
}

/**
 * Clear all contacts caches (People, Roles, and joined).
 */
function clearContactsCache_() {
  clearSheetDataCache(PEOPLE_CACHE_KEY);
  clearSheetDataCache(ROLES_CACHE_KEY);
  clearSheetDataCache(JOINED_CACHE_KEY);
}

/**
 * Get the People tab sheet for write operations.
 * @returns {Object} { sheet, headers, sheetId }
 */
function getPeopleSheetForWrite_() {
  return getSheetTabForWrite_(CONTACTS_CONFIG_KEY, 'People');
}

/**
 * Get the Roles tab sheet for write operations.
 * @returns {Object} { sheet, headers, sheetId }
 */
function getRolesSheetForWrite_() {
  return getSheetTabForWrite_(CONTACTS_CONFIG_KEY, 'Roles');
}

/**
 * Create a role assignment (add person to a solution).
 * @param {string} contactId - Contact ID (FK to People tab)
 * @param {string} solutionId - Solution ID
 * @param {string} role - Role type (Primary SME, Secondary SME, etc.)
 * @param {string} surveyYear - Survey year (optional)
 * @param {string} needId - Need ID (optional)
 * @returns {Object} {success, role_id, error}
 */
function createRole_(contactId, solutionId, role, surveyYear, needId) {
  try {
    if (!contactId || !solutionId) {
      return { success: false, error: 'contact_id and solution_id are required' };
    }

    var sheetInfo = getRolesSheetForWrite_();
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    var roleId = 'ROLE_' + new Date().getTime();
    var roleData = {
      role_id: roleId,
      contact_id: contactId,
      solution_id: solutionId,
      role: role || '',
      survey_year: surveyYear || '',
      need_id: needId || ''
    };

    var newRow = headers.map(function(header) {
      return roleData[header] !== undefined ? roleData[header] : '';
    });

    sheet.appendRow(newRow);
    clearContactsCache_();

    return { success: true, role_id: roleId };
  } catch (e) {
    Logger.log('Error in createRole_: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Remove a role assignment by role_id.
 * @param {string} roleId - Role ID to remove
 * @returns {Object} {success, error}
 */
function removeRole_(roleId) {
  try {
    if (!roleId) {
      return { success: false, error: 'role_id is required' };
    }

    var sheetInfo = getRolesSheetForWrite_();
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    var roleIdColIndex = headers.indexOf('role_id');
    if (roleIdColIndex === -1) {
      return { success: false, error: 'role_id column not found in Roles tab' };
    }

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][roleIdColIndex] === roleId) {
        sheet.deleteRow(i + 1);
        clearContactsCache_();
        return { success: true };
      }
    }

    return { success: false, error: 'Role not found: ' + roleId };
  } catch (e) {
    Logger.log('Error in removeRole_: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Check if a comma-separated field contains a specific value.
 * Used for email, department, agency, organization fields that
 * may store multiple values (e.g. "user@a.gov, user@b.gov").
 * @param {string} fieldValue - Comma-separated field value
 * @param {string} searchValue - Value to find
 * @returns {boolean}
 */
function containsValue_(fieldValue, searchValue) {
  if (!fieldValue || !searchValue) return false;
  var values = fieldValue.toString().split(',');
  var target = searchValue.toLowerCase().trim();
  for (var i = 0; i < values.length; i++) {
    if (values[i].trim().toLowerCase() === target) return true;
  }
  return false;
}

/**
 * Get the primary (first) value from a comma-separated field.
 * @param {string} fieldValue - Comma-separated field value
 * @returns {string} First value, trimmed
 */
function primaryValue_(fieldValue) {
  if (!fieldValue) return '';
  return fieldValue.toString().split(',')[0].trim();
}

// Fields that belong in the People tab (for write routing)
var PEOPLE_FIELDS_ = [
  'first_name', 'last_name', 'agency_id',
  'title', 'region', 'engagement_level',
  'last_contact_date', 'next_scheduled_contact',
  'champion_status', 'relationship_owner', 'champion_notes',
  'is_internal', 'internal_title', 'internal_team', 'supervisor', 'start_date', 'active',
  'education', 'job_duties', 'professional_skills', 'non_work_skills',
  'hobbies', 'goals', 'relax', 'early_job', 'notes', 'last_updated'
];

// ============================================================================
// CORE QUERY FUNCTIONS (Using shared filterByProperty)
// ============================================================================

/**
 * Get all contacts (with optional limit)
 * @param {number} limit - Optional max results
 * @returns {Array} Contact records
 */
function getAllContacts(limit) {
  var contacts = loadAllContacts_();
  var result;
  if (limit && limit > 0) {
    result = deepCopy(contacts.slice(0, limit));
  } else {
    result = deepCopy(contacts);
  }
  logResponseSize(result, 'getAllContacts');
  return result;
}

/**
 * Get contacts by solution_id (exact match)
 * @param {string} solutionId - The solution_id to match
 * @returns {Array} Matching contacts
 */
function getContactsBySolutionId(solutionId) {
  return filterByProperty(loadAllContacts_(), 'solution_id', solutionId, true);
}

/**
 * Get contacts by solution name or solution_id
 * @param {string} solutionId - Full or partial solution_id
 * @param {boolean} exactMatch - If true, requires exact match (default: false)
 * @returns {Array} Matching contacts
 */
function getContactsBySolution(solutionId, exactMatch) {
  return filterByProperty(loadAllContacts_(), 'solution_id', solutionId, exactMatch);
}

/**
 * Get contacts by email (exact match)
 * @param {string} email - Email address
 * @returns {Array} All records for this email
 */
function getContactsByEmail(email) {
  if (!email) return [];
  var people = loadPeople_();
  var results = people.filter(function(c) {
    return containsValue_(c.email, email);
  });
  return deepCopy(results);
}

/**
 * Get a single contact by contact_id
 * @param {string} contactId - Contact ID (CON_xxx format)
 * @returns {Object|null} Contact object or null
 */
function getContactById(contactId) {
  if (!contactId) return null;
  var people = loadPeople_();
  for (var i = 0; i < people.length; i++) {
    if (people[i].contact_id === contactId) {
      return deepCopy(people[i]);
    }
  }
  return null;
}

/**
 * Get multiple contacts by contact_id array
 * @param {Array} contactIds - Array of contact IDs
 * @returns {Array} Matching contacts
 */
function getContactsByIds(contactIds) {
  if (!contactIds || !contactIds.length) return [];
  var people = loadPeople_();
  var idSet = {};
  contactIds.forEach(function(id) { idSet[id] = true; });
  var results = people.filter(function(c) {
    return c.contact_id && idSet[c.contact_id];
  });
  return deepCopy(results);
}

/**
 * Get contacts by name (first, last, or both) - partial match
 * @param {string} firstName - First name (optional)
 * @param {string} lastName - Last name (optional)
 * @returns {Array} Matching contacts
 */
function getContactsByName(firstName, lastName) {
  var criteria = {};
  if (firstName) criteria.first_name = firstName;
  if (lastName) criteria.last_name = lastName;
  return filterByProperties(loadPeople_(), criteria, { exactMatch: false });
}

/**
 * Get contacts by role (exact match)
 * @param {string} role - Role type (Survey Submitter, Primary SME, etc.)
 * @returns {Array} Matching contacts
 */
function getContactsByRole(role) {
  return filterByProperty(loadAllContacts_(), 'role', role, true);
}

/**
 * Get contacts by department (partial match)
 * @param {string} department - Department name
 * @returns {Array} Matching contacts
 */
function getContactsByDepartment(department) {
  return filterByProperty(loadPeople_(), 'department', department, false);
}

/**
 * Get contacts by agency (partial match)
 * @param {string} agency - Agency name
 * @returns {Array} Matching contacts
 */
function getContactsByAgency(agency) {
  return filterByProperty(loadPeople_(), 'agency', agency, false);
}

/**
 * Get contacts by survey year (exact match)
 * @param {number} year - Survey year (2016, 2018, 2020, 2022, 2024)
 * @returns {Array} Matching contacts
 */
function getContactsBySurveyYear(year) {
  return filterByProperty(loadAllContacts_(), 'survey_year', year, true);
}

// ============================================================================
// ADVANCED QUERY FUNCTIONS
// ============================================================================

/**
 * Get contacts matching multiple criteria
 * Uses shared filterByProperties with mixed exact/partial matching
 * @param {Object} criteria - Filter criteria
 *   {solution_id, role, department, agency, year, firstName, lastName}
 * @returns {Array} Matching contacts
 */
function getContactsMultiFilter(criteria) {
  if (!criteria || Object.keys(criteria).length === 0) {
    return deepCopy(loadAllContacts_());
  }

  // Map criteria to database field names and define match types
  var dbCriteria = {};
  var exactFields = ['role', 'survey_year']; // These need exact match
  var partialFields = ['solution_id', 'first_name', 'last_name'];

  // Rename firstName/lastName to database column names
  if (criteria.firstName) dbCriteria.first_name = criteria.firstName;
  if (criteria.lastName) dbCriteria.last_name = criteria.lastName;
  if (criteria.year) dbCriteria.survey_year = criteria.year;
  if (criteria.solution_id) dbCriteria.solution_id = criteria.solution_id;
  if (criteria.role) dbCriteria.role = criteria.role;

  // Department/agency filtering via agency_id → resolveAgency_()
  var deptFilter = criteria.department ? criteria.department.toLowerCase() : '';
  var agencyFilter = criteria.agency ? criteria.agency.toLowerCase() : '';

  // Custom filter to handle mixed exact/partial matching
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    // Check standard field criteria
    var passesFieldCriteria = Object.keys(dbCriteria).every(function(field) {
      var searchValue = dbCriteria[field];
      if (!searchValue) return true;

      var itemValue = c[field];
      if (itemValue === null || itemValue === undefined) return false;

      var isExact = exactFields.includes(field);
      var normalizedItem = normalizeString(itemValue);
      var normalizedSearch = normalizeString(searchValue);

      return isExact
        ? normalizedItem === normalizedSearch
        : normalizedItem.includes(normalizedSearch);
    });
    if (!passesFieldCriteria) return false;

    // Check department/agency via resolveAgency_()
    if (deptFilter || agencyFilter) {
      var resolved = resolveAgency_(c.agency_id);
      if (deptFilter && !(resolved.department_name || '').toLowerCase().includes(deptFilter)) return false;
      if (agencyFilter && !(resolved.agency_name || '').toLowerCase().includes(agencyFilter)) return false;
    }
    return true;
  });

  return deepCopy(results);
}

/**
 * Get unique contact list (deduplicated by email)
 * @param {Array} contacts - Optional pre-filtered contacts, or null for all
 * @returns {Array} Unique contacts with aggregated info
 */
function getUniqueContacts(contacts) {
  var allContacts = contacts || loadAllContacts_();

  var emailMap = {};
  allContacts.forEach(function(c) {
    var email = primaryValue_(c.email);
    if (!email) return;

    if (!emailMap[email]) {
      var resolved = resolveAgency_(c.agency_id);
      emailMap[email] = {
        email: c.email,
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        agency_id: c.agency_id || '',
        department: resolved.department_name || '',
        agency: resolved.agency_name || '',
        // Champion fields
        champion_status: c.champion_status || '',
        relationship_owner: c.relationship_owner || '',
        champion_notes: c.champion_notes || '',
        solutions: [],
        roles: [],
        years: []
      };
    }

    var entry = emailMap[email];
    if (c.solution_id && !entry.solutions.includes(c.solution_id)) {
      entry.solutions.push(c.solution_id);
    }
    if (c.role && !entry.roles.includes(c.role)) {
      entry.roles.push(c.role);
    }
    if (c.survey_year && !entry.years.includes(c.survey_year)) {
      entry.years.push(c.survey_year);
    }
  });

  var results = Object.keys(emailMap).map(function(email) {
    var e = emailMap[email];
    e.solutions_count = e.solutions.length;
    e.years.sort();
    return e;
  });

  return deepCopy(results);
}

/**
 * Get mailing list for solutions (unique emails with names)
 * @param {string} solutionPattern - Solution name pattern (e.g., "HLS|OPERA")
 * @returns {Array} Mailing list [{first_name, last_name, email}]
 */
function getMailingList(solutionPattern) {
  var contacts = loadAllContacts_();
  var regex = new RegExp(solutionPattern, 'i');

  var filtered = contacts.filter(function(c) {
    return c.solution_id && regex.test(c.solution_id);
  });

  var unique = getUniqueContacts(filtered);

  return unique.map(function(c) {
    var resolved = resolveAgency_(c.agency_id);
    return {
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      agency_id: c.agency_id || '',
      department: resolved.department_name || '',
      agency: resolved.agency_name || ''
    };
  });
}

// ============================================================================
// RELATIONSHIP QUERIES
// ============================================================================

/**
 * Get all solutions a contact is involved in
 * @param {string} email - Contact email
 * @returns {Array} Solutions with role info
 */
function getContactSolutions(email) {
  // Find person in People tab
  var people = loadPeople_();
  var person = null;
  for (var i = 0; i < people.length; i++) {
    if (containsValue_(people[i].email, email)) {
      person = people[i];
      break;
    }
  }
  if (!person) return [];

  // Get their roles from Roles tab
  var roles = loadRoles_();
  var solutions = {};
  roles.forEach(function(r) {
    if (r.contact_id !== person.contact_id) return;
    var sol = r.solution_id;
    if (!sol) return;
    if (!solutions[sol]) {
      solutions[sol] = { solution_id: sol, roles: [], years: [] };
    }
    if (r.role && !solutions[sol].roles.includes(r.role)) {
      solutions[sol].roles.push(r.role);
    }
    if (r.survey_year && !solutions[sol].years.includes(r.survey_year)) {
      solutions[sol].years.push(r.survey_year);
    }
  });

  return Object.keys(solutions).map(function(key) {
    return solutions[key];
  });
}

/**
 * Get contacts who work on multiple specified solutions
 * @param {Array} solutionNames - Array of solution names
 * @returns {Array} Contacts involved in ALL specified solutions
 */
function getContactsAcrossSolutions(solutionNames) {
  var joined = loadContactsJoined_();

  // Get unique emails per solution
  var solutionEmails = {};
  solutionNames.forEach(function(sol) {
    solutionEmails[sol] = [];
  });

  joined.forEach(function(c) {
    var pEmail = primaryValue_(c.email);
    solutionNames.forEach(function(sol) {
      if (c.solution_id && normalizeString(c.solution_id).includes(normalizeString(sol))) {
        if (pEmail && !solutionEmails[sol].includes(pEmail)) {
          solutionEmails[sol].push(pEmail);
        }
      }
    });
  });

  // Find intersection
  var allEmails = solutionEmails[solutionNames[0]] || [];
  for (var i = 1; i < solutionNames.length; i++) {
    var nextEmails = solutionEmails[solutionNames[i]] || [];
    allEmails = allEmails.filter(function(email) {
      return nextEmails.includes(email);
    });
  }

  // Build results from joined data (includes solution info)
  var results = [];
  allEmails.forEach(function(email) {
    var contactRecords = joined.filter(function(c) {
      return containsValue_(c.email, email);
    });
    if (contactRecords.length > 0) {
      var unique = getUniqueContacts(contactRecords)[0];
      results.push(unique);
    }
  });

  return results;
}

/**
 * Get contacts who share solutions with a given contact
 * @param {string} email - Contact email
 * @returns {Array} Related contacts with shared solution info
 */
function getRelatedContacts(email) {
  // Get this person's solutions from Roles tab
  var mySolutions = getContactSolutions(email).map(function(s) { return s.solution_id; });

  var joined = loadContactsJoined_();
  var relatedEmails = {};

  joined.forEach(function(c) {
    if (containsValue_(c.email, email)) return; // Skip self
    if (c.solution_id && mySolutions.includes(c.solution_id)) {
      if (!relatedEmails[c.email]) {
        relatedEmails[c.email] = {
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          shared_solutions: []
        };
      }
      if (!relatedEmails[c.email].shared_solutions.includes(c.solution_id)) {
        relatedEmails[c.email].shared_solutions.push(c.solution_id);
      }
    }
  });

  var results = Object.keys(relatedEmails).map(function(e) {
    var r = relatedEmails[e];
    r.shared_count = r.shared_solutions.length;
    return r;
  });

  results.sort(function(a, b) {
    return b.shared_count - a.shared_count;
  });

  return deepCopy(results);
}

// ============================================================================
// STATISTICS & AGGREGATION
// ============================================================================

/**
 * Get contact statistics
 * @returns {Object} Stats about the contacts database
 */
function getContactStats() {
  var contacts = loadAllContacts_();
  var uniqueEmails = {};
  var solutions = {};
  var departments = {};
  var roles = {};
  var years = {};

  contacts.forEach(function(c) {
    if (c.email) uniqueEmails[primaryValue_(c.email)] = true;
    if (c.solution_id) solutions[c.solution_id] = (solutions[c.solution_id] || 0) + 1;
    // Resolve department from agency_id
    if (c.agency_id) {
      var resolved = resolveAgency_(c.agency_id);
      var deptName = resolved.department_name || 'Unknown';
      departments[deptName] = (departments[deptName] || 0) + 1;
    }
    if (c.role) roles[c.role] = (roles[c.role] || 0) + 1;
    if (c.survey_year) years[c.survey_year] = (years[c.survey_year] || 0) + 1;
  });

  return {
    total_records: contacts.length,
    unique_contacts: Object.keys(uniqueEmails).length,
    solutions_count: Object.keys(solutions).length,
    departments_count: Object.keys(departments).length,
    by_role: roles,
    by_year: years,
    top_departments: Object.keys(departments)
      .sort(function(a, b) { return departments[b] - departments[a]; })
      .slice(0, 10)
      .map(function(d) { return { department: d, count: departments[d] }; }),
    top_solutions: Object.keys(solutions)
      .sort(function(a, b) { return solutions[b] - solutions[a]; })
      .slice(0, 10)
      .map(function(s) { return { solution_id: s, count: solutions[s] }; })
  };
}

/**
 * Get most engaged stakeholders
 * @param {number} limit - Number to return (default 20)
 * @returns {Array} Top engaged contacts by solution count
 */
function getMostEngagedContacts(limit) {
  limit = limit || 20;
  var unique = getUniqueContacts();

  unique.sort(function(a, b) {
    return b.solutions_count - a.solutions_count;
  });

  return unique.slice(0, limit);
}

/**
 * Get stakeholder count per solution
 * @returns {Array} Solutions with contact counts
 */
function getStakeholderCountsBySolution() {
  var contacts = loadAllContacts_();
  var solutions = {};

  contacts.forEach(function(c) {
    if (!c.solution_id) return;
    if (!solutions[c.solution_id]) {
      solutions[c.solution_id] = {
        solution_id: c.solution_id,
        total: 0,
        unique_emails: {},
        by_role: {}
      };
    }
    solutions[c.solution_id].total++;
    solutions[c.solution_id].unique_emails[c.email] = true;
    if (c.role) {
      solutions[c.solution_id].by_role[c.role] = (solutions[c.solution_id].by_role[c.role] || 0) + 1;
    }
  });

  return Object.keys(solutions).map(function(sol) {
    var s = solutions[sol];
    return {
      solution_id: s.solution_id,
      total_records: s.total,
      unique_contacts: Object.keys(s.unique_emails).length,
      by_role: s.by_role
    };
  }).sort(function(a, b) {
    return b.unique_contacts - a.unique_contacts;
  });
}

/**
 * Get department participation across solutions
 * @returns {Array} Departments with solution coverage
 */
function getDepartmentParticipation() {
  var contacts = loadAllContacts_();
  var depts = {};

  contacts.forEach(function(c) {
    if (!c.agency_id) return;
    var resolved = resolveAgency_(c.agency_id);
    var deptName = resolved.department_name;
    if (!deptName) return;
    if (!depts[deptName]) {
      depts[deptName] = {
        department: deptName,
        unique_emails: {},
        solutions: {}
      };
    }
    if (c.email) depts[deptName].unique_emails[primaryValue_(c.email)] = true;
    if (c.solution_id) {
      depts[deptName].solutions[c.solution_id] = true;
    }
  });

  return Object.keys(depts).map(function(d) {
    return {
      department: d,
      contact_count: Object.keys(depts[d].unique_emails).length,
      solution_count: Object.keys(depts[d].solutions).length
    };
  }).sort(function(a, b) {
    return b.contact_count - a.contact_count;
  });
}

// ============================================================================
// SOLUTION-SPECIFIC HELPERS (for Implementation Dashboard)
// ============================================================================

/**
 * Get stakeholder summary for a solution (for dashboard cards)
 * @param {string} solutionId - Solution ID (solution_id)
 * @returns {Object} Summary stats and key contacts
 */
function getSolutionStakeholderSummary(solutionId) {
  var contacts = getContactsBySolution(solutionId, false);
  var unique = getUniqueContacts(contacts);

  var byRole = {};
  contacts.forEach(function(c) {
    if (c.role) {
      byRole[c.role] = (byRole[c.role] || 0) + 1;
    }
  });

  // Get primary SMEs
  var primarySMEs = contacts
    .filter(function(c) { return c.role === 'Primary SME'; })
    .map(function(c) { return { name: c.first_name + ' ' + c.last_name, email: c.email }; });

  // Dedupe SMEs by email
  var seenEmails = {};
  primarySMEs = primarySMEs.filter(function(s) {
    if (seenEmails[s.email]) return false;
    seenEmails[s.email] = true;
    return true;
  });

  return {
    solution_id: solutionId,
    total_contacts: unique.length,
    by_role: byRole,
    primary_smes: primarySMEs.slice(0, 5),
    departments: [...new Set(contacts.map(function(c) {
      if (!c.agency_id) return '';
      return resolveAgency_(c.agency_id).department_name || '';
    }).filter(Boolean))]
  };
}

/**
 * Get stakeholder summaries for multiple solutions
 * @param {Array} solutionNames - Array of solution names
 * @returns {Object} Map of solution name to summary
 */
function getMultipleSolutionStakeholders(solutionNames) {
  var results = {};
  solutionNames.forEach(function(sol) {
    results[sol] = getSolutionStakeholderSummary(sol);
  });
  return results;
}

// ============================================================================
// SEP-NSITE: TOUCHPOINT PIPELINE QUERIES
// ============================================================================

/**
 * Touchpoint definitions for SEP pipeline
 */
var TOUCHPOINTS = {
  T4: { name: 'Outreach', description: 'Initial outreach and awareness' },
  W1: { name: 'Assessment', description: 'Needs assessment workshop' },
  W2: { name: 'Deep Dive', description: 'Deep dive analysis' },
  T5: { name: 'Transition', description: 'Solution transition planning' },
  T6: { name: 'Training', description: 'User training and onboarding' },
  T7: { name: 'Adoption', description: 'Active adoption phase' },
  T8: { name: 'Impact', description: 'Impact assessment and feedback' }
};

/**
 * Engagement level definitions
 */
var ENGAGEMENT_LEVELS = {
  'Could benefit': { order: 1, description: 'Identified as potential beneficiary' },
  'Interested': { order: 2, description: 'Has expressed interest' },
  'Info & Feedback': { order: 3, description: 'Receiving information, providing feedback' },
  'Collaborate': { order: 4, description: 'Active collaboration' },
  'CoOwners': { order: 5, description: 'Co-ownership of solution development' }
};

/**
 * Champion status definitions for identifying agency friends/potential SNWG champions
 */
var CHAMPION_STATUSES = {
  'Active': { order: 1, description: 'Currently engaged champion actively supporting SNWG' },
  'Prospective': { order: 2, description: 'Potential champion being cultivated' },
  'Alumni': { order: 3, description: 'Former champion, still friendly, less active' },
  'Inactive': { order: 4, description: 'Champion relationship has gone dormant' }
};

/**
 * Get contacts by touchpoint status
 * @param {string} touchpoint - Touchpoint (T4, W1, W2, T5, T6, T7, T8)
 * @returns {Array} Contacts in this touchpoint stage
 */
function getContactsByTouchpoint(touchpoint) {
  // touchpoint_status field removed in v4.0 — return empty
  return [];
}

/**
 * Get contacts by engagement level
 * @param {string} level - Engagement level
 * @returns {Array} Contacts at this engagement level
 */
function getContactsByEngagementLevel(level) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.engagement_level === level;
  });
  return deepCopy(results);
}

/**
 * Get contacts by lifecycle phase
 * @param {string} phase - Lifecycle phase (Assessment, Formulation, CoDesign, Maintenance, Transition)
 * @returns {Array} Contacts in this phase
 */
function getContactsByLifecyclePhase(phase) {
  // lifecycle_phase field removed in v4.0 — return empty
  return [];
}

/**
 * Get touchpoint pipeline counts
 * @returns {Object} Count of contacts in each touchpoint
 */
function getTouchpointPipelineCounts() {
  // touchpoint_status field removed in v4.0 — return zeroes
  return { T4: 0, W1: 0, W2: 0, T5: 0, T6: 0, T7: 0, T8: 0, unassigned: 0 };
}

/**
 * Get contacts needing follow-up (next_scheduled_contact within range)
 * @param {number} days - Days ahead to check (default 7)
 * @returns {Array} Contacts needing follow-up
 */
function getContactsNeedingFollowUp(days) {
  days = days || 7;
  var contacts = loadAllContacts_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  var results = contacts.filter(function(c) {
    if (!c.next_scheduled_contact) return false;
    var nextContact = new Date(c.next_scheduled_contact);
    return nextContact >= today && nextContact <= cutoff;
  });

  // Sort by next_scheduled_contact ascending
  results.sort(function(a, b) {
    return new Date(a.next_scheduled_contact) - new Date(b.next_scheduled_contact);
  });

  return deepCopy(results);
}

/**
 * Get contacts with overdue follow-ups
 * @returns {Array} Contacts with past next_scheduled_contact dates
 */
function getContactsOverdueFollowUp() {
  var contacts = loadAllContacts_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var results = contacts.filter(function(c) {
    if (!c.next_scheduled_contact) return false;
    var nextContact = new Date(c.next_scheduled_contact);
    return nextContact < today;
  });

  // Sort by next_scheduled_contact ascending (oldest first)
  results.sort(function(a, b) {
    return new Date(a.next_scheduled_contact) - new Date(b.next_scheduled_contact);
  });

  return deepCopy(results);
}

/**
 * Update contact touchpoint status
 * @param {string} email - Contact email
 * @param {string} touchpoint - New touchpoint status
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactTouchpoint(email, touchpoint) {
  // touchpoint_status field removed in v4.0 — no-op
  return { success: true };
}

/**
 * Update contact engagement level
 * @param {string} email - Contact email
 * @param {string} level - New engagement level
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactEngagement(email, level) {
  return updateContactField_(email, 'engagement_level', level);
}

/**
 * Update contact last contact date
 * @param {string} email - Contact email
 * @param {string} date - Date (ISO string or YYYY-MM-DD)
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactLastContactDate(email, date) {
  return updateContactField_(email, 'last_contact_date', date);
}

/**
 * Update contact next scheduled contact
 * @param {string} email - Contact email
 * @param {string} date - Date (ISO string or YYYY-MM-DD)
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactNextScheduledContact(email, date) {
  return updateContactField_(email, 'next_scheduled_contact', date);
}

/**
 * Update a single field for a contact by email
 * @private
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactField_(email, fieldName, value) {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    // Route to correct tab based on field type
    var isPeopleField = PEOPLE_FIELDS_.includes(fieldName) || fieldName === 'email' || fieldName === 'contact_id';
    var sheetInfo = isPeopleField ? getPeopleSheetForWrite_() : getRolesSheetForWrite_();
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    var emailColIndex = headers.indexOf('email');
    var fieldColIndex = headers.indexOf(fieldName);

    if (emailColIndex === -1 && isPeopleField) {
      return { success: false, error: 'email column not found in People tab' };
    }
    if (fieldColIndex === -1) {
      return { success: false, error: fieldName + ' column not found in ' + (isPeopleField ? 'People' : 'Roles') + ' tab' };
    }

    // People tab: find by email (one row per person)
    if (isPeopleField) {
      var data = sheet.getDataRange().getValues();
      var updated = false;
      for (var i = 1; i < data.length; i++) {
        if (containsValue_(data[i][emailColIndex], email)) {
          sheet.getRange(i + 1, fieldColIndex + 1).setValue(value);
          updated = true;
          break; // People tab has one row per email
        }
      }
      if (!updated) {
        return { success: false, error: 'Contact not found: ' + email };
      }
    }

    clearContactsCache_();
    return { success: true };
  } catch (e) {
    Logger.log('Error in updateContactField_: ' + e);
    return { success: false, error: 'Failed to update contact: ' + e.message };
  }
}

// ============================================================================
// CONTACT SEARCH & AGENCY LINKING
// ============================================================================

/**
 * Search contacts by name or email
 * @param {string} query - Search query
 * @returns {Array} Matching contacts
 */
function searchContacts(query) {
  if (!query || query.length < 2) return [];
  var people = loadPeople_();
  var queryLower = query.toLowerCase();

  var results = people.filter(function(c) {
    var fullName = ((c.first_name || '') + ' ' + (c.last_name || '')).toLowerCase();
    var email = (c.email || '').toLowerCase();
    var resolved = resolveAgency_(c.agency_id);
    var agencyName = (resolved.agency_name || '').toLowerCase();

    return fullName.includes(queryLower) ||
           email.includes(queryLower) ||
           agencyName.includes(queryLower);
  });

  // People tab is already unique by email — no dedup needed
  return deepCopy(results.slice(0, 50));
}

/**
 * Update a contact's agency_id
 * @param {string} email - Contact email
 * @param {string} agencyId - Agency ID to link to
 * @returns {Object} Success/failure result
 */
function updateContactAgency(email, agencyId) {
  try {
    var updated = updateContactField_(email, 'agency_id', agencyId);
    return { success: updated, error: updated ? null : 'Contact not found' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Create a new contact
 * @param {Object} contactData - Contact data
 * @returns {Object} Success/failure result with created contact
 */
function createContact(contactData) {
  try {
    if (!contactData.email) {
      return { success: false, error: 'Email is required' };
    }

    var sheetInfo = getPeopleSheetForWrite_();
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    // Generate contact_id: CON_ + first 5 chars of first name + first 3 chars of last name
    var firstName = (contactData.first_name || '').trim();
    var lastName = (contactData.last_name || '').trim();
    var contactId = 'CON_' + firstName.substring(0, 5).toLowerCase() + lastName.substring(0, 3).toLowerCase();
    contactData.contact_id = contactId;
    contactData.last_updated = new Date().toISOString().split('T')[0];

    // Normalize email
    contactData.email = contactData.email.toLowerCase().trim();

    // Check if email already exists in People tab
    var people = loadPeople_();
    var existing = people.find(function(c) {
      return containsValue_(c.email, contactData.email);
    });

    if (existing) {
      return {
        success: false,
        error: 'A contact with this email already exists',
        existing_contact: {
          contact_id: existing.contact_id,
          name: (existing.first_name || '') + ' ' + (existing.last_name || '')
        }
      };
    }

    // Build row from People tab headers
    var newRow = headers.map(function(header) {
      return contactData[header] !== undefined ? contactData[header] : '';
    });

    sheet.appendRow(newRow);
    clearContactsCache_();

    return {
      success: true,
      data: contactData,
      contact_id: contactId,
      message: 'Contact created successfully'
    };
  } catch (e) {
    Logger.log('Error in createContact: ' + e);
    return { success: false, error: e.message };
  }
}

/**
 * Create a new contact and link to an agency
 * @param {Object} contactData - Contact data with agency_id
 * @returns {Object} Success/failure result with created contact
 */
function createContactForAgency(contactData) {
  try {
    var sheetInfo = getPeopleSheetForWrite_();
    var sheet = sheetInfo.sheet;
    var headers = sheetInfo.headers;

    // Generate contact_id: CON_ + first 5 chars of first name + first 3 chars of last name
    var firstName = (contactData.first_name || '').trim();
    var lastName = (contactData.last_name || '').trim();
    var contactId = 'CON_' + firstName.substring(0, 5).toLowerCase() + lastName.substring(0, 3).toLowerCase();
    contactData.contact_id = contactId;
    contactData.last_updated = new Date().toISOString().split('T')[0];

    // Normalize email
    if (contactData.email) {
      contactData.email = contactData.email.toLowerCase().trim();
    }

    // Check if email already exists in People tab
    var people = loadPeople_();
    var existing = people.find(function(c) {
      return containsValue_(c.email, contactData.email);
    });
    if (existing) {
      updateContactField_(contactData.email, 'agency_id', contactData.agency_id);
      return { success: true, message: 'Updated existing contact', contact_id: existing.contact_id };
    }

    // Build row from People tab headers
    var newRow = headers.map(function(header) {
      return contactData[header] !== undefined ? contactData[header] : '';
    });

    sheet.appendRow(newRow);
    clearContactsCache_();

    return { success: true, contact_id: contactId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get SEP pipeline overview for dashboard
 * @returns {Object} Comprehensive SEP statistics
 */
function getSEPPipelineOverview() {
  // People tab is already one row per person — no dedup needed
  var people = loadPeople_();

  // Engagement level counts
  var engagementCounts = {};
  people.forEach(function(c) {
    if (c.engagement_level) {
      engagementCounts[c.engagement_level] = (engagementCounts[c.engagement_level] || 0) + 1;
    }
  });

  // Follow-up stats
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  var needFollowUp = 0;
  var overdueFollowUp = 0;
  var thisWeekFollowUp = 0;

  people.forEach(function(c) {
    if (c.next_scheduled_contact) {
      var nextDate = new Date(c.next_scheduled_contact);
      if (nextDate < today) {
        overdueFollowUp++;
      } else if (nextDate <= weekFromNow) {
        thisWeekFollowUp++;
        needFollowUp++;
      }
    }
  });

  return {
    total_contacts: people.length,
    total_agencies: countUniqueAgencies_(people),
    engagement_levels: engagementCounts,
    follow_ups: {
      overdue: overdueFollowUp,
      this_week: thisWeekFollowUp,
      need_attention: needFollowUp + overdueFollowUp
    }
  };
}

/**
 * Count unique agencies from contacts
 * @private
 */
function countUniqueAgencies_(contacts) {
  var agencies = {};
  contacts.forEach(function(c) {
    if (c.agency_id) agencies[c.agency_id] = true;
  });
  return Object.keys(agencies).length;
}

/**
 * Get contacts for SEP pipeline cards (optimized for UI)
 * @returns {Array} Contacts with SEP-relevant fields
 */
function getSEPPipelineContacts() {
  var contacts = loadAllContacts_();

  // Dedupe by primary email and extract SEP-relevant data
  var emailMap = {};
  contacts.forEach(function(c) {
    var email = primaryValue_(c.email);
    if (!email) return;

    if (!emailMap[email]) {
      var resolved = resolveAgency_(c.agency_id);
      emailMap[email] = {
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        agency_id: c.agency_id || '',
        department: resolved.department_name || '',
        agency: resolved.agency_name || '',
        title: c.title,
        region: c.region,
        engagement_level: c.engagement_level,
        last_contact_date: c.last_contact_date,
        next_scheduled_contact: c.next_scheduled_contact,
        // Champion fields
        champion_status: c.champion_status,
        relationship_owner: c.relationship_owner,
        champion_notes: c.champion_notes,
        solutions: []
      };
    }

    // Aggregate solutions
    if (c.solution_id && !emailMap[email].solutions.includes(c.solution_id)) {
      emailMap[email].solutions.push(c.solution_id);
    }
  });

  var results = Object.values(emailMap);

  // Sort by engagement level then by name
  var levelOrder = ['CoOwners', 'Collaborate', 'Info & Feedback', 'Interested', 'Could benefit'];
  results.sort(function(a, b) {
    var aOrder = levelOrder.indexOf(a.engagement_level);
    var bOrder = levelOrder.indexOf(b.engagement_level);
    if (aOrder === -1) aOrder = 99;
    if (bOrder === -1) bOrder = 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.last_name || '').localeCompare(b.last_name || '');
  });

  return deepCopy(results);
}

/**
 * Get touchpoint options for UI
 * @returns {Array} Touchpoint options with metadata
 */
function getTouchpointOptions() {
  return Object.keys(TOUCHPOINTS).map(function(key) {
    return {
      value: key,
      name: TOUCHPOINTS[key].name,
      description: TOUCHPOINTS[key].description
    };
  });
}

/**
 * Get engagement level options for UI
 * @returns {Array} Engagement level options with metadata
 */
function getEngagementLevelOptions() {
  return Object.keys(ENGAGEMENT_LEVELS)
    .sort(function(a, b) {
      return ENGAGEMENT_LEVELS[a].order - ENGAGEMENT_LEVELS[b].order;
    })
    .map(function(key) {
      return {
        value: key,
        order: ENGAGEMENT_LEVELS[key].order,
        description: ENGAGEMENT_LEVELS[key].description
      };
    });
}

// ============================================================================
// CHAMPIONS TRACKING
// ============================================================================

/**
 * Get champion status options for UI
 * @returns {Array} Champion status options with metadata
 */
function getChampionStatusOptions() {
  return Object.keys(CHAMPION_STATUSES)
    .sort(function(a, b) {
      return CHAMPION_STATUSES[a].order - CHAMPION_STATUSES[b].order;
    })
    .map(function(key) {
      return {
        value: key,
        order: CHAMPION_STATUSES[key].order,
        description: CHAMPION_STATUSES[key].description
      };
    });
}

/**
 * Get contacts by champion status
 * @param {string} status - Champion status (Active, Prospective, Alumni, Inactive)
 * @returns {Array} Contacts with this champion status
 */
function getChampions(status) {
  var people = loadPeople_();
  var results;

  if (status) {
    results = people.filter(function(c) {
      return c.champion_status === status;
    });
  } else {
    results = people.filter(function(c) {
      return c.champion_status && c.champion_status.trim() !== '';
    });
  }

  return deepCopy(results);
}

/**
 * Get contacts by relationship owner
 * @param {string} ownerEmail - Email of the MO team member who owns the relationship
 * @returns {Array} Contacts owned by this team member
 */
function getChampionsByOwner(ownerEmail) {
  var people = loadPeople_();
  var emailLower = (ownerEmail || '').toLowerCase().trim();

  var results = people.filter(function(c) {
    return c.relationship_owner &&
           c.relationship_owner.toLowerCase().trim() === emailLower;
  });

  return deepCopy(results);
}

/**
 * Get champion statistics
 * @returns {Object} Statistics about champions by status and owner
 */
function getChampionStats() {
  var people = loadPeople_();
  var champions = people.filter(function(c) {
    return c.champion_status && c.champion_status.trim() !== '';
  });

  var byStatus = {};
  var byOwner = {};

  champions.forEach(function(c) {
    // Count by status
    var status = c.champion_status || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    // Count by owner
    if (c.relationship_owner) {
      var owner = c.relationship_owner.trim();
      byOwner[owner] = (byOwner[owner] || 0) + 1;
    }
  });

  return {
    total_champions: champions.length,
    by_status: byStatus,
    by_owner: byOwner
  };
}

/**
 * Update contact champion status
 * @param {string} email - Contact email
 * @param {string} status - New champion status (Active, Prospective, Alumni, Inactive, or empty to clear)
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactChampionStatus(email, status) {
  // Validate status if provided
  if (status && status.trim() !== '' && !CHAMPION_STATUSES.hasOwnProperty(status)) {
    return { success: false, error: 'Invalid champion status: ' + status };
  }
  return updateContactField_(email, 'champion_status', status || '');
}

/**
 * Update contact relationship owner
 * @param {string} email - Contact email
 * @param {string} ownerEmail - Email of the MO team member who owns this relationship
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactRelationshipOwner(email, ownerEmail) {
  // Normalize owner email
  var normalizedOwner = (ownerEmail || '').toLowerCase().trim();
  return updateContactField_(email, 'relationship_owner', normalizedOwner);
}

/**
 * Update contact champion notes
 * @param {string} email - Contact email
 * @param {string} notes - Champion notes
 * @returns {Object} {success: boolean, error?: string}
 */
function updateContactChampionNotes(email, notes) {
  return updateContactField_(email, 'champion_notes', notes || '');
}

// ============================================================================
// EVENT PARTICIPATION
// ============================================================================

/**
 * Get events that a contact participated in
 * Wrapper for getEventsForContact from engagements-api.gs
 * @param {string} contactId - Contact ID to search for
 * @returns {Array} Events where contact is in event_attendee_ids
 */
function getContactEvents(contactId) {
  // getEventsForContact is defined in engagements-api.gs
  return getEventsForContact(contactId);
}

/**
 * Get event participation summary for a contact
 * @param {string} contactId - Contact ID
 * @returns {Object} Summary of event participation
 */
function getContactEventsSummary(contactId) {
  var events = getEventsForContact(contactId);

  var summary = {
    total_events: events.length,
    upcoming: 0,
    completed: 0,
    by_solution: {},
    events: []
  };

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  events.forEach(function(event) {
    // Count by status
    if (event.event_date) {
      var eventDate = new Date(event.event_date);
      if (eventDate >= today) {
        summary.upcoming++;
      } else {
        summary.completed++;
      }
    }

    // Count by solution
    if (event.solution_id) {
      summary.by_solution[event.solution_id] = (summary.by_solution[event.solution_id] || 0) + 1;
    }

    // Build simplified event list for display
    summary.events.push({
      engagement_id: event.engagement_id,
      event_name: event.event_name || event.subject,
      event_date: event.event_date,
      event_status: event.event_status,
      solution_id: event.solution_id
    });
  });

  return summary;
}
