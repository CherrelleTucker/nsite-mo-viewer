/**
 * MO-Viewer Platform - Main Entry Point
 * ======================================
 * Unified dashboard for NSITE MO (NASA's Support to the satellite Needs
 * working group Implementation TEam Management Office)
 *
 * Components:
 * - Implementation-Viewer: Solution/Project focused (Internal Agenda)
 * - SEP-Viewer: People/Stakeholder focused (SEP Agenda)
 * - Comms-Viewer: Story/Communications focused (Comms Tracking)
 * - Quick Update Form: Input interface for all sources
 *
 * @fileoverview Main routing and configuration for MO-Viewer platform
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Script Property Keys
 * Only CONFIG_SHEET_ID is stored in Script Properties.
 * All other IDs are read from the MO-DB_Config sheet.
 */
var CONFIG = {
  // The only Script Property needed - points to MO-DB_Config sheet
  CONFIG_SHEET_ID: 'CONFIG_SHEET_ID',

  // Admin (still in Script Properties for security)
  ADMIN_EMAIL: 'ADMIN_EMAIL',
  WHITELIST: 'APPROVED_USERS_WHITELIST'
};

/**
 * Config keys stored in MO-DB_Config sheet
 */
var CONFIG_KEYS = {
  // Document IDs
  INTERNAL_AGENDA_ID: 'INTERNAL_AGENDA_ID',
  SEP_AGENDA_ID: 'SEP_AGENDA_ID',
  COMMS_TRACKING_ID: 'COMMS_TRACKING_ID',

  // Database Sheet IDs
  SOLUTIONS_SHEET_ID: 'SOLUTIONS_SHEET_ID',
  CONTACTS_SHEET_ID: 'CONTACTS_SHEET_ID',
  CONTACT_SOLUTIONS_SHEET_ID: 'CONTACT_SOLUTIONS_SHEET_ID',
  ACTIONS_SHEET_ID: 'ACTIONS_SHEET_ID',
  MILESTONES_SHEET_ID: 'MILESTONES_SHEET_ID',
  UPDATE_HISTORY_SHEET_ID: 'UPDATE_HISTORY_SHEET_ID'
};

// Cache for config values (refreshed per execution)
var _configCache = null;

/**
 * Valid page routes
 */
var PAGES = {
  'implementation': {
    title: 'Implementation',
    template: 'implementation-viewer/implementation',
    icon: 'folder'
  },
  'sep': {
    title: 'SEP',
    template: 'sep-viewer/sep',
    icon: 'users'
  },
  'comms': {
    title: 'Comms',
    template: 'comms-viewer/comms',
    icon: 'message-square'
  },
  'quick-update': {
    title: 'Quick Update',
    template: 'quick-update/quick-update',
    icon: 'edit'
  },
  'contacts': {
    title: 'Contacts',
    template: 'shared/contacts',
    icon: 'book'
  },
  'reports': {
    title: 'Reports',
    template: 'shared/reports',
    icon: 'file-text'
  },
  'schedule': {
    title: 'Schedule',
    template: 'shared/schedule',
    icon: 'calendar'
  },
  'actions': {
    title: 'Actions',
    template: 'shared/actions',
    icon: 'check-square'
  }
};

/**
 * Default page to show
 */
var DEFAULT_PAGE = 'implementation';

// ============================================================================
// WEB APP ENTRY POINT
// ============================================================================

/**
 * Web App entry point - handles all GET requests
 * Routes to appropriate page based on URL parameter
 *
 * URLs:
 * - Main: https://script.google.com/.../exec
 * - Implementation: https://script.google.com/.../exec?page=implementation
 * - SEP: https://script.google.com/.../exec?page=sep
 * - Comms: https://script.google.com/.../exec?page=comms
 * - Quick Update: https://script.google.com/.../exec?page=quick-update
 *
 * @param {Object} e - Event object with URL parameters
 * @returns {HtmlOutput} Rendered HTML page
 */
function doGet(e) {
  var page = e.parameter.page || DEFAULT_PAGE;

  // Validate page exists
  if (!PAGES[page]) {
    page = DEFAULT_PAGE;
  }

  try {
    var template = HtmlService.createTemplateFromFile('platform/index');
    template.activePage = page;
    template.pageConfig = PAGES[page];
    template.allPages = PAGES;

    return template.evaluate()
      .setTitle('MO-Viewer | NSITE MO Dashboard')
      .setFaviconUrl('https://www.nasa.gov/favicon.ico')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log('Error in doGet: ' + error);
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family: Arial; padding: 40px;">' +
      '<h1>MO-Viewer Error</h1>' +
      '<p>Failed to load page: ' + page + '</p>' +
      '<p>Error: ' + error.message + '</p>' +
      '</body></html>'
    );
  }
}

