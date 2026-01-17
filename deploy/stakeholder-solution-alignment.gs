/**
 * Stakeholder-Solution Alignment Reports
 * =======================================
 * Advanced reports comparing stakeholder needs with solution characteristics.
 *
 * Report Types:
 * - Need Alignment (Implementation): Compare survey needs with solution delivery
 * - Stakeholder Coverage (SEP): Engagement by department/agency
 * - Engagement Funnel (SEP): Track stakeholders through pipeline
 * - Department Reach (Comms): Agency coverage per solution
 *
 * Data Sources:
 * - MO-DB_Solutions: Solution characteristics (resolution, frequency, coverage)
 * - MO-DB_Needs: Stakeholder survey responses (what they need)
 * - MO-DB_Contacts: Stakeholder contact information
 *
 * @fileoverview Advanced stakeholder analytics and alignment reports
 */

// ============================================================================
// DATA ACCESS: MO-DB_Needs
// ============================================================================

/**
 * Get all needs from MO-DB_Needs database
 * @returns {Array} Array of need objects
 */
function getAllNeeds() {
  try {
    var ss, sheet;

    // Option 1: Try dedicated NEEDS_SHEET_ID from config
    var sheetId = getConfigValue('NEEDS_SHEET_ID');
    if (sheetId) {
      ss = SpreadsheetApp.openById(sheetId);
      sheet = ss.getSheets()[0];
      Logger.log('Using NEEDS_SHEET_ID: ' + sheetId);
    }

    // Option 2: Look for MO-DB_Needs sheet in the config spreadsheet
    if (!sheet) {
      var configSheetId = getProperty(CONFIG.CONFIG_SHEET_ID);
      if (configSheetId) {
        ss = SpreadsheetApp.openById(configSheetId);
        sheet = ss.getSheetByName('MO-DB_Needs');
        if (sheet) Logger.log('Found MO-DB_Needs in config spreadsheet');
      }
    }

    // Option 3: Fallback to active spreadsheet
    if (!sheet) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        sheet = ss.getSheetByName('MO-DB_Needs');
        if (sheet) Logger.log('Found MO-DB_Needs in active spreadsheet');
      }
    }

    if (!sheet) {
      Logger.log('MO-DB_Needs sheet not found. Add NEEDS_SHEET_ID to MO-DB_Config or create MO-DB_Needs sheet.');
      return [];
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('MO-DB_Needs has no data rows');
      return [];
    }

    var headers = data[0];
    var needs = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var need = {};

      for (var j = 0; j < headers.length; j++) {
        var key = headers[j].toString().trim();
        need[key] = row[j];
      }

      needs.push(need);
    }

    Logger.log('Loaded ' + needs.length + ' needs from MO-DB_Needs');
    return needs;
  } catch (e) {
    Logger.log('Error getting needs: ' + e.message + '\n' + e.stack);
    return [];
  }
}

/**
 * Match solution from MO-DB_Solutions to needs in MO-DB_Needs
 *
 * MO-DB_Solutions uses:
 *   - solution_id: Primary identifier (e.g., "HLS", "OPERA DIST")
 *   - name: Common name for meetings (e.g., "HLS")
 *   - full_title: Formal government name
 *
 * MO-DB_Needs has solution column with full names from stakeholder files:
 *   - "Harmonized Landsat and Sentinel-2 (HLS)"
 *   - "OPERA Surface Disturbance (DIST) Product"
 *
 * Matching priority:
 *   1. solution_id in parentheses: "(HLS)" at end of needs solution
 *   2. solution_id exact match
 *   3. solution_id substring match (min 3 chars)
 *   4. name-based matching as fallback
 */
function matchSolutionToNeeds_(solution, allNeeds) {
  // Support both object and string input
  var solId, solName;
  if (typeof solution === 'object') {
    solId = (solution.solution_id || '').toLowerCase().trim();
    solName = (solution.name || '').toLowerCase().trim();
  } else {
    solId = (solution || '').toLowerCase().trim();
    solName = solId;
  }

  if (!solId && !solName) return [];

  return allNeeds.filter(function(need) {
    var needSol = (need.solution || '').toLowerCase().trim();
    if (!needSol) return false;

    // 1. solution_id appears in parentheses: "Something (HLS)" matches solution_id "HLS"
    if (solId) {
      var parenMatch = needSol.match(/\(([^)]+)\)\s*$/);
      if (parenMatch && parenMatch[1].toLowerCase() === solId) return true;
    }

    // 2. Exact match on solution_id
    if (solId && needSol === solId) return true;

    // 3. solution_id substring match (min 3 chars to avoid false positives)
    if (solId && solId.length >= 3 && needSol.indexOf(solId) !== -1) return true;

    // 4. Name-based matching as fallback
    if (solName && solName !== solId) {
      if (needSol === solName) return true;
      if (solName.length >= 3 && needSol.indexOf(solName) !== -1) return true;
    }

    return false;
  });
}

/**
 * Get needs for a specific solution
 * @param {string} solutionName - Solution name to filter by
 * @returns {Array} Array of need objects for the solution
 */
function getNeedsForSolution(solutionName) {
  var allNeeds = getAllNeeds();
  return matchSolutionToNeeds_(solutionName, allNeeds);
}

// ============================================================================
// REPORT 1: NEED ALIGNMENT (Implementation)
// Compare what stakeholders requested vs what solutions deliver
// ============================================================================

/**
 * Generate Need Alignment Report
 * Compares what stakeholders requested (from MO-DB_Needs) vs what solutions deliver
 * @param {Object} options - Filter options
 * @param {string} options.cycle - Filter by cycle
 * @param {boolean} options.defaultOnly - Only default solutions
 * @returns {Object} Need alignment report data
 */
