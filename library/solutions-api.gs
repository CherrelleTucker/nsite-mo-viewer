/**
 * MO-APIs Library - Solutions API
 * ================================
 * Data access functions for MO-DB_Solutions.
 * Reads from the Solutions sheet configured in MO-DB_Config.
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 *
 * Schema v2 Column Prefixes:
 *   core_     - identity (id, official_name, alternate_names, group, cycle, cycle_year)
 *   funding_  - funding fields (status, period, type)
 *   admin_    - administrative (lifecycle_phase, default_in_dashboard, row_last_updated, etc.)
 *   team_     - team contacts (lead, ra_rep, ea_advocate, affiliations)
 *   earthdata_- content from earthdata.nasa.gov (purpose, background, societal_impact, etc.)
 *   comms_    - communications (key_messages, focus_type, thematic_areas, etc.)
 *   product_  - technical specs (platform, temporal_freq, horiz_resolution, etc.)
 *   milestone_- implementation decision gates (atp_date, f2i_date, orr_date, closeout_date, etc.)
 *   docs_     - document URLs (project_plan, science_sow, ipa, icd, tta, etc.)
 *   sep_      - SEP milestones: working sessions (ws1-ws5) and touchpoints (tp4-tp8)
 *              Each has _date and _url: sep_ws1_date, sep_ws1_url, sep_tp4_date, sep_tp4_url, etc.
 *              Flow: WS1→TP4→WS2→TP5→WS3→TP6→WS4→TP7→WS5→TP8
 *
 * @fileoverview Solutions data access layer
 */

// ============================================================================
// SOLUTIONS DATA ACCESS
// ============================================================================

/**
 * Cache for solutions data (refreshed per execution)
 */
var _solutionsCache = null;

/**
 * Clear solutions cache (call after mutations)
 */
function clearSolutionsCache_() {
  _solutionsCache = null;
}

/**
 * Get all solutions from MO-DB_Solutions
 * @returns {Object[]} Array of solution objects
 */
function getAllSolutions() {
  // Return cached data if available
  if (_solutionsCache !== null) {
    return deepCopy(_solutionsCache);
  }

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
      return sol.core_id && String(sol.core_id).trim();
    });

    solutions.sort(function(a, b) {
      var cycleA = parseInt(a.core_cycle) || 0;
      var cycleB = parseInt(b.core_cycle) || 0;
      if (cycleB !== cycleA) return cycleB - cycleA;
      return (a.core_id || '').localeCompare(b.core_id || '');
    });

    // Cache the results
    _solutionsCache = solutions;
    var result = deepCopy(solutions);
    logResponseSize(result, 'getAllSolutions');
    return result;
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
    if (solutions[i].core_id === solutionId) return solutions[i];
  }
  return null;
}

/**
 * Get solutions by cycle
 */
function getSolutionsByCycle(cycle) {
  return getAllSolutions().filter(function(sol) {
    return String(sol.core_cycle) === String(cycle);
  });
}

/**
 * Get solutions by phase
 */
function getSolutionsByPhase(phase) {
  return getAllSolutions().filter(function(sol) { return sol.admin_lifecycle_phase === phase; });
}

/**
 * Search solutions
 */
function searchSolutions(query) {
  if (!query || query.trim().length < 2) return [];
  var searchTerm = query.toLowerCase().trim();
  return getAllSolutions().filter(function(sol) {
    var searchable = [sol.core_id, sol.core_official_name, sol.core_alternate_names, sol.team_lead, sol.core_group, sol.earthdata_purpose, sol.earthdata_status_summary].join(' ').toLowerCase();
    return searchable.includes(searchTerm);
  });
}

/**
 * Get unique solution groups
 */
function getSolutionGroups() {
  var groups = {};
  getAllSolutions().forEach(function(sol) {
    if (sol.core_group && sol.core_group.trim()) groups[sol.core_group.trim()] = true;
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
    var cycle = sol.core_cycle || 'Unknown';
    stats.byCycle[cycle] = (stats.byCycle[cycle] || 0) + 1;
    var phase = sol.admin_lifecycle_phase || 'Unknown';
    stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

    var phaseLower = (sol.admin_lifecycle_phase || '').toLowerCase();
    if (phaseLower.includes('operational') || phaseLower.includes('production')) stats.operational++;
    else if (phaseLower.includes('implementation')) stats.implementation++;
    else if (phaseLower.includes('formulation')) stats.formulation++;

    if (sol.funding_type === 'Y' || sol.funding_type === 'ISON') stats.funded++;
  });

  return stats;
}

