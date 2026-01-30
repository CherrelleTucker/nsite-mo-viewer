/**
 * MO-APIs Library - Agencies API
 * ===============================
 * Organization hierarchy and agency profile management
 * for the Stakeholder Engagement Pipeline
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs, contacts-api.gs (for getAgencyContacts)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Uses shared utilities from config-helpers.gs:
// - loadSheetData_() for cached data loading
// - getSheetForWrite_() for write operations
// - filterByProperty(), countByField(), getById() for queries
// - deepCopy() for safe object copying

/**
 * Load all agencies into memory for fast querying
 * Uses shared loadSheetData_() with filtering for valid records
 */
function loadAllAgencies_() {
  var allData = loadSheetData_('AGENCIES_SHEET_ID', '_agencies');
  // Filter to only include records with agency_id
  return allData.filter(function(a) { return a.agency_id; });
}

/**
 * Clear agencies cache (call after mutations)
 */
function clearAgenciesCache_() {
  clearSheetDataCache('_agencies');
}

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Get all agencies
 * @returns {Array} All agency records
 */
function getAllAgencies() {
  var agencies = loadAllAgencies_();
  return deepCopy(agencies);
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
 * @returns {Object} Created agency with ID
 */
function createAgency(agencyData) {
  var sheetInfo = getSheetForWrite_('AGENCIES_SHEET_ID');
  var sheet = sheetInfo.sheet;
  var headers = sheetInfo.headers;

  // Generate agency_id if not provided
  if (!agencyData.agency_id) {
    agencyData.agency_id = 'AGY_' + new Date().getTime();
  }

  // Set timestamps
  var now = new Date().toISOString();
  agencyData.created_at = now;
  agencyData.updated_at = now;

  // Build row from headers
  var newRow = headers.map(function(header) {
    return agencyData[header] !== undefined ? agencyData[header] : '';
  });

  sheet.appendRow(newRow);
  clearAgenciesCache_();

  return agencyData;
}

/**
 * Update an existing agency
 * @param {string} agencyId - Agency ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated agency or null if not found
 */
function updateAgency(agencyId, updates) {
  var sheetInfo = getSheetForWrite_('AGENCIES_SHEET_ID');
  var sheet = sheetInfo.sheet;
  var headers = sheetInfo.headers;

  // Find row to update using shared utility
  var rowIndex = findRowByField_(sheet, headers, 'agency_id', agencyId);
  if (rowIndex === -1) {
    return null;
  }

  // Update timestamp
  updates.updated_at = new Date().toISOString();

  // Update cells (rowIndex is already 1-indexed from findRowByField_)
  headers.forEach(function(header, colIndex) {
    if (updates.hasOwnProperty(header) && header !== 'agency_id' && header !== 'created_at') {
      sheet.getRange(rowIndex, colIndex + 1).setValue(updates[header]);
    }
  });

  clearAgenciesCache_();

  return getAgencyById(agencyId);
}

/**
 * Delete an agency
 * @param {string} agencyId - Agency ID to delete
 * @returns {boolean} Success status
 */
function deleteAgency(agencyId) {
  var sheetInfo = getSheetForWrite_('AGENCIES_SHEET_ID');
  var sheet = sheetInfo.sheet;
  var headers = sheetInfo.headers;

  // Find row using shared utility
  var rowIndex = findRowByField_(sheet, headers, 'agency_id', agencyId);
  if (rowIndex === -1) {
    return false;
  }

  sheet.deleteRow(rowIndex);
  clearAgenciesCache_();
  return true;
}

// ============================================================================
// HIERARCHY QUERIES
// ============================================================================

/**
 * Get root-level agencies (no parent)
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
 * Get full agency hierarchy as a tree structure
 * @returns {Array} Hierarchical agency tree
 */
function getAgencyHierarchy() {
  var agencies = loadAllAgencies_();

  // Build lookup map
  var agencyMap = {};
  agencies.forEach(function(a) {
    agencyMap[a.agency_id] = deepCopy(a);
    agencyMap[a.agency_id].children = [];
  });

  // Build tree
  var roots = [];
  agencies.forEach(function(a) {
    if (a.parent_agency_id && agencyMap[a.parent_agency_id]) {
      agencyMap[a.parent_agency_id].children.push(agencyMap[a.agency_id]);
    } else {
      roots.push(agencyMap[a.agency_id]);
    }
  });

  // Sort roots and children by name
  function sortByName(arr) {
    arr.sort(function(a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });
    arr.forEach(function(item) {
      if (item.children && item.children.length > 0) {
        sortByName(item.children);
      }
    });
  }

  sortByName(roots);

  return roots;
}

/**
 * Get agency ancestry (path to root)
 * @param {string} agencyId - Agency ID
 * @returns {Array} Array of agencies from current to root
 */
function getAgencyAncestry(agencyId) {
  var agencies = loadAllAgencies_();
  var agencyMap = {};
  agencies.forEach(function(a) {
    agencyMap[a.agency_id] = a;
  });

  var ancestry = [];
  var current = agencyMap[agencyId];

  while (current) {
    ancestry.push(deepCopy(current));
    if (current.parent_agency_id && agencyMap[current.parent_agency_id]) {
      current = agencyMap[current.parent_agency_id];
    } else {
      current = null;
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
// CONTACT INTEGRATION
// ============================================================================

/**
 * Get contacts associated with an agency
 * @param {string} agencyId - Agency ID
 * @returns {Array} Contacts linked to this agency
 */
function getAgencyContacts(agencyId) {
  return filterByProperty(loadAllContacts_(), 'agency_id', agencyId, true);
}

/**
 * Get agency statistics
 * @param {string} agencyId - Agency ID (optional, returns all if not specified)
 * @returns {Object|Array} Stats for one or all agencies
 */
function getAgencyStats(agencyId) {
  var agencies = loadAllAgencies_();
  var allContacts = loadAllContacts_();

  function calcStats(agency) {
    var agencyContacts = allContacts.filter(function(c) {
      return c.agency_id === agency.agency_id;
    });

    // Use shared utilities for deduplication and counting
    var uniqueContacts = deduplicateByField(agencyContacts, 'email', true);

    return {
      agency_id: agency.agency_id,
      agency_name: agency.name,
      total_contacts: uniqueContacts.length,
      by_touchpoint: countByField(agencyContacts, 'touchpoint_status'),
      by_engagement: countByField(agencyContacts, 'engagement_level')
    };
  }

  if (agencyId) {
    var agency = getById(agencies, 'agency_id', agencyId);
    if (!agency) return null;
    return calcStats(agency);
  }

  // Return stats for all agencies
  return agencies.map(function(a) {
    return calcStats(a);
  });
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

  return {
    total_agencies: agencies.length,
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
 * Aggregates engagements from all contacts at this agency
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

  // Filter engagements involving any contact at this agency
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

  // Calculate days since last engagement
  var daysSince = null;
  if (lastDate) {
    var now = new Date();
    daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  }

  // Determine heat status
  var heatStatus = 'cold';
  if (daysSince !== null) {
    if (daysSince <= 30) heatStatus = 'hot';
    else if (daysSince <= 90) heatStatus = 'warm';
  }

  // Use shared utility for activity_type counting
  var byType = countByField(agencyEngagements, 'activity_type');

  // Complex aggregation for comma-separated and derived fields
  var bySolution = {};
  var byMonth = {};
  var solutionsSet = {};
  var engagedContactEmails = {};

  agencyEngagements.forEach(function(e) {
    // Handle solution_id (can be comma-separated for multiple)
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
    // Count by month (YYYY-MM format)
    if (e.date) {
      var monthKey = e.date.substring(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }
    // Track which contacts have engagements
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
 * Returns all engagements involving contacts at this agency
 * @param {string} agencyId - Agency ID
 * @param {number} limit - Max results (default 50)
 * @returns {Array} Engagements sorted by date descending
 */
function getAgencyEngagementTimeline(agencyId, limit) {
  limit = limit || 50;
  var contacts = getAgencyContacts(agencyId);
  var contactEmails = contacts.map(function(c) { return (c.email || '').toLowerCase(); });

  if (contactEmails.length === 0) {
    return [];
  }

  var engagements = loadAllEngagements_();

  // Filter and enrich with contact info
  var agencyEngagements = engagements.filter(function(e) {
    if (!e.participants) return false;
    var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
    return participants.some(function(p) { return contactEmails.includes(p); });
  }).map(function(e) {
    // Add matched contacts info
    var matchedContacts = [];
    if (e.participants) {
      var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
      participants.forEach(function(p) {
        var contact = contacts.find(function(c) { return (c.email || '').toLowerCase() === p; });
        if (contact) {
          matchedContacts.push({
            email: contact.email,
            name: contact.first_name + ' ' + contact.last_name
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

  // Build email -> solutions map
  var emailToSolutions = {};
  engagements.forEach(function(e) {
    if (!e.participants || !e.solution_id) return;
    var participants = e.participants.split(',').map(function(p) { return p.trim().toLowerCase(); });
    participants.forEach(function(p) {
      if (!emailToSolutions[p]) emailToSolutions[p] = {};
      emailToSolutions[p][e.solution_id] = true;
    });
  });

  // Add tags to contacts
  contacts.forEach(function(c) {
    var emailLower = (c.email || '').toLowerCase();
    c.solution_tags = emailToSolutions[emailLower] ? Object.keys(emailToSolutions[emailLower]) : [];
  });

  return deepCopy(contacts);
}

/**
 * Get cross-agency network data for visualization
 * Shows how an agency connects to other agencies through shared solution engagements
 * @param {string} agencyId - Starting agency ID
 * @returns {Object} Network data with nodes and edges
 */
function getCrossAgencyNetwork(agencyId) {
  var allContacts = loadAllContacts_();
  var engagements = loadAllEngagements_();
  var allAgencies = loadAllAgencies_();

  // Build lookup maps
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
    if (a.agency_id) {
      agencyById[a.agency_id] = a;
    }
  });

  // Get starting agency contacts
  var startAgencyContacts = allContacts.filter(function(c) {
    return c.agency_id === agencyId;
  });
  var startContactEmails = {};
  startAgencyContacts.forEach(function(c) {
    if (c.email) startContactEmails[c.email.toLowerCase()] = true;
  });

  // Build email -> solutions and solution -> emails maps
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

  // Find solutions the starting agency's contacts engaged with
  var startAgencySolutions = {};
  Object.keys(startContactEmails).forEach(function(email) {
    if (emailToSolutions[email]) {
      Object.keys(emailToSolutions[email]).forEach(function(sol) {
        startAgencySolutions[sol] = true;
      });
    }
  });

  // Find all contacts who engaged with those solutions (across all agencies)
  var connectedEmails = {};
  Object.keys(startAgencySolutions).forEach(function(solId) {
    if (solutionToEmails[solId]) {
      Object.keys(solutionToEmails[solId]).forEach(function(email) {
        connectedEmails[email] = true;
      });
    }
  });

  // Build network nodes and edges
  var nodes = [];
  var edges = [];
  var addedAgencies = {};
  var addedContacts = {};
  var addedSolutions = {};

  // Add starting agency node
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

  // Process all connected contacts
  Object.keys(connectedEmails).forEach(function(email) {
    var contact = emailToContact[email];
    var contactAgencyId = emailToAgency[email];
    if (!contact) return;

    var contactName = ((contact.first_name || '') + ' ' + (contact.last_name || '')).trim() || email;
    var isStartAgency = startContactEmails[email];

    // Add contact node
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

    // Add contact's agency if not start agency
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

    // Edge: contact -> agency
    if (contactAgencyId) {
      edges.push({
        from: 'contact_' + email,
        to: 'agency_' + contactAgencyId,
        type: 'member'
      });
    }

    // Add solution nodes and edges for this contact
    if (emailToSolutions[email]) {
      Object.keys(emailToSolutions[email]).forEach(function(solId) {
        // Only include solutions that connect to the start agency
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

        // Edge: contact -> solution
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
  if (!agency.status) return true; // Default to active if no status
  var status = String(agency.status).toLowerCase();
  return status === 'active' || status === '';
}
