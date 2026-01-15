# Changelog

All notable changes to the MO-Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial mono-repo structure
- Master architecture documentation
- Integration plan (8 phases)
- Deprecation notices for legacy repos

### Planned
- Phase 1: Platform Foundation
- Phase 2: Implementation-Viewer
- Phase 3: Quick Update Form
- Phase 4: SEP-Viewer
- Phase 5: Comms-Viewer
- Phase 6: Shared Resources
- Phase 7: Automation & Sync
- Phase 8: Polish & Deploy

---

## Migration History

This repository consolidates code from multiple legacy repositories:

| Legacy Repo | Migration Status | Notes |
|-------------|------------------|-------|
| `nsite-viewer` | Pending | Quick Update Form → `src/quick-update/` |
| `nsite-SEPViewer` | Pending | SEP Viewer → `src/sep-viewer/` |
| `snwg-automation/SolutionFlow` | Pending | Implementation → `src/implementation-viewer/`, `parsers/`, `storage/` |

---

## Version History

### v0.1.0 - 2026-01-14
- Repository initialized
- Documentation structure created
- Migration planning complete
