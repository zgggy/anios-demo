/**
 * 系统层：状态栏（左上）+ App 栏（左下）。与窗口无关，z-index 最高档。
 * App 栏状态订阅 store（开/焦点/最大化），不用 MutationObserver。
 */
import { $, $$, on } from "./dom";
import gsap from "gsap";
import {
  Store,
  anyMaximized,
  isRunning,
  NoticeItem,
  policyOf,
  METRICS,
  ANIMS,
  DERIVS,
  DERIV_TERMS,
  defaultDerivTerms,
  metricVar,
} from "./state";
import { statusBarHTML, appBarHTML, align, icon, type AppBarItem } from "./render";
import { APPS, winIdOf } from "./apps";
import type { WinApi } from "./windows";

export function initStatusBar(store: Store, api: WinApi): void {
  const viewport = $<HTMLElement>("#viewport")!;
  viewport.insertAdjacentHTML("beforeend", statusBarHTML());
  const root = $<HTMLElement>(".sys-status")!;
  const capsule = $<HTMLElement>(".status-capsule", root);
  const time = $<HTMLElement>("[data-time]", root);
  const panelClock = $<HTMLElement>("[data-panel-clock]", root);
  const arc = $<SVGCircleElement>("[data-battery] .bat-arc", root);
  const pct = $<HTMLElement>("[data-battery] .bat-pct", root);
  const bell = $<HTMLElement>("[data-status-notify]", root);
  const banner = $<HTMLElement>("[data-notice-banner]", root);
  const nbTitle = $<HTMLElement>("[data-notice-banner] .nb-title", root);
  const nbBody = $<HTMLElement>("[data-notice-banner] .nb-body", root);
  const nbBar = $<HTMLElement>("[data-notice-banner] .nb-bar", root);
  const noticeList = $<HTMLElement>("[data-notice-list]", root);

  // 时钟 / 电量：设备运行时数据，本地维护
  const tick = () => {
    const d = new Date();
    const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (time) time.textContent = hm;
    if (panelClock) panelClock.textContent = hm;
    $$("[data-time-full]", root).forEach(
      (el) => (el.textContent = `今日 ${d.getMonth() + 1}月${d.getDate()}日`),
    );
  };
  tick();
  window.setInterval(tick, 30_000);

  const bat = (p: number) => {
    if (!arc || !pct) return;
    const r = 14;
    const c = 2 * Math.PI * r;
    const sweep = (270 / 360) * c;
    arc.style.strokeDasharray = `${sweep} ${c}`;
    arc.style.strokeDashoffset = String(sweep * (1 - p / 100));
    pct.textContent = String(Math.round(p));
  };
  bat(72);

  // ── 面板：状态栏每钮一块临时面板，互斥，点外即收 ──
  let openKey: string | null = null;
  const setPanel = (key: string | null) => {
    openKey = key;
    $$(".status-content", root).forEach((p) => (p.hidden = p.dataset.statusPanel !== openKey));
    $$("[data-status-open]", root).forEach((b) => {
      const on = b.getAttribute("data-status-open") === openKey;
      b.classList.toggle("active", on);
      b.setAttribute("aria-expanded", on ? "true" : "false");
    });
  };
  $$("[data-status-open]", root).forEach((b) => {
    on(b, "click", (e) => {
      e.stopPropagation();
      const key = b.getAttribute("data-status-open")!;
      setPanel(openKey === key ? null : key);
    });
  });
  on(document, "pointerdown", (e) => {
    if ((e.target as Element).closest(".sys-status")) return;
    setPanel(null);
  });

  // ── 面板底部跳转：关闭面板 → 打开 App → 切到对应页 ──
  $$("[data-jump]", root).forEach((b) => {
    on(b, "click", () => {
      const [appId, section] = (b.getAttribute("data-jump") || "").split(":");
      setPanel(null);
      api.open(winIdOf(appId));
      document
        .querySelector(`#${winIdOf(appId)} .nav-btn[data-section='${section}']`)
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  });

  // ── 通知：横幅栈（新上旧下）· 点击进 App · 悬停清除=左滑出屏 · 收起=上滑回列表 ──
  // 可见性：通知栏开 = 列表全部（除已处理）；通知栏关 = 仅未收起的新通知。
  // 收起/清除的退场动画先于状态更新，renderStack 只做差量。
  const stack = $<HTMLElement>("[data-notice-stack]", root);
  const actionsRow = $<HTMLElement>("[data-notice-actions]", root);
  const bannerDur = 6000;
  let centerOpen = false;
  const fresh = new Set<number>();  // 新通知（带进度条展示）
  const hidden = new Set<number>(); // 已收起/已处理（不出现在横幅栈）
  const els = new Map<number, HTMLElement>();

  const visibleIds = () =>
    store
      .get()
      .notices.filter((n) => (centerOpen ? !hidden.has(n.id) : fresh.has(n.id) && !hidden.has(n.id)));

  const makeBanner = (n: NoticeItem, withProgress: boolean): HTMLElement => {
    const el = document.createElement("div");
    el.className = "notice-banner";
    el.dataset.noticeId = String(n.id);
    el.innerHTML = `
      ${withProgress ? '<span class="nb-progress"><span class="nb-bar"></span></span>' : ""}
      <div class="nb-title">${n.title}</div>
      <div class="nb-body">${n.body}</div>
      <button type="button" class="nb-clear" aria-label="清除通知">${icon("x")}</button>`;
    return el;
  };

  /** 收起：上滑出屏，进入列表（不再展示，除非通知栏重展） */
  const collapseUp = (id: number) => {
    if (hidden.has(id)) return;
    hidden.add(id);
    const el = els.get(id);
    if (!el) return;
    els.delete(id);
    gsap.to(el, {
      yPercent: -140,
      duration: 0.24,
      ease: "power2.in",
      onComplete: () => {
        gsap.to(el, {
          height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.16,
          onComplete: () => el.remove(),
        });
      },
    });
  };

  /** 清除：左滑出屏，通知从列表删除 */
  const clearLeft = (id: number) => {
    hidden.delete(id);
    const el = els.get(id);
    if (!el) return;
    els.delete(id);
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: -(r.right + 24), duration: 0.26, ease: "power2.in", onComplete: () => el.remove() });
  };

  const startProgress = (id: number, el: HTMLElement) => {
    const bar = el.querySelector<HTMLElement>(".nb-bar");
    let t = 0;
    const timer = window.setInterval(() => {
      t += 100;
      if (bar) bar.style.width = `${Math.min(100, (t / bannerDur) * 100)}%`;
      if (t >= bannerDur) {
        window.clearInterval(timer);
        el.querySelector(".nb-progress")?.remove();
        collapseUp(id); // 通知栏开着也已处理过，不重复展示
      }
    }, 100);
  };

  const clearNotice = (id: number) => {
    clearLeft(id); // 左滑动画（内部会摘除 els 并在出屏后移除元素）
    store.update((s) => {
      s.notices = s.notices.filter((n) => n.id !== id);
    });
  };

  const renderStack = () => {
    if (!stack) return;
    const want = visibleIds();
    // 移除不再展示的
    for (const [id, el] of [...els]) {
      if (!want.some((n) => n.id === id)) {
        els.delete(id);
        gsap.to(el, { yPercent: -140, duration: 0.22, onComplete: () => el.remove() });
      }
    }
    // 新通知插入顶部，旧的下移（FLIP）
    const before = new Map(
      [...stack.children].map((el) => [
        (el as HTMLElement).dataset.noticeId,
        (el as HTMLElement).getBoundingClientRect().top,
      ]),
    );
    for (let i = want.length - 1; i >= 0; i--) {
      const n = want[i];
      if (els.has(n.id)) continue;
      const withProgress = fresh.has(n.id) && !centerOpen;
      const el = makeBanner(n, withProgress);
      el.dataset.noticeId = String(n.id);
      els.set(n.id, el);
      stack.prepend(el);
      gsap.from(el, { yPercent: -140, duration: 0.26, ease: "power3.out" });
      el.addEventListener("click", (e) => {
        if ((e.target as Element).closest(".nb-clear")) return;
        if (n.app) api.open(winIdOf(n.app));
        collapseUp(n.id);
      });
      on(el.querySelector(".nb-clear"), "click", () => clearNotice(n.id));
      if (withProgress) startProgress(n.id, el);
    }
    for (const el of [...stack.children] as HTMLElement[]) {
      const prevTop = before.get(el.dataset.noticeId!);
      if (prevTop === undefined) continue;
      const d = prevTop - el.getBoundingClientRect().top;
      if (Math.abs(d) > 2) gsap.from(el, { y: d, duration: 0.22, ease: "power2.out" });
    }
    // 通知栏视图：无限时长——摘除全部进度条
    if (centerOpen) {
      for (const el of els.values()) el.querySelector(".nb-progress")?.remove();
    }
    if (actionsRow) actionsRow.hidden = !centerOpen || want.length === 0;
  };

  // 铃铛：通知栏开合 = 列表全部重新展示 / 全部收起
  on(bell, "click", (e) => {
    e.stopPropagation();
    setPanel(null);
    centerOpen = !centerOpen;
    if (centerOpen) hidden.clear();
    renderStack();
  });
  on(actionsRow?.querySelector("[data-notice-clear-all]"), "click", () => {
    for (const id of [...els.keys()]) clearNotice(id);
    store.update((s) => {
      s.notices = [];
    });
    hidden.clear();
    centerOpen = false;
    renderStack();
  });
  on(actionsRow?.querySelector("[data-notice-collapse-all]"), "click", () => {
    centerOpen = false;
    renderStack(); // 全部收起：上滑回列表
  });

  const known = new Set<number>(); // 见过的通知 id：首次见到入 fresh（带进度展示）
  const syncNotices = () => {
    const s = store.get();
    if (bell) bell.hidden = s.notices.length === 0;
    for (const n of s.notices) {
      if (!known.has(n.id)) {
        known.add(n.id);
        fresh.add(n.id);
      }
    }
    if (!s.notices.length) centerOpen = false;
    renderStack();
  };
  store.subscribe(syncNotices);
  syncNotices();
}