function generateNeedAlignmentReport(options) {
  options = options || {};

  try {
    var solutions = getAllSolutions();
    var allNeeds = getAllNeeds();

    // Apply filters
    if (options.cycle) {
      solutions = solutions.filter(function(s) {
        return String(s.cycle) === String(options.cycle);
      });
    }

    if (options.defaultOnly) {
      solutions = solutions.filter(function(s) {
        return s.show_in_default === 'Y';
      });
    }

    Logger.log('Processing ' + solutions.length + ' solutions against ' + allNeeds.length + ' needs');

    // Build alignment data for each solution
    var alignments = solutions.map(function(sol) {
      // Use solution_id as primary identifier, name for display
      var solId = sol.solution_id || '';
      var solName = sol.name || solId;

      // Get needs for this solution using solution_id-based matching
      var solutionNeeds = matchSolutionToNeeds_(sol, allNeeds);

      // Solution characteristics (what it delivers)
      var solutionProvides = {
        horizontal_resolution: sol.horizontal_resolution || '',
        temporal_frequency: sol.temporal_frequency || '',
        geographic_domain: sol.geographic_domain || '',
        platform: sol.platform || '',
        thematic_areas: sol.thematic_areas || ''
      };

      // Aggregate stakeholder needs
      var needsAnalysis = analyzeNeeds_(solutionNeeds);

      // Calculate alignment score comparing needs vs solution
      var alignmentResult = calculateNeedAlignment_(solutionProvides, needsAnalysis, solutionNeeds);

      return {
        solution_id: solId,
        solution: solName,  // Display name
        fullName: sol.full_title || '',
        cycle: 'C' + (sol.cycle || '?'),
        phase: sol.phase || '',

        // What the solution provides
        solutionProvides: solutionProvides,
        purpose: sol.purpose_mission || sol.status_text || '',

        // What stakeholders need (aggregated from surveys)
        stakeholderNeeds: {
          total: solutionNeeds.length,
          uniqueSubmitters: needsAnalysis.uniqueSubmitters,
          avgDegreeNeedMet: needsAnalysis.avgDegreeNeedMet,
          avgDegreeNeedMetReason: needsAnalysis.avgDegreeNeedMetReason,
          responsesWithDegreeData: needsAnalysis.responsesWithDegreeData,
          // Legacy fields for backwards compatibility
          resolutionNeeds: needsAnalysis.resolutionNeeds,
          frequencyNeeds: needsAnalysis.frequencyNeeds,
          coverageNeeds: needsAnalysis.coverageNeeds,
          // ALL characteristics from survey
          characteristics: needsAnalysis.characteristics,
          byDepartment: needsAnalysis.byDepartment,
          bySurveyYear: needsAnalysis.bySurveyYear
        },

        // Alignment analysis
        alignmentScore: alignmentResult.score,
        scoreBreakdown: alignmentResult.breakdown,
        scoreSummary: alignmentResult.summary,
        gaps: alignmentResult.gaps
      };
    });

    // Sort by alignment score (lowest first to highlight gaps)
    alignments.sort(function(a, b) {
      return a.alignmentScore - b.alignmentScore;
    });

    return {
      title: 'Need Alignment Report',
      subtitle: 'Comparing stakeholder requirements vs solution characteristics',
      generated: new Date().toISOString(),
      count: alignments.length,
      totalNeeds: allNeeds.length,
      filters: options,
      alignments: alignments,
      summary: calculateAlignmentSummary_(alignments)
    };

  } catch (e) {
    Logger.log('Error generating need alignment report: ' + e.message);
    throw new Error('Failed to generate need alignment report: ' + e.message);
  }
}

/**
 * Analyze needs from survey responses
 * Captures ALL survey characteristics for comprehensive decision-making
 */
function analyzeNeeds_(needs) {
  var uniqueSubmitters = {};
  var byDepartment = {};
  var bySurveyYear = {};
  var degreeNeedMetValues = [];

  // Track ALL characteristics from survey
  var characteristics = {
    horizontal_resolution: {},
    vertical_resolution: {},
    temporal_frequency: {},
    data_latency: {},
    geographic_coverage: {},
    spectral_bands: {},
    measurement_uncertainty: {},
    required_processing_level: {},
    preferred_format: {},
    preferred_access: {},
    critical_attributes_ranking: {}
  };

  needs.forEach(function(n) {
    // Track unique submitters
    if (n.submitter_name) uniqueSubmitters[n.submitter_name] = true;

    // Track all characteristics
    Object.keys(characteristics).forEach(function(key) {
      if (n[key]) {
        var val = String(n[key]).trim();
        if (val && val.toLowerCase() !== 'nan' && val !== '') {
          characteristics[key][val] = (characteristics[key][val] || 0) + 1;
        }
      }
    });

    // Track by department
    if (n.department) {
      byDepartment[n.department] = (byDepartment[n.department] || 0) + 1;
    }

    // Track by survey year
    if (n.survey_year) {
      bySurveyYear[n.survey_year] = (bySurveyYear[n.survey_year] || 0) + 1;
    }

    // Track degree need met
    var dnm = parseFloat(n.degree_need_met);
    if (!isNaN(dnm)) {
      degreeNeedMetValues.push(dnm);
    }
  });

  // Calculate average degree need met with reason if unavailable
  var avgDegreeNeedMet = null;
  var avgDegreeNeedMetReason = null;

  if (needs.length === 0) {
    avgDegreeNeedMetReason = 'No matching survey responses';
  } else if (degreeNeedMetValues.length === 0) {
    avgDegreeNeedMetReason = 'Survey responses lack degree_need_met data (' + needs.length + ' responses)';
  } else {
    avgDegreeNeedMet = Math.round(degreeNeedMetValues.reduce(function(a, b) { return a + b; }, 0) / degreeNeedMetValues.length);
  }

  // Format all characteristics - show ALL values, not just top N
  var formattedCharacteristics = {};
  Object.keys(characteristics).forEach(function(key) {
    formattedCharacteristics[key] = formatAllValues_(characteristics[key]);
  });

  return {
    uniqueSubmitters: Object.keys(uniqueSubmitters).length,
    // Legacy fields for backwards compatibility
    resolutionNeeds: formattedCharacteristics.horizontal_resolution,
    frequencyNeeds: formattedCharacteristics.temporal_frequency,
    coverageNeeds: formattedCharacteristics.geographic_coverage,
    // ALL characteristics
    characteristics: formattedCharacteristics,
    byDepartment: formatAllValues_(byDepartment),
    bySurveyYear: bySurveyYear,
    avgDegreeNeedMet: avgDegreeNeedMet,
    avgDegreeNeedMetReason: avgDegreeNeedMetReason,
    totalResponses: needs.length,
    responsesWithDegreeData: degreeNeedMetValues.length
  };
}

/**
 * Format all values as sorted array (not limited to top N)
 */
function formatAllValues_(obj) {
  return Object.keys(obj).map(function(key) {
    return { name: key, count: obj[key] };
  }).sort(function(a, b) {
    return b.count - a.count;
  });
}

/**
 * Calculate need alignment score comparing what solution delivers vs what stakeholders need
 * Returns object with score, breakdown, and identified gaps
 */
