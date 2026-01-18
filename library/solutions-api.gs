/**
 * MO-APIs Library - Solutions API
 * ================================
 * Data access functions for MO-DB_Solutions.
 * Reads from the Solutions sheet configured in MO-DB_Config.
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 *
 * @fileoverview Solutions data access layer
 */

// ============================================================================
// SOLUTIONS DATA ACCESS
// ============================================================================

/**
 * Get all solutions from MO-DB_Solutions
 * @returns {Object[]} Array of solution objects
 */
function getAllSolutions() {
  try {
    var sheetId = getConfigValue('SOLUTIONS_SHEET_ID');

    if (!sheetId) {
      Logger.log('SOLUTIONS_SHEET_ID not configured in MO-DB_Config');
      return getSampleSolutions();
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) return [];

    var headers = data[0];
    var rows = data.slice(1);

    var solutions = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) {
        var value = row[i];
        // Convert Date objects to ISO strings (fixes google.script.run null response)
        if (value instanceof Date) {
          obj[header] = value.toISOString();
        } else {
          obj[header] = value;
        }
      });
      return obj;
    }).filter(function(sol) {
      return sol.solution_id && String(sol.solution_id).trim();
    });

    solutions.sort(function(a, b) {
      var cycleA = parseInt(a.cycle) || 0;
      var cycleB = parseInt(b.cycle) || 0;
      if (cycleB !== cycleA) return cycleB - cycleA;
      return (a.name || '').localeCompare(b.name || '');
    });

    return solutions;
  } catch (e) {
    Logger.log('Error reading solutions: ' + e.message);
    return getSampleSolutions();
  }
}

/**
 * Alias for getAllSolutions - used by frontend
 * Version 2: Added JSON sanitization to fix null response
 */
