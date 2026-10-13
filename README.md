# requesty-usage-plugin

[OpenCode](https://opencode.ai) sidebar usage for two providers, switched by the
model you have selected:

- **OpenCode Go** (`opencode-go` models) — rolling, weekly, and monthly plan usage.

  ```text
  Rolling  ████░░░░░░   40%  1h 13m
  Weekly   ████████░░   77%  6h 9m
  Monthly  ██████░░░░   64%  7d 16h
  ```

- **Requesty** (`requesty` models) — monthly budget spend and what's left.

  ```text
  Requesty ███████░░░  $13.95 left
  ```

  When the API key has no monthly limit configured in Requesty, the row shows
  month-to-date spend instead:

  ```text
  Requesty  $26.05 this month
  ```

Any other provider (Ollama, the `opencode` provider, …) renders nothing. The
widget follows the selected model live, shows a loading state while switching,
and only polls the source currently on screen.

## Requirements

- OpenCode V2
- For Go usage: OpenCode Go connected (the `opencode-go` integration)
- For Requesty: a `requesty` provider configured with an API key in
  `opencode.json(c)`
- About 34 columns of sidebar width

## Install

```sh
opencode plugin add github:ionutale/requesty-usage-plugin
```

Or add it to the `plugins` list in `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:ionutale/requesty-usage-plugin"],
}
```

## Options

```jsonc
{
  "plugins": [
    {
      "package": "github:ionutale/requesty-usage-plugin",
      "options": {
        "providerID": "requesty", // provider to read the Requesty API key from (default "requesty")
        "budget": 30,             // USD budget used when the Requesty key has no monthly limit
      },
    },
  ],
}
```

## What you see

| Sidebar shows | Meaning |
| - | - |
| `Rolling ████░░░░░░  40%  1h 13m` | Go short-term burst limit; counts down to its reset |
| `Weekly ████████░░  77%  6h 9m` | Go weekly allotment; counts down to the weekly boundary |
| `Monthly ██████░░░░  64%  7d 16h` | Go monthly allotment; counts down to the subscription reset |
| `Requesty ███████░░░  $13.95 left` | Requesty monthly limit (from Requesty or the `budget` option); bar = percent used |
| `Requesty  $26.05 this month` | Requesty key has no monthly limit; spend only |
| `Requesty: no API key` | No Requesty provider/API key found. Check the `providerID` option |
| `Requesty: check API key` | Requesty rejected the key (HTTP 401) |
| `Requesty: permission denied` | Requesty denied usage access for the key (HTTP 403) |
| `Go usage: not connected` | OpenCode Go is not connected |
| `Go usage: check API key` | The Go usage API rejected the key (HTTP 401) |
| `Go usage: Go plan required` | The key has no Go subscription (HTTP 403) |
| `…: unreachable` | Network or API problem with no usable cached data |
| Dimmed values | Showing the last successful fetch (up to 5 minutes) after a transient/upstream failure; credential errors (`no API key`, `check API key`, `permission denied`) surface immediately |

## How it works

```text
TUI (sidebar slot) ──RPC──▶ server plugin ──HTTPS──▶ opencode.ai / api-v2.requesty.ai
```

- The **server plugin** registers two RPCs: `go-usage` (credential from the
  `opencode-go` integration, `GET https://opencode.ai/zen/go/v1/usage`) and
  `requesty-budget` (API key from the provider config,
  `GET https://api-v2.requesty.ai/v1/manage/apikey/self`). Both cache for
  15 seconds and, on a transient/upstream failure only, serve stale data for up
  to 5 minutes; `no_credential`, `unauthorized`, and `forbidden` surface
  immediately instead of falling back to stale data. Credentials never reach
  the TUI and are never written to logs.
- The **TUI plugin** reads the selected model's provider
  (`context.ui.model.current()`), renders the matching block in `sidebar.footer`,
  and polls only that source every 30 seconds.

## Development

```sh
pnpm install
pnpm test        # unit tests
pnpm typecheck   # tsc --noEmit
pnpm build:tui   # rebuild dist/tui.js after editing src/tui.tsx
pnpm smoke       # live Requesty call; uses REQUESTY_API_KEY or your opencode.json key
pnpm smoke:go    # live OpenCode Go call; uses OPENCODE_API_KEY or your auth.json
```

The published `./tui` entry is the prebuilt `dist/tui.js`. OpenTUI's Solid
plugin does not compile JSX inside `node_modules`, so packaged installs need
this prebuilt file.
