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

  // Sort by last_update_date descending (most recent first)
  _storiesCache.sort(function(a, b) {
    var dateA = a.last_update_date ? new Date(a.last_update_date) : (a.idea_date ? new Date(a.idea_date) : new Date(0));
    var dateB = b.last_update_date ? new Date(b.last_update_date) : (b.idea_date ? new Date(b.idea_date) : new Date(0));
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
    return JSON.parse(JSON.stringify(stories.slice(0, limit)));
  }
  return JSON.parse(JSON.stringify(stories));
}

/**
 * Get story by ID
 * @param {string} storyId - Story ID
 * @returns {Object|null} Story record or null
 */
function getStoryById(storyId) {
  var stories = loadAllStories_();
  var story = stories.find(function(s) {
    return s.story_id === storyId;
  });
  return story ? JSON.parse(JSON.stringify(story)) : null;
}

/**
 * Create a new story
 * @param {Object} storyData - Story data
 * @returns {Object} Created story with ID
 */
function createStory(storyData) {
  var sheet = getStoriesSheet_();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

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

  // Set defaults
  storyData.created_at = new Date().toISOString();
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

  sheet.appendRow(newRow);
  clearStoriesCache_();

  return storyData;
}

/**
 * Update an existing story
 * @param {string} storyId - Story ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated story or null if not found
 */
