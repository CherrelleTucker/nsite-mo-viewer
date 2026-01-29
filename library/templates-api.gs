/**
 * MO-APIs Library - Templates API
 * ================================
 * Comprehensive email and meeting templates for SEP and Comms integration.
 * Supports Assessment, Implementation, SEP, Supplementary, Outreach, and Blurbs categories.
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Templates database sheet
 * Reads TEMPLATES_SHEET_ID from MO-DB_Config
 */
function getTemplatesSheet_() {
  var sheetId = getConfigValue('TEMPLATES_SHEET_ID');
  if (!sheetId) {
    throw new Error('TEMPLATES_SHEET_ID not configured in MO-DB_Config');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for templates data (refreshed per execution)
 */
var _templatesCache = null;

/**
 * Load all templates into memory for fast querying
 */
function loadAllTemplates_() {
  if (_templatesCache !== null) {
    return _templatesCache;
  }

  var sheet = getTemplatesSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _templatesCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var template = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      // Convert boolean strings
      if (header === 'is_active') {
        template[header] = (value === true || value === 'TRUE' || value === 1);
      } else {
        template[header] = value;
      }
    });
    // Only include records with template_id
    if (template.template_id) {
      _templatesCache.push(template);
    }
  }

  // Sort by sort_order
  _templatesCache.sort(function(a, b) {
    return (a.sort_order || 999) - (b.sort_order || 999);
  });

  return _templatesCache;
}

/**
 * Clear templates cache (call after mutations)
 */
function clearTemplatesCache() {
  _templatesCache = null;
}

// ============================================================================
// CATEGORY & PHASE CONSTANTS
// ============================================================================

/**
 * Valid template categories
 */
var TEMPLATE_CATEGORIES = [
  'Assessment',
  'Implementation',
  'SEP',
  'Supplementary',
  'Outreach',
  'Blurbs'
];

/**
 * Category descriptions and colors
 */
var CATEGORY_INFO = {
  'Assessment': { description: 'Solution assessment phase templates', color: '#4A90D9' },
  'Implementation': { description: 'Implementation process templates including Decision Gates', color: '#2E7D32' },
  'SEP': { description: 'Stakeholder Engagement Program touchpoints and working sessions', color: '#FF6F00' },
  'Supplementary': { description: 'Additional meetings like Deep Dives and Lunch & Learn', color: '#7B1FA2' },
  'Outreach': { description: 'General outreach and communication templates', color: '#00838F' },
  'Blurbs': { description: 'Reporting blurbs for ODSI and other reports', color: '#5D4037' }
};

/**
 * Valid lifecycle phases
 */
var TEMPLATE_PHASES = [
  'Assessment',
  'Pre-Formulation',
  'Formulation',
  'Implementation',
  'Operations',
  'Closeout'
];

/**
 * SEP Touchpoint IDs
 */
var SEP_TOUCHPOINTS = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TP7', 'TP8'];

/**
 * SEP Working Session IDs
 */
var SEP_WORKING_SESSIONS = ['WS1', 'WS2', 'WS3', 'WS4', 'WS5'];

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Get all active templates
 * @param {boolean} includeInactive - Include inactive templates (default: false)
 * @returns {Array} All template records
 */
function getAllTemplates(includeInactive) {
  var templates = loadAllTemplates_();
  if (!includeInactive) {
    templates = templates.filter(function(t) { return t.is_active !== false; });
  }
  return deepCopy(templates);
}

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template record or null
 */
function getTemplateById(templateId) {
  var templates = loadAllTemplates_();
  var template = templates.find(function(t) {
    return t.template_id === templateId;
  });
  return template ? deepCopy(template) : null;
}

/**
 * Get templates by category
 * @param {string} category - Category (Assessment, Implementation, SEP, etc.)
 * @returns {Array} Templates in this category
 */
function getTemplatesByCategory(category) {
  var templates = loadAllTemplates_();
  var results = templates.filter(function(t) {
    return t.is_active !== false &&
           t.category && t.category.toLowerCase() === category.toLowerCase();
  });
  return deepCopy(results);
}

/**
 * Get templates by subcategory
 * @param {string} subcategory - Subcategory (Kickoff, Decision Gate, Touchpoint, etc.)
 * @returns {Array} Templates in this subcategory
 */
function getTemplatesBySubcategory(subcategory) {
  var templates = loadAllTemplates_();
  var results = templates.filter(function(t) {
    return t.is_active !== false &&
           t.subcategory && t.subcategory.toLowerCase() === subcategory.toLowerCase();
  });
  return deepCopy(results);
}

/**
 * Get templates by phase
 * @param {string} phase - Lifecycle phase
 * @returns {Array} Templates for this phase
 */
function getTemplatesByPhase(phase) {
  var templates = loadAllTemplates_();
  var results = templates.filter(function(t) {
    return t.is_active !== false &&
           t.phase && t.phase.toLowerCase() === phase.toLowerCase();
  });
  return deepCopy(results);
}

