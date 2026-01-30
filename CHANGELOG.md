# Changelog

All notable changes to the MO-Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2026-01-29

### Added
- **Solution Top Sheet Page** - New home page showing all solutions with milestone dates in a consolidated table
  - **Default landing page** - Top Sheet is now the first page shown after sign-in
  - Implementation milestones: ATP DG, F2I DG, ORR, Closeout
  - Memo dates (toggleable): ATP Memo, F2I Memo, ORR Memo, Closeout Memo
  - SEP milestones (toggleable): WS1/TP4, WS2/TP5, WS3/TP6, WS4/TP7, WS5/TP8
  - **Solution Picker** - Select which solutions to display with Default/All/None quick actions
    - Default selection uses `admin_default_in_dashboard` field from MO-DB_Solutions
    - Selection persists via localStorage
  - **Grouping** - Group rows by Cycle, Phase, or Group with section headers
    - "No Group/Cycle/Phase" items grouped together at the end
  - **Detail Modal** - Click any solution to view milestone details in a popup
    - Shows Implementation milestones with memo dates (if Show Memos enabled)
    - Shows SEP milestones (if Show SEP enabled)
  - Sticky columns (Solution, Cycle, Phase) stay visible during horizontal scroll
  - Date format shows day (e.g., "15 Jan 2024")
  - Sortable columns - click headers to sort
  - CSV export of current filtered/sorted view
  - Toggle states persist via localStorage

### Changed
- **Navigation** - Top Sheet moved to first position in primary navigation
  - Shows icon only when not active, full label when active
- **Home page redirect** - Sign-in now redirects to Top Sheet instead of Implementation

---

## [Unreleased]

### Added
- **Share with Team File Upload** - Implementation solution detail modal now includes file upload feature
  - "Share with Team" button appears in Documentation Links section (only for solutions with `admin_shared_team_folder` configured)
  - Drag-and-drop upload dialog with file browser fallback
  - Upload progress indicator with file-by-file status
  - Files uploaded directly to solution's shared Google Drive team folder
  - "Open in Drive" link to access the team folder
  - New database column: `admin_shared_team_folder` in MO-DB_Solutions
  - New API: `file-upload-api.gs` with `uploadFileToTeamFolder()` function

---

## [2.1.5] - 2026-01-28

### Fixed
- **COMM-036: Story update data validation error** - Stories now save correctly
  - Changed solution input from free text to dropdown with valid solution_ids
  - Fixed column name mismatches between code and database:
    - `pitch_document_url` → `pitch_doc_url`
    - `published_link` → `published_url`
    - `primary_outlet` → `platform`
    - `last_update_date` → `last_updated`
    - `created_at` → `created_date`
  - Added `priority` and `source` columns to MO-DB_Stories
  - `getPipelineStoriesForUI()` now returns all fields for complete modal data

- **Implementation page null error** - Added null check to `populateFilterDropdowns()` for SPA navigation

- **TEAM-027: Wrong name in availability edit** - Fixed dropdown showing wrong team member
  - Dropdown now displays first names only with contact_id as values
  - Added fallback matching by first name when contact_id doesn't match

- **Stories API schema alignment** - Updated `getCoverageAnalysis()` and `detectStoryOpportunities()` to use schema v2 column names (`core_id`, `core_official_name`, `milestone_atp_date`, etc.)

### Added
- **Email All Stakeholders** - Solution detail modal now includes "Email All" button
  - Collects all stakeholder emails for the solution
  - Opens email composer with recipients pre-filled in To field
  - Solution context auto-selected

- **Log Email as Engagement** - Email composer can now log sent emails as engagements
  - "Log as Engagement" button creates engagement record directly
  - Activity type: Email, Direction: Outbound
  - Captures recipients, subject, solution, and email body as summary
  - Closes modal and refreshes engagement list on success

- **Add Contact Form** - New contact creation from Contacts Directory page
  - "Add Contact" button in page header opens modal form
  - Required fields: First Name, Last Name, Email
  - Organization section: Phone, Title, Department, Agency (with autocomplete), Organization, Region
  - Collapsible "Solution & Engagement" section: Solution dropdown, Role, SEP Touchpoint, Engagement Level
  - Collapsible "Notes" section: Relationship notes
  - Email validation prevents duplicates, normalizes to lowercase
  - Toast notifications for success/error feedback

- **Export Prep Report to Google Doc** - Event preparation reports can be exported
  - "Export to Doc" button appears after generating a prep report
  - Creates formatted Google Doc with event details, summary stats, agencies represented
  - Includes potential connections, conversation starters, linked solutions
  - Full guest profiles with education, hobbies, goals, etc.
  - Footer with generation timestamp
  - Opens document in new tab automatically

- **Parking Lot Database** - New MO-DB_Parking for capturing team ideas and topics
  - Item types: idea, discussion_topic, stakeholder_connection, follow_up, process_suggestion, random_info
  - Status workflow: new → discussed → assigned → in_progress → resolved → archived
  - Assignable to team members with owner tracking
  - Pre-populated with 11 team retreat items

- **Templates Database** - New MO-DB_Templates for email/meeting templates
  - 56 templates organized by category (SEP stages, Comms, Events)
  - Templates API for retrieval and filtering

### Changed
- **SEP Solution Detail Modal Redesign** - Improved layout and interactions
  - Reordered sections: Name, Cycle/Phase, Recent Engagements (+Log button), Team, Stakeholders, Agencies, Milestone Timeline
  - Lighter design with reduced font weights, subtle dividers, more whitespace
  - Clickable engagements open full engagement detail modal
  - Modal return navigation - closing engagement detail returns to solution modal (not closes everything)
  - Agencies displayed as pills/chips, stakeholders as simple list

- **Email Composer UX Improvements** - Better recipient management
  - Renamed "Recipient" to "Add Recipient" dropdown
  - Dropdown now adds to To field instead of replacing
  - Prevents duplicate email addresses
  - Clearer workflow for multi-recipient emails

- **SEP Overview Table** - Last/Next milestone column shows milestone names
  - Format: "TP4 → WS2" showing last completed → next upcoming
  - Calculated from milestone dates relative to today

- **Event Cards Redesign** - Cleaner, more spacious event card design
  - Increased padding and margins for breathing room
  - Subtle shadow and border instead of heavy left border
  - Smooth hover effect with slight elevation
  - Type icon displayed in circular badge
  - Better visual hierarchy with prominent title
  - Details (date, location) grouped in neat column layout
  - Action buttons separated by subtle divider

