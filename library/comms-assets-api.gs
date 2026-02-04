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
    if (!assetData.title || !String(assetData.title).trim()) {
      return { success: false, error: 'Title is required' };
    }
    if (!assetData.content || !String(assetData.content).trim()) {
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
 * @returns {Array} Valid asset types
 */
function getCommsAssetTypeOptions() {
  return [
    { value: 'blurb', label: 'Blurb', description: '2-3 sentence descriptions for updates' },
    { value: 'talking_point', label: 'Talking Point', description: 'Key messages for briefings' },
    { value: 'quote', label: 'Quote', description: 'Stakeholder/leadership quotes' },
    { value: 'fact', label: 'Fact/Stat', description: 'Statistics and data points' },
    { value: 'soundbite', label: 'Sound Bite', description: 'Short punchy statements' },
    { value: 'boilerplate', label: 'Boilerplate', description: 'Standard program descriptions' },
    { value: 'connection', label: 'Connection', description: 'Solution-agency relationships' }
  ];
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
