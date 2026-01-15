# Quick Update Form

Embedded input interface for submitting updates to source documents.

## Focus
Allow users to submit updates without leaving the MO-Viewer dashboard.

## Data Targets
- Internal Agenda (for solution updates)
- SEP Agenda (for stakeholder updates)
- Comms Tracking (for story updates)

## Features
- Select target document type
- Select solution/stakeholder/story
- Choose update type (Action, Milestone, General)
- Submit directly to source document
- Confirmation with link to updated location

## Files

| File | Purpose |
|------|---------|
| `quick-update.html` | Form template |
| `quick-update.js` | Form logic and validation |
| `submission-handlers.gs` | Server-side submission logic |

## Migration Source
- `nsite-viewer/src/web-app/`
- `snwg-automation/SolutionFlow/quickUpdate*.gs`

## Development

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for system design.
See [INTEGRATION_PLAN.md](../../INTEGRATION_PLAN.md) Phase 3 for implementation details.
