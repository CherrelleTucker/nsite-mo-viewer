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
      var configSheetId = getConfigValue('SOLUTIONS_SHEET_ID');
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
 * Primary matching: need.solution_id === solution.core_id (direct match)
 * Fallback matching: Parse solution name from parentheses or text patterns
 *
 * MO-DB_Solutions uses (Schema v2):
 *   - core_id: Primary identifier (e.g., "hls", "opera-dist")
 *
 * MO-DB_Needs uses (Schema v3 - rebuilt 2026-01-29):
 *   - solution_id: Foreign key to MO-DB_Solutions.core_id (e.g., "hls")
 *   - solution: Full survey name for display
 */
function matchSolutionToNeeds_(solution, allNeeds) {
  // Support both object and string input
  var solId, solName, altNames;
  if (typeof solution === 'object') {
    solId = (solution.core_id || '').toLowerCase().trim();
    solName = (solution.core_id || '').toLowerCase().trim();
    // Get alternate names from solution if available
    altNames = (solution.core_alternate_names || '').toLowerCase().split('|').map(function(n) { return n.trim(); }).filter(function(n) { return n; });
  } else {
    solId = (solution || '').toLowerCase().trim();
    solName = solId;
    altNames = [];
  }

  if (!solId && !solName) return [];

  return allNeeds.filter(function(need) {
    // PRIMARY: Direct solution_id match (preferred method - Schema v3)
    var needSolutionId = (need.solution_id || need.core_id || '').toLowerCase().trim();
    if (needSolutionId && solId && needSolutionId === solId) return true;

    // FALLBACK: Parse solution name if core_id not set
    var needSol = (need.solution || '').toLowerCase().trim();
    if (!needSol) return false;

    // Extract abbreviation from parentheses: "Something (HLS) Product" -> "hls"
    // Look for short uppercase abbreviations in parentheses (2-10 chars)
    var parenMatch = needSol.match(/\(([a-z0-9][-a-z0-9]{1,9})\)/i);
    var needAbbrev = parenMatch ? parenMatch[1].toLowerCase().trim() : null;

    // 1. EXACT match on parenthesized abbreviation
    // "(HLS)" matches core_id "hls" exactly
    if (needAbbrev && solId && needAbbrev === solId) return true;

    // 2. core_id ends with the abbreviation (handles "opera_dist" matching "(DIST)")
    if (needAbbrev && solId) {
      // Check if solId ends with _abbrev or -abbrev
      if (solId.endsWith('_' + needAbbrev) || solId.endsWith('-' + needAbbrev)) return true;
      // Check normalized versions (remove separators)
      var solIdNormalized = solId.replace(/[-_]/g, '');
      var abbrevNormalized = needAbbrev.replace(/[-_]/g, '');
      if (abbrevNormalized === solIdNormalized) return true;
      // Check if normalized solId ends with normalized abbrev
      if (solIdNormalized.endsWith(abbrevNormalized)) return true;
    }

    // 3. Check core_alternate_names from MO-DB_Solutions (explicit mappings)
    for (var i = 0; i < altNames.length; i++) {
      var alt = altNames[i];
      if (!alt) continue;
      // Exact match on alternate name
      if (needSol === alt) return true;
      // Abbreviation matches alternate name
      if (needAbbrev && needAbbrev === alt) return true;
      // Need's solution contains the alternate name (for longer alt names)
      if (alt.length >= 8 && needSol.indexOf(alt) !== -1) return true;
    }

    // 4. Exact match on full solution name
    if (solName && needSol === solName) return true;

    // 5. Full name match (solution name appears in need's solution)
    // Require exact word match or long enough to be specific
    if (solName && solName.length >= 10) {
      if (needSol.indexOf(solName) !== -1) return true;
    }

    // 6. core_id match in need's solution text (only for very specific IDs)
    // e.g., "global-et" (9 chars) appearing in the need's solution text
    if (solId && solId.length >= 8 && needSol.indexOf(solId) !== -1) return true;

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
 * @param {Array} options.solutionIds - Specific solution IDs to include
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
        return String(s.core_cycle) === String(options.cycle);
      });
    }

    // Filter by specific solution IDs (from picker)
    if (options.solutionIds && options.solutionIds.length > 0) {
      var idSet = {};
      options.solutionIds.forEach(function(id) {
        idSet[id.toLowerCase()] = true;
      });
      solutions = solutions.filter(function(s) {
        return idSet[(s.core_id || '').toLowerCase()];
      });
    } else if (options.defaultOnly) {
      // Only apply defaultOnly if no specific IDs provided
      solutions = solutions.filter(function(s) {
        return s.admin_default_in_dashboard === 'Y';
      });
    }

    Logger.log('Processing ' + solutions.length + ' solutions against ' + allNeeds.length + ' needs');

    // Build alignment data for each solution
    var alignments = solutions.map(function(sol) {
      // Use core_id as primary identifier
      var solId = sol.core_id || '';
      var solName = solId;

      // Get needs for this solution using core_id-based matching
      var solutionNeeds = matchSolutionToNeeds_(sol, allNeeds);

      // Debug: log matching results
      Logger.log('Solution "' + solId + '" (' + solName + ') matched ' + solutionNeeds.length + ' needs');
      if (solutionNeeds.length > 0) {
        var sampleSolutions = solutionNeeds.slice(0, 3).map(function(n) { return n.solution || 'no solution'; });
        Logger.log('  Sample need.solution values: ' + sampleSolutions.join(', '));
      }

      // Solution characteristics (what it delivers)
      var solutionProvides = {
        horizontal_resolution: sol.product_horiz_resolution || '',
        temporal_frequency: sol.product_temporal_freq || '',
        geographic_domain: sol.product_geo_domain || '',
        platform: sol.product_platform || '',
        thematic_areas: sol.comms_thematic_areas || ''
      };

      // Aggregate stakeholder needs
      var needsAnalysis = analyzeNeeds_(solutionNeeds);

      // Alignment decisions from database (manual review status)
      // Must be loaded BEFORE calculateNeedAlignment_ to exclude N/A characteristics
      var alignmentDecisions = {
        horiz_resolution: sol.alignment_horiz_resolution || '',
        temporal_freq: sol.alignment_temporal_freq || '',
        geo_domain: sol.alignment_geo_domain || '',
        latency: sol.alignment_latency || '',
        spectral_bands: sol.alignment_spectral_bands || '',
        vertical_resolution: sol.alignment_vertical_resolution || '',
        notes: sol.alignment_notes || '',
        last_reviewed: sol.alignment_last_reviewed || ''
      };

      // Calculate alignment score comparing needs vs solution
      // Pass alignmentDecisions to exclude N/A characteristics from score
      var alignmentResult = calculateNeedAlignment_(solutionProvides, needsAnalysis, solutionNeeds, alignmentDecisions);

      return {
        solution_id: solId,
        solution: solName,  // core_id
        officialName: sol.core_official_name || solId.toUpperCase(),  // Display name
        fullName: sol.core_official_name || '',  // Keep for backwards compat
        cycle: 'C' + (sol.core_cycle || '?'),
        phase: sol.admin_lifecycle_phase || '',

        // What the solution provides
        solutionProvides: solutionProvides,
        purpose: sol.earthdata_purpose || sol.earthdata_status_summary || '',

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
        gaps: alignmentResult.gaps,

        // Manual alignment decisions (from MO-DB_Solutions)
        alignmentDecisions: alignmentDecisions
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

  // Track ALL characteristics from survey (Schema v3 column names - 2026-01-29)
  var characteristics = {
    horizontal_resolution: {},
    vertical_resolution: {},
    temporal_frequency: {},
    data_latency_value: {},         // Was: data_latency
    geographic_coverage: {},
    spectral_bands_value: {},       // Was: spectral_bands
    uncertainty_type: {},           // Was: measurement_uncertainty
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
 * @param {Object} solutionProvides - What the solution delivers
 * @param {Object} needsAnalysis - Aggregated stakeholder needs
 * @param {Array} needs - Raw needs data
 * @param {Object} alignmentDecisions - Manual alignment decisions (optional)
 */
function calculateNeedAlignment_(solutionProvides, needsAnalysis, needs, alignmentDecisions) {
  alignmentDecisions = alignmentDecisions || {};

  // Check which characteristics are marked N/A (excluded from calculations)
  var resolutionNA = alignmentDecisions.horiz_resolution === 'N/A';
  var frequencyNA = alignmentDecisions.temporal_freq === 'N/A';
  var coverageNA = alignmentDecisions.geo_domain === 'N/A';

  // Adjust max points based on N/A exclusions
  var resMax = resolutionNA ? 0 : 20;
  var freqMax = frequencyNA ? 0 : 20;
  var covMax = coverageNA ? 0 : 20;

  var breakdown = {
    degreeNeedMet: { points: 0, max: 40, details: [] },
    resolutionMatch: { points: 0, max: resMax, details: [], excluded: resolutionNA },
    frequencyMatch: { points: 0, max: freqMax, details: [], excluded: frequencyNA },
    coverageMatch: { points: 0, max: covMax, details: [], excluded: coverageNA }
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

  // 2. Resolution match (max 20 pts) - skip if N/A
  if (resolutionNA) {
    breakdown.resolutionMatch.details.push('N/A - Excluded from alignment calculation');
  } else {
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
  }

  // 3. Frequency match (max 20 pts) - skip if N/A
  if (frequencyNA) {
    breakdown.frequencyMatch.details.push('N/A - Excluded from alignment calculation');
  } else {
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
  }

  // 4. Geographic coverage match (max 20 pts) - skip if N/A
  if (coverageNA) {
    breakdown.coverageMatch.details.push('N/A - Excluded from alignment calculation');
  } else {
    var solCov = (solutionProvides.geographic_domain || '').toLowerCase();
    if (solCov && needsAnalysis.coverageNeeds.length > 0) {
      var topCovNeed = needsAnalysis.coverageNeeds[0].name.toLowerCase();

      if (solCov.includes('global') ||
          solCov.includes(topCovNeed) ||
          topCovNeed.includes(solCov)) {
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
  }

  var totalScore = breakdown.degreeNeedMet.points +
                   breakdown.resolutionMatch.points +
                   breakdown.frequencyMatch.points +
                   breakdown.coverageMatch.points;

  // Calculate max possible points (excluding N/A characteristics)
  var maxPossible = breakdown.degreeNeedMet.max +
                    breakdown.resolutionMatch.max +
                    breakdown.frequencyMatch.max +
                    breakdown.coverageMatch.max;

  // Normalize score to percentage of applicable max
  // If all characteristics are N/A except degreeNeedMet (max=40), score of 40 = 100%
  var normalizedScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  return {
    score: Math.min(normalizedScore, 100),
    rawScore: totalScore,
    maxPossible: maxPossible,
    breakdown: breakdown,
    summary: buildNeedAlignmentSummary_(breakdown),
    gaps: gaps,
    excludedCount: (resolutionNA ? 1 : 0) + (frequencyNA ? 1 : 0) + (coverageNA ? 1 : 0)
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
// ALIGNMENT DECISIONS: Update Functions
// ============================================================================

/**
 * Update alignment decision for a solution characteristic
 * @param {string} solutionId - Solution core_id
 * @param {string} characteristic - Characteristic key (horiz_resolution, temporal_freq, etc.)
 * @param {string} decision - Decision value (Acceptable, Gap, N/A)
 * @param {string} notes - Optional notes
 * @returns {Object} Result with success status
 */
function updateAlignmentDecision(solutionId, characteristic, decision, notes) {
  try {
    var sheetId = getConfigValue('SOLUTIONS_SHEET_ID');
    if (!sheetId) {
      return { success: false, error: 'SOLUTIONS_SHEET_ID not configured' };
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Find column indices
    var coreIdCol = headers.indexOf('core_id');
    var alignmentCol = headers.indexOf('alignment_' + characteristic);
    var notesCol = headers.indexOf('alignment_notes');
    var reviewedCol = headers.indexOf('alignment_last_reviewed');

    if (coreIdCol === -1) {
      return { success: false, error: 'core_id column not found' };
    }
    if (alignmentCol === -1) {
      return { success: false, error: 'alignment_' + characteristic + ' column not found' };
    }

    // Find the solution row
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][coreIdCol]).toLowerCase().trim() === solutionId.toLowerCase().trim()) {
        rowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Solution not found: ' + solutionId };
    }

    // Update the alignment decision
    sheet.getRange(rowIndex, alignmentCol + 1).setValue(decision);

    // Update notes if provided
    if (notes && notesCol !== -1) {
      var existingNotes = sheet.getRange(rowIndex, notesCol + 1).getValue() || '';
      var newNotes = existingNotes ? existingNotes + '\n' + notes : notes;
      sheet.getRange(rowIndex, notesCol + 1).setValue(newNotes);
    }

    // Update last reviewed date
    if (reviewedCol !== -1) {
      var today = new Date().toISOString().split('T')[0];
      sheet.getRange(rowIndex, reviewedCol + 1).setValue(today);
    }

    // Clear cache
    clearSolutionsCache_();

    return {
      success: true,
      solution_id: solutionId,
      characteristic: characteristic,
      decision: decision,
      updated_at: new Date().toISOString()
    };

  } catch (e) {
    Logger.log('updateAlignmentDecision error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Bulk update alignment decisions for a solution
 * @param {string} solutionId - Solution core_id
 * @param {Object} decisions - Object with characteristic keys and decision values
 * @param {string} notes - Optional notes for all updates
 * @returns {Object} Result with success status
 */
function updateAlignmentDecisions(solutionId, decisions, notes) {
  var results = [];
  var allSuccess = true;

  for (var characteristic in decisions) {
    if (decisions.hasOwnProperty(characteristic)) {
      var result = updateAlignmentDecision(solutionId, characteristic, decisions[characteristic], null);
      results.push(result);
      if (!result.success) allSuccess = false;
    }
  }

  // Add notes separately if provided
  if (notes) {
    try {
      var sheetId = getConfigValue('SOLUTIONS_SHEET_ID');
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var coreIdCol = headers.indexOf('core_id');
      var notesCol = headers.indexOf('alignment_notes');

      if (notesCol !== -1) {
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][coreIdCol]).toLowerCase().trim() === solutionId.toLowerCase().trim()) {
            sheet.getRange(i + 1, notesCol + 1).setValue(notes);
            break;
          }
        }
      }
    } catch (e) {
      Logger.log('Error updating notes: ' + e.message);
    }
  }

  return {
    success: allSuccess,
    solution_id: solutionId,
    updates: results
  };
}

/**
 * Clear solutions cache (called after alignment updates)
 */
function clearSolutionsCache_() {
  var cache = CacheService.getScriptCache();
  cache.remove('_solutionsCache');
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
      solutionCoverage[s.core_id] = {
        solution: s.core_id,
        cycle: s.core_cycle,
        phase: s.admin_lifecycle_phase,
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
        return c.solution === sol.core_id;
      });

      var hasPrimarySME = solContacts.some(function(c) {
        return c.role === 'Primary SME';
      });

      if (!hasPrimarySME && solContacts.length > 0) {
        solutionsNeedingSMEs.push({
          solution: sol.core_id,
          cycle: sol.core_cycle,
          phase: sol.admin_lifecycle_phase,
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
      matrix[sol.core_id] = {
        solution: sol.core_id,
        fullName: sol.core_official_name || '',
        cycle: 'C' + (sol.core_cycle || '?'),
        phase: sol.admin_lifecycle_phase || '',
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
  // This uses fields already in the database (earthdata_purpose, comms_thematic_areas, etc.)
  try {
    var solutions = getAllSolutions();
    var contentMap = {};

    solutions.forEach(function(sol) {
      var key = sol.core_id;
      contentMap[key] = {
        name: sol.core_official_name || sol.core_id || '',
        purpose_mission: sol.earthdata_purpose || sol.earthdata_status_summary || '',
        societal_impact: sol.earthdata_societal_impact || '',
        solution_characteristics: {
          platform: sol.product_platform || '',
          temporal_frequency: sol.product_temporal_freq || '',
          horizontal_resolution: sol.product_horiz_resolution || '',
          geographic_domain: sol.product_geo_domain || '',
          thematic_areas: sol.comms_thematic_areas || ''
        }
      };

      // Also map by core_official_name if different
      if (sol.core_official_name && sol.core_official_name !== key) {
        contentMap[sol.core_official_name] = contentMap[key];
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
      return sol.earthdata_purpose || sol.comms_thematic_areas;
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
// DIAGNOSTIC FUNCTION
// ============================================================================

/**
 * Diagnose Need Alignment matching issues
 * Run this from Apps Script editor to see what's happening
 */
function diagnoseNeedAlignment() {
  var solutions = getAllSolutions();
  var allNeeds = getAllNeeds();

  Logger.log('=== NEED ALIGNMENT DIAGNOSTIC ===');
  Logger.log('Total solutions: ' + solutions.length);
  Logger.log('Total needs: ' + allNeeds.length);

  // Show unique solution values in needs with their parenthesized abbreviations
  var uniqueNeedSolutions = {};
  allNeeds.forEach(function(n) {
    var sol = n.solution || 'EMPTY';
    uniqueNeedSolutions[sol] = (uniqueNeedSolutions[sol] || 0) + 1;
  });
  Logger.log('\nUnique solution values in MO-DB_Needs (' + Object.keys(uniqueNeedSolutions).length + ' unique):');
  Object.keys(uniqueNeedSolutions).sort().slice(0, 15).forEach(function(sol) {
    var parenMatch = sol.match(/\(([^)]+)\)\s*$/);
    var abbrev = parenMatch ? parenMatch[1] : 'no abbrev';
    Logger.log('  "' + sol + '" [' + abbrev + ']: ' + uniqueNeedSolutions[sol] + ' needs');
  });

  // Test matching for solutions that should have needs (based on known MO-DB_Needs data)
  Logger.log('\n=== MATCHING RESULTS (all solutions with matches) ===');
  var matchSummary = [];
  solutions.forEach(function(sol) {
    var matched = matchSolutionToNeeds_(sol, allNeeds);
    matchSummary.push({
      name: sol.core_id,
      id: sol.core_id,
      altNames: sol.core_alternate_names || '',
      count: matched.length,
      matchedTo: matched.length > 0 ? matched[0].solution : null
    });
  });

  // Sort by match count descending to show successful matches first
  matchSummary.sort(function(a, b) { return b.count - a.count; });

  matchSummary.forEach(function(m) {
    if (m.count > 0) {
      Logger.log('✓ "' + m.name + '" (id: ' + m.id + ') → ' + m.count + ' needs from "' + m.matchedTo + '"');
    }
  });

  Logger.log('\n=== UNMATCHED SOLUTIONS ===');
  matchSummary.forEach(function(m) {
    if (m.count === 0) {
      Logger.log('✗ "' + m.name + '" (id: ' + m.id + ', alt: ' + (m.altNames || 'none') + ')');
    }
  });

  // Summary stats
  var totalMatched = matchSummary.filter(function(m) { return m.count > 0; }).length;
  var totalUnmatched = matchSummary.filter(function(m) { return m.count === 0; }).length;
  Logger.log('\n=== SUMMARY ===');
  Logger.log('Solutions with matching needs: ' + totalMatched);
  Logger.log('Solutions without matching needs: ' + totalUnmatched);
  Logger.log('Total needs matched: ' + matchSummary.reduce(function(sum, m) { return sum + m.count; }, 0) + ' / ' + allNeeds.length);

  return 'Check the Apps Script logs for diagnostic output';
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

    // Build all rows first, then write in batch
    var overviewData = [overviewHeaders];
    report.alignments.forEach(function(a) {
      var avgMetValue = formatAvgMetValue_(a.stakeholderNeeds);
      var surveyYears = Object.keys(a.stakeholderNeeds.bySurveyYear || {}).sort().join(', ');
      var departments = (a.stakeholderNeeds.byDepartment || []).map(function(d) {
        return d.name;
      }).slice(0, 5).join(', ');

      overviewData.push([
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
      ]);
    });

    // Batch write
    overviewSheet.getRange(1, 1, overviewData.length, overviewHeaders.length).setValues(overviewData);
    styleHeaderRow_(overviewSheet, overviewHeaders.length);
    autoResizeColumns_(overviewSheet, overviewHeaders.length);

    // ========================================
    // SHEET 2: Comprehensive Gap Analysis
    // One row per solution per characteristic
    // ========================================
    var gapSheet = newSS.insertSheet('Gap Analysis - All Characteristics');

    // Characteristic mapping (Schema v3 column names - 2026-01-29)
    var charMap = [
      { key: 'horizontal_resolution', label: 'Horizontal Resolution', solKey: 'horizontal_resolution' },
      { key: 'vertical_resolution', label: 'Vertical Resolution', solKey: null },
      { key: 'temporal_frequency', label: 'Temporal Frequency', solKey: 'temporal_frequency' },
      { key: 'data_latency_value', label: 'Data Latency', solKey: null },
      { key: 'geographic_coverage', label: 'Geographic Coverage', solKey: 'geographic_domain' },
      { key: 'spectral_bands_value', label: 'Spectral Bands', solKey: null },
      { key: 'uncertainty_type', label: 'Measurement Uncertainty', solKey: null },
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

    // Build all gap data first
    var gapData = [gapHeaders];
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

        gapData.push([
          a.solution_id || '',
          a.solution || '',
          a.cycle,
          char.label,
          solProvides || '-',
          stakeholderRequests || '-',
          requestCounts || '-',
          hasGap,
          gapNotes
        ]);
      });
    });

    // Batch write
    gapSheet.getRange(1, 1, gapData.length, gapHeaders.length).setValues(gapData);
    styleHeaderRow_(gapSheet, gapHeaders.length);
    autoResizeColumns_(gapSheet, gapHeaders.length);

    // ========================================
    // SHEET 3: Survey Year Breakdown
    // Shows engagement by year per solution
    // ========================================
    var yearSheet = newSS.insertSheet('Survey Year Breakdown');

    var yearHeaders = ['Solution ID', 'Solution Name', 'Cycle', '2016', '2018', '2020', '2022', '2024', 'Total'];
    var yearData = [yearHeaders];

    report.alignments.forEach(function(a) {
      var bySurveyYear = a.stakeholderNeeds.bySurveyYear || {};
      yearData.push([
        a.solution_id || '',
        a.solution || '',
        a.cycle,
        bySurveyYear['2016'] || 0,
        bySurveyYear['2018'] || 0,
        bySurveyYear['2020'] || 0,
        bySurveyYear['2022'] || 0,
        bySurveyYear['2024'] || 0,
        a.stakeholderNeeds.total
      ]);
    });

    // Batch write
    yearSheet.getRange(1, 1, yearData.length, yearHeaders.length).setValues(yearData);
    styleHeaderRow_(yearSheet, yearHeaders.length);
    autoResizeColumns_(yearSheet, yearHeaders.length);

    // ========================================
    // SHEET 4: Department Breakdown
    // Shows which departments need each solution
    // ========================================
    var deptSheet = newSS.insertSheet('Department Breakdown');

    var deptHeaders = ['Solution ID', 'Solution Name', 'Cycle', 'Department', 'Request Count'];
    var deptData = [deptHeaders];

    report.alignments.forEach(function(a) {
      var byDepartment = a.stakeholderNeeds.byDepartment || [];
      byDepartment.forEach(function(dept) {
        deptData.push([
          a.solution_id || '',
          a.solution || '',
          a.cycle,
          dept.name,
          dept.count
        ]);
      });
    });

    // Batch write
    if (deptData.length > 1) {
      deptSheet.getRange(1, 1, deptData.length, deptHeaders.length).setValues(deptData);
    } else {
      deptSheet.getRange(1, 1, 1, deptHeaders.length).setValues([deptHeaders]);
    }
    styleHeaderRow_(deptSheet, deptHeaders.length);
    autoResizeColumns_(deptSheet, deptHeaders.length);

    // ========================================
    // SHEET 5: Methodology & Data Sources
    // Comprehensive explanation for leadership verification
    // ========================================
    var methodSheet = newSS.insertSheet('Methodology & Data Sources');

    // Get source sheet URL for linking
    var needsSheetUrl = '';
    var solutionsSheetUrl = '';
    try {
      var needsSheetId = getConfigValue('NEEDS_SHEET_ID');
      if (needsSheetId) {
        needsSheetUrl = 'https://docs.google.com/spreadsheets/d/' + needsSheetId;
      }
      var configSheetId = getConfigValue('SOLUTIONS_SHEET_ID');
      if (configSheetId) {
        solutionsSheetUrl = 'https://docs.google.com/spreadsheets/d/' + configSheetId;
      }
    } catch (e) {
      Logger.log('Could not get sheet URLs: ' + e.message);
    }

    var methodData = [
      ['METHODOLOGY & DATA SOURCES', ''],
      ['', ''],
      ['This document explains how the Need Alignment Gap Analysis is calculated,', ''],
      ['including data sources, matching logic, and scoring methodology.', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DATA SOURCES', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. MO-DB_Needs (Stakeholder Survey Responses)', ''],
      ['   Total Records:', report.totalNeeds + ' survey responses'],
      ['   Survey Years:', '2016, 2018, 2020, 2022, 2024'],
      ['   Source:', needsSheetUrl || 'Contact MO team for access'],
      ['   Description:', 'Raw survey data collected from federal agency stakeholders'],
      ['', ''],
      ['   Key Fields Used:', ''],
      ['   - solution: Which NASA solution the stakeholder is evaluating', ''],
      ['   - submitter_name: Who submitted the survey response', ''],
      ['   - department: Federal department of the submitter', ''],
      ['   - survey_year: When the survey was submitted', ''],
      ['   - degree_need_met: Stakeholder rating of how well solution meets their need (0-100%)', ''],
      ['   - horizontal_resolution: Spatial resolution requirements', ''],
      ['   - temporal_frequency: How often data is needed', ''],
      ['   - geographic_coverage: Geographic area requirements', ''],
      ['   - And 8 additional characteristic fields', ''],
      ['', ''],
      ['2. MO-DB_Solutions (Solution Characteristics)', ''],
      ['   Total Records:', report.count + ' solutions'],
      ['   Source:', solutionsSheetUrl || 'Contact MO team for access'],
      ['   Description:', 'Solution specifications from NASA ESD'],
      ['', ''],
      ['   Key Fields Used (Schema v2):', ''],
      ['   - core_id: Unique identifier for matching', ''],
      ['   - core_official_name: Full solution name', ''],
      ['   - product_horiz_resolution: What the solution provides', ''],
      ['   - product_temporal_freq: Data delivery frequency', ''],
      ['   - product_geo_domain: Coverage area', ''],
      ['   - core_cycle, admin_lifecycle_phase: Project lifecycle stage', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['MATCHING LOGIC', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['How survey responses are matched to solutions:', ''],
      ['', ''],
      ['1. Parenthetical Match (Primary)', ''],
      ['   Survey "Harmonized Landsat and Sentinel-2 (HLS)" matches core_id "hls"', ''],
      ['   Looks for core_id in parentheses at end of survey solution field', ''],
      ['', ''],
      ['2. Exact Match', ''],
      ['   Survey solution field exactly equals core_id', ''],
      ['', ''],
      ['3. Substring Match (min 3 characters)', ''],
      ['   core_id appears within the survey solution field', ''],
      ['   Example: "HLS" found in "HLS Data Products"', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['ALIGNMENT SCORE CALCULATION (0-100 points)', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['The alignment score measures how well a solution meets stakeholder needs.', ''],
      ['It consists of four components:', ''],
      ['', ''],
      ['1. DEGREE NEED MET (0-40 points)', ''],
      ['   Source: Survey field "degree_need_met"', ''],
      ['   Calculation: Average of all stakeholder ratings × 0.4', ''],
      ['   Example: If stakeholders report 75% satisfaction → 30 points', ''],
      ['   This is the PRIMARY indicator as it reflects direct stakeholder feedback', ''],
      ['', ''],
      ['2. RESOLUTION MATCH (0-20 points)', ''],
      ['   Compares: Solution horizontal_resolution vs survey requests', ''],
      ['   Full match (20 pts): Solution meets or exceeds top requested resolution', ''],
      ['   Partial match (10 pts): Solution is within one tier of requested', ''],
      ['   No match (0 pts): Significant gap between solution and need', ''],
      ['   Resolution hierarchy: <1m > 1-5m > 10-30m > 100-250m > >1km', ''],
      ['', ''],
      ['3. FREQUENCY MATCH (0-20 points)', ''],
      ['   Compares: Solution temporal_frequency vs survey requests', ''],
      ['   Full match (20 pts): Solution meets or exceeds requested frequency', ''],
      ['   Partial match (5 pts): Some alignment but gaps exist', ''],
      ['   Frequency hierarchy: hourly > daily > weekly > monthly > yearly', ''],
      ['', ''],
      ['4. COVERAGE MATCH (0-20 points)', ''],
      ['   Compares: Solution geographic_domain vs survey requests', ''],
      ['   Full match (20 pts): Solution covers requested area (or is global)', ''],
      ['   Partial match (10 pts): Some overlap in coverage', ''],
      ['', ''],
      ['TOTAL SCORE = Sum of all four components (max 100)', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['CONFIDENCE WEIGHTING', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Scores are weighted by survey response count to indicate reliability:', ''],
      ['', ''],
      ['Formula: Confidence = 100 × (1 - e^(-responses/10))', ''],
      ['', ''],
      ['Response Count → Confidence:', ''],
      ['  1 response  →  10% confidence', ''],
      ['  5 responses →  39% confidence', ''],
      ['  10 responses → 63% confidence', ''],
      ['  20 responses → 86% confidence', ''],
      ['  30+ responses → 95% confidence', ''],
      ['', ''],
      ['Weighted Score = Alignment Score × Confidence', ''],
      ['This prioritizes solutions with more survey data backing their scores.', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['GAP IDENTIFICATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Gaps are identified when:', ''],
      ['', ''],
      ['1. Low Satisfaction: Stakeholders report <50% degree_need_met', ''],
      ['2. Resolution Gap: Stakeholders request finer resolution than solution provides', ''],
      ['3. Frequency Gap: Stakeholders need more frequent data than solution delivers', ''],
      ['4. Coverage Gap: Stakeholders need geographic areas solution doesn\'t cover', ''],
      ['5. Missing Spec: Stakeholders have requirements but solution spec is undefined', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SHEETS IN THIS WORKBOOK', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. Summary - Report overview and key statistics', ''],
      ['2. Solution Overview - One row per solution with alignment scores', ''],
      ['3. Gap Analysis - Detailed comparison (1 row per solution per characteristic)', ''],
      ['4. Survey Year Breakdown - Response counts by survey year', ''],
      ['5. Department Breakdown - Which departments requested each solution', ''],
      ['6. Methodology & Data Sources - This sheet', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['VERIFICATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['To verify any number in this report:', ''],
      ['', ''],
      ['1. Open the source data (links above)', ''],
      ['2. Filter MO-DB_Needs by solution name', ''],
      ['3. Compare survey responses to the aggregated data in this report', ''],
      ['', ''],
      ['For questions about methodology, contact the MO team.', '']
    ];

    methodSheet.getRange(1, 1, methodData.length, 2).setValues(methodData);

    // Style the headers
    methodSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
    var headerRows = [6, 7, 8, 40, 41, 42, 55, 56, 57, 90, 91, 92, 105, 106, 107, 118, 119, 120, 131, 132, 133];
    headerRows.forEach(function(row) {
      if (row <= methodData.length) {
        methodSheet.getRange(row, 1).setFontWeight('bold');
      }
    });

    // Make URLs clickable
    if (needsSheetUrl) {
      methodSheet.getRange(13, 2).setFormula('=HYPERLINK("' + needsSheetUrl + '", "Click to open MO-DB_Needs")');
    }
    if (solutionsSheetUrl) {
      methodSheet.getRange(28, 2).setFormula('=HYPERLINK("' + solutionsSheetUrl + '", "Click to open MO-DB_Solutions")');
    }

    methodSheet.setColumnWidth(1, 400);
    methodSheet.setColumnWidth(2, 400);

    // ========================================
    // SHEET 6: Summary Statistics
    // ========================================
    var summarySheet = newSS.insertSheet('Summary');

    var summaryData = [
      ['Need Alignment Gap Analysis', ''],
      ['', ''],
      ['Generated', today.toISOString()],
      ['Report Type', 'Comprehensive Gap Analysis'],
      ['', ''],
      ['OVERVIEW', ''],
      ['Total Solutions Analyzed', report.count],
      ['Total Survey Responses', report.totalNeeds],
      ['Solutions with Survey Data', report.summary.solutionsWithNeeds],
      ['Solutions without Survey Data', report.summary.solutionsWithoutNeeds],
      ['', ''],
      ['ALIGNMENT SCORES', ''],
      ['Average Alignment Score', report.summary.averageAlignmentScore + '%'],
      ['Total Identified Gaps', report.summary.totalGaps],
      ['Solutions with Low Satisfaction (<50%)', report.summary.lowSatisfactionCount],
      ['', ''],
      ['See "Methodology & Data Sources" tab for full explanation of calculations.', '']
    ];

    summarySheet.getRange(1, 1, summaryData.length, 2).setValues(summaryData);
    summarySheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
    summarySheet.getRange(6, 1).setFontWeight('bold');
    summarySheet.getRange(12, 1).setFontWeight('bold');
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
      sheets: ['Summary', 'Solution Overview', 'Gap Analysis - All Characteristics', 'Survey Year Breakdown', 'Department Breakdown', 'Methodology & Data Sources']
    };

  } catch (e) {
    Logger.log('Error exporting Need Alignment report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
}

// Note: styleHeaderRow_ and autoResizeColumns_ are now in export-helpers.gs

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

// ============================================================================
// STAKEHOLDER COVERAGE EXPORT
// ============================================================================

/**
 * Export Stakeholder Coverage report to a new Google Sheet
 * @param {Object} options - Report options
 * @returns {Object} { url, fileName, sheetId }
 */
function exportStakeholderCoverageToSheet(options) {
  options = options || {};

  try {
    var report = generateStakeholderCoverageReport(options);

    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var fileName = 'StakeholderCoverage_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);

    // Get source URLs
    var contactsSheetUrl = '';
    var solutionsSheetUrl = '';
    try {
      var configSheetId = getConfigValue('SOLUTIONS_SHEET_ID');
      if (configSheetId) {
        solutionsSheetUrl = 'https://docs.google.com/spreadsheets/d/' + configSheetId;
        contactsSheetUrl = solutionsSheetUrl; // Contacts in same spreadsheet
      }
    } catch (e) {}

    // ========================================
    // SHEET 1: By Department
    // ========================================
    var deptSheet = newSS.getActiveSheet();
    deptSheet.setName('By Department');

    var deptHeaders = ['Department', 'Contact Count', 'Solution Count', 'Solutions (top 10)', 'Survey Years'];
    var deptData = [deptHeaders];

    report.byDepartment.forEach(function(d) {
      deptData.push([
        d.department,
        d.contactCount,
        d.solutionCount,
        d.solutions.join(', '),
        d.surveyYears.join(', ')
      ]);
    });

    deptSheet.getRange(1, 1, deptData.length, deptHeaders.length).setValues(deptData);
    styleHeaderRow_(deptSheet, deptHeaders.length);
    autoResizeColumns_(deptSheet, deptHeaders.length);

    // ========================================
    // SHEET 2: By Agency
    // ========================================
    var agencySheet = newSS.insertSheet('By Agency');

    var agencyHeaders = ['Agency', 'Department', 'Contact Count', 'Solution Count'];
    var agencyData = [agencyHeaders];

    report.byAgency.forEach(function(a) {
      agencyData.push([
        a.agency,
        a.department,
        a.contactCount,
        a.solutionCount
      ]);
    });

    agencySheet.getRange(1, 1, agencyData.length, agencyHeaders.length).setValues(agencyData);
    styleHeaderRow_(agencySheet, agencyHeaders.length);
    autoResizeColumns_(agencySheet, agencyHeaders.length);

    // ========================================
    // SHEET 3: Solution Coverage
    // ========================================
    var covSheet = newSS.insertSheet('Solution Coverage');

    var covHeaders = ['Solution', 'Cycle', 'Phase', 'Department Count', 'Contact Count', 'Departments'];
    var covData = [covHeaders];

    report.solutionCoverage.forEach(function(s) {
      covData.push([
        s.solution,
        'C' + (s.cycle || '?'),
        s.phase || '',
        s.departments.length,
        s.contactCount,
        s.departments.join(', ')
      ]);
    });

    covSheet.getRange(1, 1, covData.length, covHeaders.length).setValues(covData);
    styleHeaderRow_(covSheet, covHeaders.length);
    autoResizeColumns_(covSheet, covHeaders.length);

    // ========================================
    // SHEET 4: Coverage Gaps
    // ========================================
    var gapsSheet = newSS.insertSheet('Coverage Gaps');

    var gapsHeaders = ['Solution', 'Cycle', 'Phase', 'Issue'];
    var gapsData = [gapsHeaders];

    report.coverageGaps.forEach(function(g) {
      gapsData.push([
        g.solution,
        'C' + (g.cycle || '?'),
        g.phase || '',
        'No stakeholder contacts'
      ]);
    });

    if (gapsData.length === 1) {
      gapsData.push(['No coverage gaps found', '', '', '']);
    }

    gapsSheet.getRange(1, 1, gapsData.length, gapsHeaders.length).setValues(gapsData);
    styleHeaderRow_(gapsSheet, gapsHeaders.length);
    autoResizeColumns_(gapsSheet, gapsHeaders.length);

    // ========================================
    // SHEET 5: Methodology & Data Sources
    // ========================================
    var methodSheet = newSS.insertSheet('Methodology & Data Sources');

    var methodData = [
      ['METHODOLOGY & DATA SOURCES', ''],
      ['', ''],
      ['This document explains how the Stakeholder Coverage report is generated.', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DATA SOURCES', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. MO-DB_Contacts', ''],
      ['   Description:', 'Stakeholder contact records from surveys and engagement'],
      ['   Source:', contactsSheetUrl || 'Contact MO team for access'],
      ['', ''],
      ['   Key Fields Used:', ''],
      ['   - email: Unique contact identifier', ''],
      ['   - department: Federal department', ''],
      ['   - agency: Specific agency within department', ''],
      ['   - solution: Solution they are associated with', ''],
      ['   - role: Survey Submitter, Secondary SME, Primary SME', ''],
      ['   - survey_year: Year of survey participation', ''],
      ['', ''],
      ['2. MO-DB_Solutions', ''],
      ['   Description:', 'Master list of solutions'],
      ['   Source:', solutionsSheetUrl || 'Contact MO team for access'],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['REPORT CALCULATIONS', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['By Department:', ''],
      ['   Contact Count: Unique email addresses per department', ''],
      ['   Solution Count: Unique solutions associated with department contacts', ''],
      ['   Survey Years: Years when department contacts submitted surveys', ''],
      ['', ''],
      ['By Agency:', ''],
      ['   Aggregated contact counts within each agency', ''],
      ['', ''],
      ['Solution Coverage:', ''],
      ['   Department Count: How many departments have contacts for this solution', ''],
      ['   Contact Count: Total stakeholders associated with solution', ''],
      ['', ''],
      ['Coverage Gaps:', ''],
      ['   Solutions with zero contacts in MO-DB_Contacts', ''],
      ['   These may need stakeholder engagement outreach', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SUMMARY STATISTICS', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Total Departments:', report.summary.totalDepartments],
      ['Total Agencies:', report.summary.totalAgencies],
      ['Total Solutions:', report.summary.totalSolutions],
      ['Solutions with Coverage Gaps:', report.summary.solutionsWithGaps],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SHEETS IN THIS WORKBOOK', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. By Department - Contacts and solutions per department', ''],
      ['2. By Agency - Contact counts per agency', ''],
      ['3. Solution Coverage - Department reach per solution', ''],
      ['4. Coverage Gaps - Solutions needing stakeholder engagement', ''],
      ['5. Methodology & Data Sources - This sheet', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['VERIFICATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['To verify any data in this report:', ''],
      ['', ''],
      ['1. Open MO-DB_Contacts (link above)', ''],
      ['2. Filter by department or solution', ''],
      ['3. Count unique emails to verify contact counts', ''],
      ['', ''],
      ['For questions, contact the MO team.', '']
    ];

    methodSheet.getRange(1, 1, methodData.length, 2).setValues(methodData);
    methodSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);

    if (contactsSheetUrl) {
      methodSheet.getRange(11, 2).setFormula('=HYPERLINK("' + contactsSheetUrl + '", "Click to open MO-DB_Contacts")');
    }
    if (solutionsSheetUrl) {
      methodSheet.getRange(23, 2).setFormula('=HYPERLINK("' + solutionsSheetUrl + '", "Click to open MO-DB_Solutions")');
    }

    methodSheet.setColumnWidth(1, 400);
    methodSheet.setColumnWidth(2, 400);

    newSS.setActiveSheet(deptSheet);
    newSS.moveActiveSheet(1);

    return {
      url: newSS.getUrl(),
      fileName: fileName,
      sheetId: newSS.getId(),
      sheets: ['By Department', 'By Agency', 'Solution Coverage', 'Coverage Gaps', 'Methodology & Data Sources']
    };

  } catch (e) {
    Logger.log('Error exporting Stakeholder Coverage report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
}

// ============================================================================
// ENGAGEMENT FUNNEL EXPORT
// ============================================================================

/**
 * Export Engagement Funnel report to a new Google Sheet
 * @param {Object} options - Report options
 * @returns {Object} { url, fileName, sheetId }
 */
function exportEngagementFunnelToSheet(options) {
  options = options || {};

  try {
    var report = generateEngagementFunnelReport(options);

    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var fileName = 'EngagementFunnel_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);

    var contactsSheetUrl = '';
    try {
      var configSheetId = getConfigValue('SOLUTIONS_SHEET_ID');
      if (configSheetId) {
        contactsSheetUrl = 'https://docs.google.com/spreadsheets/d/' + configSheetId;
      }
    } catch (e) {}

    // ========================================
    // SHEET 1: Funnel Summary
    // ========================================
    var funnelSheet = newSS.getActiveSheet();
    funnelSheet.setName('Funnel Summary');

    var funnelHeaders = ['Stage', 'Count', 'Percentage'];
    var funnelData = [funnelHeaders];

    report.funnel.stages.forEach(function(s) {
      funnelData.push([s.stage, s.count, s.percent + '%']);
    });

    funnelData.push(['', '', '']);
    funnelData.push(['DETAILED BREAKDOWN', '', '']);
    funnelData.push(['Survey Only (no SME role)', report.funnel.details.surveyOnly, '']);
    funnelData.push(['Secondary SME', report.funnel.details.secondarySME, '']);
    funnelData.push(['Primary SME', report.funnel.details.primarySME, '']);
    funnelData.push(['Multi-Role (engaged multiple ways)', report.funnel.details.multiRole, '']);

    funnelSheet.getRange(1, 1, funnelData.length, 3).setValues(funnelData);
    styleHeaderRow_(funnelSheet, 3);
    funnelSheet.getRange(5, 1).setFontWeight('bold');
    autoResizeColumns_(funnelSheet, 3);

    // ========================================
    // SHEET 2: By Year
    // ========================================
    var yearSheet = newSS.insertSheet('By Year');

    var yearHeaders = ['Year', 'Survey Submitters', 'SMEs', 'Primary SMEs'];
    var yearData = [yearHeaders];

    report.byYear.forEach(function(y) {
      yearData.push([y.year, y.data.submitters, y.data.smes, y.data.primary]);
    });

    yearSheet.getRange(1, 1, yearData.length, yearHeaders.length).setValues(yearData);
    styleHeaderRow_(yearSheet, yearHeaders.length);
    autoResizeColumns_(yearSheet, yearHeaders.length);

    // ========================================
    // SHEET 3: Conversion Opportunities
    // ========================================
    var oppSheet = newSS.insertSheet('Conversion Opportunities');

    var oppHeaders = ['Solution', 'Cycle', 'Phase', 'Survey Submitters', 'Issue'];
    var oppData = [oppHeaders];

    report.conversionOpportunities.forEach(function(o) {
      oppData.push([
        o.solution,
        'C' + (o.cycle || '?'),
        o.phase || '',
        o.submitterCount,
        'Has submitters but no Primary SME'
      ]);
    });

    if (oppData.length === 1) {
      oppData.push(['All solutions have Primary SMEs', '', '', '', '']);
    }

    oppSheet.getRange(1, 1, oppData.length, oppHeaders.length).setValues(oppData);
    styleHeaderRow_(oppSheet, oppHeaders.length);
    autoResizeColumns_(oppSheet, oppHeaders.length);

    // ========================================
    // SHEET 4: Top Engaged Stakeholders
    // ========================================
    var topSheet = newSS.insertSheet('Top Engaged');

    var topHeaders = ['Name', 'Department', 'Roles', 'Solutions Count'];
    var topData = [topHeaders];

    report.topEngaged.forEach(function(t) {
      topData.push([
        t.name,
        t.department || '',
        t.roles.join(', '),
        t.solutions
      ]);
    });

    if (topData.length === 1) {
      topData.push(['No multi-role stakeholders found', '', '', '']);
    }

    topSheet.getRange(1, 1, topData.length, topHeaders.length).setValues(topData);
    styleHeaderRow_(topSheet, topHeaders.length);
    autoResizeColumns_(topSheet, topHeaders.length);

    // ========================================
    // SHEET 5: Methodology & Data Sources
    // ========================================
    var methodSheet = newSS.insertSheet('Methodology & Data Sources');

    var methodData = [
      ['METHODOLOGY & DATA SOURCES', ''],
      ['', ''],
      ['This document explains how the Engagement Funnel report is generated.', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DATA SOURCE', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['MO-DB_Contacts', ''],
      ['   Description:', 'Stakeholder contact records with role assignments'],
      ['   Source:', contactsSheetUrl || 'Contact MO team for access'],
      ['', ''],
      ['   Key Fields Used:', ''],
      ['   - email: Unique stakeholder identifier', ''],
      ['   - role: Survey Submitter, Secondary SME, Primary SME', ''],
      ['   - solution: Associated solution', ''],
      ['   - survey_year: Year of engagement', ''],
      ['   - department, agency: Organization info', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['ENGAGEMENT FUNNEL STAGES', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['The funnel tracks stakeholder progression:', ''],
      ['', ''],
      ['1. Survey Submitters (Entry Point)', ''],
      ['   - Stakeholders who completed a needs survey', ''],
      ['   - First point of engagement with NASA ESD', ''],
      ['', ''],
      ['2. SME Engagement (Mid-Funnel)', ''],
      ['   - Stakeholders who became Subject Matter Experts', ''],
      ['   - Either Secondary SME or Primary SME role', ''],
      ['   - Indicates deeper engagement with solution', ''],
      ['', ''],
      ['3. Primary SME (Conversion)', ''],
      ['   - Highest engagement level', ''],
      ['   - Key stakeholders for solution development', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['CALCULATIONS', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Funnel Percentages:', ''],
      ['   Survey Submitters = 100% (baseline)', ''],
      ['   SME Engagement = (SMEs / Total Unique Stakeholders) × 100', ''],
      ['   Primary SME = (Primary SMEs / Total Unique Stakeholders) × 100', ''],
      ['', ''],
      ['Conversion Opportunities:', ''],
      ['   Solutions with survey submitters but no Primary SME', ''],
      ['   These represent potential for deeper engagement', ''],
      ['', ''],
      ['Multi-Role Stakeholders:', ''],
      ['   Contacts who hold multiple roles (e.g., Submitter + Primary SME)', ''],
      ['   Indicates high engagement and potential champions', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SHEETS IN THIS WORKBOOK', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. Funnel Summary - Stage counts and percentages', ''],
      ['2. By Year - Engagement trends over time', ''],
      ['3. Conversion Opportunities - Solutions needing Primary SMEs', ''],
      ['4. Top Engaged - Multi-role stakeholder champions', ''],
      ['5. Methodology & Data Sources - This sheet', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['VERIFICATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['To verify any data in this report:', ''],
      ['', ''],
      ['1. Open MO-DB_Contacts (link above)', ''],
      ['2. Filter by role column (Survey Submitter, Secondary SME, Primary SME)', ''],
      ['3. Count unique emails to verify stage counts', ''],
      ['', ''],
      ['For questions, contact the MO team.', '']
    ];

    methodSheet.getRange(1, 1, methodData.length, 2).setValues(methodData);
    methodSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);

    if (contactsSheetUrl) {
      methodSheet.getRange(11, 2).setFormula('=HYPERLINK("' + contactsSheetUrl + '", "Click to open MO-DB_Contacts")');
    }

    methodSheet.setColumnWidth(1, 400);
    methodSheet.setColumnWidth(2, 400);

    newSS.setActiveSheet(funnelSheet);
    newSS.moveActiveSheet(1);

    return {
      url: newSS.getUrl(),
      fileName: fileName,
      sheetId: newSS.getId(),
      sheets: ['Funnel Summary', 'By Year', 'Conversion Opportunities', 'Top Engaged', 'Methodology & Data Sources']
    };

  } catch (e) {
    Logger.log('Error exporting Engagement Funnel report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
}

// ============================================================================
// DEPARTMENT REACH EXPORT
// ============================================================================

/**
 * Export Department Reach report to a new Google Sheet
 * @param {Object} options - Report options
 * @returns {Object} { url, fileName, sheetId }
 */
function exportDepartmentReachToSheet(options) {
  options = options || {};

  try {
    var report = generateDepartmentReachReport(options);

    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var fileName = 'DepartmentReach_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);

    var contactsSheetUrl = '';
    var solutionsSheetUrl = '';
    try {
      var configSheetId = getConfigValue('SOLUTIONS_SHEET_ID');
      if (configSheetId) {
        solutionsSheetUrl = 'https://docs.google.com/spreadsheets/d/' + configSheetId;
        contactsSheetUrl = solutionsSheetUrl;
      }
    } catch (e) {}

    // ========================================
    // SHEET 1: By Solution
    // ========================================
    var solSheet = newSS.getActiveSheet();
    solSheet.setName('By Solution');

    var solHeaders = ['Solution', 'Cycle', 'Phase', 'Dept Count', 'Agency Count', 'Contact Count', 'Top Departments'];
    var solData = [solHeaders];

    report.bySolution.forEach(function(s) {
      var topDepts = s.departments.map(function(d) { return d.department; }).join(', ');
      solData.push([
        s.solution,
        s.cycle,
        s.phase,
        s.departmentCount,
        s.agencyCount,
        s.totalContacts,
        topDepts
      ]);
    });

    solSheet.getRange(1, 1, solData.length, solHeaders.length).setValues(solData);
    styleHeaderRow_(solSheet, solHeaders.length);
    autoResizeColumns_(solSheet, solHeaders.length);

    // ========================================
    // SHEET 2: By Department
    // ========================================
    var deptSheet = newSS.insertSheet('By Department');

    var deptHeaders = ['Department', 'Solution Count', 'Contact Count', 'Solutions'];
    var deptData = [deptHeaders];

    report.byDepartment.forEach(function(d) {
      deptData.push([
        d.department,
        d.solutionCount,
        d.contactCount,
        d.solutions.slice(0, 10).join(', ')
      ]);
    });

    deptSheet.getRange(1, 1, deptData.length, deptHeaders.length).setValues(deptData);
    styleHeaderRow_(deptSheet, deptHeaders.length);
    autoResizeColumns_(deptSheet, deptHeaders.length);

    // ========================================
    // SHEET 3: Broadest Reach
    // ========================================
    var broadSheet = newSS.insertSheet('Broadest Reach');

    var broadHeaders = ['Solution', 'Cycle', 'Phase', 'Department Count', 'Agency Count'];
    var broadData = [broadHeaders];

    report.broadestReach.forEach(function(s) {
      broadData.push([s.solution, s.cycle, s.phase, s.departmentCount, s.agencyCount]);
    });

    broadSheet.getRange(1, 1, broadData.length, broadHeaders.length).setValues(broadData);
    styleHeaderRow_(broadSheet, broadHeaders.length);
    autoResizeColumns_(broadSheet, broadHeaders.length);

    // ========================================
    // SHEET 4: Narrowest Reach
    // ========================================
    var narrowSheet = newSS.insertSheet('Narrowest Reach');

    var narrowHeaders = ['Solution', 'Cycle', 'Phase', 'Department Count', 'Contact Count'];
    var narrowData = [narrowHeaders];

    report.narrowestReach.forEach(function(s) {
      narrowData.push([s.solution, s.cycle, s.phase, s.departmentCount, s.totalContacts]);
    });

    narrowSheet.getRange(1, 1, narrowData.length, narrowHeaders.length).setValues(narrowData);
    styleHeaderRow_(narrowSheet, narrowHeaders.length);
    autoResizeColumns_(narrowSheet, narrowHeaders.length);

    // ========================================
    // SHEET 5: Methodology & Data Sources
    // ========================================
    var methodSheet = newSS.insertSheet('Methodology & Data Sources');

    var methodData = [
      ['METHODOLOGY & DATA SOURCES', ''],
      ['', ''],
      ['This document explains how the Department Reach report is generated.', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DATA SOURCES', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. MO-DB_Contacts', ''],
      ['   Description:', 'Stakeholder contacts with department/agency info'],
      ['   Source:', contactsSheetUrl || 'Contact MO team for access'],
      ['', ''],
      ['   Key Fields Used:', ''],
      ['   - solution: Which solution the contact is associated with', ''],
      ['   - department: Federal department', ''],
      ['   - agency: Specific agency', ''],
      ['   - email: Unique contact identifier', ''],
      ['', ''],
      ['2. MO-DB_Solutions', ''],
      ['   Description:', 'Master solution list'],
      ['   Source:', solutionsSheetUrl || 'Contact MO team for access'],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['REPORT PURPOSE', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['This report shows which federal departments are engaged with each solution.', ''],
      ['Useful for:', ''],
      ['   - Communications planning (targeting messaging)', ''],
      ['   - Identifying cross-department collaboration opportunities', ''],
      ['   - Finding solutions with narrow vs broad reach', ''],
      ['   - Stakeholder engagement strategy', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['CALCULATIONS', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Department Count:', ''],
      ['   Number of unique departments with contacts for that solution', ''],
      ['', ''],
      ['Agency Count:', ''],
      ['   Number of unique agencies with contacts for that solution', ''],
      ['', ''],
      ['Contact Count:', ''],
      ['   Total stakeholder contacts associated with solution', ''],
      ['', ''],
      ['Broadest Reach:', ''],
      ['   Top 10 solutions by department count', ''],
      ['   These solutions have the widest federal engagement', ''],
      ['', ''],
      ['Narrowest Reach:', ''],
      ['   Bottom 10 solutions (with at least 1 contact) by department count', ''],
      ['   May indicate need for broader outreach', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SUMMARY STATISTICS', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Total Solutions:', report.summary.totalSolutions],
      ['Solutions with Stakeholder Reach:', report.summary.solutionsWithReach],
      ['Total Departments Engaged:', report.summary.totalDepartments],
      ['Avg Departments per Solution:', report.summary.averageDeptPerSolution],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SHEETS IN THIS WORKBOOK', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. By Solution - Department reach for each solution', ''],
      ['2. By Department - Solutions per department', ''],
      ['3. Broadest Reach - Top 10 solutions by department count', ''],
      ['4. Narrowest Reach - Solutions with limited department engagement', ''],
      ['5. Methodology & Data Sources - This sheet', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['VERIFICATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['To verify any data in this report:', ''],
      ['', ''],
      ['1. Open MO-DB_Contacts (link above)', ''],
      ['2. Filter by solution name', ''],
      ['3. Count unique departments in filtered results', ''],
      ['', ''],
      ['For questions, contact the MO team.', '']
    ];

    methodSheet.getRange(1, 1, methodData.length, 2).setValues(methodData);
    methodSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);

    if (contactsSheetUrl) {
      methodSheet.getRange(11, 2).setFormula('=HYPERLINK("' + contactsSheetUrl + '", "Click to open MO-DB_Contacts")');
    }
    if (solutionsSheetUrl) {
      methodSheet.getRange(22, 2).setFormula('=HYPERLINK("' + solutionsSheetUrl + '", "Click to open MO-DB_Solutions")');
    }

    methodSheet.setColumnWidth(1, 400);
    methodSheet.setColumnWidth(2, 400);

    newSS.setActiveSheet(solSheet);
    newSS.moveActiveSheet(1);

    return {
      url: newSS.getUrl(),
      fileName: fileName,
      sheetId: newSS.getId(),
      sheets: ['By Solution', 'By Department', 'Broadest Reach', 'Narrowest Reach', 'Methodology & Data Sources']
    };

  } catch (e) {
    Logger.log('Error exporting Department Reach report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
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