// ============================================================================
// SEP-SPECIFIC QUERIES
// ============================================================================

/**
 * Get SEP templates only
 * @returns {Array} All SEP templates
 */
function getSEPTemplates() {
  return getTemplatesByCategory('SEP');
}

/**
 * Get SEP touchpoint templates
 * @param {string} touchpointId - Optional specific touchpoint (TP1-TP8)
 * @returns {Array} Touchpoint templates
 */
function getSEPTouchpointTemplates(touchpointId) {
  var templates = getTemplatesByCategory('SEP');
  var results = templates.filter(function(t) {
    return t.subcategory === 'Touchpoint';
  });

  if (touchpointId) {
    var tpNum = touchpointId.replace(/\D/g, '');
    results = results.filter(function(t) {
      return t.template_id.includes('TP' + tpNum);
    });
  }

  return results;
}

/**
 * Get SEP working session templates
 * @param {string} sessionId - Optional specific session (WS1-WS5)
 * @returns {Array} Working session templates
 */
function getSEPWorkingSessionTemplates(sessionId) {
  var templates = getTemplatesByCategory('SEP');
  var results = templates.filter(function(t) {
    return t.subcategory === 'Working Session';
  });

  if (sessionId) {
    var wsNum = sessionId.replace(/\D/g, '');
    results = results.filter(function(t) {
      return t.template_id.includes('WS' + wsNum);
    });
  }

  return results;
}

// ============================================================================
// IMPLEMENTATION-SPECIFIC QUERIES
// ============================================================================

/**
 * Get Implementation templates only
 * @returns {Array} All Implementation templates
 */
function getImplementationTemplates() {
  return getTemplatesByCategory('Implementation');
}

/**
 * Get Decision Gate templates
 * @param {string} gateType - Optional specific gate (ATP, F2I, ORR, Closeout)
 * @returns {Array} Decision gate templates
 */
function getDecisionGateTemplates(gateType) {
  var templates = getTemplatesByCategory('Implementation');
  var results = templates.filter(function(t) {
    return t.subcategory === 'Decision Gate';
  });

  if (gateType) {
    var gtLower = gateType.toLowerCase();
    results = results.filter(function(t) {
      return t.template_id.toLowerCase().includes(gtLower) ||
             t.name.toLowerCase().includes(gtLower);
    });
  }

  return results;
}

/**
 * Get kickoff templates
 * @returns {Array} Kickoff-related templates
 */
function getKickoffTemplates() {
  return getTemplatesBySubcategory('Kickoff');
}

// ============================================================================
// OUTREACH TEMPLATES
// ============================================================================

/**
 * Get Outreach templates only
 * @returns {Array} All Outreach templates
 */
function getOutreachTemplates() {
  return getTemplatesByCategory('Outreach');
}

// ============================================================================
// BLURB TEMPLATES (for ODSI reporting)
// ============================================================================

/**
 * Get Blurb templates only
 * @returns {Array} All Blurb templates
 */
function getBlurbTemplates() {
  return getTemplatesByCategory('Blurbs');
}

/**
 * Get blurb for specific milestone type
 * @param {string} milestoneType - Milestone type (ATP, F2I, ORR, Closeout, DAAC, Launch)
 * @returns {Object|null} Blurb template or null
 */
function getBlurbForMilestone(milestoneType) {
  var templates = getBlurbTemplates();
  var mlLower = milestoneType.toLowerCase();

  var template = templates.find(function(t) {
    return t.template_id.toLowerCase().includes(mlLower) ||
           t.name.toLowerCase().includes(mlLower);
  });

  return template || null;
}

// ============================================================================
// TEMPLATE PROCESSING
// ============================================================================

/**
 * Apply template with variable substitution
 * @param {string} templateId - Template ID
 * @param {Object} variables - Variables to substitute
 * @returns {Object} Processed template with subject and body
 */
function applyTemplate(templateId, variables) {
  var template = getTemplateById(templateId);
  if (!template) {
    return { error: 'Template not found: ' + templateId };
  }

  variables = variables || {};

  // Build replacement function
  function replaceVariables(text) {
    if (!text) return '';
    var result = text;
    Object.keys(variables).forEach(function(key) {
      var pattern = new RegExp('\\{' + key + '\\}', 'g');
      result = result.replace(pattern, variables[key] || '');
    });
    return result;
  }

  return {
    template_id: template.template_id,
    name: template.name,
    category: template.category,
    subject: replaceVariables(template.email_subject),
    body: replaceVariables(template.email_body),
    meeting_title: replaceVariables(template.meeting_title),
    attendees: template.attendees,
    key_points: template.key_points,
    attachments_notes: template.attachments_notes
  };
}

/**
 * Get all available placeholder variables
 * @returns {Array} Array of { name, description, example }
 */
