import { describe, expect, it } from "vitest"
import { selectSource } from "./source"

describe("selectSource", () => {
  it("maps known providers", () => {
    expect(selectSource("requesty")).toBe("requesty")
    expect(selectSource("opencode-go")).toBe("opencode-go")
  })

  it("hides unknown or missing providers", () => {
    expect(selectSource("ollama")).toBeUndefined()
    expect(selectSource("opencode")).toBeUndefined()
    expect(selectSource(undefined)).toBeUndefined()
  })
})
