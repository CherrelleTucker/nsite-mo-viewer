/**
 * Solutions API
 * =============
 * Data access functions for MO-DB_Solutions.
 * Reads from the Solutions sheet configured in MO-DB_Config.
 *
 * @fileoverview Solutions data access layer
 */

// ============================================================================
// SOLUTIONS DATA ACCESS
// ============================================================================

/**
 * Get all solutions from MO-DB_Solutions
 * Reads from the sheet ID configured in MO-DB_Config
 *
 * @returns {Object[]} Array of solution objects
 */
function getAllSolutions() {
  try {
    var sheetId = getConfigValue('SOLUTIONS_SHEET_ID');

    if (!sheetId) {
      Logger.log('SOLUTIONS_SHEET_ID not configured in MO-DB_Config');
      // Return sample data for development
      return getSampleSolutions();
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      Logger.log('Solutions sheet is empty');
      return [];
    }

    var headers = data[0];
    var rows = data.slice(1);

    var solutions = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) {
        obj[header] = row[i];
      });
      return obj;
    }).filter(function(sol) {
      // Filter out empty rows
      return sol.solution_id && String(sol.solution_id).trim();
    });

    // Sort by cycle descending, then by name
    solutions.sort(function(a, b) {
      var cycleA = parseInt(a.cycle) || 0;
      var cycleB = parseInt(b.cycle) || 0;

      if (cycleB !== cycleA) {
        return cycleB - cycleA;
      }

      return (a.name || '').localeCompare(b.name || '');
    });

    return solutions;
  } catch (e) {
    Logger.log('Error reading solutions: ' + e.message);
    // Return sample data on error
    return getSampleSolutions();
  }
}

/**
 * Alias for getAllSolutions - used by frontend
 * @returns {Object[]} Array of solution objects
 */
function getSolutions() {
  return getAllSolutions();
}

/**
 * Get a single solution by ID
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object|null} Solution object or null
 */
function getSolution(solutionId) {
  var solutions = getAllSolutions();

  for (var i = 0; i < solutions.length; i++) {
    if (solutions[i].solution_id === solutionId) {
      return solutions[i];
    }
  }

  return null;
}

/**
 * Get solutions by cycle
 *
 * @param {number|string} cycle - Cycle number
 * @returns {Object[]} Solutions in the specified cycle
 */
function getSolutionsByCycle(cycle) {
  var solutions = getAllSolutions();

  return solutions.filter(function(sol) {
    return String(sol.cycle) === String(cycle);
  });
}

/**
 * Get solutions by phase
 *
 * @param {string} phase - Phase name
 * @returns {Object[]} Solutions in the specified phase
 */
function getSolutionsByPhase(phase) {
  var solutions = getAllSolutions();

  return solutions.filter(function(sol) {
    return sol.phase === phase;
  });
}

/**
 * Get solutions by group
 *
 * @param {string} group - Solution group name
 * @returns {Object[]} Solutions in the specified group
 */
function getSolutionsByGroup(group) {
  var solutions = getAllSolutions();

  return solutions.filter(function(sol) {
    return sol.solution_group === group;
  });
}

/**
 * Search solutions by text query
 *
 * @param {string} query - Search query
 * @returns {Object[]} Matching solutions
 */
function searchSolutions(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  var searchTerm = query.toLowerCase().trim();
  var solutions = getAllSolutions();

  return solutions.filter(function(sol) {
    var searchable = [
      sol.solution_id,
      sol.name,
      sol.full_title,
      sol.solution_lead,
      sol.solution_group,
      sol.purpose_mission,
      sol.status_summary
    ].join(' ').toLowerCase();

    return searchable.indexOf(searchTerm) !== -1;
  });
}

/**
 * Get unique solution groups
 *
 * @returns {string[]} Array of group names
 */
function getSolutionGroups() {
  var solutions = getAllSolutions();
  var groups = {};

  solutions.forEach(function(sol) {
    if (sol.solution_group && sol.solution_group.trim()) {
      groups[sol.solution_group.trim()] = true;
    }
  });

  return Object.keys(groups).sort();
}

/**
 * Get solution statistics
 *
 * @returns {Object} Statistics object
 */
function getSolutionStats() {
  var solutions = getAllSolutions();

  var stats = {
    total: solutions.length,
    byCycle: {},
    byPhase: {},
    operational: 0,
    implementation: 0,
    formulation: 0,
    funded: 0
  };

  solutions.forEach(function(sol) {
    // Count by cycle
    var cycle = sol.cycle || 'Unknown';
    stats.byCycle[cycle] = (stats.byCycle[cycle] || 0) + 1;

    // Count by phase
    var phase = sol.phase || 'Unknown';
    stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

    // Phase categories
    var phaseLower = (sol.phase || '').toLowerCase();
    if (phaseLower.indexOf('operational') !== -1 || phaseLower.indexOf('production') !== -1) {
      stats.operational++;
    } else if (phaseLower.indexOf('implementation') !== -1) {
      stats.implementation++;
    } else if (phaseLower.indexOf('formulation') !== -1) {
      stats.formulation++;
    }

    // Funding count
    if (sol.funded_by_ison === 'Y') {
      stats.funded++;
    }
  });

  return stats;
}

