# Storage

Database layer using Google Sheets as a cache.

## Key Principle

**The database is a cache, not the source of truth.**

Source documents (Internal Agenda, SEP Agenda, Comms Tracking) remain authoritative. The database provides fast, queryable access to parsed data.

## Files

| File | Purpose |
|------|---------|
| `database-setup.gs` | Initialize database structure, create tables |
| `database-api.gs` | CRUD operations, query functions |
| `database-sync.gs` | Sync data from source documents |

## Database Tables

| Table | Purpose |
|-------|---------|
| Solutions | Current state of all solutions |
| Stakeholders | Stakeholder records and touchpoint status |
| Stories | Communications pipeline entries |
| Actions | Action items from all sources |
| Milestones | Date-based milestones per solution |
| UpdateHistory | Audit log of all updates |

## Sync Strategy

- **Hourly**: Automated time-based trigger
- **On-Demand**: "Sync to MO-Viewer" menu in source documents
- **Incremental**: Only process tabs newer than last sync

## Migration Source
- `snwg-automation/SolutionFlow/solutionFlowStorage.gs`
- `snwg-automation/SolutionFlow/solutionFlowAPI.gs`

## Development

See [ARCHITECTURE.md](../ARCHITECTURE.md) for database schema.
See [INTEGRATION_PLAN.md](../INTEGRATION_PLAN.md) Phase 7 for sync implementation.
