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
};

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
