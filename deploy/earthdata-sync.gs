/**
 * Earthdata Solution Content Sync
 * ================================
 * Scrapes earthdata.nasa.gov solution pages to keep MO-DB_Solutions
 * in sync with the official source of truth.
 *
 * Features:
 * - Fetches solution pages from earthdata.nasa.gov
 * - Extracts: purpose_mission, thematic_areas, platform, resolution, etc.
 * - Updates MO-DB_Solutions columns
 * - Tracks changes and logs sync history
 *
 * Main Functions:
 * - syncAllSolutionContent() - Sync all solutions with earthdata URLs
 * - syncSolutionContent(solutionId) - Sync a single solution
 * - scheduledEarthdataSync() - Handler for time-based triggers
 *
 * @fileoverview Earthdata solution content synchronization
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var EARTHDATA_CONFIG = {
  // Base URL for solution pages
  baseUrl: 'https://www.earthdata.nasa.gov',

  // URL patterns for solution pages
  solutionPaths: {
    snwg: '/about/nasa-support-snwg/solutions/',
    esds: '/esds/'
  },

  // Column names in MO-DB_Solutions to update
  columns: {
    purpose_mission: 'purpose_mission',
    thematic_areas: 'thematic_areas',
    platform: 'platform',
    temporal_frequency: 'temporal_frequency',
    horizontal_resolution: 'horizontal_resolution',
    geographic_domain: 'geographic_domain',
    societal_impact: 'societal_impact',
    earthdata_url: 'snwg_solution_page_url',
    last_earthdata_sync: 'last_earthdata_sync'
  },

  // Request settings
  fetchTimeout: 30000,
  retryAttempts: 2,
  retryDelay: 2000
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

  var results = {
    timestamp: new Date().toISOString(),
    total: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
    updated: [],
    errors: []
  };

  try {
    var solutions = getAllSolutions();
    results.total = solutions.length;

    for (var i = 0; i < solutions.length; i++) {
      var sol = solutions[i];
      var url = sol.snwg_solution_page_url || sol.earthdata_url;

      if (!url || url.indexOf('earthdata.nasa.gov') === -1) {
        results.skipped++;
        continue;
      }

      try {
        var content = fetchSolutionContent(url);
        if (content && Object.keys(content).length > 0) {
          updateSolutionContent(sol.solution_id, content);
          results.synced++;
          results.updated.push(sol.name || sol.solution_id);
        } else {
          results.skipped++;
        }
      } catch (e) {
        results.failed++;
        results.errors.push({
          solution: sol.name || sol.solution_id,
          error: e.message
        });
        Logger.log('Error syncing ' + sol.name + ': ' + e.message);
      }

      // Rate limiting - pause between requests
      if (i < solutions.length - 1) {
        Utilities.sleep(1000);
      }
    }

    Logger.log('Sync complete: ' + results.synced + ' synced, ' +
               results.skipped + ' skipped, ' + results.failed + ' failed');

    // Store sync results
    storeSyncResults(results);

    return results;
  } catch (e) {
    Logger.log('Sync failed: ' + e.message);
    results.errors.push({ solution: 'ALL', error: e.message });
    return results;
  }
}

/**
 * Sync content for a single solution by ID
 * @param {string} solutionId - The solution ID to sync
 * @returns {Object} Sync result
 */
