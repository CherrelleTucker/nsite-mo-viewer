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
 * @fileoverview Advanced stakeholder analytics and alignment reports
 */

// ============================================================================
// REPORT 1: NEED ALIGNMENT (Implementation)
// Compare what stakeholders requested vs what solutions deliver
// ============================================================================

/**
 * Generate Need Alignment Report
 * Shows each solution with its purpose, characteristics, and stakeholder engagement
 * @param {Object} options - Filter options
 * @param {string} options.cycle - Filter by cycle
 * @param {boolean} options.defaultOnly - Only default solutions
 * @returns {Object} Need alignment report data
 */
function generateNeedAlignmentReport(options) {
  options = options || {};

  try {
    var solutions = getAllSolutions();
    var contacts = getAllContacts();

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

    // Get solution characteristics from config or cached data
    var solutionContent = getSolutionContent_();

    // Build alignment data for each solution
    var alignments = solutions.map(function(sol) {
      var solName = sol.name || sol.solution_id;

      // Get stakeholders for this solution
      var solutionContacts = contacts.filter(function(c) {
        return c.solution && c.solution.toLowerCase().indexOf(solName.toLowerCase()) !== -1;
      });

      // Get unique stakeholders
      var uniqueEmails = {};
      var byRole = {};
      var byDepartment = {};
      var bySurveyYear = {};

      solutionContacts.forEach(function(c) {
        if (c.email) uniqueEmails[c.email] = true;
        if (c.role) byRole[c.role] = (byRole[c.role] || 0) + 1;
        if (c.department) byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
        if (c.survey_year) bySurveyYear[c.survey_year] = (bySurveyYear[c.survey_year] || 0) + 1;
      });

      // Get earthdata content if available
      var content = solutionContent[solName] || solutionContent[sol.full_name] || {};

      return {
        solution: solName,
        fullName: sol.full_name || '',
        cycle: 'C' + (sol.cycle || '?'),
        phase: sol.phase || '',

        // Solution characteristics (from earthdata)
        purpose: content.purpose_mission || sol.status_text || '',
        characteristics: content.solution_characteristics || {},
        thematicAreas: extractThematicAreas_(content),
        societalImpact: content.societal_impact || '',

        // Stakeholder engagement
        stakeholders: {
          total: Object.keys(uniqueEmails).length,
          byRole: byRole,
          byDepartment: formatTopN_(byDepartment, 5),
          bySurveyYear: bySurveyYear
        },

        // Alignment score (simplified)
        alignmentScore: calculateAlignmentScore_(content, solutionContacts)
      };
    });

    // Sort by stakeholder count
    alignments.sort(function(a, b) {
      return b.stakeholders.total - a.stakeholders.total;
    });

    return {
      title: 'Need Alignment Report',
      subtitle: 'Solution characteristics vs stakeholder engagement',
      generated: new Date().toISOString(),
      count: alignments.length,
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
 * Calculate simple alignment score based on stakeholder engagement
 */
function calculateAlignmentScore_(content, contacts) {
  var score = 0;
  var maxScore = 100;

  // Points for having stakeholders
  if (contacts.length > 0) score += 20;
  if (contacts.length >= 5) score += 10;
  if (contacts.length >= 20) score += 10;

  // Points for having Primary SMEs
  var primarySMEs = contacts.filter(function(c) {
    return c.role === 'Primary SME';
  });
  if (primarySMEs.length > 0) score += 15;
  if (primarySMEs.length >= 3) score += 10;

  // Points for multi-year engagement
  var years = {};
  contacts.forEach(function(c) {
    if (c.survey_year) years[c.survey_year] = true;
  });
  var yearCount = Object.keys(years).length;
  if (yearCount >= 2) score += 10;
  if (yearCount >= 3) score += 10;

  // Points for having solution content
  if (content.purpose_mission) score += 5;
  if (content.solution_characteristics) score += 5;
  if (content.societal_impact) score += 5;

  return Math.min(score, maxScore);
}

/**
 * Calculate summary statistics for alignment report
 */
function calculateAlignmentSummary_(alignments) {
  var totalStakeholders = 0;
  var solutionsWithEngagement = 0;
  var avgScore = 0;

  alignments.forEach(function(a) {
    totalStakeholders += a.stakeholders.total;
    if (a.stakeholders.total > 0) solutionsWithEngagement++;
    avgScore += a.alignmentScore;
  });

  return {
    totalSolutions: alignments.length,
    totalStakeholders: totalStakeholders,
    solutionsWithEngagement: solutionsWithEngagement,
    solutionsWithoutEngagement: alignments.length - solutionsWithEngagement,
    averageAlignmentScore: alignments.length > 0 ? Math.round(avgScore / alignments.length) : 0
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
 */
function getSolutionContent_() {
  // Try to get from script properties first
  try {
    var props = PropertiesService.getScriptProperties();
    var cached = props.getProperty('SOLUTION_CONTENT');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  // Return empty object if not available
  return {};
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
