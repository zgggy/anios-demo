import { $, $$, on } from "./dom";
import type { WinApi } from "./types";

type MenuHost = HTMLElement & { _closeMenus?: () => void };

/**
 * + menu and search-panel under the top-bar capsule.
 * Secondary items expand in place — never a second floating layer.
 */
export function initMenus(api: WinApi): void {
  api.wins.forEach((win) => {
    const more = $<HTMLElement>("[data-more]", win);
    const panel = $<HTMLElement>("[data-more-panel]", win);
    const search = $<HTMLElement>("[data-search]", win);
    const searchPanel = $<HTMLElement>("[data-search-panel]", win);
    if (!panel) return;

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
      api.focus(win);
      const open = panel.hidden;
      close();
      if (open) {
        panel.hidden = false;
        more?.setAttribute("aria-expanded", "true");
      }
    });

    on(search, "click", (e) => {
      e.stopPropagation();
      api.focus(win);
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
          api.close(win);
        } else if (act === "min") {
          api.minimize(win);
        } else if (act === "max") {
          api.toggleMaximize(win);
        }
      });
    });
  });

  on(document, "pointerdown", (e) => {
    const t = e.target as Element;
    if (t.closest("[data-more-panel], [data-more], [data-search-panel], [data-search]")) return;
    api.wins.forEach((w) => (w as MenuHost)._closeMenus?.());
  });
}
