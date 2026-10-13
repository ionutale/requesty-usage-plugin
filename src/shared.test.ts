import { describe, expect, it } from "vitest"
import { barSegments, percentColor, describeRpcErrorWith } from "./shared"

describe("barSegments", () => {
  it("renders ten segments", () => {
    expect(barSegments(40)).toBe("████░░░░░░")
  })

  it("clamps both directions", () => {
    expect(barSegments(-5)).toBe("░░░░░░░░░░")
    expect(barSegments(120)).toBe("██████████")
  })
})

describe("percentColor", () => {
  it("uses the 50/75 thresholds", () => {
    expect(percentColor(49)).toBe("#22c55e")
    expect(percentColor(50)).toBe("#eab308")
    expect(percentColor(75)).toBe("#ef4444")
  })
})

describe("describeRpcErrorWith", () => {
  const text = { no_credential: "nope", upstream: "down" }

  it("maps unprefixed and prefixed types", () => {
    expect(describeRpcErrorWith({ type: "no_credential" }, text)).toBe("nope")
    expect(describeRpcErrorWith({ type: "rpc.go-usage.no_credential" }, text)).toBe("nope")
    expect(describeRpcErrorWith({ type: "rpc.x.upstream" }, text)).toBe("down")
  })

  it("falls back to messages, then upstream", () => {
    expect(describeRpcErrorWith(new Error("boom"), text)).toBe("boom")
    expect(describeRpcErrorWith({ data: { message: "inner" } }, text)).toBe("inner")
    expect(describeRpcErrorWith(undefined, text)).toBe("down")
  })
})
