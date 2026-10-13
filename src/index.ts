import { Plugin } from "@opencode/plugin"
import { REQUESTY_ERROR_TEXT } from "./budget"
import { GO_ERROR_TEXT } from "./go-usage"
import { extractApiKey, extractCredentialSecret } from "./key"
import { GoUsage, RequestyBudget } from "./rpc"
import { BudgetError, createBudgetService } from "./service"
import { GoUsageError, createGoUsageService } from "./go-service"

export default Plugin.define({
  id: "requesty-usage",
  async setup(ctx) {
    const providerID =
      typeof ctx.options.providerID === "string" && ctx.options.providerID.length > 0
        ? ctx.options.providerID
        : "requesty"
    const budgetOption = ctx.options.budget
    const fallbackBudgetUsd =
      typeof budgetOption === "number" && Number.isFinite(budgetOption) && budgetOption > 0 ? budgetOption : undefined

    const budgetService = createBudgetService({
      resolveKey: async () => {
        try {
          const provider = await ctx.provider.get({ providerID })
          return extractApiKey(provider)
        } catch {
          return undefined
        }
      },
      fallbackBudgetUsd,
    })

    const goService = createGoUsageService({
      resolveKey: async () => {
        const connection = await ctx.integration.connection.active("opencode-go")
        if (!connection) return undefined
        return extractCredentialSecret(await ctx.integration.connection.resolve(connection))
      },
    })

    await ctx.rpc.register(RequestyBudget, {
      get: async (_input, context) => {
        try {
          return await budgetService.get(context.signal)
        } catch (error) {
          if (error instanceof BudgetError) {
            return context.error(error.type, REQUESTY_ERROR_TEXT[error.type] ?? error.message, { message: error.message })
          }
          throw error
        }
      },
    })

    await ctx.rpc.register(GoUsage, {
      get: async (_input, context) => {
        try {
          return await goService.get(context.signal)
        } catch (error) {
          if (error instanceof GoUsageError) {
            return context.error(error.type, GO_ERROR_TEXT[error.type] ?? error.message, { message: error.message })
          }
          throw error
        }
      },
    })
  },
})
