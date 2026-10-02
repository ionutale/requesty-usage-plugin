import { describe, expect, it } from "vitest"
import {
  BudgetParseError,
  barSegments,
  budgetColor,
  describeRpcError,
  formatBudgetText,
  formatMoney,
  parseApiKeyInfo,
} from "./budget"

describe("parseApiKeyInfo", () => {
  it("parses a key with a monthly limit", () => {
    const budget = parseApiKeyInfo({ name: "fcg-first-key", monthly_spend: "26.0522312", monthly_limit: "40" })
    expect(budget.limitSource).toBe("requesty")
    expect(budget.spend).toBeCloseTo(26.0522312)
    expect(budget.limit).toBe(40)
    expect(budget.left).toBeCloseTo(13.9477688)
    expect(budget.percent).toBeCloseTo(65.130578)
  })

  it("reports no limit when the API limit is zero and no fallback is given", () => {
    const budget = parseApiKeyInfo({ name: "k", monthly_spend: "26.05", monthly_limit: "0" })
    expect(budget.limit).toBe(0)
    expect(budget.left).toBe(0)
    expect(budget.percent).toBe(0)
    expect(budget.limitSource).toBe("none")
  })

  it("uses the configured fallback when the API limit is zero", () => {
    const budget = parseApiKeyInfo({ name: "k", monthly_spend: 20, monthly_limit: 0 }, 40)
    expect(budget.limit).toBe(40)
    expect(budget.limitSource).toBe("config")
    expect(budget.percent).toBe(50)
    expect(budget.left).toBe(20)
  })

  it("prefers the API limit over the configured fallback", () => {
    const budget = parseApiKeyInfo({ name: "k", monthly_spend: "5", monthly_limit: "10" }, 40)
    expect(budget.limit).toBe(10)
    expect(budget.limitSource).toBe("requesty")
  })

  it("clamps left at zero when overspent", () => {
    const budget = parseApiKeyInfo({ name: "k", monthly_spend: "45", monthly_limit: "40" })
    expect(budget.left).toBe(0)
    expect(budget.percent).toBeCloseTo(112.5)
  })

  it("rejects a non-numeric spend", () => {
    expect(() => parseApiKeyInfo({ name: "k", monthly_spend: "abc", monthly_limit: "0" })).toThrow(BudgetParseError)
  })
})

describe("formatting", () => {
  it("formats money to cents", () => {
    expect(formatMoney(13.9477688)).toBe("$13.95")
  })

  it("renders a ten-segment bar", () => {
    expect(barSegments(40)).toBe("████░░░░░░")
  })

  it("clamps the bar", () => {
    expect(barSegments(-5)).toBe("░░░░░░░░░░")
    expect(barSegments(120)).toBe("██████████")
  })

  it("colors by used percent", () => {
    expect(budgetColor(49)).toBe("#22c55e")
    expect(budgetColor(50)).toBe("#eab308")
    expect(budgetColor(75)).toBe("#ef4444")
  })

  it("renders the limit row", () => {
    const text = formatBudgetText({ keyName: "k", spend: 26.05, limit: 40, left: 13.95, percent: 65.13, limitSource: "requesty" })
    expect(text).toBe("Requesty ███████░░░  $13.95 left")
  })

  it("renders the no-limit row", () => {
    const text = formatBudgetText({ keyName: "k", spend: 26.05, limit: 0, left: 0, percent: 0, limitSource: "none" })
    expect(text).toBe("Requesty  $26.05 this month")
  })

  it("maps prefixed RPC error types to short text", () => {
    expect(describeRpcError({ type: "rpc.requesty-budget.no_credential" })).toBe("no API key")
    expect(describeRpcError({ type: "upstream" })).toBe("unreachable")
    expect(describeRpcError(new Error("boom"))).toBe("boom")
  })
})
