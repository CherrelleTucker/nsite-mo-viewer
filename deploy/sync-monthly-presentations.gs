/**
 * Sync Monthly Presentations to Database
 * ======================================
 * Parses NSITE Monthly Meeting Google Slides presentations
 * and extracts solution updates into MO-DB_Updates
 *
 * PRESENTATION STRUCTURE:
 * - Title slide (skip)
 * - Agenda slide (skip)
 * - HQ/MO slides (solution_id: SNWG-MO or HQ in speaker notes)
 * - Cycle divider slides (skip - no solution_id)
 * - Solution slides (solution_id: HLS, DSWx, etc. in speaker notes)
 *
 * SOLUTION IDENTIFICATION:
 *
 * For NEW presentations - use speaker notes (preferred):
 *   Add this line to each solution slide's speaker notes:
 *     solution_id: HLS
 *   or for multi-solution slides:
 *     solution_ids: DSWx, DIST, DISP
 *
 * For HISTORICAL presentations - name mapping fallback:
 *   The script will automatically try to match solution names
 *   found in the slide content (e.g., "HLS", "Harmonized Landsat Sentinel")
 *   to canonical solution IDs using SOLUTION_NAME_MAP.
 *
 * SLIDE SECTIONS PARSED:
 * - "What programmatic/project timeline milestones..." → update_category: programmatic
 * - "What software/hardware/location/product..." → update_category: development
 * - "What have I done to ensure..." → update_category: engagement
 * - "The SNWG MO can help me with..." → update_category: roadblock
 *
 * SETUP:
 * 1. Add MO-APIs Library (identifier: MoApi) - uses API_LIBRARY_ID from config
 * 2. Add MONTHLY_FOLDER_ID to MO-DB_Config (folder containing presentations)
 * 3. Add solution_id to speaker notes of each solution slide
 * 4. Run syncLatestMonthlyPresentation() after each meeting
 * 5. Run syncAllMonthlyPresentations() once for historical backfill
 *
 * @fileoverview Monthly presentation sync for MO-DB_Updates
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Update categories mapped from slide section headers
 */
var SECTION_CATEGORIES = {
  'programmatic': ['programmatic', 'project timeline', 'milestone'],
  'development': ['software', 'hardware', 'location', 'product development'],
  'engagement': ['ensure', 'right fit', 'end users', 'intended impact'],
  'roadblock': ['help me with', 'roadblock', 'challenge']
};

/**
 * Patterns to skip (non-solution slides)
 */
var SKIP_PATTERNS = [
  /^agenda$/i,
  /^cycle\s+\d/i,
  /^backup/i,
  /^thank you/i,
  /^\[project name\]/i,
  /^we welcome/i,
  /^discontinued/i
];

/**
 * Solution name mapping is now loaded dynamically from the database
 * via buildSolutionNameMap() and findSolutionIdsInText() in solutions-api.gs
 *
 * To add alternate names for matching:
 * 1. Edit MO-DB_Solutions spreadsheet
 * 2. Add names to the 'alternate_names' column (pipe-delimited)
 *    Example: "Harmonized Landsat Sentinel-2|HLS v2|harmonized landsat"
 */

// Cache for config values
var _configCache = null;

// ============================================================================
// MAIN SYNC FUNCTIONS
// ============================================================================

/**
 * Sync the most recent monthly presentation
 * Use this after each monthly meeting
 */
function syncLatestMonthlyPresentation() {
  var folderId = getConfigValue_('MONTHLY_FOLDER_ID');
  if (!folderId) {
    Logger.log('MONTHLY_FOLDER_ID not configured in MO-DB_Config');
    return { error: 'MONTHLY_FOLDER_ID not configured' };
  }

  var presentation = findLatestPresentation_(folderId);
  if (!presentation) {
    Logger.log('No presentations found in folder');
    return { error: 'No presentations found' };
  }

  Logger.log('Syncing latest presentation: ' + presentation.getName());
  return syncPresentation_(presentation);
}

/**
 * Sync all presentations in the current FY folder (historical backfill)
 * Run this once to populate historical data
 */
