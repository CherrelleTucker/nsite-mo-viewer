/**
 * MO-APIs Library - File Upload API
 * ==================================
 * Handles file uploads to Google Drive team folders
 *
 * @fileoverview File upload functions for MO-Viewer
 */

/**
 * Upload a file to a team folder
 *
 * @param {string} folderId - Google Drive folder ID
 * @param {string} fileName - Name of the file
 * @param {string} base64Data - File content as base64 string
 * @param {string} mimeType - MIME type of the file
 * @param {string} solutionId - Solution ID for context
 * @returns {Object} Result object with success status
 */
function uploadFileToTeamFolder(folderId, fileName, base64Data, mimeType, solutionId) {
  try {
    // Validate inputs
    if (!folderId) {
      return createResult(false, null, 'Folder ID is required');
    }
    if (!fileName) {
      return createResult(false, null, 'File name is required');
    }
    if (!base64Data) {
      return createResult(false, null, 'File data is required');
    }

    // Get the folder
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      Logger.log('Error accessing folder ' + folderId + ': ' + e.message);
      return createResult(false, null, 'Cannot access team folder. Please check permissions.');
    }

    // Decode base64 and create blob
    var decodedData = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedData, mimeType || 'application/octet-stream', fileName);

    // Create the file in the folder
    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();
    var uploadedFileId = file.getId();

    Logger.log('File uploaded: ' + fileName + ' to folder ' + folderId);

    return createResult(true, {
      fileId: uploadedFileId,
      fileUrl: fileUrl,
      fileName: fileName
    });

  } catch (error) {
    Logger.log('Error uploading file: ' + error.message);
    return createResult(false, null, 'Upload failed: ' + error.message);
  }
}

/**
 * Get team folder info for a solution
 *
 * @param {string} folderId - Google Drive folder ID
 * @returns {Object} Folder info or error
 */
function getTeamFolderInfo(folderId) {
  try {
    if (!folderId) {
      return createResult(false, null, 'Folder ID is required');
    }

    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var fileCount = 0;

    while (files.hasNext()) {
      files.next();
      fileCount++;
    }

    return createResult(true, {
      folderId: folder.getId(),
      folderName: folder.getName(),
      folderUrl: folder.getUrl(),
      fileCount: fileCount
    });

  } catch (error) {
    Logger.log('Error getting folder info: ' + error.message);
    return createResult(false, null, 'Cannot access folder: ' + error.message);
  }
}
