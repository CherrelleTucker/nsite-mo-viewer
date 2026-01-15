# Legacy

Migration notes and references to deprecated repositories.

## Deprecated Repositories

| Old Repo | Status | New Location |
|----------|--------|--------------|
| `nsite-viewer` | Archived | `src/quick-update/` |
| `nsite-SEPViewer` | Archived | `src/sep-viewer/` |
| `snwg-automation/SolutionFlow` | Migrated | `src/implementation-viewer/`, `parsers/`, `storage/` |

## Migration Notes

### nsite-viewer → quick-update

Key files migrated:
- `Code.gs` → `src/quick-update/submission-handlers.gs`
- `quickUpdateWebApp.html` → `src/quick-update/quick-update.html`

Changes made:
- Embedded in platform shell (no longer standalone)
- Added support for multiple document types
- Integrated with unified navigation

### nsite-SEPViewer → sep-viewer

Key files migrated:
- `src/viewer/` → `src/sep-viewer/`

Changes made:
- Integrated with platform shell
- Shared styling with other viewers
- Connected to unified database

### SolutionFlow → implementation-viewer + parsers + storage

Key files migrated:
- `solutionFlowParser.gs` → `parsers/internal-agenda-parser.gs`
- `solutionFlowStorage.gs` → `storage/database-setup.gs`
- `solutionFlowAPI.gs` → `storage/database-api.gs`
- `implementationDashboard.html` → `src/implementation-viewer/implementation.html`

Changes made:
- Split monolithic SolutionFlow into separate concerns
- Standardized naming
- Integrated with platform shell

## Reference Links

- [nsite-viewer deprecation notice](https://github.com/CherrelleTucker/nsite-viewer)
- [nsite-SEPViewer deprecation notice](https://github.com/NASA-IMPACT/nsite-SEPViewer)
- [snwg-automation rename notice](https://github.com/CherrelleTucker/snwg-automation)
