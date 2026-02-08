/**
 * ROSES Cross-Cutting Gap Analysis Report
 * ========================================
 * Generates a comprehensive gap analysis workbook identifying interdisciplinary
 * needs across all SNWG program areas for the Earth Action ROSES solicitation.
 *
 * Produces a 6-sheet Google Sheets workbook:
 *   1. Summary - Key stats, top 8 gaps, admin priority alignment
 *   2. Solution Overview - Per-solution LOS, barriers, characteristics
 *   3. Gap Analysis - Characteristics - Requirement distributions, barrier breakdown, LOS bins
 *   4. Survey Year Breakdown - Year trends, solution x year matrix
 *   5. Department Breakdown - Agency rollups, cross-tabulation
 *   6. Methodology & Data Sources - Documentation and caveats
 *
 * Data Sources: MO-DB_Needs (survey responses), MO-DB_Solutions
 * Dependencies: getAllNeeds() from stakeholder-solution-alignment.gs,
 *               getAllSolutions() from solutions-api.gs,
 *               export-helpers.gs (styleHeaderRow_, autoResizeColumns_, etc.)
 *
 * @fileoverview ROSES cross-cutting gap analysis for Earth Action leadership
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Map sub-agencies to parent federal departments
 * @const {Object}
 */
var ROSES_DEPT_MAP_ = {
  // Department of the Interior
  'U.S. Geological Survey': 'Department of the Interior',
  'USGS': 'Department of the Interior',
  'Bureau of Land Management': 'Department of the Interior',
  'BLM': 'Department of the Interior',
  'National Park Service': 'Department of the Interior',
  'NPS': 'Department of the Interior',
  'Fish and Wildlife Service': 'Department of the Interior',
  'FWS': 'Department of the Interior',
  'Bureau of Indian Affairs': 'Department of the Interior',
  'Bureau of Ocean Energy Management': 'Department of the Interior',
  'BOEM': 'Department of the Interior',
  'Bureau of Reclamation': 'Department of the Interior',
  'Bureau of Safety and Environmental Enforcement': 'Department of the Interior',
  'BSEE': 'Department of the Interior',
  'Office of Surface Mining Reclamation and Enforcement': 'Department of the Interior',
  'OSMRE': 'Department of the Interior',
  // Department of Commerce
  'National Oceanic and Atmospheric Administration': 'Department of Commerce',
  'NOAA': 'Department of Commerce',
  'U.S. Census Bureau': 'Department of Commerce',
  'National Institute of Standards and Technology': 'Department of Commerce',
  'NIST': 'Department of Commerce',
  // Department of Agriculture
  'National Agricultural Statistics Service': 'Department of Agriculture',
  'NASS': 'Department of Agriculture',
  'U.S. Forest Service': 'Department of Agriculture',
  'USFS': 'Department of Agriculture',
  'Natural Resources Conservation Service': 'Department of Agriculture',
  'NRCS': 'Department of Agriculture',
  'Foreign Agricultural Service': 'Department of Agriculture',
  'Farm Service Agency': 'Department of Agriculture',
  'FSA': 'Department of Agriculture',
  'Animal and Plant Health Inspection Service': 'Department of Agriculture',
  'APHIS': 'Department of Agriculture',
  // Department of Energy
  'Office of Science': 'Department of Energy',
  'National Nuclear Security Administration': 'Department of Energy',
  // EPA
  'Environmental Protection Agency': 'Environmental Protection Agency',
  'EPA': 'Environmental Protection Agency',
  // DHS
  'Federal Emergency Management Agency': 'Department of Homeland Security',
  'FEMA': 'Department of Homeland Security',
  'U.S. Coast Guard': 'Department of Homeland Security',
  'Customs and Border Protection': 'Department of Homeland Security',
  // USAID
  'U.S. Agency for International Development': 'USAID',
  'USAID': 'USAID',
  // DOD
  'National Geospatial-Intelligence Agency': 'Department of Defense',
  'NGA': 'Department of Defense',
  'U.S. Army Corps of Engineers': 'Department of Defense',
  // NASA
  'National Aeronautics and Space Administration': 'NASA',
  'NASA': 'NASA',
  // State
  'Department of State': 'Department of State'
};

/**
 * Barrier keyword patterns to search for in limiting_factors text
 * @const {Array<Object>}
 */
var BARRIER_PATTERNS_ = [
  { key: 'data_format', label: 'Data Format Issues', patterns: ['format', 'geotiff', 'hdf', 'netcdf', 'grib', 'zarr', 'cog'] },
  { key: 'data_transformation', label: 'Data Transformation', patterns: ['reproject', 'subset', 'transform', 'conversion', 'regrid'] },
  { key: 'processing_resources', label: 'Lack of Processing Resources', patterns: ['processing', 'computing', 'bandwidth', 'storage', 'server', 'hardware'] },
  { key: 'latency', label: 'Inadequate Latency', patterns: ['latency', 'delay', 'timeliness', 'real-time', 'real time', 'nrt', 'near real'] },
  { key: 'data_volume', label: 'Volume of Data', patterns: ['volume', 'large data', 'big data', 'download size', 'terabyte', 'petabyte'] },
  { key: 'data_quality', label: 'Data Quality/Integrity', patterns: ['quality', 'accuracy', 'error', 'uncertainty', 'calibration', 'validation', 'artifact'] },
  { key: 'licensing', label: 'Licensing Restrictions', patterns: ['licens', 'eula', 'restriction', 'commercial', 'proprietary'] },
  { key: 'discovery', label: 'Data Discovery Challenges', patterns: ['discover', 'find', 'search', 'catalog', 'metadata'] },
  { key: 'training', label: 'Training Needs', patterns: ['training', 'expertise', 'knowledge', 'skill', 'tutorial', 'documentation'] },
  { key: 'human_resources', label: 'Lack of Human Resources', patterns: ['staff', 'personnel', 'workforce', 'human resource', 'manpower', 'capacity'] },
  { key: 'budget', label: 'Budget Constraints', patterns: ['budget', 'funding', 'cost', 'expensive', 'afford'] },
  { key: 'resolution', label: 'Resolution Gaps', patterns: ['resolution', 'spatial', 'finer', 'higher res', 'coarse'] },
  { key: 'coverage', label: 'Geographic Coverage Gaps', patterns: ['coverage', 'geographic', 'regional', 'global', 'extent'] },
  { key: 'temporal', label: 'Temporal Frequency Gaps', patterns: ['temporal', 'frequency', 'revisit', 'repeat', 'daily', 'hourly'] },
  { key: 'continuity', label: 'Data Continuity Concerns', patterns: ['continuity', 'gap in data', 'mission end', 'successor', 'long-term'] },
  { key: 'interoperability', label: 'Cross-Sensor Interoperability', patterns: ['harmoniz', 'interoperab', 'cross-sensor', 'multi-sensor', 'fusion', 'merged'] }
];

