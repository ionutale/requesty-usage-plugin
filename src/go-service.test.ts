import { describe, expect, it, vi } from "vitest"
import { createGoUsageService } from "./go-service"

const okBody = {
  usage: {
    rolling: { status: "ok", percent: 40, resetsAt: "2026-01-01T05:00:00Z" },
    weekly: { status: "ok", percent: 77, resetsAt: "2026-01-03T00:00:00Z" },
    monthly: { status: "ok", percent: 64, resetsAt: "2026-01-15T00:00:00Z" },
  },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("createGoUsageService", () => {
  it("fetches and parses usage", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(okBody))
    const service = createGoUsageService({ resolveKey: async () => "go-key", fetch: fetchMock })
    const result = await service.get()
    expect(result.usage.rolling.percent).toBe(40)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://opencode.ai/zen/go/v1/usage",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer go-key" }),
      }),
    )
  })

  it("caches for 15 seconds", async () => {
    let now = 0
    const fetchMock = vi.fn(async () => jsonResponse(okBody))
    const service = createGoUsageService({ resolveKey: async () => "k", fetch: fetchMock, now: () => now })
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
    const service = createGoUsageService({ resolveKey: async () => "k", fetch: fetchMock, now: () => now })
    await service.get()
    fail = true
    now += 20_000
    const second = await service.get()
    expect(second.stale).toBe(true)
  })

  it("surfaces auth errors immediately instead of stale data", async () => {
    for (const [status, type] of [
      [401, "unauthorized"],
      [403, "forbidden"],
    ] as const) {
      let now = 0
      let fail = false
      const fetchMock = vi.fn(async () => jsonResponse(fail ? {} : okBody, fail ? status : 200))
      const service = createGoUsageService({ resolveKey: async () => "k", fetch: fetchMock, now: () => now })
      await service.get()
      fail = true
      now += 20_000
      await expect(service.get()).rejects.toMatchObject({ type })
    }
  })

  it("surfaces a missing credential immediately instead of stale data", async () => {
    let now = 0
    let key: string | undefined = "k"
    const service = createGoUsageService({
      resolveKey: async () => key,
      fetch: async () => jsonResponse(okBody),
      now: () => now,
    })
    await service.get()
    key = undefined
    now += 20_000
    await expect(service.get()).rejects.toMatchObject({ type: "no_credential" })
  })

  it("maps 401, 403, and other failures", async () => {
    for (const [status, type] of [
      [401, "unauthorized"],
      [403, "forbidden"],
      [500, "upstream"],
    ] as const) {
      const service = createGoUsageService({ resolveKey: async () => "k", fetch: async () => jsonResponse({}, status) })
      await expect(service.get()).rejects.toMatchObject({ type })
    }
  })

  it("errors with no_credential when the key is missing", async () => {
    const service = createGoUsageService({ resolveKey: async () => undefined, fetch: async () => jsonResponse(okBody) })
    await expect(service.get()).rejects.toMatchObject({ type: "no_credential" })
  })

  it("maps an unexpected payload to upstream", async () => {
    const service = createGoUsageService({
      resolveKey: async () => "k",
      fetch: async () => jsonResponse({ usage: { rolling: {} } }),
    })
    await expect(service.get()).rejects.toMatchObject({ type: "upstream" })
  })
})
