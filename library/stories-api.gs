/**
 * Stories API - Comms-NSITE
 * =========================
 * Communications story pipeline and content tracking
 * Supports all content types: stories, web content, social media, etc.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the Stories database sheet
 * Reads STORIES_SHEET_ID from MO-DB_Config
 * Note: STORIES_TRACKING_SHEET_ID is the source workbook, this is the normalized database
 */
function getStoriesSheet_() {
  var sheetId = getConfigValue('STORIES_SHEET_ID');
  if (!sheetId) {
    throw new Error('STORIES_SHEET_ID not configured in MO-DB_Config');
  }
  var ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

/**
 * Cache for stories data (refreshed per execution)
 */
var _storiesCache = null;

/**
 * Load all stories into memory for fast querying
 */
function loadAllStories_() {
  if (_storiesCache !== null) {
    return _storiesCache;
  }

  var sheet = getStoriesSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _storiesCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var story = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      if (value instanceof Date) {
        story[header] = value.toISOString();
      } else {
        story[header] = value;
      }
    });
    // Only include records with story_id
    if (story.story_id) {
      _storiesCache.push(story);
    }
  }

  // Sort by last_updated descending (most recent first)
  _storiesCache.sort(function(a, b) {
    var dateA = a.last_updated ? new Date(a.last_updated) : (a.idea_date ? new Date(a.idea_date) : new Date(0));
    var dateB = b.last_updated ? new Date(b.last_updated) : (b.idea_date ? new Date(b.idea_date) : new Date(0));
    return dateB - dateA;
  });

  return _storiesCache;
}

/**
 * Clear stories cache (call after mutations)
 */
function clearStoriesCache_() {
  _storiesCache = null;
}

// ============================================================================
// CONTENT TYPE & STATUS CONSTANTS
// ============================================================================

/**
 * Valid content types
 */
var CONTENT_TYPES = [
  'story',
  'web_content',
  'social_media',
  'external_mention',
  'nugget',
  'key_date'
];

/**
 * Content type display names
 */
var CONTENT_TYPE_NAMES = {
  'story': 'Impact Story',
  'web_content': 'Web Content',
  'social_media': 'Social Media',
  'external_mention': 'External Mention',
  'nugget': 'Nugget Slide',
  'key_date': 'Key Date'
};

/**
 * Valid story statuses (pipeline stages)
 */
var STORY_STATUSES = [
  'idea',
  'researching',
  'drafting',
  'review',
  'published',
  'archived'
];

/**
 * Status display names and order
 */
var STORY_STATUS_INFO = {
  'idea': { name: 'Idea', order: 1, color: '#9E9E9E' },
  'researching': { name: 'Researching', order: 2, color: '#2196F3' },
  'drafting': { name: 'Drafting', order: 3, color: '#FF9800' },
  'review': { name: 'Review', order: 4, color: '#9C27B0' },
  'published': { name: 'Published', order: 5, color: '#4CAF50' },
  'archived': { name: 'Archived', order: 6, color: '#607D8B' }
};

/**
 * Valid channels
 */
var CHANNELS = ['web', 'social', 'slide', 'external', 'newsletter'];

/**
 * Priority levels
 */
var PRIORITIES = ['high', 'medium', 'low'];

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Get all stories
 * @param {number} limit - Optional max results
 * @returns {Array} All story records
 */
function getAllStories(limit) {
  var stories = loadAllStories_();
  if (limit && limit > 0) {
    return deepCopy(stories.slice(0, limit));
  }
  return deepCopy(stories);
}

/**
 * Get story by ID
 * @param {string} storyId - Story ID
 * @returns {Object|null} Story record or null
 */
function getStoryById(storyId) {
  return getById(loadAllStories_(), 'story_id', storyId);
}

/**
 * Create a new story
 * @param {Object} storyData - Story data
 * @returns {Object} Created story with ID
 */
