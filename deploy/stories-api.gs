/**
 * Stories API - Thin Wrapper
 * ==========================
 * Delegates to MoApi library for Stories/Comms data access.
 * Full implementation in: library/stories-api.gs
 */

// Core CRUD Operations
function getAllStories(limit) {
  return MoApi.getAllStories(limit);
}

function getStoryById(storyId) {
  return MoApi.getStoryById(storyId);
}

function createStory(storyData) {
  return MoApi.createStory(storyData);
}

function updateStory(storyId, updates) {
  return MoApi.updateStory(storyId, updates);
}

function deleteStory(storyId) {
  return MoApi.deleteStory(storyId);
}

// Pipeline Queries
function getStoriesByStatus(status) {
  return MoApi.getStoriesByStatus(status);
}

function getStoriesByContentType(contentType) {
  return MoApi.getStoriesByContentType(contentType);
}

function getStoriesBySolution(solutionId) {
  return MoApi.getStoriesBySolution(solutionId);
}

function getStoriesByChannel(channel) {
  return MoApi.getStoriesByChannel(channel);
}

function getStoryPipelineCounts() {
  return MoApi.getStoryPipelineCounts();
}

function getPipelineStories() {
  return MoApi.getPipelineStories();
}

// Coverage Analysis
function getCoverageAnalysis(days) {
  return MoApi.getCoverageAnalysis(days);
}

function getSolutionsWithoutStories() {
  return MoApi.getSolutionsWithoutStories();
}

// Opportunity Detection
function detectStoryOpportunities() {
  return MoApi.detectStoryOpportunities();
}

// Statistics & Overview
function getCommsStats() {
  return MoApi.getCommsStats();
}

function getCommsOverview() {
  return MoApi.getCommsOverview();
}

function getRecentPublished(limit) {
  return MoApi.getRecentPublished(limit);
}

// Date Range Queries
function getStoriesByDateRange(startDate, endDate, dateField) {
  return MoApi.getStoriesByDateRange(startDate, endDate, dateField);
}

function getUpcomingTargets(days) {
  return MoApi.getUpcomingTargets(days);
}

// Helper Functions
function getContentTypeOptions() {
  return MoApi.getContentTypeOptions();
}

function getStatusOptions() {
  return MoApi.getStatusOptions();
}

function getChannelOptions() {
  return MoApi.getChannelOptions();
}

function getPriorityOptions() {
  return MoApi.getPriorityOptions();
}

function updateStoryStatus(storyId, newStatus) {
  return MoApi.updateStoryStatus(storyId, newStatus);
}

function searchStories(query) {
  return MoApi.searchStories(query);
}

function getPipelineStoriesForUI() {
  return MoApi.getPipelineStoriesForUI();
}

// Highlighter Blurbs (HQ Reporting)
function getHighlighterBlurbs(limit) {
  return MoApi.getHighlighterBlurbs(limit);
}

function getBlurbsDueThisWeek() {
  return MoApi.getBlurbsDueThisWeek();
}

function getNextBlurbDeadline() {
  return MoApi.getNextBlurbDeadline();
}
