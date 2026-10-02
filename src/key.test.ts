import { describe, expect, it } from "vitest"
import { extractApiKey } from "./key"

describe("extractApiKey", () => {
  it("reads settings.apiKey from a provider", () => {
    expect(extractApiKey({ id: "requesty", settings: { apiKey: "rqsty-key", baseURL: "https://example.com" } })).toBe(
      "rqsty-key",
    )
  })

  it("unwraps a { data } client envelope", () => {
    expect(extractApiKey({ data: { settings: { apiKey: "rqsty-key" } } })).toBe("rqsty-key")
  })

  it("falls back to an Authorization header", () => {
    expect(extractApiKey({ headers: { Authorization: "Bearer rqsty-key" } })).toBe("rqsty-key")
  })

  it("returns undefined when nothing matches", () => {
    expect(extractApiKey({ settings: { baseURL: "https://example.com" } })).toBeUndefined()
    expect(extractApiKey(undefined)).toBeUndefined()
  })
})