/**
 * Top 8 cross-cutting gaps (themes derived from SNWG survey analysis)
 * @const {Array<Object>}
 */
var ROSES_GAP_THEMES_ = [
  {
    rank: 1,
    theme: 'Cross-Product Cal/Val & Uncertainty Quantification',
    evidence: 'Uncertainty/accuracy is consistently one of the least-satisfied requirements. Stakeholders report high need for reliable error characterization.',
    opportunity: 'Reusable cal/val frameworks; automated quality assessment pipelines; inter-comparison and benchmarking tools across HLS, OPERA, NISAR, and water quality products.',
    domains: 'All program areas',
    indicators: ['uncertainty', 'calibration', 'validation', 'accuracy', 'error', 'cal/val', 'quality']
  },
  {
    rank: 2,
    theme: 'Spatial Downscaling & Multi-Sensor Data Fusion',
    evidence: 'Majority of stakeholders need very-high resolution (<30m) products but many current products are at 250m-1km. Resolution is the most discussed requirement.',
    opportunity: 'ML-based spatial downscaling; multi-sensor fusion (optical+SAR+thermal); field-level product generation from moderate-resolution inputs.',
    domains: 'Agriculture, Land Management, Water',
    indicators: ['resolution', 'downscal', 'fusion', 'higher res', 'finer', 'spatial']
  },
  {
    rank: 3,
    theme: 'Near-Real-Time Processing Algorithm Optimization',
    evidence: 'Latency is critically underserved. Many stakeholders need sub-hour to same-day delivery for operational decisions.',
    opportunity: 'Streamlined atmospheric correction & cloud masking; lightweight NRT quality control; edge processing prototypes.',
    domains: 'Disaster Response, Agriculture, Air Quality',
    indicators: ['latency', 'real-time', 'nrt', 'near real', 'timeliness', 'delay', 'rapid']
  },
  {
    rank: 4,
    theme: 'Hyperspectral Algorithm Development',
    evidence: 'Spectral product gaps are among the worst-scored. Growing demand for hyperspectral capabilities for water quality, invasive species, and mineral mapping.',
    opportunity: 'Spectral unmixing methods; band-selection optimization; transferable spectral feature extraction leveraging DESIS, PACE, and future SBG.',
    domains: 'Water Quality, Ecology, Mineral Mapping',
    indicators: ['hyperspectral', 'spectral', 'band', 'wavelength', 'unmixing']
  },
  {
    rank: 5,
    theme: 'Scaling Algorithms to New Domains & Users',
    evidence: 'Same core algorithm families (NDVI, water detection, disturbance mapping) independently requested by 30+ agencies across multiple solutions.',
    opportunity: 'Generalizable, transferable algorithms across ecoregions; user-friendly wrappers for non-expert federal users; reproducible workflows.',
    domains: 'Cross-cutting',
    indicators: ['scal', 'transfer', 'generaliz', 'adapt', 'new application', 'new user']
  },
  {
    rank: 6,
    theme: 'Vertical / 3D Product Retrieval Improvements',
    evidence: 'Vertical resolution requirements are consistently the most underserved dimension. Affects PBL products, atmospheric profiles, DEMs, and bathymetry.',
    opportunity: 'Improved vertical retrieval algorithms; multi-sensor fusion for 3D products (lidar+radar+passive); PBL height algorithms.',
    domains: 'Atmospheric, Geohazards',
    indicators: ['vertical', '3d', 'profile', 'pbl', 'boundary layer', 'elevation', 'depth', 'bathymetr']
  },
  {
    rank: 7,
    theme: 'Cross-Sensor Harmonization & Analysis-Ready Data',
    evidence: 'Processing and format barriers are pervasive. Stakeholders need analysis-ready, harmonized products across sensor families.',
    opportunity: 'Extend HLS-type harmonization to new sensor combos; COG/Zarr/STAC standardization tools; cloud-optimized pipelines.',
    domains: 'Cross-cutting',
    indicators: ['harmoniz', 'analysis-ready', 'interoperab', 'standard', 'format', 'cloud-optimiz']
  },
  {
    rank: 8,
    theme: 'Data Discovery, Usability & Training Tools',
    evidence: 'Discovery and expertise barriers are the most commonly cited adoption impediments. Stakeholders report difficulty finding and using data.',
    opportunity: 'Improved metadata/search/discovery tools; lightweight decision-support apps; self-service data exploration interfaces.',
    domains: 'Cross-cutting',
    indicators: ['discover', 'find', 'search', 'training', 'usability', 'document', 'tutorial', 'workflow']
  }
];

/**
 * Admin priority alignment mapping
 * @const {Array<Object>}
 */