function createStory(storyData) {
  try {
    // Validate required fields
    if (!storyData.title || !String(storyData.title).trim()) {
      return { success: false, error: 'Story title is required' };
    }
    if (!storyData.solution_id || !String(storyData.solution_id).trim()) {
      return { success: false, error: 'Solution is required' };
    }

    var sheet = getStoriesSheet_();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    Logger.log('createStory called with: ' + JSON.stringify(storyData));
    Logger.log('Sheet headers: ' + JSON.stringify(headers));

    // Generate story_id if not provided
    if (!storyData.story_id) {
      var contentType = storyData.content_type || 'story';
      var prefix = {
        'story': 'STY',
        'web_content': 'WEB',
        'social_media': 'SOC',
        'external_mention': 'EXT',
        'nugget': 'NUG',
        'key_date': 'KEY'
      }[contentType] || 'STY';
      var timestamp = new Date().getTime();
      storyData.story_id = prefix + '_' + timestamp;
    }

    // Set defaults - use actual column names from MO-DB_Stories
    storyData.created_date = new Date().toISOString();
    storyData.status = storyData.status || 'idea';
    storyData.content_type = storyData.content_type || 'story';
    storyData.priority = storyData.priority || 'medium';

    if (!storyData.idea_date) {
      storyData.idea_date = new Date().toISOString().split('T')[0];
    }

    // Build row from headers
    var newRow = headers.map(function(header) {
      return storyData[header] !== undefined ? storyData[header] : '';
    });

    Logger.log('Appending row: ' + JSON.stringify(newRow));

    sheet.appendRow(newRow);
    SpreadsheetApp.flush(); // Force write to sheet
    clearStoriesCache_();

    Logger.log('Story created successfully: ' + storyData.story_id);
    return storyData;
  } catch (e) {
    Logger.log('Error in createStory: ' + e.message);
    throw new Error('Failed to create story: ' + e.message);
  }
}

/**
 * Update an existing story
 * @param {string} storyId - Story ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated story or null if not found
 */
function updateStory(storyId, updates) {
  try {
    Logger.log('updateStory called for: ' + storyId);
    Logger.log('Updates: ' + JSON.stringify(updates));

    var sheet = getStoriesSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    Logger.log('Sheet headers: ' + JSON.stringify(headers));

    var idColIndex = headers.indexOf('story_id');
    if (idColIndex === -1) {
      throw new Error('story_id column not found');
    }

    // Find row to update
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === storyId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      Logger.log('Story not found: ' + storyId);
      return null;
    }

    Logger.log('Found story at row: ' + (rowIndex + 1));

    // Update last_updated automatically (matches column name in MO-DB_Stories)
    updates.last_updated = new Date().toISOString().split('T')[0];

    // Update cells
    var updatedFields = [];
    headers.forEach(function(header, colIndex) {
      if (updates.hasOwnProperty(header) && header !== 'story_id' && header !== 'created_date') {
        Logger.log('Updating ' + header + ' at col ' + (colIndex + 1) + ' to: ' + updates[header]);
        sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[header]);
        updatedFields.push(header);
      }
    });

    SpreadsheetApp.flush(); // Force write to sheet
    clearStoriesCache_();

    Logger.log('Updated fields: ' + updatedFields.join(', '));
    return getStoryById(storyId);
  } catch (e) {
    Logger.log('Error in updateStory: ' + e.message);
    throw new Error('Failed to update story: ' + e.message);
  }
}

/**
 * Delete a story
 * @param {string} storyId - Story ID to delete
 * @returns {boolean} Success status
 */
function deleteStory(storyId) {
  var sheet = getStoriesSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idColIndex = headers.indexOf('story_id');
  if (idColIndex === -1) {
    return false;
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === storyId) {
      sheet.deleteRow(i + 1);
      clearStoriesCache_();
      return true;
    }
  }

  return false;
}

// ============================================================================
// PIPELINE QUERIES
// ============================================================================

/**
 * Get stories by status (pipeline stage)
 * @param {string} status - Status (idea, researching, drafting, review, published, archived)
 * @returns {Array} Stories in this status
 */
function getStoriesByStatus(status) {
  return filterByProperty(loadAllStories_(), 'status', status, true);
}

/**
 * Get stories by content type
 * @param {string} contentType - Content type
 * @returns {Array} Stories of this type
 */