function syncAllMonthlyPresentations() {
  var folderId = getConfigValue_('MONTHLY_FOLDER_ID');
  if (!folderId) {
    Logger.log('MONTHLY_FOLDER_ID not configured in MO-DB_Config');
    return { error: 'MONTHLY_FOLDER_ID not configured' };
  }

  var results = {
    presentations: [],
    totalNew: 0,
    totalSkipped: 0,
    errors: []
  };

  var presentations = getAllPresentations_(folderId);
  Logger.log('Found ' + presentations.length + ' presentations to process');

  for (var i = 0; i < presentations.length; i++) {
    var presentation = presentations[i];
    try {
      Logger.log('Processing: ' + presentation.getName());
      var result = syncPresentation_(presentation);
      results.presentations.push({
        name: presentation.getName(),
        newUpdates: result.newUpdates,
        skippedUpdates: result.skippedUpdates
      });
      results.totalNew += result.newUpdates;
      results.totalSkipped += result.skippedUpdates;
    } catch (error) {
      results.errors.push({
        name: presentation.getName(),
        error: error.message
      });
      Logger.log('Error processing ' + presentation.getName() + ': ' + error);
    }
  }

  Logger.log('Sync complete: ' + results.totalNew + ' new updates from ' +
             results.presentations.length + ' presentations');

  return results;
}

/**
 * Sync a specific presentation by ID
 * @param {string} presentationId - Google Slides presentation ID
 */
function syncPresentationById(presentationId) {
  var presentation = SlidesApp.openById(presentationId);
  return syncPresentation_(presentation);
}

// ============================================================================
// PRESENTATION PROCESSING
// ============================================================================

/**
 * Process a single presentation and sync updates to database
 * @param {Presentation} presentation - Google Slides presentation
 * @returns {Object} Sync results
 */
function syncPresentation_(presentation) {
  var presentationName = presentation.getName();
  var presentationId = presentation.getId();
  var presentationUrl = 'https://docs.google.com/presentation/d/' + presentationId;

  // Extract meeting date from filename (e.g., "2026-01 NSITE Monthly...")
  var meetingDate = extractMeetingDateFromFilename_(presentationName);
  Logger.log('Meeting date: ' + meetingDate);

  var slides = presentation.getSlides();
  var updates = [];

  for (var i = 0; i < slides.length; i++) {
    var slide = slides[i];
    var slideNumber = i + 1;

    // Get solution ID(s) from speaker notes first
    var solutionIds = extractSolutionIdsFromNotes_(slide);
    var slideTitle = getSlideTitle_(slide);

    // If no solution_id in notes, try name matching from slide content
    if (solutionIds.length === 0) {
      solutionIds = extractSolutionIdsFromSlideContent_(slide);
      if (solutionIds.length > 0) {
        Logger.log('Slide ' + slideNumber + ': Matched solution(s) via name mapping: ' + solutionIds.join(', '));
      }
    }

    if (solutionIds.length === 0) {
      // No solution_id found - check if it's a skip pattern slide
      if (shouldSkipSlide_(slideTitle)) {
        Logger.log('Skipping slide ' + slideNumber + ': ' + slideTitle);
        continue;
      }
      // No solution_id and not a known skip pattern - log and skip
      Logger.log('Slide ' + slideNumber + ' has no solution_id (title: "' + slideTitle + '")');
      continue;
    }

    // Parse updates from slide content
    var slideUpdates = parseSlideContent_(slide, solutionIds, {
      meetingDate: meetingDate,
      sourceDocument: 'Monthly Meeting',
      sourceUrl: presentationUrl,
      slideNumber: slideNumber,
      speaker: extractSpeakerFromSlide_(slide)
    });

    updates = updates.concat(slideUpdates);
  }

  Logger.log('Extracted ' + updates.length + ' updates from ' + presentationName);

  // Sync to database
  return syncUpdatesToDatabase_(updates);
}

/**
 * Extract solution ID(s) from slide speaker notes
 * @param {Slide} slide - Google Slides slide
 * @returns {Array} Array of solution IDs
 */
