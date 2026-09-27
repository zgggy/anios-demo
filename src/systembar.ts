/**
 * 系统层：状态栏（左上）+ App 栏（左下）。与窗口无关，z-index 最高档。
 * App 栏状态订阅 store（开/焦点/最大化），不用 MutationObserver。
 */
import { $, $$, on } from "./dom";
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
import { statusBarHTML, appBarHTML, align, type AppBarItem } from "./render";
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

  // ── 通知：横幅队列（滑入 → 进度满 → 滑出）+ 通知栏（栈）+ 铃铛显隐 ──
  const bannerDur = 6000;
  const queue: NoticeItem[] = [];
  const shown = new Set<number>();
  let bannerBusy = false;
  let bannerTimer = 0;

  const pumpBanner = () => {
    if (bannerBusy || !banner) return;
    const n = queue.shift();
    if (!n) return;
    bannerBusy = true;
    if (nbTitle) nbTitle.textContent = n.title;
    if (nbBody) nbBody.textContent = n.body;
    if (nbBar) nbBar.style.width = "0%";
    banner.hidden = false;
    window.setTimeout(() => banner.classList.add("on"), 20);
    let t = 0;
    bannerTimer = window.setInterval(() => {
      t += 100;
      if (nbBar) nbBar.style.width = `${Math.min(100, (t / bannerDur) * 100)}%`;
      if (t >= bannerDur) {
        window.clearInterval(bannerTimer);
        banner.classList.remove("on");
        window.setTimeout(() => {
          banner.hidden = true;
          bannerBusy = false;
          pumpBanner();
        }, 260);
      }
    }, 100);
  };

  const syncNotices = () => {
    const s = store.get();
    if (bell) bell.hidden = s.notices.length === 0;
    if (noticeList) {
      noticeList.innerHTML = s.notices.length
        ? s.notices
            .map((n) => {
              const d = new Date(n.ts);
              const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              return `<div class="set-row"><div><div class="row-t">${n.title}</div><div class="row-s">${n.body} · ${hm}</div></div></div>`;
            })
            .join("")
        : '<div class="set-empty">暂无通知</div>';
    }
    for (const n of s.notices) {
      if (!shown.has(n.id)) {
        shown.add(n.id);
        queue.push(n);
      }
    }
    pumpBanner();
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
