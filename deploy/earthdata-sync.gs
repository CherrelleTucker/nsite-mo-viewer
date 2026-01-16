/**
 * Earthdata Solution Content Sync (Container-Bound Version)
 * ==========================================================
 * Scrapes earthdata.nasa.gov solution pages to keep MO-DB_Solutions
 * in sync with the official source of truth.
 *
 * This script is designed to run as a container-bound script attached
 * to the MO-DB_Solutions Google Sheet.
 *
 * Features:
 * - Fetches solution pages from earthdata.nasa.gov
 * - Extracts: purpose_mission, thematic_areas, platform, resolution, etc.
 * - Updates sheet columns directly
 * - Tracks changes and logs sync history
 *
 * Main Functions:
 * - syncAllSolutionContent() - Sync all solutions with earthdata URLs
 * - syncSingleRow(rowNumber) - Sync a single row by row number
 * - scheduledEarthdataSync() - Handler for time-based triggers
 *
 * @fileoverview Earthdata solution content synchronization
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var EARTHDATA_CONFIG = {
  // Column names to look for in the sheet
  columns: {
    solution_id: 'solution_id',
    name: 'name',
    url: 'snwg_solution_page_url',
    purpose_mission: 'purpose_mission',
    thematic_areas: 'thematic_areas',
    platform: 'platform',
    temporal_frequency: 'temporal_frequency',
    horizontal_resolution: 'horizontal_resolution',
    geographic_domain: 'geographic_domain',
    societal_impact: 'societal_impact',
    last_sync: 'last_earthdata_sync'
  },

  // Request settings
  retryAttempts: 2,
  retryDelay: 2000,
  rateLimitMs: 1000
};

// ============================================================================
// MAIN SYNC FUNCTIONS
// ============================================================================

/**
 * Sync content for all solutions that have earthdata URLs
 * @returns {Object} Sync results summary
 */
function syncAllSolutionContent() {
  Logger.log('Starting earthdata content sync...');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Find column indices
  var cols = getColumnIndices_(headers);

  if (cols.url === -1) {
    Logger.log('ERROR: ' + EARTHDATA_CONFIG.columns.url + ' column not found');
    return { error: 'URL column not found' };
  }

  var results = {
    timestamp: new Date().toISOString(),
    total: data.length - 1,
    synced: 0,
    skipped: 0,
    failed: 0,
    updated: [],
    errors: []
  };

  // Process each row (skip header)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var url = row[cols.url];
    var name = row[cols.name] || row[cols.solution_id] || 'Row ' + (i + 1);

    if (!url || String(url).indexOf('earthdata.nasa.gov') === -1) {
      results.skipped++;
      continue;
    }

    try {
      var content = fetchSolutionContent(url);
      if (content && Object.keys(content).length > 0) {
        var updated = updateRowContent_(sheet, i + 1, cols, content);
        if (updated) {
          results.synced++;
          results.updated.push(name);
          Logger.log('Synced: ' + name);
        } else {
          results.skipped++;
        }
      } else {
        results.skipped++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push({ solution: name, error: e.message });
      Logger.log('Error syncing ' + name + ': ' + e.message);
    }

    // Rate limiting - pause between requests
    if (i < data.length - 1) {
      Utilities.sleep(EARTHDATA_CONFIG.rateLimitMs);
    }
  }

  Logger.log('Sync complete: ' + results.synced + ' synced, ' +
             results.skipped + ' skipped, ' + results.failed + ' failed');

  return results;
}

/**
 * Sync a single row by row number (1-based, including header)
 * @param {number} rowNumber - The row number to sync (2 = first data row)
 * @returns {Object} Sync result
 */
function syncSingleRow(rowNumber) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var cols = getColumnIndices_(headers);

  if (rowNumber < 2 || rowNumber > data.length) {
    throw new Error('Invalid row number: ' + rowNumber);
  }

  var row = data[rowNumber - 1];
  var url = row[cols.url];
  var name = row[cols.name] || row[cols.solution_id] || 'Row ' + rowNumber;

  if (!url || String(url).indexOf('earthdata.nasa.gov') === -1) {
    return { success: false, message: 'No earthdata URL for: ' + name };
  }

  var content = fetchSolutionContent(url);
  if (content && Object.keys(content).length > 0) {
    updateRowContent_(sheet, rowNumber, cols, content);
    return { success: true, solution: name, content: content };
  }

  return { success: false, message: 'No content extracted for: ' + name };
}

