# Configuration

Configuration files and Script Properties documentation.

## Script Properties

The platform uses Google Apps Script Properties Service for configuration.

| Property | Description |
|----------|-------------|
| `INTERNAL_AGENDA_DOC_ID` | Google Doc ID for Internal Planning Notes |
| `SEP_AGENDA_DOC_ID` | Google Doc ID for SEP Meeting Notes |
| `COMMS_TRACKING_SHEET_ID` | Google Sheet ID for Story Tracking Workbook |
| `DATABASE_SHEET_ID` | Google Sheet ID for database cache |
| `LAST_SYNC_TIMESTAMP` | Timestamp of last successful sync |

## Setting Properties

```javascript
// Run once to configure
function setConfiguration() {
  var props = PropertiesService.getScriptProperties();

  props.setProperty('INTERNAL_AGENDA_DOC_ID', 'your-doc-id-here');
  props.setProperty('SEP_AGENDA_DOC_ID', 'your-doc-id-here');
  props.setProperty('COMMS_TRACKING_SHEET_ID', 'your-sheet-id-here');
  props.setProperty('DATABASE_SHEET_ID', 'your-sheet-id-here');
}
```

## Files

| File | Purpose |
|------|---------|
| `script-properties.md` | Detailed property documentation |

## Development

See [docs/SETUP_GUIDE.md](../docs/SETUP_GUIDE.md) for configuration instructions.
