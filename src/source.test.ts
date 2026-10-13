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

  it("maps a custom requesty provider id to the requesty source", () => {
    expect(selectSource("my-requesty", "my-requesty")).toBe("requesty")
  })

  it("still maps the default requesty provider id to the requesty source", () => {
    expect(selectSource("requesty", "requesty")).toBe("requesty")
    expect(selectSource("requesty")).toBe("requesty")
  })

  it("returns undefined for a provider id that is neither the custom id nor opencode-go", () => {
    expect(selectSource("requesty", "my-requesty")).toBeUndefined()
    expect(selectSource("other", "my-requesty")).toBeUndefined()
  })
})