function calculateNeedAlignment_(solutionProvides, needsAnalysis, needs) {
  var breakdown = {
    degreeNeedMet: { points: 0, max: 40, details: [] },
    resolutionMatch: { points: 0, max: 20, details: [] },
    frequencyMatch: { points: 0, max: 20, details: [] },
    coverageMatch: { points: 0, max: 20, details: [] }
  };

  var gaps = [];

  // 1. Use stakeholder-reported "degree need met" as primary indicator (max 40 pts)
  var avgDNM = needsAnalysis.avgDegreeNeedMet;
  if (avgDNM !== null) {
    // Scale 0-100 survey response to 0-40 points
    var dnmPoints = Math.round(avgDNM * 0.4);
    breakdown.degreeNeedMet.points = dnmPoints;
    breakdown.degreeNeedMet.details.push('Stakeholders report ' + avgDNM + '% need met');

    if (avgDNM < 50) {
      gaps.push('Low satisfaction: stakeholders report only ' + avgDNM + '% of need met');
    }
  } else if (needs.length === 0) {
    breakdown.degreeNeedMet.details.push('No survey responses');
  } else {
    breakdown.degreeNeedMet.details.push('No degree_need_met data available');
  }

  // 2. Resolution match (max 20 pts)
  var solRes = (solutionProvides.horizontal_resolution || '').toLowerCase();
  if (solRes && needsAnalysis.resolutionNeeds.length > 0) {
    var topResNeed = needsAnalysis.resolutionNeeds[0].name.toLowerCase();
    var resMatch = checkResolutionMatch_(solRes, topResNeed);

    if (resMatch.matches) {
      breakdown.resolutionMatch.points = 20;
      breakdown.resolutionMatch.details.push('Solution provides: ' + solutionProvides.horizontal_resolution);
      breakdown.resolutionMatch.details.push('Top need: ' + needsAnalysis.resolutionNeeds[0].name + ' (MATCHED)');
    } else if (resMatch.partial) {
      breakdown.resolutionMatch.points = 10;
      breakdown.resolutionMatch.details.push('Partial match - Solution: ' + solutionProvides.horizontal_resolution);
      breakdown.resolutionMatch.details.push('Top need: ' + needsAnalysis.resolutionNeeds[0].name);
    } else {
      breakdown.resolutionMatch.details.push('GAP - Solution: ' + (solutionProvides.horizontal_resolution || 'unknown'));
      breakdown.resolutionMatch.details.push('Top need: ' + needsAnalysis.resolutionNeeds[0].name);
      gaps.push('Resolution gap: ' + needsAnalysis.resolutionNeeds[0].count + ' stakeholders need ' + needsAnalysis.resolutionNeeds[0].name);
    }
  } else if (!solRes) {
    breakdown.resolutionMatch.details.push('Solution resolution not specified');
  }

  // 3. Frequency match (max 20 pts)
  var solFreq = (solutionProvides.temporal_frequency || '').toLowerCase();
  if (solFreq && needsAnalysis.frequencyNeeds.length > 0) {
    var topFreqNeed = needsAnalysis.frequencyNeeds[0].name.toLowerCase();
    var freqMatch = checkFrequencyMatch_(solFreq, topFreqNeed);

    if (freqMatch.matches) {
      breakdown.frequencyMatch.points = 20;
      breakdown.frequencyMatch.details.push('Solution provides: ' + solutionProvides.temporal_frequency);
      breakdown.frequencyMatch.details.push('Top need: ' + needsAnalysis.frequencyNeeds[0].name + ' (MATCHED)');
    } else if (freqMatch.exceeds) {
      breakdown.frequencyMatch.points = 20;
      breakdown.frequencyMatch.details.push('Solution exceeds need - provides: ' + solutionProvides.temporal_frequency);
      breakdown.frequencyMatch.details.push('Top need: ' + needsAnalysis.frequencyNeeds[0].name);
    } else {
      breakdown.frequencyMatch.points = 5;
      breakdown.frequencyMatch.details.push('GAP - Solution: ' + (solutionProvides.temporal_frequency || 'unknown'));
      breakdown.frequencyMatch.details.push('Top need: ' + needsAnalysis.frequencyNeeds[0].name);
      gaps.push('Frequency gap: ' + needsAnalysis.frequencyNeeds[0].count + ' stakeholders need ' + needsAnalysis.frequencyNeeds[0].name);
    }
  } else if (!solFreq) {
    breakdown.frequencyMatch.details.push('Solution frequency not specified');
  }

  // 4. Geographic coverage match (max 20 pts)
  var solCov = (solutionProvides.geographic_domain || '').toLowerCase();
  if (solCov && needsAnalysis.coverageNeeds.length > 0) {
    var topCovNeed = needsAnalysis.coverageNeeds[0].name.toLowerCase();

    if (solCov.indexOf('global') !== -1 ||
        solCov.indexOf(topCovNeed) !== -1 ||
        topCovNeed.indexOf(solCov) !== -1) {
      breakdown.coverageMatch.points = 20;
      breakdown.coverageMatch.details.push('Solution provides: ' + solutionProvides.geographic_domain);
      breakdown.coverageMatch.details.push('Top need: ' + needsAnalysis.coverageNeeds[0].name + ' (MATCHED)');
    } else {
      breakdown.coverageMatch.points = 10;
      breakdown.coverageMatch.details.push('Partial - Solution: ' + solutionProvides.geographic_domain);
      breakdown.coverageMatch.details.push('Top need: ' + needsAnalysis.coverageNeeds[0].name);
      gaps.push('Coverage gap: ' + needsAnalysis.coverageNeeds[0].count + ' stakeholders need ' + needsAnalysis.coverageNeeds[0].name + ', solution provides ' + solutionProvides.geographic_domain);
    }
  } else if (!solCov && needsAnalysis.coverageNeeds.length > 0) {
    breakdown.coverageMatch.details.push('Solution coverage not specified');
    gaps.push('Coverage undefined: ' + needsAnalysis.coverageNeeds[0].count + ' stakeholders need ' + needsAnalysis.coverageNeeds[0].name + ', but solution coverage not specified');
  } else if (!solCov) {
    breakdown.coverageMatch.details.push('Solution coverage not specified');
  }

  var totalScore = breakdown.degreeNeedMet.points +
                   breakdown.resolutionMatch.points +
                   breakdown.frequencyMatch.points +
                   breakdown.coverageMatch.points;

  return {
    score: Math.min(totalScore, 100),
    breakdown: breakdown,
    summary: buildNeedAlignmentSummary_(breakdown),
    gaps: gaps
  };
}

/**
 * Check if solution resolution meets the stated need
 * Resolution hierarchy: <1m > 1-5m > 10-30m > 100-250m > >1km
 */
function checkResolutionMatch_(solRes, needRes) {
  var resOrder = ['<1', '1 m', '1-5', '5-10', '10-30', '30-100', '100-250', '250', '1 km', '>1'];

  // Find position in hierarchy (lower = finer resolution)
  var solPos = -1, needPos = -1;
  for (var i = 0; i < resOrder.length; i++) {
    if (solRes.indexOf(resOrder[i].toLowerCase()) !== -1) solPos = i;
    if (needRes.indexOf(resOrder[i].toLowerCase()) !== -1) needPos = i;
  }

  if (solPos === -1 || needPos === -1) {
    // Can't determine, check string match
    return { matches: solRes.indexOf(needRes) !== -1 || needRes.indexOf(solRes) !== -1, partial: true };
  }

  return {
    matches: solPos <= needPos,  // Solution is same or finer resolution
    partial: Math.abs(solPos - needPos) <= 1,
    exceeds: solPos < needPos
  };
}

/**
 * Check if solution frequency meets the stated need
 * Frequency hierarchy: hourly > daily > weekly > monthly > yearly
 */
