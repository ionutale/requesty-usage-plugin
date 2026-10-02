import { insert as _$insert } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode/plugin/tui";
import { Show, createSignal } from "solid-js";
import { barSegments, budgetColor, describeRpcError, formatMoney } from "../src/budget.ts";
import { RequestyBudget } from "../src/rpc.ts";
const REFRESH_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
export default Plugin.define({
  id: "requesty-budget.tui",
  setup(context) {
    const rpc = context.client.rpc(RequestyBudget);
    const [state, setState] = createSignal({
      phase: "loading"
    });
    const refresh = async () => {
      try {
        // JSON-Schema RPC output types as `unknown`; the server contract fixes the shape.
        const location = context.location ?? context.data.location.default();
        const result = await rpc.get({}, {
          location,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });
        setState({
          phase: "ok",
          result: result
        });
      } catch (error) {
        setState({
          phase: "error",
          text: describeRpcError(error)
        });
      }
    };
    void refresh();
    const refreshTimer = setInterval(() => void refresh(), REFRESH_MS);
    context.ui.slot({
      append: "sidebar.footer",
      render: () => _$createComponent(BudgetRow, {
        state: state
      })
    });
    return () => clearInterval(refreshTimer);
  }
});
function BudgetRow(props) {
  const context = usePlugin();
  const muted = () => context.theme.text.muted;
  const errorState = () => {
    const state = props.state();
    return state.phase === "error" ? state : undefined;
  };
  const okState = () => {
    const state = props.state();
    return state.phase === "ok" ? state : undefined;
  };
  return [_$createComponent(Show, {
    get when() {
      return props.state().phase === "loading";
    },
    get children() {
      var _el$ = _$createElement("text");
      _$insertNode(_el$, _$createTextNode(`Requesty: loading…`));
      _$effect(_$p => _$setProp(_el$, "fg", muted(), _$p));
      return _el$;
    }
  }), _$createComponent(Show, {
    get when() {
      return errorState();
    },
    children: state => (() => {
      var _el$3 = _$createElement("text"),
        _el$4 = _$createTextNode(`Requesty: `);
      _$insertNode(_el$3, _el$4);
      _$insert(_el$3, () => state().text, null);
      _$effect(_$p => _$setProp(_el$3, "fg", muted(), _$p));
      return _el$3;
    })()
  }), _$createComponent(Show, {
    get when() {
      return okState();
    },
    children: state => _$createComponent(Show, {
      get when() {
        return state().result.budget.limit > 0;
      },
      get fallback() {
        return _$createComponent(SpendRow, {
          get budget() {
            return state().result.budget;
          },
          get dim() {
            return state().result.stale === true;
          }
        });
      },
      get children() {
        return _$createComponent(BarRow, {
          get budget() {
            return state().result.budget;
          },
          get dim() {
            return state().result.stale === true;
          }
        });
      }
    })
  })];
}
function BarRow(props) {
  const context = usePlugin();
  const accent = () => props.dim ? context.theme.text.muted : budgetColor(props.budget.percent);
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
    _$insert(_el$8, () => barSegments(props.budget.percent));
    _$insert(_el$9, () => `  ${formatMoney(props.budget.left)} left`);
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
function SpendRow(props) {
  const context = usePlugin();
  return (() => {
    var _el$0 = _$createElement("box"),
      _el$1 = _$createElement("text"),
      _el$11 = _$createElement("text");
    _$insertNode(_el$0, _el$1);
    _$insertNode(_el$0, _el$11);
    _$setProp(_el$0, "flexDirection", "row");
    _$insertNode(_el$1, _$createTextNode(`Requesty`));
    _$insert(_el$11, () => `  ${formatMoney(props.budget.spend)} this month`);
    _$effect(_p$ => {
      var _v$4 = context.theme.text.muted,
        _v$5 = props.dim ? context.theme.text.muted : context.theme.text.base;
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