function getStoriesByContentType(contentType) {
  return filterByProperty(loadAllStories_(), 'content_type', contentType, true);
}

/**
 * Get stories by solution
 * @param {string} solutionId - Solution ID (core_id from Solutions DB)
 * @returns {Array} Stories for this solution
 */
function getStoriesBySolution(solutionId) {
  var stories = loadAllStories_();
  var searchLower = solutionId.toLowerCase();

  var results = stories.filter(function(s) {
    // Check solution_id field (single or comma-separated)
    var solId = s.solution_id || '';
    var ids = solId.split(',').map(function(id) { return id.trim().toLowerCase(); });
    return ids.includes(searchLower);
  });

  return deepCopy(results);
}

/**
 * Get stories by channel
 * @param {string} channel - Channel (web, social, slide, external, newsletter)
 * @returns {Array} Stories for this channel
 */
function getStoriesByChannel(channel) {
  return filterByProperty(loadAllStories_(), 'channel', channel, true);
}

/**
 * Get story pipeline counts (for kanban columns)
 * @returns {Object} Count of stories in each status
 */
function getStoryPipelineCounts() {
  return countByField(loadAllStories_(), 'status');
}

/**
 * Get stories in pipeline (non-archived)
 * @returns {Array} Active pipeline stories
 */
function getPipelineStories() {
  var stories = loadAllStories_();
  var results = stories.filter(function(s) {
    return s.status && s.status.toLowerCase() !== 'archived';
  });
  return deepCopy(results);
}

// ============================================================================
// COVERAGE ANALYSIS
// ============================================================================

/**
 * Get coverage analysis - solutions with/without recent stories
 * @param {number} days - Days to consider "recent" (default 90)
 * @returns {Object} Coverage analysis data
 */
function getCoverageAnalysis(days) {
  days = days || 90;
  var stories = loadAllStories_();

  // Get all solutions from Implementation data
  var allSolutions = [];
  try {
    allSolutions = getAllSolutions();
  } catch (e) {
    Logger.log('Could not load solutions for coverage analysis: ' + e);
  }

  // Calculate cutoff date
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Track story coverage by solution
  var solutionCoverage = {};

  allSolutions.forEach(function(sol) {
    // Schema v2: use core_id as the solution_id, core_official_name as display name
    var solId = sol.core_id || '';
    var solName = sol.core_official_name || sol.solution_name || sol.name || solId;
    if (!solId) return;

    solutionCoverage[solId] = {
      solution_name: solName,
      solution_id: solId,
      phase: sol.admin_lifecycle_phase || sol.lifecycle_phase || sol.phase || '',
      total_stories: 0,
      recent_stories: 0,
      last_story_date: null,
      days_since_story: null
    };
  });

  // Process stories - using solution_id field (stories are single solution)
  stories.forEach(function(s) {
    if (!s.solution_id) return;

    var solId = s.solution_id.trim();
    var storyDate = s.publish_date || s.idea_date || s.created_date;
    var storyDateObj = storyDate ? new Date(storyDate) : null;

    // Find solution name from master list by ID
    var solName = solId;
    var sol = allSolutions.find(function(solution) { return solution.core_id === solId; });
    if (sol) {
      solName = sol.core_official_name || sol.solution_name || solId;
    }

    if (!solutionCoverage[solId]) {
      // Solution from story not in master list
      solutionCoverage[solId] = {
        solution_name: solName,
        solution_id: solId,
        phase: '',
        total_stories: 0,
        recent_stories: 0,
        last_story_date: null,
        days_since_story: null
      };
    }

    solutionCoverage[solId].total_stories++;

    if (storyDateObj && storyDateObj >= cutoff) {
      solutionCoverage[solId].recent_stories++;
    }

    // Track most recent story
    if (storyDateObj) {
      if (!solutionCoverage[solId].last_story_date ||
          storyDateObj > new Date(solutionCoverage[solId].last_story_date)) {
        solutionCoverage[solId].last_story_date = storyDate;
      }
    }
  });

  // Calculate days since last story
  var today = new Date();
  Object.keys(solutionCoverage).forEach(function(name) {
    var cov = solutionCoverage[name];
    if (cov.last_story_date) {
      var lastDate = new Date(cov.last_story_date);
      cov.days_since_story = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    }
  });

  // Categorize
  var wellCovered = [];
  var needsAttention = [];
  var noStories = [];

  Object.values(solutionCoverage).forEach(function(cov) {
    if (cov.total_stories === 0) {
      noStories.push(cov);
    } else if (cov.days_since_story && cov.days_since_story > days) {
      needsAttention.push(cov);
    } else {
      wellCovered.push(cov);
    }
  });

  // Sort by days since story (descending)
  needsAttention.sort(function(a, b) {
    return (b.days_since_story || 0) - (a.days_since_story || 0);
  });

  return {
    period_days: days,
    total_solutions: Object.keys(solutionCoverage).length,
    well_covered: wellCovered.length,
    needs_attention: needsAttention.length,
    no_stories: noStories.length,
    gaps: needsAttention,
    uncovered: noStories,
    covered: wellCovered
  };
}

