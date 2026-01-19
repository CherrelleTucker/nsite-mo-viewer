/**
 * Export Helpers
 * ===============
 * Shared utility functions for report exports to Google Sheets.
 * Used by: stakeholder-solution-alignment.gs, quicklook-generator.gs, historical-updates-export.gs
 *
 * @fileoverview Common export utilities for MO-Viewer reports
 */

// ============================================================================
// SPREADSHEET CREATION
// ============================================================================

/**
 * Create a new spreadsheet for export with timestamp filename
 * @param {string} reportName - Base name for the report (e.g., 'NeedAlignment', 'DepartmentReach')
 * @returns {Object} { spreadsheet: Spreadsheet, fileName: string, dateStr: string }
 */
function createExportSpreadsheet(reportName) {
  var today = new Date();
  var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  var fileName = reportName + '_' + dateStr;
  var spreadsheet = SpreadsheetApp.create(fileName);

  return {
    spreadsheet: spreadsheet,
    fileName: fileName,
    dateStr: dateStr
  };
}

// ============================================================================
// SHEET STYLING
// ============================================================================

/**
 * Style the header row of a sheet
 * @param {Sheet} sheet - The sheet to style
 * @param {number} colCount - Number of columns in the header
 */
function styleHeaderRow_(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a5568');
  headerRange.setFontColor('#ffffff');
}

/**
 * Auto-resize all columns in a sheet
 * @param {Sheet} sheet - The sheet to resize
 * @param {number} colCount - Number of columns to resize
 */
function autoResizeColumns_(sheet, colCount) {
  for (var i = 1; i <= colCount; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Apply standard data formatting to a sheet
 * @param {Sheet} sheet - The sheet to format
 * @param {number} colCount - Number of columns
 */
function formatDataSheet_(sheet, colCount) {
  styleHeaderRow_(sheet, colCount);
  autoResizeColumns_(sheet, colCount);
  sheet.setFrozenRows(1);
}

// ============================================================================
// SOURCE URL HELPERS
// ============================================================================

/**
 * Get a Google Sheets URL from a config key
 * @param {string} configKey - The config key (e.g., 'SOLUTIONS_SHEET_ID', 'CONTACTS_SHEET_ID')
 * @returns {string} The full URL or empty string if not found
 */
function getSourceSheetUrl(configKey) {
  try {
    var sheetId = getConfigValue(configKey);
    if (sheetId) {
      return 'https://docs.google.com/spreadsheets/d/' + sheetId;
    }
  } catch (e) {
    Logger.log('Could not get sheet URL for ' + configKey + ': ' + e.message);
  }
  return '';
}

/**
 * Get multiple source URLs at once
 * @param {Array<string>} configKeys - Array of config keys
 * @returns {Object} Map of configKey to URL
 */
function getSourceSheetUrls(configKeys) {
  var urls = {};
  configKeys.forEach(function(key) {
    urls[key] = getSourceSheetUrl(key);
  });
  return urls;
}

// ============================================================================
// METHODOLOGY SHEET HELPERS
// ============================================================================

/**
 * Create a standard methodology sheet with consistent formatting
 * @param {Spreadsheet} spreadsheet - The spreadsheet to add the sheet to
 * @param {Array<Array>} methodData - 2D array of methodology content (col1: label, col2: value)
 * @param {Object} options - Optional settings { sheetName: string, col1Width: number, col2Width: number }
 * @returns {Sheet} The created methodology sheet
 */
function createMethodologySheet_(spreadsheet, methodData, options) {
  options = options || {};
  var sheetName = options.sheetName || 'Methodology & Data Sources';
  var col1Width = options.col1Width || 400;
  var col2Width = options.col2Width || 400;

  var methodSheet = spreadsheet.insertSheet(sheetName);

  methodSheet.getRange(1, 1, methodData.length, 2).setValues(methodData);
  methodSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);

  methodSheet.setColumnWidth(1, col1Width);
  methodSheet.setColumnWidth(2, col2Width);

  return methodSheet;
}

/**
 * Generate standard methodology header section
 * @param {string} title - Report title
 * @param {string} description - Brief description of the report
 * @returns {Array<Array>} Methodology header rows
 */
function getMethodologyHeader_(title, description) {
  return [
    ['METHODOLOGY & DATA SOURCES', ''],
    ['', ''],
    [description, ''],
    ['', ''],
    ['═══════════════════════════════════════════════════════════════════════', '']
  ];
}

/**
 * Generate standard data sources section
 * @param {Array<Object>} sources - Array of { name, description, url, fields }
 * @returns {Array<Array>} Data sources rows
 */
function getMethodologyDataSources_(sources) {
  var rows = [
    ['DATA SOURCES', ''],
    ['═══════════════════════════════════════════════════════════════════════', ''],
    ['', '']
  ];

  sources.forEach(function(source) {
    rows.push([source.name, '']);
    rows.push(['   Description:', source.description || '']);
    if (source.url) {
      rows.push(['   Source:', source.url]);
    }
    if (source.fields && source.fields.length > 0) {
      rows.push(['', '']);
      rows.push(['   Key Fields Used:', '']);
      source.fields.forEach(function(field) {
        rows.push(['   - ' + field.name + ':', field.description || '']);
      });
    }
    rows.push(['', '']);
  });

  return rows;
}

/**
 * Generate standard verification section
 * @param {Array<string>} steps - Verification steps
 * @returns {Array<Array>} Verification rows
 */
function getMethodologyVerification_(steps) {
  var rows = [
    ['═══════════════════════════════════════════════════════════════════════', ''],
    ['VERIFICATION', ''],
    ['═══════════════════════════════════════════════════════════════════════', ''],
    ['', ''],
    ['To verify any data in this report:', ''],
    ['', '']
  ];

  steps.forEach(function(step, index) {
    rows.push([(index + 1) + '. ' + step, '']);
  });

  rows.push(['', '']);
  rows.push(['For questions, contact the MO team.', '']);

  return rows;
}

// ============================================================================
// EXPORT RESULT HELPERS
// ============================================================================

/**
 * Build standard export result object
 * @param {Spreadsheet} spreadsheet - The created spreadsheet
 * @param {string} fileName - The file name
 * @param {Object} stats - Report-specific statistics
 * @param {Array<string>} sheetNames - Names of sheets in the workbook
 * @returns {Object} Standard export result
 */
function buildExportResult_(spreadsheet, fileName, stats, sheetNames) {
  var result = {
    url: spreadsheet.getUrl(),
    fileName: fileName,
    sheetId: spreadsheet.getId(),
    sheets: sheetNames || []
  };

  // Merge in any report-specific stats
  if (stats) {
    for (var key in stats) {
      if (stats.hasOwnProperty(key)) {
        result[key] = stats[key];
      }
    }
  }

  return result;
}
