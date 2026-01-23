/**
 * MO-APIs Library - Contacts API
 * ===============================
 * Comprehensive query functions for MO-DB_Contacts
 * Used by Implementation, SEP, Comms, and Contacts views
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
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
 * Get contacts by solution_id
 * @param {string} solutionId - The solution_id to match
 * @returns {Array} Matching contacts
 */
function getContactsBySolutionId(solutionId) {
  var contacts = loadAllContacts_();
  var idLower = solutionId.toLowerCase();
  var results = contacts.filter(function(c) {
    return c.solution_id_id && c.solution_id_id.toLowerCase() === idLower;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by solution name or solution_id
 * @param {string} solutionName - Full or partial solution name, or solution_id
 * @param {boolean} exactMatch - If true, requires exact match
 * @returns {Array} Matching contacts
 */
function getContactsBySolution(solutionId, exactMatch) {
  var contacts = loadAllContacts_();
  var searchLower = solutionId.toLowerCase();

  var results = contacts.filter(function(c) {
    // Match solution_id (core_id from Solutions DB)
    if (!c.solution_id_id) return false;
    if (exactMatch) {
      return c.solution_id_id.toLowerCase() === searchLower;
    }
    return c.solution_id_id.toLowerCase().indexOf(searchLower) !== -1;
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
 *   {solution_id, role, department, agency, year, firstName, lastName}
 * @returns {Array} Matching contacts
 */
function getContactsMultiFilter(criteria) {
  var contacts = loadAllContacts_();

  var results = contacts.filter(function(c) {
    if (criteria.solution_id &&
        (!c.solution_id_id || c.solution_id_id.toLowerCase().indexOf(criteria.solution_id.toLowerCase()) === -1)) {
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
    if (c.solution_id && entry.solutions.indexOf(c.solution_id) === -1) {
      entry.solutions.push(c.solution_id);
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
    return c.solution_id && regex.test(c.solution_id);
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
    var sol = c.solution_id;
    if (!solutions[sol]) {
      solutions[sol] = {
        solution_id: sol,
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
      if (c.solution_id && c.solution_id.toLowerCase().indexOf(sol.toLowerCase()) !== -1) {
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
  var mySolutions = myContacts.map(function(c) { return c.solution_id; });

  var allContacts = loadAllContacts_();
  var relatedEmails = {};

  allContacts.forEach(function(c) {
    if (c.email === email) return; // Skip self
    if (mySolutions.indexOf(c.solution_id) !== -1) {
      if (!relatedEmails[c.email]) {
        relatedEmails[c.email] = {
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          shared_solutions: []
        };
      }
      if (relatedEmails[c.email].shared_solutions.indexOf(c.solution_id) === -1) {
        relatedEmails[c.email].shared_solutions.push(c.solution_id);
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
    if (c.solution_id) solutions[c.solution_id] = (solutions[c.solution_id] || 0) + 1;
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
    if (!c.department) return;
    if (!depts[c.department]) {
      depts[c.department] = {
        department: c.department,
        unique_emails: {},
        solutions: {}
      };
    }
    depts[c.department].unique_emails[c.email] = true;
    if (c.solution_id) {
      depts[c.department].solutions[c.solution_id] = true;
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
 * @param {string} solutionId - Solution ID (core_id)
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
 * Get contacts by touchpoint status
 * @param {string} touchpoint - Touchpoint (T4, W1, W2, T5, T6, T7, T8)
 * @returns {Array} Contacts in this touchpoint stage
 */
function getContactsByTouchpoint(touchpoint) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.touchpoint_status === touchpoint;
  });
  return JSON.parse(JSON.stringify(results));
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
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get contacts by lifecycle phase
 * @param {string} phase - Lifecycle phase (Assessment, Formulation, CoDesign, Maintenance, Transition)
 * @returns {Array} Contacts in this phase
 */
function getContactsByLifecyclePhase(phase) {
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.lifecycle_phase === phase;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get touchpoint pipeline counts
 * @returns {Object} Count of contacts in each touchpoint
 */
function getTouchpointPipelineCounts() {
  var contacts = loadAllContacts_();
  var counts = {
    T4: 0, W1: 0, W2: 0, T5: 0, T6: 0, T7: 0, T8: 0, unassigned: 0
  };

  contacts.forEach(function(c) {
    if (c.touchpoint_status && counts.hasOwnProperty(c.touchpoint_status)) {
      counts[c.touchpoint_status]++;
    } else {
      counts.unassigned++;
    }
  });

  return counts;
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

  return JSON.parse(JSON.stringify(results));
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

  return JSON.parse(JSON.stringify(results));
}

/**
 * Update contact touchpoint status
 * @param {string} email - Contact email
 * @param {string} touchpoint - New touchpoint status
 * @returns {boolean} Success status
 */
function updateContactTouchpoint(email, touchpoint) {
  return updateContactField_(email, 'touchpoint_status', touchpoint);
}

/**
 * Update contact engagement level
 * @param {string} email - Contact email
 * @param {string} level - New engagement level
 * @returns {boolean} Success status
 */
function updateContactEngagement(email, level) {
  return updateContactField_(email, 'engagement_level', level);
}

/**
 * Update contact last contact date
 * @param {string} email - Contact email
 * @param {string} date - Date (ISO string or YYYY-MM-DD)
 * @returns {boolean} Success status
 */
function updateContactLastContactDate(email, date) {
  return updateContactField_(email, 'last_contact_date', date);
}

/**
 * Update contact next scheduled contact
 * @param {string} email - Contact email
 * @param {string} date - Date (ISO string or YYYY-MM-DD)
 * @returns {boolean} Success status
 */
function updateContactNextScheduledContact(email, date) {
  return updateContactField_(email, 'next_scheduled_contact', date);
}

/**
 * Update a single field for a contact by email
 * @private
 */
function updateContactField_(email, fieldName, value) {
  var sheet = getContactsSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var emailColIndex = headers.indexOf('email');
  var fieldColIndex = headers.indexOf(fieldName);

  if (emailColIndex === -1) {
    throw new Error('email column not found');
  }
  if (fieldColIndex === -1) {
    throw new Error(fieldName + ' column not found');
  }

  var updated = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][emailColIndex] && data[i][emailColIndex].toLowerCase() === email.toLowerCase()) {
      sheet.getRange(i + 1, fieldColIndex + 1).setValue(value);
      updated = true;
      // Don't break - update all rows for this email
    }
  }

  if (updated) {
    _contactsCache = null; // Clear cache
  }

  return updated;
}

/**
 * Get SEP pipeline overview for dashboard
 * @returns {Object} Comprehensive SEP statistics
 */
function getSEPPipelineOverview() {
  var contacts = loadAllContacts_();

  // Get unique contacts
  var uniqueEmails = {};
  contacts.forEach(function(c) {
    if (c.email) uniqueEmails[c.email] = c;
  });
  var uniqueContacts = Object.values(uniqueEmails);

  // Touchpoint counts
  var touchpointCounts = { T4: 0, W1: 0, W2: 0, T5: 0, T6: 0, T7: 0, T8: 0 };
  uniqueContacts.forEach(function(c) {
    if (c.touchpoint_status && touchpointCounts.hasOwnProperty(c.touchpoint_status)) {
      touchpointCounts[c.touchpoint_status]++;
    }
  });

  // Engagement level counts
  var engagementCounts = {};
  uniqueContacts.forEach(function(c) {
    if (c.engagement_level) {
      engagementCounts[c.engagement_level] = (engagementCounts[c.engagement_level] || 0) + 1;
    }
  });

  // Lifecycle phase counts
  var phaseCounts = {};
  uniqueContacts.forEach(function(c) {
    if (c.lifecycle_phase) {
      phaseCounts[c.lifecycle_phase] = (phaseCounts[c.lifecycle_phase] || 0) + 1;
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

  uniqueContacts.forEach(function(c) {
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
    total_contacts: uniqueContacts.length,
    total_agencies: countUniqueAgencies_(uniqueContacts),
    touchpoint_pipeline: touchpointCounts,
    engagement_levels: engagementCounts,
    lifecycle_phases: phaseCounts,
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
    else if (c.agency) agencies[c.agency] = true;
  });
  return Object.keys(agencies).length;
}

/**
 * Get contacts for SEP pipeline cards (optimized for UI)
 * @returns {Array} Contacts with SEP-relevant fields
 */
function getSEPPipelineContacts() {
  var contacts = loadAllContacts_();

  // Dedupe by email and extract SEP-relevant data
  var emailMap = {};
  contacts.forEach(function(c) {
    var email = c.email;
    if (!email) return;

    if (!emailMap[email]) {
      emailMap[email] = {
        email: email,
        first_name: c.first_name,
        last_name: c.last_name,
        department: c.department,
        agency: c.agency,
        agency_id: c.agency_id,
        title: c.title,
        region: c.region,
        touchpoint_status: c.touchpoint_status,
        lifecycle_phase: c.lifecycle_phase,
        engagement_level: c.engagement_level,
        last_contact_date: c.last_contact_date,
        next_scheduled_contact: c.next_scheduled_contact,
        relationship_notes: c.relationship_notes,
        solutions: []
      };
    }

    // Aggregate solutions
    if (c.solution_id && emailMap[email].solutions.indexOf(c.solution_id) === -1) {
      emailMap[email].solutions.push(c.solution_id);
    }
  });

  var results = Object.values(emailMap);

  // Sort by touchpoint then by name
  var touchpointOrder = ['T4', 'W1', 'W2', 'T5', 'T6', 'T7', 'T8'];
  results.sort(function(a, b) {
    var aOrder = touchpointOrder.indexOf(a.touchpoint_status);
    var bOrder = touchpointOrder.indexOf(b.touchpoint_status);
    if (aOrder === -1) aOrder = 99;
    if (bOrder === -1) bOrder = 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.last_name || '').localeCompare(b.last_name || '');
  });

  return JSON.parse(JSON.stringify(results));
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
