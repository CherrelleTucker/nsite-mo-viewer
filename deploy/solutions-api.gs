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
      headers.forEach(function(header, i) { obj[header] = row[i]; });
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
 */
function getSolutions() {
  return getAllSolutions();
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
