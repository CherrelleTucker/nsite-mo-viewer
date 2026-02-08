/**
 * MO-APIs Library - Presentations API
 * ====================================
 * Generate customized presentations from templates
 *
 * This API allows users to:
 * 1. Select a Solution and audience type (internal/external)
 * 2. Copy a boilerplate Google Slides template
 * 3. Filter slides based on metadata in speaker notes
 * 4. Replace placeholders with solution-specific data
 * 5. Save to user's Google Drive
 *
 * Speaker Notes Metadata Format:
 *   Slide: [section], [topic]
 *   Audience: [internal],[external]
 *   solution: [solution_id], [all]
 *   agency: [agency_name], [all]
 *
 * Config Keys Required:
 * - BOILERPLATE_SLIDES_ID: Google Slides template ID
 *
 * @fileoverview Presentations generation for MO-Viewer
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Supported audience types
 */
var PRESENTATION_AUDIENCE_TYPES = ['internal', 'external'];

/**
 * Placeholder delimiters
 */
var PLACEHOLDER_START = '{{';
var PLACEHOLDER_END = '}}';

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate a customized presentation from template
 *
 * Supports two modes:
 * 1. Full mode (requires presentations scope): Copies template, filters slides, replaces placeholders
 * 2. Basic mode (fallback): Just copies the template when presentations scope unavailable
 *
 * @param {string} solutionId - Solution solution_id
 * @param {string} audienceType - 'internal' | 'external'
 * @param {string} folderId - Google Drive folder ID for output (optional, defaults to root)
 * @returns {Object} { success: boolean, data?: { url, presentationId, name, mode }, error?: string }
 */
function generatePresentation(solutionId, audienceType, folderId) {
  Logger.log('=== generatePresentation START ===');
  Logger.log('Input: solutionId=' + solutionId + ', audienceType=' + audienceType);

  try {
    // 1. Validate inputs
    if (!solutionId) {
      Logger.log('ERROR: No solution ID');
      return { success: false, error: 'Solution ID is required' };
    }

    audienceType = normalizeString(audienceType);
    if (!audienceType || !PRESENTATION_AUDIENCE_TYPES.includes(audienceType)) {
      Logger.log('ERROR: Invalid audience type: ' + audienceType);
      return { success: false, error: 'Invalid audience type. Must be: ' + PRESENTATION_AUDIENCE_TYPES.join(', ') };
    }

    // 2. Get template ID from config
    Logger.log('Step 2: Getting template ID...');
    var templateId = getConfigValue('BOILERPLATE_SLIDES_ID');
    if (!templateId) {
      Logger.log('ERROR: No template ID configured');
      return { success: false, error: 'BOILERPLATE_SLIDES_ID not configured. Please contact administrator.' };
    }
    Logger.log('Template ID: ' + templateId);

    // 3. Get solution data
    Logger.log('Step 3: Getting solution data...');
    var solution = getSolution(solutionId);
    if (!solution) {
      Logger.log('ERROR: Solution not found: ' + solutionId);
      return { success: false, error: 'Solution not found: ' + solutionId };
    }
    Logger.log('Solution found: ' + (solution.core_official_name || solution.solution_id));

    // 4. Copy template using DriveApp (always works)
    Logger.log('Step 4: Copying template...');
    var copyResult = copyTemplateBasic_(templateId, solution, audienceType, folderId);
    if (!copyResult.fileId) {
      Logger.log('ERROR: Copy failed: ' + copyResult.error);
      return { success: false, error: copyResult.error || 'Failed to copy template.' };
    }
    Logger.log('Copy successful. File ID: ' + copyResult.fileId + ', Name: ' + copyResult.name);

    // 5. Try full processing with SlidesApp (may fail if scope not authorized)
    var slidesRemoved = 0;
    var replacementCount = 0;
    var mode = 'basic';

    Logger.log('Step 5: Attempting SlidesApp processing...');
    try {
      var newPresentation = SlidesApp.openById(copyResult.fileId);
      Logger.log('SlidesApp.openById successful');

      // Filter slides by audience, solution, and agency
      var solutionAgency = solution.sponsor_agency || solution.primary_agency || solution.agency || null;
      Logger.log('Filtering slides for agency: ' + (solutionAgency || 'all'));
      slidesRemoved = filterSlidesByMetadata_(newPresentation, audienceType, solutionId, solutionAgency);
      Logger.log('Removed ' + slidesRemoved + ' slides');

      // Replace placeholders
      Logger.log('Replacing placeholders...');
      replacementCount = replacePlaceholders_(newPresentation, solution);
      Logger.log('Replaced ' + replacementCount + ' placeholders');

      mode = 'full';
      Logger.log('Full mode processing complete');
    } catch (slidesError) {
      // SlidesApp not authorized - continue with basic copy
      Logger.log('SlidesApp error (using basic mode): ' + slidesError);
      Logger.log('Error message: ' + (slidesError.message || 'no message'));
      mode = 'basic';
    }

    // 6. Return URL
    var url = 'https://docs.google.com/presentation/d/' + copyResult.fileId + '/edit';
    Logger.log('Step 6: Returning success. URL: ' + url);

    var result = {
      success: true,
      data: {
        url: url,
        presentationId: copyResult.fileId,
        name: copyResult.name,
        mode: mode,
        slidesRemoved: slidesRemoved,
        replacementsApplied: replacementCount
      }
    };

    Logger.log('=== generatePresentation END (success) ===');
    return result;

  } catch (error) {
    Logger.log('=== generatePresentation ERROR ===');
    Logger.log('Error object: ' + error);
    Logger.log('Error message: ' + (error && error.message ? error.message : 'no message'));
    Logger.log('Error stack: ' + (error && error.stack ? error.stack : 'no stack'));
    return { success: false, error: (error && error.message) ? error.message : String(error) };
  }
}

