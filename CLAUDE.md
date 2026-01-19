# Claude Code Instructions for MO-Viewer

## Development Rules

### About Page Maintenance

**RULE: When any page changes functionally, the About page (`deploy/about.html`) must be updated.**

The About page documents:
- Data sources for each page
- How data is stored and transformed
- Update mechanisms and frequency

When modifying any viewer page (Implementation-NSITE, SEP-NSITE, Actions-NSITE, Contacts, Reports, Schedule, Quick Update):
1. Update the corresponding section in `deploy/about.html`
2. If adding a new data source, update the Databases section
3. If changing data flow, update the data flow diagram for that page

### File Deployment

After making changes to files in `deploy/`, provide the user with the full file paths to copy:

```
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\deploy\<filename>
```

This is required because the Google Apps Script project is separate from the git repository.

### Commit Guidelines

- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commit messages
- Use descriptive commit messages summarizing changes
- Push to remote after committing unless user specifies otherwise

## Design System

### Icons
- **Use Material Icons** - NOT Feather icons
- Syntax: `<span class="material-icons">icon_name</span>`
- Icon names use underscores (e.g., `calendar_today`, `chevron_right`)
- Reference: https://fonts.google.com/icons

### CSS Variables
- Colors, spacing, and typography defined in `shared-styles.html`
- Page-specific accent colors (e.g., `--color-comms`, `--color-sep`)

### Components
- Modals use `.modal-overlay` and `.modal-content` classes
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`
- Cards: `.stat-card`, `.content-card`

## Project Structure

- `deploy/` - Files to copy to Google Apps Script Web App
- `scripts/` - Python import/processing scripts
- `database-files/` - Local Excel/CSV database files
- `docs/` - Documentation
- `.claude/` - Claude-specific reference files

## Key Files

| File | Purpose |
|------|---------|
| `deploy/Code.gs` | Main routing, config, PAGES validation |
| `deploy/index.html` | Page routing conditionals |
| `deploy/navigation.html` | Navigation tabs |
| `deploy/about.html` | Platform documentation (KEEP UPDATED) |
