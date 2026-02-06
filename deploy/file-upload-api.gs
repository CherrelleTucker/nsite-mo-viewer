/**
 * File Upload API - Deploy Wrapper
 * =================================
 * Thin wrappers for MO-APIs Library file upload functions
 *
 * @fileoverview Deploy wrappers for file upload functions
 */

/**
 * Upload a file to a team folder
 * @param {string} folderId - Google Drive folder ID
 * @param {string} fileName - Name of the file
 * @param {string} base64Data - File content as base64 string
 * @param {string} mimeType - MIME type of the file
 * @param {string} solutionId - Solution ID for context
 * @returns {Object} Result object
 */
function uploadFileToTeamFolder(folderId, fileName, base64Data, mimeType, solutionId) {
  var auth = checkAuthorization();
  if (!auth.authorized) {
    return { success: false, error: auth.message };
  }
  return MoApi.uploadFileToTeamFolder(folderId, fileName, base64Data, mimeType, solutionId);
}

/**
 * Get team folder info
 * @param {string} folderId - Google Drive folder ID
 * @returns {Object} Folder info
 */
function getTeamFolderInfo(folderId) {
  return MoApi.getTeamFolderInfo(folderId);
}
