/**
 * QuickLook CSV Generator
 * =======================
 * Generates milestone CSV reports from MO-DB_Solutions.
 * Output format matches the "Solution Status Quick Look" Excel format.
 *
 * @fileoverview Report generator for leadership milestone tracking
 */

// ============================================================================
// QUICKLOOK CSV GENERATION
// ============================================================================

/**
 * Generate QuickLook CSV data
 * Returns array suitable for CSV export or display
 * @param {Object} options - Optional filters
 * @param {string} options.cycle - Filter by cycle (e.g., "4", "5")
 * @param {string} options.phase - Filter by phase
 * @param {boolean} options.defaultOnly - Only include solutions with show_in_default='Y'
 * @returns {Object} { headers: string[], rows: array[], generated: string }
 */
function generateQuickLookData(options) {
  options = options || {};

  try {
    var solutions = getAllSolutions();

    // Apply filters
    if (options.cycle) {
      solutions = solutions.filter(function(s) {
        return String(s.cycle) === String(options.cycle);
      });
    }

    if (options.phase) {
      solutions = solutions.filter(function(s) {
        return (s.phase || '').toLowerCase().indexOf(options.phase.toLowerCase()) !== -1;
      });
    }

    if (options.defaultOnly) {
      solutions = solutions.filter(function(s) {
        return s.show_in_default === 'Y';
      });
    }

    // Sort by cycle then name
    solutions.sort(function(a, b) {
      var cycleA = parseInt(a.cycle) || 99;
      var cycleB = parseInt(b.cycle) || 99;
      if (cycleA !== cycleB) return cycleA - cycleB;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Define headers matching Quick Look format
    var headers = [
      'Solution',
      'Cycle',
      'Phase',
      'ATP DG',
      'F2I DG',
      'ORR',
      'Closeout',
      'ATP Memo',
      'F2I Memo',
      'ORR Memo',
      'Closeout Memo'
    ];

    // Build rows
    var rows = solutions.map(function(sol) {
      return [
        sol.name || sol.solution_id || '',
        'C' + (sol.cycle || '?'),
        sol.phase || '',
        formatMilestoneDate(sol.atp_date),
        formatMilestoneDate(sol.f2i_date),
        formatMilestoneDate(sol.orr_date),
        formatMilestoneDate(sol.closeout_date),
        formatDocStatus(sol.atp_memo),
        formatDocStatus(sol.f2i_memo),
        formatDocStatus(sol.orr_memo),
        formatDocStatus(sol.closeout_memo)
      ];
    });

    return {
      headers: headers,
      rows: rows,
      generated: new Date().toISOString(),
      count: rows.length,
      filters: options
    };

  } catch (e) {
    Logger.log('Error generating QuickLook data: ' + e.message);
    throw new Error('Failed to generate QuickLook report: ' + e.message);
  }
}

/**
 * Format milestone date for display
 * @param {string|Date} date - Date value
 * @returns {string} Formatted date or status
 */
function formatMilestoneDate(date) {
  if (!date) return '';

  try {
    var d = new Date(date);
    if (isNaN(d.getTime())) return '';

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    var formatted = formatDate_(d);

    // Add status indicator
    if (d < today) {
      return formatted + ' ✓';
    } else {
      return formatted;
    }
  } catch (e) {
    return String(date);
  }
}

/**
 * Format document status for display
 * @param {string|Date} status - Status value (empty, "in_work", or date)
 * @returns {string} Formatted status
 */
function formatDocStatus(status) {
  if (!status) return '—';

  var s = String(status).toLowerCase().trim();

  if (s === 'in_work' || s === 'in work' || s === 'in progress') {
    return 'In Work';
  }

  // Try to parse as date
  try {
    var d = new Date(status);
    if (!isNaN(d.getTime())) {
      return formatDate_(d) + ' ✓';
    }
  } catch (e) {}

  return status;
}

/**
 * Format date as MM/DD/YYYY
 */
function formatDate_(date) {
  var m = date.getMonth() + 1;
  var d = date.getDate();
  var y = date.getFullYear();
  return m + '/' + d + '/' + y;
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Generate QuickLook CSV string
 * @param {Object} options - Filter options
 * @returns {string} CSV formatted string
 */
function generateQuickLookCSV(options) {
  var data = generateQuickLookData(options);

  var lines = [];

  // Header row
  lines.push(data.headers.map(escapeCSV_).join(','));

  // Data rows
  data.rows.forEach(function(row) {
    lines.push(row.map(escapeCSV_).join(','));
  });

  return lines.join('\n');
}

/**
 * Escape CSV field
 */
function escapeCSV_(value) {
  if (value === null || value === undefined) return '';
  var str = String(value);
  if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Export QuickLook CSV to Google Drive
 * @param {Object} options - Filter options
 * @param {string} options.folderId - Optional folder ID to save to
 * @param {string} options.filename - Optional filename (default: QuickLook_YYYY-MM-DD.csv)
 * @returns {Object} { fileId, fileName, url }
 */
function exportQuickLookToGoogleDrive(options) {
  options = options || {};

  try {
    var csv = generateQuickLookCSV(options);

    // Generate filename
    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var fileName = options.filename || 'QuickLook_' + dateStr + '.csv';

    // Create file
    var blob = Utilities.newBlob(csv, 'text/csv', fileName);
    var file;

    if (options.folderId) {
      var folder = DriveApp.getFolderById(options.folderId);
      file = folder.createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }

    Logger.log('QuickLook CSV exported: ' + file.getName() + ' (' + file.getId() + ')');

    return {
      fileId: file.getId(),
      fileName: file.getName(),
      url: file.getUrl(),
      generated: today.toISOString(),
      rowCount: generateQuickLookData(options).count
    };

  } catch (e) {
    Logger.log('Error exporting QuickLook CSV: ' + e.message);
    throw new Error('Failed to export QuickLook CSV: ' + e.message);
  }
}

/**
 * Export QuickLook and send email notification
 * @param {Object} options - Export options
 * @param {string} options.email - Email address to notify
 * @param {string} options.subject - Optional email subject
 * @returns {Object} Export result with email status
 */
function exportQuickLookWithEmail(options) {
  options = options || {};

  if (!options.email) {
    throw new Error('Email address is required');
  }

  // Export file
  var result = exportQuickLookToGoogleDrive(options);

  // Send email
  var subject = options.subject || 'QuickLook Report Generated - ' + result.fileName;
  var body = 'A new QuickLook CSV report has been generated.\n\n' +
             'File: ' + result.fileName + '\n' +
             'Solutions: ' + result.rowCount + '\n' +
             'Generated: ' + result.generated + '\n\n' +
             'View file: ' + result.url;

  try {
    MailApp.sendEmail(options.email, subject, body);
    result.emailSent = true;
    result.emailTo = options.email;
  } catch (e) {
    Logger.log('Failed to send email: ' + e.message);
    result.emailSent = false;
    result.emailError = e.message;
  }

  return result;
}

// ============================================================================
// SCHEDULED EXPORT (for triggers)
// ============================================================================

/**
 * Scheduled QuickLook export
 * Call from a time-based trigger (e.g., weekly on Monday)
 */
function scheduledQuickLookExport() {
  try {
    // Get config values
    var folderId = getConfigValue('QUICKLOOK_FOLDER_ID');
    var notifyEmail = getConfigValue('QUICKLOOK_NOTIFY_EMAIL');

    var options = {
      defaultOnly: true
    };

    if (folderId) {
      options.folderId = folderId;
    }

    var result;
    if (notifyEmail) {
      options.email = notifyEmail;
      result = exportQuickLookWithEmail(options);
    } else {
      result = exportQuickLookToGoogleDrive(options);
    }

    Logger.log('Scheduled QuickLook export complete: ' + JSON.stringify(result));
    return result;

  } catch (e) {
    Logger.log('Scheduled QuickLook export failed: ' + e.message);
    throw e;
  }
}

// ============================================================================
// API FUNCTIONS (for frontend)
// ============================================================================

/**
 * Get QuickLook report data for display in UI
 * @param {Object} options - Filter options
 * @returns {Object} Report data
 */
function getQuickLookReport(options) {
  return JSON.parse(JSON.stringify(generateQuickLookData(options)));
}

/**
 * Download QuickLook CSV (returns download URL)
 * @param {Object} options - Filter options
 * @returns {Object} { url, fileName }
 */
function downloadQuickLookCSV(options) {
  var result = exportQuickLookToGoogleDrive(options);
  return {
    url: result.url,
    fileName: result.fileName,
    rowCount: result.rowCount
  };
}

// ============================================================================
// EXTENDED REPORTS
// ============================================================================

/**
 * Generate detailed milestone report with additional context
 * @param {Object} options - Filter options
 * @returns {Object} Extended report data
 */
function generateDetailedMilestoneReport(options) {
  options = options || {};

  var data = generateQuickLookData(options);
  var solutions = getAllSolutions();

  // Apply same filters
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

  // Calculate statistics
  var today = new Date();
  var stats = {
    total: solutions.length,
    byPhase: {},
    byCycle: {},
    milestonesUpcoming90: 0,
    milestonesOverdue: 0,
    milestonesCompleted: 0,
    documentsComplete: 0,
    documentsInWork: 0,
    documentsNotStarted: 0
  };

  solutions.forEach(function(sol) {
    // Phase counts
    var phase = sol.phase || 'Unknown';
    stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

    // Cycle counts
    var cycle = 'C' + (sol.cycle || '?');
    stats.byCycle[cycle] = (stats.byCycle[cycle] || 0) + 1;

    // Milestone analysis
    var milestones = [sol.atp_date, sol.f2i_date, sol.orr_date, sol.closeout_date];
    milestones.forEach(function(ms) {
      if (ms) {
        var msDate = new Date(ms);
        if (!isNaN(msDate.getTime())) {
          if (msDate < today) {
            stats.milestonesCompleted++;
          } else {
            var daysUntil = (msDate - today) / (1000 * 60 * 60 * 24);
            if (daysUntil <= 90) {
              stats.milestonesUpcoming90++;
            }
          }
        }
      }
    });

    // Document analysis
    var docs = [sol.atp_memo, sol.f2i_memo, sol.orr_memo, sol.closeout_memo,
                sol.project_plan, sol.science_sow, sol.ipa, sol.icd, sol.tta];
    docs.forEach(function(doc) {
      if (!doc) {
        stats.documentsNotStarted++;
      } else if (String(doc).toLowerCase() === 'in_work' || String(doc).toLowerCase() === 'in work') {
        stats.documentsInWork++;
      } else {
        stats.documentsComplete++;
      }
    });
  });

  return {
    headers: data.headers,
    rows: data.rows,
    stats: stats,
    generated: data.generated,
    count: data.count,
    filters: options
  };
}

// ============================================================================
// DETAILED MILESTONES EXPORT TO GOOGLE SHEET
// ============================================================================

/**
 * Export Detailed Milestones report to a new Google Sheet
 * Includes methodology and data source documentation
 * @param {Object} options - Report options
 * @returns {Object} { url, fileName, sheetId }
 */
function exportDetailedMilestonesToSheet(options) {
  options = options || {};

  try {
    var report = generateDetailedMilestoneReport(options);
    var solutions = getAllSolutions();

    // Create new spreadsheet
    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var fileName = 'DetailedMilestones_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);

    // Get source sheet URL
    var solutionsSheetUrl = '';
    try {
      var configSheetId = getProperty(CONFIG.CONFIG_SHEET_ID);
      if (configSheetId) {
        solutionsSheetUrl = 'https://docs.google.com/spreadsheets/d/' + configSheetId;
      }
    } catch (e) {}

    // ========================================
    // SHEET 1: Milestone Overview
    // ========================================
    var overviewSheet = newSS.getActiveSheet();
    overviewSheet.setName('Milestone Overview');

    var overviewData = [report.headers];
    report.rows.forEach(function(row) {
      overviewData.push(row);
    });

    overviewSheet.getRange(1, 1, overviewData.length, report.headers.length).setValues(overviewData);
    styleHeaderRow_(overviewSheet, report.headers.length);
    autoResizeColumns_(overviewSheet, report.headers.length);

    // ========================================
    // SHEET 2: Statistics Summary
    // ========================================
    var statsSheet = newSS.insertSheet('Statistics');

    var statsData = [
      ['MILESTONE STATISTICS', ''],
      ['', ''],
      ['Generated', today.toISOString()],
      ['Total Solutions', report.stats.total],
      ['', ''],
      ['BY PHASE', ''],
    ];

    Object.keys(report.stats.byPhase).forEach(function(phase) {
      statsData.push([phase, report.stats.byPhase[phase]]);
    });

    statsData.push(['', '']);
    statsData.push(['BY CYCLE', '']);

    Object.keys(report.stats.byCycle).sort().forEach(function(cycle) {
      statsData.push([cycle, report.stats.byCycle[cycle]]);
    });

    statsData.push(['', '']);
    statsData.push(['MILESTONE STATUS', '']);
    statsData.push(['Milestones Completed', report.stats.milestonesCompleted]);
    statsData.push(['Upcoming (90 days)', report.stats.milestonesUpcoming90]);
    statsData.push(['', '']);
    statsData.push(['DOCUMENT STATUS', '']);
    statsData.push(['Documents Complete', report.stats.documentsComplete]);
    statsData.push(['Documents In Work', report.stats.documentsInWork]);
    statsData.push(['Documents Not Started', report.stats.documentsNotStarted]);

    statsSheet.getRange(1, 1, statsData.length, 2).setValues(statsData);
    statsSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
    statsSheet.getRange(6, 1).setFontWeight('bold');
    autoResizeColumns_(statsSheet, 2);

    // ========================================
    // SHEET 3: Methodology & Data Sources
    // ========================================
    var methodSheet = newSS.insertSheet('Methodology & Data Sources');

    var methodData = [
      ['METHODOLOGY & DATA SOURCES', ''],
      ['', ''],
      ['This document explains how the Detailed Milestones report is generated.', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DATA SOURCE', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['MO-DB_Solutions', ''],
      ['   Total Records:', report.count + ' solutions'],
      ['   Source:', solutionsSheetUrl || 'Contact MO team for access'],
      ['   Description:', 'Master solution database maintained by MO team'],
      ['', ''],
      ['   Key Fields Used:', ''],
      ['   - name/solution_id: Solution identifier', ''],
      ['   - cycle: Project cycle (1-5)', ''],
      ['   - phase: Current lifecycle phase', ''],
      ['   - atp_date, f2i_date, orr_date, closeout_date: Milestone dates', ''],
      ['   - atp_memo, f2i_memo, orr_memo, closeout_memo: Document status', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['MILESTONE DATE INTERPRETATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Date with ✓:', 'Milestone date has passed (completed)'],
      ['Date without ✓:', 'Milestone is upcoming'],
      ['Empty:', 'Milestone date not yet scheduled'],
      ['', ''],
      ['Milestone Types:', ''],
      ['   ATP DG: Authority to Proceed Decision Gate', ''],
      ['   F2I DG: Formulation to Implementation Decision Gate', ''],
      ['   ORR: Operational Readiness Review', ''],
      ['   Closeout: Project closeout date', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DOCUMENT STATUS INTERPRETATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Date with ✓:', 'Document completed on that date'],
      ['In Work:', 'Document is being prepared'],
      ['— (dash):', 'Document not started or not applicable'],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['STATISTICS CALCULATIONS', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Milestones Completed:', 'Count of milestone dates in the past'],
      ['Upcoming (90 days):', 'Milestones with dates within next 90 days'],
      ['Documents Complete:', 'Fields with completion dates'],
      ['Documents In Work:', 'Fields marked "in_work" or "in work"'],
      ['Documents Not Started:', 'Empty document fields'],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SHEETS IN THIS WORKBOOK', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. Milestone Overview - All solutions with milestone and document status', ''],
      ['2. Statistics - Summary counts by phase, cycle, and status', ''],
      ['3. Methodology & Data Sources - This sheet', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['VERIFICATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['To verify any data in this report:', ''],
      ['', ''],
      ['1. Open MO-DB_Solutions (link above)', ''],
      ['2. Find the solution by name', ''],
      ['3. Compare milestone date columns with this report', ''],
      ['', ''],
      ['For questions, contact the MO team.', '']
    ];

    methodSheet.getRange(1, 1, methodData.length, 2).setValues(methodData);
    methodSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);

    // Make URL clickable
    if (solutionsSheetUrl) {
      methodSheet.getRange(11, 2).setFormula('=HYPERLINK("' + solutionsSheetUrl + '", "Click to open MO-DB_Solutions")');
    }

    methodSheet.setColumnWidth(1, 400);
    methodSheet.setColumnWidth(2, 400);

    // Move Methodology to last position (it's created last so already there)
    // Reorder: Milestone Overview first
    newSS.setActiveSheet(overviewSheet);
    newSS.moveActiveSheet(1);

    Logger.log('Detailed Milestones exported: ' + newSS.getUrl());

    return {
      url: newSS.getUrl(),
      fileName: fileName,
      sheetId: newSS.getId(),
      rowCount: report.count,
      sheets: ['Milestone Overview', 'Statistics', 'Methodology & Data Sources']
    };

  } catch (e) {
    Logger.log('Error exporting Detailed Milestones report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
}
