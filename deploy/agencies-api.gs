/**
 * Agencies API - SEP-NSITE
 * ========================
 * Organization hierarchy and agency profile management
 * for the Stakeholder Engagement Pipeline
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Agencies sheet
 * Reads AGENCIES_SHEET_ID from MO-DB_Config
 */
function getAgenciesSheet_() {
  var sheetId = getConfigValue('AGENCIES_SHEET_ID');
  if (!sheetId) {
    throw new Error('AGENCIES_SHEET_ID not configured in MO-DB_Config');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for agencies data (refreshed per execution)
 */
var _agenciesCache = null;

/**
 * Load all agencies into memory for fast querying
 */
function loadAllAgencies_() {
  if (_agenciesCache !== null) {
    return _agenciesCache;
  }

  var sheet = getAgenciesSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _agenciesCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var agency = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      if (value instanceof Date) {
        agency[header] = value.toISOString();
      } else {
        agency[header] = value;
      }
    });
    // Only include records with agency_id
    if (agency.agency_id) {
      _agenciesCache.push(agency);
    }
  }

  return _agenciesCache;
}

/**
 * Clear agencies cache (call after mutations)
 */
function clearAgenciesCache_() {
  _agenciesCache = null;
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
  return JSON.parse(JSON.stringify(agencies));
}

/**
 * Get agency by ID
 * @param {string} agencyId - Agency ID
 * @returns {Object|null} Agency record or null
 */
function getAgencyById(agencyId) {
  var agencies = loadAllAgencies_();
  var agency = agencies.find(function(a) {
    return a.agency_id === agencyId;
  });
  return agency ? JSON.parse(JSON.stringify(agency)) : null;
}

/**
 * Create a new agency
 * @param {Object} agencyData - Agency data
 * @returns {Object} Created agency with ID
 */
function createAgency(agencyData) {
  var sheet = getAgenciesSheet_();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

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
  var sheet = getAgenciesSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('agency_id');
  if (idColIndex === -1) {
    throw new Error('agency_id column not found');
  }

  // Find row to update
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === agencyId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return null;
  }

  // Update timestamp
  updates.updated_at = new Date().toISOString();

  // Update cells
  headers.forEach(function(header, colIndex) {
    if (updates.hasOwnProperty(header) && header !== 'agency_id' && header !== 'created_at') {
      sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[header]);
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
  var sheet = getAgenciesSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('agency_id');
  if (idColIndex === -1) {
    return false;
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === agencyId) {
      sheet.deleteRow(i + 1);
      clearAgenciesCache_();
      return true;
    }
  }

  return false;
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
  return JSON.parse(JSON.stringify(roots));
}

/**
 * Get sub-agencies (children) of an agency
 * @param {string} parentId - Parent agency ID
 * @returns {Array} Child agencies
 */
function getSubAgencies(parentId) {
  var agencies = loadAllAgencies_();
  var children = agencies.filter(function(a) {
    return a.parent_agency_id === parentId;
  });
  return JSON.parse(JSON.stringify(children));
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
    agencyMap[a.agency_id] = JSON.parse(JSON.stringify(a));
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
    ancestry.push(JSON.parse(JSON.stringify(current)));
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
    return (a.name && a.name.toLowerCase().indexOf(queryLower) !== -1) ||
           (a.full_name && a.full_name.toLowerCase().indexOf(queryLower) !== -1) ||
           (a.abbreviation && a.abbreviation.toLowerCase().indexOf(queryLower) !== -1);
  });

  return JSON.parse(JSON.stringify(results));
}

/**
 * Get agencies by type
 * @param {string} agencyType - Type (Federal Agency, Bureau, Office, Lab)
 * @returns {Array} Matching agencies
 */
function getAgenciesByType(agencyType) {
  var agencies = loadAllAgencies_();
  var results = agencies.filter(function(a) {
    return a.type && a.type.toLowerCase() === agencyType.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get agencies by relationship status
 * @param {string} status - Relationship status (New, Developing, Established, Strong, Dormant)
 * @returns {Array} Matching agencies
 */
function getAgenciesByRelationshipStatus(status) {
  var agencies = loadAllAgencies_();
  var results = agencies.filter(function(a) {
    return a.relationship_status && a.relationship_status.toLowerCase() === status.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get agencies by geographic scope
 * @param {string} scope - Geographic scope (National, Regional, State, Local, International)
 * @returns {Array} Matching agencies
 */
function getAgenciesByGeographicScope(scope) {
  var agencies = loadAllAgencies_();
  var results = agencies.filter(function(a) {
    return a.geographic_scope && a.geographic_scope.toLowerCase() === scope.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
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
  // This queries contacts-api using the agency_id field
  var contacts = loadAllContacts_();
  var results = contacts.filter(function(c) {
    return c.agency_id === agencyId;
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get agency statistics
 * @param {string} agencyId - Agency ID (optional, returns all if not specified)
 * @returns {Object|Array} Stats for one or all agencies
 */
function getAgencyStats(agencyId) {
  var agencies = loadAllAgencies_();
  var contacts = loadAllContacts_();

  function calcStats(agency) {
    var agencyContacts = contacts.filter(function(c) {
      return c.agency_id === agency.agency_id;
    });

    // Get unique contact emails
    var uniqueEmails = {};
    agencyContacts.forEach(function(c) {
      if (c.email) uniqueEmails[c.email] = true;
    });

    // Count by touchpoint
    var byTouchpoint = {};
    agencyContacts.forEach(function(c) {
      if (c.touchpoint_status) {
        byTouchpoint[c.touchpoint_status] = (byTouchpoint[c.touchpoint_status] || 0) + 1;
      }
    });

    // Count by engagement level
    var byEngagement = {};
    agencyContacts.forEach(function(c) {
      if (c.engagement_level) {
        byEngagement[c.engagement_level] = (byEngagement[c.engagement_level] || 0) + 1;
      }
    });

    return {
      agency_id: agency.agency_id,
      agency_name: agency.name,
      total_contacts: Object.keys(uniqueEmails).length,
      by_touchpoint: byTouchpoint,
      by_engagement: byEngagement
    };
  }

  if (agencyId) {
    var agency = agencies.find(function(a) { return a.agency_id === agencyId; });
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

  var byType = {};
  var byStatus = {};
  var byScope = {};

  agencies.forEach(function(a) {
    if (a.type) byType[a.type] = (byType[a.type] || 0) + 1;
    if (a.relationship_status) byStatus[a.relationship_status] = (byStatus[a.relationship_status] || 0) + 1;
    if (a.geographic_scope) byScope[a.geographic_scope] = (byScope[a.geographic_scope] || 0) + 1;
  });

  return {
    total_agencies: agencies.length,
    root_agencies: agencies.filter(function(a) { return !a.parent_agency_id; }).length,
    by_type: byType,
    by_relationship_status: byStatus,
    by_geographic_scope: byScope
  };
}
