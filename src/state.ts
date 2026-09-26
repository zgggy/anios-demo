/**
 * 状态层：纯 TS 对象，唯一数据源。
 * 语义状态（窗口几何/焦点/模式/开合、设置）进 store；
 * 手势与视图瞬态（拖动中指针、hover、菜单展开）不进 store，留在交互层。
 */

export type Geom = { left: number; top: number; width: number; height: number }; // % of viewport (0–100)
export type WinMode = "floating" | "maximized";

export type WinState = {
  id: string; // window element id
  app: string; // data-app / app registry id
  title: string;
  open: boolean;
  focused: boolean;
  mode: WinMode;
  geom: Geom; // floating geometry; restore target after maximize
  z: number;
};

export type Settings = {
  theme: "light" | "dark";
  accent: string;
  animGlobal: number; // ms — sets window/pane/menu together
  animWindow: number;
  animPane: number;
  animMenu: number;
  scrollMode: "percent" | "position";
  net: "wifi" | "cell";
  metrics: Metrics;
};

/* ── 几何度量：间距/尺寸/字号的运行时参数（设置可调） ──
   派生关系保持公式化，不出滑杆：
     --nav-w = topbar-h × 1.5  ·  --inset = gap  ·  拖动展开 = btn × 3
     recover 阈值 = gutter + 2 × gap  ·  同心圆 margin = (短边 − 钮径)/2 − 1px */

export type Metrics = {
  winPad: number;
  gap: number;
  gutter: number;
  menuDrop: number;
  topbarH: number;
  btn: number;
  navBtn: number;
  navBtnH: number;
  knob: number;
  scrollW: number;
  winRadius: number;
  menuW: number;
  fontTitle: number;
  fontRow: number;
  fontDesc: number;
  fontCtl: number;
  fontNav: number;
  fontNum: number;
  fontStat: number;
};

export type MetricKey = keyof Metrics;

export type MetricDef = {
  key: MetricKey;
  label: string;
  group: "间距" | "控件" | "字号";
  min: number;
  max: number;
  step: number;
  def: number;
};

export const METRICS: MetricDef[] = [
  { key: "winPad", label: "窗口内距", group: "间距", min: 0, max: 12, step: 1, def: 5 },
  { key: "gap", label: "栏↔内容间距", group: "间距", min: 0, max: 12, step: 1, def: 5 },
  { key: "gutter", label: "滚动留白", group: "间距", min: 12, max: 48, step: 1, def: 28 },
  { key: "menuDrop", label: "菜单下移", group: "间距", min: 0, max: 24, step: 1, def: 8 },
  { key: "topbarH", label: "顶栏高", group: "控件", min: 20, max: 48, step: 1, def: 28 },
  { key: "btn", label: "顶栏圆钮", group: "控件", min: 16, max: 32, step: 1, def: 22 },
  { key: "navBtn", label: "导航钮", group: "控件", min: 22, max: 44, step: 1, def: 30 },
  { key: "navBtnH", label: "导航钮展开高", group: "控件", min: 32, max: 64, step: 1, def: 46 },
  { key: "knob", label: "缩放钮径", group: "控件", min: 8, max: 20, step: 1, def: 12 },
  { key: "scrollW", label: "滚动指示宽", group: "控件", min: 3, max: 12, step: 1, def: 6 },
  { key: "winRadius", label: "窗口圆角", group: "控件", min: 0, max: 28, step: 1, def: 16 },
  { key: "menuW", label: "菜单最小宽", group: "控件", min: 140, max: 360, step: 10, def: 220 },
  { key: "fontTitle", label: "页面标题", group: "字号", min: 16, max: 32, step: 0.5, def: 22 },
  { key: "fontRow", label: "行标题", group: "字号", min: 11, max: 18, step: 0.5, def: 13.5 },
  { key: "fontDesc", label: "行说明", group: "字号", min: 9, max: 16, step: 0.5, def: 11.5 },
  { key: "fontCtl", label: "菜单/钮", group: "字号", min: 10, max: 16, step: 0.5, def: 12.5 },
  { key: "fontNav", label: "导航小字", group: "字号", min: 6, max: 12, step: 0.5, def: 8.5 },
  { key: "fontNum", label: "状态数字", group: "字号", min: 7, max: 14, step: 1, def: 9 },
  { key: "fontStat", label: "大数字", group: "字号", min: 12, max: 28, step: 1, def: 18 },
];

export function defaultMetrics(): Metrics {
  const m = {} as Metrics;
  for (const d of METRICS) m[d.key] = d.def;
  return m;
}

/** 参数键 → CSS 变量名：winPad → --win-pad */
export function metricVar(key: MetricKey): string {
  return "--" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

export type State = {
  wins: Record<string, WinState>;
  settings: Settings;
};

export type Store = {
  get: () => State;
  /** 修改状态并通知订阅者（替换字段，不要原地改嵌套对象） */
  update: (fn: (s: State) => void) => void;
  subscribe: (fn: (s: State) => void) => () => void;
};

export function createStore(init: State): Store {
  let state = init;
  const subs = new Set<(s: State) => void>();
  return {
    get: () => state,
    update(fn) {
      state = {
        ...state,
        wins: { ...state.wins },
        settings: { ...state.settings },
      };
      fn(state);
      subs.forEach((f) => f(state));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

export function patchWin(s: State, id: string, patch: Partial<WinState>): void {
  s.wins[id] = { ...s.wins[id], ...patch };
}

export function focusedWin(s: State): WinState | null {
  for (const w of Object.values(s.wins)) if (w.focused) return w;
  return null;
}

export function anyMaximized(s: State): boolean {
  return Object.values(s.wins).some((w) => w.mode === "maximized");
}
