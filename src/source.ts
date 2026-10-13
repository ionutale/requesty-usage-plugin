export type UsageSource = "requesty" | "opencode-go"

export const REQUESTY_PROVIDER_ID = "requesty"
export const GO_PROVIDER_ID = "opencode-go"

/**
 * Maps the selected model's provider id to the usage source shown in the sidebar.
 * `requestyProviderID` is the configured provider the Requesty key is read from.
 */
export function selectSource(
  providerID: string | undefined,
  requestyProviderID: string = REQUESTY_PROVIDER_ID,
): UsageSource | undefined {
  if (providerID === requestyProviderID) return "requesty"
  if (providerID === GO_PROVIDER_ID) return "opencode-go"
  return undefined
}
