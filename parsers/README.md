# Parsers

Document parsers that extract data from source documents.

## Parsers

| Parser | Source Document | Output |
|--------|-----------------|--------|
| `internal-agenda-parser.gs` | Internal Agenda (Weekly Planning Notes) | Solutions, Actions, Milestones |
| `sep-agenda-parser.gs` | SEP Agenda (Weekly Meeting Notes) | SEP activities, Touchpoints |
| `comms-tracker-parser.gs` | Comms Tracking (Story Tracking Workbook) | Stories, Pipeline status |

## Shared Utilities

| File | Purpose |
|------|---------|
| `parser-utils.gs` | Common parsing functions, date handling, text normalization |

## Design Principles

1. **Flexible Parsing**: Detect patterns, not rigid structure
2. **Graceful Degradation**: Handle missing or malformed data
3. **Audit Trail**: Track source tab and parse timestamp
4. **Idempotent**: Running twice produces same result

## Migration Source
- `snwg-automation/SolutionFlow/solutionFlowParser.gs` → `internal-agenda-parser.gs`

## Development

See [ARCHITECTURE.md](../ARCHITECTURE.md) for system design.
See [INTEGRATION_PLAN.md](../INTEGRATION_PLAN.md) Phases 2, 4, 5 for parser implementation details.
