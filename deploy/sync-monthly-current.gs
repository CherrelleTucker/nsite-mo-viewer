/**
 * Sync Monthly Current
 * =====================
 * Routine sync for monthly meeting agendas (OPERA, PBL)
 * Processes only the most recent tab from each document
 *
 * USAGE:
 * - Run manually: Update Sync → Monthly Current → Sync All
 * - Or set up monthly time trigger for syncMonthlyCurrent()
 *
 * REQUIRES: sync-common.gs
 *
 * @fileoverview Monthly routine sync (latest tab only)
 */

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Sync current updates from all monthly agendas (OPERA, PBL)
 * Use this for monthly routine syncs
 */
function syncMonthlyCurrent() {
  var results = {
    sources: [],
    totalNew: 0,
    totalSkipped: 0,
    errors: []
  };

  for (var sourceKey in MONTHLY_SOURCES) {
    try {
      var source = MONTHLY_SOURCES[sourceKey];
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

  Logger.log('Monthly sync complete: ' + results.totalNew + ' new updates, ' +
             results.totalSkipped + ' skipped, ' +
             results.errors.length + ' errors');

  return results;
}

/**
 * Sync current updates from OPERA Monthly only
 */
function syncMonthlyOPERA() {
  var source = MONTHLY_SOURCES['opera'];
  return syncFromSource_(source, 'opera');
}

/**
 * Sync current updates from PBL Monthly only
 */
function syncMonthlyPBL() {
  var source = MONTHLY_SOURCES['pbl'];
  return syncFromSource_(source, 'pbl');
}
