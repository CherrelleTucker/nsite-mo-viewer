/**
 * MO-APIs Library - Configuration Helpers
 * ========================================
 * Shared configuration functions for all MO-Viewer APIs
 *
 * SETUP:
 * 1. Set CONFIG_SHEET_ID in Script Properties to point to MO-DB_Config
 * 2. MO-DB_Config sheet should have columns: key, value
 *
 * @fileoverview Configuration helpers for MO-APIs Library
 */

// ============================================================================
// CONFIGURATION CACHE
// ============================================================================

// Cache for config values (refreshed per execution)
var _configCache = null;

/**
 * Load all config values from MO-DB_Config sheet
 * Caches results for the duration of the script execution
 *
 * @returns {Object} Key-value map of config settings
 */
function loadConfigFromSheet() {
  if (_configCache !== null) {
    return _configCache;
  }

  var configSheetId = PropertiesService.getScriptProperties().getProperty('CONFIG_SHEET_ID');
  if (!configSheetId) {
    Logger.log('CONFIG_SHEET_ID not set in Script Properties');
    return {};
  }

  try {
    var ss = SpreadsheetApp.openById(configSheetId);
    var sheet = ss.getSheets()[0]; // First sheet
    var data = sheet.getDataRange().getValues();

    _configCache = {};

    // Skip header row, read key-value pairs
    for (var i = 1; i < data.length; i++) {
      var key = data[i][0];
      var value = data[i][1];
      if (key) {
        _configCache[key] = value || '';
      }
    }

    return _configCache;
  } catch (error) {
    Logger.log('Error loading config sheet: ' + error);
    return {};
  }
}

/**
 * Get a config value from MO-DB_Config sheet
 *
 * @param {string} key - Config key name
 * @returns {string} Config value or empty string
 */
function getConfigValue(key) {
  var config = loadConfigFromSheet();
  return config[key] || '';
}

/**
 * Get a database sheet by table name
 * Reads the sheet ID from MO-DB_Config
 *
 * @param {string} tableName - Table name (e.g., 'Solutions', 'Contacts')
 * @returns {Sheet} The sheet object
 */
function getDatabaseSheet(tableName) {
  var sheetIdKey = tableName.toUpperCase() + '_SHEET_ID';
  var sheetId = getConfigValue(sheetIdKey);

  if (!sheetId) {
    throw new Error('Sheet ID not configured for: ' + tableName +
                    '. Set ' + sheetIdKey + ' in MO-DB_Config.');
  }

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    return ss.getSheets()[0]; // Each database file has one sheet
  } catch (error) {
    throw new Error('Cannot open sheet for ' + tableName + ': ' + error.message);
  }
}

/**
 * Clear config cache
 * Call this if config values are updated during execution
 */
function clearConfigCache() {
  _configCache = null;
}

/**
 * Get a script property value
 * @param {string} key - Property key
 * @returns {string|null} Property value or null
 */
function getProperty(key) {
  try {
    return PropertiesService.getScriptProperties().getProperty(key);
  } catch (error) {
    Logger.log('Error getting property ' + key + ': ' + error);
    return null;
  }
}

/**
 * Set a script property value
 * @param {string} key - Property key
 * @param {string} value - Property value
 * @returns {boolean} Success status
 */
function setProperty(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
    return true;
  } catch (error) {
    Logger.log('Error setting property ' + key + ': ' + error);
    return false;
  }
}

// ============================================================================
// LIBRARY SETUP HELPERS
// ============================================================================

/**
 * Initialize the library - run once after adding to a project
 * Sets CONFIG_SHEET_ID if provided
 *
 * @param {string} configSheetId - ID of the MO-DB_Config Google Sheet
 */
function initializeLibrary(configSheetId) {
  if (configSheetId) {
    setProperty('CONFIG_SHEET_ID', configSheetId);
    Logger.log('CONFIG_SHEET_ID set to: ' + configSheetId);
  }

  // Clear cache to force reload
  clearConfigCache();

  // Verify connection
  var config = loadConfigFromSheet();
  var keys = Object.keys(config);
  Logger.log('Library initialized. Found ' + keys.length + ' config keys.');

  return {
    success: keys.length > 0,
    configKeys: keys
  };
}

/**
 * Test library configuration
 * @returns {Object} Status of all configured databases
 */
function testLibraryConfig() {
  var config = loadConfigFromSheet();
  var status = {
    configSheetId: getProperty('CONFIG_SHEET_ID') || 'NOT SET',
    databases: {}
  };

  var dbKeys = [
    'SOLUTIONS_SHEET_ID',
    'CONTACTS_SHEET_ID',
    'AGENCIES_SHEET_ID',
    'ENGAGEMENTS_SHEET_ID',
    'UPDATES_SHEET_ID',
    'NEEDS_SHEET_ID'
  ];

  dbKeys.forEach(function(key) {
    var id = config[key];
    if (id) {
      try {
        var ss = SpreadsheetApp.openById(id);
        status.databases[key] = {
          configured: true,
          name: ss.getName(),
          accessible: true
        };
      } catch (e) {
        status.databases[key] = {
          configured: true,
          accessible: false,
          error: e.message
        };
      }
    } else {
      status.databases[key] = {
        configured: false
      };
    }
  });

  return status;
}