function checkFrequencyMatch_(solFreq, needFreq) {
  var freqOrder = ['hour', 'daily', 'day', 'week', 'month', 'quarter', 'year', 'annual'];

  var solPos = -1, needPos = -1;
  for (var i = 0; i < freqOrder.length; i++) {
    if (solFreq.indexOf(freqOrder[i]) !== -1) solPos = i;
    if (needFreq.indexOf(freqOrder[i]) !== -1) needPos = i;
  }

  if (solPos === -1 || needPos === -1) {
    return { matches: solFreq.indexOf(needFreq) !== -1 || needFreq.indexOf(solFreq) !== -1, partial: true };
  }

  return {
    matches: solPos <= needPos,  // Solution is same or more frequent
    exceeds: solPos < needPos
  };
}

/**
 * Build a human-readable alignment summary
 */
function buildNeedAlignmentSummary_(breakdown) {
  var parts = [];

  if (breakdown.degreeNeedMet.points > 0) {
    parts.push('Need Met: ' + breakdown.degreeNeedMet.points + '/' + breakdown.degreeNeedMet.max);
  }
  if (breakdown.resolutionMatch.points > 0) {
    parts.push('Resolution: ' + breakdown.resolutionMatch.points + '/' + breakdown.resolutionMatch.max);
  }
  if (breakdown.frequencyMatch.points > 0) {
    parts.push('Frequency: ' + breakdown.frequencyMatch.points + '/' + breakdown.frequencyMatch.max);
  }
  if (breakdown.coverageMatch.points > 0) {
    parts.push('Coverage: ' + breakdown.coverageMatch.points + '/' + breakdown.coverageMatch.max);
  }

  return parts.join(' | ') || 'No data';
}

/**
 * Calculate summary statistics for alignment report
 */
function calculateAlignmentSummary_(alignments) {
  var totalNeeds = 0;
  var totalSubmitters = 0;
  var solutionsWithNeeds = 0;
  var avgScore = 0;
  var gapCount = 0;
  var lowSatisfactionCount = 0;

  alignments.forEach(function(a) {
    totalNeeds += a.stakeholderNeeds.total;
    totalSubmitters += a.stakeholderNeeds.uniqueSubmitters;
    if (a.stakeholderNeeds.total > 0) solutionsWithNeeds++;
    avgScore += a.alignmentScore;
    gapCount += (a.gaps || []).length;

    if (a.stakeholderNeeds.avgDegreeNeedMet !== null && a.stakeholderNeeds.avgDegreeNeedMet < 50) {
      lowSatisfactionCount++;
    }
  });

  return {
    totalSolutions: alignments.length,
    totalNeeds: totalNeeds,
    totalSubmitters: totalSubmitters,
    solutionsWithNeeds: solutionsWithNeeds,
    solutionsWithoutNeeds: alignments.length - solutionsWithNeeds,
    averageAlignmentScore: alignments.length > 0 ? Math.round(avgScore / alignments.length) : 0,
    totalGaps: gapCount,
    lowSatisfactionCount: lowSatisfactionCount
  };
}

// ============================================================================
// REPORT 2: STAKEHOLDER COVERAGE (SEP)
// Engagement by department/agency
// ============================================================================

/**
 * Generate Stakeholder Coverage Report
 * Shows which departments/agencies are engaged across solutions
 * @param {Object} options - Filter options
 * @returns {Object} Stakeholder coverage report
 */
function generateStakeholderCoverageReport(options) {
  options = options || {};

  try {
    var contacts = getAllContacts();
    var solutions = getAllSolutions();

    // Build department/agency engagement map
    var departments = {};
    var agencies = {};

    contacts.forEach(function(c) {
      // Department tracking
      if (c.department) {
        if (!departments[c.department]) {
          departments[c.department] = {
            name: c.department,
            contacts: {},
            solutions: {},
            roles: {},
            surveyYears: {}
          };
        }
        if (c.email) departments[c.department].contacts[c.email] = true;
        if (c.solution) departments[c.department].solutions[c.solution] = true;
        if (c.role) departments[c.department].roles[c.role] = (departments[c.department].roles[c.role] || 0) + 1;
        if (c.survey_year) departments[c.department].surveyYears[c.survey_year] = true;
      }

      // Agency tracking
      if (c.agency) {
        if (!agencies[c.agency]) {
          agencies[c.agency] = {
            name: c.agency,
            department: c.department,
            contacts: {},
            solutions: {}
          };
        }
        if (c.email) agencies[c.agency].contacts[c.email] = true;
        if (c.solution) agencies[c.agency].solutions[c.solution] = true;
      }
    });

    // Format department data
    var deptList = Object.keys(departments).map(function(d) {
      var dept = departments[d];
      return {
        department: d,
        contactCount: Object.keys(dept.contacts).length,
        solutionCount: Object.keys(dept.solutions).length,
        solutions: Object.keys(dept.solutions).slice(0, 10),
        roles: dept.roles,
        surveyYears: Object.keys(dept.surveyYears).map(Number).sort()
      };
    });

    // Sort by contact count
    deptList.sort(function(a, b) {
      return b.contactCount - a.contactCount;
    });

    // Format agency data
    var agencyList = Object.keys(agencies).map(function(a) {
      var agency = agencies[a];
      return {
        agency: a,
        department: agency.department,
        contactCount: Object.keys(agency.contacts).length,
        solutionCount: Object.keys(agency.solutions).length
      };
    });

    agencyList.sort(function(a, b) {
      return b.contactCount - a.contactCount;
    });

    // Identify coverage gaps
    var solutionCoverage = {};
    solutions.forEach(function(s) {
      solutionCoverage[s.name] = {
        solution: s.name,
        cycle: s.cycle,
        phase: s.phase,
        departments: [],
        contactCount: 0
      };
    });

    contacts.forEach(function(c) {
      if (c.solution && solutionCoverage[c.solution]) {
        if (c.department && solutionCoverage[c.solution].departments.indexOf(c.department) === -1) {
          solutionCoverage[c.solution].departments.push(c.department);
        }
        solutionCoverage[c.solution].contactCount++;
      }
    });

    var coverageList = Object.keys(solutionCoverage).map(function(s) {
      return solutionCoverage[s];
    }).sort(function(a, b) {
      return b.contactCount - a.contactCount;
    });

    // Find gaps (solutions with no stakeholders)
    var gaps = coverageList.filter(function(s) {
      return s.contactCount === 0;
    });

    return {
      title: 'Stakeholder Coverage Report',
      subtitle: 'Department and agency engagement across solutions',
      generated: new Date().toISOString(),
      summary: {
        totalDepartments: deptList.length,
        totalAgencies: agencyList.length,
        totalSolutions: solutions.length,
        solutionsWithGaps: gaps.length
      },
      byDepartment: deptList,
      byAgency: agencyList.slice(0, 30),
      solutionCoverage: coverageList,
      coverageGaps: gaps
    };

  } catch (e) {
    Logger.log('Error generating stakeholder coverage report: ' + e.message);
    throw new Error('Failed to generate stakeholder coverage report: ' + e.message);
  }
}

