# ADR 0001: Merge OpenCode Go usage into requesty-usage-plugin

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

Two plugins rendered usage in the session sidebar: `opencode-go-usage-plugin`
(rolling/weekly/monthly Go plan bars) and `requesty-usage-plugin` (Requesty
monthly budget). They occupied the same `sidebar.footer` slot, shipped the same
service/RPC/TUI architecture, and duplicated display helpers (bar rendering,
color thresholds, RPC error text).

## Decision

Merge the Go usage feature into `requesty-usage-plugin` and retire
`opencode-go-usage-plugin` from the user's configuration. The merged plugin:

- keeps both RPCs (`go-usage`, `requesty-budget`) registered by one server plugin;
- keeps each source's service, cache (15 s TTL, 5 min stale), and error mapping
  unchanged;
- shows exactly one source at a time, chosen by the selected model's provider.

The old repository is left in place as history but is no longer installed.

## Consequences

- One plugin to install, document, and maintain; shared display helpers live in
  `src/shared.ts` instead of being duplicated.
- The merged plugin must keep both credentials' handling isolated: the Go key
  comes from the `opencode-go` integration, the Requesty key from the provider
  config; neither is ever sent to the TUI.
- Rolling back means reinstalling `github:ionutale/opencode-go-usage-plugin`.
