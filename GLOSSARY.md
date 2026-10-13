# Glossary

- **Source** — one usage feed shown in the sidebar: `requesty` or `opencode-go`.
  Chosen from the selected model's provider (`src/source.ts`).
- **Selected model** — the model of the current prompt, read reactively from
  `context.ui.model.current()`. Its `providerID` picks the source.
- **Window** — a Go usage allowance shaped as `{ status, percent, resetsAt }`,
  keyed by `rolling` (burst), `weekly`, `monthly`. See `UsageWindow`.
- **Budget** — Requesty's monthly spend figures for an API key:
  `spend`, `limit`, `left`, `percent`. `limitSource` says where the denominator
  came from: `requesty` (key has a monthly limit), `config` (the plugin's
  `budget` option), or `none` (unlimited; spend-only row).
- **Stale** — a cached value served after a failed refresh. Shown dimmed for up
  to 5 minutes (`*_STALE_MAX_AGE_MS`).
- **RPC** — the typed server↔TUI channel: `go-usage.get` and
  `requesty-budget.get`. The TUI polls only the active source's RPC.
- **Slot** — the `sidebar.footer` insertion point the TUI plugin renders into.