/**
 * Copy template presentation using only DriveApp (no presentations scope needed)
 * This is the basic copy that always works with drive scope
 *
 * @private
 * @param {string} templateId - Template Google Slides ID
 * @param {Object} solution - Solution data object
 * @param {string} audienceType - Audience type for naming
 * @param {string} folderId - Destination folder ID (optional)
 * @returns {Object} { fileId, name, error }
 */
function copyTemplateBasic_(templateId, solution, audienceType, folderId) {
  try {
    if (!templateId) {
      return { fileId: null, name: null, error: 'Template ID not configured.' };
    }

    var template;
    try {
      template = DriveApp.getFileById(templateId);
    } catch (e) {
      Logger.log('Cannot access template: ' + e);
      return { fileId: null, name: null, error: 'Cannot access template. Verify BOILERPLATE_SLIDES_ID is correct and you have view access.' };
    }

    // Generate name
    var solutionName = solution.core_official_name || solution.solution_id || 'Unknown';
    var capitalizedAudience = audienceType.charAt(0).toUpperCase() + audienceType.slice(1);
    var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var newName = solutionName + ' - ' + capitalizedAudience + ' Presentation - ' + dateStr;

    // Copy to destination folder or user's root Drive folder
    var copy;
    try {
      if (folderId) {
        var folder = DriveApp.getFolderById(folderId);
        copy = template.makeCopy(newName, folder);
      } else {
        // Save to user's root "My Drive" folder
        var rootFolder = DriveApp.getRootFolder();
        copy = template.makeCopy(newName, rootFolder);
      }
    } catch (e) {
      Logger.log('Error copying template: ' + e);
      return { fileId: null, name: null, error: 'Failed to copy template. Check permissions.' };
    }

    return { fileId: copy.getId(), name: newName, error: null };

  } catch (error) {
    Logger.log('copyTemplateBasic_ error: ' + error);
    return { fileId: null, name: null, error: error.message };
  }
}

// ============================================================================
// TEMPLATE INFO
// ============================================================================

/**
 * Get information about the configured template
 * Reads speaker notes metadata to show slide counts by audience
 *
 * @returns {Object} { success: boolean, data?: { name, totalSlides, audienceCounts }, error?: string }
 */
function getTemplateInfo() {
  try {
    var templateId = getConfigValue('BOILERPLATE_SLIDES_ID');
    if (!templateId) {
      return createResult(false, null, 'BOILERPLATE_SLIDES_ID not configured');
    }

    var presentation = SlidesApp.openById(templateId);
    var slides = presentation.getSlides();

    // Count slides by audience from speaker notes
    var audienceCounts = { internal: 0, external: 0, both: 0, noMetadata: 0 };
    var slideDetails = [];

    slides.forEach(function(slide, index) {
      var metadata = parseSlideMetadata_(slide);
      var slideNum = index + 1;

      if (!metadata.hasMetadata) {
        audienceCounts.noMetadata++;
        slideDetails.push({
          slideNumber: slideNum,
          title: metadata.slideTitle || '(no metadata)',
          audiences: ['internal', 'external'],
          solutions: ['all'],
          agencies: ['all']
        });
      } else {
        var hasInternal = metadata.audiences.includes('internal');
        var hasExternal = metadata.audiences.includes('external');

        if (hasInternal && hasExternal) {
          audienceCounts.both++;
        } else if (hasInternal) {
          audienceCounts.internal++;
        } else if (hasExternal) {
          audienceCounts.external++;
        }

        slideDetails.push({
          slideNumber: slideNum,
          section: metadata.slideSection,
          title: metadata.slideTitle,
          audiences: metadata.audiences,
          solutions: metadata.solutions,
          agencies: metadata.agencies
        });
      }
    });

    return createResult(true, {
      name: presentation.getName(),
      totalSlides: slides.length,
      audienceCounts: audienceCounts,
      internalSlideCount: audienceCounts.internal + audienceCounts.both + audienceCounts.noMetadata,
      externalSlideCount: audienceCounts.external + audienceCounts.both + audienceCounts.noMetadata,
      slideDetails: slideDetails
    });

  } catch (error) {
    Logger.log('getTemplateInfo error: ' + error);
    return createResult(false, null, error.message);
  }
}

