# MO-Viewer Training Guide

**Version:** 2.5
**Date:** February 2026
**Platform Version:** 2.5.0
**Audience:** Comms Team, Implementation Team, SEP Team, Administrators, System Maintainers

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Getting Started](#2-getting-started)
3. [For Comms Team](#3-for-comms-team)
4. [For Implementation Team](#4-for-implementation-team)
5. [For SEP Team](#5-for-sep-team)
6. [For All Team Members](#6-for-all-team-members)
7. [Administrator Guide](#7-administrator-guide)
8. [Expanding the Platform](#8-expanding-the-platform)
9. [Maintaining the Platform](#9-maintaining-the-platform)
10. [Emergency Procedures](#10-emergency-procedures)
11. [Quick Reference](#11-quick-reference)
12. [Troubleshooting](#12-troubleshooting)
13. [For New Maintainers](#13-for-new-maintainers)

---

## 1. Platform Overview

### What is MO-Viewer?

MO-Viewer is the unified dashboard for the NSITE Management Office. It consolidates solution tracking, stakeholder engagement, and communications management into a single web application.

**Key Philosophy:** Weekly meeting notes remain the authoritative source of truth. The database is a queryable cache layer, not the master record.

### Platform Components

| Page | Purpose | Primary Users |
|------|---------|---------------|
| **Implementation-NSITE** | Solution lifecycle tracking | Implementation Team |
| **SEP-NSITE** | Stakeholder Engagement Pipeline | SEP Team |
| **Comms-NSITE** | Stories, events, key messages | Comms Team |
| **Contacts** | Stakeholder directory | All Teams |
| **Actions** | Action item tracking | All Teams |
| **Team** | Profiles, meetings, availability | All Teams |
| **Reports** | Analytics and exports | Leadership |
| **Schedule** | Milestone timeline | All Teams |
| **Quick Update** | Embedded agenda viewers | All Teams |

### Data at a Glance

- **48 solutions** across 6 assessment cycles (C1-C6)
- **423+ stakeholder contacts** across 47 solutions
- **43 agencies** with organizational hierarchy
- **56 email/meeting templates** for outreach
- **6 exportable reports** with methodology documentation
- **17 databases** (Google Sheets) with full schema documentation

---

## 2. Getting Started

### Accessing MO-Viewer

1. Navigate to the MO-Viewer URL (provided by your team lead)
2. Enter your **NASA email address**
3. Enter the **team passphrase**
4. Click **Sign In**

You will be redirected to the main dashboard. Sessions last 6 hours before requiring re-authentication.

### Navigation

The top navigation bar provides access to all sections:

```
[Implementation] [SEP] [Comms] [Contacts] [Actions] [Team] [Reports] [Schedule] [About]
```

Each page uses color-coded accents:
- **Implementation**: Green
- **SEP**: Blue
- **Comms**: Purple
- **Team**: Teal

### Global Features

| Feature | How to Access | Description |
|---------|---------------|-------------|
| Global search | `Ctrl + K` | Global search |
| Close modal/drawer | `Esc` | Close modal/drawer |
| Focus search (on pages with search) | `/` | Focus search (on pages with search) |
| Refresh Data | Click refresh icon (top right) | Reload current page data |
| Page Help | About page | Documentation for each page |

---

## 3. For Comms Team

### Your Home: Comms-NSITE

The Comms page is your central hub for finding content, managing assets, tracking events, and running the story pipeline.

**Tab Structure (v2.4.0+):**

| Tab | Primary Audience | Purpose |
|-----|------------------|---------|
| **Content** (default) | All MO team | Search & find approved content (blurbs, key messages, facts, quotes) |
| **Assets** | All MO team | Browse images, presentations, files with attribution |
| **Events** | All MO team | Event prep, guest lists |
| **Manage** | Comms team | Pipeline, coverage, calendar, priorities (sub-tabs) |

### Content Tab (Default View)

The Content tab is your search-first interface for finding approved messaging:

1. **Search bar** at top - search across all content types
2. **Solution dropdown** - filter content by solution
3. **Content cards** grouped by type (Key Messages, Blurbs, Facts, Quotes)
4. **Copy buttons** - one-click copy to clipboard

**Finding Content:**
1. Use the search bar for keyword search across all fields
2. Or select a solution from the dropdown to see all its content
3. Click any content card to see full details
4. Use the copy button to grab text for emails/documents

### Assets Tab

Browse and upload visual assets:

1. **Grid view** with thumbnail previews
2. **Filter by type** (images, presentations, PDFs, videos)
3. **Upload zone** - drag and drop files
4. **Detail modal** - view full metadata, usage rights, attribution

**Uploading Assets:**
1. Click "Upload Asset" or drag file to upload zone
2. Fill in metadata (solution, type, usage rights, attribution)
3. Click Save - file uploads to Google Drive automatically

### Events Tab

Track conferences, webinars, and outreach events:

1. **Event list** with upcoming events highlighted
2. **Guest list management** - track who's attending
3. **Prep reports** - generate briefing documents
4. **Quick filters** - by date range, type, solution

### Manage Tab (Comms Team)

Sub-tabs for workflow management:

- **Pipeline**, **Coverage**, **Calendar**, **Priorities**
Navigate: Comms → Manage → [Sub-tab]

---

## 4. For Implementation Team

### Your Home: Implementation-NSITE

Track solution lifecycle, milestones, and updates.

**Key Features:**
- Solution cards with current phase and status
- Milestone timeline visualization
- Updates feed from weekly meetings
- Stakeholder summary per solution

### Solution Cards

Each card shows:
- Solution name and cycle (C1-C6)
- Current lifecycle phase
- Key milestones (ATP, ORR, etc.)
- Recent updates count
- Stakeholder count

**Click a card** to see full details including:
- Complete update history
- All stakeholders with contact info
- Milestone dates and status
- Links to source documents

### Lifecycle Phases

```
Preformulation → Formulation → Implementation → Operations → Closeout
```

### Working with Updates

Updates sync automatically from weekly meeting notes. Each update shows:
- Date and source meeting
- Solution and sub-solution
- Full update text
- Link to original document

---

## 5. For SEP Team

### Your Home: SEP-NSITE

Manage the Stakeholder Engagement Pipeline from initial contact through sustained engagement.

**Key Features:**
- Pipeline visualization by milestone
- Contact engagement tracking
- Working session scheduling
- Touchpoint logging

### SEP Milestones

```
WS1 → TP4 → WS2 → TP5 → WS3 → TP6 → WS4 → TP7 → WS5 → TP8
```

### Pipeline View

Solutions flow through the pipeline:
1. **Kanban board** showing solutions at each milestone
2. **Drag and drop** to update milestone (or use edit modal)
3. **Color coding** for engagement health
4. **Quick filters** by cycle, phase, or status

### Logging Engagements

1. Find the contact in the pipeline or Contacts page
2. Click "Log Engagement"
3. Select type: Email, Meeting, Call, Event, Conference, Workshop
4. Add date, notes, and outcome
5. Save - engagement appears in contact's history

### SNWG Champions

Track agency champions and relationship owners:

| Status | Meaning |
|--------|---------|
| **Active** | Currently engaged champion for SNWG |
| **Prospective** | Potential future champion being cultivated |
| **Alumni** | Former champion, still friendly contact |
| **Inactive** | No longer engaged |
| **(empty)** | Not a champion |

**Setting Champion Status:**
1. Open contact detail (click contact name)
2. In "SNWG Champion" section, select status from dropdown
3. Select NSITE MO Connection (relationship owner)
4. Add notes about champion value/history
5. Changes save automatically

---

## 6. For All Team Members

### Contacts Page

The central directory for all stakeholder contacts.

**Features:**
- Search by name, email, organization
- Filter by solution, role, engagement level
- Filter by SNWG Champion status
- View engagement history per contact
- Export filtered lists

**Contact Roles:**
- Primary SME
- Secondary SME
- Survey Submitter
- Agency Lead
- Technical Contact

### Actions Page

Track action items across all teams:

- View open actions by owner or solution
- Filter by due date, priority, status
- Mark actions complete
- Add new actions with assignments

### Team Page

Team information and resources:

- Team member profiles and contact info
- Meeting schedule and agendas
- Shared documents and templates
- Parking lot for ideas and follow-ups

### Reports Page

Generate and export data:

- Historical updates report
- Stakeholder engagement summary
- Solution status report
- Custom date range filtering
- Export to CSV/Excel

---

## 7. Administrator Guide

### 7.1 User Access Management

**Add a new user:**
1. Open MO-DB_Access spreadsheet
2. Add row with user's email (lowercase, exact match)
3. No deployment needed - takes effect immediately

**Remove a user:**
1. Delete their row from MO-DB_Access
2. Their session expires within 6 hours (or immediately if they log out)

### 7.2 Configuration Changes

All configuration lives in MO-DB_Config. Common changes:

| Setting | Config Key | Example |
|---------|------------|---------|
| Team passphrase | SITE_PASSPHRASE | (don't share in docs) |
| Admin email | ADMIN_EMAIL | admin@example.gov |
| Session duration | SESSION_HOURS | 6 |

**To change:**
1. Open MO-DB_Config
2. Find the key in Column A
3. Update the value in Column B
4. Changes take effect on next page load

### 7.3 Database Management

**17 Databases:**

| Database | Config Key | Purpose |
|----------|------------|---------|
| MO-DB_Config | (Script Property) | Configuration key-value pairs, sheet IDs |
| MO-DB_Access | ACCESS_SHEET_ID | User whitelist for authentication |
| MO-DB_Solutions | SOLUTIONS_SHEET_ID | Solution master data (solution_id is primary key) |
| MO-DB_Contacts | CONTACTS_SHEET_ID | Stakeholder contacts (solution_id links to Solutions) |
| MO-DB_Updates | UPDATES_SHEET_ID | Solution updates by year (2026, 2025, 2024, Archive) |
| MO-DB_Engagements | ENGAGEMENTS_SHEET_ID | Contact engagement records |
| MO-DB_Agencies | AGENCIES_SHEET_ID | Agency/organization master data |
| MO-DB_Outreach | OUTREACH_SHEET_ID | Events, stories, comms activities |
| MO-DB_Actions | ACTIONS_SHEET_ID | Action items and tasks |
| MO-DB_Team | TEAM_SHEET_ID | Team member information |
| MO-DB_Meetings | MEETINGS_SHEET_ID | Recurring meeting schedule |
| MO-DB_Milestones | MILESTONES_SHEET_ID | Milestone definitions |
| MO-DB_Templates | TEMPLATES_SHEET_ID | Email/meeting templates for SEP & Comms |
| MO-DB_Parking | PARKING_LOT_SHEET_ID | Ideas, topics, follow-ups capture |
| MO-DB_CommsAssets | COMMS_ASSETS_SHEET_ID | Comms content library (blurbs, quotes, facts) |
| MO-DB_CommsFiles | COMMS_ASSETS_SHEET_ID | Images, presentations, graphics |
| MO-DB_Presentations | PRESENTATIONS_SHEET_ID | Monthly presentation data |

**Important Rules:**
1. Column names in code MUST match database headers exactly (case-sensitive)
2. All text columns should be formatted as "Plain Text" in Google Sheets
3. Dates should use YYYY-MM-DD format
4. Never delete columns - only add or rename with code update

---

## 8. Expanding the Platform

### 8.1 Adding New Features

Before coding, consider:
1. Which page does this belong on?
2. What data does it need? (existing or new database?)
3. Who will use it?
4. Does it follow existing patterns?

### 8.2 Adding New Pages

**Files to create/modify:**
1. `deploy/newpage.html` - Page content and JavaScript
2. `deploy/Code.gs` - Add to PAGES object
3. `deploy/navigation.html` - Add tab
4. `deploy/index.html` - Add routing case

**JavaScript Pattern (IIFE Module):**
```javascript
var NewPage = (function() {
  var state = {
    data: [],
    filters: {}
  };

  return {
    init: function() {
      this.loadData();
      this.bindEvents();
    },

    loadData: function() {
      google.script.run
        .withSuccessHandler(this.onDataLoaded.bind(this))
        .withFailureHandler(handleError)
        .getNewPageData();
    },

    onDataLoaded: function(data) {
      state.data = data;
      this.render();
    },

    render: function() {
      // ... update DOM
    },

    bindEvents: function() {
      // ... attach event listeners
    }
  };
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  NewPage.init();
});
```

**CSS Pattern (Page Accent):**
```css
.new-page-viewer {
  --page-accent: var(--color-newpage);
  max-width: 1600px;
  margin: 0 auto;
}
```

### 8.3 Adding New Database Tables

1. Create new Google Sheet with headers
2. Add sheet ID to MO-DB_Config with descriptive key name
3. Create `library/newdata-api.gs` with query functions
4. Create `deploy/newdata-api.gs` wrapper
5. Update `docs/DATA_SCHEMA.md`
6. Update this guide's database count and list

---

## 9. Maintaining the Platform

This section provides everything needed to keep MO-Viewer running smoothly. For complete technical details, see `CLAUDE.md` in the repository root.

### 9.1 Regular Maintenance Schedule

| Task | Frequency | Steps | Priority |
|------|-----------|-------|----------|
| Verify weekly sync | Every Monday | Check MO-DB_Updates for latest Internal Planning date | High |
| Verify monthly sync | First week of month | Check MO-DB_Updates for OPERA/PBL dates | High |
| Review error logs | Weekly | Apps Script → Executions → Filter: Failed | High |
| Check sync triggers | Monthly | Apps Script → Triggers → Verify all enabled | Medium |
| Database backup | Quarterly | Download all MO-DB_* sheets as Excel | Medium |
| Review bug tracker | Weekly | `docs/BUG_TRACKER.md` | Medium |
| Update documentation | After any change | CHANGELOG.md, about.html, this guide | Required |

### 9.2 Understanding the Sync Scripts

The platform extracts updates from meeting notes using sync scripts. These run in the **MO-DB_Updates** container-bound script.

**Sync Script Architecture:**
```
Weekly Meeting Notes (Google Doc)
         │
         ▼
    sync-common.gs           ← Shared parsing functions
         │
    ┌────┴────┐
    ▼         ▼
sync-weekly-  sync-weekly-   ← Current year or historical
current.gs    historical.gs
         │
         ▼
   MO-DB_Updates             ← Year-based tabs (2026, 2025, Archive)
```

**Script Files:**

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `sync-common.gs` | Shared utilities (extractSolutionId_, parseMeetingDate_, etc.) | Never directly - used by other scripts |
| `sync-weekly-current.gs` | Extract Internal & SEP updates from current year tab | Weekly trigger after meetings |
| `sync-weekly-internal-historical.gs` | Backfill Internal updates from all year tabs | Once during setup |
| `sync-weekly-sep-historical.gs` | Backfill SEP updates from all year tabs | Once during setup |
| `sync-monthly-current.gs` | Extract OPERA & PBL updates from current month | Monthly trigger |
| `sync-monthly-historical.gs` | Backfill OPERA/PBL from all months | Once during setup |
| `sync-menu.gs` | Adds custom menu to spreadsheet UI | Automatic |

**Expected Document Format:**

Updates in meeting notes must use this format for sync to capture them:
```
● Solution Name (Provider) [solution_id]
  ○ Sub-solution [sub_solution_id]
    ■ 🆕 This update text will be captured
    ■ 🆕 Another update
```

- `[solution_id]` in square brackets links to MO-DB_Solutions.solution_id
- 🆕 emoji marks new updates (sync scripts look for this)
- Nested bullets are included in the update text

**Setting Up Triggers:**

1. Open MO-DB_Updates in Apps Script editor
2. Click Triggers (clock icon) in left sidebar
3. Add Trigger:
   - Function: `syncWeeklyCurrent` (or appropriate function)
   - Deployment: Head
   - Event source: Time-driven
   - Time: Weekly, Monday, 9am-10am
4. Repeat for monthly sync with monthly trigger

### 9.3 Deployment Procedures

**For Library Changes (`library/*.gs`):**
1. Open MO-APIs Library project in Apps Script editor
2. Select the file to update
3. Replace content with updated code from local `library/` folder
4. Save (Ctrl+S)
5. If using versioned library: Deploy → Manage deployments → Create version
6. Note: Web app uses HEAD by default, so changes are immediate

**For Web App Changes (`deploy/*`):**
1. Open NSITE-MO-Viewer project in Apps Script editor
2. Select file(s) to update
3. Replace content with updated code from local `deploy/` folder
4. Save (Ctrl+S)
5. Deploy → Manage deployments → Edit → Version: New version → Deploy
6. Test deployment URL immediately

**Deployment Order (CRITICAL):**
When changes span both library and web app:
1. **ALWAYS deploy library first** (MO-APIs)
2. **THEN deploy web app** (NSITE-MO-Viewer)
3. If reversed, web app may call functions that don't exist yet

**Verification Checklist:**
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Test specific changed functionality
- [ ] Test one unrelated function (ensure nothing broke)
- [ ] Check Apps Script execution logs for errors
- [ ] Ask another team member to test (fresh cache)

### 9.4 Database Management

**17 Databases Overview:**

| Database | Config Key | Purpose | Update Frequency |
|----------|------------|---------|------------------|
| MO-DB_Config | (Script Property) | Configuration key-value pairs, sheet IDs | Rarely |
| MO-DB_Access | ACCESS_SHEET_ID | User whitelist for authentication | When team changes |
| MO-DB_Solutions | SOLUTIONS_SHEET_ID | Solution master data (solution_id is primary key) | Quarterly |
| MO-DB_Contacts | CONTACTS_SHEET_ID | Stakeholder contacts (solution_id links to Solutions) | Weekly |
| MO-DB_Updates | UPDATES_SHEET_ID | Solution updates by year (2026, 2025, 2024, Archive) | Auto (sync) |
| MO-DB_Engagements | ENGAGEMENTS_SHEET_ID | Contact engagement records | Auto (user logs) |
| MO-DB_Agencies | AGENCIES_SHEET_ID | Agency/organization master data | Rarely |
| MO-DB_Outreach | OUTREACH_SHEET_ID | Events, stories, comms activities | Weekly |
| MO-DB_Actions | ACTIONS_SHEET_ID | Action items and tasks | Weekly |
| MO-DB_Team | TEAM_SHEET_ID | Team member information | When team changes |
| MO-DB_Meetings | MEETINGS_SHEET_ID | Recurring meeting schedule | Monthly |
| MO-DB_Milestones | MILESTONES_SHEET_ID | Milestone definitions | Per cycle |
| MO-DB_Templates | TEMPLATES_SHEET_ID | Email/meeting templates for SEP & Comms | As needed |
| MO-DB_Parking | PARKING_LOT_SHEET_ID | Ideas, topics, follow-ups capture | Weekly |
| MO-DB_CommsAssets | COMMS_ASSETS_SHEET_ID | Comms content library (blurbs, quotes, facts) | Weekly |
| MO-DB_CommsFiles | COMMS_ASSETS_SHEET_ID | Images, presentations, graphics | As created |
| MO-DB_Presentations | PRESENTATIONS_SHEET_ID | Monthly presentation data | Monthly |

**Column Name Rules (CRITICAL):**
- Column names in code MUST match database headers EXACTLY
- Case-sensitive: `solution_id` ≠ `Solution_ID`
- Check `docs/DATA_SCHEMA.md` for official column names
- When adding columns, add to Sheet first, then update code

**Formatting Requirements:**
- All text columns: Format → Number → Plain Text
- Date columns: YYYY-MM-DD format (e.g., 2026-02-04)
- Never use Google Sheets auto-formatting for IDs or codes

### 9.5 Monitoring and Logs

**Check Execution Logs:**
1. Apps Script → Executions (left sidebar)
2. Filter by: Failed (shows only errors)
3. Click execution to see:
   - Error message
   - Stack trace
   - Execution time
   - Function name

**Common Log Patterns:**
```
"Cannot read property 'X' of undefined"  → Missing data or column
"Service error: Spreadsheets"            → Sheet access issue
"Exceeded maximum execution time"        → Query too large
"Response size limit exceeded"           → Need to add limits
```

**Usage Dashboard:**
1. Apps Script → Dashboard
2. View: Executions over time
3. Look for:
   - Unusual spikes (possible loops)
   - Consistent failures (systematic issue)
   - Slow execution times (optimization needed)

### 9.6 Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Null response from API | Response >5MB | Add limits/truncation to query |
| Missing data on page | Column name mismatch | Verify exact column name in Sheet header |
| User can't log in | Not in whitelist | Add email to MO-DB_Access |
| Blank page | SPA routing broken | Check `PAGES` object in Code.gs |
| Stale data after edit | Client cache | Click refresh icon or hard refresh |
| "Not a function" error | Library not synced | Redeploy MO-APIs Library, clear cache |
| Sync didn't capture updates | Missing 🆕 emoji | Add emoji to new updates in doc |
| Sync shows wrong solution | Malformed [solution_id] | Fix bracket format in meeting doc |
| Modal won't close | JavaScript error | Hard refresh, check console |
| Toast not visible | CSS z-index | Ensure toast z-index > modal z-index |

### 9.7 File Locations and Structure

**Local Repository:**
```
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\
```

**Repository Structure:**
```
nsite-mo-viewer/
├── deploy/              → Copy to NSITE-MO-Viewer (Apps Script)
│   ├── Code.gs          → Main routing, auth, session
│   ├── index.html       → SPA router, shared utilities
│   ├── navigation.html  → Tab navigation component
│   ├── *-api.gs         → Thin wrappers to library
│   ├── *.html           → Page viewers
│   └── shared-*.html    → Shared CSS/components
│
├── library/             → Copy to MO-APIs Library (Apps Script)
│   ├── config-helpers.gs → Core utilities (getConfigValue, etc.)
│   └── *-api.gs         → Full API implementations
│
├── docs/                → Documentation
│   ├── BUG_TRACKER.md   → Known issues, priorities
│   ├── DATA_SCHEMA.md   → Database column definitions
│   └── MO-VIEWER_TRAINING_GUIDE.md  → This file
│
├── database-files/      → Local database backups (CSV/Excel)
├── scripts/             → Python utilities
├── CLAUDE.md            → AI development instructions
├── CHANGELOG.md         → Version history
└── NEXT_STEPS.md        → Current development status
```

**Google Apps Script Projects:**

| Project | Purpose |
|---------|---------|
| MO-APIs Library | Shared API code |
| NSITE-MO-Viewer | Web app |
| MO-DB_Updates | Sync scripts (bound to Updates spreadsheet) |

---

## 10. Emergency Procedures

### 10.1 The Platform is Down

**Symptoms:** Users see error page, blank screen, or "Sorry, unable to open the file"

**Immediate Steps:**
1. **Check Google Status:** [status.cloud.google.com](https://status.cloud.google.com) - Apps Script outages affect everyone
2. **Check Deployment:** Apps Script → NSITE-MO-Viewer → Deploy → Manage deployments
   - Is there an active deployment?
   - When was last deployment?
3. **Check Execution Logs:** Apps Script → Executions → Filter: Failed
   - Look for recent errors
   - Note error messages

**If Google is Up:**
1. Try redeploying: Deploy → Manage deployments → Edit → New version → Deploy
2. Check MO-DB_Config is accessible (Script Properties intact)
3. Verify library link: Project Settings → Libraries → MO-APIs shows valid reference

### 10.2 Data is Wrong or Missing

**Symptoms:** Page shows incorrect data, missing solutions, wrong counts

**Diagnosis:**
1. Check source database directly (open Google Sheet)
2. Compare what you see in Sheet vs what app shows
3. If Sheet is correct but app is wrong: caching issue
4. If Sheet is wrong: data entry or sync issue

**Fixes:**
- **Caching issue:** User clicks refresh icon, or hard refresh browser
- **Sync issue:** Check sync script logs, verify document format
- **Data entry issue:** Fix directly in Google Sheet

### 10.3 User Can't Access

**Symptoms:** User sees "Access Denied" or can't log in

**Quick Check:**
1. Is their email in MO-DB_Access whitelist?
2. Did they use correct passphrase?
3. Is the passphrase correct in MO-DB_Config?

**Fixes:**
- Add email to MO-DB_Access (exact match, lowercase)
- Verify SITE_PASSPHRASE in MO-DB_Config
- Check for typos in email address

### 10.4 Sync Script Failing

**Symptoms:** MO-DB_Updates not updating, sync errors in logs

**Diagnosis:**
1. Open MO-DB_Updates
2. Apps Script editor → Executions
3. Find failed sync execution
4. Read error message

**Common Causes:**
- Meeting document moved or deleted
- Document format changed (no 🆕 emojis)
- Permission removed from service account
- Solution ID format changed in document

**Fixes:**
- Verify INTERNAL_MEETING_DOC_ID and SEP_MEETING_DOC_ID in config
- Ensure service account has view access to documents
- Check document format matches expected pattern
- Run sync manually to test: Extensions → Apps Script → Run function

### 10.5 Rollback Procedure

**If a bad deployment breaks the app:**

1. **Identify last good version:**
   - Apps Script → Deploy → Manage deployments
   - Note version numbers and dates

2. **Restore previous code:**
   - Option A: Git checkout previous commit, redeploy
   - Option B: Apps Script → File → Version history → Restore

3. **Redeploy:**
   - Deploy → Manage deployments → Edit → Select older version
   - Or create new deployment from restored code

**Prevention:** Always commit working code to git before making changes

### 10.6 Critical Contacts

| Role | Responsibility | Contact |
|------|----------------|---------|
| Platform Admin | Deployments, access, config | (Update with actual contact) |
| Database Admin | Data integrity, backups | (Update with actual contact) |
| IT Support | Google Workspace issues | NASA IT helpdesk |

---

## 11. Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Global search |
| `Esc` | Close modal/drawer |
| `/` | Focus search (on pages with search) |

### URL Parameters

| Parameter | Example | Purpose |
|-----------|---------|---------|
| `?page=implementation` | Direct link | Direct to Implementation |
| `?page=sep` | Direct link | Direct to SEP |
| `?page=comms` | Direct link | Direct to Comms |

### Solution Cycles

| Cycle | Year | Solutions |
|-------|------|-----------|
| C1 | 2016 | ~8 |
| C2 | 2018 | ~8 |
| C3 | 2020 | ~8 |
| C4 | 2022 | ~8 |
| C5 | 2024 | ~8 |
| C6 | 2026 | ~8 |

### Lifecycle Phases

```
Preformulation → Formulation → Implementation → Operations → Closeout
```

### SEP Milestones

```
WS1 → TP4 → WS2 → TP5 → WS3 → TP6 → WS4 → TP7 → WS5 → TP8
```

### Contact Roles

- Primary SME
- Secondary SME
- Survey Submitter
- Agency Lead
- Technical Contact

### Engagement Types

- Email
- Meeting
- Call
- Event
- Conference
- Workshop

### SNWG Champion Statuses

- **Active**: Currently engaged champion for SNWG
- **Prospective**: Potential future champion being cultivated
- **Alumni**: Former champion, still friendly contact
- **Inactive**: No longer engaged
- **(empty)**: Not a champion

---

## 12. Troubleshooting

### Common Error Messages

#### "Failed to load data"

1. Check internet connection
2. Hard refresh browser (Ctrl+Shift+R)
3. Check if Google Sheets are accessible
4. Review Apps Script execution logs

**Technical cause:** Usually network issue or Apps Script timeout.

#### "Session expired"

1. Re-enter email and passphrase
2. Sessions last 6 hours
3. If persistent, check MO-DB_Access whitelist

**Technical cause:** Session token expired or cookie cleared.

#### "No stakeholders found"

1. Verify contacts exist in MO-DB_Contacts
2. Check `solution_id` matches between databases
3. Column names are case-sensitive

**Technical cause:** Query returns empty due to ID mismatch or missing data.

#### "Export failed"

1. Check popup blocker settings
2. Verify Google Drive permissions
3. Try again (may be rate limiting)

**Technical cause:** Google API quota or permission issue.

#### "Not a function" or "undefined"

1. Library may need redeployment
2. Check wrapper function exists in deploy/*-api.gs
3. Verify function name matches exactly

**Technical cause:** Code mismatch between library and wrapper.

### UI Issues

#### Modal won't close

1. Click X button
2. Press Esc key
3. Click outside modal area
4. Hard refresh if stuck

**Technical cause:** JavaScript error preventing event handler.

#### Data not updating after save

1. Click refresh icon in navigation bar
2. Hard refresh browser (Ctrl+Shift+R)
3. Check if save actually succeeded (look for success toast)
4. Verify in source database directly

**Technical cause:** Client-side cache not invalidated after save.

#### Page loads blank

1. Check browser console for errors (F12 → Console)
2. Verify page exists in `PAGES` object in Code.gs
3. Check SPA routing in index.html

**Technical cause:** Routing error or missing page definition.

#### Toast notifications not visible

1. Ensure browser window is focused
2. Check if modal is open (toast appears behind)
3. Scroll to bottom of page (may be positioned off-screen)

**Technical cause:** CSS z-index or positioning issue.

### Sync Script Issues

#### Updates not appearing in database

1. Check source document has 🆕 emoji markers
2. Verify solution ID format: `[solution_id]` with brackets
3. Check sync trigger is enabled and ran recently
4. Review execution logs for errors

#### Sync captures wrong solution

1. Check solution ID in brackets matches MO-DB_Solutions.solution_id
2. Ensure only one solution ID per bullet point
3. Verify document structure hasn't changed

#### "Cannot find document" error

1. Verify document ID in MO-DB_Config is correct
2. Check document hasn't been moved or deleted
3. Ensure script has view permission on document

### Database Issues

#### Column shows blank even though data exists

1. Check column name in code matches Sheet header exactly
2. Verify no extra spaces in column header
3. Check column format is "Plain Text" not Date/Number

#### Changes not saving

1. Check for validation errors (required fields)
2. Verify user has edit permission on target Sheet
3. Review execution logs for write errors

---

## 13. For New Maintainers

Welcome! This section will help you understand the system and take over maintenance responsibilities.

### First Week Checklist

- [ ] Get access to all Google Apps Script projects (MO-APIs Library, NSITE-MO-Viewer, MO-DB_Updates)
- [ ] Get access to all MO-DB_* Google Sheets (17 databases)
- [ ] Clone the GitHub repository
- [ ] Read `CLAUDE.md` in full (development instructions)
- [ ] Read `docs/DATA_SCHEMA.md` (database structure)
- [ ] Read `docs/BUG_TRACKER.md` (known issues)
- [ ] Test the sync scripts manually
- [ ] Make a small change and deploy it (low-risk)
- [ ] Review recent entries in `CHANGELOG.md`

### Understanding the Architecture

**The "Thin Wrapper" Pattern:**

```
User Browser
     │
     ▼
NSITE-MO-Viewer (Web App)
     │
     ├── Code.gs         → Routing, auth, session
     ├── *-api.gs        → Thin wrappers (just call library)
     └── *.html          → UI pages
     │
     ▼
MO-APIs Library
     │
     └── *-api.gs        → Full implementations
     │
     ▼
MO-DB_* Sheets
     │
     └── Data storage
```

**Why this pattern?**
- Library code is shared (could be used by other projects)
- Wrappers keep web app small and simple
- Changes to logic only require library deployment
- Web app changes only needed for new functions

### Key Files to Know

| File | What It Does | When to Edit |
|------|--------------|--------------|
| `library/config-helpers.gs` | Core utilities (getConfigValue, database access) | Adding new databases |
| `library/solutions-api.gs` | Solution queries | Solution-related features |
| `library/contacts-api.gs` | Contact queries | Contact-related features |
| `deploy/Code.gs` | Auth, routing, session | Access control, new pages |
| `deploy/index.html` | SPA routing, shared JS utilities | Global features, caching |
| `deploy/navigation.html` | Tab bar | Adding new pages |
| `deploy/shared-page-styles.html` | Common CSS | Styling patterns |

### Making Changes Safely

**Always follow this order:**

1. **Read** the existing code thoroughly
2. **Test** current functionality works
3. **Make** small, incremental changes
4. **Test** after each small change
5. **Commit** to git with descriptive message
6. **Deploy** library first, then web app
7. **Verify** in browser with hard refresh
8. **Document** in CHANGELOG.md

**Red Flags (Stop and Ask):**

- Changing anything in `config-helpers.gs`
- Modifying authentication in `Code.gs`
- Renaming database columns
- Deleting any function (may be called elsewhere)
- Changes affecting more than 3 files

### Common Maintenance Tasks

**Add a new user:**
1. Open MO-DB_Access
2. Add row with user's email (lowercase)
3. No deployment needed

**Add a new database field:**
1. Add column to Google Sheet (Plain Text format)
2. Add to `docs/DATA_SCHEMA.md`
3. Add to library API file (queries, create, update)
4. Add wrapper if new function
5. Add to HTML form/display
6. Deploy library, then web app
7. Update CHANGELOG.md
8. Update `docs/guide-data.yaml` if field affects stats/lists
9. Run `python scripts/generate_training_guide.py`

**Fix a bug:**
1. Reproduce the bug
2. Check `docs/BUG_TRACKER.md` (may be known)
3. Find the source in code
4. Fix and test
5. Deploy
6. Update BUG_TRACKER.md if it was listed

**Update branding/config:**
1. Change value in MO-DB_Config
2. No deployment needed (reads on each request)

### Testing Without Breaking Production

**Test in Apps Script Editor:**
```javascript
function testMyFunction() {
  var result = myFunction('test-param');
  Logger.log(JSON.stringify(result, null, 2));
}
```
Run function → View → Logs

**Test deployment:**
- Make changes
- Save (does NOT affect production yet)
- Deploy → Test deployments → Use test URL
- Verify works
- Deploy → Manage deployments → Publish to production

### Getting Help

**Documentation:**
- `CLAUDE.md` - Development rules and patterns
- `docs/DATA_SCHEMA.md` - Database structure
- `docs/BUG_TRACKER.md` - Known issues
- About page in MO-Viewer - User documentation

**Code Questions:**
- Search codebase for similar patterns
- Check CHANGELOG.md for how features were added
- Review git history for context

**Stuck?**
- Review Apps Script execution logs
- Check browser console (F12) in production
- Search error message in Google
- Review Apps Script documentation

### Handoff Checklist (For Departing Maintainer)

Before leaving, ensure:

- [ ] All credentials/access documented
- [ ] Recent changes are in git with clear commits
- [ ] CHANGELOG.md is up to date
- [ ] BUG_TRACKER.md lists all known issues
- [ ] Sync triggers are verified working
- [ ] Database backup exists
- [ ] New maintainer has tested deployment process

---

## Getting Help

- **Platform Documentation**: About page in MO-Viewer
- **Technical Reference**: `CLAUDE.md` in repository
- **Database Schema**: `docs/DATA_SCHEMA.md`
- **Known Issues**: `docs/BUG_TRACKER.md`
- **Access Requests**: Contact Platform Administrator
- **Bug Reports**: Add to `docs/BUG_TRACKER.md`

---

*Document Version: 2.5 | Last Updated: February 4, 2026*