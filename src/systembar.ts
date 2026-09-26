import { $, $$, on } from "./dom";
import type { WinApi } from "./types";

/**
 * Status bar = a nav-bar (system). Capsule ghost until hover; content panel
 * (no top-bar) holds all device status + quick actions. Content is hidden
 * until opened.
 *
 * App bar: every control is an app (including launcher). Click toggles
 * open/minimize that app's window. No search button — search lives in the
 * launcher window top-bar.
 */
export function initStatusBar(): void {
  const root = $<HTMLElement>(".sys-status");
  if (!root) return;
  const capsule = $<HTMLElement>(".status-capsule", root);
  const content = $<HTMLElement>(".status-content", root);
  const openBtn = $<HTMLElement>("[data-status-toggle]", root);
  const time = $<HTMLElement>("[data-time]", root);
  const arc = $<SVGCircleElement>("[data-battery] .bat-arc", root);
  const pct = $<HTMLElement>("[data-battery] .bat-pct", root);

  const tick = () => {
    if (!time) return;
    const d = new Date();
    time.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

  // outside-click close is handled by initTempWindows ([data-temp] + temp:close)
  content?.addEventListener("temp:close", () => setOpen(false));

  // quick actions inside status content
  $$("[data-quick]", root).forEach((btn) => {
    on(btn, "click", () => {
      const k = btn.getAttribute("data-quick");
      if (k === "wifi" || k === "cell") {
        $(".sys-status")?.setAttribute("data-net", k === "cell" ? "cell" : "wifi");
        $$("[data-net-mode]").forEach((x) =>
          x.setAttribute(
            "aria-pressed",
            x.getAttribute("data-net-mode") === (k === "cell" ? "cell" : "wifi") ? "true" : "false",
          ),
        );
      }
      if (k === "theme-light" || k === "theme-dark") {
        const m = k === "theme-dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", m);
        $$("button[data-theme]").forEach((x) =>
          x.setAttribute("aria-pressed", x.getAttribute("data-theme") === m ? "true" : "false"),
        );
      }
      btn.classList.toggle("on");
    });
  });
}

export function initAppBar(api: WinApi): void {
  const bar = $<HTMLElement>(".sys-appbar");
  if (!bar) return;

  const sync = () => {
    const anyMax = api.wins.some((w) => w.getAttribute("data-mode") === "maximized");
    bar.classList.toggle("only-launch", anyMax);
    $$(".app-item", bar).forEach((btn) => {
      const id = btn.getAttribute("data-app-id");
      const win = api.wins.find((w) => w.dataset.app === id);
      const showing = !!win && win.style.display !== "none" && !win.hidden && win.dataset.open !== "0";
      btn.classList.toggle("open", showing);
      btn.classList.toggle("active", showing && win.classList.contains("is-focused"));
    });
  };

  // every app-item (including launcher) toggles its app window
  $$(".app-item", bar).forEach((btn) => {
    on(btn, "click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-app-id");
      if (!id) return;
      if (id === "launcher") {
        const s = $<HTMLElement>("#winSearch");
        if (!s) return;
        const showing = s.style.display !== "none" && !s.hidden && s.dataset.open !== "0";
        if (showing) api.minimize(s);
        else api.open(s);
        sync();
        return;
      }
      const win = api.wins.find((w) => w.dataset.app === id);
      if (!win) return;
      const showing = win.style.display !== "none" && !win.hidden && win.dataset.open !== "0";
      if (showing) api.minimize(win);
      else api.open(win);
      sync();
    });
  });

  api.wins.forEach((w) => {
    const mo = new MutationObserver(sync);
    mo.observe(w, { attributes: true, attributeFilter: ["data-mode", "style", "class", "data-open", "hidden"] });
  });
  document.addEventListener("anios:win-close", sync);
  sync();
}
