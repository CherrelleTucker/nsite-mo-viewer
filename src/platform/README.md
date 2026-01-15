# Platform

Core platform shell providing navigation, routing, and shared infrastructure.

## Files

| File | Purpose |
|------|---------|
| `Code.gs` | Main entry point, doGet() handler, routing |
| `index.html` | Platform HTML shell with tab navigation |
| `navigation.html` | Tab navigation component |
| `styles.css` | Shared CSS variables and base styles |

## Routing

The platform uses URL parameters for routing:

```
?page=implementation  → Implementation-Viewer
?page=sep            → SEP-Viewer
?page=comms          → Comms-Viewer
?page=update         → Quick Update Form
```

## Development

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for system design.
See [INTEGRATION_PLAN.md](../../INTEGRATION_PLAN.md) Phase 1 for implementation details.
