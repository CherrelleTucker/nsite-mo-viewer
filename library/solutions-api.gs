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
function clearSolutionsCache() {
  _solutionsCache = null;
}

/**
 * Get all solutions from MO-DB_Solutions
 * @returns {Object[]} Array of solution objects
 */
function getAllSolutions() {
  // Return cached data if available
  if (_solutionsCache !== null) {
    return JSON.parse(JSON.stringify(_solutionsCache));
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
    return JSON.parse(JSON.stringify(solutions));
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
    return searchable.indexOf(searchTerm) !== -1;
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
    if (phaseLower.indexOf('operational') !== -1 || phaseLower.indexOf('production') !== -1) stats.operational++;
    else if (phaseLower.indexOf('implementation') !== -1) stats.implementation++;
    else if (phaseLower.indexOf('formulation') !== -1) stats.formulation++;

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
 * @param {string} solutionId - Solution ID (core_id)
 * @returns {Object|null} Key messages data or null if not found
 */
function getKeyMessages(solutionId) {
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
 * @returns {Array} Array of solutions that have comms_key_messages populated
 */
function getSolutionsWithKeyMessages() {
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
 * @param {string} query - Search query
 * @returns {Array} Matching solutions with key messages
 */
function searchKeyMessages(query) {
  if (!query || query.trim().length < 2) return [];

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

    return searchText.indexOf(lowerQuery) !== -1;
  }).map(function(sol) {
    return {
      core_id: sol.core_id,
      core_official_name: sol.core_official_name,
      comms_key_messages: sol.comms_key_messages || '',
      comms_focus_type: sol.comms_focus_type || ''
    };
  });
}