// ============================================================================
// HTML INCLUDES
// ============================================================================

/**
 * Include HTML file content (for templating)
 * Allows <?!= include('filename') ?> syntax in HTML templates
 *
 * @param {string} filename - Path to HTML file (without .html extension)
 * @returns {string} HTML content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Include CSS file content wrapped in style tags
 *
 * @param {string} filename - Path to CSS file (without .css extension)
 * @returns {string} CSS content wrapped in <style> tags
 */
function includeCSS(filename) {
  var content = HtmlService.createHtmlOutputFromFile(filename).getContent();
  return '<style>' + content + '</style>';
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Get a script property value
 *
 * @param {string} key - Property key from CONFIG
 * @returns {string|null} Property value or null if not set
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
 *
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
// CONFIG SHEET HELPERS
// ============================================================================

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

  var configSheetId = getProperty(CONFIG.CONFIG_SHEET_ID);
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
 * Get a document ID from config
 * Wrapper for common document ID lookups
 *
 * @param {string} docType - Document type: 'internal', 'sep', or 'comms'
 * @returns {string} Document ID or empty string
 */
function getDocumentId(docType) {
  var keyMap = {
    'internal': CONFIG_KEYS.INTERNAL_AGENDA_ID,
    'sep': CONFIG_KEYS.SEP_AGENDA_ID,
    'comms': CONFIG_KEYS.COMMS_TRACKING_ID
  };

  var key = keyMap[docType];
  if (!key) {
    Logger.log('Unknown document type: ' + docType);
    return '';
  }

  return getConfigValue(key);
}

/**
 * Get platform configuration for client-side use
 * Returns only safe-to-expose configuration values
 *
 * @returns {Object} Platform configuration
 */
function getPlatformConfig() {
  var config = loadConfigFromSheet();

  return {
    pages: PAGES,
    defaultPage: DEFAULT_PAGE,
    baseUrl: ScriptApp.getService().getUrl(),
    configured: {
      configSheet: !!getProperty(CONFIG.CONFIG_SHEET_ID),
      internalPlanning: !!config[CONFIG_KEYS.INTERNAL_AGENDA_ID],
      sepStrategy: !!config[CONFIG_KEYS.SEP_AGENDA_ID],
      commsTracking: !!config[CONFIG_KEYS.COMMS_TRACKING_ID],
      solutionsDb: !!config[CONFIG_KEYS.SOLUTIONS_SHEET_ID]
    }
  };
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

/**
 * Get admin email from Script Properties
 *
 * @returns {string} Admin email address
 */
function getAdminEmail() {
  var stored = getProperty(CONFIG.ADMIN_EMAIL);
  if (!stored) {
    var currentUserEmail = Session.getEffectiveUser().getEmail();
    if (currentUserEmail) {
      setProperty(CONFIG.ADMIN_EMAIL, currentUserEmail.toLowerCase().trim());
      return currentUserEmail;
    }
    return 'admin@example.com';
  }
  return stored;
}

/**
 * Get whitelist of authorized users
 *
 * @returns {string[]} Array of authorized email addresses
 */
function getWhitelist() {
  var stored = getProperty(CONFIG.WHITELIST);
  if (!stored) {
    var adminEmail = getAdminEmail();
    var initialList = [adminEmail];
    setProperty(CONFIG.WHITELIST, JSON.stringify(initialList));
    return initialList;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [getAdminEmail()];
  }
}

/**
 * Check if current user is authorized
 *
 * @returns {Object} {authorized: boolean, email: string, message: string}
 */
function checkAuthorization() {
  var userEmail = Session.getEffectiveUser().getEmail().toLowerCase().trim();
  var whitelist = getWhitelist().map(function(e) { return e.toLowerCase().trim(); });
  var isAuthorized = whitelist.indexOf(userEmail) !== -1;

  if (!isAuthorized) {
    Logger.log('Unauthorized access attempt: ' + userEmail);
    return {
      authorized: false,
      email: userEmail,
      message: 'Access denied. Contact ' + getAdminEmail() + ' for access.'
    };
  }

  return {
    authorized: true,
    email: userEmail,
    message: 'Authorized'
  };
}

/**
 * Get current user info for display
 *
 * @returns {Object} User information
 */
function getCurrentUser() {
  var email = Session.getEffectiveUser().getEmail();
  return {
    email: email,
    isAdmin: email.toLowerCase() === getAdminEmail().toLowerCase()
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current date info for display
 *
 * @returns {Object} Date information
 */
function getDateInfo() {
  var now = new Date();
  return {
    current: now.toISOString(),
    formatted: Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMMM d, yyyy'),
    dayOfWeek: Utilities.formatDate(now, Session.getScriptTimeZone(), 'EEEE'),
    nextMonday: getNextMondayFormatted()
  };
}

/**
 * Get next Monday's date formatted as MM_DD
 * Used for finding meeting notes tabs
 *
 * @returns {string} Next Monday as MM_DD
 */
function getNextMondayFormatted() {
  var today = new Date();
  var dayOfWeek = today.getDay();
  var daysUntilMonday;

  if (dayOfWeek === 1) {
    daysUntilMonday = 0; // Today is Monday
  } else if (dayOfWeek === 0) {
    daysUntilMonday = 1; // Sunday -> Monday
  } else {
    daysUntilMonday = 8 - dayOfWeek; // Other days -> next Monday
  }

  var nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  var month = String(nextMonday.getMonth() + 1).padStart(2, '0');
  var day = String(nextMonday.getDate()).padStart(2, '0');
  return month + '_' + day;
}

// ============================================================================
// SETUP FUNCTIONS (Run once during deployment)
// ============================================================================

/**
 * Initialize platform - run once after deployment
 * Sets up admin email and initial whitelist
 */
function initializePlatform() {
  var adminEmail = Session.getEffectiveUser().getEmail();
  setProperty(CONFIG.ADMIN_EMAIL, adminEmail.toLowerCase().trim());

  var whitelist = [adminEmail.toLowerCase().trim()];
  setProperty(CONFIG.WHITELIST, JSON.stringify(whitelist));

  Logger.log('Platform initialized. Admin: ' + adminEmail);
}

/**
 * Configure the Config Sheet ID
 * This is the ONLY setup step needed - all other IDs are read from MO-DB_Config
 *
 * Run this function once after deployment:
 * 1. Update the configSheetId value below
 * 2. Run this function from the Apps Script editor
 */
function setConfigSheetId() {
  // Update this value with your MO-DB_Config sheet ID:
  var configSheetId = '';  // <-- Set your CONFIG_SHEET_ID here

  if (!configSheetId) {
    Logger.log('ERROR: Please set the configSheetId value in this function first.');
    return;
  }

  setProperty(CONFIG.CONFIG_SHEET_ID, configSheetId);
  Logger.log('CONFIG_SHEET_ID set successfully.');
  Logger.log('All other IDs will now be read from MO-DB_Config sheet.');
}

/**
 * Test configuration - verify all config values are accessible
 */
function testConfiguration() {
  Logger.log('=== Testing Configuration ===');

  var configSheetId = getProperty(CONFIG.CONFIG_SHEET_ID);
  Logger.log('CONFIG_SHEET_ID: ' + (configSheetId ? 'Set' : 'NOT SET'));

  if (!configSheetId) {
    Logger.log('ERROR: Run setConfigSheetId() first.');
    return;
  }

  var config = loadConfigFromSheet();
  Logger.log('\nValues from MO-DB_Config:');

  for (var key in CONFIG_KEYS) {
    var value = config[CONFIG_KEYS[key]];
    Logger.log('  ' + CONFIG_KEYS[key] + ': ' + (value ? 'Set' : 'NOT SET'));
  }
}

// ============================================================================
// VIEWER HTML LOADERS
// ============================================================================

/**
 * Get Implementation-NSITE viewer HTML
 * Called by the frontend to load the implementation viewer
 *
 * @returns {string} Implementation viewer HTML content
 */
function getImplementationViewerHTML() {
  try {
    return HtmlService.createHtmlOutputFromFile('implementation-viewer/implementation').getContent();
  } catch (error) {
    Logger.log('Error loading implementation viewer: ' + error);
    throw new Error('Failed to load Implementation-NSITE viewer');
  }
}

/**
 * Get SEP-NSITE viewer HTML
 * Called by the frontend to load the SEP viewer
 *
 * @returns {string} SEP viewer HTML content
 */
function getSEPViewerHTML() {
  try {
    return HtmlService.createHtmlOutputFromFile('sep-viewer/sep').getContent();
  } catch (error) {
    Logger.log('Error loading SEP viewer: ' + error);
    throw new Error('Failed to load SEP-NSITE viewer');
  }
}

/**
 * Get Comms-NSITE viewer HTML
 * Called by the frontend to load the Comms viewer
 *
 * @returns {string} Comms viewer HTML content
 */
function getCommsViewerHTML() {
  try {
    return HtmlService.createHtmlOutputFromFile('comms-viewer/comms').getContent();
  } catch (error) {
    Logger.log('Error loading Comms viewer: ' + error);
    throw new Error('Failed to load Comms-NSITE viewer');
  }
}
