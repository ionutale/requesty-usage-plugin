/** Extracts the Requesty API key from a Provider.Info payload (or its `{ data }` client envelope). */
export function extractApiKey(provider: unknown): string | undefined {
  if (typeof provider !== "object" || provider === null) return undefined
  const envelope = provider as Record<string, unknown>
  const info =
    typeof envelope.data === "object" && envelope.data !== null
      ? (envelope.data as Record<string, unknown>)
      : envelope

  const settings = info.settings
  if (typeof settings === "object" && settings !== null) {
    const apiKey = (settings as Record<string, unknown>).apiKey
    if (typeof apiKey === "string" && apiKey.length > 0) return apiKey
  }

  const headers = info.headers
  if (typeof headers === "object" && headers !== null) {
    const record = headers as Record<string, unknown>
    for (const name of ["Authorization", "authorization"]) {
      const value = record[name]
      if (typeof value === "string" && value.startsWith("Bearer ")) return value.slice("Bearer ".length)
    }
  }

  return undefined
}