function updateStory(storyId, updates) {
  var sheet = getStoriesSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

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
    return null;
  }

  // Update last_update_date automatically
  updates.last_update_date = new Date().toISOString().split('T')[0];

  // Update cells
  headers.forEach(function(header, colIndex) {
    if (updates.hasOwnProperty(header) && header !== 'story_id' && header !== 'created_at') {
      sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[header]);
    }
  });

  clearStoriesCache_();

  return getStoryById(storyId);
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
  var stories = loadAllStories_();
  var results = stories.filter(function(s) {
    return s.status && s.status.toLowerCase() === status.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get stories by content type
 * @param {string} contentType - Content type
 * @returns {Array} Stories of this type
 */
function getStoriesByContentType(contentType) {
  var stories = loadAllStories_();
  var results = stories.filter(function(s) {
    return s.content_type && s.content_type.toLowerCase() === contentType.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get stories by solution
 * @param {string} solutionId - Solution ID or name
 * @returns {Array} Stories for this solution
 */
function getStoriesBySolution(solutionId) {
  var stories = loadAllStories_();
  var searchLower = solutionId.toLowerCase();

  var results = stories.filter(function(s) {
    if (s.solution_ids) {
      var ids = s.solution_ids.split(',').map(function(id) { return id.trim().toLowerCase(); });
      if (ids.indexOf(searchLower) !== -1) return true;
    }
    if (s.solution_names) {
      var names = s.solution_names.split(',').map(function(n) { return n.trim().toLowerCase(); });
      for (var i = 0; i < names.length; i++) {
        if (names[i].indexOf(searchLower) !== -1) return true;
      }
    }
    return false;
  });

  return JSON.parse(JSON.stringify(results));
}

/**
 * Get stories by channel
 * @param {string} channel - Channel (web, social, slide, external, newsletter)
 * @returns {Array} Stories for this channel
 */
function getStoriesByChannel(channel) {
  var stories = loadAllStories_();
  var results = stories.filter(function(s) {
    return s.channel && s.channel.toLowerCase() === channel.toLowerCase();
  });
  return JSON.parse(JSON.stringify(results));
}

/**
 * Get story pipeline counts (for kanban columns)
 * @returns {Object} Count of stories in each status
 */
function getStoryPipelineCounts() {
  var stories = loadAllStories_();
  var counts = {
    idea: 0,
    researching: 0,
    drafting: 0,
    review: 0,
    published: 0,
    archived: 0
  };

  stories.forEach(function(s) {
    var status = (s.status || 'idea').toLowerCase();
    if (counts.hasOwnProperty(status)) {
      counts[status]++;
    }
  });

  return counts;
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
  return JSON.parse(JSON.stringify(results));
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
    var solName = sol.solution_name || sol.name;
    if (!solName) return;

    solutionCoverage[solName] = {
      solution_name: solName,
      solution_id: sol.solution_id || '',
      phase: sol.lifecycle_phase || sol.phase || '',
      total_stories: 0,
      recent_stories: 0,
      last_story_date: null,
      days_since_story: null
    };
  });

  // Process stories
  stories.forEach(function(s) {
    if (!s.solution_names) return;

    var names = s.solution_names.split(',').map(function(n) { return n.trim(); });
    var storyDate = s.publish_date || s.idea_date || s.created_at;
    var storyDateObj = storyDate ? new Date(storyDate) : null;

    names.forEach(function(name) {
      if (!solutionCoverage[name]) {
        // Solution from story not in master list
        solutionCoverage[name] = {
          solution_name: name,
          solution_id: '',
          phase: '',
          total_stories: 0,
          recent_stories: 0,
          last_story_date: null,
          days_since_story: null
        };
      }

      solutionCoverage[name].total_stories++;

      if (storyDateObj && storyDateObj >= cutoff) {
        solutionCoverage[name].recent_stories++;
      }

      // Track most recent story
      if (storyDateObj) {
        if (!solutionCoverage[name].last_story_date ||
            storyDateObj > new Date(solutionCoverage[name].last_story_date)) {
          solutionCoverage[name].last_story_date = storyDate;
        }
      }
    });
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
      // Check ATP (Authority to Proceed)
      if (sol.atp_date) {
        var atpDate = new Date(sol.atp_date);
        if (atpDate >= thirtyDaysAgo) {
          opportunities.milestones.push({
            type: 'ATP',
            solution_name: sol.solution_name || sol.name,
            solution_id: sol.solution_id,
            date: sol.atp_date,
            description: 'Reached Authority to Proceed'
          });
        }
      }

      // Check F2I (First to Infuse)
      if (sol.f2i_date) {
        var f2iDate = new Date(sol.f2i_date);
        if (f2iDate >= thirtyDaysAgo) {
          opportunities.milestones.push({
            type: 'F2I',
            solution_name: sol.solution_name || sol.name,
            solution_id: sol.solution_id,
            date: sol.f2i_date,
            description: 'First to Infuse milestone'
          });
        }
      }

      // Check ORR (Operational Readiness Review)
      if (sol.orr_date) {
        var orrDate = new Date(sol.orr_date);
        if (orrDate >= thirtyDaysAgo) {
          opportunities.milestones.push({
            type: 'ORR',
            solution_name: sol.solution_name || sol.name,
            solution_id: sol.solution_id,
            date: sol.orr_date,
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

  // Count unique solutions covered
  var coveredSolutions = {};
  stories.forEach(function(s) {
    if (s.solution_names) {
      s.solution_names.split(',').forEach(function(name) {
        coveredSolutions[name.trim()] = true;
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

  return JSON.parse(JSON.stringify(published.slice(0, limit)));
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

  return JSON.parse(JSON.stringify(results));
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

  return JSON.parse(JSON.stringify(results));
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
 * Search stories by title or notes
 * @param {string} query - Search query
 * @returns {Array} Matching stories
 */
function searchStories(query) {
  var stories = loadAllStories_();
  var queryLower = query.toLowerCase();

  var results = stories.filter(function(s) {
    return (s.title && s.title.toLowerCase().indexOf(queryLower) !== -1) ||
           (s.notes && s.notes.toLowerCase().indexOf(queryLower) !== -1) ||
           (s.solution_names && s.solution_names.toLowerCase().indexOf(queryLower) !== -1);
  });

  return JSON.parse(JSON.stringify(results));
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

  // Return with essential fields
  return active.map(function(s) {
    return {
      story_id: s.story_id,
      title: s.title,
      content_type: s.content_type,
      status: s.status,
      solution_names: s.solution_names,
      channel: s.channel,
      author: s.author,
      target_date: s.target_date,
      priority: s.priority,
      published_link: s.published_link,
      idea_date: s.idea_date,
      last_update_date: s.last_update_date
    };
  });
}
