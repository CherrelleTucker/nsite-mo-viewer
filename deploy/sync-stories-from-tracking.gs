/**
 * Sync Stories from NSITE Story Tracking Workbook
 * ================================================
 * Container-bound script for MO-DB_Stories sheet.
 *
 * Pulls story data from STORIES_TRACKING_SHEET_ID (NSITE Story Tracking workbook)
 * and populates the MO-DB_Stories database (STORIES_SHEET_ID).
 *
 * Source sheets processed:
 * - Impact Story Pipeline -> content_type: 'story'
 * - Web Content -> content_type: 'web_content'
 * - Social Media -> content_type: 'social_media'
 * - NuggetFeatured Slide -> content_type: 'nugget'
 * - Key Dates -> content_type: 'key_date'
 * - Science Advancement Stories -> content_type: 'science_advancement'
 *
 * @author Claude AI
 * @version 1.0.0
 */

// Configuration
var STORIES_TRACKING_SHEET_ID = null; // Set from config

/**
 * Main sync function - called from menu or trigger
 */
function syncStoriesFromTracking() {
  var configSheet = getConfigSheet_();
  STORIES_TRACKING_SHEET_ID = getConfigValue_('STORIES_TRACKING_SHEET_ID', configSheet);

  if (!STORIES_TRACKING_SHEET_ID) {
    Logger.log('Error: STORIES_TRACKING_SHEET_ID not found in config');
    SpreadsheetApp.getUi().alert('Error: STORIES_TRACKING_SHEET_ID not configured');
    return;
  }

  var sourceWorkbook = SpreadsheetApp.openById(STORIES_TRACKING_SHEET_ID);
  var targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Stories');

  if (!targetSheet) {
    targetSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Stories');
    writeHeaders_(targetSheet);
  }

  var allStories = [];
  var counter = 0;

  // Process each source sheet
  var processors = [
    { name: 'Impact Story Pipeline', fn: processImpactStoryPipeline_ },
    { name: 'Web Content', fn: processWebContent_ },
    { name: 'Social Media', fn: processSocialMedia_ },
    { name: 'NuggetFeatured Slide', fn: processNuggetSlides_ },
    { name: 'Key Dates', fn: processKeyDates_ },
    { name: 'Science Advancement Stories', fn: processScienceAdvancement_ }
  ];

  processors.forEach(function(processor) {
    try {
      var sheet = sourceWorkbook.getSheetByName(processor.name);
      if (sheet) {
        var result = processor.fn(sheet, counter);
        allStories = allStories.concat(result.stories);
        counter = result.counter;
        Logger.log(processor.name + ': ' + result.stories.length + ' stories');
      } else {
        Logger.log(processor.name + ': Sheet not found');
      }
    } catch (e) {
      Logger.log(processor.name + ': Error - ' + e.message);
    }
  });

  // Write to target sheet
  if (allStories.length > 0) {
    // Clear existing data (keep headers)
    var lastRow = targetSheet.getLastRow();
    if (lastRow > 1) {
      targetSheet.getRange(2, 1, lastRow - 1, 22).clearContent();
    }

    // Write new data
    var dataRows = allStories.map(function(story) {
      return [
        story.story_id,
        story.title,
        story.content_type,
        story.status,
        story.solution_id,
        story.solution_names,
        story.channel,
        story.platform,
        story.author,
        story.comms_poc,
        story.pitch_doc_url,
        story.published_url,
        story.target_date,
        story.publish_date,
        story.idea_date,
        story.last_updated,
        story.timeliness_notes,
        story.notes,
        story.admin_priorities,
        story.source_sheet,
        story.source_row,
        story.created_date
      ];
    });

    targetSheet.getRange(2, 1, dataRows.length, 22).setValues(dataRows);

    Logger.log('Sync complete: ' + allStories.length + ' stories');
    SpreadsheetApp.getUi().alert('Sync complete!\n\n' + allStories.length + ' stories synced.');
  } else {
    Logger.log('No stories found to sync');
    SpreadsheetApp.getUi().alert('No stories found to sync.');
  }
}

/**
 * Write headers to target sheet
 */