- **Event Status Badges** - Consistent styling across all views
  - Replaced inline styles with CSS classes (.event-status.{status})
  - Unified design: potential (subtle gray), considering (blue), confirmed (green), attended (muted), cancelled (strikethrough)
  - Updated event cards, events table, and event detail modal
  - Removed redundant .event-status-badge CSS

- **Calendar Communications Due Alerts** - New sidebar section in Comms Calendar view
  - Shows solutions needing communications attention (no coverage ever or >90 days since last story)
  - Color-coded urgency: red for critical (uncovered or >180 days), orange for warning (>90 days)
  - Quick "+ Story" button to create story for any solution directly
  - "View all" link to Coverage view when more than 8 solutions need attention
  - Responsive layout: calendar grid with sidebar on larger screens, stacked on mobile

- **Email Templates for SEP** - Compose stakeholder outreach emails from templates
  - New "Email" button in SEP page header
  - Templates loaded from MO-DB_EmailTemplates sheet (EMAIL_TEMPLATES_SHEET_ID in config)
  - Columns: template_id, name, category, subject, body, is_active, sort_order, notes
  - Select template, recipient (from contacts), and solution context
  - Placeholders auto-filled: {firstName}, {solution}, {agency}, {solutionContext}
  - Copy to clipboard or open in email client (mailto link)
  - "Edit Templates" link to open the templates spreadsheet

- **SEP Overview Table** - Collapsible summary table in Dashboard view
  - Shows all solutions with current SEP milestone, last engagement date, and comms due
  - Click any row to open solution detail
  - Collapsible to save screen space; toggle with header click
  - Comms due calculated as 30 days from last engagement (color-coded overdue/due-soon)

- **SEP Solutions View** - New "quad card" view for solution-by-solution browsing
  - Card for each solution showing: ID, name, current milestone
  - Implementation progress: WS completed count, TP completed count
  - Recent engagements list (up to 3)
  - Next comms due with color-coded urgency
  - Quick actions: Log Engagement, View Engagements

- **Getting Started Tutorial** - Task-oriented tutorial section in About page
  - 8 real-world scenarios: "I just met someone...", "What's new with X?", etc.
  - Step-by-step instructions for common workflows
  - Tips and cross-references to related features
  - New nav link in About page quick navigation

### Changed
- **Quick Update Page Redesign** - Transformed from form submission to Agenda Viewer
  - Embedded viewer for 5 agendas: Internal, SEP, OPERA, PBL, Monthly Presentation
  - Tab-based navigation with compact toolbar
  - "Add updates with 🆕" hint and "Open in new tab" link
  - Monthly tab auto-labels with current month/year from latest presentation

- **Style Audit & Consistency Fixes** - Comprehensive cleanup across all pages
  - Fixed CSS variable names: `--spacing-*` → `--space-*`, `--bg-*` → `--color-surface`
  - Converted 50+ hardcoded pixel font sizes to design system variables
  - Added `--font-size-xxxl: 32px` to design system for large avatar initials
  - Fixed hardcoded border-radius values to use `var(--radius-sm)`, `var(--radius-md)`
  - All pages now use `--page-accent` CSS variable for consistent accent colors

- **Page Header Consistency** - Unified header styling across all pages
  - Removed duplicate `.page-header` and `.page-title` CSS from individual pages
  - All pages now use shared-page-styles.html for headers
  - Removed page subtitles (Contacts, Reports, Team, Schedule) for cleaner look
  - Added `--page-accent` to reports.html and schedule.html

- **View Toggle Consistency** - Standardized view toggle across all multi-view pages
  - Schedule: Changed `toggle-btn` to `view-btn` class
  - Actions: Restructured header to use standard `page-header`/`page-title` pattern
  - Removed duplicate view-toggle CSS from schedule.html and actions.html
  - Added `.view-btn .material-icons` sizing to shared-page-styles.html
  - All view toggles (Comms, SEP, Team, Schedule, Actions) now identical

- **Actions Page Cleanup** - Simplified header
  - Removed "0 open" badge from header bar
  - Removed redundant refresh button
  - Uses standard page-header styling

### Added
- **System Architecture Documentation** - Comprehensive data flow map added to CLAUDE.md
  - Documents: Source Docs → Sync Scripts → Databases → API Library → Deploy Wrappers → Viewer Pages
  - Database → API → Page dependencies table
  - Critical column name dependencies (must match exactly)
  - Response size limits and mitigations (~5MB google.script.run limit)
  - Deployment checklist and order

- **Historical Updates Report Improvements** (Reports page)
  - Updates grouped by date under single headers
  - Dates link to source documents when source_url available
  - Increased text limit from 500 to 1000 characters (preserves URLs)
  - Bullet points (•, ○, ■) render as line breaks for readability
  - Cleaner layout with shared background per date group

- **Markdown Link Rendering** - Implementation solution detail modals now render markdown links as clickable
- **Animated Loading Spinner** - Solution detail modals show spinning loader while fetching data

### Fixed
- **Contacts API Column Name Bug** - Fixed `solution_id_id` → `solution_id` in contacts-api.gs
  - `getContactsBySolution()`, `getContactsBySolutionId()`, `getContactsMultiFilter()` now use correct column name
  - This was causing "No stakeholder data" for all solutions

- **Updates API Response Size** - Fixed null responses from `getUpdatesForSolutionCard()`
  - Limited to 10 recent + 10 extended updates
  - Text truncated to 300 chars for card display
  - Prevents google.script.run ~5MB limit exceeded

### Removed
- **Project Cleanup** - Removed 26 legacy/duplicate files for cleaner repository
  - Empty placeholder folders: `config/`, `parsers/`, `tests/`
  - Legacy folders: `storage/`, `src/`, `reports/`
  - Outdated duplicate: `library/team.html`
  - Debug code: `console.log` statement in reports.html
  - Canonical code now in `deploy/` (Apps Script) and `library/` (API library)

### Changed
- **Documentation Consolidation** - Merged claude-instructions.md into CLAUDE.md
  - Single comprehensive reference file
  - Session start checklist, common mistakes, quality checklist all in one place

- **SEP Dashboard Redesign** - Restructured page layout based on usage patterns
  - Added stats row at top: Engagements This Month, Contacts Engaged, Solutions Engaged, Activity Level (heat indicator)
  - Promoted "Recent Engagements" and "Needs Attention" panels to main content area
  - Moved milestone pipeline to bottom as "Milestone Summary" (cards move infrequently over time)
  - Moved cycle filter dropdown to page header for cleaner layout
  - Renamed view from "Pipeline" to "Dashboard"
  - New API function `getSEPDashboardStats()` provides stats with heat level calculation

