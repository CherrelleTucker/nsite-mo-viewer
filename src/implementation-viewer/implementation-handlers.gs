/**
 * Implementation-NSITE Handlers
 * =============================
 * Backend functions for the Implementation-NSITE viewer.
 * Called by the frontend JavaScript.
 *
 * @fileoverview Server-side handlers for solution data operations
 */

// ============================================================================
// SOLUTION DATA HANDLERS
// ============================================================================

/**
 * Get all solutions for the Implementation viewer
 * Returns solutions sorted by cycle (descending) then name
 *
 * @returns {Object[]} Array of solution objects
 */
function getSolutions() {
  try {
    var solutions = readAll('Solutions');

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
    Logger.log('Error getting solutions: ' + e.message);
    throw new Error('Failed to retrieve solutions: ' + e.message);
  }
}

/**
 * Get solutions filtered by criteria
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.cycle] - Cycle number
 * @param {string} [filters.phase] - Phase name
 * @param {string} [filters.solution_group] - Solution group name
 * @returns {Object[]} Filtered solutions
 */
function getSolutionsFiltered(filters) {
  try {
    var allSolutions = getSolutions();

    if (!filters || Object.keys(filters).length === 0) {
      return allSolutions;
    }

    return allSolutions.filter(function(sol) {
      for (var key in filters) {
        if (filters[key] && String(sol[key]) !== String(filters[key])) {
          return false;
        }
      }
      return true;
    });
  } catch (e) {
    Logger.log('Error filtering solutions: ' + e.message);
    throw new Error('Failed to filter solutions: ' + e.message);
  }
}

/**
 * Get a single solution by ID
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object|null} Solution object or null
 */
function getSolutionById(solutionId) {
  try {
    return getSolution(solutionId);
  } catch (e) {
    Logger.log('Error getting solution ' + solutionId + ': ' + e.message);
    throw new Error('Failed to retrieve solution: ' + e.message);
  }
}

/**
 * Get solutions grouped by cycle
 *
 * @returns {Object} Object with cycle numbers as keys
 */
function getSolutionsByCycle() {
  try {
    var solutions = getSolutions();
    var byCycle = {};

    solutions.forEach(function(sol) {
      var cycle = sol.cycle || 'Unknown';
      if (!byCycle[cycle]) {
        byCycle[cycle] = [];
      }
      byCycle[cycle].push(sol);
    });

    return byCycle;
  } catch (e) {
    Logger.log('Error grouping solutions by cycle: ' + e.message);
    throw new Error('Failed to group solutions: ' + e.message);
  }
}

/**
 * Get solution statistics for dashboard
 *
 * @returns {Object} Statistics object
 */
function getSolutionStats() {
  try {
    var solutions = getSolutions();

    var stats = {
      total: solutions.length,
      byCycle: {},
      byPhase: {},
      byGroup: {},
      funded: 0,
      operational: 0,
      implementation: 0,
      formulation: 0
    };

    solutions.forEach(function(sol) {
      // Count by cycle
      var cycle = sol.cycle || 'Unknown';
      stats.byCycle[cycle] = (stats.byCycle[cycle] || 0) + 1;

      // Count by phase
      var phase = sol.phase || 'Unknown';
      stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

      // Count by group
      if (sol.solution_group) {
        stats.byGroup[sol.solution_group] = (stats.byGroup[sol.solution_group] || 0) + 1;
      }

      // Funded count
      if (sol.funded_by_ison === 'Y') {
        stats.funded++;
      }

      // Phase categories
      var phaseLower = (sol.phase || '').toLowerCase();
      if (phaseLower.indexOf('operational') !== -1 || phaseLower.indexOf('production') !== -1) {
        stats.operational++;
      } else if (phaseLower.indexOf('implementation') !== -1) {
        stats.implementation++;
      } else if (phaseLower.indexOf('formulation') !== -1) {
        stats.formulation++;
      }
    });

    return stats;
  } catch (e) {
    Logger.log('Error calculating solution stats: ' + e.message);
    throw new Error('Failed to calculate statistics: ' + e.message);
  }
}

/**
 * Get unique solution groups
 *
 * @returns {string[]} Array of group names
 */
function getSolutionGroups() {
  try {
    var solutions = getSolutions();
    var groups = {};

    solutions.forEach(function(sol) {
      if (sol.solution_group && sol.solution_group.trim()) {
        groups[sol.solution_group.trim()] = true;
      }
    });

    return Object.keys(groups).sort();
  } catch (e) {
    Logger.log('Error getting solution groups: ' + e.message);
    throw new Error('Failed to retrieve solution groups: ' + e.message);
  }
}

/**
 * Search solutions by text
 *
 * @param {string} query - Search query
 * @returns {Object[]} Matching solutions
 */
function searchSolutions(query) {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    var searchTerm = query.toLowerCase().trim();
    var solutions = getSolutions();

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
  } catch (e) {
    Logger.log('Error searching solutions: ' + e.message);
    throw new Error('Failed to search solutions: ' + e.message);
  }
}

// ============================================================================
// SOLUTION TEAM HANDLERS
// ============================================================================

/**
 * Get team members for a solution
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object} Team members object
 */
