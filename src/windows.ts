/**
 * 窗口交互层：只 dispatch 状态，不直接改 DOM 样式。
 * 手势快速路径例外：拖动/缩放中直写 DOM，结束 commit 成状态（百分比几何）。
 */
import { $, $$, on, durMs, clamp, pxVar } from "./dom";
import {
  Store,
  State,
  policyOf,
  patchWin,
  fitGeom,
  focusedWin,
  defaultMetrics,
  defaultDerivTerms,
  resolveDockStack,
  ANIMS,
  type Geom,
} from "./state";
import { patchWinEl, windowShellHTML, align } from "./render";
import { captureShell, playShell, morphTo, minimizeTo, openFrom, closeIn } from "./anim";
import { APPS, winIdOf, type AppDef, type AppActions } from "./apps";
import { bindScrollIndicator } from "./host";

/* ── 右缘停靠：几何助手 ──
   判定线 lineW = 状态栏胶囊宽 + 其左右边界宽：右缘距屏小于它即「消失在顶栏内」——
   吸收 p=1 同在此处完成，松手过线只补完滑向右缘的最后一段，不过线回到打开态。
   停靠栏盒宽 = 胶囊 p=1 自然宽（握把+图标+名字≤--dock-name-w，超长截断）+ 2×inset，
   胶囊经 --content-cx 漂到盒中心后左右各留 inset——状态栏左右边界的镜像。
   条高 barH = 顶栏高 + 2×winPad（胶囊带边距居中）。 */
function dockDims(): { inset: number; lineW: number; barH: number } {
  const inset = pxVar("--inset", 8);
  return {
    inset,
    lineW: statusCapW + 2 * inset,
    barH: pxVar("--topbar-h", 28) + 2 * pxVar("--win-pad", 5),
  };
}

/** 停靠栏探针（px）：瞬时置 p=1 量胶囊自然宽与握把距栏右缘再置回——同一任务内不绘制中间态 */
function probeBar(win: HTMLElement): { barW: number; gripRight: number } {
  const { inset, lineW } = dockDims();
  const cap = $(".top-capsule", win);
  if (!cap) return { barW: lineW, gripRight: lineW - 12 };
  const prev = win.style.getPropertyValue("--dock-p");
  win.style.setProperty("--dock-p", "1");
  const capW = cap.offsetWidth;
  const capLeft = cap.getBoundingClientRect().left;
  const zr = $<HTMLElement>("[data-drag-zone]", win)?.getBoundingClientRect();
  win.style.setProperty("--dock-p", prev);
  const zoneOffCenter = zr && zr.width ? zr.x + zr.width / 2 - capLeft : capW / 2;
  // 栏宽 = 胶囊自然宽 + 2×inset；握把距栏右缘 = 胶囊右界(inset+capW) − 握把中心
  return { barW: capW + 2 * inset, gripRight: capW + inset - zoneOffCenter };
}

function pctGeom(b: { left: number; top: number; width: number; height: number }, vr: DOMRect): Geom {
  return {
    left: (b.left / vr.width) * 100,
    top: (b.top / vr.height) * 100,
    width: (b.width / vr.width) * 100,
    height: (b.height / vr.height) * 100,
  };
}

/** 状态栏胶囊实测宽（判定线 = 它 + 2×inset 的几何来源）；手势起点/度量变化时刷新 */
let statusCapW = 132;
export function remeasureDock(): void {
  const cap = $(".status-capsule");
  if (!cap) return;
  statusCapW = cap.offsetWidth;
}

/** scrub 期冻结内容内层盒（高/溢出），防逐帧 reflow 抖字；手势收尾解除 */
function freezeInner(win: HTMLElement): void {
  const sc = $(".content-scroll", win);
  if (!sc || sc.style.height) return;
  sc.style.height = `${sc.clientHeight}px`;
  sc.style.overflow = "hidden";
}
function unfreezeInner(win: HTMLElement): void {
  const sc = $(".content-scroll", win);
  if (!sc) return;
  sc.style.height = "";
  sc.style.overflow = "";
}

/** 停靠栏盒（px，视口内）：右缘贴 R，顶边 = y，宽 = 该栏实测 */
function dockBox(vr: DOMRect, y: number, w: number): { left: number; top: number; width: number; height: number } {
  const { barH } = dockDims();
  return { left: vr.width - w, top: y, width: w, height: barH };
}

