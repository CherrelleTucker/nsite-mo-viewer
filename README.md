# MO-Viewer

**Unified Dashboard Platform for NSITE MO**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

MO-Viewer is a unified dashboard platform for the **NSITE MO** (NASA's Support to the satellite Needs working group Implementation TEam Management Office) that consolidates solution tracking, stakeholder engagement, and communications management into a single interface.

### Platform Components

| Component | Focus | Description |
|-----------|-------|-------------|
| **Implementation-Viewer** | Solutions/Projects | Track solution status, milestones, and DAAC assignments |
| **SEP-Viewer** | People/Stakeholders | Manage stakeholder engagement pipeline and touchpoints |
| **Comms-Viewer** | Stories/Communications | Track story pipeline and communications coverage |
| **Quick Update Form** | Input | Submit updates to source documents from within the dashboard |
| **Shared Resources** | Cross-cutting | Contacts, reports, schedules, action tracker, templates |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MO-VIEWER PLATFORM                            │
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

```
nsite-mo-viewer/
├── README.md                     # This file
├── ARCHITECTURE.md               # Master architecture document
├── INTEGRATION_PLAN.md           # Implementation roadmap
├── CHANGELOG.md                  # Version history
├── LICENSE                       # MIT License
│
├── docs/                         # Documentation
│   ├── DATA_SCHEMA.md
│   ├── SETUP_GUIDE.md
│   ├── USER_GUIDE.md
│   └── API_REFERENCE.md
│
├── src/                          # Source code
│   ├── platform/                 # Platform shell & navigation
│   ├── implementation-viewer/    # Solution tracking view
│   ├── sep-viewer/               # Stakeholder engagement view
│   ├── comms-viewer/             # Communications tracking view
│   ├── quick-update/             # Embedded update form
│   └── shared/                   # Cross-cutting components
│
├── parsers/                      # Document parsers
│   ├── internal-agenda-parser.gs
│   ├── sep-agenda-parser.gs
│   └── comms-tracker-parser.gs
│
├── storage/                      # Database layer
│   ├── database-setup.gs
│   ├── database-api.gs
│   └── database-sync.gs
│
├── reports/                      # Report generators
│   ├── quicklook-generator.gs
│   └── quadchart-data.gs
│
├── config/                       # Configuration
│   └── script-properties.md
│
├── tests/                        # Test files
│   └── README.md
│
└── legacy/                       # Migration notes
    └── README.md
```

---

## Getting Started

### Prerequisites

- Google account with access to NSITE MO Google Workspace
- Access to source documents (Internal Agenda, SEP Agenda, Comms Tracking)

### Deployment

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed deployment instructions.

**Quick Start:**
1. Create a new Google Apps Script project
2. Copy files from `src/platform/` to the project
3. Configure Script Properties with document IDs
4. Deploy as Web App

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
| Database | Google Sheets (cache layer) |
| Source Documents | Google Docs |
| Authentication | Google OAuth 2.0 |
| Hosting | Google Apps Script Web App |

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