- **CSS Consolidation Phase 1 & 2** - Extracted common patterns to `shared-page-styles.html`
  - Phase 1: Page header, view toggle, stats row, panels, forms, modals, filter bar
  - Phase 2: Pipeline board, pipeline cards, card components, badges, data tables, avatars
  - Pages now use `--page-accent` CSS variable for accent colors (auto-applied to titles, buttons, icons)
  - Removed ~250+ lines of duplicated CSS from sep.html, team.html, comms.html, implementation.html
  - Pages retain page-specific style overrides where needed (SEP drag/drop, Comms story status colors)

### Added
- **SEP Agencies View Enhancements** - Major upgrade to the Agencies detail panel
  - **Network Graph tab** - Interactive vis.js visualization showing contact-solution relationships
    - Nodes for contacts (blue) and solutions (green) with physics simulation
    - Edges show engagement connections between contacts and solutions
    - Legend explaining node types
  - **Engagement edit/delete** - Click any engagement in timeline to view full details with Edit/Delete buttons
  - **Remove contact from agency** - Red X button on contact cards to remove agency association
  - **Quick Log button** - Fixed existing feature that had a modal error
  - **Contact Detail Modal** - Added missing modal for viewing contact details from agency view

### Removed
- **Engagement trend chart** - Removed mini bar chart from agency overview (clutter reduction)

### Fixed
- **Quick Log closeModal TypeError** - Added null check to prevent error when modal doesn't exist
- **Contact detail TypeError** - Fixed `state.contacts` undefined by checking `currentAgencyContacts` first
- **Contact history TypeError** - Same fix applied to showContactHistory function
- **Duplicate contacts in search** - Added deduplication by email in renderContactSearchResults
- **Timeline items not clickable** - Added click handlers and showAgencyEngagementDetail for engagement expansion

---

## [2.1.0] - 2026-01-23

### Added
- **SEP Agencies View Enhancements** - Major upgrade to the Agencies detail panel (continued from previous session)
  - **Tabbed interface** - Overview, Contacts, Engagements, Notes tabs for better organization
  - **Metrics dashboard** - 4 metric cards showing Engagements, Contacts, Solutions, Heat status with trends
  - **Relationship health bar** - Visual progress bar showing relationship status (New → Developing → Established → Strong)
  - **Engagement trend chart** - Mini bar chart showing 6-month engagement activity
  - **Quick action buttons** - Log Engagement, Add Contact, Website link
  - **Enhanced contact cards** - Larger avatars, engagement badges, hover-reveal action buttons
  - **Heat map coloring** - Agency tree shows colored dots and left borders based on relationship status
  - **Active state highlighting** - Selected agency highlighted in tree
  - **Notes tab** - Textarea for relationship notes (backend integration pending)

