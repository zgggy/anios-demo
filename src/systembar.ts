/**
 * 系统层：状态栏（左上）+ App 栏（左下）。与窗口无关，z-index 最高档。
 * App 栏状态订阅 store（开/焦点/最大化），不用 MutationObserver。
 */
import { $, $$, on } from "./dom";
import { Store, anyMaximized, METRICS, metricVar } from "./state";
import { statusBarHTML, appBarHTML, align, type AppBarItem } from "./render";
import { APPS, winIdOf } from "./apps";
import type { WinApi } from "./windows";

export function initStatusBar(store: Store): void {
  const viewport = $<HTMLElement>("#viewport")!;
  viewport.insertAdjacentHTML("beforeend", statusBarHTML());
  const root = $<HTMLElement>(".sys-status")!;
  const capsule = $<HTMLElement>(".status-capsule", root);
  const content = $<HTMLElement>(".status-content", root);
  const openBtn = $<HTMLElement>("[data-status-toggle]", root);
  const time = $<HTMLElement>("[data-time]", root);
  const arc = $<SVGCircleElement>("[data-battery] .bat-arc", root);
  const pct = $<HTMLElement>("[data-battery] .bat-pct", root);

  // 时钟 / 电量：设备运行时数据，本地维护
  const tick = () => {
    if (!time) return;
    const d = new Date();
    time.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

  const setOpen = (open: boolean) => {
    root.classList.toggle("is-open", open);
    if (content) content.hidden = !open;
    openBtn?.setAttribute("aria-expanded", open ? "true" : "false");
    capsule?.classList.toggle("is-open", open);
  };

  on(openBtn, "click", (e) => {
    e.stopPropagation();
    setOpen(!root.classList.contains("is-open"));
  });

  // 快捷操作：网络/主题走设置状态（网络类型在设置里也可切换）
  $$("[data-quick]", root).forEach((btn) => {
    on(btn, "click", () => {
      const k = btn.getAttribute("data-quick");
      if (k === "wifi" || k === "cell") {
        store.update((s) => (s.settings.net = k));
      }
      if (k === "theme-light" || k === "theme-dark") {
        store.update((s) => (s.settings.theme = k === "theme-dark" ? "dark" : "light"));
      }
      btn.classList.toggle("on");
    });
  });

  on(document, "pointerdown", (e) => {
    if ((e.target as Element).closest(".sys-status")) return;
    setOpen(false);
  });
}

export function initAppBar(store: Store, api: WinApi): void {
  const viewport = $<HTMLElement>("#viewport")!;
  // 自上而下：已打开 → 快速启动 → 启动台（永远最下）
  const items: AppBarItem[] = APPS.map((a) => ({
    appId: a.id,
    icon: a.icon,
    label: a.title,
  })).sort((a, b) => (a.appId === "launcher" ? 1 : b.appId === "launcher" ? -1 : 0));
  viewport.insertAdjacentHTML("beforeend", appBarHTML(items));
  const bar = $<HTMLElement>(".sys-appbar")!;

  // 订阅 store：开/焦点/最大化 → 按钮状态
  const sync = () => {
    const s = store.get();
    bar.classList.toggle("only-launch", anyMaximized(s));
    for (const btn of $$(".app-item", bar)) {
      const appId = btn.getAttribute("data-app-id") || "";
      const ws = s.wins[winIdOf(appId)];
      btn.classList.toggle("open", !!ws?.open);
      btn.classList.toggle("active", !!ws?.open && ws.focused);
    }
  };
  store.subscribe(sync);

  // 每个钮都是 app（含启动台）：toggle 打开/收起
  for (const btn of $$(".app-item", bar)) {
    on(btn, "click", (e) => {
      e.stopPropagation();
      const appId = btn.getAttribute("data-app-id") || "";
      const id = winIdOf(appId);
      const ws = store.get().wins[id];
      if (!ws) return;
      if (ws.open) api.minimize(id);
      else api.open(id);
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
    syncGroup("[data-net-mode]", "data-net-mode", st.net);
    syncGroup("[data-scroll-mode]", "data-scroll-mode", st.scrollMode);
    // 滑杆与标签回显
    const syncSlider = (id: string, v: number) => {
      const el = $<HTMLInputElement>(`#${id}`);
      if (el && Number(el.value) !== v) el.value = String(v);
      const l = $(`#${id}Val`);
      if (l) l.textContent = `${v}ms`;
    };
    syncSlider("animGlobal", st.animGlobal);
    syncSlider("animWindow", st.animWindow);
    syncSlider("animPane", st.animPane);
    syncSlider("animMenu", st.animMenu);
    // 几何度量 → CSS 令牌 + 滑杆回显
    for (const m of METRICS) {
      const v = st.metrics[m.key];
      root.style.setProperty(metricVar(m.key), `${v}px`);
      const input = $<HTMLInputElement>(`[data-metric="${m.key}"]`);
      if (input && Number(input.value) !== v) input.value = String(v);
      const lab = $(`[data-metric-val="${m.key}"]`);
      if (lab) lab.textContent = `${v}px`;
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
