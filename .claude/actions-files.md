# Actions-NSITE Files to Copy to Google Apps Script

## Web App (MO-Viewer project)

### actions.html
`C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\deploy\actions.html`

### actions-api.gs
`C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\deploy\actions-api.gs`

---

## Database Container (MO-DB_Actions spreadsheet)

### sync-actions.gs
`C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\deploy\sync-actions.gs`

---

## Setup After Copying

1. **Web App**: Redeploy after copying actions.html and actions-api.gs
2. **Database**: Set up time-based trigger for `syncAllActions()` to pull from agendas periodically
