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
  ACCESS_SHEET_ID: 'ACCESS_SHEET_ID',  // MO-DB_Access spreadsheet for email whitelist
  SITE_PASSPHRASE: 'SITE_PASSPHRASE',  // Shared passphrase for team access

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
    icon: 'group'
  },
  'comms': {
    title: 'Comms',
    icon: 'chat'
  },
  'quick-update': {
    title: 'Quick Update',
    icon: 'edit'
  },
  'contacts': {
    title: 'Contacts',
    icon: 'menu_book'
  },
  'reports': {
    title: 'Reports',
    icon: 'description'
  },
  'schedule': {
    title: 'Schedule',
    icon: 'calendar_today'
  },
  'actions': {
    title: 'Actions',
    icon: 'check_box'
  },
  'team': {
    title: 'Team',
    icon: 'how_to_reg'
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
  // Favicon URL (hosted on GitHub)
  var faviconUrl = 'https://raw.githubusercontent.com/CherrelleTucker/nsite-mo-viewer/main/favicon.png';
  var page = e.parameter.page || DEFAULT_PAGE;

  // Debug endpoint - check access status without blocking
  // Usage: ?page=access-check
  if (page === 'access-check') {
    var storedEmail = getStoredUserEmail();
    var activeEmail = Session.getActiveUser().getEmail();
    var accessSheetId = getConfigValue('ACCESS_SHEET_ID');
    var displayEmail = storedEmail || activeEmail || '(not available)';
    var hasAccess = accessSheetId ? validateUserAccess(displayEmail, accessSheetId) : 'NOT_CONFIGURED';

    var html = '<html><head><style>' +
      'body { font-family: -apple-system, sans-serif; padding: 40px; background: #f5f5f5; }' +
      '.card { background: white; border-radius: 12px; padding: 30px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }' +
      'h1 { color: #0B3D91; margin-bottom: 20px; }' +
      '.row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }' +
      '.label { color: #666; }' +
      '.value { font-weight: 600; font-family: monospace; word-break: break-all; }' +
      '.granted { color: #2e7d32; }' +
      '.denied { color: #c62828; }' +
      '.warning { color: #f57c00; }' +
      '</style></head><body><div class="card">' +
      '<h1>Access Control Check</h1>' +
      '<div class="row"><span class="label">Stored Email:</span><span class="value">' + (storedEmail || '<span class="warning">none</span>') + '</span></div>' +
      '<div class="row"><span class="label">Active Email:</span><span class="value">' + (activeEmail || '<span class="warning">none</span>') + '</span></div>' +
      '<div class="row"><span class="label">Access Sheet ID:</span><span class="value">' + (accessSheetId ? accessSheetId.substring(0,20) + '...' : '<span class="warning">NOT CONFIGURED</span>') + '</span></div>' +
      '<div class="row"><span class="label">Access Status:</span><span class="value ' + (hasAccess === true ? 'granted' : hasAccess === false ? 'denied' : 'warning') + '">' +
      (hasAccess === true ? 'GRANTED' : hasAccess === false ? 'DENIED' : 'NOT ENFORCED') + '</span></div>' +
      '</div></body></html>';

    return HtmlService.createHtmlOutput(html)
      .setTitle('Access Check | MO-Viewer')
      .setFaviconUrl(faviconUrl);
  }

  // Allow access-denied page to be shown directly
  if (page === 'access-denied') {
    return HtmlService.createHtmlOutputFromFile('access-denied')
      .setTitle('Access Denied | MO-Viewer')
      .setFaviconUrl(faviconUrl)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  // Check if access control is enabled
  var accessSheetId = getConfigValue('ACCESS_SHEET_ID');
  var sitePassphrase = getConfigValue('SITE_PASSPHRASE');

  if (accessSheetId || sitePassphrase) {
    // Access control is enabled - check for valid session
    var sessionToken = e.parameter.session;

    if (sessionToken) {
      // Verify the session token
      var sessionStatus = verifySessionToken(sessionToken);

      if (!sessionStatus.valid) {
        // Invalid or expired session - show sign-in page
        return HtmlService.createHtmlOutputFromFile('auth-landing')
          .setTitle('Sign In | MO-Viewer')
          .setFaviconUrl(faviconUrl)
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
      }
      // Valid session - continue to app (session token will be preserved in navigation)
    } else {
      // No session token - show sign-in page
      return HtmlService.createHtmlOutputFromFile('auth-landing')
        .setTitle('Sign In | MO-Viewer')
        .setFaviconUrl(faviconUrl)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
    }
  }

  // Special routes (not in PAGES)
  if (page === 'test') {
    return HtmlService.createHtmlOutputFromFile('test-frontend')
      .setTitle('Frontend Test')
      .setFaviconUrl(faviconUrl)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
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
      .setFaviconUrl(faviconUrl)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
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
// GLOBAL SEARCH
// ============================================================================

/**
 * Search across solutions, contacts, and actions
 * @param {string} query - Search query (minimum 2 characters)
 * @returns {Object} Results grouped by type: {solutions: [], contacts: [], actions: []}
 */
function globalSearch(query) {
  if (!query || query.length < 2) {
    return { solutions: [], contacts: [], actions: [] };
  }

  var results = {
    solutions: [],
    contacts: [],
    actions: []
  };

  var queryLower = query.toLowerCase();
  var maxResults = 5; // Limit per category

  try {
    // Search Solutions
    var solutions = MoApi.getAllSolutions();
    if (solutions && solutions.length > 0) {
      results.solutions = solutions.filter(function(sol) {
        var searchText = [
          sol.core_official_name || '',
          sol.core_id || '',
          sol.earthdata_purpose || '',
          sol.core_group || '',
          sol.core_alternate_names || ''
        ].join(' ').toLowerCase();
        return searchText.indexOf(queryLower) !== -1;
      }).slice(0, maxResults);
    }
  } catch (e) {
    Logger.log('Error searching solutions: ' + e.message);
  }

  try {
    // Search Contacts
    var contacts = MoApi.getAllContacts();
    if (contacts && contacts.length > 0) {
      results.contacts = contacts.filter(function(contact) {
        var searchText = [
          contact.first_name || '',
          contact.last_name || '',
          contact.full_name || '',
          contact.email || '',
          contact.organization || ''
        ].join(' ').toLowerCase();
        return searchText.indexOf(queryLower) !== -1;
      }).slice(0, maxResults);
    }
  } catch (e) {
    Logger.log('Error searching contacts: ' + e.message);
  }

  try {
    // Search Actions
    var actions = MoApi.getAllActions();
    if (actions && actions.length > 0) {
      results.actions = actions.filter(function(action) {
        var searchText = [
          action.task || '',
          action.assigned_to || '',
          action.notes || '',
          action.solution_id || ''
        ].join(' ').toLowerCase();
        return searchText.indexOf(queryLower) !== -1;
      }).slice(0, maxResults);
    }
  } catch (e) {
    Logger.log('Error searching actions: ' + e.message);
  }

  return results;
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
 * Delegates to MoApi library for single source of truth
 *
 * @returns {Object} Key-value map of config settings
 */
function loadConfigFromSheet() {
  return MoApi.loadConfigFromSheet();
}

/**
 * Get a config value from MO-DB_Config sheet
 * Delegates to MoApi library for single source of truth
 *
 * @param {string} key - Config key name
 * @returns {string} Config value or empty string
 */
function getConfigValue(key) {
  return MoApi.getConfigValue(key);
}

/**
 * Get a database sheet by table name
 * Delegates to MoApi library for single source of truth
 *
 * @param {string} tableName - Table name (e.g., 'Solutions', 'Contacts')
 * @returns {Sheet} The sheet object
 */
function getDatabaseSheet(tableName) {
  return MoApi.getDatabaseSheet(tableName);
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
  var userEmail = Session.getActiveUser().getEmail().toLowerCase().trim();
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
  var email = Session.getActiveUser().getEmail();
  return {
    email: email,
    isAdmin: email && email.toLowerCase() === getAdminEmail().toLowerCase()
  };
}

/**
 * Get current user's full info including name
 * Looks up email in MO-DB_Contacts to get the user's name
 * @returns {Object} User info with name, email, team
 */
function getCurrentUserInfo() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    email = Session.getEffectiveUser().getEmail();
  }

  var result = {
    email: email || '',
    name: '',
    firstName: '',
    lastName: '',
    team: '',
    isInternal: false
  };

  if (!email) return result;

  // Try to find this user in MO-DB_Contacts
  try {
    var contacts = getInternalTeam();
    var emailLower = email.toLowerCase();

    for (var i = 0; i < contacts.length; i++) {
      var contact = contacts[i];
      if ((contact.email || '').toLowerCase() === emailLower) {
        result.name = ((contact.first_name || '') + ' ' + (contact.last_name || '')).trim();
        result.firstName = contact.first_name || '';
        result.lastName = contact.last_name || '';
        result.team = contact.internal_team || '';
        result.isInternal = true;
        return result;
      }
    }

    // Not found in internal team - try general contacts
    var allContacts = getAllContacts();
    for (var j = 0; j < allContacts.length; j++) {
      var c = allContacts[j];
      if ((c.email || '').toLowerCase() === emailLower) {
        result.name = ((c.first_name || '') + ' ' + (c.last_name || '')).trim();
        result.firstName = c.first_name || '';
        result.lastName = c.last_name || '';
        return result;
      }
    }
  } catch (e) {
    Logger.log('Error looking up user info: ' + e);
  }

  // Fallback: use email prefix as name
  if (!result.name && email) {
    var emailPrefix = email.split('@')[0];
    // Try to parse "first.last" format
    if (emailPrefix.indexOf('.') !== -1) {
      var parts = emailPrefix.split('.');
      result.firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      result.lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      result.name = result.firstName + ' ' + result.lastName;
    } else {
      result.name = emailPrefix;
    }
  }

  return result;
}

/**
 * Verify passphrase and email for access
 * User provides their email and a shared team passphrase
 *
 * @param {string} email - User's email address
 * @param {string} passphrase - Team passphrase
 * @returns {Object} Result with authorized status and redirect URL
 */
function verifyPassphraseAccess(email, passphrase) {
  var scriptUrl = ScriptApp.getService().getUrl();

  // Normalize email
  email = (email || '').toLowerCase().trim();

  if (!email) {
    return {
      authorized: false,
      message: 'Please enter your email address.'
    };
  }

  if (!passphrase) {
    return {
      authorized: false,
      message: 'Please enter the team passphrase.'
    };
  }

  // Get the configured passphrase
  var configuredPassphrase = getConfigValue('SITE_PASSPHRASE');

  if (!configuredPassphrase) {
    Logger.log('SITE_PASSPHRASE not configured in MO-DB_Config');
    return {
      authorized: false,
      message: 'Access control not configured. Contact administrator.'
    };
  }

  // Verify passphrase (case-sensitive)
  if (passphrase !== configuredPassphrase) {
    Logger.log('Invalid passphrase attempt for: ' + email);
    return {
      authorized: false,
      message: 'Invalid passphrase. Contact your team lead for the correct passphrase.'
    };
  }

  // Passphrase correct - now check if email is in whitelist
  var accessSheetId = getConfigValue('ACCESS_SHEET_ID');

  if (!accessSheetId) {
    // No whitelist configured - passphrase alone grants access
    Logger.log('No ACCESS_SHEET_ID configured, granting access with passphrase only: ' + email);
    var token = createSessionToken(email);
    return {
      authorized: true,
      email: email,
      sessionToken: token,
      redirectUrl: scriptUrl + '?page=implementation&session=' + token
    };
  }

  // Check whitelist
  var hasAccess = validateUserAccess(email, accessSheetId);

  if (hasAccess) {
    Logger.log('Access granted for: ' + email);
    var token = createSessionToken(email);
    return {
      authorized: true,
      email: email,
      sessionToken: token,
      redirectUrl: scriptUrl + '?page=implementation&session=' + token
    };
  } else {
    Logger.log('Email not in whitelist: ' + email);
    return {
      authorized: false,
      email: email,
      message: 'Your email is not on the approved access list. Contact administrator to request access.',
      accessDeniedUrl: scriptUrl + '?page=access-denied&email=' + encodeURIComponent(email)
    };
  }
}

/**
 * Generate a session token for authenticated user
 * Stores token -> email mapping in ScriptCache
 *
 * @param {string} email - User's email
 * @returns {string} Session token
 */
function createSessionToken(email) {
  var token = Utilities.getUuid();
  var cache = CacheService.getScriptCache();

  // Store for 6 hours (21600 seconds)
  cache.put('session_' + token, JSON.stringify({
    email: email,
    created: Date.now()
  }), 21600);

  return token;
}

/**
 * Verify a session token and return the associated email
 *
 * @param {string} token - Session token
 * @returns {Object} {valid: boolean, email: string|null}
 */
function verifySessionToken(token) {
  if (!token) {
    return { valid: false, email: null };
  }

  var cache = CacheService.getScriptCache();
  var data = cache.get('session_' + token);

  if (!data) {
    return { valid: false, email: null };
  }

  try {
    var session = JSON.parse(data);

    // Re-verify email is still in whitelist
    var accessSheetId = getConfigValue('ACCESS_SHEET_ID');
    if (accessSheetId && !validateUserAccess(session.email, accessSheetId)) {
      // Email removed from whitelist - invalidate session
      cache.remove('session_' + token);
      return { valid: false, email: null };
    }

    return { valid: true, email: session.email };
  } catch (e) {
    return { valid: false, email: null };
  }
}

/**
 * Invalidate a session token (logout)
 */
function invalidateSession(token) {
  if (token) {
    var cache = CacheService.getScriptCache();
    cache.remove('session_' + token);
  }
}

/**
 * Authorize user and check access - fallback method
 * Uses Session methods (works for same-domain users)
 */
function authorizeAndCheckAccess() {
  var email = null;
  var scriptUrl = ScriptApp.getService().getUrl();

  // Method 1: Try getActiveUser() - works for same-domain users
  email = Session.getActiveUser().getEmail();

  // Method 2: Try getEffectiveUser as fallback (returns owner when "Execute as: Me")
  if (!email) {
    email = Session.getEffectiveUser().getEmail();
    // Note: This returns the script owner's email, not the visitor's
    // Only use this as a last resort for same-domain debugging
  }

  if (!email) {
    return {
      authorized: false,
      email: null,
      message: 'Could not retrieve email. Please use the Google Sign-In button.'
    };
  }

  // Check if user is in whitelist
  var accessSheetId = getConfigValue('ACCESS_SHEET_ID');
  var hasAccess = accessSheetId ? validateUserAccess(email, accessSheetId) : true;

  if (hasAccess) {
    // Store authorization in user properties to remember they've authed
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('MO_VIEWER_AUTHORIZED', 'true');
    userProps.setProperty('MO_VIEWER_EMAIL', email);

    return {
      authorized: true,
      email: email,
      redirectUrl: scriptUrl + '?page=implementation&auth=complete'
    };
  } else {
    // Store email so access-denied page can show it
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('MO_VIEWER_EMAIL', email);

    return {
      authorized: false,
      email: email,
      accessDeniedUrl: scriptUrl + '?page=access-denied'
    };
  }
}

/**
 * Get stored user email from properties (after OAuth)
 */
function getStoredUserEmail() {
  var userProps = PropertiesService.getUserProperties();
  return userProps.getProperty('MO_VIEWER_EMAIL') || null;
}

/**
 * Check if user has completed OAuth authorization
 */
function isUserAuthorized() {
  var userProps = PropertiesService.getUserProperties();
  var authorized = userProps.getProperty('MO_VIEWER_AUTHORIZED') === 'true';
  var email = userProps.getProperty('MO_VIEWER_EMAIL');

  if (!authorized || !email) {
    return { authorized: false, email: null };
  }

  // Re-check whitelist in case access was revoked
  var accessSheetId = getConfigValue('ACCESS_SHEET_ID');
  var hasAccess = accessSheetId ? validateUserAccess(email, accessSheetId) : true;

  return {
    authorized: hasAccess,
    email: email
  };
}

/**
 * Submit an access request - logs request and attempts to send email
 */
function submitAccessRequest(email, reason) {
  var adminEmail = getAdminEmail();

  if (!email) {
    throw new Error('No email provided');
  }

  // Log the request
  Logger.log('Access request from: ' + email + ', Reason: ' + (reason || 'No reason provided'));

  // Try to send email, but don't fail if MailApp isn't available
  var emailSent = false;
  try {
    var subject = 'MO-Viewer Access Request: ' + email;
    var body = 'A new access request has been submitted for MO-Viewer.\n\n' +
               'Requester Email: ' + email + '\n' +
               'Reason: ' + (reason || 'No reason provided') + '\n\n' +
               'To grant access:\n' +
               '1. Open the MO-DB_Access spreadsheet\n' +
               '2. Add "' + email + '" to the access_email column\n\n' +
               'The user will be able to access MO-Viewer immediately after being added.';

    MailApp.sendEmail({
      to: adminEmail,
      subject: subject,
      body: body
    });

    emailSent = true;
    Logger.log('Access request email sent for: ' + email);
  } catch (e) {
    Logger.log('Could not send email (MailApp not available): ' + e);
  }

  if (emailSent) {
    return { success: true, manualRequest: false };
  } else {
    // Return admin contact info for manual follow-up
    return {
      success: true,
      manualRequest: true,
      adminEmail: adminEmail
    };
  }
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