// ============================================================================
// SHARED UTILITY FUNCTIONS
// ============================================================================
// These utilities eliminate code duplication across API files.
// See CLAUDE.md "AI Code Pitfall Prevention" for usage guidelines.

/**
 * Deep copy an object to prevent mutation of cached data
 * Use this instead of raw JSON.parse(JSON.stringify())
 *
 * @param {*} obj - Object to copy
 * @returns {*} Deep copy of the object
 */
function deepCopy(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Normalize a string for comparison (lowercase + trim)
 *
 * @param {*} str - String to normalize
 * @returns {string} Normalized string or empty string if null/undefined
 */
function normalizeString(str) {
  if (str === null || str === undefined) {
    return '';
  }
  return String(str).toLowerCase().trim();
}

/**
 * Create a standardized result object for write operations
 *
 * @param {boolean} success - Whether operation succeeded
 * @param {*} data - Result data (optional)
 * @param {string} error - Error message if failed (optional)
 * @returns {Object} Standardized result object
 */
function createResult(success, data, error) {
  var result = { success: success };
  if (data !== undefined && data !== null) {
    result.data = data;
  }
  if (error) {
    result.error = error;
  }
  return result;
}

/**
 * Filter an array by a single property value
 * Replaces repetitive filter functions across API files
 *
 * @param {Array} array - Array to filter
 * @param {string} property - Property name to filter on
 * @param {*} value - Value to match
 * @param {boolean} exactMatch - If true, requires exact match; if false, uses contains
 * @returns {Array} Filtered array (deep copy)
 */
function filterByProperty(array, property, value, exactMatch) {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  if (value === null || value === undefined || value === '') {
    return deepCopy(array);
  }

  var searchValue = normalizeString(value);
  exactMatch = exactMatch !== false; // Default to exact match

  var results = array.filter(function(item) {
    var itemValue = item[property];
    if (itemValue === null || itemValue === undefined) {
      return false;
    }
    var normalizedItem = normalizeString(itemValue);
    if (exactMatch) {
      return normalizedItem === searchValue;
    } else {
      return normalizedItem.includes(searchValue);
    }
  });

  return deepCopy(results);
}

/**
 * Filter an array by multiple property values (AND logic)
 * Replaces complex multi-filter functions
 *
 * @param {Array} array - Array to filter
 * @param {Object} criteria - Object with property:value pairs to match
 * @param {Object} options - Options: { exactMatch: true/false (default true) }
 * @returns {Array} Filtered array (deep copy)
 */
function filterByProperties(array, criteria, options) {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  if (!criteria || Object.keys(criteria).length === 0) {
    return deepCopy(array);
  }

  options = options || {};
  var exactMatch = options.exactMatch !== false; // Default to exact match

  var results = array.filter(function(item) {
    return Object.keys(criteria).every(function(property) {
      var searchValue = criteria[property];
      if (searchValue === null || searchValue === undefined || searchValue === '') {
        return true; // Skip empty criteria
      }

      var itemValue = item[property];
      if (itemValue === null || itemValue === undefined) {
        return false;
      }

      var normalizedItem = normalizeString(itemValue);
      var normalizedSearch = normalizeString(searchValue);

      if (exactMatch) {
        return normalizedItem === normalizedSearch;
      } else {
        return normalizedItem.includes(normalizedSearch);
      }
    });
  });

  return deepCopy(results);
}

// ============================================================================
// SHARED DATA LOADING
// ============================================================================

// Global cache store for sheet data
var _sheetDataCache = {};

/**
 * Load sheet data with automatic caching
 * Replaces the repetitive cache + getDataRange pattern in every API file
 *
 * @param {string} configKey - Config key for sheet ID (e.g., 'CONTACTS_SHEET_ID')
 * @param {string} cacheKey - Unique cache key (optional, defaults to configKey)
 * @returns {Array} Array of row objects with headers as keys
 */
function loadSheetData_(configKey, cacheKey) {
  cacheKey = cacheKey || configKey;

  // Return cached data if available
  if (_sheetDataCache[cacheKey]) {
    return _sheetDataCache[cacheKey];
  }

  var sheetId = getConfigValue(configKey);
  if (!sheetId) {
    throw new Error(configKey + ' not configured in MO-DB_Config');
  }

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length < 1) {
      _sheetDataCache[cacheKey] = [];
      return [];
    }

    var headers = data[0];
    var results = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};

      headers.forEach(function(header, j) {
        var value = row[j];
        // Convert Date objects to ISO strings for consistent handling
        if (value instanceof Date) {
          obj[header] = value.toISOString();
        } else {
          obj[header] = value;
        }
      });

      results.push(obj);
    }

    _sheetDataCache[cacheKey] = results;
    return results;

  } catch (e) {
    Logger.log('Error loading sheet data for ' + configKey + ': ' + e.message);
    throw e;
  }
}

/**
 * Clear cached sheet data
 *
 * @param {string} cacheKey - Specific cache key to clear, or omit to clear all
 */
