/**
 * Sync Weekly Internal Historical
 * ================================
 * Historical backfill for Internal Planning agenda
 * Processes ALL date-formatted tabs in the document
 *
 * USAGE:
 * - Run ONCE for initial database setup
 * - Update Sync → Weekly Historical → Internal Agenda
 *
 * REQUIRES: sync-common.gs
 *
 * @fileoverview Internal agenda historical backfill (all tabs)
 */

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Sync ALL tabs from Internal Planning agenda
 * Use this for initial backfill of historical data
 */
function syncWeeklyInternalHistorical() {
  var source = WEEKLY_SOURCES['internal'];
  var result = syncFromSourceHistorical_(source, 'internal');

  Logger.log('Internal historical sync complete: ' + result.newUpdates + ' new updates from ' +
             result.tabsProcessed + ' tabs, ' + result.skippedUpdates + ' skipped');

  return result;
}
