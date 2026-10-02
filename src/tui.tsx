/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { Show, createSignal } from "solid-js"
import { barSegments, budgetColor, describeRpcError, formatMoney, type BudgetResult, type BudgetView } from "./budget"
import { RequestyBudget } from "./rpc"

const REFRESH_MS = 30_000
const REQUEST_TIMEOUT_MS = 15_000

type ViewState =
  | { phase: "loading" }
  | { phase: "ok"; result: BudgetResult }
  | { phase: "error"; text: string }

export default Plugin.define({
  id: "requesty-budget.tui",
  setup(context) {
    const rpc = context.client.rpc(RequestyBudget)
    const [state, setState] = createSignal<ViewState>({ phase: "loading" })

    const refresh = async () => {
      try {
        // JSON-Schema RPC output types as `unknown`; the server contract fixes the shape.
        const location = context.location ?? context.data.location.default()
        const result = await rpc.get({}, { location, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
        setState({ phase: "ok", result: result as BudgetResult })
      } catch (error) {
        setState({ phase: "error", text: describeRpcError(error) })
      }
    }

    void refresh()
    const refreshTimer = setInterval(() => void refresh(), REFRESH_MS)

    context.ui.slot({
      append: "sidebar.footer",
      render: () => <BudgetRow state={state} />,
    })

    return () => clearInterval(refreshTimer)
  },
})

function BudgetRow(props: { state: () => ViewState }) {
  const context = usePlugin()
  const muted = () => context.theme.text.muted
  const errorState = () => {
    const state = props.state()
    return state.phase === "error" ? state : undefined
  }
  const okState = () => {
    const state = props.state()
    return state.phase === "ok" ? state : undefined
  }

  return (
    <>
      <Show when={props.state().phase === "loading"}>
        <text fg={muted()}>Requesty: loading…</text>
      </Show>
      <Show when={errorState()}>
        {(state) => <text fg={muted()}>Requesty: {state().text}</text>}
      </Show>
      <Show when={okState()}>
        {(state) => (
          <Show
            when={state().result.budget.limit > 0}
            fallback={<SpendRow budget={state().result.budget} dim={state().result.stale === true} />}
          >
            <BarRow budget={state().result.budget} dim={state().result.stale === true} />
          </Show>
        )}
      </Show>
    </>
  )
}

function BarRow(props: { budget: BudgetView; dim: boolean }) {
  const context = usePlugin()
  const accent = () => (props.dim ? context.theme.text.muted : budgetColor(props.budget.percent))
  return (
    <box flexDirection="row">
      <text fg={context.theme.text.muted}>{"Requesty "}</text>
      <text fg={accent()}>{barSegments(props.budget.percent)}</text>
      <text fg={accent()}>{`  ${formatMoney(props.budget.left)} left`}</text>
    </box>
  )
}

function SpendRow(props: { budget: BudgetView; dim: boolean }) {
  const context = usePlugin()
  return (
    <box flexDirection="row">
      <text fg={context.theme.text.muted}>{"Requesty"}</text>
      <text fg={props.dim ? context.theme.text.muted : context.theme.text.base}>
        {`  ${formatMoney(props.budget.spend)} this month`}
      </text>
    </box>
  )
}