// ============================================================================
// SPEAKER NOTES METADATA PARSING
// ============================================================================

/**
 * Parse metadata from slide speaker notes
 *
 * Expected format:
 *   Slide: [section], [topic]
 *   Audience: [internal],[external]
 *   solution: [solution_id], [all]
 *   agency: [agency_name], [all]
 *
 * @private
 * @param {Slide} slide - Google Slides Slide object
 * @returns {Object} { hasMetadata, slideSection, slideTitle, audiences[], solutions[], agencies[] }
 */
function parseSlideMetadata_(slide) {
  var result = {
    hasMetadata: false,
    slideSection: '',
    slideTitle: '',
    audiences: ['internal', 'external'],  // Default: include for all audiences
    solutions: ['all'],  // Default: include for all solutions
    agencies: ['all']    // Default: include for all agencies
  };

  try {
    var notesPage = slide.getNotesPage();
    if (!notesPage) return result;

    var speakerNotesShape = notesPage.getSpeakerNotesShape();
    if (!speakerNotesShape) return result;

    var notesText = speakerNotesShape.getText().asString().trim();
    if (!notesText) return result;

    var lines = notesText.split('\n');

    lines.forEach(function(line) {
      line = line.trim();
      var lowerLine = line.toLowerCase();

      // Parse "Slide: section, topic"
      if (lowerLine.startsWith('slide:')) {
        result.hasMetadata = true;
        var slideValue = line.substring(6).trim();
        var slideParts = slideValue.split(',');
        if (slideParts.length >= 1) {
          result.slideSection = slideParts[0].trim();
        }
        if (slideParts.length >= 2) {
          result.slideTitle = slideParts.slice(1).join(',').trim();
        }
      }

      // Parse "Audience: internal,external" or "Audience: internal" or "Audience: external"
      if (lowerLine.startsWith('audience:')) {
        result.hasMetadata = true;
        var audienceValue = line.substring(9).trim().toLowerCase();
        var audienceParts = audienceValue.split(',').map(function(a) { return a.trim(); });

        // Filter to only valid audience types
        result.audiences = audienceParts.filter(function(a) {
          return a === 'internal' || a === 'external';
        });

        // If no valid audiences found, default to both
        if (result.audiences.length === 0) {
          result.audiences = ['internal', 'external'];
        }
      }

      // Parse "solution: solution_id" or "solution: all" or "solution: solution1, solution2"
      if (lowerLine.startsWith('solution:')) {
        result.hasMetadata = true;
        var solutionValue = line.substring(9).trim().toLowerCase();
        var solutionParts = solutionValue.split(',').map(function(s) { return s.trim(); });

        result.solutions = solutionParts.filter(function(s) { return s.length > 0; });

        // If empty or contains "all", include for all solutions
        if (result.solutions.length === 0 || result.solutions.includes('all')) {
          result.solutions = ['all'];
        }
      }

      // Parse "agency: agency_name" or "agency: all" or "agency: USGS, NOAA"
      if (lowerLine.startsWith('agency:')) {
        result.hasMetadata = true;
        var agencyValue = line.substring(7).trim().toLowerCase();
        var agencyParts = agencyValue.split(',').map(function(a) { return a.trim(); });

        result.agencies = agencyParts.filter(function(a) { return a.length > 0; });

        // If empty or contains "all", include for all agencies
        if (result.agencies.length === 0 || result.agencies.includes('all')) {
          result.agencies = ['all'];
        }
      }
    });

  } catch (e) {
    Logger.log('Error parsing slide metadata: ' + e);
  }

  return result;
}

// ============================================================================
// SLIDE FILTERING
// ============================================================================

/**
 * Filter slides based on speaker notes metadata
 * Deletes slides that don't match the target audience, solution, or agency
 *
 * @private
 * @param {Presentation} presentation - Presentation to filter
 * @param {string} targetAudience - 'internal' or 'external'
 * @param {string} targetSolutionId - Solution ID to filter for
 * @param {string} targetAgency - Agency name to filter for (optional)
 * @returns {number} Number of slides removed
 */
