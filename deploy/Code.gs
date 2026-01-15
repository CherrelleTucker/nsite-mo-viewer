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
 */
var CONFIG = {
  // Document IDs
  INTERNAL_PLANNING_DOC_ID: 'INTERNAL_PLANNING_DOCUMENT_ID',
  SEP_STRATEGY_DOC_ID: 'SEP_STRATEGY_DOCUMENT_ID',
  COMMS_TRACKING_DOC_ID: 'COMMS_TRACKING_DOCUMENT_ID',
  DATABASE_SHEET_ID: 'DATABASE_SHEET_ID',

  // API Keys
  GITHUB_TOKEN: 'GITHUB_TOKEN',

  // Admin
  ADMIN_EMAIL: 'ADMIN_EMAIL',
  WHITELIST: 'APPROVED_USERS_WHITELIST'
};

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
  var page = e.parameter.page || DEFAULT_PAGE;

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

/**
 * Get platform configuration for client-side use
 */
function getPlatformConfig() {
  return {
    pages: PAGES,
    defaultPage: DEFAULT_PAGE,
    baseUrl: ScriptApp.getService().getUrl(),
    configured: {
      internalPlanning: !!getProperty(CONFIG.INTERNAL_PLANNING_DOC_ID),
      sepStrategy: !!getProperty(CONFIG.SEP_STRATEGY_DOC_ID),
      commsTracking: !!getProperty(CONFIG.COMMS_TRACKING_DOC_ID),
      database: !!getProperty(CONFIG.DATABASE_SHEET_ID),
      github: !!getProperty(CONFIG.GITHUB_TOKEN)
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