function getSolutions() {
  Logger.log('getSolutions() v2 called');
  try {
    var solutions = getAllSolutions();
    Logger.log('Got ' + (solutions ? solutions.length : 0) + ' solutions');

    // Force JSON round-trip to ensure serializability
    var jsonStr = JSON.stringify(solutions);
    var sanitized = JSON.parse(jsonStr);

    Logger.log('Sanitized OK, returning ' + sanitized.length + ' solutions');
    return sanitized;
  } catch (e) {
    Logger.log('getSolutions() ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return [];
  }
}

/**
 * Get a single solution by ID
 */
function getSolution(solutionId) {
  var solutions = getAllSolutions();
  for (var i = 0; i < solutions.length; i++) {
    if (solutions[i].solution_id === solutionId) return solutions[i];
  }
  return null;
}

/**
 * Get solutions by cycle
 */
function getSolutionsByCycle(cycle) {
  return getAllSolutions().filter(function(sol) {
    return String(sol.cycle) === String(cycle);
  });
}

/**
 * Get solutions by phase
 */
function getSolutionsByPhase(phase) {
  return getAllSolutions().filter(function(sol) { return sol.phase === phase; });
}

/**
 * Search solutions
 */
function searchSolutions(query) {
  if (!query || query.trim().length < 2) return [];
  var searchTerm = query.toLowerCase().trim();
  return getAllSolutions().filter(function(sol) {
    var searchable = [sol.solution_id, sol.name, sol.full_title, sol.solution_lead, sol.solution_group, sol.purpose_mission, sol.status_summary].join(' ').toLowerCase();
    return searchable.indexOf(searchTerm) !== -1;
  });
}

/**
 * Get unique solution groups
 */
function getSolutionGroups() {
  var groups = {};
  getAllSolutions().forEach(function(sol) {
    if (sol.solution_group && sol.solution_group.trim()) groups[sol.solution_group.trim()] = true;
  });
  return Object.keys(groups).sort();
}

/**
 * Get solution statistics
 */
function getSolutionStats() {
  var solutions = getAllSolutions();
  var stats = { total: solutions.length, byCycle: {}, byPhase: {}, operational: 0, implementation: 0, formulation: 0, funded: 0 };

  solutions.forEach(function(sol) {
    var cycle = sol.cycle || 'Unknown';
    stats.byCycle[cycle] = (stats.byCycle[cycle] || 0) + 1;
    var phase = sol.phase || 'Unknown';
    stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

    var phaseLower = (sol.phase || '').toLowerCase();
    if (phaseLower.indexOf('operational') !== -1 || phaseLower.indexOf('production') !== -1) stats.operational++;
    else if (phaseLower.indexOf('implementation') !== -1) stats.implementation++;
    else if (phaseLower.indexOf('formulation') !== -1) stats.formulation++;

    if (sol.funded_by_ison === 'Y') stats.funded++;
  });

  return stats;
}

/**
 * Debug function - call from browser console to test
 */
function debugGetSolutions() {
  var result = {
    timestamp: new Date().toISOString(),
    configValue: null,
    solutionsCount: null,
    error: null
  };

  try {
    result.configValue = getConfigValue('SOLUTIONS_SHEET_ID');
    var solutions = getAllSolutions();
    result.solutionsCount = solutions ? solutions.length : 0;
    result.firstSolution = solutions && solutions[0] ? solutions[0].name : 'none';
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

/**
 * Sample data for development/testing
 */
function getSampleSolutions() {
  return [
    { solution_id: 'HLS', name: 'HLS', full_title: 'Harmonized Landsat Sentinel-2', solution_group: '', cycle: 2, cycle_year: 2018, phase: 'Production / Operational', funding_status: 'Funded', funded_by_ison: 'Y', solution_lead: 'Jeff Masek', solution_lead_affiliation: 'NASA GSFC', purpose_mission: 'Consistent surface reflectance from Landsat 8/9 and Sentinel-2.', status_summary: 'Fully operational via LP DAAC.', drive_folder_url: '', snwg_solution_page_url: 'https://www.earthdata.nasa.gov/esds/harmonized-landsat-sentinel-2' },
    { solution_id: 'AQ-GMAO', name: 'Air Quality - GMAO', full_title: 'Air Quality Forecasts - GMAO', solution_group: 'Air Quality', cycle: 3, cycle_year: 2020, phase: 'Implementation', funding_status: 'Funded', funded_by_ison: 'Y', solution_lead: 'Carl Malings', solution_lead_affiliation: 'Morgan State University, NASA GSFC', purpose_mission: 'Air quality measurements for international and domestic locations.', status_summary: 'Pandora sensor installation ongoing. PM2.5 forecasts available via AERONET.', drive_folder_url: '', snwg_solution_page_url: 'https://www.earthdata.nasa.gov/snwg-solutions/air-quality' },
    { solution_id: 'OPERA R1-DSWx_DIST_HLS', name: 'OPERA DSWx/DIST', full_title: 'OPERA Dynamic Surface Water and Disturbance', solution_group: 'OPERA', cycle: 4, cycle_year: 2022, phase: 'Production / Operational', funding_status: 'Funded', funded_by_ison: 'Y', solution_lead: 'Alexander Handwerger', solution_lead_affiliation: 'NASA JPL', purpose_mission: 'Analysis-ready DSWx and DIST products using HLS.', status_summary: 'Products being distributed via ASF DAAC.', drive_folder_url: '', snwg_solution_page_url: 'https://www.earthdata.nasa.gov/esds/opera' },
    { solution_id: 'VLM', name: 'VLM', full_title: 'Vertical Land Motion', solution_group: '', cycle: 4, cycle_year: 2022, phase: 'Implementation', funding_status: 'Funded', funded_by_ison: 'Y', solution_lead: '', solution_lead_affiliation: 'NASA JPL', purpose_mission: 'VLM products for sea level and flood risk.', status_summary: 'Product development ongoing.', drive_folder_url: '', snwg_solution_page_url: 'https://www.earthdata.nasa.gov/snwg-solutions/vlm' },
    { solution_id: 'NISAR SM', name: 'NISAR Soil Moisture', full_title: 'NISAR Soil Moisture Products', solution_group: '', cycle: 5, cycle_year: 2024, phase: 'Formulation', funding_status: 'Funded', funded_by_ison: 'Y', solution_lead: '', purpose_mission: 'High-resolution soil moisture from NISAR radar.', status_summary: 'In formulation pending NISAR launch.', drive_folder_url: '', snwg_solution_page_url: '' }
  ];
}

/**
 * Get Implementation viewer HTML
 */
function getImplementationViewerHTML() {
  try {
    return HtmlService.createHtmlOutputFromFile('implementation').getContent();
  } catch (error) {
    Logger.log('Error loading implementation viewer: ' + error);
    throw new Error('Failed to load Implementation-NSITE viewer');
  }
}

// ============================================================================
// SOLUTION NAME MAPPING
// ============================================================================

// Cache for solution name map (refreshed per execution)
var _solutionNameMapCache = null;

/**
 * Build a map of solution names to solution IDs from the database
 * Uses solution_id, name, full_title, and alternate_names columns
 *
 * @returns {Object} Map of lowercase name variants to solution_id
 */
function buildSolutionNameMap() {
  if (_solutionNameMapCache !== null) {
    return _solutionNameMapCache;
  }

  var solutions = getAllSolutions();
  var map = {};

  solutions.forEach(function(sol) {
    var id = sol.solution_id;
    if (!id) return;

    // Add solution_id itself (lowercase)
    map[id.toLowerCase()] = id;

    // Add name
    if (sol.name) {
      map[sol.name.toLowerCase()] = id;
    }

    // Add full_title
    if (sol.full_title) {
      map[sol.full_title.toLowerCase()] = id;
    }

    // Add alternate_names (pipe-delimited)
    if (sol.alternate_names) {
      var alts = String(sol.alternate_names).split('|');
      alts.forEach(function(alt) {
        var trimmed = alt.trim().toLowerCase();
        if (trimmed) {
          map[trimmed] = id;
        }
      });
    }
  });

  _solutionNameMapCache = map;
  return map;
}

/**
 * Get solution ID by any name variant
 * Looks up in solution_id, name, full_title, and alternate_names
 *
 * @param {string} name - Name to look up (case-insensitive)
 * @returns {string|null} Solution ID or null if not found
 */
function getSolutionIdByName(name) {
  if (!name) return null;

  var map = buildSolutionNameMap();
  var key = String(name).toLowerCase().trim();

  // Direct lookup
  if (map[key]) {
    return map[key];
  }

  // Try partial matching for longer names
  for (var mapKey in map) {
    if (mapKey.length > 4 && key.indexOf(mapKey) !== -1) {
      return map[mapKey];
    }
  }

  return null;
}

/**
 * Get all known solution names (for pattern matching)
 * Returns short names that can be used for word-boundary matching
 *
 * @returns {Array} Array of {name: string, id: string} objects
 */
function getSolutionShortNames() {
  var solutions = getAllSolutions();
  var names = [];

  solutions.forEach(function(sol) {
    if (!sol.solution_id) return;

    // Add solution_id if it's a short name (typical acronym)
    if (sol.solution_id.length <= 15) {
      names.push({ name: sol.solution_id.toLowerCase(), id: sol.solution_id });
    }

    // Add name if different from solution_id
    if (sol.name && sol.name !== sol.solution_id && sol.name.length <= 15) {
      names.push({ name: sol.name.toLowerCase(), id: sol.solution_id });
    }
  });

  return names;
}

/**
 * Match solution names in text using word boundaries
 * Useful for finding solution mentions in slide content
 *
 * @param {string} text - Text to search in
 * @returns {Array} Array of matched solution IDs (deduplicated)
 */
function findSolutionIdsInText(text) {
  if (!text) return [];

  var lowerText = text.toLowerCase();
  var shortNames = getSolutionShortNames();
  var foundIds = [];
  var seenIds = {};

  // Try short name matches with word boundaries
  shortNames.forEach(function(item) {
    var pattern = new RegExp('\\b' + escapeRegExp_(item.name) + '\\b', 'i');
    if (pattern.test(lowerText) && !seenIds[item.id]) {
      foundIds.push(item.id);
      seenIds[item.id] = true;
    }
  });

  // If no short name matches, try longer name matches
  if (foundIds.length === 0) {
    var map = buildSolutionNameMap();
    for (var mapKey in map) {
      if (mapKey.length > 10 && lowerText.indexOf(mapKey) !== -1) {
        var id = map[mapKey];
        if (!seenIds[id]) {
          foundIds.push(id);
          seenIds[id] = true;
        }
      }
    }
  }

  return foundIds;
}

/**
 * Escape special regex characters
 * @private
 */
function escapeRegExp_(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clear solution name map cache
 * Call this if solutions database is updated
 */
function clearSolutionNameMapCache() {
  _solutionNameMapCache = null;
}

// ============================================================================
// KEY MESSAGES FUNCTIONS
// ============================================================================

/**
 * Get key messages for a specific solution
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object|null} Key messages data or null if not found
 */
function getKeyMessages(solutionId) {
  var solution = getSolution(solutionId);
  if (!solution) return null;

  return {
    solution_id: solution.solution_id,
    solution_name: solution.name,
    key_messages: solution.key_messages || '',
    focus_type: solution.focus_type || '',
    industry_connections: solution.industry_connections || '',
    scientific_advancement: solution.scientific_advancement || '',
    agency_use_impact: solution.agency_use_impact || '',
    public_comms_links: solution.public_comms_links || ''
  };
}

/**
 * Get all solutions with key messages
 *
 * @returns {Array} Array of solutions that have key_messages populated
 */
function getSolutionsWithKeyMessages() {
  var solutions = getAllSolutions();
  return solutions.filter(function(sol) {
    return sol.key_messages && sol.key_messages.trim().length > 0;
  }).map(function(sol) {
    return {
      solution_id: sol.solution_id,
      solution_name: sol.name,
      key_messages: sol.key_messages || '',
      focus_type: sol.focus_type || '',
      industry_connections: sol.industry_connections || '',
      scientific_advancement: sol.scientific_advancement || '',
      agency_use_impact: sol.agency_use_impact || '',
      public_comms_links: sol.public_comms_links || ''
    };
  });
}

/**
 * Get key messages summary for comms dashboard
 *
 * @returns {Object} Summary statistics for key messages coverage
 */
function getKeyMessagesSummary() {
  var solutions = getAllSolutions();
  var withMessages = solutions.filter(function(sol) {
    return sol.key_messages && sol.key_messages.trim().length > 0;
  });

  var byFocusType = {};
  withMessages.forEach(function(sol) {
    var focus = sol.focus_type || 'Unspecified';
    byFocusType[focus] = (byFocusType[focus] || 0) + 1;
  });

  return {
    total_solutions: solutions.length,
    with_key_messages: withMessages.length,
    without_key_messages: solutions.length - withMessages.length,
    coverage_percent: Math.round((withMessages.length / solutions.length) * 100),
    by_focus_type: byFocusType
  };
}

/**
 * Search key messages by keyword
 *
 * @param {string} query - Search query
 * @returns {Array} Matching solutions with key messages
 */
function searchKeyMessages(query) {
  if (!query || query.trim().length < 2) return [];

  var solutions = getAllSolutions();
  var lowerQuery = query.toLowerCase();

  return solutions.filter(function(sol) {
    var searchText = [
      sol.name,
      sol.key_messages,
      sol.scientific_advancement,
      sol.agency_use_impact,
      sol.industry_connections
    ].join(' ').toLowerCase();

    return searchText.indexOf(lowerQuery) !== -1;
  }).map(function(sol) {
    return {
      solution_id: sol.solution_id,
      solution_name: sol.name,
      key_messages: sol.key_messages || '',
      focus_type: sol.focus_type || ''
    };
  });
}
