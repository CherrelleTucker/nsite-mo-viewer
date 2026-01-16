/**
 * Contacts API - Shared Resource
 * ===============================
 * Comprehensive query functions for MO-DB_Contacts
 * Used by Implementation, SEP, Comms, and Contacts views
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Contacts sheet
 * Reads CONTACTS_SHEET_ID from MO-DB_Config
 */
function getContactsSheet_() {
  var sheetId = getConfigValue('CONTACTS_SHEET_ID');
  if (!sheetId) {
    throw new Error('CONTACTS_SHEET_ID not configured in MO-DB_Config');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for contacts data (refreshed per execution)
 */
var _contactsCache = null;

/**
 * Load all contacts into memory for fast querying
 */
function loadAllContacts_() {
  if (_contactsCache !== null) {
    return _contactsCache;
  }

  var sheet = getContactsSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _contactsCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var contact = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      // Convert dates to ISO strings
      if (value instanceof Date) {
        contact[header] = value.toISOString();
      } else {
        contact[header] = value;
      }
    });
    _contactsCache.push(contact);
  }

  return _contactsCache;
}

// ============================================================================
// CORE QUERY FUNCTIONS
// ============================================================================

/**
 * Get all contacts (with optional limit)
 * @param {number} limit - Optional max results
 * @returns {Array} Contact records
 */
function getAllContacts(limit) {
  var contacts = loadAllContacts_();
  if (limit && limit > 0) {
    return JSON.parse(JSON.stringify(contacts.slice(0, limit)));
  }
  return JSON.parse(JSON.stringify(contacts));
}

/**
 * Get contacts by solution name
 * @param {string} solutionName - Full or partial solution name
 * @param {boolean} exactMatch - If true, requires exact match
 * @returns {Array} Matching contacts
 */
function getContactsBySolution(solutionName, exactMatch) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    if (exactMatch) {
      return c.solution === solutionName;
    }
    return c.solution && c.solution.toLowerCase().indexOf(solutionName.toLowerCase()) !== -1;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by email
 * @param {string} email - Email address
 * @returns {Array} All records for this email
 */
function getContactsByEmail(email) {
  var contacts = loadAllContacts_();
  var emailLower = email.toLowerCase();
  var results = contacts.filter(function(c) {
    return c.email && c.email.toLowerCase() === emailLower;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by name (first, last, or both)
 * @param {string} firstName - First name (optional)
 * @param {string} lastName - Last name (optional)
 * @returns {Array} Matching contacts
 */
function getContactsByName(firstName, lastName) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    var matchFirst = !firstName ||
      (c.first_name && c.first_name.toLowerCase().indexOf(firstName.toLowerCase()) !== -1);
    var matchLast = !lastName ||
      (c.last_name && c.last_name.toLowerCase().indexOf(lastName.toLowerCase()) !== -1);
    return matchFirst && matchLast;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by role
 * @param {string} role - Role type (Survey Submitter, Primary SME, etc.)
 * @returns {Array} Matching contacts
 */
function getContactsByRole(role) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.role && c.role.toLowerCase() === role.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by department
 * @param {string} department - Department name (partial match)
 * @returns {Array} Matching contacts
 */
function getContactsByDepartment(department) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.department && c.department.toLowerCase().indexOf(department.toLowerCase()) !== -1;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by agency
 * @param {string} agency - Agency name (partial match)
 * @returns {Array} Matching contacts
 */
function getContactsByAgency(agency) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.agency && c.agency.toLowerCase().indexOf(agency.toLowerCase()) !== -1;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by survey year
 * @param {number} year - Survey year (2016, 2018, 2020, 2022, 2024)
 * @returns {Array} Matching contacts
 */
function getContactsBySurveyYear(year) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.survey_year === year;
  });
  return JSON.parse(JSON.stringify(results));
}

// ============================================================================
// ADVANCED QUERY FUNCTIONS
// ============================================================================

/**
 * Get contacts matching multiple criteria
 * @param {Object} criteria - Filter criteria
 *   {solution, role, department, agency, year, firstName, lastName}
 * @returns {Array} Matching contacts
 */