/**
 * Get solutions without any stories
 * @returns {Array} Solutions with no story coverage
 */
function getSolutionsWithoutStories() {
  var analysis = getCoverageAnalysis(365); // Look back one year
  return analysis.uncovered;
}

// ============================================================================
// OPPORTUNITY DETECTION (KEY FEATURE)
// ============================================================================

/**
 * Detect story opportunities from SEP and Implementation data
 * @returns {Object} Detected opportunities
 */
function detectStoryOpportunities() {
  var opportunities = {
    milestones: [],
    t8_contacts: [],
    new_engagements: [],
    coverage_gaps: []
  };

  // 1. Recent milestone completions from Implementation data
  try {
    var solutions = getAllSolutions();
    var thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    solutions.forEach(function(sol) {
      // Schema v2: use core_id, core_official_name, milestone_*_date columns
      var solId = sol.core_id || '';
      var solName = sol.core_official_name || sol.solution_name || sol.name || solId;

      // Check ATP (Authority to Proceed)
      if (sol.milestone_atp_date) {
        var atpDate = new Date(sol.milestone_atp_date);
        if (atpDate >= thirtyDaysAgo) {
          opportunities.milestones.push({
            type: 'ATP',
            solution_name: solName,
            solution_id: solId,
            date: sol.milestone_atp_date,
            description: 'Reached Authority to Proceed'
          });
        }
      }

      // Check F2I (Formulation to Implementation)
      if (sol.milestone_f2i_date) {
        var f2iDate = new Date(sol.milestone_f2i_date);
        if (f2iDate >= thirtyDaysAgo) {
          opportunities.milestones.push({
            type: 'F2I',
            solution_name: solName,
            solution_id: solId,
            date: sol.milestone_f2i_date,
            description: 'Formulation to Implementation milestone'
          });
        }
      }

      // Check ORR (Operational Readiness Review)
      if (sol.milestone_orr_date) {
        var orrDate = new Date(sol.milestone_orr_date);
        if (orrDate >= thirtyDaysAgo) {
          opportunities.milestones.push({
            type: 'ORR',
            solution_name: solName,
            solution_id: solId,
            date: sol.milestone_orr_date,
            description: 'Operational Readiness Review completed'
          });
        }
      }
    });
  } catch (e) {
    Logger.log('Could not check milestones: ' + e);
  }

  // 2. T8 (Impact) touchpoint contacts from SEP data
  try {
    var t8Contacts = getContactsByTouchpoint('T8');
    var uniqueT8 = {};

    t8Contacts.forEach(function(c) {
      var key = c.email || (c.first_name + ' ' + c.last_name);
      if (!uniqueT8[key]) {
        uniqueT8[key] = {
          name: (c.first_name || '') + ' ' + (c.last_name || ''),
          email: c.email,
          agency: c.agency,
          solutions: c.solutions || []
        };
      }
    });

    opportunities.t8_contacts = Object.values(uniqueT8);
  } catch (e) {
    Logger.log('Could not check T8 contacts: ' + e);
  }

  // 3. Recent engagements (new agency relationships)
  try {
    var recentEngagements = getRecentEngagements(30, 50);
    var newAgencies = {};

    recentEngagements.forEach(function(e) {
      if (e.agency_id && !newAgencies[e.agency_id]) {
        newAgencies[e.agency_id] = {
          agency_id: e.agency_id,
          agency_name: e.agency_name || e.agency_id,
          engagement_date: e.date,
          engagement_type: e.activity_type
        };
      }
    });

    opportunities.new_engagements = Object.values(newAgencies).slice(0, 10);
  } catch (e) {
    Logger.log('Could not check recent engagements: ' + e);
  }

  // 4. Coverage gaps
  try {
    var coverage = getCoverageAnalysis(90);
    opportunities.coverage_gaps = coverage.gaps.slice(0, 10);
  } catch (e) {
    Logger.log('Could not check coverage gaps: ' + e);
  }

  // Add summary counts
  opportunities.summary = {
    total_opportunities: opportunities.milestones.length +
                         opportunities.t8_contacts.length +
                         opportunities.new_engagements.length +
                         opportunities.coverage_gaps.length,
    milestones_count: opportunities.milestones.length,
    t8_contacts_count: opportunities.t8_contacts.length,
    new_engagements_count: opportunities.new_engagements.length,
    coverage_gaps_count: opportunities.coverage_gaps.length
  };

  return opportunities;
}

