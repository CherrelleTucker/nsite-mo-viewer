/**
 * MO-Viewer Platform - Main Entry Point
 * ======================================
 * Unified dashboard for NSITE MO (NASA's Support to the satellite Needs
 * working group Implementation TEam Management Office)
 *
 * DEPLOYMENT VERSION - File references use flat naming for Apps Script
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
  // Access Control
  ACCESS_FILE_ID: 'ACCESS_FILE_ID',  // Drive file used for access control (editors = approved users)

  // Source Document IDs (Agendas)
  INTERNAL_AGENDA_ID: 'INTERNAL_AGENDA_ID',
  SEP_AGENDA_ID: 'SEP_AGENDA_ID',
  COMMS_TRACKING_ID: 'COMMS_TRACKING_ID',
  OPERA_MONTHLY_ID: 'OPERA_MONTHLY_ID',
  PBL_MONTHLY_ID: 'PBL_MONTHLY_ID',

  // Folder IDs
  MONTHLY_FOLDER_ID: 'MONTHLY_FOLDER_ID',  // Monthly Meeting presentations folder

  // Library Reference
  API_LIBRARY_ID: 'API_LIBRARY_ID',  // MO-APIs Library ID

  // Database Sheet IDs
  SOLUTIONS_SHEET_ID: 'SOLUTIONS_SHEET_ID',
  CONTACTS_SHEET_ID: 'CONTACTS_SHEET_ID',
  NEEDS_SHEET_ID: 'NEEDS_SHEET_ID',
  CONTACT_SOLUTIONS_SHEET_ID: 'CONTACT_SOLUTIONS_SHEET_ID',
  ACTIONS_SHEET_ID: 'ACTIONS_SHEET_ID',
  MILESTONES_SHEET_ID: 'MILESTONES_SHEET_ID',
  UPDATE_HISTORY_SHEET_ID: 'UPDATE_HISTORY_SHEET_ID',

  // SEP-NSITE Database Sheet IDs
  AGENCIES_SHEET_ID: 'AGENCIES_SHEET_ID',
  ENGAGEMENTS_SHEET_ID: 'ENGAGEMENTS_SHEET_ID',

  // Updates Database Sheet ID
  UPDATES_SHEET_ID: 'UPDATES_SHEET_ID',

  // Comms-NSITE Database Sheet IDs
  STORIES_SHEET_ID: 'STORIES_SHEET_ID',           // MO-DB_Stories (normalized database)
  STORIES_TRACKING_SHEET_ID: 'STORIES_TRACKING_SHEET_ID', // NSITE Story Tracking (source workbook)
  OUTREACH_SHEET_ID: 'OUTREACH_SHEET_ID',

  // Team-related Database Sheet IDs
  AVAILABILITY_SHEET_ID: 'AVAILABILITY_SHEET_ID',
  MEETINGS_SHEET_ID: 'MEETINGS_SHEET_ID',
  GLOSSARY_SHEET_ID: 'GLOSSARY_SHEET_ID',

  // Directing Documents (Core)
  MO_PROJECT_PLAN_DOC_ID: 'MO_PROJECT_PLAN_DOC_ID',
  HQ_PROJECT_PLAN_DOC_ID: 'HQ_PROJECT_PLAN_DOC_ID',
  SOLUTION_REQUIREMENTS_EXPECTATIONS_DOC_ID: 'SOLUTION_REQUIREMENTS_EXPECTATIONS_DOC_ID',

  // Directing Documents (SEP)
  SEP_PLAN_DOC_ID: 'SEP_PLAN_DOC_ID',
  SEP_BLUEPRINT_DOC_ID: 'SEP_BLUEPRINT_DOC_ID',
  CODESIGN_PIPELINE_DOC_ID: 'CODESIGN_PIPELINE_DOC_ID',

  // Directing Documents (Comms)
  COMMS_PLAN_DOC_ID: 'COMMS_PLAN_DOC_ID',
  STYLE_GUIDE_DOC_ID: 'STYLE_GUIDE_DOC_ID',
  HIGHLIGHTER_BLURBS_DOC_ID: 'HIGHLIGHTER_BLURBS_DOC_ID',
  WEBPAGE_LOG_DOC_ID: 'WEBPAGE_LOG_DOC_ID',

  // Directing Documents (Assessment)
  ASSESSEMENT_PROCESS_DOC_ID: 'ASSESSEMENT_PROCESS_DOC_ID',
  ASSESSEMENT_CHEATSHEET_DOC_ID: 'ASSESSEMENT_CHEATSHEET_DOC_ID',

  // Directing Documents (Operations)
  MO_RISK_REGISTER_DOC_ID: 'MO_RISK_REGISTER_DOC_ID',
  RISK_REGISTER_DOC_ID: 'RISK_REGISTER_DOC_ID',
  INFO_MANAGEMENT_PLAN_DOC_ID: 'INFO_MANAGEMENT_PLAN_DOC_ID',
  AUDIT_LOG_DOC_ID: 'AUDIT_LOG_DOC_ID'
};

// Cache for config values (refreshed per execution)
var _configCache = null;

/**
 * Valid page routes
 */