function writeHeaders_(sheet) {
  var headers = [
    'story_id', 'title', 'content_type', 'status', 'solution_id',
    'solution_names', 'channel', 'platform', 'author', 'comms_poc',
    'pitch_doc_url', 'published_url', 'target_date', 'publish_date',
    'idea_date', 'last_updated', 'timeliness_notes', 'notes',
    'admin_priorities', 'source_sheet', 'source_row', 'created_date'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * Generate unique story ID
 */
function generateStoryId_(counter, contentType) {
  var prefixMap = {
    'story': 'STORY',
    'web_content': 'WEB',
    'social_media': 'SOCIAL',
    'nugget': 'NUG',
    'key_date': 'DATE',
    'science_advancement': 'SCI'
  };
  var prefix = prefixMap[contentType] || 'STORY';
  return prefix + '-' + String(counter).padStart(3, '0');
}

/**
 * Normalize status values
 */
function normalizeStatus_(statusValue) {
  if (!statusValue) return 'idea';

  var statusStr = String(statusValue).toLowerCase().trim();
  var statusMap = {
    'under review': 'review',
    'in review': 'review',
    'review': 'review',
    'proposed': 'idea',
    'idea': 'idea',
    'researching': 'researching',
    'research': 'researching',
    'drafting': 'drafting',
    'draft': 'drafting',
    'writing': 'drafting',
    'published': 'published',
    'posted': 'published',
    'live': 'published',
    'archived': 'archived',
    'cancelled': 'archived',
    'on hold': 'idea'
  };

  return statusMap[statusStr] || 'idea';
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate_(dateValue) {
  if (!dateValue) return '';

  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return String(dateValue);
}

/**
 * Get today's date formatted
 */
function getToday_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Extract URL from hyperlink cell
 */
function extractUrl_(cell) {
  if (!cell) return '';

  var richText = cell.getRichTextValue();
  if (richText) {
    var runs = richText.getRuns();
    for (var i = 0; i < runs.length; i++) {
      var url = runs[i].getLinkUrl();
      if (url) return url;
    }
  }

  // Check plain text for URL
  var value = cell.getValue();
  if (value) {
    var match = String(value).match(/https?:\/\/\S+/);
    if (match) return match[0];
  }

  return '';
}

/**
 * Get config sheet
 */
function getConfigSheet_() {
  var configSheetId = PropertiesService.getScriptProperties().getProperty('CONFIG_SHEET_ID');
  if (!configSheetId) {
    throw new Error('CONFIG_SHEET_ID not set in script properties. Go to Project Settings > Script Properties and add CONFIG_SHEET_ID with the MO-DB_Config sheet ID.');
  }
  var ss = SpreadsheetApp.openById(configSheetId);
  return ss.getSheetByName('Config') || ss.getSheets()[0];
}

/**
 * Get config value by key
 */
function getConfigValue_(key, configSheet) {
  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return null;
}

/**
 * Create empty story object
 */
function createStoryObject_() {
  return {
    story_id: '',
    title: '',
    content_type: '',
    status: 'idea',
    solution_id: '',
    solution_names: '',
    channel: '',
    platform: '',
    author: '',
    comms_poc: '',
    pitch_doc_url: '',
    published_url: '',
    target_date: '',
    publish_date: '',
    idea_date: '',
    last_updated: getToday_(),
    timeliness_notes: '',
    notes: '',
    admin_priorities: '',
    source_sheet: '',
    source_row: 0,
    created_date: getToday_()
  };
}

// ==================== SHEET PROCESSORS ====================

/**
 * Process Impact Story Pipeline sheet
 */
function processImpactStoryPipeline_(sheet, counterStart) {
  var stories = [];
  var counter = counterStart;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Find column indices
  var cols = {
    title: headers.indexOf('Title'),
    ideaDate: headers.indexOf('Date of Idea'),
    lastUpdate: headers.indexOf('Date of Last Update'),
    status: headers.indexOf('Status'),
    linkSlide: headers.indexOf('Link to Slide'),
    source: headers.indexOf('Source'),
    notes: headers.indexOf('Notes')
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var title = row[cols.title];

    if (!title || String(title).trim() === '') continue;

    counter++;
    var story = createStoryObject_();
    story.story_id = generateStoryId_(counter, 'story');
    story.title = String(title).trim();
    story.content_type = 'story';
    story.status = normalizeStatus_(row[cols.status]);
    story.channel = 'Internal';
    story.platform = 'Presentation';
    story.idea_date = formatDate_(row[cols.ideaDate]);
    story.last_updated = formatDate_(row[cols.lastUpdate]) || getToday_();
    story.notes = [row[cols.source], row[cols.notes]].filter(Boolean).join('. ');
    story.source_sheet = 'Impact Story Pipeline';
    story.source_row = i + 1;

    // Get URL from hyperlink
    var linkCell = sheet.getRange(i + 1, cols.linkSlide + 1);
    story.pitch_doc_url = extractUrl_(linkCell);

    stories.push(story);
  }

  return { stories: stories, counter: counter };
}

/**
 * Process Web Content sheet
 */
function processWebContent_(sheet, counterStart) {
  var stories = [];
  var counter = counterStart;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var cols = {
    solutions: headers.indexOf('Solution(s)'),
    title: headers.indexOf('Hyperlinked Title'),
    status: headers.indexOf('Status'),
    pitchDoc: headers.indexOf('Pitch document'),
    outlet: headers.indexOf('Primary outlet'),
    author: headers.indexOf('Author(s)'),
    commsPoc: headers.indexOf('Comms POC'),
    publishedLink: headers.indexOf('Published link '),
    publishDate: headers.indexOf('Publish date'),
    crossPosting: headers.indexOf('Cross-posting'),
    socialMedia: headers.indexOf('Social media'),
    timeliness: headers.indexOf('Timeliness consideration'),
    notes: headers.indexOf('Notes')
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var title = row[cols.title];

    if (!title || String(title).trim() === '') continue;

    counter++;
    var story = createStoryObject_();
    story.story_id = generateStoryId_(counter, 'web_content');
    story.title = String(title).trim();
    story.content_type = 'web_content';
    story.status = normalizeStatus_(row[cols.status]);
    story.solution_names = row[cols.solutions] ? String(row[cols.solutions]).trim() : '';
    story.channel = row[cols.outlet] ? String(row[cols.outlet]).trim() : 'Earthdata';
    story.platform = 'Website';
    story.author = row[cols.author] ? String(row[cols.author]).trim() : '';
    story.comms_poc = row[cols.commsPoc] ? String(row[cols.commsPoc]).trim() : '';
    story.publish_date = formatDate_(row[cols.publishDate]);
    story.timeliness_notes = row[cols.timeliness] ? String(row[cols.timeliness]).trim() : '';
    story.notes = [row[cols.crossPosting], row[cols.socialMedia], row[cols.notes]].filter(Boolean).join('. ');
    story.source_sheet = 'Web Content';
    story.source_row = i + 1;

    // Get URLs from hyperlinks
    if (cols.pitchDoc >= 0) {
      story.pitch_doc_url = extractUrl_(sheet.getRange(i + 1, cols.pitchDoc + 1));
    }
    if (cols.publishedLink >= 0) {
      story.published_url = extractUrl_(sheet.getRange(i + 1, cols.publishedLink + 1));
    }

    stories.push(story);
  }

  return { stories: stories, counter: counter };
}

/**
 * Process Social Media sheet
 */
function processSocialMedia_(sheet, counterStart) {
  var stories = [];
  var counter = counterStart;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var cols = {
    publishDate: headers.indexOf('Publish date'),
    content: headers.indexOf('Published Link/Content Summary'),
    solutions: headers.indexOf('Featured Solution(s)'),
    platform: headers.indexOf('Platform'),
    commsPoc: headers.indexOf('Comms POC'),
    status: headers.indexOf('Status'),
    crossPosting: headers.indexOf('Cross-posting'),
    notes: headers.indexOf('Notes')
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var content = row[cols.content];

    if (!content || String(content).trim() === '') continue;

    counter++;
    var contentStr = String(content).trim();
    var title = contentStr.length > 100 ? contentStr.substring(0, 100) + '...' : contentStr;

    var story = createStoryObject_();
    story.story_id = generateStoryId_(counter, 'social_media');
    story.title = title;
    story.content_type = 'social_media';
    story.status = normalizeStatus_(row[cols.status]);
    story.solution_names = row[cols.solutions] ? String(row[cols.solutions]).trim() : '';
    story.channel = 'Social Media';
    story.platform = row[cols.platform] ? String(row[cols.platform]).trim() : '';
    story.comms_poc = row[cols.commsPoc] ? String(row[cols.commsPoc]).trim() : '';
    story.publish_date = formatDate_(row[cols.publishDate]);
    story.notes = [row[cols.crossPosting], row[cols.notes]].filter(Boolean).join('. ');
    story.source_sheet = 'Social Media';
    story.source_row = i + 1;

    // Check if content contains a URL
    var urlMatch = contentStr.match(/https?:\/\/\S+/);
    if (urlMatch) {
      story.published_url = urlMatch[0];
    }

    stories.push(story);
  }

  return { stories: stories, counter: counter };
}

/**
 * Process NuggetFeatured Slide sheet
 */
function processNuggetSlides_(sheet, counterStart) {
  var stories = [];
  var counter = counterStart;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var cols = {
    date: headers.indexOf('Date (hyperlink to slide)'),
    title: headers.indexOf('Title/Summary'),
    solutions: headers.indexOf('Featured Solution(s)'),
    forum: headers.indexOf('Forum/context for slide (nugget, part of a broader strategy presentation, etc.)'),
    feedback: headers.indexOf('Leadership feedback, if any'),
    notes: headers.indexOf('Notes/reflections for next time')
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var title = row[cols.title];

    if (!title || String(title).trim() === '') continue;

    counter++;
    var story = createStoryObject_();
    story.story_id = generateStoryId_(counter, 'nugget');
    story.title = String(title).trim();
    story.content_type = 'nugget';
    story.status = 'published';
    story.solution_names = row[cols.solutions] ? String(row[cols.solutions]).trim() : '';
    story.channel = 'Internal';
    story.platform = 'Presentation';
    story.publish_date = formatDate_(row[cols.date]);
    story.notes = [row[cols.forum], row[cols.feedback], row[cols.notes]].filter(Boolean).join('. ');
    story.source_sheet = 'NuggetFeatured Slide';
    story.source_row = i + 1;

    // Get URL from date hyperlink
    if (cols.date >= 0) {
      story.pitch_doc_url = extractUrl_(sheet.getRange(i + 1, cols.date + 1));
    }

    stories.push(story);
  }

  return { stories: stories, counter: counter };
}

/**
 * Process Key Dates sheet
 */
function processKeyDates_(sheet, counterStart) {
  var stories = [];
  var counter = counterStart;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var cols = {
    date: headers.indexOf('Date'),
    milestone: headers.indexOf('Milestone (hyperlink if relevant)'),
    solutions: headers.indexOf('Related Solution(s)'),
    notes: headers.indexOf('Additional Notes')
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var milestone = row[cols.milestone];

    if (!milestone || String(milestone).trim() === '') continue;

    counter++;
    var story = createStoryObject_();
    story.story_id = generateStoryId_(counter, 'key_date');
    story.title = String(milestone).trim();
    story.content_type = 'key_date';
    story.status = 'idea';
    story.solution_names = row[cols.solutions] ? String(row[cols.solutions]).trim() : '';
    story.target_date = formatDate_(row[cols.date]);
    story.idea_date = getToday_();
    story.timeliness_notes = row[cols.notes] ? String(row[cols.notes]).trim() : '';
    story.source_sheet = 'Key Dates';
    story.source_row = i + 1;

    // Get URL from milestone hyperlink
    if (cols.milestone >= 0) {
      story.pitch_doc_url = extractUrl_(sheet.getRange(i + 1, cols.milestone + 1));
    }

    stories.push(story);
  }

  return { stories: stories, counter: counter };
}

/**
 * Process Science Advancement Stories sheet
 */
function processScienceAdvancement_(sheet, counterStart) {
  var stories = [];
  var counter = counterStart;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var cols = {
    project: headers.indexOf('Project'),
    relatedFiles: headers.indexOf('Related Files'),
    notes: headers.indexOf('Notes')
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var project = row[cols.project];

    if (!project || String(project).trim() === '') continue;

    counter++;
    var story = createStoryObject_();
    story.story_id = generateStoryId_(counter, 'science_advancement');
    story.title = String(project).trim();
    story.content_type = 'science_advancement';
    story.status = 'idea';
    story.idea_date = getToday_();
    story.notes = row[cols.notes] ? String(row[cols.notes]).trim() : '';
    story.source_sheet = 'Science Advancement Stories';
    story.source_row = i + 1;

    // Get URL from related files hyperlink
    if (cols.relatedFiles >= 0) {
      story.pitch_doc_url = extractUrl_(sheet.getRange(i + 1, cols.relatedFiles + 1));
    }

    stories.push(story);
  }

  return { stories: stories, counter: counter };
}

// ==================== MENU ====================

/**
 * Create custom menu
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Stories Sync')
    .addItem('Sync from Story Tracking', 'syncStoriesFromTracking')
    .addToUi();
}
