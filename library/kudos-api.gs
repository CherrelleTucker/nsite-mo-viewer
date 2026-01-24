/**
 * MO-APIs Library - Kudos API
 * ===========================
 * Peer recognition system for the MO team.
 * Feeds into quarterly report staff recognition suggestions.
 *
 * Part of MO-APIs Library - shared data access layer
 * Requires: config-helpers.gs
 *
 * Database: MO-DB_Kudos (Google Sheet)
 * Schema:
 *   kudos_id       - Unique identifier (KUDOS_timestamp)
 *   from_name      - Person giving kudos
 *   to_name        - Person receiving kudos
 *   message        - Recognition message
 *   category       - Category: teamwork, innovation, above_and_beyond, mentorship, delivery
 *   created_at     - Timestamp
 *   quarter        - Fiscal quarter (e.g., "Q1 FY26")
 *   slack_posted   - Whether posted to Slack (true/false)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Kudos database sheet
 * Creates it if it doesn't exist
 */
function getKudosSheet_() {
  var sheetId = getConfigValue('KUDOS_SHEET_ID');

  if (!sheetId) {
    // Try to create in same spreadsheet as other team data
    var teamSheetId = getConfigValue('AVAILABILITY_SHEET_ID');
    if (teamSheetId) {
      var ss = SpreadsheetApp.openById(teamSheetId);
      var sheet = ss.getSheetByName('MO-DB_Kudos');
      if (!sheet) {
        sheet = ss.insertSheet('MO-DB_Kudos');
        // Set up headers
        sheet.getRange(1, 1, 1, 8).setValues([[
          'kudos_id', 'from_name', 'to_name', 'message',
          'category', 'created_at', 'quarter', 'slack_posted'
        ]]);
        sheet.setFrozenRows(1);
        Logger.log('Created MO-DB_Kudos sheet');
      }
      return sheet;
    }
    throw new Error('KUDOS_SHEET_ID not configured and could not create sheet');
  }

  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheetByName('MO-DB_Kudos') || ss.getSheets()[0];
}

/**
 * Category definitions with display info
 */
var KUDOS_CATEGORIES = {
  'teamwork': { name: 'Teamwork', icon: 'group', color: '#2196F3', emoji: ':handshake:' },
  'innovation': { name: 'Innovation', icon: 'lightbulb', color: '#FF9800', emoji: ':bulb:' },
  'above_and_beyond': { name: 'Above & Beyond', icon: 'star', color: '#9C27B0', emoji: ':star2:' },
  'mentorship': { name: 'Mentorship', icon: 'school', color: '#4CAF50', emoji: ':seedling:' },
  'delivery': { name: 'Delivery', icon: 'check_circle', color: '#00BCD4', emoji: ':rocket:' }
};

/**
 * Get current fiscal quarter string (e.g., "Q1 FY26")
 */
function getCurrentFiscalQuarter_() {
  var now = new Date();
  var month = now.getMonth(); // 0-11
  var year = now.getFullYear();

  // Federal fiscal year starts October 1
  // Q1: Oct-Dec, Q2: Jan-Mar, Q3: Apr-Jun, Q4: Jul-Sep
  var fiscalYear, quarter;

  if (month >= 9) { // Oct, Nov, Dec
    fiscalYear = year + 1;
    quarter = 1;
  } else if (month >= 6) { // Jul, Aug, Sep
    fiscalYear = year;
    quarter = 4;
  } else if (month >= 3) { // Apr, May, Jun
    fiscalYear = year;
    quarter = 3;
  } else { // Jan, Feb, Mar
    fiscalYear = year;
    quarter = 2;
  }

  return 'Q' + quarter + ' FY' + String(fiscalYear).slice(-2);
}

// ============================================================================
// SLACK INTEGRATION
// ============================================================================

/**
 * Post kudos to Slack channel
 * @param {Object} kudos - Kudos object
 * @param {string} destination - 'channel' for #odsi-kudos, 'dm' for direct message
 * @returns {boolean} Success
 */