function getContactsMultiFilter(criteria) {
  var contacts = loadAllContacts_();

  var results = contacts.filter(function(c) {
    if (criteria.solution &&
        (!c.solution || c.solution.toLowerCase().indexOf(criteria.solution.toLowerCase()) === -1)) {
      return false;
    }
    if (criteria.role &&
        (!c.role || c.role.toLowerCase() !== criteria.role.toLowerCase())) {
      return false;
    }
    if (criteria.department &&
        (!c.department || c.department.toLowerCase().indexOf(criteria.department.toLowerCase()) === -1)) {
      return false;
    }
    if (criteria.agency &&
        (!c.agency || c.agency.toLowerCase().indexOf(criteria.agency.toLowerCase()) === -1)) {
      return false;
    }
    if (criteria.year && c.survey_year !== criteria.year) {
      return false;
    }
    if (criteria.firstName &&
        (!c.first_name || c.first_name.toLowerCase().indexOf(criteria.firstName.toLowerCase()) === -1)) {
      return false;
    }
    if (criteria.lastName &&
        (!c.last_name || c.last_name.toLowerCase().indexOf(criteria.lastName.toLowerCase()) === -1)) {
      return false;
    }
    return true;
  });

  return JSON.parse(JSON.stringify(results));
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
    var email = c.email;
    if (!email) return;

    if (!emailMap[email]) {
      emailMap[email] = {
        email: email,
        first_name: c.first_name,
        last_name: c.last_name,
        primary_email: c.primary_email,
        phone: c.phone,
        department: c.department,
        agency: c.agency,
        organization: c.organization,
        solutions: [],
        roles: [],
        years: []
      };
    }

    var entry = emailMap[email];
    if (c.solution && entry.solutions.indexOf(c.solution) === -1) {
      entry.solutions.push(c.solution);
    }
    if (c.role && entry.roles.indexOf(c.role) === -1) {
      entry.roles.push(c.role);
    }
    if (c.survey_year && entry.years.indexOf(c.survey_year) === -1) {
      entry.years.push(c.survey_year);
    }
  });

  var results = Object.keys(emailMap).map(function(email) {
    var e = emailMap[email];
    e.solutions_count = e.solutions.length;
    e.years.sort();
    return e;
  });

  return JSON.parse(JSON.stringify(results));
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
    return c.solution && regex.test(c.solution);
  });

  var unique = getUniqueContacts(filtered);

  return unique.map(function(c) {
    return {
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      department: c.department
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
  var contacts = getContactsByEmail(email);

  var solutions = {};
  contacts.forEach(function(c) {
    var sol = c.solution;
    if (!solutions[sol]) {
      solutions[sol] = {
        solution: sol,
        roles: [],
        years: []
      };
    }
    if (c.role && solutions[sol].roles.indexOf(c.role) === -1) {
      solutions[sol].roles.push(c.role);
    }
    if (c.survey_year && solutions[sol].years.indexOf(c.survey_year) === -1) {
      solutions[sol].years.push(c.survey_year);
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
  var contacts = loadAllContacts_();

  // Get unique emails per solution
  var solutionEmails = {};
  solutionNames.forEach(function(sol) {
    solutionEmails[sol] = [];
  });

  contacts.forEach(function(c) {
    solutionNames.forEach(function(sol) {
      if (c.solution && c.solution.toLowerCase().indexOf(sol.toLowerCase()) !== -1) {
        if (solutionEmails[sol].indexOf(c.email) === -1) {
          solutionEmails[sol].push(c.email);
        }
      }
    });
  });

  // Find intersection
  var allEmails = solutionEmails[solutionNames[0]] || [];
  for (var i = 1; i < solutionNames.length; i++) {
    var nextEmails = solutionEmails[solutionNames[i]] || [];
    allEmails = allEmails.filter(function(email) {
      return nextEmails.indexOf(email) !== -1;
    });
  }

  // Get full contact info
  var results = [];
  allEmails.forEach(function(email) {
    var contactRecords = getContactsByEmail(email);
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
  var myContacts = getContactsByEmail(email);
  var mySolutions = myContacts.map(function(c) { return c.solution; });

  var allContacts = loadAllContacts_();
  var relatedEmails = {};

  allContacts.forEach(function(c) {
    if (c.email === email) return; // Skip self
    if (mySolutions.indexOf(c.solution) !== -1) {
      if (!relatedEmails[c.email]) {
        relatedEmails[c.email] = {
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          shared_solutions: []
        };
      }
      if (relatedEmails[c.email].shared_solutions.indexOf(c.solution) === -1) {
        relatedEmails[c.email].shared_solutions.push(c.solution);
      }
    }
  });

  var results = Object.keys(relatedEmails).map(function(e) {
    var r = relatedEmails[e];
    r.shared_count = r.shared_solutions.length;
    return r;
  });

  // Sort by most shared solutions
  results.sort(function(a, b) {
    return b.shared_count - a.shared_count;
  });

  return JSON.parse(JSON.stringify(results));
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
    if (c.email) uniqueEmails[c.email] = true;
    if (c.solution) solutions[c.solution] = (solutions[c.solution] || 0) + 1;
    if (c.department) departments[c.department] = (departments[c.department] || 0) + 1;
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
      .map(function(s) { return { solution: s, count: solutions[s] }; })
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
    if (!c.solution) return;
    if (!solutions[c.solution]) {
      solutions[c.solution] = {
        solution: c.solution,
        total: 0,
        unique_emails: {},
        by_role: {}
      };
    }
    solutions[c.solution].total++;
    solutions[c.solution].unique_emails[c.email] = true;
    if (c.role) {
      solutions[c.solution].by_role[c.role] = (solutions[c.solution].by_role[c.role] || 0) + 1;
    }
  });

  return Object.keys(solutions).map(function(sol) {
    var s = solutions[sol];
    return {
      solution: s.solution,
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
    if (!c.department) return;
    if (!depts[c.department]) {
      depts[c.department] = {
        department: c.department,
        unique_emails: {},
        solutions: {}
      };
    }
    depts[c.department].unique_emails[c.email] = true;
    if (c.solution) {
      depts[c.department].solutions[c.solution] = true;
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
 * @param {string} solutionName - Solution name
 * @returns {Object} Summary stats and key contacts
 */
function getSolutionStakeholderSummary(solutionName) {
  var contacts = getContactsBySolution(solutionName, false);
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
    solution: solutionName,
    total_contacts: unique.length,
    by_role: byRole,
    primary_smes: primarySMEs.slice(0, 5),
    departments: [...new Set(contacts.map(function(c) { return c.department; }).filter(Boolean))]
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