function clearSheetDataCache(cacheKey) {
  if (cacheKey) {
    delete _sheetDataCache[cacheKey];
  } else {
    _sheetDataCache = {};
  }
}

/**
 * Get sheet for writing (not cached)
 *
 * @param {string} configKey - Config key for sheet ID
 * @returns {Object} { sheet: Sheet, headers: Array, sheetId: string }
 */
function getSheetForWrite_(configKey) {
  var sheetId = getConfigValue(configKey);
  if (!sheetId) {
    throw new Error(configKey + ' not configured in MO-DB_Config');
  }

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets()[0];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  return {
    sheet: sheet,
    headers: headers,
    sheetId: sheetId
  };
}

/**
 * Find a row by matching a field value
 *
 * @param {Sheet} sheet - Sheet to search
 * @param {Array} headers - Header row
 * @param {string} field - Field name to match
 * @param {*} value - Value to find
 * @returns {number} Row number (1-indexed) or -1 if not found
 */
function findRowByField_(sheet, headers, field, value) {
  var colIndex = headers.indexOf(field);
  if (colIndex === -1) {
    return -1;
  }

  var data = sheet.getDataRange().getValues();
  var searchValue = normalizeString(value);

  for (var i = 1; i < data.length; i++) {
    if (normalizeString(data[i][colIndex]) === searchValue) {
      return i + 1; // 1-indexed row number
    }
  }

  return -1;
}

// ============================================================================
// RESPONSE SIZE MONITORING
// ============================================================================

/**
 * Log response size and warn if approaching google.script.run limit (~5MB)
 * Call this before returning large data from API functions
 *
 * @param {*} data - Data to check size of
 * @param {string} functionName - Name of the calling function for logging
 * @returns {*} The same data (allows chaining)
 */
function logResponseSize(data, functionName) {
  try {
    var jsonSize = JSON.stringify(data).length;
    var sizeMB = (jsonSize / (1024 * 1024)).toFixed(2);
    var sizeKB = (jsonSize / 1024).toFixed(1);

    if (jsonSize > 4 * 1024 * 1024) {
      Logger.log('WARNING: ' + functionName + ' response approaching 5MB limit! Size: ' + sizeMB + ' MB');
    } else if (jsonSize > 2 * 1024 * 1024) {
      Logger.log('NOTICE: ' + functionName + ' response is large: ' + sizeMB + ' MB');
    } else if (jsonSize > 500 * 1024) {
      Logger.log(functionName + ' response size: ' + sizeKB + ' KB');
    }
    // Don't log for small responses
  } catch (e) {
    Logger.log('Error checking response size for ' + functionName + ': ' + e.message);
  }

  return data;
}

// ============================================================================
// ARRAY UTILITY HELPERS
// ============================================================================

/**
 * Count occurrences by field value
 * Useful for statistics aggregation (e.g., count contacts by department)
 *
 * @param {Array} array - Array of objects
 * @param {string} fieldName - Field to count by
 * @returns {Object} Map of {fieldValue: count}
 */
function countByField(array, fieldName) {
  if (!array || !Array.isArray(array)) return {};

  var counts = {};
  array.forEach(function(item) {
    var value = item[fieldName];
    if (value !== undefined && value !== null && value !== '') {
      var key = String(value);
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Get unique values from array by field
 *
 * @param {Array} array - Array of objects
 * @param {string} fieldName - Field to get unique values from
 * @returns {Array} Array of unique values (sorted)
 */
function getUniqueValues(array, fieldName) {
  if (!array || !Array.isArray(array)) return [];

  var seen = {};
  var unique = [];
  array.forEach(function(item) {
    var value = item[fieldName];
    if (value !== undefined && value !== null && value !== '' && !seen[value]) {
      seen[value] = true;
      unique.push(value);
    }
  });
  return unique.sort();
}

/**
 * Find item by ID field
 * Returns deep copy to prevent mutation
 *
 * @param {Array} array - Array of objects
 * @param {string} idField - Name of the ID field
 * @param {*} id - ID value to find
 * @returns {Object|null} Found item (deep copy) or null
 */
function getById(array, idField, id) {
  if (!array || !Array.isArray(array) || !id) return null;

  var item = array.find(function(obj) {
    return obj[idField] === id;
  });

  return item ? deepCopy(item) : null;
}

/**
 * Deduplicate array by field (keeps first occurrence)
 *
 * @param {Array} array - Array of objects
 * @param {string} fieldName - Field to deduplicate by
 * @param {boolean} caseInsensitive - Whether to ignore case (default: true)
 * @returns {Array} Deduplicated array
 */
function deduplicateByField(array, fieldName, caseInsensitive) {
  if (!array || !Array.isArray(array)) return [];
  if (caseInsensitive === undefined) caseInsensitive = true;

  var seen = {};
  return array.filter(function(item) {
    var value = item[fieldName];
    if (value === undefined || value === null || value === '') return false;

    var key = caseInsensitive ? String(value).toLowerCase() : String(value);
    if (seen[key]) return false;

    seen[key] = true;
    return true;
  });
}
