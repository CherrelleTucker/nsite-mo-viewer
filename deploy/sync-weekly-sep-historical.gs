/**
 * Sync Weekly SEP Historical
 * ===========================
 * Historical backfill for SEP Strategy agenda
 * Processes ALL date-formatted tabs in the document
 *
 * USAGE:
 * - Run ONCE for initial database setup
 * - Update Sync → Weekly Historical → SEP Agenda
 *
 * REQUIRES: sync-common.gs
 *
 * @fileoverview SEP agenda historical backfill (all tabs)
 */

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Sync ALL tabs from SEP Strategy agenda
 * Use this for initial backfill of historical data
 */
function syncWeeklySEPHistorical() {
  var source = WEEKLY_SOURCES['sep'];
  var result = syncFromSourceHistorical_(source, 'sep');

  Logger.log('SEP historical sync complete: ' + result.newUpdates + ' new updates from ' +
             result.tabsProcessed + ' tabs, ' + result.skippedUpdates + ' skipped');

  return result;
}