/**
 * Sync the currently selected row
 */
function syncSelectedRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var selection = sheet.getActiveRange();
  var rowNumber = selection.getRow();

  if (rowNumber < 2) {
    SpreadsheetApp.getUi().alert('Please select a data row (not the header)');
    return;
  }

  var result = syncSingleRow(rowNumber);

  if (result.success) {
    SpreadsheetApp.getUi().alert('Synced: ' + result.solution);
  } else {
    SpreadsheetApp.getUi().alert(result.message);
  }
}

// ============================================================================
// CONTENT FETCHING
// ============================================================================

/**
 * Fetch and parse content from an earthdata solution page
 * @param {string} url - The solution page URL
 * @returns {Object} Extracted content
 */
function fetchSolutionContent(url) {
  Logger.log('Fetching: ' + url);

  var html = fetchWithRetry_(url);
  if (!html) {
    return null;
  }

  return parseEarthdataPage_(html);
}

/**
 * Fetch URL with retry logic
 * @private
 */
function fetchWithRetry_(url) {
  var attempts = 0;

  while (attempts < EARTHDATA_CONFIG.retryAttempts) {
    try {
      var response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: true
      });

      var code = response.getResponseCode();
      if (code === 200) {
        return response.getContentText();
      } else if (code === 404) {
        Logger.log('Page not found: ' + url);
        return null;
      } else {
        throw new Error('HTTP ' + code);
      }
    } catch (e) {
      attempts++;
      if (attempts >= EARTHDATA_CONFIG.retryAttempts) {
        throw e;
      }
      Utilities.sleep(EARTHDATA_CONFIG.retryDelay);
    }
  }

  return null;
}

/**
 * Parse earthdata solution page HTML to extract content
 * @private
 */
function parseEarthdataPage_(html) {
  var content = {};

  // Extract purpose/mission - look for patterns in the page
  content.purpose_mission = extractPurposeMission_(html);
  content.societal_impact = extractSocietalImpact_(html);

  // Extract solution characteristics table
  var characteristics = extractCharacteristicsTable_(html);
  if (characteristics) {
    content.platform = characteristics.platform || characteristics.platforms || '';
    content.temporal_frequency = characteristics.temporal_frequency || '';
    content.horizontal_resolution = characteristics.horizontal_resolution || '';
    content.geographic_domain = characteristics.geographic_domain || characteristics.geographic_coverage || '';
    content.thematic_areas = characteristics.thematic_areas || '';
  }

  return content;
}

/**
 * Extract purpose/mission statement from page
 * @private
 */
function extractPurposeMission_(html) {
  // Pattern 1: Look for text between <p> tags near the start of article
  var match = html.match(/<article[^>]*>[\s\S]*?<p[^>]*>([^<]{100,500})<\/p>/i);
  if (match && match[1]) {
    return cleanText_(match[1]);
  }

  // Pattern 2: Look for meta description
  match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (match && match[1]) {
    return cleanText_(match[1]);
  }

  // Pattern 3: Look for "purpose" or "mission" text
  match = html.match(/(?:purpose|mission)[:\s]+([^<]{50,300})/i);
  if (match && match[1]) {
    return cleanText_(match[1]);
  }

  return '';
}

/**
 * Extract societal impact statement
 * @private
 */
function extractSocietalImpact_(html) {
  // Look for "Societal Impact" section
  var match = html.match(/Societal\s+Impact[\s\S]*?<p[^>]*>([^<]{50,500})<\/p>/i);
  if (match && match[1]) {
    return cleanText_(match[1]);
  }

  // Alternative pattern
  match = html.match(/societal\s+impact[:\s]+([^<]{50,300})/i);
  if (match && match[1]) {
    return cleanText_(match[1]);
  }

  return '';
}

