# opencode-requesty-usage-plugin

[OpenCode](https://opencode.ai) sidebar row for your [Requesty](https://requesty.ai) monthly budget.

```text
Requesty ███████░░░  $13.95 left
```

When the API key has no monthly limit configured in Requesty, the row shows
month-to-date spend instead:

```text
Requesty  $26.05 this month
```

## Requirements

- OpenCode V2
- A Requesty provider configured in `opencode.json(c)` with an API key
  (e.g. `provider.requesty.options.apiKey`)
- About 32 columns of sidebar width

## Install

```sh
opencode plugin add github:ionutale/opencode-requesty-usage-plugin
```

Or add it to the `plugins` list in `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:ionutale/opencode-requesty-usage-plugin"],
}
```

## Options

```jsonc
{
  "plugins": [
    {
      "package": "github:ionutale/opencode-requesty-usage-plugin",
      "options": {
        "providerID": "requesty", // provider to read the API key from (default "requesty")
        "budget": 30,             // USD budget used when the key has no monthly limit
      },
    },
  ],
}
```

## What you see

| Sidebar shows | Meaning |
| - | - |
| `Requesty ███████░░░  $13.95 left` | The key has a monthly limit (set in Requesty or via the `budget` option). Bar = percent used; green < 50%, yellow 50–74%, red ≥ 75%. |
| `Requesty  $26.05 this month` | The key has no monthly limit; only month-to-date spend is known. |
| `Requesty: no API key` | No Requesty provider/API key found. Check the `providerID` option. |
| `Requesty: check API key` | Requesty rejected the key (HTTP 401). |
| `Requesty: permission denied` | Requesty denied usage access for the key (HTTP 403). |
| `Requesty: unreachable` | Network or API problem with no usable cached data. |
| Dimmed values | Showing the last successful fetch (up to 5 minutes) after a failed refresh. |

## How it works

```text
TUI (sidebar slot) ──RPC──▶ server plugin ──HTTPS──▶ api-v2.requesty.ai
```

- The **server plugin** reads the Requesty API key from the provider
  configuration (`ctx.provider.get`), calls
  `GET https://api-v2.requesty.ai/v1/manage/apikey/self`, and caches the result
  for 15 seconds. Your API key is never exposed to the TUI and is never written
  to logs.
- The **TUI plugin** calls the typed RPC method `get` (id `requesty-budget`)
  every 30 seconds and renders `sidebar.footer`.
- `monthly_spend` / `monthly_limit` are Requesty's own numbers for the current
  month; `monthly_limit` of `0` means unlimited.

## Development

```sh
pnpm install
pnpm test        # unit tests
pnpm typecheck   # tsc --noEmit
pnpm build:tui   # rebuild dist/tui.js after editing src/tui.tsx
pnpm smoke       # live call; uses REQUESTY_API_KEY or your opencode.json key
```

The published `./tui` entry is the prebuilt `dist/tui.js`. OpenTUI's Solid
plugin does not compile JSX inside `node_modules`, so packaged installs need
this prebuilt file.

To test a local checkout, add its path to the `plugins` list of your global
`opencode.json(c)`, run `opencode service restart`, and open a session.
