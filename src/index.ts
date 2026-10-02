import { Plugin } from "@opencode/plugin"
import { ERROR_TEXT } from "./budget"
import { extractApiKey } from "./key"
import { RequestyBudget } from "./rpc"
import { BudgetError, createBudgetService } from "./service"

export default Plugin.define({
  id: "requesty-budget",
  async setup(ctx) {
    const providerID =
      typeof ctx.options.providerID === "string" && ctx.options.providerID.length > 0
        ? ctx.options.providerID
        : "requesty"
    const budgetOption = ctx.options.budget
    const fallbackBudgetUsd =
      typeof budgetOption === "number" && Number.isFinite(budgetOption) && budgetOption > 0 ? budgetOption : undefined

    const service = createBudgetService({
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

    await ctx.rpc.register(RequestyBudget, {
      get: async (_input, context) => {
        try {
          return await service.get(context.signal)
        } catch (error) {
          if (error instanceof BudgetError) {
            return context.error(error.type, ERROR_TEXT[error.type] ?? error.message, { message: error.message })
          }
          throw error
        }
      },
    })
  },
})
