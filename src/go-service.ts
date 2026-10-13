import { UsageParseError, parseUsageResponse, type UsageResult } from "./go-usage"

export const GO_USAGE_ENDPOINT = "https://opencode.ai/zen/go/v1/usage"
export const GO_CACHE_TTL_MS = 15_000
export const GO_STALE_MAX_AGE_MS = 300_000

export type GoUsageErrorType = "no_credential" | "unauthorized" | "forbidden" | "upstream"

export class GoUsageError extends Error {
  readonly type: GoUsageErrorType

  constructor(type: GoUsageErrorType, message: string) {
    super(message)
    this.name = "GoUsageError"
    this.type = type
  }
}

export type GoUsageServiceOptions = {
  resolveKey: () => Promise<string | undefined>
  fetch?: typeof globalThis.fetch
  now?: () => number
}

export type GoUsageService = {
  get: (signal?: AbortSignal) => Promise<UsageResult>
}

export function createGoUsageService(options: GoUsageServiceOptions): GoUsageService {
  let cache: { result: UsageResult; at: number } | undefined
  const now = options.now ?? Date.now
  const doFetch = options.fetch ?? globalThis.fetch

  return {
    async get(signal) {
      if (cache && now() - cache.at < GO_CACHE_TTL_MS) return cache.result

      try {
        const key = await options.resolveKey()
        if (!key) throw new GoUsageError("no_credential", "OpenCode Go is not connected")

        const response = await doFetch(GO_USAGE_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
            "User-Agent": "requesty-usage-plugin/0.2.0",
          },
          signal,
        })

        if (response.status === 401) {
          throw new GoUsageError("unauthorized", "usage API rejected the OpenCode Go key (HTTP 401)")
        }
        if (response.status === 403) {
          throw new GoUsageError("forbidden", "usage API requires an OpenCode Go subscription (HTTP 403)")
        }
        if (!response.ok) {
          throw new GoUsageError("upstream", `usage API responded with HTTP ${response.status}`)
        }

        const usage = parseUsageResponse(await response.json())
        const result: UsageResult = { usage, fetchedAt: new Date(now()).toISOString() }
        cache = { result, at: now() }
        return result
      } catch (error) {
        if (signal?.aborted) throw error
        const enriched = error instanceof GoUsageError ? error : toUpstreamError(error)
        if (enriched.type === "upstream" && cache && now() - cache.at < GO_STALE_MAX_AGE_MS) {
          return { ...cache.result, stale: true }
        }
        throw enriched
      }
    },
  }
}

function toUpstreamError(error: unknown): GoUsageError {
  if (error instanceof UsageParseError) {
    return new GoUsageError("upstream", `usage API returned an unexpected payload: ${error.message}`)
  }
  if (error instanceof Error) return new GoUsageError("upstream", error.message)
  return new GoUsageError("upstream", "usage API unreachable")
}
