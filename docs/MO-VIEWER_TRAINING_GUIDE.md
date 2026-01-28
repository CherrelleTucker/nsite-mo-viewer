# MO-Viewer Training Guide

**Version:** 1.0
**Date:** January 28, 2026
**Platform Version:** 2.1.5
**Audience:** Comms Team, Implementation Team, SEP Team, Administrators

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
10. [Quick Reference](#10-quick-reference)
11. [Troubleshooting](#11-troubleshooting)

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
| Global Search | `Ctrl + K` | Search solutions, contacts, actions |
| Refresh Data | Click refresh icon (top right) | Reload current page data |
| Page Help | About page | Documentation for each page |

---

## 3. For Comms Team

### Your Home: Comms-NSITE

The Comms page is your central hub for managing stories, events, and messaging.

### 3.1 Managing Stories

**View Stories:**
1. Go to **Comms** → **Stories** tab
2. Stories are organized by pipeline status: Idea → Draft → Review → Submitted → Published
3. Use filters to narrow by solution, content type, or status

**Add a New Story:**
1. Click the **"+"** button
2. Fill in required fields:
   - Title
   - Solution(s) - select from dropdown
   - Content Type (story, web_content, social_media, nugget, key_date, science_advancement)
   - Status
3. Optional: Add admin priorities alignment
4. Click **Save**

**Edit a Story:**
1. Click any story card
2. Modify fields as needed
3. Click **Save**

**Story Status Workflow:**
```
Idea → Draft → Review → Submitted → Published
```

### 3.2 Managing Events

**View Events:**
1. **Comms** → **Events** tab
2. Events display with status badges:
   - Gray = Potential
   - Blue = Considering
   - Green = Confirmed
   - Muted = Attended

**Add a New Event:**
1. Click **"Add Event"** button
2. Fill in: Name, Type, Start Date, End Date, Location
3. Click **Save**

**Generate Prep Report:**
1. Click an event card
2. Click **"Generate Prep Report"**
3. View guest profiles, agencies represented, conversation starters
4. Click **"Export to Doc"** to create a shareable Google Doc

### 3.3 Key Messages

**Find Solution Key Messages:**
1. **Comms** → **Messages** tab
2. Search by solution name or browse cards
3. Each card shows:
   - Key messages
   - Thematic areas
   - Focus type
   - Public links (if available)

### 3.4 Coverage Monitoring

**Check Communications Coverage:**
1. **Comms** → **Coverage** tab
2. Solutions color-coded by urgency:
   - **Red**: No coverage ever OR >180 days since last story
   - **Orange**: >90 days since last story
   - **Green**: Recently covered

**Calendar View Alerts:**
- The Calendar view sidebar shows "Communications Due" alerts
- Click **"+ Story"** to quickly create a story for any solution

### 3.5 Admin Priorities

**View Stories by Priority:**
1. **Comms** → **Priorities** tab
2. Stories grouped by Biden-Harris priorities:
   - Partnerships
   - Citizen Science
   - AI Innovation
   - Science Integrity
   - Efficiency

---

## 4. For Implementation Team

### Your Home: Implementation-NSITE

The Implementation page displays all solutions as interactive cards with filtering and search capabilities.

### 4.1 Solution Dashboard

**View Solutions:**
1. Go to **Implementation** page
2. All solutions display as cards with key info:
   - Name and cycle badge
   - Lifecycle phase
   - Assigned DAAC
   - Recent activity indicators

**Filter Solutions:**
- **By Cycle**: C1, C2, C3, C4, C5, C6
- **By Phase**: Preformulation, Formulation, Implementation, Operations, Closeout
- **Search**: Type any keyword to filter

**Stats Panel (Top of Page):**
- Total Solutions
- Active Projects
- Action Items
- Deep Dives

### 4.2 Solution Details

**Access Full Details:**
1. Click any solution card
2. Modal opens with comprehensive information

**Information Available:**
| Section | Content |
|---------|---------|
| **Identity** | Official name, alternate names, cycle |
| **Status** | Lifecycle phase, funding status |
| **Team** | Solution Lead, RA Rep, EA Advocate |
| **Earthdata** | Purpose, focus area, public links |
| **Documents** | Project Plan, IPA, ICD, Risk Register, etc. |
| **Milestones** | ATP, F2I, ORR, Closeout dates |
| **Recent Updates** | Excerpts from meeting notes |
| **Stakeholders** | Linked contacts with roles |

**Document Links:**
- Click any document link to open in new tab
- Empty fields indicate document not yet available
- Documents stored in Google Drive

### 4.3 Reading Updates

**Where Updates Come From:**
Updates are automatically extracted from weekly meeting notes when marked with the 🆕 emoji.

**Viewing Updates:**
1. Solution card → scroll to "Recent Updates"
2. Updates show:
   - Date (linked to source document)
   - Meeting source (Internal, SEP, OPERA, PBL)
   - Update text with bullet points

**Update Limits:**
- Card view: 10 recent + 10 extended updates
- Text truncated to 300 characters for performance
- Full text available in source documents

### 4.4 Milestones & Schedule

**Quick Milestone Check:**
1. Solution card → Milestones section
2. Decision gates displayed: ATP, F2I, ORR, Closeout

**Timeline View:**
1. Go to **Schedule** page
2. Toggle between Timeline and Gantt views
3. Filter by cycle or search
4. Click any milestone for details

**Milestone Types:**
- **ATP**: Authority to Proceed
- **F2I**: Formulation to Implementation
- **ORR**: Operational Readiness Review
- **Closeout**: Project completion

### 4.5 Stakeholder Lists

**View Solution Stakeholders:**
1. Solution card → Stakeholders section
2. If URL provided: Click "View List" to open external stakeholder document
3. Contact count and role breakdown displayed

**Link to Contacts:**
- Click stakeholder names to view in Contacts page
- Filter Contacts page by solution to see all stakeholders

---

## 5. For SEP Team

### Your Home: SEP-NSITE

The SEP page manages the Stakeholder Engagement Pipeline with multiple views for tracking relationships.

### 5.1 Dashboard View

**Stats Row (Top):**
- Engagements This Month
- Contacts Engaged
- Solutions Engaged
- Activity Level (heat indicator)

**Key Panels:**
- **Recent Engagements**: Latest logged interactions
- **Needs Attention**: Contacts/solutions requiring follow-up
- **Milestone Summary**: Pipeline progress cards

**Overview Table:**
- Collapsible summary of all solutions
- Columns: Solution, Current Milestone, Last Engagement, Comms Due
- Click any row to open solution detail

### 5.2 Pipeline View

**Understanding the Pipeline:**
```
WS1 → TP4 → WS2 → TP5 → WS3 → TP6 → WS4 → TP7 → WS5 → TP8
```
- **WS** = Working Session
- **TP** = Touchpoint

**Using Pipeline View:**
1. **SEP** → **Pipeline** tab
2. Solutions displayed in columns by current milestone
3. Click any solution card for details
4. Filter by cycle using dropdown

### 5.3 Managing Stakeholders

**View Stakeholders for a Solution:**
1. Click solution card → Stakeholders section
2. Stakeholders listed with:
   - Name and title
   - Agency/organization
   - Role (Primary SME, Secondary SME, etc.)
   - Email link

**Email All Stakeholders:**
1. Solution detail → Stakeholders section
2. Click **"Email All"** button
3. Email composer opens with all recipients pre-filled
4. Select template or compose custom message

**Add Individual Recipients:**
1. In email composer, use **"Add Recipient"** dropdown
2. Select contacts to add to To field
3. Prevents duplicate email addresses

### 5.4 Logging Engagements

**After Any Stakeholder Contact:**
1. **SEP** → Click solution → **"+Log Engagement"**
2. Fill in:
   - Activity Type (Email, Meeting, Call, Event, etc.)
   - Direction (Inbound/Outbound)
   - Participants
   - Notes/Summary
3. Click **Save**

**Log Email as Engagement:**
1. After composing email, click **"Log as Engagement"**
2. Automatically creates engagement record with:
   - Activity Type: Email
   - Direction: Outbound
   - Recipients and subject captured

**View Engagement History:**
1. Solution detail → Recent Engagements section
2. Click any engagement for details
3. Or: **Contacts** page → search contact → view engagement history

### 5.5 Using Email Templates

**Access Templates:**
1. **SEP** → Click **"Email"** button in header
2. Or: Solution detail → Stakeholders → Email

**Compose from Template:**
1. Select template from dropdown:
   - Working Session invites (WS1-WS5)
   - Touchpoint templates (TP4-TP8)
   - Follow-up templates
2. Select recipient(s)
3. Select solution for context
4. Placeholders auto-fill:
   - `{firstName}` → Contact's first name
   - `{solution}` → Solution name
   - `{agency}` → Contact's agency
   - `{solutionContext}` → Solution details

**Send Options:**
- **Copy to Clipboard**: Paste into your email client
- **Open in Email**: Opens mailto link with pre-filled content

**Edit Templates:**
- Click "Edit Templates" link to open MO-DB_Templates spreadsheet
- 56 templates organized by category

### 5.6 Agencies View

**Browse Organizations:**
1. **SEP** → **Agencies** tab
2. Hierarchical tree shows parent-child relationships
3. Click agency for detail panel

**Agency Detail Panel:**
- **Overview**: Mission, data interests, website
- **Contacts**: Stakeholders from this agency
- **Engagements**: Interaction history
- **Notes**: Relationship notes (editable)

**Heat Map Coloring:**
- Colored dots indicate relationship status
- Green = Strong, Yellow = Developing, Red = New/Cold

---

## 6. For All Team Members

### 6.1 Contacts Directory

**Search Contacts:**
1. Go to **Contacts** page
2. Use search box for: name, email, agency, department, organization
3. Results update as you type

**Filter Contacts:**
- By Solution (dropdown)
- By Role (Primary SME, Secondary SME, etc.)
- By Survey Year (2016, 2018, 2020, 2022, 2024)

**View Contact Details:**
1. Click any contact card
2. Modal shows:
   - Full contact information
   - Organization details
   - Solutions they're connected to
   - Engagement history
   - Related contacts (same solution)

**Add New Contact:**
1. Click **"Add Contact"** button in header
2. Required: First Name, Last Name, Email
3. Optional: Phone, Title, Department, Agency, etc.
4. Optional: Link to Solution, assign Role
5. Click **Save**

**Export Contacts:**
- Click **"Export"** for CSV download
- Exports visible/filtered contacts

### 6.2 Actions Tracking

**View Actions:**
1. Go to **Actions** page
2. Toggle views:
   - **By Person**: Grouped by assignee
   - **By Status**: Kanban board (Open, In Progress, Done)

**Filter Actions:**
- By Status: Open, All, Done
- By Solution
- By Source (MO Internal, SEP)

**Update Action Status:**
1. Click action card
2. Drawer opens with details
3. Click status button to advance: Open → In Progress → Done

**Add Notes to Action:**
1. Click action to open drawer
2. Scroll to Notes section
3. Click **"Add Note"**
4. Enter note text and save

### 6.3 Team Page

**Views Available:**
| View | Content |
|------|---------|
| **Overview** | Team profiles + Office availability |
| **Actions** | (Same as Actions page) |
| **Kudos** | Peer recognition feed |
| **Meetings** | Weekly meeting schedule |
| **Documents** | Directing documents by category |
| **Parking Lot** | Ideas and discussion topics |

**Add Availability:**
1. **Team** → **Overview**
2. Click **"Add"** next to Office Availability
3. Select type: Vacation, Work Travel, 9/80, Sick, Holiday
4. Enter dates and notes
5. Save

**Give Kudos:**
1. **Team** → **Kudos**
2. Select recipient
3. Choose category (Teamwork, Innovation, Above & Beyond, etc.)
4. Write message (280 char max)
5. Optional: Check "Post to Slack"
6. Submit

**Find Meeting Links:**
1. **Team** → **Meetings**
2. Weekly grid shows recurring meetings
3. Click meeting chip for details
4. Use "Join" button for video link

**Access Documents:**
1. **Team** → **Documents**
2. Documents grouped by category:
   - Core (Project Plans, Style Guide)
   - SEP (SEP Plan, etc.)
   - Comms
   - Assessment
   - Operations
3. Click any document to open

**Parking Lot:**
1. **Team** → **Parking Lot**
2. View captured ideas and discussion topics
3. Add new items with quick form
4. Update status: New → Discussed → Assigned → Resolved

### 6.4 Reports

**Available Reports:**
| Report | Description |
|--------|-------------|
| **Need Alignment** | Stakeholder needs vs. solution capabilities |
| **Stakeholder Coverage** | Contact assignment tracking |
| **Department Reach** | Agency engagement statistics |
| **Engagement Funnel** | Touchpoint pipeline metrics |
| **Detailed Milestones** | Gantt-style timeline |
| **Historical Updates** | All updates with filtering |

**Generate Report:**
1. Go to **Reports** page
2. Click report name
3. Configure filters (date range, solution, etc.)
4. Click **"View"** for preview
5. Click **"Export to Sheets"** for Google Sheets export

**Export Features:**
- Multi-tab Google Sheets output
- "Methodology & Data Sources" tab with:
  - Clickable links to source databases
  - Calculation explanations
  - Verification instructions

### 6.5 Schedule

**Timeline View:**
1. Go to **Schedule** page
2. Milestones displayed chronologically
3. Filter by cycle or search

**Gantt View:**
1. Toggle to **Gantt** view
2. Visual timeline with solution bars
3. Hover for details

**Export:**
- Click **"Export"** for CSV download of visible milestones

---

## 7. Administrator Guide

### 7.1 User Management

**Add New User:**
1. Open **MO-DB_Access** Google Sheet
2. Add row with user's email address (column A)
3. User can now log in with team passphrase
4. No app restart required

**Remove User:**
1. Open MO-DB_Access
2. Delete the row with user's email
3. User will be denied access on next login attempt

**Change Team Passphrase:**
1. Open **MO-DB_Config** Google Sheet
2. Find row: `SITE_PASSPHRASE`
3. Update value in column B
4. Communicate new passphrase to team securely

### 7.2 Solution Management

**Add New Solution:**
1. Open **MO-DB_Solutions** Google Sheet
2. Add new row with required fields:

| Column | Value | Example |
|--------|-------|---------|
| `core_id` | Lowercase, no spaces | `new-solution` |
| `core_official_name` | Full name | `New Solution Project` |
| `core_cycle` | C1-C6 | `C6` |
| `admin_lifecycle_phase` | Phase | `Preformulation` |

3. Fill optional fields as available
4. Solution appears in dashboard immediately

**Update Solution Data:**
1. Open MO-DB_Solutions
2. Find row by `core_id`
3. Edit fields directly
4. Changes reflect on next page load

**Column Prefixes:**
- `core_` - Identity (id, name, cycle)
- `admin_` - Lifecycle, notes, dates
- `team_` - Lead, RA Rep, EA Advocate
- `milestone_` - ATP, F2I, ORR dates
- `docs_` - Document URLs
- `comms_` - Key messages, focus areas
- `earthdata_` - Public content
- `product_` - Technical specs
- `funding_` - Funding status

### 7.3 Database Management

**15 Databases:**

| Database | Config Key | Purpose |
|----------|------------|---------|
| MO-DB_Solutions | SOLUTIONS_SHEET_ID | Solution master data |
| MO-DB_Contacts | CONTACTS_SHEET_ID | Stakeholder contacts |
| MO-DB_Updates | UPDATES_SHEET_ID | Meeting note updates |
| MO-DB_Agencies | AGENCIES_SHEET_ID | Organization hierarchy |
| MO-DB_Engagements | ENGAGEMENTS_SHEET_ID | Interaction logs |
| MO-DB_Actions | ACTIONS_SHEET_ID | Action items |
| MO-DB_Milestones | MILESTONES_SHEET_ID | Decision gates |
| MO-DB_Outreach | OUTREACH_SHEET_ID | Events/conferences |
| MO-DB_Stories | STORIES_SHEET_ID | Comms pipeline |
| MO-DB_Team | TEAM_SHEET_ID | Team members |
| MO-DB_Meetings | MEETINGS_SHEET_ID | Meeting schedule |
| MO-DB_Templates | TEMPLATES_SHEET_ID | Email templates |
| MO-DB_Parking | PARKING_LOT_SHEET_ID | Ideas capture |
| MO-DB_Access | ACCESS_SHEET_ID | User whitelist |
| MO-DB_Config | (Script Property) | Configuration |

**Critical Rule:** Column names in code MUST match database headers exactly.

### 7.4 Running Sync Scripts

**Weekly Update Sync:**
1. Open **MO-DB_Updates** spreadsheet
2. Extensions → Apps Script
3. Run `syncWeeklyCurrent`
4. Check Execution Log for errors

**Sync Scripts Available:**
| Script | Purpose | When to Run |
|--------|---------|-------------|
| `syncWeeklyCurrent` | Latest Internal + SEP | After weekly meetings |
| `syncWeeklyInternalHistorical` | Backfill Internal | Once (initial setup) |
| `syncWeeklySEPHistorical` | Backfill SEP | Once (initial setup) |
| `syncMonthlyCurrent` | Latest OPERA + PBL | After monthly meetings |

**Automated Triggers:**
- Can be set up in Apps Script → Triggers
- Recommended: Weekly trigger for `syncWeeklyCurrent`

---

## 8. Expanding the Platform

### 8.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SOURCE DOCUMENTS                          │
│                (Google Docs - Meeting Notes)                 │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     SYNC SCRIPTS                             │
│            (Apps Script in MO-DB_Updates container)          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATABASES                               │
│                    (Google Sheets)                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   MO-APIs LIBRARY                            │
│         (Standalone Apps Script Library: MoApi)              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOY WRAPPERS                            │
│              (NSITE-MO-Viewer project)                       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    VIEWER PAGES                              │
│               (HTML/CSS/JS in browser)                       │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Adding New API Functions

**Step 1: Edit Library File**
```
File: library/<name>-api.gs
Location: C:\...\nsite-mo-viewer\library\
```

**Code Pattern:**
```javascript
var _cache = null;

function getNewData() {
  // Return cached data if available
  if (_cache !== null) {
    return JSON.parse(JSON.stringify(_cache));
  }

  try {
    var sheetId = getConfigValue('NEW_SHEET_ID');
    var sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Sheet1');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      results.push(row);
    }

    _cache = results;
    return JSON.parse(JSON.stringify(results));
  } catch (e) {
    Logger.log('Error in getNewData: ' + e);
    return [];
  }
}
```

**Step 2: Add Wrapper (if new function)**
```
File: deploy/<name>-api.gs
```

```javascript
function getNewData() {
  return MoApi.getNewData();
}
```

**Step 3: Deploy**
1. Copy library file to MO-APIs Library project
2. Copy deploy file to NSITE-MO-Viewer project
3. Save both
4. Deploy new versions if using versioned library

### 8.3 Adding New Database Tables

1. **Create Google Sheet** with column headers in Row 1

2. **Add to MO-DB_Config:**
   ```
   Key: NEW_TABLE_SHEET_ID
   Value: <google-sheet-id>
   ```

3. **Create API file:** `library/new-table-api.gs`

4. **Create wrapper:** `deploy/new-table-api.gs`

5. **Reference in HTML:**
   ```javascript
   google.script.run
     .withSuccessHandler(function(data) { /* handle data */ })
     .withFailureHandler(handleError)
     .getNewData();
   ```

### 8.4 Adding New Pages

1. **Create HTML file:** `deploy/new-page.html`

2. **Add routing in `Code.gs`:**
   ```javascript
   var PAGES = {
     // ... existing pages
     'newpage': { file: 'new-page', title: 'New Page', icon: 'icon_name' }
   };
   ```

3. **Add to navigation** in `navigation.html`

4. **Update `index.html`** routing conditionals

5. **Update `about.html`** documentation

### 8.5 Code Patterns

**HTML Page Pattern:**
```javascript
var NewPage = {
  data: [],

  init: function() {
    this.loadData();
    this.bindEvents();
  },

  loadData: function() {
    showLoading();
    google.script.run
      .withSuccessHandler(this.onDataLoaded.bind(this))
      .withFailureHandler(handleError)
      .getNewData();
  },

  onDataLoaded: function(data) {
    hideLoading();
    this.data = data || [];
    this.render();
  },

  render: function() {
    var container = document.getElementById('content');
    // ... render HTML
  },

  bindEvents: function() {
    // ... attach event listeners
  }
};

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

---

## 9. Maintaining the Platform

### 9.1 Regular Tasks

| Task | Frequency | How |
|------|-----------|-----|
| Verify sync ran | Weekly | Check MO-DB_Updates for latest meeting date |
| Review new bugs | As reported | Add to `docs/BUG_TRACKER.md` |
| Check error logs | Weekly | Apps Script → Executions → Filter: Failed |
| Update documentation | After changes | CHANGELOG.md, about.html |

### 9.2 Deployment Checklist

**For Library Changes (`library/*.gs`):**
1. Open MO-APIs Library in Apps Script editor
2. Select the file to update
3. Replace content with updated code
4. Save (Ctrl+S)
5. If using versioned library: Deploy → Manage deployments → New version

**For Web App Changes (`deploy/*`):**
1. Open NSITE-MO-Viewer in Apps Script editor
2. Select file(s) to update
3. Replace content with updated code
4. Save (Ctrl+S)
5. Deploy → Manage deployments → Edit → Version: New version → Deploy

**Verification:**
1. Open MO-Viewer in browser
2. Hard refresh (Ctrl+Shift+R)
3. Test affected functionality
4. Check browser console for errors

### 9.3 Monitoring

**Check Execution Logs:**
1. Apps Script → Executions (left sidebar)
2. Filter by status: Failed
3. Click execution to see error details and stack trace

**Usage Dashboard:**
1. Apps Script → Dashboard
2. View executions over time
3. Monitor for unusual patterns or spikes

### 9.4 Common Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Null response from API | Response >5MB | Add limits/truncation to query |
| Missing data | Column name mismatch | Verify exact column name in Sheet |
| User can't log in | Not in whitelist | Add email to MO-DB_Access |
| Blank page | SPA routing broken | Check index.html routing |
| Stale data | Caching | Clear browser cache, hard refresh |
| "Not a function" error | Library not synced | Redeploy MO-APIs Library |

### 9.5 File Locations

**Local Repository:**
```
C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\
```

**Key Directories:**
```
nsite-mo-viewer/
├── deploy/           → Copy to NSITE-MO-Viewer (Apps Script)
├── library/          → Copy to MO-APIs Library (Apps Script)
├── docs/             → Documentation
│   ├── BUG_TRACKER.md
│   ├── DATA_SCHEMA.md
│   └── USER_TRAINING_GUIDE.md
├── database-files/   → Local database backups
├── scripts/          → Python utilities
├── CLAUDE.md         → Development instructions
├── CHANGELOG.md      → Version history
└── NEXT_STEPS.md     → Current status
```

---

## 10. Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Global search |
| `Esc` | Close modal/drawer |
| `/` | Focus search (on pages with search) |

### URL Parameters

| Parameter | Example | Purpose |
|-----------|---------|---------|
| `?page=implementation` | Direct to Implementation | Deep linking |
| `?page=sep` | Direct to SEP | Deep linking |
| `?page=comms` | Direct to Comms | Deep linking |

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

---

## 11. Troubleshooting

### "Failed to load data"

1. Check internet connection
2. Hard refresh browser (Ctrl+Shift+R)
3. Check if Google Sheets are accessible
4. Review Apps Script execution logs

### "Session expired"

1. Re-enter email and passphrase
2. Sessions last 6 hours
3. If persistent, check MO-DB_Access whitelist

### "No stakeholders found"

1. Verify contacts exist in MO-DB_Contacts
2. Check `solution_id` matches between databases
3. Column names are case-sensitive

### "Export failed"

1. Check popup blocker settings
2. Verify Google Drive permissions
3. Try again (may be rate limiting)

### Modal won't close

1. Click X button
2. Press Esc key
3. Click outside modal area
4. Hard refresh if stuck

### Data not updating

1. Check if sync script ran (MO-DB_Updates dates)
2. Clear browser cache
3. Verify source document has 🆕 markers
4. Check Apps Script logs for sync errors

---

## Getting Help

- **Platform Documentation**: About page in MO-Viewer
- **Technical Issues**: Contact Dashboard Administrator
- **Access Requests**: Email admin (see access-denied page)
- **Bug Reports**: Add to `docs/BUG_TRACKER.md`

---

*Document Version: 1.0 | Last Updated: January 28, 2026*