// ============================================================================
// REPORT 3: ENGAGEMENT FUNNEL (SEP)
// Track stakeholders from survey through SME engagement
// ============================================================================

/**
 * Generate Engagement Funnel Report
 * Tracks stakeholder progression: Survey Submitter -> Secondary SME -> Primary SME
 * @param {Object} options - Filter options
 * @returns {Object} Engagement funnel report
 */
function generateEngagementFunnelReport(options) {
  options = options || {};

  try {
    var contacts = getAllContacts();

    // Build unique stakeholder map
    var stakeholders = {};

    contacts.forEach(function(c) {
      if (!c.email) return;

      if (!stakeholders[c.email]) {
        stakeholders[c.email] = {
          email: c.email,
          name: (c.first_name || '') + ' ' + (c.last_name || ''),
          department: c.department,
          agency: c.agency,
          roles: {},
          solutions: {},
          surveyYears: []
        };
      }

      if (c.role) stakeholders[c.email].roles[c.role] = true;
      if (c.solution) stakeholders[c.email].solutions[c.solution] = true;
      if (c.survey_year && stakeholders[c.email].surveyYears.indexOf(c.survey_year) === -1) {
        stakeholders[c.email].surveyYears.push(c.survey_year);
      }
    });

    // Classify stakeholders by engagement level
    var funnel = {
      surveySubmitters: [],
      secondarySMEs: [],
      primarySMEs: [],
      multiRole: []
    };

    Object.keys(stakeholders).forEach(function(email) {
      var s = stakeholders[email];
      var roleKeys = Object.keys(s.roles);

      if (roleKeys.length > 1) {
        funnel.multiRole.push(s);
      } else if (s.roles['Primary SME']) {
        funnel.primarySMEs.push(s);
      } else if (s.roles['Secondary SME']) {
        funnel.secondarySMEs.push(s);
      } else if (s.roles['Survey Submitter']) {
        funnel.surveySubmitters.push(s);
      }
    });

    // Calculate conversion rates
    var totalUnique = Object.keys(stakeholders).length;
    var submitterCount = funnel.surveySubmitters.length + funnel.multiRole.length;
    var smeCount = funnel.secondarySMEs.length + funnel.primarySMEs.length + funnel.multiRole.length;
    var primaryCount = funnel.primarySMEs.length + funnel.multiRole.filter(function(s) {
      return s.roles['Primary SME'];
    }).length;

    // Engagement by year
    var byYear = {};
    Object.keys(stakeholders).forEach(function(email) {
      var s = stakeholders[email];
      s.surveyYears.forEach(function(year) {
        if (!byYear[year]) {
          byYear[year] = { submitters: 0, smes: 0, primary: 0 };
        }
        if (s.roles['Survey Submitter']) byYear[year].submitters++;
        if (s.roles['Secondary SME'] || s.roles['Primary SME']) byYear[year].smes++;
        if (s.roles['Primary SME']) byYear[year].primary++;
      });
    });

    // Solutions needing SME engagement
    var solutions = getAllSolutions();
    var solutionsNeedingSMEs = [];

    solutions.forEach(function(sol) {
      var solContacts = contacts.filter(function(c) {
        return c.solution === sol.name;
      });

      var hasPrimarySME = solContacts.some(function(c) {
        return c.role === 'Primary SME';
      });

      if (!hasPrimarySME && solContacts.length > 0) {
        solutionsNeedingSMEs.push({
          solution: sol.name,
          cycle: sol.cycle,
          phase: sol.phase,
          submitterCount: solContacts.filter(function(c) {
            return c.role === 'Survey Submitter';
          }).length
        });
      }
    });

    return {
      title: 'Engagement Funnel Report',
      subtitle: 'Stakeholder progression from survey to SME engagement',
      generated: new Date().toISOString(),
      funnel: {
        stages: [
          { stage: 'Survey Submitters', count: submitterCount, percent: 100 },
          { stage: 'SME Engagement', count: smeCount, percent: totalUnique > 0 ? Math.round(smeCount / totalUnique * 100) : 0 },
          { stage: 'Primary SMEs', count: primaryCount, percent: totalUnique > 0 ? Math.round(primaryCount / totalUnique * 100) : 0 }
        ],
        details: {
          surveyOnly: funnel.surveySubmitters.length,
          secondarySME: funnel.secondarySMEs.length,
          primarySME: funnel.primarySMEs.length,
          multiRole: funnel.multiRole.length
        }
      },
      byYear: Object.keys(byYear).sort().map(function(y) {
        return { year: parseInt(y), data: byYear[y] };
      }),
      conversionOpportunities: solutionsNeedingSMEs.slice(0, 15),
      topEngaged: funnel.multiRole.slice(0, 10).map(function(s) {
        return {
          name: s.name.trim(),
          department: s.department,
          roles: Object.keys(s.roles),
          solutions: Object.keys(s.solutions).length
        };
      })
    };

  } catch (e) {
    Logger.log('Error generating engagement funnel report: ' + e.message);
    throw new Error('Failed to generate engagement funnel report: ' + e.message);
  }
}

// ============================================================================
// REPORT 4: DEPARTMENT REACH (Comms)
// Agency coverage per solution
// ============================================================================

/**
 * Generate Department Reach Report
 * Shows which solutions reach which departments - useful for Comms planning
 * @param {Object} options - Filter options
 * @returns {Object} Department reach report
 */
