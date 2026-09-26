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
  inset: number;
  recoverNear: number;
  capsuleGap: number;
  capsulePad: number;
  btnGap: number;
  panelPad: number;
  panelGap: number;
  menuPad: number;
  inputPad: number;
  topbarH: number;
  btn: number;
  navBtn: number;
  navBtnH: number;
  navW: number;
  knob: number;
  scrollW: number;
  winRadius: number;
  menuW: number;
  panelRadius: number;
  menuItemH: number;
  inputH: number;
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
  /** 参数解释（设置面板展示） */
  desc: string;
  group: "间距" | "控件" | "字号";
  min: number;
  max: number;
  step: number;
  def: number;
};

export const METRICS: MetricDef[] = [
  { key: "winPad", label: "窗口内距", desc: "窗口边缘与栏/内容之间的外框留白", group: "间距", min: 0, max: 12, step: 1, def: 5 },
  { key: "gap", label: "栏↔内容间距", desc: "栏与内容区之间的缝隙；贴边与派生关系以此为基准", group: "间距", min: 0, max: 12, step: 1, def: 8 },
  { key: "gutter", label: "滚动留白", desc: "内容两侧留白；滚动指示/缩放钮在此侧带内", group: "间距", min: 12, max: 48, step: 1, def: 20 },
  { key: "menuDrop", label: "菜单下移", desc: "+ 菜单/搜索面板悬挂在控制栏下方的距离", group: "间距", min: 0, max: 24, step: 1, def: 8 },
  { key: "topbarH", label: "顶栏高", desc: "控制栏胶囊高度；导航宽 = 它 × 1.5", group: "控件", min: 20, max: 48, step: 1, def: 28 },
  { key: "btn", label: "顶栏圆钮", desc: "控制栏圆钮直径；拖动展开宽 = 它 × 3", group: "控件", min: 16, max: 32, step: 1, def: 22 },
  { key: "navBtn", label: "导航钮", desc: "导航/App 栏圆钮直径；同心圆 margin 随之计算", group: "控件", min: 22, max: 44, step: 1, def: 30 },
  { key: "navBtnH", label: "导航钮展开高", desc: "hover 时导航钮向下变高的高度", group: "控件", min: 32, max: 64, step: 1, def: 46 },
  { key: "knob", label: "缩放钮径", desc: "内容右下与视口角的缩放圆钮直径", group: "控件", min: 8, max: 20, step: 1, def: 12 },
  { key: "scrollW", label: "滚动指示宽", desc: "滚动指示双胶囊的宽度", group: "控件", min: 3, max: 12, step: 1, def: 6 },
  { key: "winRadius", label: "窗口圆角", desc: "窗口/内容圆角；最大化动画 16 ↔ 0", group: "控件", min: 0, max: 28, step: 1, def: 16 },
  { key: "menuW", label: "菜单最小宽", desc: "+ 菜单/搜索面板的最小宽度", group: "控件", min: 140, max: 360, step: 10, def: 220 },
  { key: "fontTitle", label: "页面标题", desc: "内容页 h1 标题字号", group: "字号", min: 16, max: 32, step: 0.5, def: 22 },
  { key: "fontRow", label: "行标题", desc: "设置行标题字号", group: "字号", min: 11, max: 18, step: 0.5, def: 13.5 },
  { key: "fontDesc", label: "行说明", desc: "行说明/次级文字字号", group: "字号", min: 9, max: 16, step: 0.5, def: 11.5 },
  { key: "fontCtl", label: "菜单/钮", desc: "菜单项、按钮、输入框字号", group: "字号", min: 10, max: 16, step: 0.5, def: 12.5 },
  { key: "fontNav", label: "导航小字", desc: "导航钮下方小字字号", group: "字号", min: 6, max: 12, step: 0.5, def: 8.5 },
  { key: "fontNum", label: "状态数字", desc: "状态栏时钟等数字字号", group: "字号", min: 7, max: 14, step: 1, def: 9 },
  { key: "fontStat", label: "大数字", desc: "状态面板大数字字号", group: "字号", min: 12, max: 28, step: 1, def: 18 },
  { key: "navW", label: "导航宽", desc: "导航胶囊宽度（独立参数；42 = 顶栏高×1.5 是数值巧合而非约束）", group: "控件", min: 30, max: 64, step: 1, def: 42 },
  { key: "inset", label: "屏幕贴边", desc: "状态栏/App 栏贴屏幕边缘的距离；最大化导航贴边同此", group: "间距", min: 0, max: 16, step: 1, def: 8 },
  { key: "recoverNear", label: "recover 触发距离", desc: "鼠标距窗边该距离内才显示临时拖动（38 = 原 28+2×5 公式巧合，现独立）", group: "间距", min: 16, max: 72, step: 1, def: 38 },
  { key: "capsuleGap", label: "胶囊按钮间距", desc: "胶囊壳内按钮之间的水平间距", group: "间距", min: 0, max: 8, step: 1, def: 2 },
  { key: "capsulePad", label: "胶囊内边距", desc: "胶囊壳左右内边距", group: "间距", min: 0, max: 10, step: 1, def: 3 },
  { key: "btnGap", label: "按钮纵向间距", desc: "导航/App 栏按钮之间的纵向间距", group: "间距", min: 0, max: 12, step: 1, def: 4 },
  { key: "panelPad", label: "面板内边距", desc: "+ 菜单/搜索面板的内边距", group: "间距", min: 0, max: 20, step: 1, def: 8 },
  { key: "panelGap", label: "面板项间距", desc: "菜单面板各项之间的间距", group: "间距", min: 0, max: 8, step: 1, def: 2 },
  { key: "menuPad", label: "菜单项内距", desc: "菜单项左右内距；二级展开项缩进同此", group: "间距", min: 0, max: 24, step: 1, def: 10 },
  { key: "inputPad", label: "输入框内距", desc: "搜索输入框左右内距", group: "间距", min: 0, max: 24, step: 1, def: 12 },
  { key: "panelRadius", label: "面板圆角", desc: "+ 菜单/搜索面板圆角", group: "控件", min: 0, max: 24, step: 1, def: 14 },
  { key: "menuItemH", label: "菜单项高", desc: "菜单项最小高度", group: "控件", min: 22, max: 44, step: 1, def: 30 },
  { key: "inputH", label: "输入框高", desc: "搜索输入框高度", group: "控件", min: 24, max: 48, step: 1, def: 32 },
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
  { key: "marginComp", label: "补偿", min: 0, max: 4, step: 0.5, def: 1, unit: "" },
];

const labelOf = (key: string): string =>
  METRICS.find((m) => m.key === key)?.label ?? key;

/**
 * 派生 = 几何必然的组合（拆开会破坏不变量），列出公式以示透明。
 * 仅当公式中存在真实自由度时才提供可调项滑杆；无自由度的组合只展示公式与值。
 * 已裁决拆出独立参数（数值巧合不是约束）：导航宽(顶栏高×1.5)、屏幕贴边(=间距)、
 * recover 触发距离(滚动留白+间距×2)。
 */
export const DERIVS: DerivDef[] = [
  {
    key: "dragOpen",
    label: "拖动展开宽",
    cssVar: "--drag-open",
    terms: [],
    compute: (m) => m.btn * 3,
    formula: (m) => `${labelOf("btn")} × 3`,
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

/** 可见窗口中任一最大化 ⇒ App 栏只显示启动台（已收起/关闭的窗口不计） */
export function anyMaximized(s: State): boolean {
  return Object.values(s.wins).some((w) => w.open && w.mode === "maximized");
}