export type WinApi = {
  el: (id: string) => HTMLElement | null;
  focusedId: () => string | null;
  focus: (id: string) => void;
  blurAll: () => void;
  isDragging: () => boolean;
  toggleMaximize: (id: string) => void;
  minimize: (id: string) => void;
  close: (id: string) => void;
  open: (id: string) => void;
  /** 停靠栏 → 还原为浮窗（点击/键盘/点 App 栏图标） */
  undock: (id: string) => void;
  alignAll: () => void;
};

export function initialState(apps: AppDef[]): State {
  const wins: State["wins"] = {};
  for (const a of apps) {
    wins[winIdOf(a.id)] = {
      id: winIdOf(a.id),
      app: a.id,
      title: a.title,
      status: a.open ? "open" : "closed",
      focused: !!a.focused && a.open,
      mode: "floating",
      geom: a.geom,
      z: a.z,
    };
  }
  const animDef = (key: string): number => ANIMS.find((a) => a.key === key)!.def;
  return {
    wins,
    settings: {
      theme: "light",
      wallpaper: "emblem",
      accent: "#3b82f6",
      animGlobal: animDef("animGlobal"),
      animWindow: animDef("animWindow"),
      animPane: animDef("animPane"),
      animMenu: animDef("animMenu"),
      scrollMode: "percent",
      net: "wifi",
      metrics: defaultMetrics(),
      derivTerms: defaultDerivTerms(),
    },
    notices: [],
  };
}

