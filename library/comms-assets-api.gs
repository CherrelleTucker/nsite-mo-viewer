/**
 * Comms Assets API
 * ================
 * Unified API for all communications assets: blurbs, quotes, facts, talking points, etc.
 *
 * Database: MO-DB_CommsAssets
 * Config Key: COMMS_ASSETS_SHEET_ID
 *
 * Asset Types:
 * - blurb: 2-3 sentence descriptions for HQ updates, newsletters
 * - talking_point: Key messages with supporting detail for briefings
 * - quote: Stakeholder/leadership quotes for presentations, press
 * - fact: Statistics, metrics, data points
 * - soundbite: Short punchy statements for elevator pitches, social
 * - boilerplate: Standard program descriptions
 * - connection: Relationships between solutions and agencies/users
 *
 * Multi-value fields (comma-separated):
 * - solution_ids: Links to MO-DB_Solutions.core_id
 * - agency_ids: Links to MO-DB_Agencies.agency_id
 * - contact_ids: Links to MO-DB_Contacts.email (primary key)
 * - tags: Thematic areas and keywords
 */

// ============================================================================
// CACHE
// ============================================================================

var _commsAssetsCache = null;

function loadAllCommsAssets_() {
  if (_commsAssetsCache !== null) {
    return _commsAssetsCache;
  }

  var sheetId = getConfigValue('COMMS_ASSETS_SHEET_ID');
  if (!sheetId) {
    Logger.log('COMMS_ASSETS_SHEET_ID not configured');
    return [];
  }

  var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  _commsAssetsCache = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var asset = {};
    headers.forEach(function(header, j) {
      var value = row[j];
      if (value instanceof Date) {
        asset[header] = value.toISOString().split('T')[0];
      } else {
        asset[header] = value;
      }
    });
    if (asset.asset_id) {
      _commsAssetsCache.push(asset);
    }
  }

  return _commsAssetsCache;
}

function clearCommsAssetsCache_() {
  _commsAssetsCache = null;
}