function getTemplatePlaceholders() {
  return [
    { name: 'solution', description: 'Solution name', example: 'OPERA Land Surface Disturbance' },
    { name: 'firstName', description: "Recipient's first name", example: 'John' },
    { name: 'agency', description: "Stakeholder's agency name", example: 'USGS' },
    { name: 'date', description: 'Relevant date', example: 'January 15, 2026' },
    { name: 'deadline', description: 'Response deadline', example: 'January 22, 2026' },
    { name: 'milestone', description: 'Milestone name', example: 'ATP Decision Gate' },
    { name: 'DAAC', description: 'Assigned DAAC name', example: 'LP DAAC' },
    { name: 'solutionContext', description: 'Solution description/context paragraph', example: 'OPERA provides...' },
    { name: 'capabilities', description: 'Solution capabilities summary', example: 'land surface disturbance monitoring' }
  ];
}

// ============================================================================
// STATISTICS & OVERVIEW
// ============================================================================

/**
 * Get template statistics
 * @returns {Object} Summary statistics
 */
function getTemplateStats() {
  var templates = loadAllTemplates_();

  var byCategory = {};
  var bySubcategory = {};
  var byPhase = {};
  var activeCount = 0;

  templates.forEach(function(t) {
    // By category
    if (t.category) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }

    // By subcategory
    if (t.subcategory) {
      bySubcategory[t.subcategory] = (bySubcategory[t.subcategory] || 0) + 1;
    }

    // By phase
    if (t.phase) {
      byPhase[t.phase] = (byPhase[t.phase] || 0) + 1;
    }

    // Active count
    if (t.is_active !== false) {
      activeCount++;
    }
  });

  return {
    total: templates.length,
    active: activeCount,
    by_category: byCategory,
    by_subcategory: bySubcategory,
    by_phase: byPhase
  };
}

/**
 * Get categories with counts
 * @returns {Array} Categories with metadata and counts
 */
function getTemplateCategories() {
  var stats = getTemplateStats();

  return TEMPLATE_CATEGORIES.map(function(cat) {
    var info = CATEGORY_INFO[cat] || {};
    return {
      name: cat,
      description: info.description || '',
      color: info.color || '#9E9E9E',
      count: stats.by_category[cat] || 0
    };
  });
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search templates by query
 * @param {string} query - Search query
 * @returns {Array} Matching templates
 */
function searchTemplates(query) {
  var templates = loadAllTemplates_();
  var queryLower = (query || '').toLowerCase();

  var results = templates.filter(function(t) {
    if (t.is_active === false) return false;
    return (t.template_id && t.template_id.toLowerCase().includes(queryLower)) ||
           (t.name && t.name.toLowerCase().includes(queryLower)) ||
           (t.category && t.category.toLowerCase().includes(queryLower)) ||
           (t.subcategory && t.subcategory.toLowerCase().includes(queryLower)) ||
           (t.phase && t.phase.toLowerCase().includes(queryLower)) ||
           (t.email_subject && t.email_subject.toLowerCase().includes(queryLower));
  });

  return deepCopy(results);
}

// ============================================================================
// EMAIL TEMPLATES (SEP Integration - backward compatible)
// ============================================================================

/**
 * Get email templates for SEP email modal
 * Returns in format compatible with existing SEP email modal
 * @returns {Array} Array of { id, name, category, subject, body }
 */
function getEmailTemplatesForSEP() {
  var templates = loadAllTemplates_();

  // Filter to templates that have email_subject (i.e., email templates)
  var emailTemplates = templates.filter(function(t) {
    return t.is_active !== false && t.email_subject;
  });

  // Map to expected format
  return emailTemplates.map(function(t) {
    return {
      id: t.template_id,
      name: t.name,
      category: t.category + (t.subcategory ? ' - ' + t.subcategory : ''),
      subject: t.email_subject,
      body: t.email_body
    };
  });
}

/**
 * Get templates grouped by category for UI
 * @returns {Object} Templates grouped by category
 */
function getTemplatesGroupedByCategory() {
  var templates = getAllTemplates();
  var grouped = {};

  TEMPLATE_CATEGORIES.forEach(function(cat) {
    grouped[cat] = [];
  });

  templates.forEach(function(t) {
    if (t.category && grouped[t.category]) {
      grouped[t.category].push(t);
    }
  });

  return grouped;
}

// ============================================================================
// COMMS INTEGRATION
// ============================================================================

/**
 * Get templates relevant for Comms page
 * Includes Outreach, Blurbs, and SEP milestone notifications
 * @returns {Object} Categorized templates for Comms
 */
function getCommsTemplates() {
  return {
    outreach: getOutreachTemplates(),
    blurbs: getBlurbTemplates(),
    milestone_notifications: getTemplatesBySubcategory('Notification'),
    supplementary: getTemplatesByCategory('Supplementary')
  };
}