// ============================================================================
// SEP MILESTONE FUNCTIONS
// ============================================================================

/**
 * SEP Milestone sequence definition
 * Working Sessions (WS) prepare for corresponding Touchpoints (TP)
 */
var SEP_MILESTONES = [
  { id: 'ws1', label: 'WS1', fullName: 'Working Session 1', type: 'working_session', dateField: 'sep_ws1_date', urlField: 'sep_ws1_url' },
  { id: 'tp4', label: 'TP4', fullName: 'Touchpoint 4 - Outreach', type: 'touchpoint', dateField: 'sep_tp4_date', urlField: 'sep_tp4_url' },
  { id: 'ws2', label: 'WS2', fullName: 'Working Session 2', type: 'working_session', dateField: 'sep_ws2_date', urlField: 'sep_ws2_url' },
  { id: 'tp5', label: 'TP5', fullName: 'Touchpoint 5 - Transition', type: 'touchpoint', dateField: 'sep_tp5_date', urlField: 'sep_tp5_url' },
  { id: 'ws3', label: 'WS3', fullName: 'Working Session 3', type: 'working_session', dateField: 'sep_ws3_date', urlField: 'sep_ws3_url' },
  { id: 'tp6', label: 'TP6', fullName: 'Touchpoint 6 - Training', type: 'touchpoint', dateField: 'sep_tp6_date', urlField: 'sep_tp6_url' },
  { id: 'ws4', label: 'WS4', fullName: 'Working Session 4', type: 'working_session', dateField: 'sep_ws4_date', urlField: 'sep_ws4_url' },
  { id: 'tp7', label: 'TP7', fullName: 'Touchpoint 7 - Adoption', type: 'touchpoint', dateField: 'sep_tp7_date', urlField: 'sep_tp7_url' },
  { id: 'ws5', label: 'WS5', fullName: 'Working Session 5', type: 'working_session', dateField: 'sep_ws5_date', urlField: 'sep_ws5_url' },
  { id: 'tp8', label: 'TP8', fullName: 'Touchpoint 8 - Impact', type: 'touchpoint', dateField: 'sep_tp8_date', urlField: 'sep_tp8_url' }
];

/**
 * Get SEP milestone definitions
 * @returns {Array} Array of milestone objects with id, label, fullName, type, dateField, urlField
 */
function getSEPMilestones() {
  return SEP_MILESTONES;
}

/**
 * Determine a solution's current SEP milestone based on completed dates
 * Returns the last completed milestone or 'not_started' if none
 * @param {Object} solution - Solution object
 * @returns {Object} { currentMilestone: string, nextMilestone: string, completedCount: number }
 */
function getSolutionSEPProgress(solution) {
  var lastCompleted = null;
  var completedCount = 0;

  for (var i = 0; i < SEP_MILESTONES.length; i++) {
    var ms = SEP_MILESTONES[i];
    var dateValue = solution[ms.dateField];
    if (dateValue && String(dateValue).trim()) {
      lastCompleted = ms.id;
      completedCount++;
    }
  }

  var nextMilestone = null;
  if (!lastCompleted) {
    nextMilestone = 'ws1';
  } else {
    var lastIndex = SEP_MILESTONES.findIndex(function(m) { return m.id === lastCompleted; });
    if (lastIndex < SEP_MILESTONES.length - 1) {
      nextMilestone = SEP_MILESTONES[lastIndex + 1].id;
    }
  }

  return {
    currentMilestone: lastCompleted || 'not_started',
    nextMilestone: nextMilestone,
    completedCount: completedCount,
    totalMilestones: SEP_MILESTONES.length
  };
}

/**
 * Get all solutions with their SEP progress information
 * Only returns solutions where sep_active is TRUE
 * @returns {Array} Solutions with sep_progress field added
 */