export function initAppBar(store: Store, api: WinApi): void {
  const viewport = $<HTMLElement>("#viewport")!;
  // 自上而下：已打开 → 快速启动 → 启动台（永远最下）
  const items: AppBarItem[] = APPS.filter((a) => policyOf(a.winType).appIcon)
    .map((a) => ({ appId: a.id, icon: a.icon, label: a.title }))
    .sort((a, b) => (a.appId === "launcher" ? 1 : b.appId === "launcher" ? -1 : 0));
  viewport.insertAdjacentHTML("beforeend", appBarHTML(items));
  const bar = $<HTMLElement>(".sys-appbar")!;

  // 订阅 store：可见性/分区/四态/最大化 → 按钮状态
  // 自下而上（order 3→1）：启动台(恒最下) → 快速启动(注册表 pinned) → 已打开区(未固定且未关闭)
  // 四态：active=打开(焦点) · open=后台(开窗未聚焦) · min=收起 · 无类=关闭(仅固定应用在栏)
  const sync = () => {
    const s = store.get();
    bar.classList.toggle("only-launch", anyMaximized(s));
    for (const btn of $$(".app-item", bar)) {
      const appId = btn.getAttribute("data-app-id") || "";
      const def = APPS.find((a) => a.id === appId);
      const ws = s.wins[winIdOf(appId)];
      const launcher = appId === "launcher";
      const visible = launcher || !!def?.pinned || (ws ? isRunning(ws) : false);
      btn.classList.toggle("gone", !visible);
      btn.style.order = String(launcher ? 3 : def?.pinned ? 2 : 1);
      btn.classList.toggle("open", ws?.status === "open");
      btn.classList.toggle("min", ws?.status === "minimized");
      btn.classList.toggle("active", ws?.status === "open" && ws.focused);
    }
  };
  store.subscribe(sync);

  // 每个钮都是 app（含启动台）：关闭→打开 · 收起→还原 · 后台→提到前台 · 前台→收起
  for (const btn of $$(".app-item", bar)) {
    on(btn, "click", (e) => {
      e.stopPropagation();
      const appId = btn.getAttribute("data-app-id") || "";
      const id = winIdOf(appId);
      const ws = store.get().wins[id];
      if (!ws) return;
      if (ws.status === "open") {
        if (ws.focused) api.minimize(id);
        else api.focus(id);
      } else {
        api.open(id);
      }
    });
  }
  sync();
}

