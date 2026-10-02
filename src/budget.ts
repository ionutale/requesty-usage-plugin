export type BudgetLimitSource = "requesty" | "config" | "none"

export type BudgetView = {
  keyName: string
  /** USD spent so far in the current month */
  spend: number
  /** USD budget for the month; 0 means no limit is known */
  limit: number
  /** USD left in the month; 0 when no limit is known */
  left: number
  /** Percent of the budget used (can exceed 100); 0 when no limit is known */
  percent: number
  limitSource: BudgetLimitSource
}

export type BudgetResult = {
  budget: BudgetView
  /** ISO timestamp of the last successful upstream fetch */
  fetchedAt: string
  /** True when this is cached data served after a failed refresh */
  stale?: boolean
}

export class BudgetParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BudgetParseError"
  }
}

export const GREEN = "#22c55e"
export const YELLOW = "#eab308"
export const RED = "#ef4444"

export const ERROR_TEXT: Record<string, string> = {
  no_credential: "no API key",
  unauthorized: "check API key",
  forbidden: "permission denied",
  upstream: "unreachable",
}

function toFiniteNumber(value: unknown, field: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN
  if (!Number.isFinite(parsed)) throw new BudgetParseError(`apikey.${field} is not a number`)
  return parsed
}

export function parseApiKeyInfo(input: unknown, fallbackBudgetUsd?: number): BudgetView {
  if (typeof input !== "object" || input === null) throw new BudgetParseError("response is not an object")
  const record = input as Record<string, unknown>
  if (typeof record.name !== "string") throw new BudgetParseError("apikey.name is not a string")
  const spend = toFiniteNumber(record.monthly_spend, "monthly_spend")
  const apiLimit = toFiniteNumber(record.monthly_limit, "monthly_limit")

  let limit = 0
  let limitSource: BudgetLimitSource = "none"
  if (apiLimit > 0) {
    limit = apiLimit
    limitSource = "requesty"
  } else if (typeof fallbackBudgetUsd === "number" && Number.isFinite(fallbackBudgetUsd) && fallbackBudgetUsd > 0) {
    limit = fallbackBudgetUsd
    limitSource = "config"
  }

  if (limit === 0) return { keyName: record.name, spend, limit: 0, left: 0, percent: 0, limitSource: "none" }

  return {
    keyName: record.name,
    spend,
    limit,
    left: Math.max(0, limit - spend),
    percent: (spend / limit) * 100,
    limitSource,
  }
}

export function formatMoney(value: number): string {
  const sign = value < 0 ? "-" : ""
  return `${sign}$${Math.abs(value).toFixed(2)}`
}

export function barSegments(percent: number, width = 10): string {
  const bounded = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
  const filled = Math.min(width, Math.max(0, Math.round((bounded / 100) * width)))
  return "█".repeat(filled) + "░".repeat(width - filled)
}

export function budgetColor(percent: number): string {
  if (percent >= 75) return RED
  if (percent >= 50) return YELLOW
  return GREEN
}

/** One-line text of the sidebar row, used by the smoke script and tests. */
export function formatBudgetText(budget: BudgetView): string {
  if (budget.limit === 0) return `Requesty  ${formatMoney(budget.spend)} this month`
  return `Requesty ${barSegments(budget.percent)}  ${formatMoney(budget.left)} left`
}

/** Maps an RPC error to short UI text. Accepts unprefixed or `rpc.<id>.`-prefixed types. */
export function describeRpcError(error: unknown): string {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : undefined
  const data =
    typeof record?.data === "object" && record.data !== null ? (record.data as Record<string, unknown>) : undefined
  const rawType =
    typeof record?.type === "string" ? record.type : typeof data?.type === "string" ? data.type : undefined
  if (rawType) {
    const normalized = rawType.replace(/^rpc\.[^.]+\./, "")
    const known = ERROR_TEXT[normalized]
    if (known) return known
  }
  if (error instanceof Error && error.message.length > 0) return error.message
  if (typeof record?.message === "string" && record.message.length > 0) return record.message
  if (typeof data?.message === "string" && data.message.length > 0) return data.message
  return ERROR_TEXT.upstream
}
