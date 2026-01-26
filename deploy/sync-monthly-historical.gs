/**
 * Sync Monthly Historical
 * ========================
 * Historical backfill for monthly meeting agendas (OPERA, PBL)
 * Processes ALL date-formatted tabs in each document
 *
 * USAGE:
 * - Run ONCE for initial database setup
 * - Update Sync → Monthly Historical → ...
 *
 * REQUIRES: sync-common.gs
 *
 * @fileoverview Monthly agendas historical backfill (all tabs)
 */

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Sync ALL tabs from all monthly agendas
 * Use this for initial backfill of historical data
 */
function syncMonthlyHistorical() {
  var results = {
    sources: [],
    totalNew: 0,
    totalSkipped: 0,
    totalTabs: 0,
    errors: []
  };

  for (var sourceKey in MONTHLY_SOURCES) {
    try {
      var source = MONTHLY_SOURCES[sourceKey];
      var result = syncFromSourceHistorical_(source, sourceKey);
      results.sources.push({
        source: sourceKey,
        newUpdates: result.newUpdates,
        skippedUpdates: result.skippedUpdates,
        tabsProcessed: result.tabsProcessed
      });
      results.totalNew += result.newUpdates;
      results.totalSkipped += result.skippedUpdates;
      results.totalTabs += result.tabsProcessed || 0;
    } catch (error) {
      results.errors.push({
        source: sourceKey,
        error: error.message
      });
      Logger.log('Error syncing ' + sourceKey + ' (historical): ' + error);
    }
  }

  Logger.log('Monthly historical sync complete: ' + results.totalNew + ' new updates from ' +
             results.totalTabs + ' tabs, ' + results.totalSkipped + ' skipped, ' +
             results.errors.length + ' errors');

  return results;
}

/**
 * Sync ALL tabs from OPERA Monthly
 */
function syncMonthlyOPERAHistorical() {
  var source = MONTHLY_SOURCES['opera'];
  var result = syncFromSourceHistorical_(source, 'opera');

  Logger.log('OPERA historical sync complete: ' + result.newUpdates + ' new updates from ' +
             result.tabsProcessed + ' tabs, ' + result.skippedUpdates + ' skipped');

  return result;
}

/**
 * Sync ALL tabs from PBL Monthly
 */
function syncMonthlyPBLHistorical() {
  var source = MONTHLY_SOURCES['pbl'];
  var result = syncFromSourceHistorical_(source, 'pbl');

  Logger.log('PBL historical sync complete: ' + result.newUpdates + ' new updates from ' +
             result.tabsProcessed + ' tabs, ' + result.skippedUpdates + ' skipped');

  return result;
}
