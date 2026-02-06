/**
 * ROSES Gap Analysis API - Deploy Wrapper
 * ========================================
 * Thin wrappers for the ROSES cross-cutting gap analysis report.
 * Full implementation in: extensions/quicklook-reports/roses-gap-analysis.gs
 *
 * Note: Since extension files are deployed directly into the web app project
 * (not via the MoApi library), these wrappers provide the google.script.run
 * callable entry points and ensure safe serialization for the 5MB response limit.
 *
 * Functions:
 * - getRosesGapReport(options) - Preview data for reports.html
 * - exportRosesGapToSheet(options) - Export to new Google Sheets workbook
 */

// getRosesGapReport and exportRosesGapToSheet are defined in
// roses-gap-analysis.gs and are directly available in the deploy project.
// No additional wrappers needed since the extension file is copied to deploy/.
//
// If the extension is NOT deployed directly, uncomment these:
//
// function getRosesGapReport(options) {
//   return JSON.parse(JSON.stringify(generateRosesGapReport(options || {})));
// }
//
// function exportRosesGapToSheet(options) {
//   return exportRosesGapToSheet(options || {});
// }