var ADMIN_PRIORITIES_ = [
  {
    priority: 'Agriculture',
    gaps: 'Soil moisture downscaling (#2), crop monitoring latency (#3), hyperspectral crop health (#4)',
    solutions: 'NISAR SM, HLS-VI, Air Quality',
    agencies: 'USDA (NASS, NRCS, FSA)'
  },
  {
    priority: 'Fire',
    gaps: 'OPERA DIST NRT disturbance (#3), vegetation dryness indices (#5), fire intensity cal/val (#1)',
    solutions: 'OPERA DIST, HLS, Planet Products',
    agencies: 'USGS, Forest Service, BLM'
  },
  {
    priority: 'Invasive Species / Screwworm',
    gaps: 'Hyperspectral detection algorithms (#4), animal tracking integration (#5)',
    solutions: 'Internet of Animals, DESIS, GABAN',
    agencies: 'FWS, APHIS, USAID'
  },
  {
    priority: 'New Missions (NISAR, SBG, PACE)',
    gaps: 'Cal/val readiness (#1), algorithm development (#4, #5)',
    solutions: 'NISAR SM, HLS-VI, Water Quality, GABAN',
    agencies: 'Cross-cutting'
  }
];

// ============================================================================
// REPORT GENERATION (for UI preview)
// ============================================================================

/**
 * Generate ROSES Cross-Cutting Gap Analysis report data
 * Returns structured data for both UI preview and sheet export
 *
 * @param {Object} options - Optional filters
 * @returns {Object} Report data
 */
function generateRosesGapReport(options) {
  options = options || {};

  var needs = getAllNeeds();
  var solutions = getAllSolutions();

  if (!needs || needs.length === 0) {
    return {
      title: 'ROSES Cross-Cutting Gap Analysis',
      generated: new Date().toISOString(),
      error: 'No survey data found. Ensure MO-DB_Needs is configured.',
      stats: { totalNeeds: 0, totalSolutions: 0 }
    };
  }

  // ── Per-solution aggregation ──────────────────────────────────────────
  var solMap = {};
  solutions.forEach(function(s) {
    solMap[s.solution_id] = s;
  });

  var solAgg = aggregateBySolution_(needs, solMap);
  var sortedSols = solAgg.sort(function(a, b) { return b.count - a.count; });

  // ── Cross-cutting aggregation ─────────────────────────────────────────
  var losDist = computeLosDist_(needs);
  var barrierCounts = computeBarriers_(needs);
  var yearBreakdown = aggregateByField_(needs, 'survey_year');
  var deptBreakdown = computeDeptBreakdown_(needs);
  var charBreakdowns = computeCharacteristics_(needs);

  // ── Score each gap theme ──────────────────────────────────────────────
  var scoredGaps = scoreGapThemes_(needs, solAgg);

  // ── Overall stats ─────────────────────────────────────────────────────
  var losValues = [];
  needs.forEach(function(n) {
    var v = parseFloat(n.degree_need_met);
    if (!isNaN(v)) losValues.push(v);
  });
  var meanLos = losValues.length > 0 ? (losValues.reduce(function(a, b) { return a + b; }, 0) / losValues.length) : 0;
  var medianLos = losValues.length > 0 ? getMedian_(losValues) : 0;

  var needsWithBarriers = 0;
  needs.forEach(function(n) {
    var lf = String(n.limiting_factors || '').trim();
    var sn = String(n.support_needed || '').trim();
    if (lf.length > 3 || sn.length > 3) needsWithBarriers++;
  });

  var stats = {
    totalNeeds: needs.length,
    totalSolutions: solutions.length,
    solutionsWithNeeds: solAgg.filter(function(s) { return s.count > 0; }).length,
    surveyYears: Object.keys(yearBreakdown).sort().join(', '),
    departments: Object.keys(deptBreakdown).length,
    agencies: Object.keys(aggregateByField_(needs, 'agency')).length,
    meanLos: meanLos.toFixed(1),
    medianLos: medianLos.toFixed(0),
    needsWithBarriers: needsWithBarriers,
    barrierPct: (needsWithBarriers / needs.length * 100).toFixed(0)
  };

  // ── Limit preview data for 5MB constraint ─────────────────────────────
  var previewSolutions = sortedSols.slice(0, 30).map(function(s) {
    return {
      name: s.name,
      count: s.count,
      meanLos: s.meanLos,
      minLos: s.minLos,
      maxLos: s.maxLos,
      topBarriers: s.topBarriers.slice(0, 3),
      yearDist: s.yearDist
    };
  });

  return {
    title: 'ROSES Cross-Cutting Gap Analysis',
    generated: new Date().toISOString(),
    stats: stats,
    solutions: previewSolutions,
    gaps: scoredGaps,
    losDist: losDist,
    barriers: barrierCounts.slice(0, 16),
    deptBreakdown: sortObjectByValue_(deptBreakdown),
    yearBreakdown: yearBreakdown,
    charBreakdowns: limitCharBreakdowns_(charBreakdowns),
    adminPriorities: ADMIN_PRIORITIES_
  };
}

/**
 * Wrapper for UI calls (ensures safe serialization)
 * @param {Object} options
 * @returns {Object} Serialized report data
 */
function getRosesGapReport(options) {
  return JSON.parse(JSON.stringify(generateRosesGapReport(options)));
}

// ============================================================================
// SHEET EXPORT
// ============================================================================

/**
 * Export ROSES Gap Analysis to a new Google Sheets workbook
 * @param {Object} options - Optional filters
 * @returns {Object} { url, fileName, sheetId, sheets, rowCount }
 */
