/**
 * Templates API - Thin Wrapper
 * ============================
 * Delegates to MoApi library for Templates data access.
 * Full implementation in: library/templates-api.gs
 */

// Core CRUD Operations
function getAllTemplates(includeInactive) {
  return MoApi.getAllTemplates(includeInactive);
}

function getTemplateById(templateId) {
  return MoApi.getTemplateById(templateId);
}

function getTemplatesByCategory(category) {
  return MoApi.getTemplatesByCategory(category);
}

function getTemplatesBySubcategory(subcategory) {
  return MoApi.getTemplatesBySubcategory(subcategory);
}

function getTemplatesByPhase(phase) {
  return MoApi.getTemplatesByPhase(phase);
}

// SEP-Specific Queries
function getSEPTemplates() {
  return MoApi.getSEPTemplates();
}

function getSEPTouchpointTemplates(touchpointId) {
  return MoApi.getSEPTouchpointTemplates(touchpointId);
}

function getSEPWorkingSessionTemplates(sessionId) {
  return MoApi.getSEPWorkingSessionTemplates(sessionId);
}

// Implementation-Specific Queries
function getImplementationTemplates() {
  return MoApi.getImplementationTemplates();
}

function getDecisionGateTemplates(gateType) {
  return MoApi.getDecisionGateTemplates(gateType);
}

function getKickoffTemplates() {
  return MoApi.getKickoffTemplates();
}

// Outreach Templates
function getOutreachTemplates() {
  return MoApi.getOutreachTemplates();
}

// Blurb Templates
function getBlurbTemplates() {
  return MoApi.getBlurbTemplates();
}

function getBlurbForMilestone(milestoneType) {
  return MoApi.getBlurbForMilestone(milestoneType);
}

// Template Processing
function applyTemplate(templateId, variables) {
  return MoApi.applyTemplate(templateId, variables);
}

function getTemplatePlaceholders() {
  return MoApi.getTemplatePlaceholders();
}

// Statistics & Overview
function getTemplateStats() {
  return MoApi.getTemplateStats();
}

function getTemplateCategories() {
  return MoApi.getTemplateCategories();
}

// Search
function searchTemplates(query) {
  return MoApi.searchTemplates(query);
}

// SEP Integration (backward compatible)
function getEmailTemplatesForSEP() {
  return MoApi.getEmailTemplatesForSEP();
}

function getTemplatesGroupedByCategory() {
  return MoApi.getTemplatesGroupedByCategory();
}

// Comms Integration
function getCommsTemplates() {
  return MoApi.getCommsTemplates();
}

// Cache Management
function clearTemplatesCache() {
  return MoApi.clearTemplatesCache();
}