function getSolutionTeam(solutionId) {
  try {
    var solution = getSolution(solutionId);
    if (!solution) {
      return null;
    }

    return {
      solution_lead: {
        name: solution.solution_lead,
        title: solution.solution_lead_title,
        affiliation: solution.solution_lead_affiliation
      },
      ra_representative: {
        name: solution.ra_representative,
        affiliation: solution.ra_representative_affiliation
      },
      earth_action_advocate: {
        name: solution.earth_action_advocate,
        affiliation: solution.earth_action_affiliation
      },
      stakeholder_engagement_lead: {
        name: solution.stakeholder_engagement_lead
      },
      comms_lead: {
        name: solution.comms_lead
      },
      program_scientist: {
        name: solution.program_scientist
      },
      ra_program_scientist: {
        name: solution.ra_program_scientist
      },
      primary_algo_developer: {
        name: solution.primary_algo_developer
      },
      other_contacts: solution.other_contacts
    };
  } catch (e) {
    Logger.log('Error getting solution team: ' + e.message);
    throw new Error('Failed to retrieve solution team: ' + e.message);
  }
}

// ============================================================================
// SOLUTION DOCUMENTS HANDLERS
// ============================================================================

/**
 * Get documentation links for a solution
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object} Document links object
 */
function getSolutionDocuments(solutionId) {
  try {
    var solution = getSolution(solutionId);
    if (!solution) {
      return null;
    }

    return {
      contractual: {
        science_sow_url: solution.science_sow_url,
        project_plan_url: solution.project_plan_url,
        risk_register_url: solution.risk_register_url,
        data_product_table_url: solution.data_product_table_url
      },
      drive: {
        drive_folder_url: solution.drive_folder_url
      },
      external: {
        snwg_solution_page_url: solution.snwg_solution_page_url,
        training_resource_url: solution.training_resource_url,
        fact_sheet_url: solution.fact_sheet_url,
        lifecycle_docs_url: solution.lifecycle_docs_url
      },
      sep: {
        nsite_sep_mandate: solution.nsite_sep_mandate,
        stakeholder_survey_url: solution.stakeholder_survey_url,
        stakeholder_list: solution.stakeholder_list
      }
    };
  } catch (e) {
    Logger.log('Error getting solution documents: ' + e.message);
    throw new Error('Failed to retrieve solution documents: ' + e.message);
  }
}

// ============================================================================
// SOLUTION CONTENT HANDLERS
// ============================================================================

/**
 * Get content sections for a solution
 *
 * @param {string} solutionId - Solution ID
 * @returns {Object} Content sections object
 */
function getSolutionContent(solutionId) {
  try {
    var solution = getSolution(solutionId);
    if (!solution) {
      return null;
    }

    return {
      purpose_mission: solution.purpose_mission,
      background: solution.background,
      societal_impact: solution.societal_impact,
      proposed_activity: solution.proposed_activity,
      solution_characteristics: solution.solution_characteristics,
      solution_resources: solution.solution_resources,
      status_summary: solution.status_summary,
      next_steps: solution.next_steps,
      notes: solution.notes,
      project_deliverables: solution.project_deliverables
    };
  } catch (e) {
    Logger.log('Error getting solution content: ' + e.message);
    throw new Error('Failed to retrieve solution content: ' + e.message);
  }
}

// ============================================================================
// EXPORT HANDLERS
// ============================================================================

/**
 * Export solutions to CSV format
 *
 * @param {Object} filters - Optional filters
 * @returns {string} CSV content
 */
function exportSolutionsCSV(filters) {
  try {
    var solutions = filters ? getSolutionsFiltered(filters) : getSolutions();

    if (solutions.length === 0) {
      return '';
    }

    // Get headers from first solution
    var headers = Object.keys(solutions[0]);
    var csv = headers.join(',') + '\n';

    solutions.forEach(function(sol) {
      var row = headers.map(function(h) {
        var value = sol[h] || '';
        // Escape quotes and wrap in quotes if contains comma
        value = String(value).replace(/"/g, '""');
        if (value.indexOf(',') !== -1 || value.indexOf('\n') !== -1) {
          value = '"' + value + '"';
        }
        return value;
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  } catch (e) {
    Logger.log('Error exporting solutions: ' + e.message);
    throw new Error('Failed to export solutions: ' + e.message);
  }
}

/**
 * Export solutions to JSON format
 *
 * @param {Object} filters - Optional filters
 * @returns {string} JSON content
 */
function exportSolutionsJSON(filters) {
  try {
    var solutions = filters ? getSolutionsFiltered(filters) : getSolutions();
    return JSON.stringify(solutions, null, 2);
  } catch (e) {
    Logger.log('Error exporting solutions: ' + e.message);
    throw new Error('Failed to export solutions: ' + e.message);
  }
}

// ============================================================================
// CYCLE HELPERS
// ============================================================================

/**
 * Get cycle metadata
 *
 * @returns {Object[]} Array of cycle info objects
 */
function getCycleInfo() {
  return [
    { cycle: 1, year: 2016, name: 'Cycle 1', status: 'Complete' },
    { cycle: 2, year: 2018, name: 'Cycle 2', status: 'Complete' },
    { cycle: 3, year: 2020, name: 'Cycle 3', status: 'Active' },
    { cycle: 4, year: 2022, name: 'Cycle 4', status: 'Active' },
    { cycle: 5, year: 2024, name: 'Cycle 5', status: 'Active' },
    { cycle: 6, year: 2026, name: 'Cycle 6', status: 'Planning' }
  ];
}

/**
 * Get phase display order
 *
 * @returns {string[]} Array of phases in display order
 */
function getPhaseOrder() {
  return [
    'Pre-Formulation',
    'Formulation',
    'Implementation',
    'Production / Operational',
    'Completed'
  ];
}