/**
 * Extract solution characteristics from table
 * @private
 */
function extractCharacteristicsTable_(html) {
  var characteristics = {};

  // Look for "Solution Characteristics" table
  var tableMatch = html.match(/Solution\s+Characteristics[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    // Try alternative: look for key-value pairs in a section
    return extractCharacteristicsFromText_(html);
  }

  var tableHtml = tableMatch[1];

  // Parse table rows - look for header row
  var headerRow = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
  if (!headerRow) return characteristics;

  // Extract headers from th elements
  var headers = [];
  var headerCells = headerRow[1].match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
  if (headerCells) {
    headerCells.forEach(function(th) {
      var text = th.replace(/<[^>]+>/g, '').trim();
      headers.push(normalizeColumnName_(text));
    });
  }

  // Find data rows (rows with td elements)
  var dataRowMatch = tableHtml.match(/<tr[^>]*>[\s\S]*?<td[\s\S]*?<\/tr>/i);
  if (dataRowMatch) {
    var cells = dataRowMatch[0].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (cells) {
      cells.forEach(function(td, i) {
        var value = td.replace(/<[^>]+>/g, '').trim();
        if (headers[i] && value) {
          characteristics[headers[i]] = cleanText_(value);
        }
      });
    }
  }

  return characteristics;
}

/**
 * Extract characteristics from text patterns (fallback)
 * @private
 */
function extractCharacteristicsFromText_(html) {
  var characteristics = {};

  // Platform pattern
  var match = html.match(/Platform[s]?[:\s]+([^<\n]{5,100})/i);
  if (match) characteristics.platform = cleanText_(match[1]);

  // Temporal frequency pattern
  match = html.match(/Temporal\s+Frequency[:\s]+([^<\n]{5,50})/i);
  if (match) characteristics.temporal_frequency = cleanText_(match[1]);

  // Resolution patterns
  match = html.match(/(?:Horizontal\s+)?Resolution[:\s]+([^<\n]{5,50})/i);
  if (match) characteristics.horizontal_resolution = cleanText_(match[1]);

  // Geographic domain/coverage
  match = html.match(/Geographic\s+(?:Domain|Coverage)[:\s]+([^<\n]{5,100})/i);
  if (match) characteristics.geographic_domain = cleanText_(match[1]);

  // Thematic areas
  match = html.match(/Thematic\s+Areas?[:\s]+([^<\n]{10,200})/i);
  if (match) characteristics.thematic_areas = cleanText_(match[1]);

  return characteristics;
}

// ============================================================================
// SHEET UPDATE
// ============================================================================

/**
 * Get column indices from headers
 * @private
 */
function getColumnIndices_(headers) {
  var cfg = EARTHDATA_CONFIG.columns;
  return {
    solution_id: headers.indexOf(cfg.solution_id),
    name: headers.indexOf(cfg.name),
    url: headers.indexOf(cfg.url),
    purpose_mission: headers.indexOf(cfg.purpose_mission),
    thematic_areas: headers.indexOf(cfg.thematic_areas),
    platform: headers.indexOf(cfg.platform),
    temporal_frequency: headers.indexOf(cfg.temporal_frequency),
    horizontal_resolution: headers.indexOf(cfg.horizontal_resolution),
    geographic_domain: headers.indexOf(cfg.geographic_domain),
    societal_impact: headers.indexOf(cfg.societal_impact),
    last_sync: headers.indexOf(cfg.last_sync)
  };
}

/**
 * Update a row with synced content
 * @private
 */
function updateRowContent_(sheet, rowNum, cols, content) {
  var updated = false;

  if (cols.purpose_mission !== -1 && content.purpose_mission) {
    sheet.getRange(rowNum, cols.purpose_mission + 1).setValue(content.purpose_mission);
    updated = true;
  }
  if (cols.thematic_areas !== -1 && content.thematic_areas) {
    sheet.getRange(rowNum, cols.thematic_areas + 1).setValue(content.thematic_areas);
    updated = true;
  }
  if (cols.platform !== -1 && content.platform) {
    sheet.getRange(rowNum, cols.platform + 1).setValue(content.platform);
    updated = true;
  }
  if (cols.temporal_frequency !== -1 && content.temporal_frequency) {
    sheet.getRange(rowNum, cols.temporal_frequency + 1).setValue(content.temporal_frequency);
    updated = true;
  }
  if (cols.horizontal_resolution !== -1 && content.horizontal_resolution) {
    sheet.getRange(rowNum, cols.horizontal_resolution + 1).setValue(content.horizontal_resolution);
    updated = true;
  }
  if (cols.geographic_domain !== -1 && content.geographic_domain) {
    sheet.getRange(rowNum, cols.geographic_domain + 1).setValue(content.geographic_domain);
    updated = true;
  }
  if (cols.societal_impact !== -1 && content.societal_impact) {
    sheet.getRange(rowNum, cols.societal_impact + 1).setValue(content.societal_impact);
    updated = true;
  }
  if (cols.last_sync !== -1 && updated) {
    sheet.getRange(rowNum, cols.last_sync + 1).setValue(new Date());
  }

  return updated;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clean text by removing extra whitespace and HTML entities
 * @private
 */
function cleanText_(text) {
  if (!text) return '';

  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize column name to snake_case
 * @private
 */
function normalizeColumnName_(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ============================================================================
// SCHEDULED SYNC HANDLER
// ============================================================================

/**
 * Handler for scheduled sync trigger
 * Set up a time-based trigger in GAS to call this function
 */
function scheduledEarthdataSync() {
  Logger.log('Running scheduled earthdata sync...');
  var results = syncAllSolutionContent();

  // Send email summary if there were updates or errors
  if (results.updated && (results.updated.length > 0 || results.errors.length > 0)) {
    try {
      var email = Session.getActiveUser().getEmail();
      if (email) {
        var subject = 'Earthdata Sync: ' + results.synced + ' updated, ' + results.failed + ' failed';
        var body = 'Earthdata content sync completed.\n\n' +
                   'Synced: ' + results.synced + '\n' +
                   'Failed: ' + results.failed + '\n' +
                   'Skipped: ' + results.skipped + '\n\n';

        if (results.updated.length > 0) {
          body += 'Updated solutions:\n- ' + results.updated.join('\n- ') + '\n\n';
        }

        if (results.errors.length > 0) {
          body += 'Errors:\n';
          results.errors.forEach(function(err) {
            body += '- ' + err.solution + ': ' + err.error + '\n';
          });
        }

        MailApp.sendEmail(email, subject, body);
      }
    } catch (e) {
      Logger.log('Could not send email notification: ' + e.message);
    }
  }

  return results;
}

// ============================================================================
// MENU
// ============================================================================

/**
 * Add custom menu when spreadsheet opens
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Earthdata Sync')
    .addItem('Sync All Solutions', 'syncAllSolutionContent')
    .addItem('Sync Selected Row', 'syncSelectedRow')
    .addSeparator()
    .addItem('Test Single Fetch', 'testFetchSolution')
    .addToUi();
}

// ============================================================================
// TESTING / DEBUG
// ============================================================================

/**
 * Test fetching a single solution page
 */
function testFetchSolution() {
  var testUrl = 'https://www.earthdata.nasa.gov/esds/harmonized-landsat-sentinel-2';
  var content = fetchSolutionContent(testUrl);
  Logger.log('Content: ' + JSON.stringify(content, null, 2));

  var ui = SpreadsheetApp.getUi();
  if (content && Object.keys(content).length > 0) {
    ui.alert('Test Fetch Results',
             'Purpose: ' + (content.purpose_mission || 'Not found').substring(0, 100) + '...\n\n' +
             'Thematic Areas: ' + (content.thematic_areas || 'Not found') + '\n\n' +
             'Platform: ' + (content.platform || 'Not found'),
             ui.ButtonSet.OK);
  } else {
    ui.alert('Test Fetch', 'No content extracted from test URL', ui.ButtonSet.OK);
  }

  return content;
}