var PAGES = {
  'implementation': {
    title: 'Implementation',
    icon: 'folder'
  },
  'sep': {
    title: 'SEP',
    icon: 'users'
  },
  'comms': {
    title: 'Comms',
    icon: 'message-square'
  },
  'quick-update': {
    title: 'Quick Update',
    icon: 'edit'
  },
  'contacts': {
    title: 'Contacts',
    icon: 'book'
  },
  'reports': {
    title: 'Reports',
    icon: 'file-text'
  },
  'schedule': {
    title: 'Schedule',
    icon: 'calendar'
  },
  'actions': {
    title: 'Actions',
    icon: 'check-square'
  },
  'team': {
    title: 'Team',
    icon: 'user-check'
  },
  'about': {
    title: 'About',
    icon: 'info'
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
 *
 * @param {Object} e - Event object with URL parameters
 * @returns {HtmlOutput} Rendered HTML page
 */
function doGet(e) {
  // Access control is handled by deployment settings:
  // - Execute as: Me
  // - Who has access: Anyone within NASA.gov Workspace

  var page = e.parameter.page || DEFAULT_PAGE;

  // Special routes (not in PAGES)
  if (page === 'test') {
    return HtmlService.createHtmlOutputFromFile('test-frontend')
      .setTitle('Frontend Test')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Validate page exists
  if (!PAGES[page]) {
    page = DEFAULT_PAGE;
  }

  try {
    var template = HtmlService.createTemplateFromFile('index');
    template.activePage = page;
    template.pageConfig = PAGES[page];
    template.allPages = PAGES;

    return template.evaluate()
      .setTitle('MO-Viewer | NSITE MO Dashboard')
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

/**
 * Validate user access by checking if their email is in the MO-DB_Access sheet
 *
 * @param {string} email - User's email address
 * @param {string} sheetId - ID of the MO-DB_Access Google Sheet
 * @returns {boolean} True if user has access
 */
function validateUserAccess(email, sheetId) {
  var userEmailLower = email.toLowerCase().trim();

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    // Find access_email column (expected: name, access_email, purpose)
    var headers = data[0];
    var emailColIndex = -1;

    for (var i = 0; i < headers.length; i++) {
      var header = String(headers[i]).toLowerCase().trim();
      if (header === 'access_email' || header === 'email') {
        emailColIndex = i;
        break;
      }
    }

    if (emailColIndex === -1) {
      Logger.log('access_email column not found in MO-DB_Access');
      return false;
    }

    // Check if user's email is in the access list
    for (var row = 1; row < data.length; row++) {
      var accessEmail = String(data[row][emailColIndex]).toLowerCase().trim();
      if (accessEmail === userEmailLower) {
        return true;
      }
    }

    Logger.log('Access denied for: ' + email);
    return false;

  } catch (e) {
    Logger.log('Error reading access sheet: ' + e);
    return false;
  }
}

// ============================================================================
// HTML INCLUDES
// ============================================================================

/**
 * Include HTML file content (for templating)
 * @param {string} filename - HTML file name (without .html extension)
 * @returns {string} HTML content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get page HTML content for SPA navigation (called from client via google.script.run)
 * @param {string} pageName - Page name (e.g., 'implementation', 'sep', 'reports')
 * @returns {string} HTML content of the page
 */
function getPageHTML(pageName) {
  // Validate page exists
  if (!PAGES[pageName]) {
    return '<div class="error">Page not found: ' + pageName + '</div>';
  }

  try {
    return HtmlService.createHtmlOutputFromFile(pageName).getContent();
  } catch (e) {
    Logger.log('Error loading page ' + pageName + ': ' + e.message);
    return '<div class="page-placeholder"><h2>Error</h2><p>Could not load page: ' + pageName + '</p></div>';
  }
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Get a script property value
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
      solutionsDb: !!config[CONFIG_KEYS.SOLUTIONS_SHEET_ID],
      storiesDb: !!config[CONFIG_KEYS.STORIES_SHEET_ID],
      outreachDb: !!config[CONFIG_KEYS.OUTREACH_SHEET_ID],
      actionsDb: !!config[CONFIG_KEYS.ACTIONS_SHEET_ID]
    }
  };
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

/**
 * Get admin email from Script Properties
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
 */
function getNextMondayFormatted() {
  var today = new Date();
  var dayOfWeek = today.getDay();
  var daysUntilMonday;

  if (dayOfWeek === 1) {
    daysUntilMonday = 0;
  } else if (dayOfWeek === 0) {
    daysUntilMonday = 1;
  } else {
    daysUntilMonday = 8 - dayOfWeek;
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
 */
function initializePlatform() {
  var adminEmail = Session.getEffectiveUser().getEmail();
  setProperty(CONFIG.ADMIN_EMAIL, adminEmail.toLowerCase().trim());

  var whitelist = [adminEmail.toLowerCase().trim()];
  setProperty(CONFIG.WHITELIST, JSON.stringify(whitelist));

  Logger.log('Platform initialized. Admin: ' + adminEmail);
}
