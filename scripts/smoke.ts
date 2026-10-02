import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { formatBudgetText } from "../src/budget"
import { BudgetError, createBudgetService } from "../src/service"

async function readKeyFromConfig(): Promise<string | undefined> {
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config")
  try {
    const raw = await readFile(join(configHome, "opencode", "opencode.json"), "utf8")
    const config = JSON.parse(raw) as {
      provider?: Record<string, { options?: { apiKey?: unknown } } | undefined>
    }
    const key = config.provider?.requesty?.options?.apiKey
    return typeof key === "string" && key.length > 0 ? key : undefined
  } catch {
    return undefined
  }
}

const key = process.env.REQUESTY_API_KEY ?? (await readKeyFromConfig())

if (!key) {
  console.error("No Requesty API key found.")
  console.error("Set REQUESTY_API_KEY or configure the requesty provider in ~/.config/opencode/opencode.json.")
  process.exit(1)
}

const budgetOption = Number(process.env.REQUESTY_BUDGET)
const fallbackBudgetUsd = Number.isFinite(budgetOption) && budgetOption > 0 ? budgetOption : undefined
const service = createBudgetService({ resolveKey: async () => key, fallbackBudgetUsd })

try {
  const result = await service.get()
  console.log(`Requesty budget (key "${result.budget.keyName}", limit source: ${result.budget.limitSource})`)
  console.log(formatBudgetText(result.budget))
  if (result.stale) console.log("(stale: showing the last successful fetch)")
} catch (error) {
  if (error instanceof BudgetError) {
    console.error(`${error.type}: ${error.message}`)
  } else {
    console.error(error)
  }
  process.exit(1)
}
