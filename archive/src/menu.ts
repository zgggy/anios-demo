import { $, $$, on } from "./dom";

export function initMenus(wins: HTMLElement[]): void {
  wins.forEach((win) => {
    const plus = $("[data-plus]", win);
    const menu = $("[data-app-menu]", win);

    const close = () => {
      if (!menu) return;
      menu.hidden = true;
      plus?.setAttribute("aria-expanded", "false");
      $$(".mp-expand", menu).forEach((p) => p.classList.remove("is-open"));
      $$(".mp-expand-btn", menu).forEach((b) => b.setAttribute("aria-expanded", "false"));
    };
    (win as HTMLElement & { _closeMenu?: () => void })._closeMenu = close;

    if (!menu) return;

    on(plus, "click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      close();
      if (open) {
        menu.hidden = false;
        plus?.setAttribute("aria-expanded", "true");
      }
    });

    $$("[data-expand]", menu).forEach((btn) => {
      on(btn, "click", (e) => {
        e.stopPropagation();
        const key = btn.getAttribute("data-expand");
        const pane = $(`[data-expand-pane="${key}"]`, menu);
        if (!pane) return;
        const open = pane.classList.contains("is-open");
        $$(".mp-expand", menu).forEach((p) => p.classList.remove("is-open"));
        $$(".mp-expand-btn", menu).forEach((b) => b.setAttribute("aria-expanded", "false"));
        if (!open) {
          pane.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    $$("[data-act]", menu).forEach((el) => {
      on(el, "click", (e) => {
        e.stopPropagation();
        const act = el.getAttribute("data-act");
        close();
        if (act === "about") {
          window.alert((win.getAttribute("data-title") || "应用") + " · anios Studio 1.0");
        } else if (act === "quit") {
          $('[data-win="close"]', win)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        } else if (act === "min") {
          $('[data-win="min"]', win)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        } else if (act === "max") {
          $('[data-drag-zone]', win)?.dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true }),
          );
        }
      });
    });
  });

  on(document, "pointerdown", (e) => {
    wins.forEach((win) => {
      const menu = $("[data-app-menu]", win);
      if (!menu || menu.hidden) return;
      const t = e.target as Element;
      if (t.closest("[data-app-menu]") || t.closest("[data-plus]")) return;
      (win as HTMLElement & { _closeMenu?: () => void })._closeMenu?.();
    });
  });
}