function getSolutionsWithSEPProgress() {
  var solutions = getAllSolutions();

  // Filter to only SEP-active solutions
  var activeSolutions = solutions.filter(function(sol) {
    return sol.sep_active === true || sol.sep_active === 'TRUE' || sol.sep_active === 1;
  });

  return activeSolutions.map(function(sol) {
    sol.sep_progress = getSolutionSEPProgress(sol);
    return sol;
  });
}

/**
 * Get unique cycles from SEP-active solutions (for filter dropdown)
 * @returns {Array} Array of cycle numbers, sorted descending
 */
function getSEPCycles() {
  var solutions = getSolutionsWithSEPProgress();
  var cycles = {};

  solutions.forEach(function(sol) {
    if (sol.core_cycle) {
      cycles[sol.core_cycle] = true;
    }
  });

  return Object.keys(cycles).map(Number).sort(function(a, b) { return b - a; });
}

/**
 * Get solutions that need outreach (low engagement count)
 * @param {number} threshold - Max engagements to be considered "needs outreach" (default 2)
 * @returns {Array} Solutions with engagement_count, sorted by count ascending
 */
function getSolutionsNeedingOutreach(threshold) {
  threshold = threshold || 2;
  var solutions = getSolutionsWithSEPProgress();

  // Get engagement counts per solution
  var engagements = [];
  try {
    engagements = getRecentEngagements(365, 1000); // Last year, up to 1000
  } catch (e) {
    Logger.log('Could not load engagements: ' + e.message);
  }

  // Count engagements per solution
  var countBySolution = {};
  engagements.forEach(function(eng) {
    var solId = eng.solution_id || eng.related_solution;
    if (solId) {
      countBySolution[solId] = (countBySolution[solId] || 0) + 1;
    }
  });

  // Add counts to solutions and filter
  var needsOutreach = solutions.map(function(sol) {
    sol.engagement_count = countBySolution[sol.core_id] || 0;
    return sol;
  }).filter(function(sol) {
    return sol.engagement_count <= threshold;
  }).sort(function(a, b) {
    return a.engagement_count - b.engagement_count;
  });

  return needsOutreach.slice(0, 10); // Top 10 needing outreach
}

/**
 * Get solutions grouped by their current/next SEP milestone
 * @returns {Object} { milestone_id: [solutions], ... }
 */
function getSolutionsBySEPMilestone() {
  var solutions = getSolutionsWithSEPProgress();
  var grouped = {
    not_started: [],
    completed: []
  };

  // Initialize all milestone buckets
  SEP_MILESTONES.forEach(function(ms) {
    grouped[ms.id] = [];
  });

  solutions.forEach(function(sol) {
    var progress = sol.sep_progress;

    // Place in the "next milestone" bucket (what they're working toward)
    if (progress.nextMilestone) {
      grouped[progress.nextMilestone].push(sol);
    } else if (progress.completedCount === SEP_MILESTONES.length) {
      grouped.completed.push(sol);
    } else {
      grouped.not_started.push(sol);
    }
  });

  return grouped;
}

/**
 * Get SEP pipeline overview statistics
 * @returns {Object} Stats for SEP dashboard
 */
function getSEPPipelineStats() {
  var solutions = getSolutionsWithSEPProgress();
  var grouped = getSolutionsBySEPMilestone();

  var stats = {
    total_solutions: solutions.length,
    not_started: grouped.not_started.length,
    in_progress: 0,
    completed: grouped.completed.length,
    by_milestone: {}
  };

  SEP_MILESTONES.forEach(function(ms) {
    stats.by_milestone[ms.id] = grouped[ms.id].length;
    if (grouped[ms.id].length > 0) {
      stats.in_progress += grouped[ms.id].length;
    }
  });

  return stats;
}

/**
 * Update a solution's SEP milestone date
 * @param {string} solutionId - Solution core_id
 * @param {string} milestoneId - Milestone ID (ws1, tp4, etc.)
 * @param {string} date - ISO date string
 * @returns {Object} Success/failure result
 */
