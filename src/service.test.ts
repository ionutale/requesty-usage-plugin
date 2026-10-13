import { describe, expect, it, vi } from "vitest"
import { createBudgetService } from "./service"

const okBody = {
  id: "fc6b5428-d8cf-4123-a19c-ddc1fa504b41",
  name: "fcg-first-key",
  logging: false,
  monthly_spend: "26.0522312",
  monthly_limit: "40",
  permissions: { manage: "none", completions: "write" },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("createBudgetService", () => {
  it("fetches and parses the key budget", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(okBody))
    const service = createBudgetService({ resolveKey: async () => "rqsty-key", fetch: fetchMock })
    const result = await service.get()
    expect(result.budget.limit).toBe(40)
    expect(result.budget.limitSource).toBe("requesty")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-v2.requesty.ai/v1/manage/apikey/self",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer rqsty-key" }),
      }),
    )
  })

  it("applies the configured fallback budget", async () => {
    const body = { ...okBody, monthly_limit: "0" }
    const service = createBudgetService({ resolveKey: async () => "k", fetch: async () => jsonResponse(body), fallbackBudgetUsd: 40 })
    const result = await service.get()
    expect(result.budget.limitSource).toBe("config")
    expect(result.budget.limit).toBe(40)
  })

  it("caches for 15 seconds", async () => {
    let now = 0
    const fetchMock = vi.fn(async () => jsonResponse(okBody))
    const service = createBudgetService({ resolveKey: async () => "k", fetch: fetchMock, now: () => now })
    await service.get()
    now += 1_000
    await service.get()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("serves stale data after a failed refresh within 5 minutes", async () => {
    let now = 0
    let fail = false
    const fetchMock = vi.fn(async () => {
      if (fail) throw new Error("network down")
      return jsonResponse(okBody)
    })
    const service = createBudgetService({ resolveKey: async () => "k", fetch: fetchMock, now: () => now })
    const first = await service.get()
    expect(first.stale).toBeUndefined()
    fail = true
    now += 20_000
    const second = await service.get()
    expect(second.stale).toBe(true)
    expect(second.budget.limit).toBe(40)
  })

  it("maps 401 to unauthorized", async () => {
    const service = createBudgetService({ resolveKey: async () => "k", fetch: async () => jsonResponse({ error: {} }, 401) })
    await expect(service.get()).rejects.toMatchObject({ type: "unauthorized" })
  })

  it("maps 403 to forbidden", async () => {
    const service = createBudgetService({ resolveKey: async () => "k", fetch: async () => jsonResponse({ error: {} }, 403) })
    await expect(service.get()).rejects.toMatchObject({ type: "forbidden" })
  })

  it("maps other non-OK statuses to upstream", async () => {
    const service = createBudgetService({ resolveKey: async () => "k", fetch: async () => jsonResponse({ error: {} }, 500) })
    await expect(service.get()).rejects.toMatchObject({ type: "upstream" })
  })

  it("errors with no_credential when the key is missing", async () => {
    const service = createBudgetService({ resolveKey: async () => undefined, fetch: async () => jsonResponse(okBody) })
    await expect(service.get()).rejects.toMatchObject({ type: "no_credential" })
  })

  it("maps an unexpected payload to upstream", async () => {
    const service = createBudgetService({
      resolveKey: async () => "k",
      fetch: async () => jsonResponse({ name: "k", monthly_spend: "nope", monthly_limit: "0" }),
    })
    await expect(service.get()).rejects.toMatchObject({ type: "upstream" })
  })

  it("surfaces auth errors immediately instead of stale data", async () => {
    for (const [status, type] of [
      [401, "unauthorized"],
      [403, "forbidden"],
    ] as const) {
      let now = 0
      let fail = false
      const fetchMock = vi.fn(async () => jsonResponse(fail ? {} : okBody, fail ? status : 200))
      const service = createBudgetService({ resolveKey: async () => "k", fetch: fetchMock, now: () => now })
      await service.get()
      fail = true
      now += 20_000
      await expect(service.get()).rejects.toMatchObject({ type })
    }
  })

  it("surfaces a missing credential immediately instead of stale data", async () => {
    let now = 0
    let key: string | undefined = "k"
    const service = createBudgetService({
      resolveKey: async () => key,
      fetch: async () => jsonResponse(okBody),
      now: () => now,
    })
    await service.get()
    key = undefined
    now += 20_000
    await expect(service.get()).rejects.toMatchObject({ type: "no_credential" })
  })

  it("still serves stale data after a thrown network error", async () => {
    let now = 0
    let fail = false
    const fetchMock = vi.fn(async () => {
      if (fail) throw new Error("network down")
      return jsonResponse(okBody)
    })
    const service = createBudgetService({ resolveKey: async () => "k", fetch: fetchMock, now: () => now })
    await service.get()
    fail = true
    now += 20_000
    const second = await service.get()
    expect(second.stale).toBe(true)
  })
})