/** 设置状态 → CSS 变量 / 属性（渲染层的「设置补丁」） */
export function bindSettingsPatch(store: Store): void {
  const apply = () => {
    const st = store.get().settings;
    const root = document.documentElement;
    root.setAttribute("data-theme", st.theme);
    $(".wallpaper")?.setAttribute("data-pack", st.wallpaper);
    root.style.setProperty("--accent", st.accent);
    root.style.setProperty("--anim-window", `${st.animWindow}ms`);
    root.style.setProperty("--anim-pane", `${st.animPane}ms`);
    root.style.setProperty("--anim-menu", `${st.animMenu}ms`);
    $$(".scroll-indicator").forEach((el) => (el.dataset.mode = st.scrollMode));
    $(".sys-status")?.setAttribute("data-net", st.net);
    // 互斥按钮组 aria-pressed 同步
    const syncGroup = (sel: string, attr: string, val: string) => {
      for (const b of $$(sel)) {
        b.setAttribute("aria-pressed", b.getAttribute(attr) === val ? "true" : "false");
      }
    };
    syncGroup("button[data-theme]", "data-theme", st.theme);
    syncGroup("[data-wallpaper]", "data-wallpaper", st.wallpaper);
    syncGroup("[data-net-mode]", "data-net-mode", st.net);
    syncGroup("[data-scroll-mode]", "data-scroll-mode", st.scrollMode);
    // 滑杆回显（时长 / 度量 / 派生项）
    const echo = (kind: "metric" | "anim" | "term", key: string, v: number, unit: string) => {
      const input = $<HTMLInputElement>(`[data-${kind}="${key}"]`);
      if (input && Number(input.value) !== v) input.value = String(v);
      const lab = $(`[data-${kind}-val="${key}"]`);
      if (lab) lab.textContent = `${v}${unit}`;
    };
    for (const a of ANIMS) echo("anim", a.key, st[a.key as "animWindow"], a.unit);
    for (const m of METRICS) {
      const v = st.metrics[m.key];
      root.style.setProperty(metricVar(m.key), `${v}px`);
      echo("metric", m.key, v, "px");
    }
    // 派生参数：公式 → CSS 令牌；公式文本与值实时代入可调项
    const terms = { ...defaultDerivTerms(), ...st.derivTerms };
    for (const t of DERIV_TERMS) echo("term", t.key, terms[t.key], "");
    for (const d of DERIVS) {
      const v = d.compute(st.metrics, terms);
      root.style.setProperty(d.cssVar, `${v}px`);
      const f = $(`[data-deriv-f="${d.key}"]`);
      if (f) f.textContent = d.formula(st.metrics, terms);
      const vv = $(`[data-deriv-val="${d.key}"]`);
      if (vv) vv.textContent = `${v}px`;
    }
    // 度量变化会移动内容盒 → 同任务刷新派生对齐（补间中的窗口除外）
    for (const w of $$(".window")) {
      if (w.dataset.flipping !== "1") align(w);
    }
    // 强调色圆点高亮
    for (const d of $$(".cd")) {
      d.classList.toggle(
        "active",
        getComputedStyle(d).getPropertyValue("--c").trim() === st.accent,
      );
    }
  };
  store.subscribe(apply);
  apply();
}