function extractSolutionIdsFromNotes_(slide) {
  var solutionIds = [];

  try {
    var notesPage = slide.getNotesPage();
    if (!notesPage) return solutionIds;

    var speakerNotesShape = notesPage.getSpeakerNotesShape();
    if (!speakerNotesShape) return solutionIds;

    var notesText = speakerNotesShape.getText().asString();
    if (!notesText) return solutionIds;

    // Look for solution_id: or solution_ids: pattern
    var lines = notesText.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      // Single solution: solution_id: HLS
      var singleMatch = line.match(/^solution_id:\s*(.+)$/i);
      if (singleMatch) {
        solutionIds.push(singleMatch[1].trim());
        continue;
      }

      // Multiple solutions: solution_ids: DSWx, DIST, DISP
      var multiMatch = line.match(/^solution_ids:\s*(.+)$/i);
      if (multiMatch) {
        var ids = multiMatch[1].split(',');
        for (var j = 0; j < ids.length; j++) {
          var id = ids[j].trim();
          if (id) solutionIds.push(id);
        }
      }
    }
  } catch (e) {
    Logger.log('Error reading speaker notes: ' + e);
  }

  return solutionIds;
}

/**
 * Extract solution ID(s) from slide content using name mapping
 * Uses MoApi library (findSolutionIdsInText) which reads from the database
 * Used as fallback for historical presentations without speaker notes
 * @param {Slide} slide - Google Slides slide
 * @returns {Array} Array of solution IDs
 */
function extractSolutionIdsFromSlideContent_(slide) {
  var shapes = slide.getShapes();

  // Collect all text from the slide
  var allText = [];
  for (var i = 0; i < shapes.length; i++) {
    try {
      var text = shapes[i].getText().asString().trim();
      if (text) allText.push(text);
    } catch (e) {
      continue;
    }
  }

  var combinedText = allText.join(' ');

  // Use the MoApi library function
  // This reads solution names from the database (including alternate_names)
  return MoApi.findSolutionIdsInText(combinedText);
}

/**
 * Parse content from a slide into update objects
 * @param {Slide} slide - Google Slides slide
 * @param {Array} solutionIds - Solution IDs this slide applies to
 * @param {Object} metadata - Common metadata for updates
 * @returns {Array} Array of update objects
 */
function parseSlideContent_(slide, solutionIds, metadata) {
  var updates = [];
  var shapes = slide.getShapes();

  // Collect all text content organized by section
  var sections = {
    programmatic: [],
    development: [],
    engagement: [],
    roadblock: [],
    general: []
  };

  var currentSection = 'general';

  for (var i = 0; i < shapes.length; i++) {
    var shape = shapes[i];

    try {
      var textRange = shape.getText();
      if (!textRange) continue;

      var text = textRange.asString().trim();
      if (!text) continue;

      // Check if this is a section header
      var detectedSection = detectSection_(text);
      if (detectedSection) {
        currentSection = detectedSection;
        continue;
      }

      // Skip very short text (likely labels or dates)
      if (text.length < 15) continue;

      // Skip the section header text itself
      if (isSectionHeader_(text)) continue;

      // Extract bullet points
      var bullets = extractBulletPoints_(text);
      if (bullets.length > 0) {
        sections[currentSection] = sections[currentSection].concat(bullets);
      }
    } catch (e) {
      // Shape doesn't have text or other error
      continue;
    }
  }

  // Create update records for each section with content
  for (var section in sections) {
    var content = sections[section];
    if (content.length === 0) continue;

    // Skip generic/placeholder content
    var filteredContent = filterPlaceholderContent_(content);
    if (filteredContent.length === 0) continue;

    // Create an update for each solution
    for (var s = 0; s < solutionIds.length; s++) {
      var solutionId = solutionIds[s];

      // Create one update per meaningful bullet point
      for (var b = 0; b < filteredContent.length; b++) {
        var bulletText = filteredContent[b];

        // Skip if too short or generic
        if (bulletText.length < 20) continue;
        if (isGenericText_(bulletText)) continue;

        updates.push({
          solution: solutionId,
          update_text: bulletText,
          update_category: section,
          meeting_date: metadata.meetingDate,
          source_document: metadata.sourceDocument,
          source_url: metadata.sourceUrl,
          slide_number: metadata.slideNumber,
          speaker: metadata.speaker
        });
      }
    }
  }

  return updates;
}

/**
 * Detect which section a text header belongs to
 * @param {string} text - Text to check
 * @returns {string|null} Section name or null
 */
