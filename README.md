# NSITE MO Viewer

**Configurable Dashboard Platform for Project/Stakeholder Management**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.5.2-blue.svg)](CHANGELOG.md)

---

## Overview

NSITE MO Viewer is a **white-label dashboard platform** that consolidates solution tracking, stakeholder engagement, and communications management into a single interface. Originally built for **NSITE MO** (NASA's Support to the satellite Needs working group Implementation TEam Management Office), it is designed for easy deployment and customization by other teams.

### Key Features

- **White-Label Ready** — Customize app name, page names, colors, and terminology via configuration
- **No Code Changes Required** — All customization through a config sheet
- **Google Workspace Native** — Built on Google Apps Script with Sheets as database
- **Passphrase + Whitelist Auth** — Works with any Google account (NASA.gov, personal, etc.)

**Current Deployment:** NSITE MO team (restricted access)

### Platform Components

All component names are **configurable** through MO-DB_Config. The default NSITE names represent "in sight" - making data visible and accessible.

| Component | Focus | Status | Description |
|-----------|-------|--------|-------------|
| **Page 1** (Implementation) | Solutions/Projects | **Complete** | Track solution status, milestones, and assignments |
| **Page 2** (SEP) | People/Stakeholders | **Complete** | Manage stakeholder engagement pipeline and touchpoints |
| **Page 3** (Comms) | Stories/Communications | **Complete** | Track story pipeline and communications coverage |
| **Top Sheet** | Overview | **Complete** | Consolidated milestone view across all solutions |
| **Quick Update** | Input | **Complete** | Submit updates to source documents |
| **Contacts Directory** | Stakeholders | **Complete** | Searchable stakeholder database |
| **Reports** | Analytics | **Complete** | Historical updates, engagement reports |
| **Team** | Internal | **Complete** | Team profiles, meetings, documents |
| **Schedule** | Timeline | **Complete** | Milestone timeline visualization |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       NSITE MO VIEWER PLATFORM                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐           │
│  │ Implementation- │ │   SEP-Viewer    │ │  Comms-Viewer   │           │
│  │     Viewer      │ │                 │ │                 │           │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Shared Resources │ Quick Update Form                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Database (Cache)   │
                         │   Google Sheets     │
                         └─────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             Internal Agenda   SEP Agenda    Comms Tracking
               (Mondays)       (Tuesdays)     (Ongoing)

                         SOURCES OF TRUTH
```

---

## Repository Structure

**IMPORTANT:** `deploy/` is the **single source of truth** for all web app code. White-labeling is achieved through MO-DB_Config configuration, not separate code directories.

```
nsite-mo-viewer/
├── README.md                     # This file
├── CLAUDE.md                     # AI assistant instructions
├── ARCHITECTURE.md               # Master architecture document
├── CHANGELOG.md                  # Version history
├── LICENSE                       # MIT License
│
├── deploy/                       # SINGLE SOURCE - Copy to NSITE-MO-Viewer (Apps Script)
│   ├── Code.gs                   # Main routing, auth, session management
│   ├── index.html                # SPA shell, navigation, global utilities
│   ├── *.html                    # Page templates (implementation, sep, comms, etc.)
│   └── *-api.gs                  # Thin wrappers calling MoApi library
│
├── library/                      # Copy to MO-APIs Library (Apps Script)
│   ├── config-helpers.gs         # Shared utilities, database helpers
│   └── *-api.gs                  # Full API implementations
│
├── setup-wizard/                 # Creates new team instances via config sheets
│
├── docs/                         # Documentation
│   ├── DATA_SCHEMA.md
│   ├── STYLE_GUIDE.md
│   └── BUG_TRACKER.md
│
├── database-files/               # Local Excel/CSV database backups
├── scripts/                      # Python import/processing scripts
├── extensions/                   # Browser extensions
└── training/                     # Training materials
```

---

## Current Status

**Last Updated:** 2026-01-30 | **Version:** 2.3.0

| Phase | Component | Status |
|-------|-----------|--------|
| Phase 1 | Platform Foundation | **Complete** |
| Phase 2 | Implementation-NSITE | **Complete** |
| Phase 3 | Quick Update Form | **Complete** |
| Phase 4 | Contacts Directory | **Complete** |
| Phase 5 | SEP-NSITE | **Complete** |
| Phase 5b | Actions-NSITE | **Complete** |
| Phase 6 | Comms-NSITE | **Complete** |
| Phase 7 | Shared Resources | **Complete** |
| Phase 8 | **White-Label System** | **Complete** |

### Data Sources

| Database | Purpose | Status |
|----------|---------|--------|
| **MO-DB_Solutions** | Solution data (49 columns, ~37 solutions) | **Populated** |
| **MO-DB_Contacts** | Stakeholder contacts (423 unique, 47 solutions) | **Populated** |
| **MO-DB_Milestones** | Milestone tracking (56 milestones, 32 solutions) | **Populated** |
| **MO-DB_Agencies** | Organization hierarchy (43 agencies) | **Populated** |
| **MO-DB_Engagements** | Engagement logging (17 columns) | **Populated** |
| **MO-DB_Needs** | Stakeholder survey responses (2,049 records) | **Populated** |
| **MO-DB_Actions** | Action item tracking (15 columns) | **Populated** |
| **MO-DB_Config** | Configuration settings | **Active** |

---

## White-Label Deployment

The platform supports full customization for other teams. All branding and terminology is configured through the **MO-DB_Config** Google Sheet.

### Configurable Elements

| Element | Config Keys | Example |
|---------|-------------|---------|
| **App Name** | `APP_NAME`, `ORG_NAME`, `APP_TAGLINE` | "ESDIS Viewer" |
| **Page Names** | `PAGE_1_NAME`, `PAGE_2_NAME`, `PAGE_3_NAME` | "Projects", "People", "Promos" |
| **Page Icons** | `PAGE_1_ICON`, `PAGE_2_ICON`, `PAGE_3_ICON` | Material icon names |
| **Colors** | `COLOR_PRIMARY`, `COLOR_ACCENT`, `COLOR_PAGE_*` | Hex colors |

### Example: ESDIS Configuration

```
APP_NAME = ESDIS Viewer
ORG_NAME = ESDIS
PAGE_1_NAME = Projects
PAGE_2_NAME = Stakeholders
PAGE_3_NAME = Outreach
COLOR_PRIMARY = #1A5F2A
```

### Deployment Checklist

1. **Copy databases** — Create your own MO-DB_* Google Sheets
2. **Create MO-DB_Config** — Add sheet IDs + branding keys
3. **Copy Apps Script projects** — MO-APIs Library + Web App
4. **Set Script Properties** — Point `CONFIG_SHEET_ID` to your config
5. **Set up access** — Configure passphrase + email whitelist
6. **Deploy** — Library first, then web app

See [CLAUDE.md](CLAUDE.md) for detailed configuration documentation.

---

## Getting Started (NSITE MO)

### Prerequisites

- Google account with access to NSITE MO Google Workspace
- Access to MO-DB_Solutions Google Sheet
- Access to MO-DB_Config Google Sheet

### Deployment

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed deployment instructions.

**Quick Start:**
1. Create a new Google Apps Script project
2. Copy all files from `deploy/` folder to the project
3. Set `CONFIG_SHEET_ID` in Script Properties to point to MO-DB_Config
4. Ensure MO-DB_Config has `SOLUTIONS_SHEET_ID` pointing to MO-DB_Solutions
5. Deploy as Web App

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and design decisions |
| [INTEGRATION_PLAN.md](INTEGRATION_PLAN.md) | Implementation roadmap and phases |
| [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | Installation and configuration |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user documentation |
| [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md) | Database schema reference |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | API documentation |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Backend | Google Apps Script |
| Shared Library | MO-APIs Library (Apps Script Library, identifier: `MoApi`) |
| Database | Google Sheets (cache layer) |
| Source Documents | Google Docs |
| Authentication | Google OAuth 2.0 |
| Hosting | Google Apps Script Web App |

### Library Architecture

The **MO-APIs Library** provides centralized data access for all MO-DB databases:

```
┌──────────────────────┐     ┌──────────────────────┐
│  NSITE-MO-Viewer     │     │  Container Scripts   │
│  (thin wrappers)     │     │  (MO-DB_Updates, etc)│
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           └──────────┬─────────────────┘
                      ▼
           ┌──────────────────────┐
           │   MO-APIs Library    │
           │   (identifier: MoApi)│
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │    MO-DB_Config      │
           │  (database sheet IDs)│
           └──────────────────────┘
```

See `library/README.md` for setup and usage details.

---

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [nsite-mo-implementation](https://github.com/NASA-IMPACT/nsite-mo-implementation) | Solution tracking via GitHub Issues |
| [nsite-mo-stakeholders](https://github.com/NASA-IMPACT/nsite-mo-stakeholders) | Stakeholder tracking via GitHub Issues |
| [nsite-mo-sep](https://github.com/NASA-IMPACT/nsite-mo-sep) | SEP tracking via GitHub Issues |
| [nsite-mo-automation](https://github.com/CherrelleTucker/nsite-mo-automation) | Non-viewer automation scripts |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- NSITE Management Office team
- NASA IMPACT

---

## Contact

**NSITE MO Program Coordinator**

For questions or support, open an issue on this repository.