function updateSolutionSEPMilestone(solutionId, milestoneId, date) {
  var milestone = SEP_MILESTONES.find(function(m) { return m.id === milestoneId; });
  if (!milestone) {
    return { success: false, error: 'Invalid milestone ID: ' + milestoneId };
  }

  try {
    var sheetId = getConfigValue('SOLUTIONS_SHEET_ID');
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Find column index for the date field
    var colIndex = headers.indexOf(milestone.dateField);
    if (colIndex === -1) {
      return { success: false, error: 'Column not found: ' + milestone.dateField };
    }

    // Find row index for the solution
    var idColIndex = headers.indexOf('core_id');
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === solutionId) {
        rowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Solution not found: ' + solutionId };
    }

    // Update the cell
    sheet.getRange(rowIndex, colIndex + 1).setValue(date);

    return { success: true, solutionId: solutionId, milestone: milestoneId, date: date };
  } catch (e) {
    return { success: false, error: e.message };
  }
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
    result.firstSolution = solutions && solutions[0] ? solutions[0].core_id : 'none';
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
    { core_id: 'HLS', core_official_name: 'Harmonized Landsat Sentinel-2', core_alternate_names: 'HLS', core_group: '', core_cycle: 2, core_cycle_year: 2018, admin_lifecycle_phase: 'Production / Operational', funding_status: 'Funded', funding_type: 'ISON', team_lead: 'Jeff Masek', team_lead_affiliation: 'NASA GSFC', earthdata_purpose: 'Consistent surface reflectance from Landsat 8/9 and Sentinel-2.', earthdata_status_summary: 'Fully operational via LP DAAC.', admin_drive_folder: '', earthdata_solution_page_url: 'https://www.earthdata.nasa.gov/esds/harmonized-landsat-sentinel-2' },
    { core_id: 'AQ-GMAO', core_official_name: 'Air Quality Forecasts - GMAO', core_alternate_names: 'Air Quality - GMAO', core_group: 'Air Quality', core_cycle: 3, core_cycle_year: 2020, admin_lifecycle_phase: 'Implementation', funding_status: 'Funded', funding_type: 'ISON', team_lead: 'Carl Malings', team_lead_affiliation: 'Morgan State University, NASA GSFC', earthdata_purpose: 'Air quality measurements for international and domestic locations.', earthdata_status_summary: 'Pandora sensor installation ongoing. PM2.5 forecasts available via AERONET.', admin_drive_folder: '', earthdata_solution_page_url: 'https://www.earthdata.nasa.gov/snwg-solutions/air-quality' },
    { core_id: 'OPERA R1-DSWx_DIST_HLS', core_official_name: 'OPERA Dynamic Surface Water and Disturbance', core_alternate_names: 'OPERA DSWx/DIST', core_group: 'OPERA', core_cycle: 4, core_cycle_year: 2022, admin_lifecycle_phase: 'Production / Operational', funding_status: 'Funded', funding_type: 'ISON', team_lead: 'Alexander Handwerger', team_lead_affiliation: 'NASA JPL', earthdata_purpose: 'Analysis-ready DSWx and DIST products using HLS.', earthdata_status_summary: 'Products being distributed via ASF DAAC.', admin_drive_folder: '', earthdata_solution_page_url: 'https://www.earthdata.nasa.gov/esds/opera' },
    { core_id: 'VLM', core_official_name: 'Vertical Land Motion', core_alternate_names: 'VLM', core_group: '', core_cycle: 4, core_cycle_year: 2022, admin_lifecycle_phase: 'Implementation', funding_status: 'Funded', funding_type: 'ISON', team_lead: '', team_lead_affiliation: 'NASA JPL', earthdata_purpose: 'VLM products for sea level and flood risk.', earthdata_status_summary: 'Product development ongoing.', admin_drive_folder: '', earthdata_solution_page_url: 'https://www.earthdata.nasa.gov/snwg-solutions/vlm' },
    { core_id: 'NISAR SM', core_official_name: 'NISAR Soil Moisture Products', core_alternate_names: 'NISAR Soil Moisture', core_group: '', core_cycle: 5, core_cycle_year: 2024, admin_lifecycle_phase: 'Formulation', funding_status: 'Funded', funding_type: 'ISON', team_lead: '', earthdata_purpose: 'High-resolution soil moisture from NISAR radar.', earthdata_status_summary: 'In formulation pending NISAR launch.', admin_drive_folder: '', earthdata_solution_page_url: '' }
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
 * Uses core_id, core_official_name, and core_alternate_names columns
 *
 * @returns {Object} Map of lowercase name variants to core_id
 */