function getCommsAssetsSheet_() {
  var sheetId = getConfigValue('COMMS_ASSETS_SHEET_ID');
  if (!sheetId) {
    throw new Error('COMMS_ASSETS_SHEET_ID not configured');
  }
  return SpreadsheetApp.openById(sheetId).getSheets()[0];
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all comms assets
 * @param {number} limit - Optional limit on results
 * @returns {Array} All assets
 */
function getAllCommsAssets(limit) {
  var assets = loadAllCommsAssets_();
  if (limit && limit > 0) {
    return deepCopy(assets.slice(0, limit));
  }
  return deepCopy(assets);
}

/**
 * Get a single asset by ID
 * @param {string} assetId - Asset ID
 * @returns {Object|null} Asset or null if not found
 */
function getCommsAssetById(assetId) {
  var assets = loadAllCommsAssets_();
  for (var i = 0; i < assets.length; i++) {
    if (assets[i].asset_id === assetId) {
      return deepCopy(assets[i]);
    }
  }
  return null;
}

/**
 * Create a new comms asset
 * @param {Object} assetData - Asset data
 * @returns {Object} Result with success/error
 */
function createCommsAsset(assetData) {
  try {
    if (!assetData.asset_type) {
      return { success: false, error: 'Asset type is required' };
    }

    // Security: Validate asset_type is one of allowed values (prevents XSS via innerHTML)
    var allowedTextTypes = ['blurb', 'talking_point', 'quote', 'fact', 'soundbite', 'boilerplate', 'connection'];
    var allowedFileTypes = ['image', 'presentation', 'pdf', 'video', 'document', 'graphic'];
    var allAllowedTypes = allowedTextTypes.concat(allowedFileTypes);
    if (!allAllowedTypes.includes(assetData.asset_type)) {
      return { success: false, error: 'Invalid asset type. Must be one of: ' + allAllowedTypes.join(', ') };
    }

    // Security: Validate status if provided (used in className)
    if (assetData.status) {
      var allowedStatuses = ['draft', 'approved', 'needs_update', 'archived'];
      if (!allowedStatuses.includes(assetData.status)) {
        return { success: false, error: 'Invalid status. Must be one of: ' + allowedStatuses.join(', ') };
      }
    }

    if (!assetData.title || !String(assetData.title).trim()) {
      return { success: false, error: 'Title is required' };
    }
    // Content is required for text assets, but file assets can use asset_url instead
    var isFileType = allowedFileTypes.includes(assetData.asset_type) || (assetData.asset_url && String(assetData.asset_url).trim());
    if (!isFileType && (!assetData.content || !String(assetData.content).trim())) {
      return { success: false, error: 'Content is required' };
    }

    var sheet = getCommsAssetsSheet_();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Generate asset_id
    if (!assetData.asset_id) {
      var prefix = 'CA';
      var existingIds = loadAllCommsAssets_().map(function(a) { return a.asset_id; });
      var maxNum = 0;
      existingIds.forEach(function(id) {
        var match = id.match(/CA-(\d+)/);
        if (match) {
          var num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      assetData.asset_id = prefix + '-' + String(maxNum + 1).padStart(3, '0');
    }

    // Set defaults
    assetData.status = assetData.status || 'draft';
    assetData.created_at = assetData.created_at || new Date().toISOString().split('T')[0];
    assetData.updated_at = assetData.created_at;
    assetData.use_count = assetData.use_count || 0;

    // Build row
    var newRow = headers.map(function(header) {
      return assetData[header] !== undefined ? assetData[header] : '';
    });

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();
    clearCommsAssetsCache_();

    return { success: true, data: assetData };
  } catch (e) {
    Logger.log('createCommsAsset error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Update an existing comms asset
 * @param {string} assetId - Asset ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Result with success/error
 */
function updateCommsAsset(assetId, updates) {
  try {
    // Security: Validate asset_type if being updated (used in innerHTML)
    if (updates.asset_type) {
      var allowedTextTypes = ['blurb', 'talking_point', 'quote', 'fact', 'soundbite', 'boilerplate', 'connection'];
      var allowedFileTypes = ['image', 'presentation', 'pdf', 'video', 'document', 'graphic'];
      var allAllowedTypes = allowedTextTypes.concat(allowedFileTypes);
      if (!allAllowedTypes.includes(updates.asset_type)) {
        return { success: false, error: 'Invalid asset type. Must be one of: ' + allAllowedTypes.join(', ') };
      }
    }

    // Security: Validate status if being updated (used in className)
    if (updates.status) {
      var allowedStatuses = ['draft', 'approved', 'needs_update', 'archived'];
      if (!allowedStatuses.includes(updates.status)) {
        return { success: false, error: 'Invalid status. Must be one of: ' + allowedStatuses.join(', ') };
      }
    }

    var sheet = getCommsAssetsSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idColIndex = headers.indexOf('asset_id');
    if (idColIndex === -1) {
      return { success: false, error: 'asset_id column not found' };
    }

    // Find row
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === assetId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Asset not found: ' + assetId };
    }

    // Update fields
    updates.updated_at = new Date().toISOString().split('T')[0];

    Object.keys(updates).forEach(function(key) {
      var colIndex = headers.indexOf(key);
      if (colIndex !== -1 && key !== 'asset_id') {
        sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[key]);
      }
    });

    SpreadsheetApp.flush();
    clearCommsAssetsCache_();

    return { success: true, data: getCommsAssetById(assetId) };
  } catch (e) {
    Logger.log('updateCommsAsset error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Delete a comms asset
 * @param {string} assetId - Asset ID
 * @returns {Object} Result with success/error
 */
function deleteCommsAsset(assetId) {
  try {
    var sheet = getCommsAssetsSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idColIndex = headers.indexOf('asset_id');
    if (idColIndex === -1) {
      return { success: false, error: 'asset_id column not found' };
    }

    // Find row
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === assetId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Asset not found: ' + assetId };
    }

    sheet.deleteRow(rowIndex + 1);
    SpreadsheetApp.flush();
    clearCommsAssetsCache_();

    return { success: true };
  } catch (e) {
    Logger.log('deleteCommsAsset error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get assets by type
 * @param {string} assetType - Asset type (blurb, quote, fact, etc.)
 * @returns {Array} Matching assets
 */
function getCommsAssetsByType(assetType) {
  var assets = loadAllCommsAssets_();
  return deepCopy(assets.filter(function(a) {
    return a.asset_type === assetType;
  }));
}

/**
 * Get assets by solution
 * @param {string} solutionId - Solution ID to match
 * @returns {Array} Assets linked to this solution
 */
function getCommsAssetsBySolution(solutionId) {
  var assets = loadAllCommsAssets_();
  var lowerSolutionId = solutionId.toLowerCase();
  return deepCopy(assets.filter(function(a) {
    if (!a.solution_ids) return false;
    var ids = a.solution_ids.toLowerCase().split(',').map(function(s) { return s.trim(); });
    return ids.includes(lowerSolutionId);
  }));
}

/**
 * Get assets by audience
 * @param {string} audience - Audience type (internal, external, leadership, public, technical, all)
 * @returns {Array} Matching assets
 */
function getCommsAssetsByAudience(audience) {
  var assets = loadAllCommsAssets_();
  return deepCopy(assets.filter(function(a) {
    return a.audience === audience || a.audience === 'all';
  }));
}

/**
 * Get assets by channel
 * @param {string} channel - Channel (email, social, presentation, report, flyer, all)
 * @returns {Array} Matching assets
 */
function getCommsAssetsByChannel(channel) {
  var assets = loadAllCommsAssets_();
  var lowerChannel = channel.toLowerCase();
  return deepCopy(assets.filter(function(a) {
    if (!a.channels) return false;
    if (a.channels === 'all') return true;
    var channels = a.channels.toLowerCase().split(',').map(function(s) { return s.trim(); });
    return channels.includes(lowerChannel);
  }));
}

/**
 * Get assets by status
 * @param {string} status - Status (draft, approved, needs_update, archived)
 * @returns {Array} Matching assets
 */
function getCommsAssetsByStatus(status) {
  var assets = loadAllCommsAssets_();
  return deepCopy(assets.filter(function(a) {
    return a.status === status;
  }));
}

/**
 * Get approved assets ready for use
 * @returns {Array} Approved assets
 */
function getApprovedCommsAssets() {
  return getCommsAssetsByStatus('approved');
}

/**
 * Multi-filter query for assets
 * @param {Object} filters - Filter criteria {type, solution, audience, channel, status, tags}
 * @returns {Array} Matching assets
 */
function queryCommsAssets(filters) {
  var assets = loadAllCommsAssets_();

  return deepCopy(assets.filter(function(a) {
    // Type filter
    if (filters.type && a.asset_type !== filters.type) return false;

    // Solution filter
    if (filters.solution) {
      if (!a.solution_ids) return false;
      var ids = a.solution_ids.toLowerCase().split(',').map(function(s) { return s.trim(); });
      if (!ids.includes(filters.solution.toLowerCase())) return false;
    }

    // Audience filter
    if (filters.audience) {
      if (a.audience !== filters.audience && a.audience !== 'all') return false;
    }

    // Channel filter
    if (filters.channel) {
      if (!a.channels) return false;
      if (a.channels !== 'all') {
        var channels = a.channels.toLowerCase().split(',').map(function(s) { return s.trim(); });
        if (!channels.includes(filters.channel.toLowerCase())) return false;
      }
    }

    // Status filter
    if (filters.status && a.status !== filters.status) return false;

    // Tags filter
    if (filters.tags) {
      if (!a.tags) return false;
      var assetTags = a.tags.toLowerCase().split(',').map(function(s) { return s.trim(); });
      var filterTags = filters.tags.toLowerCase().split(',').map(function(s) { return s.trim(); });
      var hasMatch = filterTags.some(function(t) { return assetTags.includes(t); });
      if (!hasMatch) return false;
    }

    return true;
  }));
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search assets by text query
 * @param {string} query - Search query
 * @returns {Array} Matching assets
 */
function searchCommsAssets(query) {
  if (!query || query.trim().length < 2) return [];

  var assets = loadAllCommsAssets_();
  var lowerQuery = query.toLowerCase();

  return deepCopy(assets.filter(function(a) {
    var searchText = [
      a.asset_id,
      a.title,
      a.content,
      a.source_name,
      a.attribution_text,
      a.solution_ids,
      a.tags
    ].join(' ').toLowerCase();

    return searchText.includes(lowerQuery);
  }));
}

/**
 * Combined search for "What do I say about X?"
 * Searches across assets, returns grouped by type
 * @param {string} query - Search query (solution name, topic, keyword)
 * @returns {Object} Results grouped by asset type
 */
function searchWhatToSay(query) {
  var results = searchCommsAssets(query);

  // Group by type
  var grouped = {
    talking_point: [],
    blurb: [],
    quote: [],
    fact: [],
    soundbite: [],
    boilerplate: [],
    connection: []
  };

  results.forEach(function(asset) {
    if (grouped[asset.asset_type]) {
      grouped[asset.asset_type].push(asset);
    }
  });

  // Also count by type
  var counts = {};
  Object.keys(grouped).forEach(function(type) {
    counts[type] = grouped[type].length;
  });

  return {
    query: query,
    total: results.length,
    counts: counts,
    results: grouped
  };
}

// ============================================================================
// STATISTICS & SUMMARY
// ============================================================================

/**
 * Get comms assets summary/statistics
 * @returns {Object} Summary statistics
 */
function getCommsAssetsSummary() {
  var assets = loadAllCommsAssets_();

  var byType = {};
  var byStatus = {};
  var bySolution = {};

  assets.forEach(function(a) {
    // By type
    byType[a.asset_type] = (byType[a.asset_type] || 0) + 1;

    // By status
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;

    // By solution
    if (a.solution_ids) {
      var ids = a.solution_ids.split(',').map(function(s) { return s.trim(); });
      ids.forEach(function(id) {
        if (id) bySolution[id] = (bySolution[id] || 0) + 1;
      });
    }
  });

  // Find assets needing attention (expired or needs_update)
  var today = new Date().toISOString().split('T')[0];
  var needsAttention = assets.filter(function(a) {
    if (a.status === 'needs_update') return true;
    if (a.expiration_date && a.expiration_date <= today) return true;
    return false;
  });

  // Most used assets
  var mostUsed = deepCopy(assets)
    .filter(function(a) { return a.use_count > 0; })
    .sort(function(a, b) { return (b.use_count || 0) - (a.use_count || 0); })
    .slice(0, 10);

  return {
    total: assets.length,
    by_type: byType,
    by_status: byStatus,
    by_solution: bySolution,
    needs_attention: needsAttention.length,
    attention_items: needsAttention,
    most_used: mostUsed,
    approved_count: byStatus['approved'] || 0,
    draft_count: byStatus['draft'] || 0
  };
}

/**
 * Get asset type options
 * @param {boolean} includeFileTypes - Include file-based asset types
 * @returns {Array} Valid asset types
 */
function getCommsAssetTypeOptions(includeFileTypes) {
  var textTypes = [
    { value: 'blurb', label: 'Blurb', description: '2-3 sentence descriptions for updates', category: 'text' },
    { value: 'talking_point', label: 'Talking Point', description: 'Key messages for briefings', category: 'text' },
    { value: 'quote', label: 'Quote', description: 'Stakeholder/leadership quotes', category: 'text' },
    { value: 'fact', label: 'Fact/Stat', description: 'Statistics and data points', category: 'text' },
    { value: 'soundbite', label: 'Sound Bite', description: 'Short punchy statements', category: 'text' },
    { value: 'boilerplate', label: 'Boilerplate', description: 'Standard program descriptions', category: 'text' },
    { value: 'connection', label: 'Connection', description: 'Solution-agency relationships', category: 'text' }
  ];

  if (!includeFileTypes) {
    return textTypes;
  }

  var fileTypes = [
    { value: 'image', label: 'Image', description: 'Photos, screenshots, diagrams', category: 'file' },
    { value: 'presentation', label: 'Presentation', description: 'PowerPoint/Google Slides', category: 'file' },
    { value: 'pdf', label: 'PDF', description: 'PDF documents', category: 'file' },
    { value: 'video', label: 'Video', description: 'Video files or links', category: 'file' },
    { value: 'document', label: 'Document', description: 'Word/Google Docs files', category: 'file' },
    { value: 'graphic', label: 'Graphic', description: 'Infographics, charts', category: 'file' }
  ];

  return textTypes.concat(fileTypes);
}

/**
 * Get usage rights options
 * @returns {Array} Valid usage rights
 */
function getUsageRightsOptions() {
  return [
    { value: 'public-domain', label: 'Public Domain', description: 'Free to use without attribution' },
    { value: 'nasa-media', label: 'NASA Media', description: 'NASA-owned, follows NASA media guidelines' },
    { value: 'internal-only', label: 'Internal Only', description: 'Not for external distribution' },
    { value: 'attribution-required', label: 'Attribution Required', description: 'Must credit rights holder' }
  ];
}

// ============================================================================
// FILE ASSETS
// ============================================================================

/**
 * Get file-type assets (images, presentations, etc.)
 * @param {Object} filters - Optional filters {file_type, solution}
 * @returns {Array} File assets
 */
function getFileAssets(filters) {
  var assets = loadAllCommsAssets_();
  var fileTypes = ['image', 'presentation', 'pdf', 'video', 'document', 'graphic'];

  var results = assets.filter(function(a) {
    // Must be a file-type asset OR have asset_url
    var isFileType = fileTypes.includes(a.asset_type) || (a.asset_url && a.asset_url.trim());
    if (!isFileType) return false;

    // Apply file_type filter
    if (filters && filters.file_type && a.asset_file_type !== filters.file_type) {
      return false;
    }

    // Apply solution filter
    if (filters && filters.solution) {
      if (!a.solution_ids) return false;
      var ids = a.solution_ids.toLowerCase().split(',').map(function(s) { return s.trim(); });
      if (!ids.includes(filters.solution.toLowerCase())) return false;
    }

    return true;
  });

  return deepCopy(results);
}

/**
 * Upload a file to Google Drive and create an asset record
 * @param {Blob} fileBlob - The file blob to upload
 * @param {Object} metadata - Asset metadata (title, solution_ids, tags, etc.)
 * @returns {Object} Result with success/error and created asset
 */
function uploadCommsAsset(fileBlob, metadata) {
  try {
    // Get the assets folder
    var folderId = getConfigValue('COMMS_ASSETS_FOLDER_ID');
    if (!folderId) {
      return { success: false, error: 'COMMS_ASSETS_FOLDER_ID not configured' };
    }

    var folder = DriveApp.getFolderById(folderId);

    // Upload file to Drive
    var file = folder.createFile(fileBlob);
    var fileUrl = file.getUrl();
    var mimeType = file.getMimeType();

    // Determine file type from MIME type
    var fileType = 'document';
    if (mimeType.includes('image')) {
      fileType = 'image';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      fileType = 'presentation';
    } else if (mimeType.includes('pdf')) {
      fileType = 'pdf';
    } else if (mimeType.includes('video')) {
      fileType = 'video';
    }

    // Build description with metadata for Drive file
    var description = [];
    if (metadata.solution_ids) description.push('Solutions: ' + metadata.solution_ids);
    if (metadata.tags) description.push('Tags: ' + metadata.tags);
    if (metadata.usage_rights) description.push('Rights: ' + metadata.usage_rights);
    if (metadata.attribution_text) description.push('Attribution: ' + metadata.attribution_text);
    if (description.length > 0) {
      file.setDescription(description.join('\n'));
    }

    // Create asset record
    var assetData = {
      asset_type: fileType,
      title: metadata.title || file.getName(),
      content: metadata.content || '',
      asset_url: fileUrl,
      asset_file_type: fileType,
      thumbnail_url: metadata.thumbnail_url || '',
      source_name: metadata.source_name || 'File Upload',
      source_type: 'internal',
      source_url: fileUrl,
      attribution_text: metadata.attribution_text || '',
      date_captured: new Date().toISOString().split('T')[0],
      usage_rights: metadata.usage_rights || 'internal-only',
      rights_holder: metadata.rights_holder || '',
      solution_ids: metadata.solution_ids || '',
      agency_ids: metadata.agency_ids || '',
      contact_ids: metadata.contact_ids || '',
      tags: metadata.tags || '',
      audience: metadata.audience || 'internal',
      channels: metadata.channels || 'all',
      tone: 'formal',
      usage_notes: metadata.usage_notes || '',
      status: 'draft'
    };

    var createResult = createCommsAsset(assetData);
    if (!createResult.success) {
      // Cleanup: delete the uploaded file if asset creation fails
      file.setTrashed(true);
      return createResult;
    }

    return {
      success: true,
      data: createResult.data,
      fileUrl: fileUrl,
      fileId: file.getId()
    };
  } catch (e) {
    Logger.log('uploadCommsAsset error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Upload a file from base64 data with metadata and create an asset record
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type of the file
 * @param {Object} metadata - Asset metadata (title, content, solution_ids, etc.)
 * @returns {Object} Result with success/error and created asset
 */
function uploadCommsAssetWithMetadata(base64Data, fileName, mimeType, metadata) {
  try {
    // Get the assets folder
    var folderId = getConfigValue('COMMS_ASSETS_FOLDER_ID');
    if (!folderId) {
      return { success: false, error: 'COMMS_ASSETS_FOLDER_ID not configured. Add this to MO-DB_Config.' };
    }

    var folder = DriveApp.getFolderById(folderId);

    // Decode base64 and create blob
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    // Upload file to Drive
    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();

    // Determine file type from MIME type
    var fileType = 'document';
    if (mimeType.includes('image')) {
      fileType = 'image';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      fileType = 'presentation';
    } else if (mimeType.includes('pdf')) {
      fileType = 'pdf';
    } else if (mimeType.includes('video')) {
      fileType = 'video';
    }

    // Set file description with metadata
    var description = [];
    if (metadata.solution_ids) description.push('Solutions: ' + metadata.solution_ids);
    if (metadata.tags) description.push('Tags: ' + metadata.tags);
    if (metadata.usage_rights) description.push('Rights: ' + metadata.usage_rights);
    if (description.length > 0) {
      file.setDescription(description.join('\n'));
    }

    // Create asset record with user-provided metadata
    var assetData = {
      asset_type: fileType,
      title: metadata.title || fileName.replace(/\.[^/.]+$/, ''),
      content: metadata.content || metadata.title || '[File: ' + fileName + ']',
      asset_url: fileUrl,
      asset_file_type: fileType,
      source_name: 'File Upload',
      source_type: 'internal',
      source_url: fileUrl,
      date_captured: new Date().toISOString().split('T')[0],
      usage_rights: metadata.usage_rights || 'internal-only',
      rights_holder: metadata.rights_holder || '',
      solution_ids: metadata.solution_ids || '',
      agency_ids: metadata.agency_ids || '',
      contact_ids: metadata.contact_ids || '',
      tags: metadata.tags || '',
      audience: metadata.audience || 'internal',
      channels: metadata.channels || 'all',
      status: 'approved'
    };

    var createResult = createCommsAsset(assetData);
    if (!createResult.success) {
      // Cleanup: delete the uploaded file if asset creation fails
      file.setTrashed(true);
      return createResult;
    }

    return {
      success: true,
      data: createResult.data,
      fileUrl: fileUrl,
      fileId: file.getId()
    };
  } catch (e) {
    Logger.log('uploadCommsAssetWithMetadata error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Upload a file from base64 data and create an asset record (no metadata)
 * Used by frontend dropzone upload (can't pass Blob directly via google.script.run)
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Object} Result with success/error and created asset
 */
function uploadCommsAssetBase64(base64Data, fileName, mimeType) {
  try {
    // Get the assets folder
    var folderId = getConfigValue('COMMS_ASSETS_FOLDER_ID');
    if (!folderId) {
      return { success: false, error: 'COMMS_ASSETS_FOLDER_ID not configured. Add this to MO-DB_Config.' };
    }

    var folder = DriveApp.getFolderById(folderId);

    // Decode base64 and create blob
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    // Upload file to Drive
    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();

    // Determine file type from MIME type
    var fileType = 'document';
    if (mimeType.includes('image')) {
      fileType = 'image';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      fileType = 'presentation';
    } else if (mimeType.includes('pdf')) {
      fileType = 'pdf';
    } else if (mimeType.includes('video')) {
      fileType = 'video';
    }

    // Create asset record with minimal data (user will fill in metadata)
    var titleFromFile = fileName.replace(/\.[^/.]+$/, '');  // Filename without extension
    var assetData = {
      asset_type: fileType,
      title: titleFromFile,
      content: '[File: ' + fileName + ']',  // Placeholder content for file assets
      asset_url: fileUrl,
      asset_file_type: fileType,
      source_name: 'File Upload',
      source_type: 'internal',
      source_url: fileUrl,
      date_captured: new Date().toISOString().split('T')[0],
      usage_rights: 'internal-only',
      status: 'draft'
    };

    var createResult = createCommsAsset(assetData);
    if (!createResult.success) {
      // Cleanup: delete the uploaded file if asset creation fails
      file.setTrashed(true);
      return createResult;
    }

    return {
      success: true,
      data: createResult.data,
      fileUrl: fileUrl,
      fileId: file.getId()
    };
  } catch (e) {
    Logger.log('uploadCommsAssetBase64 error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get thumbnail URL for an asset
 * If asset has thumbnail_url, returns that. Otherwise tries to generate from asset_url.
 * @param {Object} asset - The asset object
 * @returns {string} Thumbnail URL or empty string
 */
function getAssetThumbnail(asset) {
  if (asset.thumbnail_url) {
    return asset.thumbnail_url;
  }

  // Try to generate Drive thumbnail if it's a Drive file
  if (asset.asset_url && asset.asset_url.includes('drive.google.com')) {
    // Extract file ID and build thumbnail URL
    var match = asset.asset_url.match(/[-\w]{25,}/);
    if (match) {
      return 'https://drive.google.com/thumbnail?id=' + match[0] + '&sz=w200-h200';
    }
  }

  return '';
}

// ============================================================================
// PROMOTE ARTIFACT TO COMMS ASSET
// ============================================================================

/**
 * Promote an event artifact to a CommsAsset
 * Creates a new CommsAsset with source_engagement_id set,
 * then updates the artifact's comms_asset_id reference
 * @param {string} engagementId - Engagement ID
 * @param {number} artifactIndex - Index of artifact to promote
 * @param {Object} assetData - Additional asset metadata to include
 *   {title, content, solution_ids, tags, audience, channels, usage_rights, etc.}
 * @returns {Object} Result with success/error and created asset
 */
function promoteArtifactToCommsAsset(engagementId, artifactIndex, assetData) {
  try {
    // Get the engagement and artifact
    var engagement = getEngagementById(engagementId);
    if (!engagement) {
      return { success: false, error: 'Engagement not found: ' + engagementId };
    }

    // Parse artifacts
    var artifacts = [];
    if (engagement.event_artifacts) {
      try {
        artifacts = JSON.parse(engagement.event_artifacts);
      } catch (e) {
        return { success: false, error: 'Failed to parse artifacts JSON' };
      }
    }

    if (artifactIndex < 0 || artifactIndex >= artifacts.length) {
      return { success: false, error: 'Invalid artifact index: ' + artifactIndex };
    }

    var artifact = artifacts[artifactIndex];

    // Check if already promoted
    if (artifact.comms_asset_id) {
      return { success: false, error: 'Artifact already promoted to CommsAsset: ' + artifact.comms_asset_id };
    }

    // Map artifact type to CommsAsset type
    var typeMap = {
      'presentation': 'presentation',
      'recording': 'video',
      'notes': 'document',
      'photos': 'image'
    };
    var assetType = typeMap[artifact.type] || 'document';

    // Build CommsAsset data
    var newAssetData = {
      asset_type: assetType,
      title: assetData.title || artifact.name,
      content: assetData.content || '[Promoted from event: ' + (engagement.event_name || engagement.subject) + ']',
      asset_url: artifact.url,
      asset_file_type: assetType,
      source_name: engagement.event_name || engagement.subject,
      source_type: 'event',
      source_url: artifact.url,
      source_engagement_id: engagementId,
      date_captured: engagement.event_date || engagement.date,
      solution_ids: assetData.solution_ids || engagement.solution_id,
      agency_ids: assetData.agency_ids || engagement.agency_id || '',
      tags: assetData.tags || artifact.type,
      audience: assetData.audience || 'internal',
      channels: assetData.channels || 'all',
      usage_rights: assetData.usage_rights || 'internal-only',
      rights_holder: assetData.rights_holder || '',
      status: 'approved'
    };

    // Create the CommsAsset
    var createResult = createCommsAsset(newAssetData);
    if (!createResult.success) {
      return createResult;
    }

    var newAssetId = createResult.data.asset_id;

    // Update the artifact with the new comms_asset_id
    artifacts[artifactIndex].comms_asset_id = newAssetId;

    // Update the artifact's comms_asset_id in the engagement
    // Use updateArtifactCommsAssetId from engagements-api if available,
    // otherwise update directly
    try {
      var updateResult = updateArtifactCommsAssetId(engagementId, artifactIndex, newAssetId);
      if (!updateResult.success) {
        Logger.log('Warning: Created CommsAsset ' + newAssetId + ' but could not update artifact reference: ' + updateResult.error);
      }
    } catch (e) {
      Logger.log('Warning: Created CommsAsset ' + newAssetId + ' but could not update artifact reference: ' + e.message);
    }

    // Clear comms assets cache (engagements cache cleared by updateArtifactCommsAssetId)
    clearCommsAssetsCache_();

    return {
      success: true,
      data: createResult.data,
      message: 'Artifact promoted to CommsAsset ' + newAssetId
    };
  } catch (e) {
    Logger.log('Error in promoteArtifactToCommsAsset: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get CommsAssets that were promoted from events
 * @param {string} engagementId - Optional engagement ID to filter by
 * @returns {Array} Assets with source_engagement_id set
 */
function getPromotedAssets(engagementId) {
  var assets = loadAllCommsAssets_();
  var results = assets.filter(function(a) {
    if (!a.source_engagement_id) return false;
    if (engagementId) {
      return a.source_engagement_id === engagementId;
    }
    return true;
  });
  return deepCopy(results);
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Record that an asset was used (copy, export, etc.)
 * @param {string} assetId - Asset ID
 * @returns {Object} Result
 */
function recordCommsAssetUsage(assetId) {
  try {
    var asset = getCommsAssetById(assetId);
    if (!asset) {
      return { success: false, error: 'Asset not found' };
    }

    var newCount = (asset.use_count || 0) + 1;
    var today = new Date().toISOString().split('T')[0];

    return updateCommsAsset(assetId, {
      use_count: newCount,
      last_used_date: today
    });
  } catch (e) {
    Logger.log('recordCommsAssetUsage error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY - Blurbs
// ============================================================================

/**
 * Get highlighter blurbs (backward compatible with stories-api)
 * @param {number} limit - Optional limit
 * @returns {Array} Blurbs in legacy format
 */
function getHighlighterBlurbsFromAssets(limit) {
  limit = limit || 20;
  var blurbs = getCommsAssetsByType('blurb');

  // Sort by date_captured descending
  blurbs.sort(function(a, b) {
    var dateA = a.date_captured || a.created_at || '';
    var dateB = b.date_captured || b.created_at || '';
    return dateB.localeCompare(dateA);
  });

  // Map to legacy format expected by comms.html
  return blurbs.slice(0, limit).map(function(asset) {
    return {
      story_id: asset.asset_id,
      title: asset.title,
      content: asset.content,
      solution_id: asset.solution_ids,
      target_date: asset.date_captured,
      status: asset.status,
      content_type: 'highlighter_blurb',
      // Additional fields for enhanced UI
      source_name: asset.source_name,
      tags: asset.tags
    };
  });
}

// ============================================================================
// BACKWARD COMPATIBILITY - Key Messages
// ============================================================================

/**
 * Get key messages for a solution (backward compatible with solutions-api)
 * @param {string} solutionId - Solution ID
 * @returns {Object} Key messages in legacy format
 */
function getKeyMessagesFromAssets(solutionId) {
  var assets = getCommsAssetsBySolution(solutionId);

  // Get different types
  var talkingPoints = assets.filter(function(a) { return a.asset_type === 'talking_point'; });
  var facts = assets.filter(function(a) { return a.asset_type === 'fact'; });
  var quotes = assets.filter(function(a) { return a.asset_type === 'quote'; });
  var connections = assets.filter(function(a) { return a.asset_type === 'connection'; });

  // Build legacy format
  return {
    core_id: solutionId,
    comms_key_messages: talkingPoints.map(function(a) { return a.content; }).join('\n\n'),
    comms_focus_type: talkingPoints.length > 0 ? talkingPoints[0].tags : '',
    comms_industry: connections.map(function(a) { return a.content; }).join('\n\n'),
    comms_science: facts.filter(function(a) {
      return a.tags && a.tags.includes('science');
    }).map(function(a) { return a.content; }).join('\n\n'),
    comms_agency_impact: connections.concat(quotes).map(function(a) { return a.content; }).join('\n\n'),
    // New enhanced data
    assets: {
      talking_points: talkingPoints,
      facts: facts,
      quotes: quotes,
      connections: connections
    }
  };
}

/**
 * Get all solutions with key messages (backward compatible)
 * @returns {Array} Solutions that have talking points
 */
function getSolutionsWithKeyMessagesFromAssets() {
  var assets = loadAllCommsAssets_();

  // Get unique solution IDs that have talking points
  var solutionIds = {};
  assets.filter(function(a) {
    return a.asset_type === 'talking_point' && a.solution_ids;
  }).forEach(function(a) {
    var ids = a.solution_ids.split(',').map(function(s) { return s.trim(); });
    ids.forEach(function(id) {
      if (id) solutionIds[id] = true;
    });
  });

  // Return key messages for each solution
  return Object.keys(solutionIds).map(function(solutionId) {
    return getKeyMessagesFromAssets(solutionId);
  });
}