function postKudosToSlack_(kudos, destination) {
  var webhookUrl = getConfigValue('SLACK_KUDOS_WEBHOOK_URL');

  if (!webhookUrl) {
    Logger.log('SLACK_KUDOS_WEBHOOK_URL not configured - skipping Slack post');
    return false;
  }

  var catInfo = KUDOS_CATEGORIES[kudos.category] || { emoji: ':tada:', name: kudos.category };

  var message = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: catInfo.emoji + ' *Kudos!* ' + catInfo.emoji
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*' + kudos.from_name + '* gave kudos to *' + kudos.to_name + '* for *' + catInfo.name + '*'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '> ' + kudos.message
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: ':calendar: ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          }
        ]
      }
    ]
  };

  // If DM, we'd need the Slack user ID - for now just post to channel
  // DM functionality would require Slack API with user lookup
  if (destination === 'dm') {
    // Add a note that DM was requested
    message.blocks[0].text.text = catInfo.emoji + ' *Kudos for you!* ' + catInfo.emoji;
  }

  try {
    var response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    });

    var responseCode = response.getResponseCode();
    if (responseCode === 200) {
      Logger.log('Posted kudos to Slack: ' + kudos.kudos_id);
      return true;
    } else {
      Logger.log('Slack post failed with code ' + responseCode + ': ' + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log('Error posting to Slack: ' + e);
    return false;
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Submit a new kudos
 * @param {Object} data - Kudos data
 * @param {string} data.from_name - Name of person giving kudos
 * @param {string} data.to_name - Name of person receiving kudos
 * @param {string} data.message - Recognition message
 * @param {string} data.category - Category key
 * @param {boolean} data.post_to_slack - Whether to post to Slack channel
 * @returns {Object} Created kudos record
 */
function submitKudos(data) {
  if (!data.from_name || !data.to_name || !data.message || !data.category) {
    throw new Error('Missing required fields: from_name, to_name, message, category');
  }

  if (!KUDOS_CATEGORIES[data.category]) {
    throw new Error('Invalid category: ' + data.category);
  }

  var sheet = getKudosSheet_();
  var kudosId = 'KUDOS_' + new Date().getTime();
  var createdAt = new Date().toISOString();
  var quarter = getCurrentFiscalQuarter_();
  var slackPosted = false;

  var kudos = {
    kudos_id: kudosId,
    from_name: data.from_name,
    to_name: data.to_name,
    message: data.message,
    category: data.category,
    category_info: KUDOS_CATEGORIES[data.category],
    created_at: createdAt,
    quarter: quarter
  };

  // Post to Slack if requested
  if (data.post_to_slack) {
    slackPosted = postKudosToSlack_(kudos, 'channel');
  }

  var row = [
    kudosId,
    data.from_name,
    data.to_name,
    data.message,
    data.category,
    createdAt,
    quarter,
    slackPosted ? 'TRUE' : 'FALSE'
  ];

  sheet.appendRow(row);

  Logger.log('Kudos submitted: ' + kudosId + ' from ' + data.from_name + ' to ' + data.to_name);

  kudos.slack_posted = slackPosted;
  return kudos;
}

/**
 * Get all kudos, optionally filtered
 * @param {Object} options - Filter options
 * @param {number} options.limit - Max results (default 50)
 * @param {string} options.quarter - Filter by quarter (e.g., "Q1 FY26")
 * @param {string} options.to_name - Filter by recipient name
 * @param {number} options.days - Filter to last N days
 * @returns {Array} Kudos records
 */
function getAllKudos(options) {
  options = options || {};
  var limit = options.limit || 50;

  var sheet = getKudosSheet_();
  var data = sheet.getDataRange().getValues();

  if (data.length < 2) return [];

  var headers = data[0];
  var kudosList = [];

  // Build index map
  var colIndex = {};
  headers.forEach(function(h, i) { colIndex[h] = i; });

  // Calculate cutoff date if days filter specified
  var cutoffDate = null;
  if (options.days) {
    cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.days);
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[colIndex['kudos_id']]) continue;

    var kudos = {
      kudos_id: row[colIndex['kudos_id']],
      from_name: row[colIndex['from_name']] || '',
      to_name: row[colIndex['to_name']] || '',
      message: row[colIndex['message']] || '',
      category: row[colIndex['category']] || '',
      created_at: row[colIndex['created_at']] || '',
      quarter: row[colIndex['quarter']] || '',
      slack_posted: row[colIndex['slack_posted']] === 'TRUE' || row[colIndex['slack_posted']] === true
    };

    // Add category info
    kudos.category_info = KUDOS_CATEGORIES[kudos.category] || { name: kudos.category, icon: 'star', color: '#666' };

    // Apply filters
    if (options.quarter && kudos.quarter !== options.quarter) continue;
    if (options.to_name && kudos.to_name.toLowerCase() !== options.to_name.toLowerCase()) continue;

    if (cutoffDate && kudos.created_at) {
      var kudosDate = new Date(kudos.created_at);
      if (kudosDate < cutoffDate) continue;
    }

    kudosList.push(kudos);
  }

  // Sort by created_at descending (newest first)
  kudosList.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return kudosList.slice(0, limit);
}

/**
 * Get kudos for a specific person (by name)
 * @param {string} name - Person's name
 * @param {number} days - Look back N days (default 90)
 * @returns {Array} Kudos received by this person
 */
function getKudosForPerson(name, days) {
  return getAllKudos({
    to_name: name,
    days: days || 90
  });
}

