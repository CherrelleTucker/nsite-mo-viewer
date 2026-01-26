/**
 * Sync Weekly Current
 * ====================
 * Routine sync for weekly meeting agendas (Internal + SEP)
 * Processes only the most recent tab from each document
 *
 * USAGE:
 * - Run manually: Update Sync → Weekly Current → Sync All
 * - Or set up weekly time trigger for syncWeeklyCurrent()
 *
 * REQUIRES: sync-common.gs
 *
 * @fileoverview Weekly routine sync (latest tab only)
 */

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Sync current updates from both Internal and SEP agendas
 * Use this for weekly routine syncs
 */
function syncWeeklyCurrent() {
  var results = {
    sources: [],
    totalNew: 0,
    totalSkipped: 0,
    errors: []
  };

  for (var sourceKey in WEEKLY_SOURCES) {
    try {
      var source = WEEKLY_SOURCES[sourceKey];
      var result = syncFromSource_(source, sourceKey);
      results.sources.push({
        source: sourceKey,
        newUpdates: result.newUpdates,
        skippedUpdates: result.skippedUpdates
      });
      results.totalNew += result.newUpdates;
      results.totalSkipped += result.skippedUpdates;
    } catch (error) {
      results.errors.push({
        source: sourceKey,
        error: error.message
      });
      Logger.log('Error syncing ' + sourceKey + ': ' + error);
    }
  }

  Logger.log('Weekly sync complete: ' + results.totalNew + ' new updates, ' +
             results.totalSkipped + ' skipped, ' +
             results.errors.length + ' errors');

  return results;
}

/**
 * Sync current updates from Internal agenda only
 */
function syncWeeklyInternal() {
  var source = WEEKLY_SOURCES['internal'];
  return syncFromSource_(source, 'internal');
}

/**
 * Sync current updates from SEP agenda only
 */
function syncWeeklySEP() {
  var source = WEEKLY_SOURCES['sep'];
  return syncFromSource_(source, 'sep');
}
