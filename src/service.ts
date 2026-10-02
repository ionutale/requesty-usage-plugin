import { BudgetParseError, parseApiKeyInfo, type BudgetResult } from "./budget"

export const API_BASE = "https://api-v2.requesty.ai"
export const CACHE_TTL_MS = 15_000
export const STALE_MAX_AGE_MS = 300_000

export type BudgetErrorType = "no_credential" | "unauthorized" | "forbidden" | "upstream"

export class BudgetError extends Error {
  readonly type: BudgetErrorType

  constructor(type: BudgetErrorType, message: string) {
    super(message)
    this.name = "BudgetError"
    this.type = type
  }
}

export type BudgetServiceOptions = {
  resolveKey: () => Promise<string | undefined>
  /** USD budget used when the key itself has no monthly limit */
  fallbackBudgetUsd?: number
  fetch?: typeof globalThis.fetch
  now?: () => number
  apiBase?: string
}

export type BudgetService = {
  get: (signal?: AbortSignal) => Promise<BudgetResult>
}

export function createBudgetService(options: BudgetServiceOptions): BudgetService {
  let cache: { result: BudgetResult; at: number } | undefined
  const now = options.now ?? Date.now
  const doFetch = options.fetch ?? globalThis.fetch
  const apiBase = options.apiBase ?? API_BASE

  return {
    async get(signal) {
      if (cache && now() - cache.at < CACHE_TTL_MS) return cache.result

      try {
        const key = await options.resolveKey()
        if (!key) throw new BudgetError("no_credential", "No Requesty API key found in the provider configuration")

        const response = await doFetch(`${apiBase}/v1/manage/apikey/self`, {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
            "User-Agent": "opencode-requesty-usage-plugin/0.1.0",
          },
          signal,
        })

        if (response.status === 401) {
          throw new BudgetError("unauthorized", "Requesty rejected the API key (HTTP 401)")
        }
        if (response.status === 403) {
          throw new BudgetError("forbidden", "Requesty denied usage access for the API key (HTTP 403)")
        }
        if (!response.ok) {
          throw new BudgetError("upstream", `Requesty usage API responded with HTTP ${response.status}`)
        }

        const budget = parseApiKeyInfo(await response.json(), options.fallbackBudgetUsd)
        const result: BudgetResult = { budget, fetchedAt: new Date(now()).toISOString() }
        cache = { result, at: now() }
        return result
      } catch (error) {
        if (signal?.aborted) throw error
        const enriched = error instanceof BudgetError ? error : toUpstreamError(error)
        if (cache && now() - cache.at < STALE_MAX_AGE_MS) return { ...cache.result, stale: true }
        throw enriched
      }
    },
  }
}

function toUpstreamError(error: unknown): BudgetError {
  if (error instanceof BudgetParseError) {
    return new BudgetError("upstream", `usage API returned an unexpected payload: ${error.message}`)
  }
  if (error instanceof Error) return new BudgetError("upstream", error.message)
  return new BudgetError("upstream", "usage API unreachable")
}
