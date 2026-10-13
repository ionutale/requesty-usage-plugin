/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import {
  budgetColor,
  describeRpcError as describeRequestyError,
  formatMoney,
  type BudgetResult,
  type BudgetView,
} from "./budget"
import {
  describeRpcError as describeGoError,
  formatResetsIn,
  usageColor,
  type UsageResult,
  type UsageWindow,
} from "./go-usage"
import { GoUsage, RequestyBudget } from "./rpc"
import { barSegments } from "./shared"
import { selectSource, type UsageSource } from "./source"

const REFRESH_MS = 30_000
const TICK_MS = 30_000
const REQUEST_TIMEOUT_MS = 15_000

type ViewState =
  | { phase: "idle" }
  | { phase: "loading"; source: UsageSource }
  | { phase: "requesty"; result: BudgetResult }
  | { phase: "go"; result: UsageResult }
  | { phase: "error"; source: UsageSource; text: string }

function sourceLabel(source: UsageSource): string {
  return source === "requesty" ? "Requesty" : "Go usage"
}

export default Plugin.define({
  id: "requesty-usage.tui",
  setup(context) {
    const requestyRpc = context.client.rpc(RequestyBudget)
    const goRpc = context.client.rpc(GoUsage)
    const [state, setState] = createSignal<ViewState>({ phase: "idle" })
    const [now, setNow] = createSignal(Date.now())

    const source = createMemo(() => selectSource(context.ui.model.current()?.providerID))

    createEffect(() => {
      const active = source()
      if (!active) {
        setState({ phase: "idle" })
        return
      }

      setState({ phase: "loading", source: active })
      const location = context.location ?? context.data.location.default()

      const refresh = async () => {
        try {
          if (active === "requesty") {
            const result = await requestyRpc.get({}, { location, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
            if (source() !== active) return
            setState({ phase: "requesty", result: result as BudgetResult })
          } else {
            const result = await goRpc.get({}, { location, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
            if (source() !== active) return
            setState({ phase: "go", result: result as UsageResult })
          }
        } catch (error) {
          if (source() !== active) return
          const text = (active === "requesty" ? describeRequestyError : describeGoError)(error)
          setState({ phase: "error", source: active, text })
        }
      }

      void refresh()
      const refreshTimer = setInterval(() => void refresh(), REFRESH_MS)
      onCleanup(() => clearInterval(refreshTimer))
    })

    const tickTimer = setInterval(() => setNow(Date.now()), TICK_MS)

    context.ui.slot({
      append: "sidebar.footer",
      render: () => <UsageBlock state={state} now={now} />,
    })

    return () => clearInterval(tickTimer)
  },
})

function UsageBlock(props: { state: () => ViewState; now: () => number }) {
  const context = usePlugin()
  const muted = () => context.theme.text.muted
  const loadingState = () => {
    const state = props.state()
    return state.phase === "loading" ? state : undefined
  }
  const errorState = () => {
    const state = props.state()
    return state.phase === "error" ? state : undefined
  }
  const requestyState = () => {
    const state = props.state()
    return state.phase === "requesty" ? state : undefined
  }
  const goState = () => {
    const state = props.state()
    return state.phase === "go" ? state : undefined
  }

  return (
    <>
      <Show when={loadingState()}>
        {(state) => <text fg={muted()}>{sourceLabel(state().source)}: loading…</text>}
      </Show>
      <Show when={errorState()}>
        {(state) => <text fg={muted()}>{sourceLabel(state().source)}: {state().text}</text>}
      </Show>
      <Show when={requestyState()}>
        {(state) => <RequestyBlock budget={() => state().result.budget} stale={() => state().result.stale === true} />}
      </Show>
      <Show when={goState()}>
        {(state) => <GoBlock result={() => state().result} now={props.now} />}
      </Show>
    </>
  )
}

function RequestyBlock(props: { budget: () => BudgetView; stale: () => boolean }) {
  return (
    <Show
      when={props.budget().limit > 0}
      fallback={<RequestySpendRow budget={props.budget} stale={props.stale} />}
    >
      <RequestyBarRow budget={props.budget} stale={props.stale} />
    </Show>
  )
}

function RequestyBarRow(props: { budget: () => BudgetView; stale: () => boolean }) {
  const context = usePlugin()
  const accent = () => (props.stale() ? context.theme.text.muted : budgetColor(props.budget().percent))
  return (
    <box flexDirection="row">
      <text fg={context.theme.text.muted}>{"Requesty "}</text>
      <text fg={accent()}>{barSegments(props.budget().percent)}</text>
      <text fg={accent()}>{`  ${formatMoney(props.budget().left)} left`}</text>
    </box>
  )
}

function RequestySpendRow(props: { budget: () => BudgetView; stale: () => boolean }) {
  const context = usePlugin()
  return (
    <box flexDirection="row">
      <text fg={context.theme.text.muted}>{"Requesty"}</text>
      <text fg={props.stale() ? context.theme.text.muted : context.theme.text.base}>
        {`  ${formatMoney(props.budget().spend)} this month`}
      </text>
    </box>
  )
}

function GoBlock(props: { result: () => UsageResult; now: () => number }) {
  return (
    <box flexDirection="column">
      <GoRow label="Rolling" window={() => props.result().usage.rolling} now={props.now} dim={() => props.result().stale === true} />
      <GoRow label="Weekly" window={() => props.result().usage.weekly} now={props.now} dim={() => props.result().stale === true} />
      <GoRow label="Monthly" window={() => props.result().usage.monthly} now={props.now} dim={() => props.result().stale === true} />
    </box>
  )
}

function GoRow(props: { label: string; window: () => UsageWindow; now: () => number; dim: () => boolean }) {
  const context = usePlugin()
  const accent = () => (props.dim() ? context.theme.text.muted : usageColor(props.window().percent))
  const percent = () => String(Math.round(props.window().percent)).padStart(3)
  return (
    <box flexDirection="row">
      <text fg={context.theme.text.muted}>{props.label.padEnd(9)}</text>
      <text fg={accent()}>{barSegments(props.window().percent)}</text>
      <text fg={accent()}>{`  ${percent()}%`}</text>
      <text fg={context.theme.text.muted}>{`  ${formatResetsIn(props.window().resetsAt, props.now())}`}</text>
    </box>
  )
}
