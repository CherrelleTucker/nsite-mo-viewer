/**
 * Presentations API - Thin Wrapper
 * =================================
 * Delegates to MoApi library for presentation generation.
 * Full implementation in: library/presentations-api.gs
 *
 * @fileoverview Presentation generation wrappers for NSITE-MO-Viewer
 */

/**
 * Generate a customized presentation from template
 *
 * @param {string} solutionId - Solution solution_id
 * @param {string} audienceType - 'internal' | 'external'
 * @param {string} folderId - Google Drive folder ID for output (optional, defaults to root)
 * @returns {Object} { success: boolean, data?: { url, presentationId, name }, error?: string }
 */
function generatePresentation(solutionId, audienceType, folderId) {
  return MoApi.generatePresentation(solutionId, audienceType, folderId);
}

/**
 * Get information about the configured template
 *
 * @returns {Object} { success: boolean, data?: { name, totalSlides, mapping }, error?: string }
 */
function getTemplateInfo() {
  return MoApi.getTemplateInfo();
}

/**
 * Test function - run this directly from Apps Script editor to diagnose issues
 * Check Execution Log for detailed output
 */
function testGeneratePresentation() {
  // Use a real solution ID from your database
  var testSolutionId = 'hls'; // Change this to a valid solution ID
  var testAudience = 'internal';

  Logger.log('=== TEST: generatePresentation ===');
  Logger.log('Testing with solutionId: ' + testSolutionId + ', audience: ' + testAudience);

  try {
    var result = MoApi.generatePresentation(testSolutionId, testAudience, null);
    Logger.log('Result: ' + JSON.stringify(result, null, 2));

    if (result && result.success) {
      Logger.log('SUCCESS! Presentation URL: ' + result.data.url);
      Logger.log('Mode: ' + result.data.mode);
    } else {
      Logger.log('FAILED: ' + (result ? result.error : 'null result'));
    }
  } catch (e) {
    Logger.log('EXCEPTION: ' + e);
    Logger.log('Message: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }

  Logger.log('=== TEST COMPLETE ===');
}
