/**
 * Kudos API - Thin Wrapper
 * ========================
 * Delegates to MO-APIs Library (MoApi)
 *
 * Peer recognition system for the MO team.
 * Feeds into quarterly report staff recognition suggestions.
 */

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Submit a new kudos
 * @param {Object} data - Kudos data
 * @returns {Object} Created kudos record
 */
function submitKudos(data) {
  return MoApi.submitKudos(data);
}

/**
 * Get all kudos, optionally filtered
 * @param {Object} options - Filter options
 * @returns {Array} Kudos records
 */
function getAllKudos(options) {
  return MoApi.getAllKudos(options);
}

/**
 * Get kudos for a specific person (by email)
 * @param {string} email - Email address
 * @param {number} days - Look back N days (default 90)
 * @returns {Array} Kudos received by this person
 */
function getKudosForPerson(email, days) {
  return MoApi.getKudosForPerson(email, days);
}

/**
 * Get kudos for current quarter
 * @returns {Array} Kudos from current fiscal quarter
 */
function getKudosThisQuarter() {
  return MoApi.getKudosThisQuarter();
}

/**
 * Get recent kudos (last 30 days)
 * @param {number} limit - Max results
 * @returns {Array} Recent kudos
 */
function getRecentKudos(limit) {
  return MoApi.getRecentKudos(limit);
}

// ============================================================================
// STATISTICS & REPORTING
// ============================================================================

/**
 * Get kudos statistics
 * @param {number} days - Look back N days (default 90)
 * @returns {Object} Statistics
 */
function getKudosStats(days) {
  return MoApi.getKudosStats(days);
}

/**
 * Get staff recognition suggestions for quarterly report
 * @param {number} count - Number of suggestions
 * @returns {Array} Suggested staff for recognition
 */
function getRecognitionSuggestions(count) {
  return MoApi.getRecognitionSuggestions(count);
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Get category options for UI
 * @returns {Array} Category options with metadata
 */
function getKudosCategoryOptions() {
  return MoApi.getKudosCategoryOptions();
}

/**
 * Delete a kudos (admin function)
 * @param {string} kudosId - Kudos ID to delete
 * @returns {boolean} Success
 */
function deleteKudos(kudosId) {
  return MoApi.deleteKudos(kudosId);
}

/**
 * Check if Slack integration is configured
 * @returns {boolean} Whether Slack webhook is configured
 */
function isSlackConfigured() {
  return MoApi.isSlackConfigured();
}
