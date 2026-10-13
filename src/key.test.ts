import { describe, expect, it } from "vitest"
import { extractApiKey, extractCredentialSecret } from "./key"

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

describe("extractCredentialSecret", () => {
  it("accepts a bare secret string", () => {
    expect(extractCredentialSecret("go-key")).toBe("go-key")
  })

  it("reads key-ish fields from credential objects", () => {
    expect(extractCredentialSecret({ key: "a" })).toBe("a")
    expect(extractCredentialSecret({ apiKey: "b" })).toBe("b")
    expect(extractCredentialSecret({ value: "c" })).toBe("c")
  })

  it("returns undefined for empty or unknown shapes", () => {
    expect(extractCredentialSecret("")).toBeUndefined()
    expect(extractCredentialSecret({ other: "x" })).toBeUndefined()
    expect(extractCredentialSecret(null)).toBeUndefined()
  })
})