// ============================================================================
// SAMPLE DATA (for development/testing)
// ============================================================================

/**
 * Get sample solution data for development
 * Used when MO-DB_Solutions is not configured
 *
 * @returns {Object[]} Sample solutions
 */
function getSampleSolutions() {
  return [
    {
      solution_id: 'HLS',
      name: 'HLS',
      full_title: 'Harmonized Landsat Sentinel-2',
      solution_group: '',
      cycle: 2,
      cycle_year: 2018,
      phase: 'Production / Operational',
      funding_status: 'Funded',
      funded_by_ison: 'Y',
      solution_lead: 'Jeff Masek',
      solution_lead_affiliation: 'NASA GSFC',
      ra_representative: '',
      purpose_mission: 'The Harmonized Landsat Sentinel-2 (HLS) project provides consistent surface reflectance data from the Operational Land Imager (OLI) onboard the joint NASA/USGS Landsat 8 and 9 satellites and the Multi-Spectral Instrument (MSI) onboard Europe\'s Copernicus Sentinel-2A and Sentinel-2B satellites.',
      status_summary: 'HLS is fully operational and distributing data through LP DAAC.',
      drive_folder_url: '',
      snwg_solution_page_url: 'https://www.earthdata.nasa.gov/esds/harmonized-landsat-sentinel-2'
    },
    {
      solution_id: 'OPERA R1-DSWx_DIST_HLS',
      name: 'OPERA DSWx/DIST',
      full_title: 'OPERA Dynamic Surface Water Extent and Land Surface Disturbance',
      solution_group: 'OPERA',
      cycle: 4,
      cycle_year: 2022,
      phase: 'Production / Operational',
      funding_status: 'Funded',
      funded_by_ison: 'Y',
      solution_lead: 'Alexander Handwerger',
      solution_lead_affiliation: 'NASA JPL',
      ra_representative: '',
      purpose_mission: 'OPERA generates analysis-ready data products for Dynamic Surface Water Extent (DSWx) and Land Surface Disturbance (DIST) using harmonized optical data.',
      status_summary: 'OPERA DSWx and DIST products are being produced and distributed through ASF DAAC.',
      drive_folder_url: '',
      snwg_solution_page_url: 'https://www.earthdata.nasa.gov/esds/opera'
    },
    {
      solution_id: 'AQ-GMAO',
      name: 'Air Quality - GMAO',
      full_title: 'Air Quality Forecasts - GMAO',
      solution_group: 'Air Quality',
      cycle: 3,
      cycle_year: 2020,
      phase: 'Implementation',
      funding_status: 'Funded',
      funded_by_ison: 'Y',
      solution_lead: 'Carl Malings',
      solution_lead_affiliation: 'Morgan State University, NASA GSFC',
      ra_representative: 'Emma Knowland',
      purpose_mission: 'Provides measurements of air quality relevant to human health in international urban and domestic rural locations.',
      status_summary: 'Installation of Pandora sensors is ongoing. PM2.5 forecasts are available via AERONET.',
      drive_folder_url: '',
      snwg_solution_page_url: 'https://www.earthdata.nasa.gov/snwg-solutions/air-quality'
    },
    {
      solution_id: 'NISAR SM',
      name: 'NISAR Soil Moisture',
      full_title: 'NISAR Soil Moisture Products',
      solution_group: '',
      cycle: 5,
      cycle_year: 2024,
      phase: 'Formulation',
      funding_status: 'Funded',
      funded_by_ison: 'Y',
      solution_lead: '',
      solution_lead_affiliation: '',
      ra_representative: '',
      purpose_mission: 'High-resolution soil moisture products from NISAR radar observations.',
      status_summary: 'In formulation phase pending NISAR launch.',
      drive_folder_url: '',
      snwg_solution_page_url: ''
    },
    {
      solution_id: 'VLM',
      name: 'VLM',
      full_title: 'Vertical Land Motion',
      solution_group: '',
      cycle: 4,
      cycle_year: 2022,
      phase: 'Implementation',
      funding_status: 'Funded',
      funded_by_ison: 'Y',
      solution_lead: '',
      solution_lead_affiliation: 'NASA JPL',
      ra_representative: '',
      purpose_mission: 'Vertical Land Motion products to support sea level and flood risk applications.',
      status_summary: 'Product development ongoing.',
      drive_folder_url: '',
      snwg_solution_page_url: 'https://www.earthdata.nasa.gov/snwg-solutions/vlm'
    }
  ];
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test solutions API
 */
function testSolutionsAPI() {
  Logger.log('=== Testing Solutions API ===');

  var solutions = getAllSolutions();
  Logger.log('Total solutions: ' + solutions.length);

  var stats = getSolutionStats();
  Logger.log('Stats: ' + JSON.stringify(stats, null, 2));

  var groups = getSolutionGroups();
  Logger.log('Groups: ' + groups.join(', '));

  if (solutions.length > 0) {
    Logger.log('First solution: ' + solutions[0].name);
    Logger.log('  ID: ' + solutions[0].solution_id);
    Logger.log('  Cycle: ' + solutions[0].cycle);
    Logger.log('  Phase: ' + solutions[0].phase);
  }
}