function syncSolutionContent(solutionId) {
  var sol = getSolution(solutionId);
  if (!sol) {
    throw new Error('Solution not found: ' + solutionId);
  }

  var url = sol.snwg_solution_page_url || sol.earthdata_url;
  if (!url) {
    throw new Error('No earthdata URL for solution: ' + solutionId);
  }

  var content = fetchSolutionContent(url);
  if (content && Object.keys(content).length > 0) {
    updateSolutionContent(solutionId, content);
    return { success: true, content: content };
  }

  return { success: false, message: 'No content extracted' };
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
  // Try to find the first major paragraph after the title
  // This is typically the purpose/mission statement

  // Pattern 1: Look for text between <p> tags near the start
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

  // Parse table rows
  var headerRow = tableHtml.match(/<t[hr][^>]*>([\s\S]*?)<\/t[hr]>/gi);
  if (!headerRow) return characteristics;

  // Extract headers
  var headers = [];
  var headerMatch = headerRow[0].match(/<th[^>]*>([^<]*)<\/th>/gi);
  if (headerMatch) {
    headerMatch.forEach(function(th) {
      var text = th.replace(/<[^>]+>/g, '').trim();
      headers.push(normalizeColumnName_(text));
    });
  }

  // Extract values from data rows
  var dataRows = tableHtml.match(/<tr[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?<\/tr>/gi);
  if (dataRows && dataRows.length > 0) {
    var cells = dataRows[0].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
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
// DATABASE UPDATE
// ============================================================================

/**
 * Update solution content in MO-DB_Solutions
 * @param {string} solutionId - The solution ID
 * @param {Object} content - The content to update
 */
function updateSolutionContent(solutionId, content) {
  try {
    var sheetId = getConfigValue('SOLUTIONS_SHEET_ID');
    if (!sheetId) {
      throw new Error('SOLUTIONS_SHEET_ID not configured');
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Find solution row
    var idColIndex = headers.indexOf('solution_id');
    if (idColIndex === -1) idColIndex = headers.indexOf('solutionId');
    if (idColIndex === -1) {
      throw new Error('solution_id column not found');
    }

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === solutionId) {
        rowIndex = i + 1; // 1-based for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Solution not found: ' + solutionId);
    }

    // Update content columns
    var columnsToUpdate = EARTHDATA_CONFIG.columns;
    var updates = {};

    Object.keys(content).forEach(function(key) {
      var colName = columnsToUpdate[key] || key;
      var colIndex = headers.indexOf(colName);

      if (colIndex === -1) {
        // Column doesn't exist - could add it, but for now log warning
        Logger.log('Column not found in sheet: ' + colName);
        return;
      }

      var value = content[key];
      if (value && value !== data[rowIndex - 1][colIndex]) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(value);
        updates[colName] = value;
      }
    });

    // Update sync timestamp
    var syncColIndex = headers.indexOf('last_earthdata_sync');
    if (syncColIndex !== -1) {
      sheet.getRange(rowIndex, syncColIndex + 1).setValue(new Date());
    }

    if (Object.keys(updates).length > 0) {
      Logger.log('Updated ' + solutionId + ': ' + Object.keys(updates).join(', '));
    }

    return updates;
  } catch (e) {
    Logger.log('Error updating solution content: ' + e.message);
    throw e;
  }
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

/**
 * Store sync results in config/log
 * @private
 */
function storeSyncResults(results) {
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty('LAST_EARTHDATA_SYNC', JSON.stringify({
      timestamp: results.timestamp,
      synced: results.synced,
      failed: results.failed
    }));
  } catch (e) {
    Logger.log('Could not store sync results: ' + e.message);
  }
}

/**
 * Get last sync info
 */
function getLastEarthdataSyncInfo() {
  try {
    var props = PropertiesService.getScriptProperties();
    var lastSync = props.getProperty('LAST_EARTHDATA_SYNC');
    if (lastSync) {
      return JSON.parse(lastSync);
    }
  } catch (e) {}
  return null;
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
  if (results.updated.length > 0 || results.errors.length > 0) {
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
// TESTING / DEBUG
// ============================================================================

/**
 * Test fetching a single solution page
 */
function testFetchSolution() {
  var testUrl = 'https://www.earthdata.nasa.gov/esds/harmonized-landsat-sentinel-2';
  var content = fetchSolutionContent(testUrl);
  Logger.log('Content: ' + JSON.stringify(content, null, 2));
  return content;
}

/**
 * Check sync status
 */
function checkEarthdataSyncStatus() {
  var lastSync = getLastEarthdataSyncInfo();
  var triggers = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'scheduledEarthdataSync';
  });

  return {
    lastSync: lastSync,
    triggerActive: triggers.length > 0,
    triggerCount: triggers.length
  };
}
