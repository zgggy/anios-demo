import { $, $$, on } from "./dom";

export function initTheme(): void {
  const setTheme = (mode: string) => {
    document.documentElement.setAttribute("data-theme", mode);
    $$("[data-theme]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme") === mode ? "true" : "false");
    });
  };

  $$("[data-theme]").forEach((btn) => {
    on(btn, "click", () => setTheme(btn.getAttribute("data-theme") ?? "light"));
  });

  $$(".cd").forEach((dot) => {
    on(dot, "click", () => {
      $$(".cd").forEach((d) => d.classList.remove("active"));
      dot.classList.add("active");
      const c = getComputedStyle(dot).getPropertyValue("--c").trim();
      if (c) document.documentElement.style.setProperty("--accent", c);
    });
  });

  setTheme("light");
}

export function initAnimSpeed(): void {
  const global = $("#animGlobal") as HTMLInputElement | null;
  const win = $("#animWindow") as HTMLInputElement | null;
  const pane = $("#animPane") as HTMLInputElement | null;
  const menu = $("#animMenu") as HTMLInputElement | null;

  const set = (name: string, ms: number, valId: string) => {
    document.documentElement.style.setProperty(name, ms + "ms");
    const el = $("#" + valId);
    if (el) el.textContent = ms + "ms";
  };

  const syncAll = () => {
    const g = Number(global?.value || 360);
    set("--dur", g, "animGlobalVal");
    set("--anim-window", Number(win?.value ?? g), "animWindowVal");
    set("--anim-pane", Number(pane?.value ?? 200), "animPaneVal");
    set("--anim-menu", Number(menu?.value ?? 200), "animMenuVal");
  };

  on(global, "input", () => {
    const g = Number(global!.value);
    if (win) win.value = String(g);
    if (pane) pane.value = String(Math.min(200, Math.round(g * 0.55)));
    if (menu) menu.value = String(Math.min(200, Math.round(g * 0.55)));
    syncAll();
  });
  [win, pane, menu].forEach((el) => on(el, "input", syncAll));
  syncAll();
}

export function windowDurMs(): number {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--anim-window"),
  );
  return Number.isFinite(v) ? v : 360;
}

export function paneDurMs(): number {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--anim-pane"),
  );
  return Number.isFinite(v) ? v : 200;
}