function buildSolutionNameMap() {
  if (_solutionNameMapCache !== null) {
    return _solutionNameMapCache;
  }

  var solutions = getAllSolutions();
  var map = {};

  solutions.forEach(function(sol) {
    var id = sol.core_id;
    if (!id) return;

    // Add core_id itself (lowercase)
    map[id.toLowerCase()] = id;

    // Add core_official_name
    if (sol.core_official_name) {
      map[sol.core_official_name.toLowerCase()] = id;
    }

    // Add core_alternate_names (pipe-delimited)
    if (sol.core_alternate_names) {
      var alts = String(sol.core_alternate_names).split('|');
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
 * Looks up in core_id, core_official_name, and core_alternate_names
 *
 * @param {string} name - Name to look up (case-insensitive)
 * @returns {string|null} Solution ID (core_id) or null if not found
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
    if (mapKey.length > 4 && key.includes(mapKey)) {
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
    if (!sol.core_id) return;

    // Add core_id if it's a short name (typical acronym)
    if (sol.core_id.length <= 15) {
      names.push({ name: sol.core_id.toLowerCase(), id: sol.core_id });
    }

    // Add first alternate name if short and different from core_id
    if (sol.core_alternate_names) {
      var firstAlt = String(sol.core_alternate_names).split('|')[0].trim();
      if (firstAlt && firstAlt !== sol.core_id && firstAlt.length <= 15) {
        names.push({ name: firstAlt.toLowerCase(), id: sol.core_id });
      }
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
      if (mapKey.length > 10 && lowerText.includes(mapKey)) {
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
function clearSolutionNameMapCache_() {
  _solutionNameMapCache = null;
}

// ============================================================================
// KEY MESSAGES FUNCTIONS
// ============================================================================

/**
 * Get key messages for a specific solution
 *
 * NOTE: Now sources from MO-DB_CommsAssets (preferred) with fallback to MO-DB_Solutions columns
 *
 * @param {string} solutionId - Solution ID (core_id)
 * @returns {Object|null} Key messages data or null if not found
 */
function getKeyMessages(solutionId) {
  // Try new CommsAssets database first
  try {
    var commsAssetsConfigured = getConfigValue('COMMS_ASSETS_SHEET_ID');
    if (commsAssetsConfigured) {
      var assetMessages = getKeyMessagesFromAssets(solutionId);
      if (assetMessages && (assetMessages.assets.talking_points.length > 0 ||
          assetMessages.assets.facts.length > 0 ||
          assetMessages.assets.quotes.length > 0)) {
        return assetMessages;
      }
    }
  } catch (e) {
    Logger.log('CommsAssets not available for key messages, falling back to Solutions: ' + e.message);
  }

  // Fallback to legacy Solutions columns
  var solution = getSolution(solutionId);
  if (!solution) return null;

  return {
    core_id: solution.core_id,
    core_official_name: solution.core_official_name,
    comms_key_messages: solution.comms_key_messages || '',
    comms_focus_type: solution.comms_focus_type || '',
    comms_industry: solution.comms_industry || '',
    comms_science: solution.comms_science || '',
    comms_agency_impact: solution.comms_agency_impact || '',
    comms_public_links: solution.comms_public_links || ''
  };
}

/**
 * Get all solutions with key messages
 *
 * NOTE: Now sources from MO-DB_CommsAssets (preferred) with fallback to MO-DB_Solutions columns
 *
 * @returns {Array} Array of solutions that have comms_key_messages populated
 */
function getSolutionsWithKeyMessages() {
  // Try new CommsAssets database first
  try {
    var commsAssetsConfigured = getConfigValue('COMMS_ASSETS_SHEET_ID');
    if (commsAssetsConfigured) {
      var assetResults = getSolutionsWithKeyMessagesFromAssets();
      if (assetResults && assetResults.length > 0) {
        return assetResults;
      }
    }
  } catch (e) {
    Logger.log('CommsAssets not available, falling back to Solutions: ' + e.message);
  }

  // Fallback to legacy Solutions columns
  var solutions = getAllSolutions();
  return solutions.filter(function(sol) {
    return sol.comms_key_messages && sol.comms_key_messages.trim().length > 0;
  }).map(function(sol) {
    return {
      core_id: sol.core_id,
      core_official_name: sol.core_official_name,
      comms_key_messages: sol.comms_key_messages || '',
      comms_focus_type: sol.comms_focus_type || '',
      comms_industry: sol.comms_industry || '',
      comms_science: sol.comms_science || '',
      comms_agency_impact: sol.comms_agency_impact || '',
      comms_public_links: sol.comms_public_links || ''
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
    return sol.comms_key_messages && sol.comms_key_messages.trim().length > 0;
  });

  var byFocusType = {};
  withMessages.forEach(function(sol) {
    var focus = sol.comms_focus_type || 'Unspecified';
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
 * NOTE: Now searches MO-DB_CommsAssets (preferred) with fallback to MO-DB_Solutions columns
 *
 * @param {string} query - Search query
 * @returns {Array} Matching solutions with key messages
 */
function searchKeyMessages(query) {
  if (!query || query.trim().length < 2) return [];

  // Try new CommsAssets search first
  try {
    var commsAssetsConfigured = getConfigValue('COMMS_ASSETS_SHEET_ID');
    if (commsAssetsConfigured) {
      var assetResults = searchCommsAssets(query);
      if (assetResults && assetResults.length > 0) {
        // Group by solution and return in legacy format
        var bySolution = {};
        assetResults.forEach(function(asset) {
          if (asset.solution_ids) {
            var ids = asset.solution_ids.split(',').map(function(s) { return s.trim(); });
            ids.forEach(function(solId) {
              if (!bySolution[solId]) {
                bySolution[solId] = {
                  core_id: solId,
                  core_official_name: solId,
                  comms_key_messages: '',
                  comms_focus_type: '',
                  assets: []
                };
              }
              bySolution[solId].assets.push(asset);
              if (asset.asset_type === 'talking_point') {
                bySolution[solId].comms_key_messages += asset.content + '\n\n';
              }
            });
          }
        });
        var results = Object.values(bySolution);
        if (results.length > 0) return results;
      }
    }
  } catch (e) {
    Logger.log('CommsAssets search not available, falling back to Solutions: ' + e.message);
  }

  // Fallback to legacy Solutions search
  var solutions = getAllSolutions();
  var lowerQuery = query.toLowerCase();

  return solutions.filter(function(sol) {
    var searchText = [
      sol.core_id,
      sol.core_official_name,
      sol.comms_key_messages,
      sol.comms_science,
      sol.comms_agency_impact,
      sol.comms_industry
    ].join(' ').toLowerCase();

    return searchText.includes(lowerQuery);
  }).map(function(sol) {
    return {
      core_id: sol.core_id,
      core_official_name: sol.core_official_name,
      comms_key_messages: sol.comms_key_messages || '',
      comms_focus_type: sol.comms_focus_type || ''
    };
  });
}

// ============================================================================
// APPLICATION SECTOR QUERIES
// ============================================================================

/**
 * Get all unique application sectors from solutions
 * @returns {string[]} Array of unique sector names, sorted
 */
function getApplicationSectors() {
  var solutions = getAllSolutions();
  var sectors = {};

  solutions.forEach(function(sol) {
    if (sol.core_application_sectors) {
      var sectorList = sol.core_application_sectors.split(',').map(function(s) {
        return s.trim();
      });
      sectorList.forEach(function(sector) {
        if (sector) sectors[sector] = true;
      });
    }
  });

  return Object.keys(sectors).sort();
}

/**
 * Get solutions by application sector
 * @param {string} sector - Sector to filter by (e.g., "Energy", "Agriculture")
 * @returns {Object[]} Array of solutions in that sector
 */
function getSolutionsBySector(sector) {
  var solutions = getAllSolutions();
  var lowerSector = sector.toLowerCase();

  return solutions.filter(function(sol) {
    if (!sol.core_application_sectors) return false;
    var sectors = sol.core_application_sectors.toLowerCase().split(',').map(function(s) {
      return s.trim();
    });
    return sectors.includes(lowerSector);
  });
}

/**
 * Get stakeholder surveys by application sector
 * Joins solutions (by sector) with contacts/needs data
 * @param {string} sector - Sector to filter by (e.g., "Energy")
 * @returns {Object} Report object with solutions and stakeholder counts
 */
function getSurveysBySector(sector) {
  var solutions = getSolutionsBySector(sector);
  var solutionIds = solutions.map(function(s) { return s.core_id; });

  // Get contacts for these solutions
  var allContacts = getContactsBySolutionIds ? getContactsBySolutionIds(solutionIds) : [];

  // If getContactsBySolutionIds doesn't exist, try alternate approach
  if (allContacts.length === 0 && typeof getAllContacts === 'function') {
    var contacts = getAllContacts();
    allContacts = contacts.filter(function(c) {
      return solutionIds.includes(c.solution_id);
    });
  }

  // Group contacts by solution
  var bySolution = {};
  solutionIds.forEach(function(id) { bySolution[id] = []; });

  allContacts.forEach(function(contact) {
    if (bySolution[contact.solution_id]) {
      bySolution[contact.solution_id].push(contact);
    }
  });

  // Build report
  var report = {
    sector: sector,
    generated_at: new Date().toISOString(),
    solution_count: solutions.length,
    total_stakeholders: allContacts.length,
    unique_emails: [],
    solutions: []
  };

  // Get unique emails
  var emailSet = {};
  allContacts.forEach(function(c) {
    if (c.email) emailSet[c.email.toLowerCase()] = true;
  });
  report.unique_emails = Object.keys(emailSet);
  report.unique_stakeholder_count = report.unique_emails.length;

  // Add solution details
  solutions.forEach(function(sol) {
    var contacts = bySolution[sol.core_id] || [];
    report.solutions.push({
      solution_id: sol.core_id,
      solution_name: sol.core_official_name,
      lifecycle_phase: sol.admin_lifecycle_phase,
      stakeholder_count: contacts.length,
      survey_years: getUniqueSurveyYears_(contacts),
      departments: getUniqueDepartments_(contacts)
    });
  });

  // Sort by stakeholder count descending
  report.solutions.sort(function(a, b) {
    return b.stakeholder_count - a.stakeholder_count;
  });

  return report;
}

/**
 * Helper: Get unique survey years from contacts
 */
function getUniqueSurveyYears_(contacts) {
  var years = {};
  contacts.forEach(function(c) {
    if (c.survey_year) years[c.survey_year] = true;
  });
  return Object.keys(years).sort();
}

/**
 * Helper: Get unique departments from contacts
 */
function getUniqueDepartments_(contacts) {
  var depts = {};
  contacts.forEach(function(c) {
    if (c.department) depts[c.department] = true;
  });
  return Object.keys(depts).sort();
}

/**
 * Get sector report summary - all sectors with counts
 * @returns {Object[]} Array of {sector, solution_count, solutions[]}
 */
function getSectorSummary() {
  var sectors = getApplicationSectors();
  var solutions = getAllSolutions();

  return sectors.map(function(sector) {
    var lowerSector = sector.toLowerCase();
    var sectorSolutions = solutions.filter(function(sol) {
      if (!sol.core_application_sectors) return false;
      var solSectors = sol.core_application_sectors.toLowerCase().split(',').map(function(s) {
        return s.trim();
      });
      return solSectors.includes(lowerSector);
    });

    return {
      sector: sector,
      solution_count: sectorSolutions.length,
      solutions: sectorSolutions.map(function(s) {
        return {
          id: s.core_id,
          name: s.core_official_name,
          phase: s.admin_lifecycle_phase
        };
      })
    };
  }).sort(function(a, b) {
    return b.solution_count - a.solution_count;
  });
}

// ============================================================================
// SOLUTION RECENT ACTIVITY (AGGREGATED)
// ============================================================================

/**
 * Get recent activity for a solution from multiple data sources
 * Aggregates Updates, Engagements, Actions, Stories, and Milestones
 *
 * @param {string} solutionId - Solution ID (core_id)
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Object} { activities: [], totalCount: number, sources: {} }
 */
function getSolutionRecentActivity(solutionId, days) {
  days = days || 30;
  var cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  var activities = [];
  var sources = {
    updates: 0,
    engagements: 0,
    actions: 0,
    stories: 0,
    milestones: 0
  };

  // 1. Get Updates
  try {
    var updates = getUpdatesForSolutionCard ? getUpdatesForSolutionCard(solutionId) : null;
    if (updates) {
      // Combine recent and extended updates
      var allUpdates = (updates.recent || []).concat(updates.extended || []);
      allUpdates.forEach(function(u) {
        var actDate = u.meeting_date ? new Date(u.meeting_date) : null;
        if (actDate && actDate >= cutoffDate) {
          activities.push({
            date: u.meeting_date,
            type: 'update',
            title: 'Update from ' + (u.source_document || 'Meeting'),
            description: u.update_text || '',
            icon: 'update',
            source: u.source_document || '',
            source_url: u.source_url || ''
          });
          sources.updates++;
        }
      });
    }
  } catch (e) {
    Logger.log('getSolutionRecentActivity - Updates error: ' + e.message);
  }

  // 2. Get Engagements
  try {
    var engagements = getEngagementsBySolution ? getEngagementsBySolution(solutionId) : [];
    engagements.forEach(function(e) {
      var actDate = e.date ? new Date(e.date) : null;
      if (actDate && actDate >= cutoffDate) {
        var participantNames = (e.participants || '').split(',').slice(0, 3).join(', ');
        activities.push({
          date: e.date,
          type: 'engagement',
          title: e.type || 'Engagement',
          description: e.summary || e.notes || '',
          icon: 'groups',
          participants: participantNames,
          engagement_id: e.engagement_id
        });
        sources.engagements++;
      }
    });
  } catch (e) {
    Logger.log('getSolutionRecentActivity - Engagements error: ' + e.message);
  }

  // 3. Get Actions
  try {
    var actions = getAllActions ? getAllActions() : [];
    var solutionActions = actions.filter(function(a) {
      return a.solution_id && a.solution_id.toLowerCase() === solutionId.toLowerCase();
    });
    solutionActions.forEach(function(a) {
      // Use created_at or due_date for the activity date
      var actDateStr = a.created_at || a.due_date;
      var actDate = actDateStr ? new Date(actDateStr) : null;
      if (actDate && actDate >= cutoffDate) {
        activities.push({
          date: actDateStr,
          type: 'action',
          title: a.title || 'Action Item',
          description: a.description || '',
          icon: 'task_alt',
          status: a.status || 'open',
          assignee: a.assigned_to || '',
          action_id: a.action_id
        });
        sources.actions++;
      }
    });
  } catch (e) {
    Logger.log('getSolutionRecentActivity - Actions error: ' + e.message);
  }

  // 4. Get Stories
  try {
    var stories = getStoriesBySolution ? getStoriesBySolution(solutionId) : [];
    stories.forEach(function(s) {
      // Use publish_date, idea_date, or created_date
      var actDateStr = s.publish_date || s.idea_date || s.created_date;
      var actDate = actDateStr ? new Date(actDateStr) : null;
      if (actDate && actDate >= cutoffDate) {
        activities.push({
          date: actDateStr,
          type: 'story',
          title: s.title || s.headline || 'Story',
          description: s.summary || s.description || '',
          icon: 'article',
          status: s.status || '',
          content_type: s.content_type || 'story',
          story_id: s.story_id
        });
        sources.stories++;
      }
    });
  } catch (e) {
    Logger.log('getSolutionRecentActivity - Stories error: ' + e.message);
  }

  // 5. Get Milestones (completed within the date range)
  try {
    var milestones = getMilestonesBySolution ? getMilestonesBySolution(solutionId) : [];
    milestones.forEach(function(m) {
      // Use target_date for milestones
      var actDateStr = m.target_date;
      var actDate = actDateStr ? new Date(actDateStr) : null;
      if (actDate && actDate >= cutoffDate && m.status === 'completed') {
        activities.push({
          date: actDateStr,
          type: 'milestone',
          title: m.type || 'Milestone',
          description: m.notes || 'Milestone completed',
          icon: 'flag',
          phase: m.phase || '',
          milestone_id: m.milestone_id
        });
        sources.milestones++;
      }
    });
  } catch (e) {
    Logger.log('getSolutionRecentActivity - Milestones error: ' + e.message);
  }

  // Sort all activities by date descending
  activities.sort(function(a, b) {
    var dateA = a.date ? new Date(a.date) : new Date(0);
    var dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });

  // Limit to reasonable size to avoid response size issues
  var limitedActivities = activities.slice(0, 50);

  return {
    activities: limitedActivities,
    totalCount: activities.length,
    sources: sources,
    days: days,
    hasMore: activities.length > 50
  };
}
