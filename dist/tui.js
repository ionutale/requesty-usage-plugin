import { setProp as _$setProp } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode/plugin/tui";
import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { budgetColor, describeRpcError as describeRequestyError, formatMoney } from "../src/budget.ts";
import { describeRpcError as describeGoError, formatResetsIn, usageColor } from "../src/go-usage.ts";
import { GoUsage, RequestyBudget } from "../src/rpc.ts";
import { barSegments } from "../src/shared.ts";
import { selectSource } from "../src/source.ts";
const REFRESH_MS = 30_000;
const TICK_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
function sourceLabel(source) {
  return source === "requesty" ? "Requesty" : "Go usage";
}
export default Plugin.define({
  id: "requesty-usage.tui",
  setup(context) {
    const requestyRpc = context.client.rpc(RequestyBudget);
    const goRpc = context.client.rpc(GoUsage);
    const [state, setState] = createSignal({
      phase: "idle"
    });
    const [now, setNow] = createSignal(Date.now());
    const source = createMemo(() => selectSource(context.ui.model.current()?.providerID));
    createEffect(() => {
      const active = source();
      if (!active) {
        setState({
          phase: "idle"
        });
        return;
      }
      setState({
        phase: "loading",
        source: active
      });
      const location = context.location ?? context.data.location.default();
      const refresh = async () => {
        try {
          if (active === "requesty") {
            const result = await requestyRpc.get({}, {
              location,
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
            });
            if (source() !== active) return;
            setState({
              phase: "requesty",
              result: result
            });
          } else {
            const result = await goRpc.get({}, {
              location,
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
            });
            if (source() !== active) return;
            setState({
              phase: "go",
              result: result
            });
          }
        } catch (error) {
          if (source() !== active) return;
          const text = (active === "requesty" ? describeRequestyError : describeGoError)(error);
          setState({
            phase: "error",
            source: active,
            text
          });
        }
      };
      void refresh();
      const refreshTimer = setInterval(() => void refresh(), REFRESH_MS);
      onCleanup(() => clearInterval(refreshTimer));
    });
    const tickTimer = setInterval(() => setNow(Date.now()), TICK_MS);
    context.ui.slot({
      append: "sidebar.footer",
      render: () => _$createComponent(UsageBlock, {
        state: state,
        now: now
      })
    });
    return () => clearInterval(tickTimer);
  }
});
function UsageBlock(props) {
  const context = usePlugin();
  const muted = () => context.theme.text.muted;
  const loadingState = () => {
    const state = props.state();
    return state.phase === "loading" ? state : undefined;
  };
  const errorState = () => {
    const state = props.state();
    return state.phase === "error" ? state : undefined;
  };
  const requestyState = () => {
    const state = props.state();
    return state.phase === "requesty" ? state : undefined;
  };
  const goState = () => {
    const state = props.state();
    return state.phase === "go" ? state : undefined;
  };
  return [_$createComponent(Show, {
    get when() {
      return loadingState();
    },
    children: state => (() => {
      var _el$ = _$createElement("text"),
        _el$2 = _$createTextNode(`: loading…`);
      _$insertNode(_el$, _el$2);
      _$insert(_el$, () => sourceLabel(state().source), _el$2);
      _$effect(_$p => _$setProp(_el$, "fg", muted(), _$p));
      return _el$;
    })()
  }), _$createComponent(Show, {
    get when() {
      return errorState();
    },
    children: state => (() => {
      var _el$3 = _$createElement("text"),
        _el$4 = _$createTextNode(`: `);
      _$insertNode(_el$3, _el$4);
      _$insert(_el$3, () => sourceLabel(state().source), _el$4);
      _$insert(_el$3, () => state().text, null);
      _$effect(_$p => _$setProp(_el$3, "fg", muted(), _$p));
      return _el$3;
    })()
  }), _$createComponent(Show, {
    get when() {
      return requestyState();
    },
    children: state => _$createComponent(RequestyBlock, {
      budget: () => state().result.budget,
      stale: () => state().result.stale === true
    })
  }), _$createComponent(Show, {
    get when() {
      return goState();
    },
    children: state => _$createComponent(GoBlock, {
      result: () => state().result,
      get now() {
        return props.now;
      }
    })
  })];
}
function RequestyBlock(props) {
  return _$createComponent(Show, {
    get when() {
      return props.budget().limit > 0;
    },
    get fallback() {
      return _$createComponent(RequestySpendRow, {
        get budget() {
          return props.budget;
        },
        get stale() {
          return props.stale;
        }
      });
    },
    get children() {
      return _$createComponent(RequestyBarRow, {
        get budget() {
          return props.budget;
        },
        get stale() {
          return props.stale;
        }
      });
    }
  });
}
function RequestyBarRow(props) {
  const context = usePlugin();
  const accent = () => props.stale() ? context.theme.text.muted : budgetColor(props.budget().percent);
  return (() => {
    var _el$5 = _$createElement("box"),
      _el$6 = _$createElement("text"),
      _el$8 = _$createElement("text"),
      _el$9 = _$createElement("text");
    _$insertNode(_el$5, _el$6);
    _$insertNode(_el$5, _el$8);
    _$insertNode(_el$5, _el$9);
    _$setProp(_el$5, "flexDirection", "row");
    _$insertNode(_el$6, _$createTextNode(`Requesty `));
    _$insert(_el$8, () => barSegments(props.budget().percent));
    _$insert(_el$9, () => `  ${formatMoney(props.budget().left)} left`);
    _$effect(_p$ => {
      var _v$ = context.theme.text.muted,
        _v$2 = accent(),
        _v$3 = accent();
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$6, "fg", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$8, "fg", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp(_el$9, "fg", _v$3, _p$.a));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined
    });
    return _el$5;
  })();
}
function RequestySpendRow(props) {
  const context = usePlugin();
  return (() => {
    var _el$0 = _$createElement("box"),
      _el$1 = _$createElement("text"),
      _el$11 = _$createElement("text");
    _$insertNode(_el$0, _el$1);
    _$insertNode(_el$0, _el$11);
    _$setProp(_el$0, "flexDirection", "row");
    _$insertNode(_el$1, _$createTextNode(`Requesty`));
    _$insert(_el$11, () => `  ${formatMoney(props.budget().spend)} this month`);
    _$effect(_p$ => {
      var _v$4 = context.theme.text.muted,
        _v$5 = props.stale() ? context.theme.text.muted : context.theme.text.base;
      _v$4 !== _p$.e && (_p$.e = _$setProp(_el$1, "fg", _v$4, _p$.e));
      _v$5 !== _p$.t && (_p$.t = _$setProp(_el$11, "fg", _v$5, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$0;
  })();
}
function GoBlock(props) {
  return (() => {
    var _el$12 = _$createElement("box");
    _$setProp(_el$12, "flexDirection", "column");
    _$insert(_el$12, _$createComponent(GoRow, {
      label: "Rolling",
      window: () => props.result().usage.rolling,
      get now() {
        return props.now;
      },
      dim: () => props.result().stale === true
    }), null);
    _$insert(_el$12, _$createComponent(GoRow, {
      label: "Weekly",
      window: () => props.result().usage.weekly,
      get now() {
        return props.now;
      },
      dim: () => props.result().stale === true
    }), null);
    _$insert(_el$12, _$createComponent(GoRow, {
      label: "Monthly",
      window: () => props.result().usage.monthly,
      get now() {
        return props.now;
      },
      dim: () => props.result().stale === true
    }), null);
    return _el$12;
  })();
}
function GoRow(props) {
  const context = usePlugin();
  const accent = () => props.dim() ? context.theme.text.muted : usageColor(props.window().percent);
  const percent = () => String(Math.round(props.window().percent)).padStart(3);
  return (() => {
    var _el$13 = _$createElement("box"),
      _el$14 = _$createElement("text"),
      _el$15 = _$createElement("text"),
      _el$16 = _$createElement("text"),
      _el$17 = _$createElement("text");
    _$insertNode(_el$13, _el$14);
    _$insertNode(_el$13, _el$15);
    _$insertNode(_el$13, _el$16);
    _$insertNode(_el$13, _el$17);
    _$setProp(_el$13, "flexDirection", "row");
    _$insert(_el$14, () => props.label.padEnd(9));
    _$insert(_el$15, () => barSegments(props.window().percent));
    _$insert(_el$16, () => `  ${percent()}%`);
    _$insert(_el$17, () => `  ${formatResetsIn(props.window().resetsAt, props.now())}`);
    _$effect(_p$ => {
      var _v$6 = context.theme.text.muted,
        _v$7 = accent(),
        _v$8 = accent(),
        _v$9 = context.theme.text.muted;
      _v$6 !== _p$.e && (_p$.e = _$setProp(_el$14, "fg", _v$6, _p$.e));
      _v$7 !== _p$.t && (_p$.t = _$setProp(_el$15, "fg", _v$7, _p$.t));
      _v$8 !== _p$.a && (_p$.a = _$setProp(_el$16, "fg", _v$8, _p$.a));
      _v$9 !== _p$.o && (_p$.o = _$setProp(_el$17, "fg", _v$9, _p$.o));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    });
    return _el$13;
  })();
}