/**
 * `+` 菜单与搜索面板（挂在控制栏下，属该窗口）。
 * 二级项原地展开——禁止新开一层浮窗。菜单展开是视图瞬态，DOM 本地管理。
 */
import { $, $$, on } from "./dom";
import type { WinApi } from "./windows";
import { APPS, winIdOf } from "./apps";

type MenuHost = HTMLElement & { _closeMenus?: () => void };

export function initMenus(api: WinApi): void {
  for (const a of APPS) {
    const win = api.el(winIdOf(a.id));
    if (!win) continue;
    const more = $<HTMLElement>("[data-more]", win);
    const panel = $<HTMLElement>("[data-more-panel]", win);
    const search = $<HTMLElement>("[data-search]", win);
    const searchPanel = $<HTMLElement>("[data-search-panel]", win);
    if (!panel) continue;

    const close = () => {
      panel.hidden = true;
      more?.setAttribute("aria-expanded", "false");
      if (searchPanel) searchPanel.hidden = true;
      search?.setAttribute("aria-expanded", "false");
      $$(".mp-expand", panel).forEach((p) => p.classList.remove("open"));
    };
    (win as MenuHost)._closeMenus = close;

    on(more, "click", (e) => {
      e.stopPropagation();
      api.focus(win.id);
      const open = panel.hidden;
      close();
      if (open) {
        panel.hidden = false;
        more?.setAttribute("aria-expanded", "true");
      }
    });

    on(search, "click", (e) => {
      e.stopPropagation();
      api.focus(win.id);
      const open = searchPanel ? searchPanel.hidden : false;
      close();
      if (searchPanel && open) {
        searchPanel.hidden = false;
        search?.setAttribute("aria-expanded", "true");
        $<HTMLInputElement>("input", searchPanel)?.focus();
      }
    });

    $$("[data-expand]", panel).forEach((btn) => {
      on(btn, "click", (e) => {
        e.stopPropagation();
        const key = btn.getAttribute("data-expand");
        const pane = key ? $(`[data-expand-pane="${key}"]`, panel) : null;
        if (!pane) return;
        const was = pane.classList.contains("open");
        $$(".mp-expand", panel).forEach((p) => p.classList.remove("open"));
        if (!was) pane.classList.add("open");
      });
    });

    $$("[data-act]", panel).forEach((el) => {
      on(el, "click", (e) => {
        e.stopPropagation();
        const act = el.getAttribute("data-act");
        close();
        if (act === "about") {
          alert(`${win.dataset.title || "应用"} · anios 1.0`);
        } else if (act === "quit") {
          api.close(win.id);
        } else if (act === "min") {
          api.minimize(win.id);
        } else if (act === "max") {
          api.toggleMaximize(win.id);
        }
      });
    });
  }

  // 点外部关闭
  on(document, "pointerdown", (e) => {
    const t = e.target as Element;
    if (t.closest("[data-more-panel], [data-more], [data-search-panel], [data-search]")) return;
    for (const w of $$(".window")) (w as MenuHost)._closeMenus?.();
  });

  // Esc 关闭菜单/搜索面板
  on(document, "keydown", (e) => {
    if ((e as KeyboardEvent).key !== "Escape") return;
    for (const w of $$(".window")) (w as MenuHost)._closeMenus?.();
  });
}