export function initWindows(store: Store): WinApi {
  const viewport = $<HTMLElement>("#viewport")!;
  let dragWin: HTMLElement | null = null;
  let dragMode: "move" | "resize" = "move";
  let moved = false;
  let sx = 0;
  let sy = 0;
  let ox = 0;
  let oy = 0;
  let ow = 0;
  let oh = 0;
  /* 右缘停靠手势：拖动即 scrub（--dock-p），判定线两侧二选一收尾 */
  let dragFrom: Geom | null = null; // 手势起点几何（点击还原目标）
  let dragOpenW = 0; // 打开态尺寸（scrub p=0 端点）
  let dragOpenH = 0;
  let dragBarW = 0; // 停靠栏盒宽（scrub p=1 端点，手势起点实测）
  let dragPRef = 0; // 吸收进度参照距右缘：起手即 p=0、判定线即 p=1（近缘重抓不跳变）
  let dragPSpan = 160; // 吸收行程（下限 24px：默认位贴线的窗不至于一动就收完）
  let gripRight1 = 0; // 握把距「栏右缘」（判定口径端点）
  let dragFromDocked = false;
  let dockLatched = false; // 送达标记：过判定线即锁定停靠，松手时机不论
  let openLatched = false; // 拖出标记：离判定线即锁定还原
  let dragZone: HTMLElement | null = null;
  let dockEngaged = false; // 本手势是否进过吸收区
  let dragFreeze = true; // 打开态起手才冻结内容内层（停靠栏拖出时内层本来是空的）

  const el = (id: string) => $<HTMLElement>(`#${id}`);
  const focusedId = () => focusedWin(store.get())?.id ?? null;

  /* ── 结构渲染：注册表 → 窗口 DOM（低频，一次性） ── */
  viewport.insertAdjacentHTML(
    "beforeend",
    APPS.map((a) =>
      windowShellHTML({
        id: winIdOf(a.id),
        app: a.id,
        title: a.title,
        icon: a.icon,
        geom: a.geom,
        z: a.z,
        open: a.open,
        focused: !!a.focused,
        nav: a.nav,
        content: a.content,
        winType: a.winType,
        searchPlaceholder: a.searchPlaceholder,
        searchOpen: a.searchOpen,
        editItems: a.editItems,
      }),
    ).join("") + '<div class="modal-scrim" data-scrim hidden></div>',
  );

  /** 模态遮罩：任一对话框类窗口可见即铺开 */
  const scrim = $<HTMLElement>("[data-scrim]", viewport);
  function syncScrim(): void {
    if (!scrim) return;
    const anyModal = APPS.some((a) => {
      const w = el(winIdOf(a.id));
      return policyOf(a.winType).scrim && !!w && !w.hidden;
    });
    scrim.hidden = !anyModal;
  }

  /* ── 属性补丁：状态 → DOM ── */
  store.subscribe((s) => {
    if (dragWin) return; // 手势快速路径期间不覆盖几何
    for (const ws of Object.values(s.wins)) {
      const w = el(ws.id);
      // 补间中的窗口跳过：FLIP 正以当前基点做插值，中途改几何/对齐会抖
      if (!w || w.dataset.flipping === "1") continue;
      patchWinEl(w, ws);
    }
    syncScrim();
  });

  const appIcon = (win: HTMLElement): HTMLElement | null => {
    const own = $<HTMLElement>(`.app-item[data-app-id="${win.dataset.app}"]`);
    // 未固定的 app 收起后没有钮：起飞点回落到启动台
    if (own && own.offsetParent !== null) return own;
    return $<HTMLElement>('.app-item[data-app-id="launcher"]');
  };

  const policyFor = (id: string) =>
    policyOf(APPS.find((a) => winIdOf(a.id) === id)?.winType);

  /** 每应用最小窗口尺寸（px） */
  const minSizeOf = (id: string) =>
    APPS.find((a) => winIdOf(a.id) === id)?.minSize ?? { w: 240, h: 180 };

  const actions: AppActions = {
    openApp: (appId) => open(winIdOf(appId)),
    minimizeApp: (appId) => minimize(winIdOf(appId)),
    closeApp: (appId) => close(winIdOf(appId)),
    notify: (title, body, app) =>
      store.update((s) => {
        s.notices = [{ id: Date.now(), title, body, app, ts: Date.now() }, ...s.notices];
      }),
  };

  function focus(id: string): void {
    store.update((s) => {
      // z 只表达层叠顺序：重排为连续小序号（焦点窗置顶），永不累积
      // 越过系统层（状态栏/App 栏 z=100 必须永远最顶层）
      const stack = Object.values(s.wins)
        .sort((a, b) => a.z - b.z)
        .filter((w) => w.id !== id);
      stack.push(s.wins[id]);
      // z = 类型基带 + 序号：模态/沉浸永远压过系统栏，普通窗序其下
      stack.forEach((w, i) =>
        patchWin(s, w.id, { focused: w.id === id, z: policyFor(w.id).zBase + i + 1 }),
      );
    });
    // 视图瞬态：他窗缩放钮收起
    for (const w of $$(".window")) {
      if (w.id === id) continue;
      $$("[data-resize].is-on", w).forEach((b) => b.classList.remove("is-on"));
    }
  }

  function blurAll(): void {
    store.update((s) => {
      for (const w of Object.values(s.wins)) patchWin(s, w.id, { focused: false });
    });
    $$("[data-resize].is-on").forEach((b) => b.classList.remove("is-on"));
  }

  /** 打开：动画先跑，结束 commit（生命周期 = 手势类） */
  function open(id: string): void {
    const win = el(id);
    if (!win || win.dataset.anim === "1") return;
    const ws = store.get().wins[id];
    if (ws?.status === "open") {
      focus(id);
      return;
    }
    const pol = policyFor(id);
    win.dataset.anim = "1";
    win.hidden = false;
    if (pol.stealFocus) focus(id);
    syncScrim();
    const commitOpen = () => {
      store.update((s) => patchWin(s, id, { status: "open" }));
      syncScrim();
    };
    openFrom(win, appIcon(win), () => {
      win.dataset.anim = "0";
      commitOpen();
    });
    // 看门狗：渲染冻结导致补间挂起时，定时器强制收尾（幂等）
    window.setTimeout(() => {
      if (win.dataset.anim === "1") {
        win.dataset.anim = "0";
        commitOpen();
      }
    }, durMs("--anim-window") + 400);
    // 对话框：焦点圈入框内；临时窗：到时自动退场
    if (pol.scrim) {
      window.setTimeout(() => $<HTMLElement>(".content button, .content input", win)?.focus(), 0);
    }
    if (pol.autoCloseMs) {
      window.setTimeout(() => {
        if (store.get().wins[id].status === "open") close(id);
      }, pol.autoCloseMs);
    }
  }

  function minimize(id: string): void {
    const win = el(id);
    if (!win || win.dataset.anim === "1") return;
    win.dataset.anim = "1";
    const commitMin = () => {
      store.update((s) => {
        patchWin(s, id, { status: "minimized", focused: false });
        for (const w of Object.values(s.wins)) {
          if (w.id !== id) patchWin(s, w.id, { focused: false });
        }
      });
    };
    minimizeTo(win, appIcon(win), () => {
      win.dataset.anim = "0";
      commitMin();
    });
    // 看门狗：渲染冻结导致补间挂起时，定时器强制收尾（幂等）
    window.setTimeout(() => {
      if (win.dataset.anim !== "1") return;
      win.hidden = true;
      win.dataset.anim = "0";
      commitMin();
    }, durMs("--anim-window") + 400);
  }

  function close(id: string): void {
    const win = el(id);
    if (!win || win.dataset.anim === "1") return;
    win.dataset.anim = "1";
    const commitClosed = () => {
      store.update((s) => {
        patchWin(s, id, { status: "closed", focused: false });
        for (const w of Object.values(s.wins)) {
          if (w.id !== id) patchWin(s, w.id, { focused: false });
        }
      });
    };
    closeIn(win, () => {
      win.dataset.anim = "0";
      commitClosed();
    });
    // 看门狗：渲染冻结导致补间挂起时，定时器强制收尾（幂等）
    window.setTimeout(() => {
      if (win.dataset.anim !== "1") return;
      win.hidden = true;
      win.dataset.anim = "0";
      commitClosed();
    }, durMs("--anim-window") + 400);
  }

  /** 最大化/还原：capture → dispatch（patch 落几何/模式/对齐）→ 补间（动画只读） */
  function toggleMaximize(id: string): void {
    const win = el(id);
    if (!win || win.dataset.flipping === "1") return;
    focus(id);
    const first = captureShell(win);
    // 先 dispatch：patch 在同一任务内落模式/几何并刷新派生对齐（FLIP 终点依赖它）
    store.update((s) => {
      const w = s.wins[id];
      patchWin(s, id, { mode: w.mode === "maximized" ? "floating" : "maximized" });
    });
    win.dataset.flipping = "1"; // 此后补丁跳过本窗，防止动画中被其它更新抖动
    // 看门狗：渲染冻结导致补间挂起时，定时器强制清守卫（幂等）
    window.setTimeout(() => {
      if (win.dataset.flipping === "1") {
        win.dataset.flipping = "0";
        align(win);
      }
    }, durMs("--anim-window") + 400);
    playShell(win, first);
  }

  /* ── 事件绑定 ── */

  for (const a of APPS) {
    const win = el(winIdOf(a.id));
    if (!win) continue;
    const pol = policyOf(a.winType);

    // 点内容区/真实胶囊/浮层 → 焦点（不夺焦的类型仅点击自身时聚焦）
    on(win, "pointerdown", (e) => {
      const t = e.target as Element;
      if (t.closest(".content, .top-bar, .nav-bar, .recover, .menu-panel, .search-panel")) focus(win.id);
    }, true);

    // 无背景窗口：任意处拖动
    if (pol.drag === "anywhere") {
      on(win, "pointerdown", (e) => startMove(win, e as PointerEvent));
    }

    // 拖动钮：>3px 算拖，否则算点；双击最大化
    const zone = $<HTMLElement>(".top-bar [data-drag-zone]", win);
    if (zone && pol.drag === "handle") {
      // 区上任何按压（含收起/关闭点）都进入手势：startMove 复位 moved
      // 并允许从收起/关闭上拖窗（规范 §3.5）；moved 只在本手势内区分拖与点
      on(zone, "pointerdown", (e) => {
        startMove(win, e as PointerEvent);
      });
      on(zone, "dblclick", (e) => {
        const t = e.target as Element;
        if (t.closest("[data-win-min], [data-win-cls]")) return;
        toggleMaximize(win.id);
      });
    }

    $$("[data-topbar] [data-win-min]", win).forEach((b) =>
      on(b, "click", (e) => {
        e.stopPropagation();
        if (!moved) minimize(win.id);
      }),
    );
    $$("[data-topbar] [data-win-cls]", win).forEach((b) =>
      on(b, "click", (e) => {
        e.stopPropagation();
        if (!moved) close(win.id);
      }),
    );

    // 停靠栏：点一下还原（收起/关闭钮除外；拖动不算点击）
    const cap = $<HTMLElement>(".top-capsule", win);
    if (cap && pol.dock) {
      let down: { x: number; y: number } | null = null;
      on(cap, "pointerdown", (e) => {
        down = { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
      });
      on(cap, "click", (e) => {
        const t = e.target as Element;
        if (t.closest("[data-win-min], [data-win-cls]")) return;
        if (!down || Math.abs(e.clientX - down.x) > 5 || Math.abs(e.clientY - down.y) > 5) return;
        if (store.get().wins[win.id]?.mode === "docked") undock(win.id);
      });
    }

    // 内容右下 hover → 缩放钮；拖动缩放窗口
    const cre = $<HTMLElement>("[data-resize]", win);
    const content = $<HTMLElement>(".content", win);
    if (cre && content) {
      let creOn = false;
      on(content, "pointermove", (e) => {
        const ev = e as PointerEvent;
        const r = content.getBoundingClientRect();
        const ok =
          win.classList.contains("is-focused") &&
          ev.clientX > r.right - 120 &&
          ev.clientY > r.bottom - 120;
        if (ok === creOn) return;
        creOn = ok;
        cre.classList.toggle("is-on", ok);
      });
      on(content, "pointerleave", () => {
        creOn = false;
        cre.classList.remove("is-on");
      });
      on(cre, "pointerdown", (e) => {
        if (!win.classList.contains("is-focused")) return;
        if (win.getAttribute("data-mode") === "maximized") return;
        dragWin = win;
        dragMode = "resize";
        moved = false;
        const wr = win.getBoundingClientRect();
        const vr = viewport.getBoundingClientRect();
        ox = wr.left - vr.left;
        oy = wr.top - vr.top;
        ow = wr.width;
        oh = wr.height;
        sx = (e as PointerEvent).clientX;
        sy = (e as PointerEvent).clientY;
        win.style.transition = "none";
        e.preventDefault();
        e.stopPropagation();
      });
    }

    // 导航切页：先出后入的上下滚动，不重叠
    bindNavPanes(win);
    bindScrollIndicator(win);
    a.bind?.(win, store, actions);
    align(win);
  }

  function startMove(win: HTMLElement, e: PointerEvent): void {
    // focus 先于 dragWin 赋值：补丁订阅在手势期间会跳过
    focus(win.id);
    // 最大化窗口几何由 CSS 决定：拖动手势不得改写/提交几何
    if (win.getAttribute("data-mode") === "maximized") {
      e.preventDefault();
      return;
    }
    dragWin = win;
    dragMode = "move";
    moved = false;
    const wr = win.getBoundingClientRect();
    const vr = viewport.getBoundingClientRect();
    ox = wr.left - vr.left;
    oy = wr.top - vr.top;
    ow = wr.width;
    oh = wr.height;
    sx = e.clientX;
    sy = e.clientY;
    // 停靠 scrub 端点：打开态尺寸（拖出还原用几何；浮窗即当前尺寸）
    const ws = store.get().wins[win.id];
    dragZone = $<HTMLElement>("[data-drag-zone]", win);
    dragFromDocked = ws.mode === "docked";
    dockLatched = false;
    openLatched = false;
    if (policyFor(win.id).dock) {
      remeasureDock(); // 状态栏胶囊宽随铃铛/度量变化，手势起点刷新
      const probe = probeBar(win);
      dragBarW = probe.barW;
      gripRight1 = probe.gripRight;
      // 浮窗起手以起手距为参照（p 从 0 连续增长）；停靠栏拖出用绝对映射（起手即 p=1）
      const { lineW } = dockDims();
      const arm = pxVar("--dock-arm", 160);
      const d0 = vr.width - (e.clientX - vr.left + gripRight1);
      const ref = dragFromDocked ? lineW + arm : Math.min(d0, lineW + arm);
      dragPRef = ref;
      dragPSpan = Math.min(Math.max(ref - lineW, 24), arm);
    }
    dragFrom = ws.geom;
    if (ws.mode === "docked" && ws.restoreGeom) {
      dragOpenW = (ws.restoreGeom.width / 100) * vr.width;
      dragOpenH = (ws.restoreGeom.height / 100) * vr.height;
      dragFreeze = false;
    } else {
      dragOpenW = ow;
      dragOpenH = oh;
      dragFreeze = true;
    }
    dockEngaged = false;
    win.style.transition = "none";
    win.style.left = `${ox}px`;
    win.style.top = `${oy}px`;
    win.style.width = `${ow}px`;
    win.style.height = `${oh}px`;
    e.preventDefault();
  }

  on(window, "pointermove", (e) => {
    if (!dragWin) return;
    const ev = e as PointerEvent;
    if (Math.abs(ev.clientX - sx) > 3 || Math.abs(ev.clientY - sy) > 3) moved = true;
    if (dragMode === "resize") {
      const min = minSizeOf(dragWin.id);
      const vr = viewport.getBoundingClientRect();
      dragWin.style.width = `${Math.min(vr.width, Math.max(min.w, ow + (ev.clientX - sx)))}px`;
      dragWin.style.height = `${Math.min(vr.height, Math.max(min.h, oh + (ev.clientY - sy)))}px`;
    } else if (policyFor(dragWin.id).dock) {
      // 右缘停靠 scrub：p 驱动形变（全程可逆、逐帧跟随）；握把由收尾校正钉住指针
      const vr = viewport.getBoundingClientRect();
      const { lineW, barH } = dockDims();
      const d = vr.width - (ev.clientX - vr.left + gripRight1); // 判定口径 = 停靠后栏右缘距屏
      const p = clamp((dragPRef - d) / dragPSpan, 0, 1);
      // 送达标记一经过线即锁定，此后松手时机/位置不再改变结果
      if (!dragFromDocked && d <= lineW) dockLatched = true;
      if (dragFromDocked && d > lineW) openLatched = true;
      if (p > 0) {
        dockEngaged = true;
        if (dragFreeze) freezeInner(dragWin);
      }
      const eW = p * p; // 宽度后段才明显收窄
      const hT = clamp((p - 0.1) / 0.7, 0, 1);
      const eH = hT * hT * (3 - 2 * hT);
      const w = dragOpenW + (dragBarW - dragOpenW) * eW;
      const h = dragOpenH + (barH - dragOpenH) * eH;
      dragWin.style.left = `${ox + (ev.clientX - sx)}px`;
      dragWin.style.top = `${oy + (ev.clientY - sy)}px`;
      dragWin.style.width = `${w}px`;
      dragWin.style.height = `${h}px`;
      dragWin.style.setProperty("--dock-p", String(p));
    } else {
      dragWin.style.left = `${ox + (ev.clientX - sx)}px`;
      dragWin.style.top = `${oy + (ev.clientY - sy)}px`;
    }
    align(dragWin);
    // 握把钉住指针：整盒平移校正（--content-cx 是盒内相对量，随盒走，不可再加）
    if (dragMode === "move" && dragZone && policyFor(dragWin.id).dock) {
      const zr = dragZone.getBoundingClientRect();
      if (zr.width) {
        const dx = ev.clientX - (zr.x + zr.width / 2);
        if (Math.abs(dx) > 0.05) {
          dragWin.style.left = `${(parseFloat(dragWin.style.left) || 0) + dx}px`;
        }
      }
    }
  });

  // 手势结束 → commit 成状态（百分比几何）
  // 右缘停靠收尾：判定线两侧二选一——线内（只剩栏）动画停靠到位；线外回到打开态。
  on(window, "pointerup", () => {
    if (!dragWin) return;
    const win = dragWin;
    dragWin = null;
    win.style.transition = "";
    unfreezeInner(win);
    const ws = store.get().wins[win.id];
    const pol = policyFor(win.id);
    const vr = viewport.getBoundingClientRect();
    const wr = win.getBoundingClientRect();

    if (dragMode === "move" && moved && pol.dock && (dockEngaged || ws?.mode === "docked")) {
      const { inset, barH } = dockDims();
      // 送达标记决定落点，与松手时机/位置无关：拖出→还原；送达标记→停靠；未触发→回起手归属侧
      const dockNow = dragFromDocked ? !openLatched : dockLatched;
      if (dockNow) {
        // 过线后任何松手都停靠到位（y 停在松手处，钳在屏内）
        const yEnd = clamp(wr.top - vr.top, inset, vr.height - inset - barH);
        const box = dockBox(vr, yEnd, dragBarW);
        const wasDocked = ws!.mode === "docked";
        morphTo(win, box, 1, () => {
          store.update((s) => {
            patchWin(s, win.id, {
              mode: "docked",
              geom: pctGeom(box, vr),
              restoreGeom: wasDocked ? s.wins[win.id].restoreGeom : (dragFrom ?? ws!.geom),
            });
          });
          settleDockStack(win.id, yEnd, vr);
        });
        return;
      }
      // 回到原始打开的位置：拖出还原 = 停靠前几何；未送达标记 = 本次拖动起点
      const g = dragFromDocked ? (ws!.restoreGeom ?? ws!.geom) : (dragFrom ?? ws!.geom);
      const box = {
        left: (g.left / 100) * vr.width,
        top: (g.top / 100) * vr.height,
        width: (g.width / 100) * vr.width,
        height: (g.height / 100) * vr.height,
      };
      morphTo(win, box, 0, () => {
        store.update((s) => patchWin(s, win.id, { mode: "floating", geom: g }));
      });
      return;
    }

    if (ws && ws.mode === "floating") {
      const geom: Geom = {
        left: ((wr.left - vr.left) / vr.width) * 100,
        top: ((wr.top - vr.top) / vr.height) * 100,
        width: (wr.width / vr.width) * 100,
        height: (wr.height / vr.height) * 100,
      };
      store.update((s) => patchWin(s, win.id, { geom }));
    }
  });

  /** 停靠栈让位：新栏占住 y，其余栏保持间距 ≥ gap（gap 值 = 间距基准令牌） */
  function settleDockStack(skipId: string, yNew: number, vr: DOMRect): void {
    const { barH } = dockDims();
    const gap = pxVar("--gap", 8);
    const bars = Object.values(store.get().wins)
      .filter((w) => w.id !== skipId && w.mode === "docked" && w.status === "open")
      .map((w) => ({ id: w.id, top: (w.geom.top / 100) * vr.height }));
    for (const b of resolveDockStack(bars, yNew, barH, gap)) {
      const before = bars.find((x) => x.id === b.id)!;
      if (Math.abs(before.top - b.top) < 0.5) continue;
      const box = dockBox(vr, b.top, probeBar(el(b.id)!).barW);
      morphTo(el(b.id)!, box, 1, () => {
        store.update((s) => patchWin(s, b.id, { geom: pctGeom(box, vr) }));
      });
    }
  }

  /**
   * 停靠栏 → 还原浮窗（点击栏身 / Esc / 点 App 栏图标）。
   * 目标 = restoreGeom（停靠前的打开几何）；无记录则原地展开为默认浮窗尺寸。
   */
  function undock(id: string): void {
    const win = el(id);
    const ws = store.get().wins[id];
    if (!win || !ws || ws.mode !== "docked" || win.dataset.flipping === "1") return;
    const vr = viewport.getBoundingClientRect();
    const g = ws.restoreGeom ?? ws.geom;
    const box = {
      left: (g.left / 100) * vr.width,
      top: (g.top / 100) * vr.height,
      width: (g.width / 100) * vr.width,
      height: (g.height / 100) * vr.height,
    };
    focus(id);
    morphTo(win, box, 0, () => {
      store.update((s) => patchWin(s, id, { mode: "floating", geom: g }));
    });
  }

  // 点视口空白 → 全部失焦（系统栏/视口钮不夺焦）
  on(viewport, "pointerdown", (e) => {
    const t = e.target as Element;
    if (
      t.closest(".window") ||
      t.closest(".sys-status") ||
      t.closest(".sys-appbar") ||
      t.closest(".vp-resize")
    ) {
      return;
    }
    blurAll();
  }, true);

  // 键盘契约：对话框（Esc 关闭 / Tab 圈内）> 菜单 > 退出最大化
  on(document, "keydown", (e) => {
    const k = e as KeyboardEvent;
    const dlgApp = APPS.find((a) => {
      const w = el(winIdOf(a.id));
      return policyOf(a.winType).scrim && !!w && !w.hidden;
    });
    if (dlgApp) {
      const id = winIdOf(dlgApp.id);
      const w = el(id)!;
      if (k.key === "Escape") {
        close(id);
        e.preventDefault();
        return;
      }
      if (k.key === "Tab") {
        const f = $$<HTMLElement>("button, input, [tabindex]", w).filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        const act = document.activeElement as HTMLElement | null;
        if (!act || !w.contains(act)) {
          first.focus();
          e.preventDefault();
        } else if (k.shiftKey && act === first) {
          last.focus();
          e.preventDefault();
        } else if (!k.shiftKey && act === last) {
          first.focus();
          e.preventDefault();
        }
        return;
      }
      return;
    }
    if (k.key !== "Escape") return;
    if ($("[data-more-panel]:not([hidden]), [data-search-panel]:not([hidden])")) return;
    const id = focusedId();
    const ws = id ? store.get().wins[id] : null;
    if (ws?.mode === "docked") {
      undock(id!);
      return;
    }
    if (ws?.mode === "maximized") toggleMaximize(id!);
  });

  // 轻取消：点击临时窗口之外即关闭
  on(document, "pointerdown", (e) => {
    const t = e.target as Element;
    for (const a of APPS) {
      if (!policyOf(a.winType).lightDismiss) continue;
      const id = winIdOf(a.id);
      const w = el(id);
      if (!w || w.hidden) continue;
      if (t.closest(`#${id}`)) continue;
      close(id);
    }
  });

  /** 尺寸变化必须重对齐：--content-cx/cy 是像素值，而窗口几何是百分比 */
  /** 视口尺寸变化：全部窗口钳制到各自最小尺寸与视口包含（百分比几何的像素地板） */
  const fitToViewport = () => {
    const vr = viewport.getBoundingClientRect();
    if (vr.width < 2 || vr.height < 2) return;
    const { inset, barH } = dockDims();
    const updates: Array<[string, Geom]> = [];
    for (const ws of Object.values(store.get().wins)) {
      if (ws.mode === "docked") {
        // 停靠栏重钉：右缘贴 R、宽取该栏实测，y 保持并钳在屏内（不走最小尺寸钳制）
        const y = clamp((ws.geom.top / 100) * vr.height, inset, vr.height - inset - barH);
        const w = probeBar(el(ws.id)!).barW;
        const box = { left: vr.width - w, top: y, width: w, height: barH };
        updates.push([ws.id, pctGeom(box, vr)]);
        continue;
      }
      const g = fitGeom(ws.geom, minSizeOf(ws.id), vr.width, vr.height);
      if (
        g.left !== ws.geom.left ||
        g.top !== ws.geom.top ||
        g.width !== ws.geom.width ||
        g.height !== ws.geom.height
      ) {
        updates.push([ws.id, g]);
      }
    }
    if (updates.length) {
      store.update((st) => {
        for (const [id, g] of updates) patchWin(st, id, { geom: g });
      });
    }
  };

  const reAlign = () => {
    if (dragWin || $$(".window[data-flipping='1']").length) return;
    fitToViewport();
    for (const w of $$(".window")) align(w);
  };
  new ResizeObserver(reAlign).observe(viewport);
  window.addEventListener("resize", reAlign);
  window.addEventListener("load", reAlign);

  const firstId = focusedWin(store.get())?.id;
  if (firstId) focus(firstId);

  return {
    el,
    focusedId,
    focus,
    blurAll,
    isDragging: () => !!dragWin,
    toggleMaximize,
    minimize,
    close,
    open,
    undock,
    alignAll: reAlign,
  };
}

/** 导航切页：先出后入的上下滚动动画，不重叠 */
function bindNavPanes(win: HTMLElement): void {
  const btns = $$(".nav-btn", win);
  const panes = $$(".set-pane", win);
  if (!btns.length || !panes.length) return;
  let cur = btns.find((b) => b.classList.contains("active"))?.dataset.section || "";
  let busy = false;

  btns.forEach((btn) => {
    on(btn, "click", () => {
      if (busy) return;
      const name = btn.dataset.section;
      if (!name || name === cur) return;
      const oldP = panes.find((p) => p.dataset.pane === cur);
      const newP = panes.find((p) => p.dataset.pane === name);
      if (!newP) return;
      const order = btns.map((b) => b.dataset.section);
      const fwd = order.indexOf(name) > order.indexOf(cur);
      const d = durMs("--anim-pane");
      busy = true;
      btns.forEach((b) => b.classList.toggle("active", b === btn));
      if (oldP) {
        oldP.classList.add(fwd ? "leave-up" : "leave-down");
        window.setTimeout(() => {
          oldP.hidden = true;
          oldP.classList.remove("leave-up", "leave-down");
          newP.hidden = false;
          newP.classList.add(fwd ? "enter-up" : "enter-down");
          window.setTimeout(() => {
            newP.classList.remove("enter-up", "enter-down");
            cur = name;
            busy = false;
          }, d);
        }, d);
      } else {
        newP.hidden = false;
        cur = name;
        busy = false;
      }
    });
  });
}