// ============================================================================
// STATISTICS & OVERVIEW
// ============================================================================

/**
 * Get communications statistics
 * @returns {Object} Summary statistics
 */
function getCommsStats() {
  var stories = loadAllStories_();

  var byType = {};
  var byStatus = {};
  var byChannel = {};
  var byMonth = {};

  // Calculate quarterly stats
  var now = new Date();
  var quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

  var thisQuarterPublished = 0;

  stories.forEach(function(s) {
    // By content type
    if (s.content_type) {
      byType[s.content_type] = (byType[s.content_type] || 0) + 1;
    }

    // By status
    if (s.status) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }

    // By channel
    if (s.channel) {
      byChannel[s.channel] = (byChannel[s.channel] || 0) + 1;
    }

    // By month (using publish_date or idea_date)
    var dateStr = s.publish_date || s.idea_date;
    if (dateStr) {
      var monthKey = dateStr.substring(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;

      // Check if published this quarter
      if (s.status === 'published') {
        var pubDate = new Date(dateStr);
        if (pubDate >= quarterStart) {
          thisQuarterPublished++;
        }
      }
    }
  });

  // Count unique solutions covered (now using solution_id)
  var coveredSolutions = {};
  stories.forEach(function(s) {
    if (s.solution_id) {
      s.solution_id.split(',').forEach(function(id) {
        coveredSolutions[id.trim()] = true;
      });
    }
  });

  // Active pipeline (non-archived, non-published)
  var activePipeline = stories.filter(function(s) {
    return s.status && s.status !== 'archived' && s.status !== 'published';
  }).length;

  return {
    total_stories: stories.length,
    active_pipeline: activePipeline,
    published_this_quarter: thisQuarterPublished,
    solutions_covered: Object.keys(coveredSolutions).length,
    by_content_type: byType,
    by_status: byStatus,
    by_channel: byChannel,
    by_month: byMonth
  };
}

/**
 * Get comprehensive comms overview for dashboard
 * @returns {Object} Overview data
 */
function getCommsOverview() {
  var stats = getCommsStats();
  var pipelineCounts = getStoryPipelineCounts();
  var opportunities = detectStoryOpportunities();

  // Get coverage gaps
  var coverage = getCoverageAnalysis(90);

  return {
    stats: stats,
    pipeline: pipelineCounts,
    opportunities_count: opportunities.summary.total_opportunities,
    coverage_gaps_count: coverage.needs_attention + coverage.no_stories,
    recent_published: getRecentPublished(5)
  };
}

/**
 * Get recently published stories
 * @param {number} limit - Max results
 * @returns {Array} Recent published stories
 */
function getRecentPublished(limit) {
  limit = limit || 10;
  var stories = loadAllStories_();

  var published = stories.filter(function(s) {
    return s.status === 'published';
  });

  // Sort by publish_date descending
  published.sort(function(a, b) {
    var dateA = a.publish_date ? new Date(a.publish_date) : new Date(0);
    var dateB = b.publish_date ? new Date(b.publish_date) : new Date(0);
    return dateB - dateA;
  });

  return deepCopy(published.slice(0, limit));
}

