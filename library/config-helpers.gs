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