- **Team Documents - Templates Category** - New section for boilerplates and templates
  - 6 template document types: Meeting Notes, Solution Brief, Stakeholder Report, Presentation, Email Outreach, One-Pager
  - Teal color scheme (#00838f) to differentiate from other categories
  - Only displays if at least one template document ID is configured in MO-DB_Config

### Fixed
- **Team Documents Icons** - Fixed icon rendering issues
  - Converted all Feather icon names to Material Icons (e.g., `file-text` → `description`, `git-merge` → `merge_type`)
  - Added fallback to `description` icon if none specified
  - Added validation to use only first icon if multiple provided
  - Fixed vertical alignment with `align-items: center` on document cards

- **SEP Agencies Panel Layout** - Removed forced height/scrolling constraints
  - Panels now display full content naturally
  - Removed `max-height` and `overflow-y: auto` that caused unnecessary scrolling

### Changed
- **MO-DB_Solutions Schema v2** - Major schema refactoring with semantic prefixes
  - Reduced from 76 → 64 columns
  - Added 9 semantic prefixes: `core_`, `funding_`, `admin_`, `team_`, `earthdata_`, `comms_`, `product_`, `milestone_`, `docs_`
  - Merged `name` (colloquial) into `core_alternate-names`
  - Added 5 new presentation URL columns for milestones (`milestone_*-presentation-url`)
  - Dropped 17 columns (status fields derived from URL presence, redundant flags)
  - Column naming uses underscores for JS dot notation compatibility (e.g., `core_official_name`, `team_stakeholder_list_url`)
  - Migration script: `scripts/solutions_schema_v2.py`

### Fixed
- **Implementation-NSITE**: Deep Dives stat now reads from `deep_dive_date` in MO-DB_Solutions (was hardcoded 'TBD')

### Planned
- Automation & Sync (scheduled exports, email notifications)
- External Mentions tracking for Comms-NSITE

---

## [2.0.0] - 2026-01-20

### V2 Release - Complete Platform with Authentication

**This release marks the completion of V2**, a fully functional unified dashboard with:
- 9 viewer pages (Implementation, SEP, Actions, Comms, Team, Contacts, Reports, Schedule, Quick Update)
- 13 databases
- Passphrase + whitelist authentication
- MO-APIs shared library architecture
- All P0 bugs resolved

V3 will focus on feature enhancements based on stakeholder feedback.

### Added - Passphrase + Whitelist Authentication

**Access Control System** (NEW)
- **Passphrase authentication** - Shared team passphrase replaces domain-only restriction
- **Email whitelist** - MO-DB_Access spreadsheet controls who can access
- **Session tokens** - 6-hour sessions stored in ScriptCache (isolated per user)
- **Sign-in page** (`auth-landing.html`) - Email + passphrase form
- **Access denied page** (`access-denied.html`) - Shows user email, Request Access button
- **Request Access feature** - Users can request access (logged for admin review)

**Why This Approach?**
- Supports mixed account types (NASA.gov and personal Google accounts)
- Works around Google Apps Script limitations:
  - `Session.getActiveUser()` returns empty for external users with "Execute as: Me"
  - Google Identity Services blocked from googleusercontent.com subdomains
- No OAuth, no Google Cloud project, no app verification needed

**New Config Keys (MO-DB_Config)**:
- `SITE_PASSPHRASE` - Shared team passphrase (case-sensitive)
- `ACCESS_SHEET_ID` - ID of MO-DB_Access whitelist spreadsheet
- `ADMIN_EMAIL` - Email for access request notifications

**New Functions (Code.gs)**:
- `verifyPassphraseAccess(email, passphrase)` - Main auth function
- `createSessionToken(email)` - Creates UUID token in ScriptCache
- `verifySessionToken(token)` - Validates token and re-checks whitelist
- `validateUserAccess(email, sheetId)` - Checks whitelist
- `submitAccessRequest(email, reason)` - Logs access requests

### Fixed
- **All P0 bugs resolved** - TEAM-022, SEP-008, SEP-009, COMM-001, COMM-002, QU-001

### Changed
- **CLAUDE.md** - Added comprehensive Access Control documentation
- **about.html** - Updated to document authentication system

---

## [1.3.0] - 2026-01-18

### Added - Comms-NSITE, Database Consolidation & Report Exports

**Report Export to Google Sheets** (NEW)
- **All 6 reports now export to multi-tab Google Sheets** with methodology documentation
- **Methodology & Data Sources tab** - Each export includes:
  - Clickable links to source databases
  - Calculation explanations for all scores
  - Verification instructions for leadership review
- **Performance optimization** - Batch `setValues()` replaces slow `appendRow()` loops
- **Confidence weighting** - Need Alignment report now shows confidence based on response count
  - Formula: `100 * (1 - e^(-responses/10))`
- **Export files created:**
  - `export-helpers.gs` - Shared utilities (styling, formatting, methodology helpers) (NEW FILE)
  - `stakeholder-solution-alignment.gs` - Need Alignment, Stakeholder Coverage, Engagement Funnel, Department Reach exports
  - `quicklook-generator.gs` - Detailed Milestones export
  - `historical-updates-export.gs` - Historical Updates export (NEW FILE)
- **Generic export handler** in reports.html - Single `exportToGoogleSheet()` function for all reports
- **Bug fixes:**
  - Fixed `getAllHistoricalUpdatesForReport()` data structure handling (returns `{solutions: [...]}` not keyed object)
  - Fixed methodology sheet column mismatch in Stakeholder Coverage and Department Reach exports
  - Fixed broken `getProperty(CONFIG.CONFIG_SHEET_ID)` → `getConfigValue('SOLUTIONS_SHEET_ID')` in all export functions

**Comms-NSITE Enhancements**
- **Admin Priorities View** - New view showing stories aligned with 5 Biden-Harris administration priorities:
  - International Partnerships
  - Citizen Science & Open Science
  - AI Innovation
  - Science Integrity
  - Efficiency
- **Admin Priorities in Story Form** - Checkbox group for tagging stories with priority alignment
- **MO-DB_Stories Database** - 38 stories extracted from NSITE Story Tracking workbook
  - 6 content types: story, web_content, social_media, nugget, key_date, science_advancement
  - 22 columns including admin_priorities
  - Source tracking for data provenance
- **sync-stories-from-tracking.gs** - Container-bound sync script for MO-DB_Stories
- **sync_stories_from_tracking.py** - Python sync for local development

**Key Messages Integration**
- **Key Messages View** in Comms-NSITE - New "Messages" tab showing solution key messages:
  - Summary stats: solutions with messages, coverage %, focus types
  - Search bar to filter messages by keyword
  - Card grid displaying key messages, scientific advancement, agency impact, industry connections
  - Links to public communications pages
- **Key Messages columns added to MO-DB_Solutions** (6 new columns):
  - key_messages, focus_type, industry_connections
  - scientific_advancement, agency_use_impact, public_comms_links
- **Key Messages API Functions** in solutions-api.gs:
  - `getKeyMessages(solutionId)` - Get key messages for a solution
  - `getSolutionsWithKeyMessages()` - Get all solutions with key messages
  - `getKeyMessagesSummary()` - Coverage statistics for comms dashboard
  - `searchKeyMessages(query)` - Search across key message content
- **13 solutions** populated with key messages from source file

**MO-DB_Milestones Database** (NEW)
- 185 milestone records extracted from MO-DB_Solutions
- Columns: milestone_id, solution_id, milestone_type, target_date, actual_date, status, notes
- Milestone types: ATP, F2I, ORR, Closeout, Memo dates

### Changed

**MO-DB_Solutions Consolidation** (**MAJOR CLEANUP**)
- **Reduced from 80 → 48 columns** (32 columns removed/migrated)
- **Milestone data extracted** to MO-DB_Milestones (8 date columns → foreign key)
- **Empty columns removed**: 17 columns with no data
- **Redundant columns merged**: team_management → notes, duplicate URLs consolidated
- **Key messages integrated**: 6 columns added from separate source files
- **Backup created** before modification

**Icon Library Migration** (Stability Improvement)
- **Replaced Feather Icons with Google Material Icons** across all HTML files
- **Reason**: Feather Icons JS-based approach had stability issues in Google Apps Script iframe sandbox
- **Benefits**:
  - CSS-based icons (no JavaScript initialization required)
  - Native Google compatibility (same icons used in Google products)
  - Faster load times (no feather.replace() calls needed)
  - More reliable in SPA navigation context
- **Updated**: 12 HTML files, 70+ icon instances converted
- **Mapping**: Created `scripts/convert_to_material_icons.py` for automated conversion

**Favicon Implementation** (Apps Script Compatibility)
- **Custom "MO" favicon** - Navy blue with white text and cyan accent bar
- **Hosted on GitHub** at `favicon.png` for reliable external access
- **setFaviconUrl()** - Used HtmlService API method in Code.gs (the key fix)
- **Multiple link formats** - icon, shortcut icon, apple-touch-icon for browser compatibility

**Platform Improvements** (UX Polish)
- **Global Search** - Search across solutions, contacts, and actions
  - Keyboard shortcut: `Ctrl+K` (or `Cmd+K` on Mac)
  - Results grouped by type with click-to-navigate
  - Debounced input for performance
- **Standardized Loading States** - Consolidated all loading CSS in styles.html
  - `.loading-spinner` (32px) for page-level loading
  - `.loading-spinner-sm` (16px) for buttons
  - `.btn.loading` state with automatic spinner
  - `.skeleton` shimmer animation for placeholders
- **Toast Notifications** - `showToast(message, type)` utility for success/error feedback
- **Button Loading** - `setButtonLoading(btn, loading)` utility

**Database Count: 13 Total**
- Needs, Actions, Agencies, Availability, Contacts, Engagements, Glossary, Meetings, Milestones, Outreach, Solutions, Stories, Updates

### Scripts Added
- `scripts/consolidate_solutions_db.py` - Full Solutions database consolidation
- `scripts/sync_stories_from_tracking.py` - Story extraction from tracking workbook
- `deploy/sync-stories-from-tracking.gs` - GAS sync for MO-DB_Stories

---

## [1.2.0] - 2026-01-18

### Added - TRUE THIN WRAPPER CONVERSION (**MAJOR ARCHITECTURE CHANGE**)
- **Complete API Conversion**: All 10 deploy/*-api.gs files now delegate to MoApi library
  - Pattern: `function X(...args) { return MoApi.X(...args); }`
  - Full implementations moved to library/ folder
  - Deploy wrappers reduced from ~6,500 lines to ~700 lines total
- **4 New Library API Files**:
  - `library/actions-api.gs` - Action tracking with bi-directional agenda sync (667 lines)
  - `library/milestones-api.gs` - Milestone tracking for Implementation-NSITE (420 lines)
  - `library/outreach-api.gs` - Event/outreach tracking with web discovery (696 lines)
  - `library/stories-api.gs` - Communications story pipeline (955 lines)

### Changed
- **deploy/solutions-api.gs** → Thin wrapper (70 lines, was 376)
- **deploy/contacts-api.gs** → Thin wrapper (148 lines, was 997)
- **deploy/agencies-api.gs** → Thin wrapper (75 lines, was 458)
- **deploy/updates-api.gs** → Thin wrapper (56 lines, was 336)
- **deploy/engagements-api.gs** → Thin wrapper (88 lines, was 557)
- **deploy/team-api.gs** → Thin wrapper (128 lines, was 1010)
- **deploy/actions-api.gs** → Thin wrapper (88 lines, was 667)
- **deploy/milestones-api.gs** → Thin wrapper (61 lines, was 420)
- **deploy/outreach-api.gs** → Thin wrapper (111 lines, was 696)
- **deploy/stories-api.gs** → Thin wrapper (117 lines, was 955)

---

## [1.1.0] - 2026-01-18

### Added
- **Team-NSITE Viewer** - Documents View Implementation
  - `getDirectingDocuments()` function reads 16 directing document IDs from MO-DB_Config
  - Documents grouped by category: Core, SEP, Comms, Assessment, Operations
  - Clickable document cards with icons, descriptions, and external links
  - Document count displayed in Team stats dashboard
- **Code.gs CONFIG_KEYS** - 24 new config key constants
  - Source Documents: OPERA_MONTHLY_ID, PBL_MONTHLY_ID
  - Library Reference: API_LIBRARY_ID
  - Directing Documents (16 total): MO_PROJECT_PLAN_DOC_ID, HQ_PROJECT_PLAN_DOC_ID, SEP_PLAN_DOC_ID, SEP_BLUEPRINT_DOC_ID, COMMS_PLAN_DOC_ID, STYLE_GUIDE_DOC_ID, and more
- **MO-DB_Availability** - Team availability calendar database
- **MO-DB_Meetings** - Recurring meetings schedule database
- **MO-DB_Glossary** - Terms and definitions database

### Changed
- **about.html** - Updated for Team Viewer
  - Added Team-NSITE documentation card
  - Added new databases to database section (Availability, Meetings, Glossary)
  - Updated architecture diagram to show Team
  - Removed obsolete next steps (blank page fix already done, comms already deployed)
  - Version updated to 1.1.0
- **DATA_SCHEMA.md** - Updated to v1.1.0
  - Added AVAILABILITY, MEETINGS, GLOSSARY, CONFIG table schemas
  - Added new enumerations: AvailabilityType, RecurrenceType, MeetingCategory, MeetingType
- **NEXT_STEPS.md** - Corrected documentation
  - Fixed inaccurate thin wrapper claims (deploy files have full implementations, not wrappers)
  - Added team-api.gs to library and deploy file listings
  - Added new Team-related databases to data sources reference

---

## [1.0.3] - 2026-01-17

### Added
- **MO-APIs Library**: Standalone Apps Script library for shared data access (**DEPLOYED**)
  - Library files in `library/` folder: config-helpers.gs, solutions-api.gs, contacts-api.gs, agencies-api.gs, updates-api.gs, engagements-api.gs, team-api.gs
  - Deployed as Apps Script Library with identifier: `MoApi`
  - Config: `CONFIG_SHEET_ID` script property points to MO-DB_Config
- **API Code Organization**: Parallel implementations in library and deploy
  - `library/*-api.gs` files for MO-APIs Library
  - `deploy/*-api.gs` files contain full implementations for web app
  - **Note:** True thin wrapper conversion not yet implemented
- **sync-monthly-presentations.gs**: Container-bound script for MO-DB_Updates that parses Monthly Meeting Google Slides
  - Extracts solution_id from speaker notes (preferred) or name mapping (fallback)
  - Categorizes updates: programmatic, development, engagement, roadblock
  - Supports historical backfill with `syncAllMonthlyPresentations()`
  - Config key: `MONTHLY_FOLDER_ID` for presentations folder
- **MO-DB_Solutions schema**: Added `alternate_names` column
  - Pipe-delimited list of name variants for matching (e.g., "Harmonized Landsat Sentinel-2|HLS v2")
  - Used by `findSolutionIdsInText()` for solution detection in text
- **sync-updates-to-db.gs**: Container-bound script for MO-DB_Updates that parses 🆕 updates from agenda documents
  - Supports Internal Planning (table format) and SEP Strategy (paragraph format)
  - Also supports OPERA Monthly and PBL Monthly agendas
  - Reads config from MO-DB_Config (INTERNAL_AGENDA_ID, SEP_AGENDA_ID, etc.)
- **updates-api.gs**: Data access layer for MO-DB_Updates
  - `getAllUpdates()`, `getUpdatesBySolution()`, `getRecentUpdatesBySolution()`
  - `getUpdatesForSolutionCard()` - structured data for solution cards
- **MO-DB_Contacts schema**: Added 6 internal team columns
  - `is_internal` (Y/N), `internal_title`, `internal_team`, `supervisor`, `start_date`, `active`
  - Enables tracking internal MO team members without separate database

### Changed
- **reports.html**: Reports page UX improvements
  - Removed QuickLook CSV report (MO Viewer replaces its function)
  - Removed Export functionality (temporary - for review)
  - Restored comprehensive "How is this calculated?" methodology sections for all 7 reports
  - **Need Alignment report**: Expandable solution rows - click any solution to see its gap analysis inline

### Fixed
- **Blank page after 3 tab clicks** - Implemented SPA navigation architecture
  - **Root cause**: Google Apps Script iframe sandbox fails after ~3 `window.location` navigations
  - **Solution**: Replaced full page reloads with Single Page Application (SPA) pattern
  - Added `getPageHTML(pageName)` server function to fetch page content
  - Navigation now uses `google.script.history.push()` instead of `window.location`
  - Browser back/forward buttons now work correctly
  - **Bonus**: Navigation bar now works in Apps Script preview mode
  - See `docs/SPA_NAVIGATION.md` for full technical documentation

---

## [1.0.1] - 2026-01-16

### Changed
- **Renamed**: "MO-Viewer" → "NSITE MO Viewer" throughout platform
- **Security**: Access restricted to NASA.gov Google Workspace accounts only
  - Deployment: Execute as Me, Who has access: Anyone within NASA.gov
  - External accounts blocked by Google
- **Header**: Removed user email display (not functional with "Execute as Me" deployment)
- **About page**: Added fallback CSS variables for consistent styling
- **About page**: Fixed quick navigation links (now use JavaScript scrolling instead of anchor hrefs)
- **About page**: Centered architecture diagram
- **About page**: Updated Security section to document NASA.gov-only access

---

## [1.0.0] - 2026-01-16

**MO-Viewer v1.0** - Complete unified dashboard platform with all databases, core viewers, and supporting features.

### Platform Summary

| Component | Status | Description |
|-----------|--------|-------------|
| **Implementation-NSITE** | Complete | Solution tracking with milestones, documents, stakeholders |
| **SEP-NSITE** | Complete | Stakeholder engagement pipeline with touchpoints |
| **Actions-NSITE** | Complete | Action item tracking with bi-directional agenda sync |
| **Contacts Directory** | Complete | 423 contacts across 47 solutions |
| **Reports** | Complete | 7 report types with methodology documentation |
| **Schedule** | Complete | Timeline and Gantt views |
| **Quick Update Form** | Complete | Submit updates to agenda documents |

### Databases (7 total)

| Database | Records | Purpose |
|----------|---------|---------|
| **MO-DB_Solutions** | 37 | Solution data (49 columns) |
| **MO-DB_Contacts** | 423 | Stakeholder contacts |
| **MO-DB_Agencies** | 43 | Federal agency hierarchy |
| **MO-DB_Engagements** | — | Engagement logging |
| **MO-DB_Needs** | 2,049 | Stakeholder survey responses |
| **MO-DB_Actions** | — | Action items with agenda sync |
| **MO-DB_Config** | — | Configuration settings |

### Core Viewers

**Implementation-NSITE** (`implementation.html`):
- Solution cards organized by cycle with phase badges
- Milestone tracking (ATP, F2I, ORR, Closeout)
- Document status tracking (9 document types)
- Stakeholder integration per solution
- Solution picker with default selection

**SEP-NSITE** (`sep.html`):
- Pipeline kanban (T4 → W1 → W2 → T5 → T6 → T7 → T8)
- Agencies view with hierarchy browser
- Engagement logging modal
- Stats: Contacts, Agencies, Need Follow-up, This Week

**Actions-NSITE** (`actions.html`):
- Assignee-first collapsible cards
- Bi-directional sync with agenda documents
- Status updates push back to source docs
- Add Action modal for new items

### Supporting Features

**Reports** (`reports.html`):
- QuickLook CSV, Quad Chart, Detailed Milestone
- Need Alignment, Stakeholder Coverage, Engagement Funnel, Department Reach
- Methodology documentation per report
- Data provenance banners

**Schedule** (`schedule.html`):
- Timeline view grouped by month
- Gantt chart with phase dependencies
- Stats: Upcoming, Overdue, Completed

**Contacts** (`contacts.html`):
- Card and table views with pagination
- Search and filters (department, solution, role, year)
- Export to CSV

---

## Pre-Release Development History

## [0.9.3] - 2026-01-16

### Added - MO-DB_Needs & True Alignment Analysis

**MO-DB_Needs Database** - Granular stakeholder survey responses:
- 2,049 records extracted from 47 solution stakeholder Excel files
- Survey data from 2018, 2020, 2022, 2024 cycles
- 40+ columns capturing full survey responses per stakeholder
- Fields include: resolution needs, frequency needs, coverage needs, degree need met

**Need Alignment Report Rewrite** - Now compares actual needs vs solution characteristics:
- **Before**: Counted stakeholders/SMEs (engagement quantity)
- **After**: Compares what stakeholders need vs what solutions provide

**New Scoring System (0-100%):**
| Category | Points | Criteria |
|----------|--------|----------|
| Degree Need Met | 40 | Avg stakeholder-reported satisfaction (survey field 3a-4) |
| Resolution Match | 20 | Solution horizontal_resolution meets/exceeds needs |
| Frequency Match | 20 | Solution temporal_resolution meets/exceeds needs |
| Coverage Match | 20 | Solution geographic_coverage meets/exceeds needs |

**Gap Identification** - Report now shows:
- Needs count per solution (from MO-DB_Needs)
- Average "% Met" from stakeholder responses
- Specific gaps where solution doesn't meet requirements

**Scripts Added:**
- `scripts/extract_needs_data.py` - Python extraction from stakeholder Excel files
- `docs/MO-DB_Needs_Schema.md` - Schema documentation

### Changed
- `stakeholder-solution-alignment.gs` - Rewrote `calculateNeedAlignment_()` for actual comparison
- `stakeholder-solution-alignment.gs` - Added `getAllNeeds()` function to read MO-DB_Needs
- `reports.html` - Updated methodology documentation for Need Alignment
- `reports.html` - Updated report description and data sources

---

## [0.9.2] - 2026-01-16

### Added - Report Transparency & Accuracy

**Methodology Documentation** - Each report card now includes collapsible "How is this calculated?" sections:
- **QuickLook CSV**: Explains data source columns and filtering logic
- **Quad Chart**: Explains quadrant data sources and date logic
- **Detailed Milestone**: Explains milestone and document status logic
- **Need Alignment**: Full scoring table (40 pts stakeholders, 25 pts SMEs, 20 pts multi-year, 15 pts content)
- **Stakeholder Coverage**: Explains contact/solution matching and coverage gap calculation
- **Engagement Funnel**: Explains stakeholder classification and funnel percentages
- **Department Reach**: Explains department/agency counting and broadest reach sorting

**Data Provenance Banners** - Report previews now show source data info:
- Displays which databases were queried (MO-DB_Solutions, MO-DB_Contacts)
- Shows record counts for each data source
- Clickable links to source sheets (when configured)

**Score Breakdown** - Need Alignment report improvements:
- Added "Score Breakdown" column showing points earned in each category
- Detailed scoring summary (e.g., "Stakeholders: 30/40 | SMEs: 25/25 | Multi-year: 20/20 | Content: 10/15")

### Changed
- `reports.html` - Added methodology CSS styling, provenance banner styling
- `stakeholder-solution-alignment.gs` - Score calculation now returns detailed breakdown

---

## [0.9.1] - 2026-01-16

### Added - Earthdata Content Sync
- **earthdata-sync.gs** - Automated scraper for earthdata.nasa.gov solution pages
  - `syncAllSolutionContent()` - Sync all solutions that have earthdata URLs
  - `syncSolutionContent(solutionId)` - Sync a single solution
  - `scheduledEarthdataSync()` - Handler for time-based triggers (set up in GAS)
  - Extracts: purpose_mission, thematic_areas, platform, temporal_frequency, horizontal_resolution, geographic_domain, societal_impact
  - Updates MO-DB_Solutions columns directly
  - Email notifications on sync completion
- **scripts/extract_earthdata_content.py** - Utility script for one-time extraction
  - Generates CSV for manual database merge
  - Creates simplified JSON for script properties

### Changed
- **stakeholder-solution-alignment.gs** - Improved content loading
  - `getSolutionContent_()` now falls back to MO-DB_Solutions columns
  - Added `loadSolutionContent(json)` for manual JSON loading
  - Added `clearSolutionContent()` to clear cached data
  - Added `checkSolutionContent()` to verify data availability
  - Reports now work even without script properties set

### Fixed
- Advanced stakeholder reports now display data by reading from database columns

---

## [0.9.0] - 2026-01-16

### Added - Advanced Stakeholder Reports
- **stakeholder-solution-alignment.gs** - Four advanced report generators
  - **Need Alignment (Implementation)**: Compare solution characteristics with stakeholder engagement
    - Shows purpose, thematic areas, alignment score
    - Stakeholders by role, department, survey year
  - **Stakeholder Coverage (SEP)**: Department/agency engagement across solutions
    - Coverage by department with contact counts
    - Identifies solutions without stakeholder engagement (gaps)
  - **Engagement Funnel (SEP)**: Track stakeholder progression through pipeline
    - Survey Submitter → Secondary SME → Primary SME
    - Conversion rates, multi-role stakeholders
    - Solutions needing Primary SME engagement
  - **Department Reach (Comms)**: Solution coverage across federal departments
    - Broadest reach solutions, department engagement matrix
- **reports.html** - Added Advanced Stakeholder Reports section
  - Color-coded badges (Implementation/SEP/Comms)
  - Funnel visualization, alignment scores
  - Preview all four report types

### Changed
- Updated reports.html with section headers and new styling
- Added funnel, alignment score, and badge CSS styles

---

## [0.8.0] - 2026-01-16

### Added - Reports Tab (Phase 7 - Shared Resources)
- **Reports tab** (`reports.html`) - report generation and export UI
  - Card-based interface for each report type
  - Preview reports before downloading
  - Filter options (cycle, default solutions only)
- **QuickLook CSV Generator** (`quicklook-generator.gs`)
  - Milestone status report for leadership
  - Columns: Solution, Cycle, Phase, ATP DG, F2I DG, ORR, Closeout, Memos
  - Export to Google Drive with optional email notification
  - `generateQuickLookData()` - get report data as JSON
  - `generateQuickLookCSV()` - get CSV string
  - `exportQuickLookToGoogleDrive()` - save to Drive
  - `exportQuickLookWithEmail()` - save and send notification
  - `scheduledQuickLookExport()` - for time-based triggers
- **Quad Chart Data Generator** (`quadchart-data.gs`)
  - Weekly status summary for meeting slides
  - Four quadrants: Updates, Milestones, Actions, Decisions
  - `generateQuadChartData()` - complete quad chart JSON
  - `generateQuadChartText()` - plain text for copy/paste
  - `getMilestoneSummaryForSlides()` - milestone-focused view
  - Configurable lookback/lookahead periods
- **Detailed Milestone Report**
  - Full milestone analysis with statistics
  - Breakdowns by phase, cycle, document status

### Changed
- **index.html** - added routing for reports tab
- **reports/README.md** files now reference implemented generators

---

## [0.7.0] - 2026-01-16

### Added - Schedule Tab & Document Tracking
- **Schedule tab** (`schedule.html`) - milestone timeline and Gantt chart views
  - **Timeline view**: Milestones grouped by month, filterable by view/type/cycle/search
  - **Gantt view**: Google Charts Gantt showing project phases
    - Formulation (ATP → F2I), Implementation (F2I → ORR), Operations (ORR → Closeout)
    - Progress bars based on current date
    - Phase dependencies visualized
  - Stats dashboard: Upcoming (90 days), Overdue, Completed (YTD), Total
  - View toggle in header, filters adapt per view
- **Document tracking** in MO-DB_Solutions
  - 9 document columns: project_plan, science_sow, ipa, icd, tta, atp_memo, f2i_memo, orr_memo, closeout_memo
  - Status logic: empty = not started, "in_work" = in progress, date = complete
- **Document Administration panel** in Implementation-NSITE
  - Shows document completion counts across filtered solutions
- **Document Status section** in solution detail modal
  - Grid showing all 9 documents with status badges

### Changed
- **Milestones consolidated** into MO-DB_Solutions (removed separate MO-DB_Milestones)
  - 4 date columns: atp_date, f2i_date, orr_date, closeout_date
  - Status derived from date: past = completed, future = planned, empty = not started
- **Implementation Milestones panel** updated to show ATP DG, F2I DG, ORR, Closeout
- **index.html** - added routing for schedule tab

### Known Issues
- Blank page on repeated tab clicks (~3 times) - needs investigation

---

## [0.6.0] - 2026-01-15

### Added - Milestones & Solution Picker
- **MO-DB_Milestones database** - extracted from Solution Status Quick Look Excel
  - 53 milestones across 30 solutions
  - Schema: milestone_id, solution_id, solution_name, cycle, type, category, phase, target_date, actual_date, status, notes, source, last_updated
  - Implementation milestone types: HQ Kickoff, PS Kickoff, ATP DG, F2I DG, ORR, Operation Start, Operation End, Closeout DG
- **milestones-api.gs** - data access layer with query functions
  - getAllMilestones, getMilestonesBySolution, getSolutionMilestoneSummary
  - getUpcomingMilestones, getOverdueMilestones, getMilestoneStats
- **extract_milestones.py** - Python script for milestone extraction from Quick Look Excel
- **Solution picker** - multi-select dropdown for filtering solutions
  - Database-driven defaults via `show_in_default` column in MO-DB_Solutions
  - Solutions grouped into "Default Selection" and "Other Solutions"
  - Quick actions: Default, All, None
  - Click outside to close

### Changed
- **Implementation-NSITE** - major enhancements
  - Milestones section added to solution detail modals (timeline, next milestone, stats)
  - Solution picker replaces simple filter dropdown
  - All stats panels now update based on selected/filtered solutions (Portfolio Overview, MO Milestones, Tracking Summary)
  - Removed Sync button from header
- **MO-DB_Solutions schema** - added `show_in_default` column (Y = show in default selection)
- **docs/DATA_SCHEMA.md** - documented show_in_default column

---

## [0.5.0] - 2026-01-15

### Added - Contacts Directory (Phase 4)
- **MO-DB_Contacts database** - populated from 47 stakeholder Excel files
  - 4,221 contact-solution records, 423 unique contacts
  - Schema: contact_id, first_name, last_name, email, primary_email, phone, department, agency, organization, solution, role, survey_year, need_id, notes, last_updated
  - Data cleaning: email normalization, phone formatting (xxx-xxx-xxxx), name parsing, department standardization
- **contacts-api.gs** - comprehensive shared resource with 20+ query functions
  - Core queries: by solution, email, name, role, department, agency, survey year
  - Relationship queries: getContactSolutions, getContactsAcrossSolutions, getRelatedContacts
  - Statistics: getContactStats, getMostEngagedContacts, getStakeholderCountsBySolution
  - Dashboard helpers: getSolutionStakeholderSummary, getMailingList
- **contacts.html** - Contacts Directory tab UI
  - Stats dashboard: total contacts, departments, solutions, multi-solution contacts
  - Search and filters: department, solution, role, survey year
  - Card view and table view with pagination
  - Contact detail modal with solutions, roles, years, related contacts
  - Export to CSV functionality
- **contacts-menu.gs** - maintenance menu for MO-DB_Contacts sheet
  - Custom menu: Add Contact, Update Contact, Add Note, Find Contact, Find by Solution
  - Utilities: Validate Emails, Remove Duplicates, Sort by Solution

### Changed
- **Implementation-NSITE** - stakeholder integration in solution modals
  - Stakeholder section shows total contacts, role breakdown, primary SMEs, agencies
  - Async loading of stakeholder data per solution
- **index.html** - added routing for contacts tab
- **navigation.html** - contacts tab now active (was coming soon)

### Removed
- Debug files from deploy/: diagnose-null.gs, test-frontend.html, test-helpers.gs, troubleshoot-solutions.gs
- Intermediate CSV files from stakeholder-mapping/

---

## [0.4.0] - 2026-01-15

### Added - Implementation-NSITE (Phase 4)
- **Implementation-NSITE viewer** - complete solution tracking dashboard
  - Stats dashboard: total solutions, operational, implementation, formulation counts
  - Filter bar: cycle (C1-C6), phase, solution group, search
  - Solutions organized by cycle with collapsible sections
  - Solution cards with name, ID, phase badge, lead info, status summary
  - Quick action buttons: Drive folder, Earthdata page, Details
- **solutions-api.gs** - data access layer for MO-DB_Solutions
- **MO-DB_Solutions database** - 37 solutions with 49 columns in 13 logical groups

### Added - Supporting Scripts
- `scripts/reorganize-solutions-csv.py` - CSV column consolidation and renaming
- `scripts/merge-earthdata-to-csv.py` - merge earthdata content into Solutions CSV
- `scripts/fetch-earthdata-status.py` - fetch status from earthdata.nasa.gov pages
- `scripts/create-stakeholder-hyperlinks.gs` - Google Sheets stakeholder linking
- `scripts/link-contractual-docs.gs` - contractual document linking from Drive

### Changed
- **Naming convention**: Viewers now use "-NSITE" suffix ("in sight" wordplay)
  - Implementation-Viewer → Implementation-NSITE
  - SEP-Viewer → SEP-NSITE
  - Comms-Viewer → Comms-NSITE
- Navigation tabs updated with new naming and tooltips
- Platform index.html loads Implementation-NSITE dynamically
- Documentation updated to reflect NSITE naming pattern

### Data
- MO-DB_Solutions populated with data from:
  - GitHub nsite-mo-implementation issues (summary cards)
  - earthdata.nasa.gov solution pages (content and status)
  - Stakeholder list mappings
- Column groups: Identity, Lifecycle, Flags, Solution Lead, RA Representative,
  Earth Action, Stakeholder Engagement, Other Team, Content, Documentation Links,
  External Resources, SEP Materials, Status

---

## [0.3.0] - 2026-01-15

### Added - Quick Update Form (Phase 3)
- Quick Update Form with solution dropdown and meeting selection
- Submit updates to Internal Planning (Monday) and/or SEP Strategy (Tuesday) meetings
- Update type selection (Milestone, Action, General)
- SOLUTION_HEADINGS mapping for exact document heading matching
- Confirmation message with direct links to updated document location
- Double-submission prevention

### Changed
- UI redesign: Update textarea at top (primary field)
- Compact options row for Solution/Meeting/Type selections
- Separated Clear and Submit buttons to prevent accidental erasure
- Security notice moved to bottom (subtle)
- Added "Coming soon" notice pattern for future features

### Documentation
- Added UX pattern documentation for "Coming soon" notices
- Updated component READMEs with Coming Soon sections
- Updated INTEGRATION_PLAN.md with feature roadmap per component

---

## [0.2.0] - 2026-01-14

### Added - Platform Foundation (Phase 1)
- Platform shell with header, navigation, and footer
- Tab navigation system (Implementation, SEP, Comms, Quick Update, etc.)
- Routing via URL parameters
- Shared CSS variables and base styles
- Placeholder pages for all components
- Server-side includes for modular HTML

---

## Migration History

This repository consolidates code from multiple legacy repositories:

| Legacy Repo | Migration Status | Notes |
|-------------|------------------|-------|
| `nsite-viewer` | **Complete** | Quick Update Form → `src/quick-update/` |
| `nsite-mo-implementation` | **Complete** | Solution data → MO-DB_Solutions; UI → Implementation-NSITE |
| `nsite-SEPViewer` | **Complete** | SEP Viewer → SEP-NSITE with database-only approach |
| `snwg-automation/SolutionFlow` | Partial | Parsers pending → `parsers/`, `storage/` |

---

## Version History

### v0.1.0 - 2026-01-14
- Repository initialized
- Documentation structure created
- Migration planning complete