// ============================================================================
// QUERY BY DATE RANGE
// ============================================================================

/**
 * Get stories within a date range
 * @param {string} startDate - Start date (ISO string or YYYY-MM-DD)
 * @param {string} endDate - End date (ISO string or YYYY-MM-DD)
 * @param {string} dateField - Which date field to use (publish_date, idea_date, target_date)
 * @returns {Array} Stories within range
 */
function getStoriesByDateRange(startDate, endDate, dateField) {
  dateField = dateField || 'publish_date';
  var stories = loadAllStories_();
  var start = new Date(startDate);
  var end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  var results = stories.filter(function(s) {
    var dateValue = s[dateField];
    if (!dateValue) return false;
    var storyDate = new Date(dateValue);
    return storyDate >= start && storyDate <= end;
  });

  return deepCopy(results);
}

/**
 * Get stories with upcoming target dates
 * @param {number} days - Days ahead to check
 * @returns {Array} Stories with upcoming targets
 */
function getUpcomingTargets(days) {
  days = days || 30;
  var stories = loadAllStories_();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  var results = stories.filter(function(s) {
    if (!s.target_date) return false;
    if (s.status === 'published' || s.status === 'archived') return false;
    var targetDate = new Date(s.target_date);
    return targetDate >= today && targetDate <= cutoff;
  });

  // Sort by target_date ascending
  results.sort(function(a, b) {
    return new Date(a.target_date) - new Date(b.target_date);
  });

  return deepCopy(results);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get content type options for UI
 * @returns {Array} Content type options with metadata
 */
function getContentTypeOptions() {
  return CONTENT_TYPES.map(function(type) {
    return {
      value: type,
      name: CONTENT_TYPE_NAMES[type] || type
    };
  });
}

/**
 * Get status options for UI
 * @returns {Array} Status options with metadata
 */
function getStatusOptions() {
  return STORY_STATUSES.map(function(status) {
    var info = STORY_STATUS_INFO[status] || {};
    return {
      value: status,
      name: info.name || status,
      order: info.order || 0,
      color: info.color || '#9E9E9E'
    };
  });
}

/**
 * Get channel options for UI
 * @returns {Array} Channel options
 */
function getChannelOptions() {
  return CHANNELS.map(function(ch) {
    return {
      value: ch,
      name: ch.charAt(0).toUpperCase() + ch.slice(1)
    };
  });
}

/**
 * Get priority options for UI
 * @returns {Array} Priority options
 */
function getPriorityOptions() {
  return PRIORITIES.map(function(p) {
    return {
      value: p,
      name: p.charAt(0).toUpperCase() + p.slice(1)
    };
  });
}

/**
 * Update story status (shortcut for status updates)
 * @param {string} storyId - Story ID
 * @param {string} newStatus - New status
 * @returns {Object|null} Updated story
 */
function updateStoryStatus(storyId, newStatus) {
  return updateStory(storyId, { status: newStatus });
}

/**
 * Search stories by title, notes, or solution_id
 * @param {string} query - Search query
 * @returns {Array} Matching stories
 */
function searchStories(query) {
  var stories = loadAllStories_();
  var queryLower = query.toLowerCase();

  var results = stories.filter(function(s) {
    return (s.title && s.title.toLowerCase().includes(queryLower)) ||
           (s.notes && s.notes.toLowerCase().includes(queryLower)) ||
           (s.solution_id && s.solution_id.toLowerCase().includes(queryLower));
  });

  return deepCopy(results);
}

/**
 * Get stories for pipeline view (optimized for UI)
 * @returns {Array} Stories with pipeline-relevant fields
 */
function getPipelineStoriesForUI() {
  var stories = loadAllStories_();

  // Filter to active pipeline (exclude archived)
  var active = stories.filter(function(s) {
    return s.status !== 'archived';
  });

  // Return all fields for complete data in UI (no need for secondary fetch)
  return deepCopy(active);
}