function detectSection_(text) {
  var lowerText = text.toLowerCase();

  for (var section in SECTION_CATEGORIES) {
    var keywords = SECTION_CATEGORIES[section];
    for (var i = 0; i < keywords.length; i++) {
      if (lowerText.includes(keywords[i])) {
        return section;
      }
    }
  }

  return null;
}

/**
 * Check if text is a section header
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function isSectionHeader_(text) {
  var lowerText = text.toLowerCase();
  return lowerText.includes('what programmatic') ||
         lowerText.includes('what software') ||
         lowerText.includes('what have i done') ||
         lowerText.includes('snwg mo can help') ||
         lowerText.includes('project status') ||
         lowerText.includes('project phase');
}

/**
 * Extract bullet points from text
 * @param {string} text - Raw text
 * @returns {Array} Array of bullet point strings
 */
function extractBulletPoints_(text) {
  var bullets = [];
  var lines = text.split('\n');

  var currentBullet = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    // Check if this is a new bullet point
    var isBullet = line.match(/^[•●○◦▪▸►\-\*]\s*/) ||
                   line.match(/^\d+[\.\)]\s*/);

    if (isBullet) {
      // Save previous bullet
      if (currentBullet) {
        bullets.push(currentBullet.trim());
      }
      // Start new bullet (remove bullet marker)
      currentBullet = line.replace(/^[•●○◦▪▸►\-\*]\s*/, '')
                          .replace(/^\d+[\.\)]\s*/, '');
    } else if (currentBullet) {
      // Continuation of current bullet
      currentBullet += ' ' + line;
    } else {
      // First line, no bullet marker - treat as single item
      currentBullet = line;
    }
  }

  // Don't forget last bullet
  if (currentBullet) {
    bullets.push(currentBullet.trim());
  }

  return bullets;
}

/**
 * Filter out placeholder/template content
 * @param {Array} content - Array of content strings
 * @returns {Array} Filtered array
 */
function filterPlaceholderContent_(content) {
  return content.filter(function(text) {
    var lower = text.toLowerCase();
    // Skip placeholder patterns
    if (lower.includes('[task name')) return false;
    if (lower.includes('[name]')) return false;
    if (lower.includes('example:')) return false;
    if (lower.match(/^n\/a\.?$/)) return false;
    if (lower === 'none') return false;
    if (lower === 'nothing new' || lower === 'nothing new.') return false;
    if (text.match(/^\s*●?\s*$/)) return false;
    return true;
  });
}

/**
 * Check if text is generic/unhelpful
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function isGenericText_(text) {
  var lower = text.toLowerCase();
  return lower === 'n/a' ||
         lower === 'none' ||
         lower === 'nothing new' ||
         lower === 'nothing at this time' ||
         lower === 'no updates' ||
         lower.match(/^update as of/);
}

// ============================================================================
// SLIDE HELPERS
// ============================================================================

/**
 * Get the title of a slide
 * @param {Slide} slide - Google Slides slide
 * @returns {string} Slide title or empty string
 */
