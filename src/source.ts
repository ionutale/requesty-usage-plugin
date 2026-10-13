export type UsageSource = "requesty" | "opencode-go"

export const REQUESTY_PROVIDER_ID = "requesty"
export const GO_PROVIDER_ID = "opencode-go"

/** Maps the selected model's provider id to the usage source shown in the sidebar. */
export function selectSource(providerID: string | undefined): UsageSource | undefined {
  if (providerID === REQUESTY_PROVIDER_ID) return "requesty"
  if (providerID === GO_PROVIDER_ID) return "opencode-go"
  return undefined
}
