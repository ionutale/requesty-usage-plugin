export const GREEN = "#22c55e"
export const YELLOW = "#eab308"
export const RED = "#ef4444"

/** Filled/empty bar segments, e.g. `barSegments(40)` -> `████░░░░░░`. */
export function barSegments(percent: number, width = 10): string {
  const bounded = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
  const filled = Math.min(width, Math.max(0, Math.round((bounded / 100) * width)))
  return "█".repeat(filled) + "░".repeat(width - filled)
}

/** Used-percent color: green < 50, yellow 50–74, red ≥ 75. */
export function percentColor(percent: number): string {
  if (percent >= 75) return RED
  if (percent >= 50) return YELLOW
  return GREEN
}

/** Maps an RPC error to short UI text using the given map. Accepts unprefixed or `rpc.<id>.`-prefixed types. */
export function describeRpcErrorWith(error: unknown, errorText: Record<string, string>): string {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : undefined
  const data =
    typeof record?.data === "object" && record.data !== null ? (record.data as Record<string, unknown>) : undefined
  const rawType =
    typeof record?.type === "string" ? record.type : typeof data?.type === "string" ? data.type : undefined
  if (rawType) {
    const normalized = rawType.replace(/^rpc\.[^.]+\./, "")
    const known = errorText[normalized]
    if (known) return known
  }
  if (error instanceof Error && error.message.length > 0) return error.message
  if (typeof record?.message === "string" && record.message.length > 0) return record.message
  if (typeof data?.message === "string" && data.message.length > 0) return data.message
  return errorText.upstream ?? "unreachable"
}