/**
 * Get kudos for current quarter
 * @returns {Array} Kudos from current fiscal quarter
 */
function getKudosThisQuarter() {
  var quarter = getCurrentFiscalQuarter_();
  return getAllKudos({ quarter: quarter });
}

/**
 * Get recent kudos (last 30 days)
 * @param {number} limit - Max results
 * @returns {Array} Recent kudos
 */
function getRecentKudos(limit) {
  return getAllKudos({
    days: 30,
    limit: limit || 20
  });
}

// ============================================================================
// STATISTICS & REPORTING
// ============================================================================

/**
 * Get kudos statistics
 * @param {number} days - Look back N days (default 90)
 * @returns {Object} Statistics
 */
function getKudosStats(days) {
  days = days || 90;
  var kudos = getAllKudos({ days: days, limit: 1000 });

  var byCategory = {};
  var byRecipient = {};
  var byGiver = {};

  kudos.forEach(function(k) {
    // By category
    byCategory[k.category] = (byCategory[k.category] || 0) + 1;

    // By recipient
    var recipientKey = k.to_name;
    if (!byRecipient[recipientKey]) {
      byRecipient[recipientKey] = { name: k.to_name, count: 0 };
    }
    byRecipient[recipientKey].count++;

    // By giver
    var giverKey = k.from_name;
    if (!byGiver[giverKey]) {
      byGiver[giverKey] = { name: k.from_name, count: 0 };
    }
    byGiver[giverKey].count++;
  });

  // Convert to sorted arrays
  var topRecipients = Object.values(byRecipient)
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 10);

  var topGivers = Object.values(byGiver)
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 10);

  return {
    total: kudos.length,
    period_days: days,
    by_category: byCategory,
    top_recipients: topRecipients,
    top_givers: topGivers,
    current_quarter: getCurrentFiscalQuarter_()
  };
}

/**
 * Get staff recognition suggestions for quarterly report
 * Returns team members ranked by kudos received
 * @param {number} count - Number of suggestions (default: team_size / 4)
 * @returns {Array} Suggested staff for recognition
 */
function getRecognitionSuggestions(count) {
  // Get team members
  var teamMembers = [];
  try {
    teamMembers = getInternalTeam();
  } catch (e) {
    Logger.log('Could not load team members: ' + e);
    return [];
  }

  // Default count: team size / 4, minimum 2
  if (!count) {
    count = Math.max(2, Math.ceil(teamMembers.length / 4));
  }

  // Get kudos from last 90 days
  var kudos = getAllKudos({ days: 90, limit: 500 });

  // Build kudos count by recipient name
  var kudosByName = {};
  kudos.forEach(function(k) {
    var name = k.to_name.toLowerCase();
    if (!kudosByName[name]) {
      kudosByName[name] = { count: 0, kudos: [] };
    }
    kudosByName[name].count++;
    kudosByName[name].kudos.push(k);
  });

  // Score each team member
  var scored = teamMembers.map(function(member) {
    var fullName = ((member.first_name || '') + ' ' + (member.last_name || '')).trim().toLowerCase();
    var kudosData = kudosByName[fullName] || { count: 0, kudos: [] };

    // Get recent kudos messages for display
    var recentKudos = kudosData.kudos.slice(0, 3).map(function(k) {
      return {
        from: k.from_name,
        message: k.message,
        category: k.category
      };
    });

    return {
      name: ((member.first_name || '') + ' ' + (member.last_name || '')).trim(),
      team: member.internal_team,
      title: member.internal_title,
      kudos_count: kudosData.count,
      recent_kudos: recentKudos,
      score: kudosData.count
    };
  });

  // Sort by score descending
  scored.sort(function(a, b) { return b.score - a.score; });

  // Return top N with score > 0
  return scored.filter(function(s) { return s.score > 0; }).slice(0, count);
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Get category options for UI
 * @returns {Array} Category options with metadata
 */
function getKudosCategoryOptions() {
  return Object.keys(KUDOS_CATEGORIES).map(function(key) {
    var cat = KUDOS_CATEGORIES[key];
    return {
      value: key,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      emoji: cat.emoji
    };
  });
}

/**
 * Delete a kudos (admin function)
 * @param {string} kudosId - Kudos ID to delete
 * @returns {boolean} Success
 */
function deleteKudos(kudosId) {
  var sheet = getKudosSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('kudos_id');

  if (idCol === -1) return false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === kudosId) {
      sheet.deleteRow(i + 1);
      Logger.log('Deleted kudos: ' + kudosId);
      return true;
    }
  }

  return false;
}

/**
 * Check if Slack integration is configured
 * @returns {boolean} Whether Slack webhook is configured
 */
function isSlackConfigured() {
  return !!getConfigValue('SLACK_KUDOS_WEBHOOK_URL');
}