function filterSlidesByMetadata_(presentation, targetAudience, targetSolutionId, targetAgency) {
  var slides = presentation.getSlides();
  var slidesToDelete = [];
  var normalizedSolutionId = normalizeString(targetSolutionId);
  var normalizedAgency = targetAgency ? normalizeString(targetAgency) : null;

  // Process slides in reverse order (so deletion doesn't affect indices)
  for (var i = slides.length - 1; i >= 0; i--) {
    var slide = slides[i];
    var metadata = parseSlideMetadata_(slide);

    var includeForAudience = true;
    var includeForSolution = true;
    var includeForAgency = true;

    // Check audience filter
    if (metadata.hasMetadata && metadata.audiences.length > 0) {
      includeForAudience = metadata.audiences.includes(targetAudience);
    }

    // Check solution filter
    if (metadata.hasMetadata && metadata.solutions.length > 0 && !metadata.solutions.includes('all')) {
      // Check if target solution is in the list
      includeForSolution = metadata.solutions.some(function(s) {
        return normalizeString(s) === normalizedSolutionId;
      });
    }

    // Check agency filter (only if slide specifies agencies and not "all")
    if (normalizedAgency && metadata.hasMetadata && metadata.agencies.length > 0 && !metadata.agencies.includes('all')) {
      // Check if target agency is in the list
      includeForAgency = metadata.agencies.some(function(a) {
        return normalizeString(a) === normalizedAgency;
      });
    }

    // Delete slide if it doesn't match audience OR solution OR agency
    if (!includeForAudience || !includeForSolution || !includeForAgency) {
      slidesToDelete.push(slide);
    }
  }

  // Delete the slides
  slidesToDelete.forEach(function(slide) {
    slide.remove();
  });

  return slidesToDelete.length;
}

// ============================================================================
// PLACEHOLDER REPLACEMENT
// ============================================================================

/**
 * Replace all placeholders in presentation with solution data
 *
 * @private
 * @param {Presentation} presentation - Presentation to update
 * @param {Object} solution - Solution data object
 * @returns {number} Number of replacements made
 */
function replacePlaceholders_(presentation, solution) {
  var replacements = buildReplacementMap_(solution);
  var slides = presentation.getSlides();
  var totalReplacements = 0;

  slides.forEach(function(slide) {
    // Process shapes (text boxes, titles)
    var shapes = slide.getShapes();
    shapes.forEach(function(shape) {
      try {
        var textRange = shape.getText();
        if (textRange) {
          var text = textRange.asString();

          // Check if text contains any placeholders
          if (text.includes(PLACEHOLDER_START)) {
            for (var key in replacements) {
              if (replacements.hasOwnProperty(key)) {
                var placeholder = PLACEHOLDER_START + key + PLACEHOLDER_END;
                if (text.includes(placeholder)) {
                  textRange.replaceAllText(placeholder, replacements[key] || '');
                  totalReplacements++;
                }
              }
            }
          }
        }
      } catch (e) {
        // Shape may not have text - skip silently
      }
    });

    // Process tables
    var tables = slide.getTables();
    tables.forEach(function(table) {
      for (var row = 0; row < table.getNumRows(); row++) {
        for (var col = 0; col < table.getNumColumns(); col++) {
          try {
            var cell = table.getCell(row, col);
            var textRange = cell.getText();
            var text = textRange.asString();

            if (text.includes(PLACEHOLDER_START)) {
              for (var key in replacements) {
                if (replacements.hasOwnProperty(key)) {
                  var placeholder = PLACEHOLDER_START + key + PLACEHOLDER_END;
                  if (text.includes(placeholder)) {
                    textRange.replaceAllText(placeholder, replacements[key] || '');
                    totalReplacements++;
                  }
                }
              }
            }
          } catch (e) {
            // Cell may not be accessible - skip silently
          }
        }
      }
    });
  });

  return totalReplacements;
}

/**
 * Build map of placeholder keys to replacement values
 *
 * @private
 * @param {Object} solution - Solution data object
 * @returns {Object} Map of { placeholderKey: value }
 */
function buildReplacementMap_(solution) {
  var map = {};

  // Add all solution fields
  for (var key in solution) {
    if (solution.hasOwnProperty(key)) {
      var value = solution[key];
      // Convert to string, handle nulls
      map[key] = (value !== null && value !== undefined) ? String(value) : '';
    }
  }

  // Add computed fields
  map['GENERATED_DATE'] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');
  map['GENERATED_YEAR'] = String(new Date().getFullYear());
  map['GENERATED_DATE_SHORT'] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy');

  return map;
}