function exportRosesGapToSheet(options) {
  options = options || {};

  try {
    // Generate full report data (no preview limits)
    var needs = getAllNeeds();
    var solutions = getAllSolutions();

    if (!needs || needs.length === 0) {
      throw new Error('No survey data found in MO-DB_Needs.');
    }

    var solMap = {};
    solutions.forEach(function(s) { solMap[s.solution_id] = s; });

    var solAgg = aggregateBySolution_(needs, solMap);
    var sortedSols = solAgg.sort(function(a, b) { return b.count - a.count; });
    var losDist = computeLosDist_(needs);
    var barrierCounts = computeBarriers_(needs);
    var yearBreakdown = aggregateByField_(needs, 'survey_year');
    var deptBreakdown = computeDeptBreakdown_(needs);
    var charBreakdowns = computeCharacteristics_(needs);
    var scoredGaps = scoreGapThemes_(needs, solAgg);

    var losValues = [];
    needs.forEach(function(n) {
      var v = parseFloat(n.degree_need_met);
      if (!isNaN(v)) losValues.push(v);
    });
    var meanLos = losValues.length > 0 ? (losValues.reduce(function(a, b) { return a + b; }, 0) / losValues.length) : 0;

    // Create spreadsheet
    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var fileName = 'ROSES_GapAnalysis_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);

    // ================================================================
    // SHEET 1: Summary
    // ================================================================
    var summarySheet = newSS.getActiveSheet();
    summarySheet.setName('Summary');

    var summaryData = [
      ['ROSES Cross-Cutting Gap Analysis', '', '', '', '', ''],
      ['Generated: ' + today.toISOString(), '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['KEY STATISTICS', '', '', '', '', ''],
      ['Total Solutions Analyzed', solutions.length, '', 'Mean LOS Score (0-100)', meanLos.toFixed(1), ''],
      ['Total Stakeholder Needs', needs.length, '', 'Survey Cycles', '2016-2024', ''],
      ['Federal Departments', Object.keys(deptBreakdown).length, '', 'Needs Citing Barriers', (barrierCounts.length > 0 ? barrierCounts[0].count : 0), ''],
      ['', '', '', '', '', ''],
      ['TOP 8 CROSS-CUTTING GAPS (PI-Actionable, 1-3 yrs, <$1M)', '', '', '', '', ''],
      ['Rank', 'Gap Theme', 'Evidence (from surveys)', 'PI Opportunity', 'Priority Domains', 'Relevance Score']
    ];

    scoredGaps.forEach(function(g) {
      summaryData.push([g.rank, g.theme, g.evidence, g.opportunity, g.domains, g.score]);
    });

    summaryData.push(['', '', '', '', '', '']);
    summaryData.push(['ALIGNMENT WITH ADMINISTRATION PRIORITIES', '', '', '', '', '']);
    summaryData.push(['Admin Priority', 'Relevant Gaps', 'Key Solutions', 'Primary Agencies', '', '']);

    ADMIN_PRIORITIES_.forEach(function(p) {
      summaryData.push([p.priority, p.gaps, p.solutions, p.agencies, '', '']);
    });

    summarySheet.getRange(1, 1, summaryData.length, 6).setValues(summaryData);
    summarySheet.getRange(1, 1).setFontWeight('bold').setFontSize(16);
    summarySheet.getRange(4, 1).setFontWeight('bold').setFontSize(12);
    summarySheet.getRange(9, 1).setFontWeight('bold').setFontSize(12);
    var gapHeaderRow = 10;
    styleHeaderRow_AtRow_(summarySheet, gapHeaderRow, 6);
    var adminHeaderRow = summaryData.length - ADMIN_PRIORITIES_.length;
    summarySheet.getRange(adminHeaderRow - 1, 1).setFontWeight('bold').setFontSize(12);
    styleHeaderRow_AtRow_(summarySheet, adminHeaderRow, 6);

    summarySheet.setColumnWidth(1, 120);
    summarySheet.setColumnWidth(2, 280);
    summarySheet.setColumnWidth(3, 320);
    summarySheet.setColumnWidth(4, 320);
    summarySheet.setColumnWidth(5, 180);
    summarySheet.setColumnWidth(6, 100);

    // ================================================================
    // SHEET 2: Solution Overview
    // ================================================================
    var solSheet = newSS.insertSheet('Solution Overview');

    var solHeaders = [
      'Solution Name', '# Stakeholders', 'Mean LOS', 'Min LOS', 'Max LOS',
      'Top Barrier #1', 'Top Barrier #2', 'Top Barrier #3',
      'Survey Years', 'Top Department'
    ];
    var solData = [solHeaders];

    sortedSols.forEach(function(s) {
      if (s.count === 0) return;
      var b1 = s.topBarriers.length > 0 ? s.topBarriers[0].label + ' (' + s.topBarriers[0].count + ')' : '';
      var b2 = s.topBarriers.length > 1 ? s.topBarriers[1].label + ' (' + s.topBarriers[1].count + ')' : '';
      var b3 = s.topBarriers.length > 2 ? s.topBarriers[2].label + ' (' + s.topBarriers[2].count + ')' : '';
      var years = Object.keys(s.yearDist).sort().join(', ');
      var topDept = '';
      var depts = sortObjectByValue_(s.deptDist);
      if (depts.length > 0) topDept = depts[0].key + ' (' + depts[0].count + ')';

      solData.push([
        s.name, s.count,
        s.meanLos !== null ? s.meanLos : 'N/A',
        s.minLos !== null ? s.minLos : 'N/A',
        s.maxLos !== null ? s.maxLos : 'N/A',
        b1, b2, b3, years, topDept
      ]);
    });

    if (solData.length > 1) {
      solSheet.getRange(1, 1, solData.length, solHeaders.length).setValues(solData);
    }
    formatDataSheet_(solSheet, solHeaders.length);

    // ================================================================
    // SHEET 3: Gap Analysis - Characteristics
    // ================================================================
    var gapSheet = newSS.insertSheet('Gap Analysis - Characteristics');
    var gapRows = [];

    // Section A: LOS Distribution
    gapRows.push(['LEVEL OF SATISFACTION (LOS) SCORE DISTRIBUTION', '', '', '']);
    gapRows.push(['LOS Range', '# Stakeholders', '% of Scored', 'Interpretation']);
    var interpretations = [
      'Critical gap', 'Severe gap', 'Major gap', 'Moderate gap', 'About half met',
      'More than half met', 'Adequate', 'Good', 'Very good', 'Excellent'
    ];
    losDist.forEach(function(bin, i) {
      gapRows.push([bin.range, bin.count, bin.pct + '%', interpretations[i] || '']);
    });
    gapRows.push(['', '', '', '']);

    // Section B: Barriers
    gapRows.push(['BARRIERS TO ADOPTION (aggregated from survey free-text)', '', '', '']);
    gapRows.push(['Barrier Category', '# Mentions', '% of Needs', 'Severity Rank']);
    barrierCounts.forEach(function(b, i) {
      gapRows.push([b.label, b.count, b.pct + '%', i + 1]);
    });
    gapRows.push(['', '', '', '']);

    // Section C: Requirement Characteristics
    var charLabels = {
      horizontal_resolution: 'Horizontal Spatial Resolution',
      vertical_resolution: 'Vertical Resolution',
      temporal_frequency: 'Temporal Frequency',
      data_latency_value: 'Data Latency',
      geographic_coverage: 'Geographic Coverage',
      spectral_bands_value: 'Spectral Bands',
      uncertainty_type: 'Measurement Uncertainty'
    };

    Object.keys(charLabels).forEach(function(charKey) {
      var label = charLabels[charKey];
      var dist = charBreakdowns[charKey] || [];
      if (dist.length === 0) return;

      gapRows.push([label.toUpperCase(), '', '', '']);
      gapRows.push(['Requirement Value', '# Stakeholders', '% of Total', '']);
      dist.slice(0, 15).forEach(function(item) {
        gapRows.push([item.value, item.count, item.pct + '%', '']);
      });
      gapRows.push(['', '', '', '']);
    });

    gapSheet.getRange(1, 1, gapRows.length, 4).setValues(gapRows);
    gapSheet.getRange(1, 1).setFontWeight('bold').setFontSize(12);
    gapSheet.setColumnWidth(1, 350);
    gapSheet.setColumnWidth(2, 120);
    gapSheet.setColumnWidth(3, 100);
    gapSheet.setColumnWidth(4, 200);

    // Bold section headers
    for (var ri = 0; ri < gapRows.length; ri++) {
      var cellVal = String(gapRows[ri][0]);
      if (cellVal === cellVal.toUpperCase() && cellVal.length > 5 && cellVal.indexOf('%') === -1) {
        gapSheet.getRange(ri + 1, 1).setFontWeight('bold').setFontSize(11);
      }
    }

    // ================================================================
    // SHEET 4: Survey Year Breakdown
    // ================================================================
    var yearSheet = newSS.insertSheet('Survey Year Breakdown');

    // Section A: Overall by year
    var yearHeaders = ['Survey Year', '# Needs', '% of Total', 'Mean LOS', '# Solutions'];
    var yearData = [yearHeaders];

    var yearLos = {};
    var yearSols = {};
    needs.forEach(function(n) {
      var yr = String(n.survey_year || 'Unknown');
      if (!yearLos[yr]) yearLos[yr] = [];
      if (!yearSols[yr]) yearSols[yr] = {};
      var v = parseFloat(n.degree_need_met);
      if (!isNaN(v)) yearLos[yr].push(v);
      var sid = n.solution_id || n.solution || '';
      if (sid) yearSols[yr][sid] = true;
    });

    Object.keys(yearBreakdown).sort().forEach(function(yr) {
      var cnt = yearBreakdown[yr];
      var pct = (cnt / needs.length * 100).toFixed(1);
      var yl = yearLos[yr] || [];
      var ml = yl.length > 0 ? (yl.reduce(function(a, b) { return a + b; }, 0) / yl.length).toFixed(1) : 'N/A';
      var ns = Object.keys(yearSols[yr] || {}).length;
      yearData.push([yr, cnt, pct + '%', ml, ns]);
    });

    yearData.push(['', '', '', '', '']);
    yearData.push(['SOLUTIONS BY SURVEY YEAR', '', '', '', '']);

    var yearCols = Object.keys(yearBreakdown).sort();
    var solYearHeaders = ['Solution'].concat(yearCols).concat(['Total']);
    yearData.push(solYearHeaders);

    sortedSols.forEach(function(s) {
      if (s.count === 0) return;
      var row = [s.name];
      yearCols.forEach(function(yr) {
        row.push(s.yearDist[yr] || 0);
      });
      row.push(s.count);
      yearData.push(row);
    });

    // Pad to consistent column count
    var maxCols = Math.max(yearHeaders.length, solYearHeaders.length);
    yearData = yearData.map(function(row) {
      while (row.length < maxCols) row.push('');
      return row.slice(0, maxCols);
    });

    yearSheet.getRange(1, 1, yearData.length, maxCols).setValues(yearData);
    styleHeaderRow_(yearSheet, maxCols);
    autoResizeColumns_(yearSheet, maxCols);

    // ================================================================
    // SHEET 5: Department Breakdown
    // ================================================================
    var deptSheet = newSS.insertSheet('Department Breakdown');

    // Section A: By department
    var deptHeaders = ['Department', '# Needs', '% of Total', 'Mean LOS', 'Top Solution'];
    var deptData = [deptHeaders];

    var deptLos = {};
    var deptTopSol = {};
    needs.forEach(function(n) {
      var dept = mapDepartment_(n);
      if (!deptLos[dept]) deptLos[dept] = [];
      if (!deptTopSol[dept]) deptTopSol[dept] = {};
      var v = parseFloat(n.degree_need_met);
      if (!isNaN(v)) deptLos[dept].push(v);
      var sid = n.solution || n.solution_id || '';
      if (sid) deptTopSol[dept][sid] = (deptTopSol[dept][sid] || 0) + 1;
    });

    var sortedDepts = sortObjectByValue_(deptBreakdown);
    sortedDepts.forEach(function(d) {
      var dl = deptLos[d.key] || [];
      var ml = dl.length > 0 ? (dl.reduce(function(a, b) { return a + b; }, 0) / dl.length).toFixed(1) : 'N/A';
      var topSol = '';
      var solCounts = deptTopSol[d.key] || {};
      var maxCount = 0;
      Object.keys(solCounts).forEach(function(s) {
        if (solCounts[s] > maxCount) { maxCount = solCounts[s]; topSol = s; }
      });
      deptData.push([d.key, d.count, (d.count / needs.length * 100).toFixed(1) + '%', ml, topSol]);
    });

    deptData.push(['', '', '', '', '']);
    deptData.push(['SUB-AGENCY DETAIL (Top 25)', '', '', '', '']);
    deptData.push(['Agency', 'Parent Department', '# Needs', 'Mean LOS', 'Top Solution']);

    var agencyCounts = aggregateByField_(needs, 'agency');
    var agencyLos = {};
    var agencyTopSol = {};
    needs.forEach(function(n) {
      var ag = String(n.agency || n.organization || 'Unknown').trim();
      if (!ag || ag === 'NR') return;
      if (!agencyLos[ag]) agencyLos[ag] = [];
      if (!agencyTopSol[ag]) agencyTopSol[ag] = {};
      var v = parseFloat(n.degree_need_met);
      if (!isNaN(v)) agencyLos[ag].push(v);
      var sid = n.solution || n.solution_id || '';
      if (sid) agencyTopSol[ag][sid] = (agencyTopSol[ag][sid] || 0) + 1;
    });

    var sortedAgencies = sortObjectByValue_(agencyCounts).slice(0, 25);
    sortedAgencies.forEach(function(a) {
      var dept = ROSES_DEPT_MAP_[a.key] || 'Other';
      var al = agencyLos[a.key] || [];
      var ml = al.length > 0 ? (al.reduce(function(x, y) { return x + y; }, 0) / al.length).toFixed(1) : 'N/A';
      var topSol = '';
      var sc = agencyTopSol[a.key] || {};
      var mx = 0;
      Object.keys(sc).forEach(function(s) { if (sc[s] > mx) { mx = sc[s]; topSol = s; } });
      deptData.push([a.key, dept, a.count, ml, topSol]);
    });

    // Pad columns
    deptData = deptData.map(function(row) {
      while (row.length < 5) row.push('');
      return row;
    });

    deptSheet.getRange(1, 1, deptData.length, 5).setValues(deptData);
    formatDataSheet_(deptSheet, 5);

    // ================================================================
    // SHEET 6: Methodology & Data Sources
    // ================================================================
    var needsSheetUrl = getSourceSheetUrl('NEEDS_SHEET_ID');
    var solutionsSheetUrl = getSourceSheetUrl('SOLUTIONS_SHEET_ID');

    var methodData = getMethodologyHeader_(
      'ROSES Cross-Cutting Gap Analysis',
      'This report identifies interdisciplinary gaps across all SNWG solutions for the Earth Action ROSES solicitation.'
    );

    methodData = methodData.concat(getMethodologyDataSources_([
      {
        name: 'MO-DB_Needs (Stakeholder Survey Responses)',
        description: needs.length + ' survey responses from SNWG assessment cycles (2016-2024). Each record is one stakeholder need with requirements, satisfaction scores, and barrier information.',
        url: needsSheetUrl || 'Configure NEEDS_SHEET_ID in MO-DB_Config',
        fields: [
          { name: 'degree_need_met', description: 'Stakeholder satisfaction rating (0-100%)' },
          { name: 'horizontal_resolution', description: 'Spatial resolution requirements' },
          { name: 'temporal_frequency', description: 'How often data is needed' },
          { name: 'geographic_coverage', description: 'Geographic area requirements' },
          { name: 'limiting_factors', description: 'Free-text barriers to adoption' },
          { name: 'support_needed', description: 'Support/infrastructure gaps' }
        ]
      },
      {
        name: 'MO-DB_Solutions (Solution Characteristics)',
        description: solutions.length + ' SNWG solutions with technical specifications.',
        url: solutionsSheetUrl || 'Configure SOLUTIONS_SHEET_ID in MO-DB_Config',
        fields: [
          { name: 'solution_id', description: 'Unique solution identifier' },
          { name: 'core_official_name', description: 'Full solution name' },
          { name: 'product_horiz_resolution', description: 'What the solution provides' },
          { name: 'product_temporal_freq', description: 'Data delivery frequency' }
        ]
      }
    ]));

    methodData = methodData.concat([
      ['', ''],
      ['METHODOLOGY', ''],
      ['', ''],
      ['1. Data Extraction', 'All needs loaded from MO-DB_Needs. Solutions loaded from MO-DB_Solutions.'],
      ['2. Solution Matching', 'Needs matched to solutions via solution_id field (primary) or name parsing (fallback).'],
      ['3. LOS Analysis', 'degree_need_met field aggregated by solution, year, and department. Lower scores = bigger gaps.'],
      ['4. Barrier Extraction', 'Free-text limiting_factors and support_needed fields scanned for barrier keyword patterns across 16 categories.'],
      ['5. Gap Theme Scoring', 'Each of 8 cross-cutting gap themes scored by counting relevant keyword mentions in survey text and weighting by LOS severity.'],
      ['6. Department Rollup', 'Sub-agencies mapped to parent federal departments using agency name matching.'],
      ['', ''],
      ['KEY DEFINITIONS', ''],
      ['', ''],
      ['LOS (Level of Satisfaction)', 'Score from 0-100 indicating how well a need is currently met. Lower = bigger gap.'],
      ['SNWG', 'Satellite Needs Working Group - interagency body assessing federal satellite data needs.'],
      ['PI-Actionable', 'A gap addressable by a Principal Investigator in 1-3 years at <$1M budget.'],
      ['Cal/Val', 'Calibration and Validation - ensuring satellite products meet accuracy requirements.'],
      ['Cross-Cutting', 'An unmet need appearing across multiple solutions and agency domains.'],
      ['', ''],
      ['CAVEATS', ''],
      ['', ''],
      ['1.', 'LOS scores are self-assessed by survey submitters and may reflect subjective interpretation.'],
      ['2.', 'Barrier extraction uses keyword matching on free-text fields; some barriers may be missed or miscategorized.'],
      ['3.', 'Not all agencies responded to all survey cycles.'],
      ['4.', 'Gap theme scores are indicative, not definitive.'],
      ['5.', 'This report reflects data in MO-DB_Needs as of the generation date.']
    ]);

    methodData = methodData.concat(getMethodologyVerification_([
      'Open MO-DB_Needs source data (link above)',
      'Filter by solution name to verify stakeholder counts',
      'Check degree_need_met values against reported LOS scores',
      'Review limiting_factors text against barrier counts'
    ]));

    createMethodologySheet_(newSS, methodData);

    // Move Summary to position 1
    newSS.setActiveSheet(summarySheet);
    newSS.moveActiveSheet(1);

    Logger.log('ROSES Gap Analysis exported: ' + newSS.getUrl());

    return buildExportResult_(newSS, fileName, {
      rowCount: needs.length,
      solutionCount: sortedSols.filter(function(s) { return s.count > 0; }).length,
      gapCount: scoredGaps.length
    }, ['Summary', 'Solution Overview', 'Gap Analysis - Characteristics', 'Survey Year Breakdown', 'Department Breakdown', 'Methodology & Data Sources']);

  } catch (e) {
    Logger.log('Error exporting ROSES Gap Analysis: ' + e.message + '\n' + e.stack);
    throw new Error('Failed to export ROSES Gap Analysis: ' + e.message);
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Aggregate needs by solution, computing LOS stats, barriers, year/dept distributions
 * @private
 */
function aggregateBySolution_(needs, solMap) {
  var byName = {};

  needs.forEach(function(n) {
    var name = n.solution || n.solution_id || 'Unknown';
    if (!byName[name]) {
      byName[name] = {
        name: name,
        solutionId: n.solution_id || '',
        count: 0,
        losValues: [],
        yearDist: {},
        deptDist: {},
        barrierTexts: []
      };
    }
    var agg = byName[name];
    agg.count++;

    var v = parseFloat(n.degree_need_met);
    if (!isNaN(v)) agg.losValues.push(v);

    var yr = String(n.survey_year || 'Unknown');
    agg.yearDist[yr] = (agg.yearDist[yr] || 0) + 1;

    var dept = mapDepartment_(n);
    agg.deptDist[dept] = (agg.deptDist[dept] || 0) + 1;

    var lf = String(n.limiting_factors || '').trim();
    var sn = String(n.support_needed || '').trim();
    if (lf.length > 3) agg.barrierTexts.push(lf);
    if (sn.length > 3) agg.barrierTexts.push(sn);
  });

  return Object.keys(byName).map(function(name) {
    var agg = byName[name];
    var lv = agg.losValues;

    // Compute barrier counts for this solution
    var bCounts = {};
    BARRIER_PATTERNS_.forEach(function(bp) { bCounts[bp.key] = 0; });
    agg.barrierTexts.forEach(function(text) {
      var lower = text.toLowerCase();
      BARRIER_PATTERNS_.forEach(function(bp) {
        bp.patterns.forEach(function(pat) {
          if (lower.indexOf(pat) !== -1) {
            bCounts[bp.key]++;
          }
        });
      });
    });

    var topBarriers = BARRIER_PATTERNS_.map(function(bp) {
      return { key: bp.key, label: bp.label, count: bCounts[bp.key] };
    }).filter(function(b) { return b.count > 0; })
      .sort(function(a, b) { return b.count - a.count; });

    return {
      name: name,
      solutionId: agg.solutionId,
      count: agg.count,
      meanLos: lv.length > 0 ? parseFloat((lv.reduce(function(a, b) { return a + b; }, 0) / lv.length).toFixed(1)) : null,
      minLos: lv.length > 0 ? Math.min.apply(null, lv) : null,
      maxLos: lv.length > 0 ? Math.max.apply(null, lv) : null,
      yearDist: agg.yearDist,
      deptDist: agg.deptDist,
      topBarriers: topBarriers
    };
  });
}

/**
 * Compute LOS distribution in 10-point bins
 * @private
 */
function computeLosDist_(needs) {
  var bins = [];
  for (var i = 0; i < 10; i++) {
    bins.push({ lo: i * 10, hi: i * 10 + 10, range: (i * 10) + '-' + (i * 10 + 10), count: 0 });
  }
  // Fix last bin to include 100
  bins[9].hi = 101;
  bins[9].range = '90-100';

  var scored = 0;
  needs.forEach(function(n) {
    var v = parseFloat(n.degree_need_met);
    if (!isNaN(v)) {
      scored++;
      for (var i = 0; i < bins.length; i++) {
        if (v >= bins[i].lo && v < bins[i].hi) {
          bins[i].count++;
          break;
        }
      }
    }
  });

  return bins.map(function(b) {
    b.pct = scored > 0 ? (b.count / scored * 100).toFixed(1) : '0.0';
    return b;
  });
}

/**
 * Extract and count barriers from free-text fields
 * @private
 */
function computeBarriers_(needs) {
  var counts = {};
  BARRIER_PATTERNS_.forEach(function(bp) { counts[bp.key] = 0; });

  needs.forEach(function(n) {
    var texts = [
      String(n.limiting_factors || ''),
      String(n.support_needed || ''),
      String(n.impact_if_unavailable || ''),
      String(n.has_infrastructure || '')
    ].join(' ').toLowerCase();

    if (texts.trim().length < 5) return;

    BARRIER_PATTERNS_.forEach(function(bp) {
      var found = false;
      bp.patterns.forEach(function(pat) {
        if (!found && texts.indexOf(pat) !== -1) {
          counts[bp.key]++;
          found = true;
        }
      });
    });
  });

  return BARRIER_PATTERNS_.map(function(bp) {
    return {
      key: bp.key,
      label: bp.label,
      count: counts[bp.key],
      pct: (counts[bp.key] / needs.length * 100).toFixed(1)
    };
  }).sort(function(a, b) { return b.count - a.count; });
}

/**
 * Compute department breakdown using DEPT_MAP
 * @private
 */
function computeDeptBreakdown_(needs) {
  var counts = {};
  needs.forEach(function(n) {
    var dept = mapDepartment_(n);
    counts[dept] = (counts[dept] || 0) + 1;
  });
  return counts;
}

/**
 * Map a need record to its parent department
 * @private
 */
function mapDepartment_(need) {
  var agency = String(need.agency || need.organization || need.department || '').trim();
  var dept = String(need.department || '').trim();

  // Try exact match on agency
  if (ROSES_DEPT_MAP_[agency]) return ROSES_DEPT_MAP_[agency];

  // Try partial match on agency
  var agLower = agency.toLowerCase();
  var keys = Object.keys(ROSES_DEPT_MAP_);
  for (var i = 0; i < keys.length; i++) {
    if (agLower.indexOf(keys[i].toLowerCase()) !== -1 || keys[i].toLowerCase().indexOf(agLower) !== -1) {
      return ROSES_DEPT_MAP_[keys[i]];
    }
  }

  // Try department field
  if (dept) {
    if (ROSES_DEPT_MAP_[dept]) return ROSES_DEPT_MAP_[dept];
    var dpLower = dept.toLowerCase();
    if (dpLower.indexOf('interior') !== -1) return 'Department of the Interior';
    if (dpLower.indexOf('commerce') !== -1) return 'Department of Commerce';
    if (dpLower.indexOf('agric') !== -1) return 'Department of Agriculture';
    if (dpLower.indexOf('energy') !== -1) return 'Department of Energy';
    if (dpLower.indexOf('homeland') !== -1) return 'Department of Homeland Security';
    if (dpLower.indexOf('defense') !== -1) return 'Department of Defense';
    if (dpLower.indexOf('state') !== -1) return 'Department of State';
  }

  return 'Other/Unclassified';
}

/**
 * Aggregate by a single field, returning {fieldValue: count}
 * @private
 */
function aggregateByField_(needs, field) {
  var counts = {};
  needs.forEach(function(n) {
    var val = String(n[field] || 'Unknown').trim();
    if (val && val !== 'NR' && val !== 'N/A') {
      counts[val] = (counts[val] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Compute requirement characteristic value distributions
 * @private
 */
function computeCharacteristics_(needs) {
  var chars = {
    horizontal_resolution: {},
    vertical_resolution: {},
    temporal_frequency: {},
    data_latency_value: {},
    geographic_coverage: {},
    spectral_bands_value: {},
    uncertainty_type: {}
  };

  needs.forEach(function(n) {
    Object.keys(chars).forEach(function(key) {
      var val = String(n[key] || '').trim();
      if (val && val !== 'NR' && val !== 'N/A' && val.length > 1) {
        // Truncate very long values
        if (val.length > 120) val = val.substring(0, 120) + '...';
        chars[key][val] = (chars[key][val] || 0) + 1;
      }
    });
  });

  // Convert to sorted arrays
  var result = {};
  Object.keys(chars).forEach(function(key) {
    result[key] = Object.keys(chars[key]).map(function(val) {
      return {
        value: val,
        count: chars[key][val],
        pct: (chars[key][val] / needs.length * 100).toFixed(1)
      };
    }).sort(function(a, b) { return b.count - a.count; });
  });

  return result;
}

/**
 * Score gap themes by counting indicator keywords in survey text
 * @private
 */
function scoreGapThemes_(needs, solAgg) {
  return ROSES_GAP_THEMES_.map(function(gap) {
    var mentions = 0;
    var affectedNeeds = 0;

    needs.forEach(function(n) {
      var text = [
        String(n.application_description || ''),
        String(n.limiting_factors || ''),
        String(n.support_needed || ''),
        String(n.impact_if_unavailable || ''),
        String(n.impact_if_unmet || ''),
        String(n.additional_comments || '')
      ].join(' ').toLowerCase();

      var found = false;
      gap.indicators.forEach(function(ind) {
        if (text.indexOf(ind) !== -1) {
          mentions++;
          if (!found) { affectedNeeds++; found = true; }
        }
      });
    });

    // Score: combination of mention frequency and breadth across solutions
    var affectedSolutions = 0;
    solAgg.forEach(function(s) {
      var hasIndicator = false;
      s.topBarriers.forEach(function(b) {
        gap.indicators.forEach(function(ind) {
          if (b.label.toLowerCase().indexOf(ind) !== -1) hasIndicator = true;
        });
      });
      if (hasIndicator) affectedSolutions++;
    });

    var score = Math.min(100, Math.round(
      (affectedNeeds / needs.length * 50) +
      (mentions / needs.length * 30) +
      (affectedSolutions / Math.max(solAgg.length, 1) * 20)
    ));

    return {
      rank: gap.rank,
      theme: gap.theme,
      evidence: gap.evidence + ' (' + affectedNeeds + ' needs, ' + mentions + ' mentions)',
      opportunity: gap.opportunity,
      domains: gap.domains,
      score: score + '%'
    };
  });
}

/**
 * Sort an object {key: count} into array [{key, count}] descending
 * @private
 */
function sortObjectByValue_(obj) {
  return Object.keys(obj).map(function(key) {
    return { key: key, count: obj[key] };
  }).sort(function(a, b) { return b.count - a.count; });
}

/**
 * Compute median of a numeric array
 * @private
 */
function getMedian_(arr) {
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Limit characteristic breakdowns for preview (top 10 per char)
 * @private
 */
function limitCharBreakdowns_(charBreakdowns) {
  var limited = {};
  Object.keys(charBreakdowns).forEach(function(key) {
    limited[key] = charBreakdowns[key].slice(0, 10);
  });
  return limited;
}

/**
 * Style a header row at a specific row (not just row 1)
 * @private
 */
function styleHeaderRow_AtRow_(sheet, row, colCount) {
  var range = sheet.getRange(row, 1, 1, colCount);
  range.setFontWeight('bold');
  range.setBackground('#4a5568');
  range.setFontColor('#ffffff');
}
