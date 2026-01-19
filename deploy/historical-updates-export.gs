/**
 * Historical Updates Export
 * =========================
 * Export functionality for Historical Updates report.
 * Creates multi-tab Google Sheet with methodology documentation.
 *
 * @fileoverview Historical Updates report export to Google Sheets
 */

// ============================================================================
// HISTORICAL UPDATES EXPORT TO GOOGLE SHEET
// ============================================================================

/**
 * Export Historical Updates report to a new Google Sheet
 * @param {Object} options - Report options
 * @returns {Object} { url, fileName, sheetId }
 */
function exportHistoricalUpdatesToSheet(options) {
  options = options || {};

  try {
    var report = getAllHistoricalUpdatesForReport();
    // report = { solutions: [{ name, updates, updateCount }], stats: {...} }

    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var fileName = 'HistoricalUpdates_' + dateStr;
    var newSS = SpreadsheetApp.create(fileName);

    // Get source URL
    var updatesSheetUrl = '';
    try {
      var updatesSheetId = getConfigValue('UPDATES_SHEET_ID');
      if (updatesSheetId) {
        updatesSheetUrl = 'https://docs.google.com/spreadsheets/d/' + updatesSheetId;
      }
    } catch (e) {}

    // ========================================
    // SHEET 1: All Updates
    // ========================================
    var updatesSheet = newSS.getActiveSheet();
    updatesSheet.setName('All Updates');

    var updatesHeaders = ['Solution', 'Date', 'Update Type', 'Meeting Type', 'Update Text'];
    var updatesData = [updatesHeaders];

    var totalUpdates = 0;
    var solutionsList = report.solutions || [];

    solutionsList.forEach(function(solObj) {
      var solName = solObj.name || 'Unknown';
      var updates = solObj.updates || [];
      updates.forEach(function(u) {
        updatesData.push([
          solName,
          u.meeting_date || u.date || '',
          u.update_type || u.type || '',
          u.source_document || u.meeting_type || '',
          u.update_text || u.text || ''
        ]);
        totalUpdates++;
      });
    });

    updatesSheet.getRange(1, 1, updatesData.length, updatesHeaders.length).setValues(updatesData);
    styleHeaderRow_(updatesSheet, updatesHeaders.length);
    autoResizeColumns_(updatesSheet, updatesHeaders.length);

    // ========================================
    // SHEET 2: By Solution Summary
    // ========================================
    var summarySheet = newSS.insertSheet('By Solution');

    var summaryHeaders = ['Solution', 'Total Updates', 'Latest Update Date', 'Update Types'];
    var summaryData = [summaryHeaders];

    solutionsList.forEach(function(solObj) {
      var solName = solObj.name || 'Unknown';
      var updates = solObj.updates || [];
      var types = {};
      var latestDate = '';

      updates.forEach(function(u) {
        var uType = u.update_type || u.type || '';
        if (uType) types[uType] = true;
        var uDate = u.meeting_date || u.date || '';
        if (uDate && uDate > latestDate) latestDate = uDate;
      });

      summaryData.push([
        solName,
        updates.length,
        latestDate,
        Object.keys(types).join(', ')
      ]);
    });

    summarySheet.getRange(1, 1, summaryData.length, summaryHeaders.length).setValues(summaryData);
    styleHeaderRow_(summarySheet, summaryHeaders.length);
    autoResizeColumns_(summarySheet, summaryHeaders.length);

    // ========================================
    // SHEET 3: Methodology & Data Sources
    // ========================================
    var methodSheet = newSS.insertSheet('Methodology & Data Sources');

    var methodData = [
      ['METHODOLOGY & DATA SOURCES', ''],
      ['', ''],
      ['This document explains how the Historical Updates report is generated.', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DATA SOURCE', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['MO-DB_Updates', ''],
      ['   Description:', 'Solution updates from weekly meeting notes'],
      ['   Source:', updatesSheetUrl || 'Contact MO team for access'],
      ['', ''],
      ['   Key Fields Used:', ''],
      ['   - solution: Solution the update relates to', ''],
      ['   - date: Date of the update/meeting', ''],
      ['   - type: Update type (milestone, action, general)', ''],
      ['   - meeting_type: Meeting source (internal-planning, sep-strategy)', ''],
      ['   - update_text: The actual update content', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['DATA COLLECTION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Updates are collected from two sources:', ''],
      ['', ''],
      ['1. Quick Update Form', ''],
      ['   - Users submit updates via the MO-Viewer Quick Update page', ''],
      ['   - Updates are automatically added to meeting notes documents', ''],
      ['   - Updates sync back to MO-DB_Updates database', ''],
      ['', ''],
      ['2. Meeting Notes Sync', ''],
      ['   - Weekly meeting notes are parsed for solution updates', ''],
      ['   - Updates tagged by solution and meeting type', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['UPDATE TYPES', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['milestone:', 'Major project milestone achieved or scheduled'],
      ['action:', 'Action item requiring follow-up'],
      ['general:', 'General status update or information'],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SUMMARY STATISTICS', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['Total Updates:', totalUpdates],
      ['Solutions with Updates:', solutionsList.length],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['SHEETS IN THIS WORKBOOK', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['1. All Updates - Complete list of all updates by solution', ''],
      ['2. By Solution - Summary count per solution', ''],
      ['3. Methodology & Data Sources - This sheet', ''],
      ['', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['VERIFICATION', ''],
      ['═══════════════════════════════════════════════════════════════════════', ''],
      ['', ''],
      ['To verify any data in this report:', ''],
      ['', ''],
      ['1. Open MO-DB_Updates (link above)', ''],
      ['2. Filter by solution name', ''],
      ['3. Compare update text and dates', ''],
      ['', ''],
      ['For questions, contact the MO team.', '']
    ];

    methodSheet.getRange(1, 1, methodData.length, 2).setValues(methodData);
    methodSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);

    if (updatesSheetUrl) {
      methodSheet.getRange(11, 2).setFormula('=HYPERLINK("' + updatesSheetUrl + '", "Click to open MO-DB_Updates")');
    }

    methodSheet.setColumnWidth(1, 400);
    methodSheet.setColumnWidth(2, 400);

    newSS.setActiveSheet(updatesSheet);
    newSS.moveActiveSheet(1);

    return {
      url: newSS.getUrl(),
      fileName: fileName,
      sheetId: newSS.getId(),
      totalUpdates: totalUpdates,
      solutionCount: solutionsList.length,
      sheets: ['All Updates', 'By Solution', 'Methodology & Data Sources']
    };

  } catch (e) {
    Logger.log('Error exporting Historical Updates report: ' + e.message);
    throw new Error('Failed to export report: ' + e.message);
  }
}

// Note: styleHeaderRow_ and autoResizeColumns_ are now in export-helpers.gs
