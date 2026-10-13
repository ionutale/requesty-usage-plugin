import { describe, expect, it } from "vitest"
import {
  UsageParseError,
  describeRpcError,
  formatDuration,
  formatResetsIn,
  formatUsageRows,
  parseUsageResponse,
  usageColor,
} from "./go-usage"

const sample = {
  usage: {
    rolling: { status: "ok", percent: 40, resetsAt: "2026-01-01T05:00:00Z" },
    weekly: { status: "ok", percent: 77, resetsAt: "2026-01-03T00:00:00Z" },
    monthly: { status: "ok", percent: 64, resetsAt: "2026-01-15T00:00:00Z" },
  },
}

describe("parseUsageResponse", () => {
  it("parses the three windows", () => {
    const windows = parseUsageResponse(sample)
    expect(windows.rolling.percent).toBe(40)
    expect(windows.weekly.percent).toBe(77)
    expect(windows.monthly.percent).toBe(64)
  })

  it("rejects malformed payloads", () => {
    expect(() => parseUsageResponse(null)).toThrow(UsageParseError)
    expect(() => parseUsageResponse({})).toThrow(UsageParseError)
    expect(() =>
      parseUsageResponse({ usage: { ...sample.usage, rolling: { status: "ok", percent: "40", resetsAt: "x" } } }),
    ).toThrow(UsageParseError)
  })
})

describe("formatting", () => {
  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0m")
    expect(formatDuration(90_000)).toBe("1m")
    expect(formatDuration(3 * 3_600_000 + 5 * 60_000)).toBe("3h 5m")
    expect(formatDuration(2 * 86_400_000 + 3_600_000)).toBe("2d 1h")
  })

  it("formats reset countdowns", () => {
    expect(formatResetsIn("2026-01-01T05:00:00Z", Date.parse("2026-01-01T01:00:00Z"))).toBe("4h 0m")
    expect(formatResetsIn("not-a-date", 0)).toBe("0m")
  })

  it("colors by used percent", () => {
    expect(usageColor(49)).toBe("#22c55e")
    expect(usageColor(50)).toBe("#eab308")
    expect(usageColor(75)).toBe("#ef4444")
  })

  it("maps go error types", () => {
    expect(describeRpcError({ type: "rpc.go-usage.no_credential" })).toBe("not connected")
    expect(describeRpcError({ type: "forbidden" })).toBe("Go plan required")
  })

  it("renders one aligned row per window", () => {
    const rows = formatUsageRows({ usage: parseUsageResponse(sample), fetchedAt: "2026-01-01T00:00:00Z" }, Date.parse("2026-01-01T04:00:00Z"))
    expect(rows).toEqual([
      "Rolling  ████░░░░░░   40%  1h 0m",
      "Weekly   ████████░░   77%  1d 20h",
      "Monthly  ██████░░░░   64%  13d 20h",
    ])
  })
})