function generateDepartmentReachReport(options) {
  options = options || {};

  try {
    var contacts = getAllContacts();
    var solutions = getAllSolutions();

    // Build solution -> department matrix
    var matrix = {};

    solutions.forEach(function(sol) {
      matrix[sol.name] = {
        solution: sol.name,
        fullName: sol.full_name || '',
        cycle: 'C' + (sol.cycle || '?'),
        phase: sol.phase || '',
        departments: {},
        agencies: {},
        totalContacts: 0
      };
    });

    // Populate matrix from contacts
    contacts.forEach(function(c) {
      if (!c.solution || !matrix[c.solution]) return;

      matrix[c.solution].totalContacts++;

      if (c.department) {
        if (!matrix[c.solution].departments[c.department]) {
          matrix[c.solution].departments[c.department] = { count: 0, agencies: {} };
        }
        matrix[c.solution].departments[c.department].count++;

        if (c.agency) {
          matrix[c.solution].departments[c.department].agencies[c.agency] = true;
        }
      }

      if (c.agency) {
        matrix[c.solution].agencies[c.agency] = (matrix[c.solution].agencies[c.agency] || 0) + 1;
      }
    });

    // Format for output
    var reachData = Object.keys(matrix).map(function(sol) {
      var m = matrix[sol];
      var depts = Object.keys(m.departments).map(function(d) {
        return {
          department: d,
          contactCount: m.departments[d].count,
          agencies: Object.keys(m.departments[d].agencies)
        };
      }).sort(function(a, b) {
        return b.contactCount - a.contactCount;
      });

      return {
        solution: m.solution,
        fullName: m.fullName,
        cycle: m.cycle,
        phase: m.phase,
        totalContacts: m.totalContacts,
        departmentCount: depts.length,
        agencyCount: Object.keys(m.agencies).length,
        departments: depts.slice(0, 8),
        topAgencies: formatTopN_(m.agencies, 5)
      };
    });

    // Sort by department reach
    reachData.sort(function(a, b) {
      return b.departmentCount - a.departmentCount;
    });

    // Summary by department
    var deptSummary = {};
    contacts.forEach(function(c) {
      if (!c.department) return;
      if (!deptSummary[c.department]) {
        deptSummary[c.department] = { solutions: {}, contacts: {} };
      }
      if (c.solution) deptSummary[c.department].solutions[c.solution] = true;
      if (c.email) deptSummary[c.department].contacts[c.email] = true;
    });

    var deptList = Object.keys(deptSummary).map(function(d) {
      return {
        department: d,
        solutionCount: Object.keys(deptSummary[d].solutions).length,
        contactCount: Object.keys(deptSummary[d].contacts).length,
        solutions: Object.keys(deptSummary[d].solutions)
      };
    }).sort(function(a, b) {
      return b.solutionCount - a.solutionCount;
    });

    return {
      title: 'Department Reach Report',
      subtitle: 'Solution coverage across federal departments and agencies',
      generated: new Date().toISOString(),
      summary: {
        totalSolutions: reachData.length,
        solutionsWithReach: reachData.filter(function(r) { return r.departmentCount > 0; }).length,
        totalDepartments: deptList.length,
        averageDeptPerSolution: reachData.length > 0 ?
          Math.round(reachData.reduce(function(sum, r) { return sum + r.departmentCount; }, 0) / reachData.length * 10) / 10 : 0
      },
      bySolution: reachData,
      byDepartment: deptList.slice(0, 15),
      broadestReach: reachData.slice(0, 10),
      narrowestReach: reachData.filter(function(r) { return r.totalContacts > 0; })
        .sort(function(a, b) { return a.departmentCount - b.departmentCount; })
        .slice(0, 10)
    };

  } catch (e) {
    Logger.log('Error generating department reach report: ' + e.message);
    throw new Error('Failed to generate department reach report: ' + e.message);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get solution content from earthdata (cached in config or properties)
 * Falls back to building content from MO-DB_Solutions if not cached
 */
function getSolutionContent_() {
  // Try to get from script properties first (for full earthdata content)
  try {
    var props = PropertiesService.getScriptProperties();
    var cached = props.getProperty('SOLUTION_CONTENT');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    Logger.log('Error reading solution content from properties: ' + e.message);
  }

  // Fallback: Build content map from MO-DB_Solutions database
  // This uses fields already in the database (purpose_mission, thematic_areas, etc.)
  try {
    var solutions = getAllSolutions();
    var contentMap = {};

    solutions.forEach(function(sol) {
      var key = sol.name || sol.solution_id;
      contentMap[key] = {
        name: sol.full_title || sol.name || '',
        purpose_mission: sol.purpose_mission || sol.status_summary || '',
        societal_impact: sol.societal_impact || '',
        solution_characteristics: {
          platform: sol.platform || '',
          temporal_frequency: sol.temporal_frequency || '',
          horizontal_resolution: sol.horizontal_resolution || '',
          geographic_domain: sol.geographic_domain || '',
          thematic_areas: sol.thematic_areas || ''
        }
      };

      // Also map by full_title if different
      if (sol.full_title && sol.full_title !== key) {
        contentMap[sol.full_title] = contentMap[key];
      }
    });

    return contentMap;
  } catch (e) {
    Logger.log('Error building solution content from database: ' + e.message);
  }

  // Return empty object if all else fails
  return {};
}

/**
 * Load earthdata solution content into script properties
 * Call this function once after pasting the JSON content
 *
 * Usage from Apps Script editor:
 *   1. Copy the content from earthdata-content-simplified.json
 *   2. Call loadSolutionContent(pastedContent)
 *
 * @param {string} jsonContent - The JSON string to load
 */
function loadSolutionContent(jsonContent) {
  try {
    // Validate JSON
    var content = JSON.parse(jsonContent);
    var count = Object.keys(content).length;

    // Store in script properties
    var props = PropertiesService.getScriptProperties();
    props.setProperty('SOLUTION_CONTENT', jsonContent);

    Logger.log('Successfully loaded ' + count + ' solutions into script properties');
    return { success: true, count: count };
  } catch (e) {
    Logger.log('Error loading solution content: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Clear cached solution content from script properties
 */
function clearSolutionContent() {
  try {
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty('SOLUTION_CONTENT');
    Logger.log('Solution content cache cleared');
    return { success: true };
  } catch (e) {
    Logger.log('Error clearing solution content: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Check if solution content is loaded
 */
function checkSolutionContent() {
  try {
    var props = PropertiesService.getScriptProperties();
    var cached = props.getProperty('SOLUTION_CONTENT');
    if (cached) {
      var content = JSON.parse(cached);
      var count = Object.keys(content).length;
      return { loaded: true, count: count, source: 'script_properties' };
    }
  } catch (e) {}

  // Check fallback
  try {
    var solutions = getAllSolutions();
    var hasContent = solutions.some(function(sol) {
      return sol.purpose_mission || sol.thematic_areas;
    });
    return {
      loaded: hasContent,
      count: solutions.length,
      source: 'database_fallback'
    };
  } catch (e) {}

  return { loaded: false, count: 0, source: 'none' };
}

/**
 * Extract thematic areas from solution content
 */
function extractThematicAreas_(content) {
  if (!content || !content.solution_characteristics) return [];

  var chars = content.solution_characteristics;
  var areas = chars.thematic_areas || chars.thematicAreas || '';

  if (typeof areas === 'string') {
    return areas.split(',').map(function(a) { return a.trim(); }).filter(Boolean);
  }

  return Array.isArray(areas) ? areas : [];
}

/**
 * Format top N items from count object
 */
function formatTopN_(countObj, n) {
  return Object.keys(countObj)
    .map(function(key) {
      return { name: key, count: countObj[key] };
    })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, n);
}

// ============================================================================
// API FUNCTIONS (for frontend)
// ============================================================================

/**
 * Get Need Alignment Report for UI
 */
function getNeedAlignmentReport(options) {
  return JSON.parse(JSON.stringify(generateNeedAlignmentReport(options)));
}

/**
 * Get Stakeholder Coverage Report for UI
 */
function getStakeholderCoverageReport(options) {
  return JSON.parse(JSON.stringify(generateStakeholderCoverageReport(options)));
}

/**
 * Get Engagement Funnel Report for UI
 */
function getEngagementFunnelReport(options) {
  return JSON.parse(JSON.stringify(generateEngagementFunnelReport(options)));
}

/**
 * Get Department Reach Report for UI
 */
function getDepartmentReachReport(options) {
  return JSON.parse(JSON.stringify(generateDepartmentReachReport(options)));
}

/**
 * Get all advanced reports summary
 */
function getAdvancedReportsSummary() {
  return {
    reports: [
      {
        id: 'need-alignment',
        title: 'Need Alignment',
        audience: 'Implementation',
        description: 'Compare solution characteristics with stakeholder engagement'
      },
      {
        id: 'stakeholder-coverage',
        title: 'Stakeholder Coverage',
        audience: 'SEP',
        description: 'Department and agency engagement across solutions'
      },
      {
        id: 'engagement-funnel',
        title: 'Engagement Funnel',
        audience: 'SEP',
        description: 'Track stakeholder progression from survey to SME'
      },
      {
        id: 'department-reach',
        title: 'Department Reach',
        audience: 'Comms',
        description: 'Solution coverage across federal departments'
      }
    ]
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export Need Alignment report to a new Google Sheet
 * Comprehensive export including ALL characteristics for decision-making
 * @param {Object} options - Report options
 * @returns {Object} { url, fileName, sheetId }
 */
function exportNeedAlignmentToSheet(options) {
  options = options || {};

  try {
    var report = generateNeedAlignmentReport(options);

    // Create new spreadsheet
    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var fileName = 'NeedAlignment_GapAnalysis_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);

    // ========================================
    // SHEET 1: Solution Overview
    // ========================================
    var overviewSheet = newSS.getActiveSheet();
    overviewSheet.setName('Solution Overview');

    var overviewHeaders = [
      'Solution ID', 'Solution Name', 'Full Title', 'Cycle', 'Phase',
      'Needs Count', 'Unique Submitters', 'Avg % Met', 'Alignment Score',
      'Survey Years', 'Departments', 'Identified Gaps'
    ];
    overviewSheet.appendRow(overviewHeaders);
    styleHeaderRow_(overviewSheet, overviewHeaders.length);

    report.alignments.forEach(function(a) {
      var avgMetValue = formatAvgMetValue_(a.stakeholderNeeds);
      var surveyYears = Object.keys(a.stakeholderNeeds.bySurveyYear || {}).sort().join(', ');
      var departments = (a.stakeholderNeeds.byDepartment || []).map(function(d) {
        return d.name;
      }).slice(0, 5).join(', ');

      var row = [
        a.solution_id || '',
        a.solution || '',
        a.fullName || '',
        a.cycle,
        a.phase,
        a.stakeholderNeeds.total,
        a.stakeholderNeeds.uniqueSubmitters,
        avgMetValue,
        a.alignmentScore + '%',
        surveyYears,
        departments,
        (a.gaps || []).join('; ')
      ];
      overviewSheet.appendRow(row);
    });

    autoResizeColumns_(overviewSheet, overviewHeaders.length);

    // ========================================
    // SHEET 2: Comprehensive Gap Analysis
    // One row per solution per characteristic
    // ========================================
    var gapSheet = newSS.insertSheet('Gap Analysis - All Characteristics');

    // Characteristic mapping (same as frontend)
    var charMap = [
      { key: 'horizontal_resolution', label: 'Horizontal Resolution', solKey: 'horizontal_resolution' },
      { key: 'vertical_resolution', label: 'Vertical Resolution', solKey: null },
      { key: 'temporal_frequency', label: 'Temporal Frequency', solKey: 'temporal_frequency' },
      { key: 'data_latency', label: 'Data Latency', solKey: null },
      { key: 'geographic_coverage', label: 'Geographic Coverage', solKey: 'geographic_domain' },
      { key: 'spectral_bands', label: 'Spectral Bands', solKey: null },
      { key: 'measurement_uncertainty', label: 'Measurement Uncertainty', solKey: null },
      { key: 'required_processing_level', label: 'Required Processing Level', solKey: null },
      { key: 'preferred_format', label: 'Preferred Format', solKey: null },
      { key: 'preferred_access', label: 'Preferred Access', solKey: null },
      { key: 'critical_attributes_ranking', label: 'Critical Attributes Ranking', solKey: null }
    ];

    var gapHeaders = [
      'Solution ID', 'Solution Name', 'Cycle',
      'Characteristic', 'Solution Provides', 'Stakeholder Requests',
      'Request Counts', 'Has Gap?', 'Gap Notes'
    ];
    gapSheet.appendRow(gapHeaders);
    styleHeaderRow_(gapSheet, gapHeaders.length);

    report.alignments.forEach(function(a) {
      var characteristics = a.stakeholderNeeds.characteristics || {};

      charMap.forEach(function(char) {
        var solProvides = '';
        if (char.solKey && a.solutionProvides[char.solKey]) {
          solProvides = a.solutionProvides[char.solKey];
        }

        var charData = characteristics[char.key] || [];
        var stakeholderRequests = charData.map(function(c) {
          return c.name;
        }).join('; ');
        var requestCounts = charData.map(function(c) {
          return c.name + ' (' + c.count + ')';
        }).join('; ');

        // Determine if there's a gap
        var hasGap = '-';
        var gapNotes = '';
        if (charData.length > 0 && char.solKey) {
          if (!solProvides) {
            hasGap = 'YES';
            gapNotes = 'Solution does not specify this characteristic';
          } else {
            // Simple check - if solution provides something and stakeholders want something
            var topNeed = charData[0].name.toLowerCase();
            var solLower = solProvides.toLowerCase();
            if (solLower.indexOf(topNeed) !== -1 || topNeed.indexOf(solLower) !== -1) {
              hasGap = 'No';
            } else {
              hasGap = 'POTENTIAL';
              gapNotes = 'Needs review - solution: "' + solProvides + '" vs top need: "' + charData[0].name + '"';
            }
          }
        } else if (charData.length > 0 && !char.solKey) {
          hasGap = 'N/A';
          gapNotes = 'Characteristic not tracked in solution database';
        }

        var row = [
          a.solution_id || '',
          a.solution || '',
          a.cycle,
          char.label,
          solProvides || '-',
          stakeholderRequests || '-',
          requestCounts || '-',
          hasGap,
          gapNotes
        ];
        gapSheet.appendRow(row);
      });
    });

    autoResizeColumns_(gapSheet, gapHeaders.length);

    // ========================================
    // SHEET 3: Survey Year Breakdown
    // Shows engagement by year per solution
    // ========================================
    var yearSheet = newSS.insertSheet('Survey Year Breakdown');

    var yearHeaders = ['Solution ID', 'Solution Name', 'Cycle', '2016', '2018', '2020', '2022', '2024', 'Total'];
    yearSheet.appendRow(yearHeaders);
    styleHeaderRow_(yearSheet, yearHeaders.length);

    report.alignments.forEach(function(a) {
      var bySurveyYear = a.stakeholderNeeds.bySurveyYear || {};
      var row = [
        a.solution_id || '',
        a.solution || '',
        a.cycle,
        bySurveyYear['2016'] || 0,
        bySurveyYear['2018'] || 0,
        bySurveyYear['2020'] || 0,
        bySurveyYear['2022'] || 0,
        bySurveyYear['2024'] || 0,
        a.stakeholderNeeds.total
      ];
      yearSheet.appendRow(row);
    });

    autoResizeColumns_(yearSheet, yearHeaders.length);

    // ========================================
    // SHEET 4: Department Breakdown
    // Shows which departments need each solution
    // ========================================
    var deptSheet = newSS.insertSheet('Department Breakdown');

    var deptHeaders = ['Solution ID', 'Solution Name', 'Cycle', 'Department', 'Request Count'];
    deptSheet.appendRow(deptHeaders);
    styleHeaderRow_(deptSheet, deptHeaders.length);

    report.alignments.forEach(function(a) {
      var byDepartment = a.stakeholderNeeds.byDepartment || [];
      byDepartment.forEach(function(dept) {
        var row = [
          a.solution_id || '',
          a.solution || '',
          a.cycle,
          dept.name,
          dept.count
        ];
        deptSheet.appendRow(row);
      });
    });

    autoResizeColumns_(deptSheet, deptHeaders.length);

    // ========================================
    // SHEET 5: Summary Statistics
    // ========================================
    var summarySheet = newSS.insertSheet('Summary');
    summarySheet.appendRow(['Need Alignment Gap Analysis - Summary']);
    summarySheet.appendRow(['']);
    summarySheet.appendRow(['Generated', today.toISOString()]);
    summarySheet.appendRow(['Report Type', 'Comprehensive Gap Analysis']);
    summarySheet.appendRow(['']);
    summarySheet.appendRow(['OVERVIEW']);
    summarySheet.appendRow(['Total Solutions', report.count]);
    summarySheet.appendRow(['Total Survey Responses (Needs)', report.totalNeeds]);
    summarySheet.appendRow(['Solutions with Survey Data', report.summary.solutionsWithNeeds]);
    summarySheet.appendRow(['Solutions without Survey Data', report.summary.solutionsWithoutNeeds]);
    summarySheet.appendRow(['']);
    summarySheet.appendRow(['ALIGNMENT SCORES']);
    summarySheet.appendRow(['Average Alignment Score', report.summary.averageAlignmentScore + '%']);
    summarySheet.appendRow(['Total Identified Gaps', report.summary.totalGaps]);
    summarySheet.appendRow(['Solutions with Low Satisfaction (<50%)', report.summary.lowSatisfactionCount]);
    summarySheet.appendRow(['']);
    summarySheet.appendRow(['METHODOLOGY']);
    summarySheet.appendRow(['Data Source', 'MO-DB_Needs (stakeholder survey responses 2016-2024)']);
    summarySheet.appendRow(['Characteristics Tracked', '11 (horizontal/vertical resolution, temporal frequency, data latency, geographic coverage, spectral bands, measurement uncertainty, processing level, format, access, critical attributes)']);
    summarySheet.appendRow(['Gap Identification', 'Compares solution characteristics vs top stakeholder requests']);
    summarySheet.appendRow(['']);
    summarySheet.appendRow(['SHEETS IN THIS WORKBOOK']);
    summarySheet.appendRow(['1. Solution Overview', 'High-level summary per solution']);
    summarySheet.appendRow(['2. Gap Analysis - All Characteristics', 'Detailed gap analysis (1 row per solution per characteristic)']);
    summarySheet.appendRow(['3. Survey Year Breakdown', 'Response counts by survey year']);
    summarySheet.appendRow(['4. Department Breakdown', 'Which departments requested each solution']);
    summarySheet.appendRow(['5. Summary', 'This sheet - report metadata and methodology']);

    summarySheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
    summarySheet.getRange(6, 1).setFontWeight('bold');
    summarySheet.getRange(12, 1).setFontWeight('bold');
    summarySheet.getRange(17, 1).setFontWeight('bold');
    summarySheet.getRange(22, 1).setFontWeight('bold');
    autoResizeColumns_(summarySheet, 2);

    // Move Summary to first position
    newSS.setActiveSheet(summarySheet);
    newSS.moveActiveSheet(1);

    Logger.log('Need Alignment Gap Analysis exported: ' + newSS.getUrl());

    return {
      url: newSS.getUrl(),
      fileName: fileName,
      sheetId: newSS.getId(),
      rowCount: report.alignments.length,
      sheets: ['Summary', 'Solution Overview', 'Gap Analysis - All Characteristics', 'Survey Year Breakdown', 'Department Breakdown']
    };

  } catch (e) {
    Logger.log('Error exporting Need Alignment report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
}

/**
 * Helper: Style header row
 */
function styleHeaderRow_(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a5568');
  headerRange.setFontColor('#ffffff');
}

/**
 * Helper: Auto-resize columns
 */
function autoResizeColumns_(sheet, colCount) {
  for (var i = 1; i <= colCount; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Helper: Format avg % met value with reason if unavailable
 */
function formatAvgMetValue_(stakeholderNeeds) {
  if (stakeholderNeeds.avgDegreeNeedMet !== null) {
    return stakeholderNeeds.avgDegreeNeedMet + '%';
  } else if (stakeholderNeeds.avgDegreeNeedMetReason) {
    return 'N/A: ' + stakeholderNeeds.avgDegreeNeedMetReason;
  }
  return 'N/A';
}

/**
 * Export any report data to a new Google Sheet
 * Generic export for preview data
 * @param {Object} data - Report data with title and table data
 * @returns {Object} { url, fileName, sheetId }
 */
function exportReportToSheet(data) {
  try {
    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var title = (data.title || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
    var fileName = title + '_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);
    var sheet = newSS.getActiveSheet();
    sheet.setName(title.substring(0, 30));

    // If data has tableData (array of arrays), write it directly
    if (data.tableData && data.tableData.length > 0) {
      // Headers
      var headers = data.tableData[0];
      sheet.appendRow(headers);

      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a5568');
      headerRange.setFontColor('#ffffff');

      // Data rows
      for (var i = 1; i < data.tableData.length; i++) {
        sheet.appendRow(data.tableData[i]);
      }

      // Auto-resize
      for (var j = 1; j <= headers.length; j++) {
        sheet.autoResizeColumn(j);
      }
    }

    Logger.log('Report exported: ' + newSS.getUrl());

    return {
      url: newSS.getUrl(),
      fileName: fileName,
      sheetId: newSS.getId()
    };

  } catch (e) {
    Logger.log('Error exporting report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
}
