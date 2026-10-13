import type { BudgetResult } from "./budget"
import type { UsageResult } from "./go-usage"
import type { UsageSource } from "./source"

export type ViewState =
  | { phase: "idle" }
  | { phase: "loading"; source: UsageSource }
  | { phase: "requesty"; result: BudgetResult }
  | { phase: "go"; result: UsageResult }
  | { phase: "error"; source: UsageSource; text: string }

/** State to show immediately when the selected source changes. */
export function initialState(source: UsageSource | undefined): ViewState {
  if (!source) return { phase: "idle" }
  return { phase: "loading", source }
}

/** True when a response for `active` is still the selected source and may be applied. */
export function isCurrent(active: UsageSource, current: UsageSource | undefined): boolean {
  return active === current
}

/** Success state for a completed fetch of `source`. */
export function okState(source: UsageSource, result: BudgetResult | UsageResult): ViewState {
  if (source === "requesty") return { phase: "requesty", result: result as BudgetResult }
  return { phase: "go", result: result as UsageResult }
}

/** Error state for a failed fetch of `source`. */
export function errorState(source: UsageSource, text: string): ViewState {
  return { phase: "error", source, text }
}