function getSlideTitle_(slide) {
  var shapes = slide.getShapes();

  for (var i = 0; i < shapes.length; i++) {
    var shape = shapes[i];
    try {
      // Check if this is a title placeholder
      var placeholderType = shape.getPlaceholderType();
      if (placeholderType === SlidesApp.PlaceholderType.TITLE ||
          placeholderType === SlidesApp.PlaceholderType.CENTERED_TITLE) {
        return shape.getText().asString().trim();
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: return first text found
  for (var j = 0; j < shapes.length; j++) {
    try {
      var text = shapes[j].getText().asString().trim();
      if (text && text.length < 100) {
        return text;
      }
    } catch (e) {
      continue;
    }
  }

  return '';
}

/**
 * Extract speaker name from slide (usually in sidebar)
 * @param {Slide} slide - Google Slides slide
 * @returns {string} Speaker name or empty string
 */
function extractSpeakerFromSlide_(slide) {
  var shapes = slide.getShapes();

  for (var i = 0; i < shapes.length; i++) {
    var shape = shapes[i];
    try {
      var text = shape.getText().asString().trim();
      // Look for name patterns (usually has comma or role keywords)
      if (text.match(/project (scientist|lead|manager)/i) ||
          text.match(/team lead/i) ||
          text.match(/,\s*(solution|project)/i)) {
        // Extract just the name part
        var nameMatch = text.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/);
        if (nameMatch) {
          return nameMatch[1];
        }
        return text.split(',')[0].trim();
      }
    } catch (e) {
      continue;
    }
  }

  return '';
}

/**
 * Check if a slide should be skipped based on title
 * @param {string} title - Slide title
 * @returns {boolean}
 */
function shouldSkipSlide_(title) {
  if (!title) return true;

  for (var i = 0; i < SKIP_PATTERNS.length; i++) {
    if (SKIP_PATTERNS[i].test(title)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// FILE HELPERS
// ============================================================================

/**
 * Find the most recent presentation in a folder
 * @param {string} folderId - Google Drive folder ID
 * @returns {Presentation|null}
 */
function findLatestPresentation_(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByType(MimeType.GOOGLE_SLIDES);

  var latestFile = null;
  var latestDate = null;

  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();

    // Extract date from filename (e.g., "2026-01 NSITE Monthly...")
    var dateFromName = extractMeetingDateFromFilename_(fileName);
    if (dateFromName) {
      var fileDate = new Date(dateFromName);
      if (!latestDate || fileDate > latestDate) {
        latestDate = fileDate;
        latestFile = file;
      }
    }
  }

  if (latestFile) {
    return SlidesApp.openById(latestFile.getId());
  }

  return null;
}

/**
 * Get all presentations from folder (and subfolders for past FYs)
 * @param {string} folderId - Google Drive folder ID
 * @returns {Array} Array of Presentation objects
 */
function getAllPresentations_(folderId) {
  var presentations = [];
  var folder = DriveApp.getFolderById(folderId);

  // Get presentations in main folder
  var files = folder.getFilesByType(MimeType.GOOGLE_SLIDES);
  while (files.hasNext()) {
    var file = files.next();
    try {
      presentations.push(SlidesApp.openById(file.getId()));
    } catch (e) {
      Logger.log('Could not open: ' + file.getName());
    }
  }

  // Optionally get from subfolders (FY22, FY23, etc.)
  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    var subfolder = subfolders.next();
    var subfolderName = subfolder.getName();

    // Only process FY folders
    if (subfolderName.match(/^FY\d{2}/i)) {
      var subFiles = subfolder.getFilesByType(MimeType.GOOGLE_SLIDES);
      while (subFiles.hasNext()) {
        var subFile = subFiles.next();
        try {
          presentations.push(SlidesApp.openById(subFile.getId()));
        } catch (e) {
          Logger.log('Could not open: ' + subFile.getName());
        }
      }
    }
  }

  // Sort by date (oldest first for historical processing)
  presentations.sort(function(a, b) {
    var dateA = extractMeetingDateFromFilename_(a.getName());
    var dateB = extractMeetingDateFromFilename_(b.getName());
    return new Date(dateA || 0) - new Date(dateB || 0);
  });

  return presentations;
}

/**
 * Extract meeting date from filename
 * @param {string} filename - File name like "2026-01 NSITE Monthly..."
 * @returns {string} Date in YYYY-MM-DD format (first of month)
 */
function extractMeetingDateFromFilename_(filename) {
  // Pattern: "2026-01 NSITE Monthly..." or "Dec 2025 Project Update"
  var isoMatch = filename.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[1] + '-' + isoMatch[2] + '-01';
  }

  // Pattern: "Dec 2025" or "December 2025"
  var monthMatch = filename.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (monthMatch) {
    var months = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    var month = months[monthMatch[1].toLowerCase().substring(0, 3)];
    return monthMatch[2] + '-' + month + '-01';
  }

  return null;
}

// ============================================================================
// DATABASE SYNC
// ============================================================================

/**
 * Sync parsed updates to the database
 * @param {Array} updates - Parsed update objects
 * @returns {Object} Sync results
 */
function syncUpdatesToDatabase_(updates) {
  var updatesSheetId = getConfigValue_('UPDATES_SHEET_ID');
  if (!updatesSheetId) {
    Logger.log('UPDATES_SHEET_ID not configured');
    return { error: 'UPDATES_SHEET_ID not configured', newUpdates: 0, skippedUpdates: 0 };
  }

  var ss = SpreadsheetApp.openById(updatesSheetId);
  var sheet = ss.getSheetByName('2026') || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Build column index map
  var colIndex = {};
  for (var i = 0; i < headers.length; i++) {
    colIndex[headers[i]] = i;
  }

  // Build existing updates lookup by solution + update_text (for deduplication)
  var existingUpdates = {};
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var key = createUpdateKey_(
      row[colIndex['solution']] || '',
      row[colIndex['update_text']] || ''
    );
    existingUpdates[key] = true;
  }

  var results = {
    newUpdates: 0,
    skippedUpdates: 0
  };

  for (var u = 0; u < updates.length; u++) {
    var update = updates[u];
    var key = createUpdateKey_(update.solution, update.update_text);

    if (existingUpdates[key]) {
      results.skippedUpdates++;
    } else {
      appendNewUpdate_(sheet, headers, update);
      results.newUpdates++;
      existingUpdates[key] = true;
    }
  }

  Logger.log('Synced: ' + results.newUpdates + ' new, ' + results.skippedUpdates + ' skipped');
  return results;
}

/**
 * Create a key for update deduplication
 * @param {string} solution - Solution name
 * @param {string} updateText - Update text
 * @returns {string} Key
 */
function createUpdateKey_(solution, updateText) {
  var normalizedSolution = (solution || '').toLowerCase().trim();
  var normalizedText = (updateText || '').toLowerCase().trim().substring(0, 150);
  return normalizedSolution + '|' + normalizedText;
}

/**
 * Append a new update row
 */
function appendNewUpdate_(sheet, headers, update) {
  var timestamp = new Date().toISOString();
  var updateId = generateUpdateId_();

  var newRow = headers.map(function(header) {
    switch (header) {
      case 'update_id': return updateId;
      case 'solution': return update.solution || '';
      case 'update_text': return update.update_text || '';
      case 'update_category': return update.update_category || 'general';
      case 'meeting_date': return update.meeting_date || '';
      case 'source_document': return update.source_document || 'Monthly Meeting';
      case 'source_category': return 'Monthly';
      case 'source_url': return update.source_url || '';
      case 'source_tab': return 'Slide ' + (update.slide_number || '');
      case 'speaker': return update.speaker || '';
      case 'created_at': return timestamp;
      case 'created_by': return 'monthly-sync';
      default: return '';
    }
  });

  sheet.appendRow(newRow);
}

/**
 * Generate a unique update ID
 */
function generateUpdateId_() {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var random = Math.floor(Math.random() * 9000) + 1000;
  return 'UPD_' + dateStr + '_' + random;
}

// ============================================================================
// CONFIG ACCESS
// ============================================================================

/**
 * Load config values from MO-DB_Config sheet
 */
function loadConfigFromSheet_() {
  if (_configCache !== null) {
    return _configCache;
  }

  var configSheetId = PropertiesService.getScriptProperties().getProperty('CONFIG_SHEET_ID');
  if (!configSheetId) {
    Logger.log('CONFIG_SHEET_ID not set in Script Properties');
    return {};
  }

  try {
    var ss = SpreadsheetApp.openById(configSheetId);
    var sheet = ss.getSheetByName('Config') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    _configCache = {};
    for (var i = 1; i < data.length; i++) {
      var key = data[i][0];
      var value = data[i][1];
      if (key) {
        _configCache[key] = value || '';
      }
    }

    return _configCache;
  } catch (error) {
    Logger.log('Error loading config: ' + error);
    return {};
  }
}

/**
 * Get a config value
 * @param {string} key - Config key name
 * @returns {string} Config value or empty string
 */
function getConfigValue_(key) {
  var config = loadConfigFromSheet_();
  return config[key] || '';
}

// ============================================================================
// MENU
// ============================================================================

/**
 * Create custom menu (if used as container-bound script)
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('Monthly Sync')
    .addItem('Sync Latest Presentation', 'syncLatestMonthlyPresentation')
    .addItem('Sync All Presentations (Historical)', 'syncAllMonthlyPresentations')
    .addSeparator()
    .addItem('Show Config Status', 'showMonthlyConfigStatus')
    .addToUi();
}

/**
 * Show configuration status
 */
function showMonthlyConfigStatus() {
  var config = loadConfigFromSheet_();
  var status = [];

  var monthlyFolderId = config['MONTHLY_FOLDER_ID'] || '';
  var updatesSheetId = config['UPDATES_SHEET_ID'] || '';

  status.push('MONTHLY_FOLDER_ID: ' + (monthlyFolderId ? 'Configured' : 'NOT CONFIGURED'));
  if (monthlyFolderId) {
    status.push('  ID: ' + monthlyFolderId.substring(0, 20) + '...');
  }

  status.push('');
  status.push('UPDATES_SHEET_ID: ' + (updatesSheetId ? 'Configured' : 'NOT CONFIGURED'));
  if (updatesSheetId) {
    status.push('  ID: ' + updatesSheetId.substring(0, 20) + '...');
  }

  var ui = SpreadsheetApp.getUi();
  ui.alert('Monthly Sync Configuration',
    status.join('\n') +
    '\n\nTo configure:\n' +
    '1. Add MONTHLY_FOLDER_ID to MO-DB_Config\n' +
    '2. Add solution_id to speaker notes of each solution slide\n' +
    '3. Run "Sync Latest Presentation" after each meeting',
    ui.ButtonSet.OK);
}

// ============================================================================
// TESTING
// ============================================================================

/**
 * Test parsing a specific presentation (for debugging)
 * @param {string} presentationId - Presentation ID to test
 */
function testParsePresentation(presentationId) {
  var presentation = SlidesApp.openById(presentationId);
  var slides = presentation.getSlides();

  Logger.log('Testing: ' + presentation.getName());
  Logger.log('Total slides: ' + slides.length);

  for (var i = 0; i < slides.length; i++) {
    var slide = slides[i];
    var solutionIds = extractSolutionIdsFromNotes_(slide);
    var title = getSlideTitle_(slide);

    Logger.log('Slide ' + (i + 1) + ': ' + title);
    Logger.log('  solution_id(s): ' + (solutionIds.length > 0 ? solutionIds.join(', ') : 'NONE'));

    if (solutionIds.length > 0) {
      var updates = parseSlideContent_(slide, solutionIds, {
        meetingDate: '2025-12-01',
        sourceDocument: 'Test',
        sourceUrl: '',
        slideNumber: i + 1,
        speaker: extractSpeakerFromSlide_(slide)
      });
      Logger.log('  Updates found: ' + updates.length);
      for (var j = 0; j < updates.length; j++) {
        Logger.log('    - [' + updates[j].update_category + '] ' +
                   updates[j].update_text.substring(0, 60) + '...');
      }
    }
  }
}

/**
 * Test extracting solution IDs from all slides
 * Shows both speaker notes and name mapping results
 */
function testExtractAllSolutionIds() {
  var folderId = getConfigValue_('MONTHLY_FOLDER_ID');
  var presentation = findLatestPresentation_(folderId);

  if (!presentation) {
    Logger.log('No presentation found');
    return;
  }

  Logger.log('Testing: ' + presentation.getName());
  var slides = presentation.getSlides();

  var slidesWithNotesId = 0;
  var slidesWithMappedId = 0;
  var slidesWithoutId = 0;

  for (var i = 0; i < slides.length; i++) {
    var slide = slides[i];
    var title = getSlideTitle_(slide);

    // Try speaker notes first
    var notesIds = extractSolutionIdsFromNotes_(slide);

    if (notesIds.length > 0) {
      slidesWithNotesId++;
      Logger.log('Slide ' + (i + 1) + ' [NOTES: ' + notesIds.join(', ') + ']: ' + title);
    } else {
      // Try name mapping fallback
      var mappedIds = extractSolutionIdsFromSlideContent_(slide);

      if (mappedIds.length > 0) {
        slidesWithMappedId++;
        Logger.log('Slide ' + (i + 1) + ' [MAPPED: ' + mappedIds.join(', ') + ']: ' + title);
      } else {
        slidesWithoutId++;
        Logger.log('Slide ' + (i + 1) + ' [NO MATCH]: ' + title);
      }
    }
  }

  Logger.log('---');
  Logger.log('Slides with speaker notes solution_id: ' + slidesWithNotesId);
  Logger.log('Slides matched via name mapping: ' + slidesWithMappedId);
  Logger.log('Slides without any match: ' + slidesWithoutId);
  Logger.log('Total identifiable: ' + (slidesWithNotesId + slidesWithMappedId) +
             ' / ' + slides.length);
}
