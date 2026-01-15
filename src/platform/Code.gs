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

/**
 * Get platform configuration for client-side use
 * Returns only safe-to-expose configuration values
 *
 * @returns {Object} Platform configuration
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
 * Configure document IDs
 * Run this and update the IDs as needed
 */
function configureDocumentIds() {
  // Uncomment and update these values:
  // setProperty(CONFIG.INTERNAL_PLANNING_DOC_ID, 'YOUR_INTERNAL_PLANNING_DOC_ID');
  // setProperty(CONFIG.SEP_STRATEGY_DOC_ID, 'YOUR_SEP_STRATEGY_DOC_ID');
  // setProperty(CONFIG.COMMS_TRACKING_DOC_ID, 'YOUR_COMMS_TRACKING_DOC_ID');
  // setProperty(CONFIG.DATABASE_SHEET_ID, 'YOUR_DATABASE_SHEET_ID');
  // setProperty(CONFIG.GITHUB_TOKEN, 'YOUR_GITHUB_TOKEN');

  Logger.log('Document IDs configured. Verify in Script Properties.');
}
