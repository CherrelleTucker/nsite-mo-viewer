/**
 * Sync Menu
 * =========
 * Custom menu for MO-DB_Updates Google Sheet
 * Provides UI access to all sync operations
 *
 * REQUIRES: All sync-*.gs files
 *
 * @fileoverview Custom menu for update sync operations
 */

// ============================================================================
// MENU SETUP
// ============================================================================

/**
 * Create custom menu when sheet opens
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  // Weekly Current submenu
  var weeklyCurrentMenu = ui.createMenu('Weekly Current')
    .addItem('Sync All (Internal + SEP)', 'syncWeeklyCurrent')
    .addSeparator()
    .addItem('Internal Only', 'syncWeeklyInternal')
    .addItem('SEP Only', 'syncWeeklySEP');

  // Weekly Historical submenu
  var weeklyHistoricalMenu = ui.createMenu('Weekly Historical')
    .addItem('Internal Agenda (All Tabs)', 'syncWeeklyInternalHistorical')
    .addItem('SEP Agenda (All Tabs)', 'syncWeeklySEPHistorical');

  // Monthly Current submenu
  var monthlyCurrentMenu = ui.createMenu('Monthly Current')
    .addItem('Sync All (OPERA + PBL)', 'syncMonthlyCurrent')
    .addSeparator()
    .addItem('OPERA Only', 'syncMonthlyOPERA')
    .addItem('PBL Only', 'syncMonthlyPBL');

  // Monthly Historical submenu
  var monthlyHistoricalMenu = ui.createMenu('Monthly Historical')
    .addItem('Sync All (OPERA + PBL)', 'syncMonthlyHistorical')
    .addSeparator()
    .addItem('OPERA (All Tabs)', 'syncMonthlyOPERAHistorical')
    .addItem('PBL (All Tabs)', 'syncMonthlyPBLHistorical');

  // Main menu
  ui.createMenu('Update Sync')
    .addSubMenu(weeklyCurrentMenu)
    .addSubMenu(weeklyHistoricalMenu)
    .addSeparator()
    .addSubMenu(monthlyCurrentMenu)
    .addSubMenu(monthlyHistoricalMenu)
    .addSeparator()
    .addItem('Show Configuration Status', 'showConfigStatus')
    .addToUi();
}

/**
 * Show current configuration status
 */
function showConfigStatus() {
  var config = loadConfigFromSheet_();
  var status = [];

  status.push('=== WEEKLY SOURCES ===');
  for (var sourceKey in WEEKLY_SOURCES) {
    var source = WEEKLY_SOURCES[sourceKey];
    var docId = config[source.configKey] || '';
    var configured = docId ? '✓ Configured' : '✗ Not configured';
    status.push(source.displayName + ': ' + configured);
    if (docId) {
      status.push('  ID: ' + docId.substring(0, 25) + '...');
    }
  }

  status.push('');
  status.push('=== MONTHLY SOURCES ===');
  for (var sourceKey in MONTHLY_SOURCES) {
    var source = MONTHLY_SOURCES[sourceKey];
    var docId = config[source.configKey] || '';
    var configured = docId ? '✓ Configured' : '✗ Not configured';
    status.push(source.displayName + ': ' + configured);
    if (docId) {
      status.push('  ID: ' + docId.substring(0, 25) + '...');
    }
  }

  var ui = SpreadsheetApp.getUi();
  ui.alert('Configuration Status',
    status.join('\n') +
    '\n\n' +
    'To configure, add document IDs to MO-DB_Config:\n' +
    '- INTERNAL_AGENDA_ID\n' +
    '- SEP_AGENDA_ID\n' +
    '- OPERA_MONTHLY_ID (optional)\n' +
    '- PBL_MONTHLY_ID (optional)',
    ui.ButtonSet.OK);
}
