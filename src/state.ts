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
  /** 派生公式的可调项（倍率/偏移/补偿） */
  derivTerms: Record<string, number>;
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

/* ── 动画时长参数（设置 → 主页） ── */

export type AnimKey = "animGlobal" | "animWindow" | "animPane" | "animMenu";

export type ParamDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  unit: "" | "px" | "ms";
};

export const ANIMS: ParamDef[] = [
  { key: "animGlobal", label: "全局", min: 100, max: 2000, step: 50, def: 360, unit: "ms" },
  { key: "animWindow", label: "窗口", min: 100, max: 2000, step: 50, def: 360, unit: "ms" },
  { key: "animPane", label: "切换", min: 80, max: 800, step: 20, def: 200, unit: "ms" },
  { key: "animMenu", label: "菜单", min: 80, max: 800, step: 20, def: 200, unit: "ms" },
];

/* ── 派生参数：值 = 公式(基础度量, 可调项)；可调项（倍率/偏移/补偿）即公式中的 +- 项，做成滑杆 ── */

export type DerivDef = {
  key: string;
  label: string;
  cssVar: string;
  /** 公式用到的可调项（滑杆） */
  terms: string[];
  compute: (m: Metrics, t: Record<string, number>) => number;
  /** 展示公式（代入当前可调项取值） */
  formula: (m: Metrics, t: Record<string, number>) => string;
};

export const DERIV_TERMS: ParamDef[] = [
  { key: "navWMul", label: "倍率", min: 1, max: 2.5, step: 0.05, def: 1.5, unit: "" },
  { key: "navWAdd", label: "偏移", min: -10, max: 10, step: 1, def: 0, unit: "" },
  { key: "insetMul", label: "倍率", min: 0, max: 2, step: 0.05, def: 1, unit: "" },
  { key: "insetAdd", label: "偏移", min: -4, max: 12, step: 1, def: 0, unit: "" },
  { key: "dragMul", label: "倍率", min: 2, max: 4.5, step: 0.1, def: 3, unit: "" },
  { key: "dragAdd", label: "偏移", min: -6, max: 12, step: 1, def: 0, unit: "" },
  { key: "nearGapMul", label: "间距倍率", min: 0, max: 4, step: 0.1, def: 2, unit: "" },
  { key: "nearAdd", label: "偏移", min: -10, max: 20, step: 1, def: 0, unit: "" },
  { key: "marginComp", label: "补偿", min: 0, max: 4, step: 0.5, def: 1, unit: "" },
];

const labelOf = (key: string): string =>
  METRICS.find((m) => m.key === key)?.label ?? key;

export const DERIVS: DerivDef[] = [
  {
    key: "navW",
    label: "导航宽",
    cssVar: "--nav-w",
    terms: ["navWMul", "navWAdd"],
    compute: (m, t) => m.topbarH * t.navWMul + t.navWAdd,
    formula: (m, t) => `${labelOf("topbarH")} × ${t.navWMul} + ${t.navWAdd}`,
  },
  {
    key: "inset",
    label: "系统栏贴边",
    cssVar: "--inset",
    terms: ["insetMul", "insetAdd"],
    compute: (m, t) => m.gap * t.insetMul + t.insetAdd,
    formula: (m, t) => `${labelOf("gap")} × ${t.insetMul} + ${t.insetAdd}`,
  },
  {
    key: "dragOpen",
    label: "拖动展开宽",
    cssVar: "--drag-open",
    terms: ["dragMul", "dragAdd"],
    compute: (m, t) => m.btn * t.dragMul + t.dragAdd,
    formula: (m, t) => `${labelOf("btn")} × ${t.dragMul} + ${t.dragAdd}`,
  },
  {
    key: "recoverNear",
    label: "recover 阈值",
    cssVar: "--recover-near",
    terms: ["nearGapMul", "nearAdd"],
    compute: (m, t) => m.gutter + m.gap * t.nearGapMul + t.nearAdd,
    formula: (m, t) => `${labelOf("gutter")} + ${labelOf("gap")} × ${t.nearGapMul} + ${t.nearAdd}`,
  },
  {
    key: "margin",
    label: "同心圆补差",
    cssVar: "--margin-comp",
    terms: ["marginComp"],
    compute: (_m, t) => t.marginComp,
    formula: (_m, t) => `(短边 − 钮径) / 2 − ${t.marginComp}`,
  },
];

export function defaultDerivTerms(): Record<string, number> {
  const t: Record<string, number> = {};
  for (const d of DERIV_TERMS) t[d.key] = d.def;
  return t;
}

/** 全部参数定义查找（设为默认按钮 / 回显用）：metric | anim | deriv-term */
export function findParam(
  key: string,
): { min: number; max: number; step: number; def: number; unit: "" | "px" | "ms" } | null {
  const m = METRICS.find((x) => x.key === key);
  if (m) return { min: m.min, max: m.max, step: m.step, def: m.def, unit: "px" };
  const a = ANIMS.find((x) => x.key === key);
  if (a) return { min: a.min, max: a.max, step: a.step, def: a.def, unit: a.unit };
  const d = DERIV_TERMS.find((x) => x.key === key);
  if (d) return { min: d.min, max: d.max, step: d.step, def: d.def, unit: d.unit };
  return null;
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
