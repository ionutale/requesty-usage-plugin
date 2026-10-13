import { describe, expect, it } from "vitest"
import type { BudgetResult } from "./budget"
import type { UsageResult } from "./go-usage"
import { errorState, initialState, isCurrent, okState } from "./view"

const budget = { budget: { keyName: "k", spend: 1, limit: 0, left: 0, percent: 0, limitSource: "none" }, fetchedAt: "2026-01-01T00:00:00.000Z" } satisfies BudgetResult
const usage = {
  usage: {
    rolling: { status: "ok", percent: 10, resetsAt: "2026-01-01T00:00:00.000Z" },
    weekly: { status: "ok", percent: 20, resetsAt: "2026-01-01T00:00:00.000Z" },
    monthly: { status: "ok", percent: 30, resetsAt: "2026-01-01T00:00:00.000Z" },
  },
  fetchedAt: "2026-01-01T00:00:00.000Z",
} satisfies UsageResult

describe("initialState", () => {
  it("is idle without a source", () => {
    expect(initialState(undefined)).toEqual({ phase: "idle" })
  })

  it("loads the selected source", () => {
    expect(initialState("requesty")).toEqual({ phase: "loading", source: "requesty" })
    expect(initialState("opencode-go")).toEqual({ phase: "loading", source: "opencode-go" })
  })
})

describe("isCurrent", () => {
  it("is true while the source is still selected", () => {
    expect(isCurrent("requesty", "requesty")).toBe(true)
  })

  it("is false once the selection changed or cleared", () => {
    expect(isCurrent("requesty", "opencode-go")).toBe(false)
    expect(isCurrent("requesty", undefined)).toBe(false)
  })
})

describe("okState", () => {
  it("maps requesty results to the requesty phase", () => {
    expect(okState("requesty", budget)).toEqual({ phase: "requesty", result: budget })
  })

  it("maps go results to the go phase", () => {
    expect(okState("opencode-go", usage)).toEqual({ phase: "go", result: usage })
  })
})

describe("errorState", () => {
  it("carries the source and text", () => {
    expect(errorState("opencode-go", "unreachable")).toEqual({
      phase: "error",
      source: "opencode-go",
      text: "unreachable",
    })
  })
})
