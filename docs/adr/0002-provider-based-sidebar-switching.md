# ADR 0002: Switch the sidebar source by selected model

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

With both sources in one plugin, the sidebar must decide which one to show. The
TUI context exposes `context.ui.model.current()` returning
`{ providerID, modelID, variant? }`, documented as reactive when read inside a
Solid computation.

## Decision

Render based on the selected model's provider id:

- `opencode-go` → the three Go usage rows;
- `requesty` → the Requesty budget row;
- anything else, or no model selected → nothing is rendered.

Switching models shows a loading state for the new source, fetches it
immediately, then polls only that source every 30 seconds. In-flight responses
from a source that is no longer selected are discarded.

## Consequences

- No extra configuration; the widget follows the user's model choice live.
- Polling volume stays at one API per 30 s, never two.
- Hiding for unknown providers means a future provider needs an explicit
  mapping in `src/source.ts` and a matching block in `src/tui.tsx`.
