/**
 * Parking Lot API - Thin Wrapper
 * ==============================
 * Delegates to MoApi library for Parking Lot data access.
 * Full implementation in: library/parking-lot-api.gs
 */

// Core CRUD Operations
function getAllParkingLotItems(includeArchived) {
  return MoApi.getAllParkingLotItems(includeArchived);
}

function getParkingLotItemById(itemId) {
  return MoApi.getParkingLotItemById(itemId);
}

function createParkingLotItem(itemData) {
  return MoApi.createParkingLotItem(itemData);
}

function updateParkingLotItem(itemId, updates) {
  return MoApi.updateParkingLotItem(itemId, updates);
}

function deleteParkingLotItem(itemId) {
  return MoApi.deleteParkingLotItem(itemId);
}

function archiveParkingLotItem(itemId) {
  return MoApi.archiveParkingLotItem(itemId);
}

// Query Functions
function getParkingLotItemsByType(itemType) {
  return MoApi.getParkingLotItemsByType(itemType);
}

function getParkingLotItemsByStatus(status) {
  return MoApi.getParkingLotItemsByStatus(status);
}

function getParkingLotItemsByAssignee(assignee) {
  return MoApi.getParkingLotItemsByAssignee(assignee);
}

function getParkingLotItemsBySolution(solutionId) {
  return MoApi.getParkingLotItemsBySolution(solutionId);
}

function getParkingLotItemsBySubmitter(submitter) {
  return MoApi.getParkingLotItemsBySubmitter(submitter);
}

function getParkingLotItemsNeedingAttention() {
  return MoApi.getParkingLotItemsNeedingAttention();
}

function getParkingLotItemsByPriority(priority) {
  return MoApi.getParkingLotItemsByPriority(priority);
}

// Search
function searchParkingLotItems(query) {
  return MoApi.searchParkingLotItems(query);
}

// Statistics
function getParkingLotStats() {
  return MoApi.getParkingLotStats();
}

// Helper Functions
function getParkingLotTypeOptions() {
  return MoApi.getParkingLotTypeOptions();
}

function getParkingLotStatusOptions() {
  return MoApi.getParkingLotStatusOptions();
}

function getParkingLotPriorityOptions() {
  return MoApi.getParkingLotPriorityOptions();
}

function assignParkingLotItem(itemId, assignee) {
  return MoApi.assignParkingLotItem(itemId, assignee);
}

function updateParkingLotItemStatus(itemId, newStatus) {
  return MoApi.updateParkingLotItemStatus(itemId, newStatus);
}

function addNoteToParkingLotItem(itemId, note) {
  return MoApi.addNoteToParkingLotItem(itemId, note);
}

// Team Page Integration
function getParkingLotOverview() {
  return MoApi.getParkingLotOverview();
}

// Cache Management
function clearParkingLotCache() {
  return MoApi.clearParkingLotCache();
}
