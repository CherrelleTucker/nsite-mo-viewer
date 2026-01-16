# Reports

Auto-generated reports from database.

## Status

**Implemented** - v0.8.0

## Reports

| Report | Output | Audience | Status |
|--------|--------|----------|--------|
| QuickLook CSV | CSV file in Google Drive | Leadership | **Implemented** |
| Quad Chart Data | JSON for slide generation | Weekly meetings | **Implemented** |
| Detailed Milestone Report | Statistics and breakdown | Team | **Implemented** |
| Status Reports | PDF/HTML summary | Team | Planned |

## Files

| File | Purpose | Status |
|------|---------|--------|
| `quicklook-generator.gs` | Generate milestone CSV | **Implemented** |
| `quadchart-data.gs` | Format data for quad chart slides | **Implemented** |

## QuickLook CSV

**Generator:** `quicklook-generator.gs`

Columns:
- Solution
- Cycle
- Phase
- ATP DG (date + status)
- F2I DG (date + status)
- ORR (date + status)
- Closeout (date + status)
- ATP Memo, F2I Memo, ORR Memo, Closeout Memo

**Functions:**
- `generateQuickLookData(options)` - Get report data as JSON
- `generateQuickLookCSV(options)` - Get CSV string
- `exportQuickLookToGoogleDrive(options)` - Save to Drive
- `exportQuickLookWithEmail(options)` - Save and send notification
- `scheduledQuickLookExport()` - For time-based triggers
- `getQuickLookReport(options)` - Frontend API

## Quad Chart Data

**Generator:** `quadchart-data.gs`

Four Quadrants:
1. **Solutions Updated This Week** - Recent activity
2. **Upcoming Milestones** - Next 30 days (configurable)
3. **Open Action Items** - Extracted from status notes
4. **Key Decisions Needed** - Pending approvals and memos

**Functions:**
- `generateQuadChartData(options)` - Complete quad chart JSON
- `generateQuadChartText(options)` - Plain text for copy/paste
- `getMilestoneSummaryForSlides(options)` - Milestone-focused view
- `getQuadChartReport(options)` - Frontend API
- `getRecentUpdates(daysBack)` - Just updates quadrant
- `getUpcomingMilestonesReport(daysAhead)` - Just milestones quadrant

## Configuration

Add to MO-DB_Config for scheduled exports:
- `QUICKLOOK_FOLDER_ID` - Google Drive folder for exports
- `QUICKLOOK_NOTIFY_EMAIL` - Email for notifications

## UI

The Reports tab (`reports.html`) provides:
- Card-based interface for each report
- Preview before download
- Filter options (cycle, default solutions)
- Copy-to-clipboard for slides

## Development

See [INTEGRATION_PLAN.md](../INTEGRATION_PLAN.md) Phase 7 for additional automation features.
