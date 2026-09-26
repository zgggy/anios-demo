/**
 * 窗口交互层：只 dispatch 状态，不直接改 DOM 样式。
 * 手势快速路径例外：拖动/缩放中直写 DOM，结束 commit 成状态（百分比几何）。
 */
import { $, $$, on, durMs } from "./dom";
import {
  Store,
  State,
  policyOf,
  patchWin,
  focusedWin,
  defaultMetrics,
  defaultDerivTerms,
  ANIMS,
  type Geom,
} from "./state";
import { patchWinEl, windowShellHTML, align } from "./render";
import { captureShell, playShell, minimizeTo, openFrom, closeIn } from "./anim";
import { APPS, winIdOf, type AppDef, type AppActions } from "./apps";
import { bindScrollIndicator } from "./host";

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

  const actions: AppActions = {
    openApp: (appId) => open(winIdOf(appId)),
    minimizeApp: (appId) => minimize(winIdOf(appId)),
    closeApp: (appId) => close(winIdOf(appId)),
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
    openFrom(win, appIcon(win), () => {
      win.dataset.anim = "0";
      store.update((s) => patchWin(s, id, { status: "open" }));
      syncScrim();
    });
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
    minimizeTo(win, appIcon(win), () => {
      win.dataset.anim = "0";
      store.update((s) => {
        patchWin(s, id, { status: "minimized", focused: false });
        for (const w of Object.values(s.wins)) {
          if (w.id !== id) patchWin(s, w.id, { focused: false });
        }
      });
    });
  }

  function close(id: string): void {
    const win = el(id);
    if (!win || win.dataset.anim === "1") return;
    win.dataset.anim = "1";
    closeIn(win, () => {
      win.dataset.anim = "0";
      store.update((s) => {
        patchWin(s, id, { status: "closed", focused: false });
        for (const w of Object.values(s.wins)) {
          if (w.id !== id) patchWin(s, w.id, { focused: false });
        }
      });
    });
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
      dragWin.style.width = `${Math.max(240, ow + (ev.clientX - sx))}px`;
      dragWin.style.height = `${Math.max(180, oh + (ev.clientY - sy))}px`;
    } else {
      dragWin.style.left = `${ox + (ev.clientX - sx)}px`;
      dragWin.style.top = `${oy + (ev.clientY - sy)}px`;
    }
    align(dragWin);
  });

  // 手势结束 → commit 成状态（百分比几何）
  on(window, "pointerup", () => {
    if (!dragWin) return;
    const win = dragWin;
    dragWin = null;
    win.style.transition = "";
    const ws = store.get().wins[win.id];
    if (ws && ws.mode === "floating") {
      const vr = viewport.getBoundingClientRect();
      const wr = win.getBoundingClientRect();
      const geom: Geom = {
        left: ((wr.left - vr.left) / vr.width) * 100,
        top: ((wr.top - vr.top) / vr.height) * 100,
        width: (wr.width / vr.width) * 100,
        height: (wr.height / vr.height) * 100,
      };
      store.update((s) => patchWin(s, win.id, { geom }));
    }
  });

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
  const reAlign = () => {
    if (dragWin || $$(".window[data-flipping='1']").length) return;
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
