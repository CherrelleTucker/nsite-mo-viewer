/**
 * Comms Assets API - Thin Wrapper
 * ================================
 * Delegates to MoApi library for Comms Assets data access.
 * Full implementation in: library/comms-assets-api.gs
 */

// CRUD Operations
function getAllCommsAssets(limit) {
  return MoApi.getAllCommsAssets(limit);
}

function getCommsAssetById(assetId) {
  return MoApi.getCommsAssetById(assetId);
}

function createCommsAsset(assetData) {
  return MoApi.createCommsAsset(assetData);
}

function updateCommsAsset(assetId, updates) {
  return MoApi.updateCommsAsset(assetId, updates);
}

function deleteCommsAsset(assetId) {
  return MoApi.deleteCommsAsset(assetId);
}

// Query Functions
function getCommsAssetsByType(assetType) {
  return MoApi.getCommsAssetsByType(assetType);
}

function getCommsAssetsBySolution(solutionId) {
  return MoApi.getCommsAssetsBySolution(solutionId);
}

function getCommsAssetsByAudience(audience) {
  return MoApi.getCommsAssetsByAudience(audience);
}

function getCommsAssetsByChannel(channel) {
  return MoApi.getCommsAssetsByChannel(channel);
}

function getCommsAssetsByStatus(status) {
  return MoApi.getCommsAssetsByStatus(status);
}

function getApprovedCommsAssets() {
  return MoApi.getApprovedCommsAssets();
}

function queryCommsAssets(filters) {
  return MoApi.queryCommsAssets(filters);
}

// Search Functions
function searchCommsAssets(query) {
  return MoApi.searchCommsAssets(query);
}

function searchWhatToSay(query) {
  return MoApi.searchWhatToSay(query);
}

// Statistics
function getCommsAssetsSummary() {
  return MoApi.getCommsAssetsSummary();
}

function getCommsAssetTypeOptions(includeFileTypes) {
  return MoApi.getCommsAssetTypeOptions(includeFileTypes);
}

function getUsageRightsOptions() {
  return MoApi.getUsageRightsOptions();
}

// File Assets
function getFileAssets(filters) {
  return MoApi.getFileAssets(filters);
}

function uploadCommsAsset(fileBlob, metadata) {
  return MoApi.uploadCommsAsset(fileBlob, metadata);
}

function uploadCommsAssetBase64(base64Data, fileName, mimeType) {
  return MoApi.uploadCommsAssetBase64(base64Data, fileName, mimeType);
}

function uploadCommsAssetWithMetadata(base64Data, fileName, mimeType, metadata) {
  return MoApi.uploadCommsAssetWithMetadata(base64Data, fileName, mimeType, metadata);
}

function getAssetThumbnail(asset) {
  return MoApi.getAssetThumbnail(asset);
}

// Usage Tracking
function recordCommsAssetUsage(assetId) {
  return MoApi.recordCommsAssetUsage(assetId);
}

// Backward Compatibility - Blurbs
function getHighlighterBlurbsFromAssets(limit) {
  return MoApi.getHighlighterBlurbsFromAssets(limit);
}

// Backward Compatibility - Key Messages
function getKeyMessagesFromAssets(solutionId) {
  return MoApi.getKeyMessagesFromAssets(solutionId);
}

function getSolutionsWithKeyMessagesFromAssets() {
  return MoApi.getSolutionsWithKeyMessagesFromAssets();
}
