import { $, $$, on } from "./dom";
import { alignCenter } from "./layout";
import { toggleMaximize } from "./anim/maximize";
import { viewportRect } from "./viewport";

export interface WinCtx {
  wins: HTMLElement[];
  focused: () => HTMLElement | null;
  focus: (w: HTMLElement) => void;
  dragMoved: () => boolean;
}

export function initWindows(): WinCtx {
  const wins = $$(".window");
  let zTop = 20;
  let dragWin: HTMLElement | null = null;
  let dragMode = "";
  let moved = false;
  let dsx = 0;
  let dsy = 0;
  let dStartX = 0;
  let dStartY = 0;
  let dWinW = 0;
  let dWinH = 0;

  const focused = () => $(".window.is-focused") as HTMLElement | null;

  const focus = (win: HTMLElement) => {
    if (win.classList.contains("is-focused")) return;
    wins.forEach((w) => {
      w.classList.remove("is-focused");
      $$("[data-content-resize].is-on", w).forEach((el) => el.classList.remove("is-on"));
    });
    win.classList.add("is-focused");
    zTop += 1;
    if (zTop > 100) zTop = 30;
    win.style.zIndex = String(zTop);
    alignCenter(win);
  };

  wins.forEach((win) => {
    const hits = [
      $("[data-content]", win),
      $(".topbar", win),
      $(".navbar", win),
    ].filter(Boolean) as HTMLElement[];
    hits.forEach((el) => {
      on(el, "pointerdown", () => focus(win), { capture: true } as AddEventListenerOptions);
    });

    const dragZone = $("[data-drag-zone]", win);
    on(dragZone, "pointerdown", (e) => {
      if ((e.target as Element).closest(".win-ctl")) return;
      if (win.getAttribute("data-mode") !== "floating") return;
      dragWin = win;
      dragMode = "handle";
      moved = false;
      focus(win);
      const wr = win.getBoundingClientRect();
      const vr = viewportRect();
      if (!vr) return;
      dStartX = wr.left - vr.left;
      dStartY = wr.top - vr.top;
      dWinW = wr.width;
      dWinH = wr.height;
      dsx = e.clientX;
      dsy = e.clientY;
      win.style.transition = "none";
      win.style.left = dStartX + "px";
      win.style.top = dStartY + "px";
      win.style.width = dWinW + "px";
      win.style.height = dWinH + "px";
      e.preventDefault();
      e.stopPropagation();
      document.body.style.cursor = "grabbing";
    });

    on(dragZone, "dblclick", (e) => {
      if ((e.target as Element).closest(".win-ctl")) return;
      toggleMaximize(win);
    });

    on($('[data-win="min"]', win), "click", (e) => {
      e.stopPropagation();
      win.style.opacity = "0";
      window.setTimeout(() => {
        win.style.opacity = "";
      }, 200);
    });

    on($('[data-win="close"]', win), "click", (e) => {
      e.stopPropagation();
      win.style.display = "none";
      window.setTimeout(() => {
        win.style.display = "";
        win.style.opacity = "";
        focus(win);
      }, 350);
    });

    // content resize
    const cre = $("[data-content-resize]", win) as HTMLElement | null;
    const contentEl = $("[data-content]", win) as HTMLElement | null;
    let creOn = false;
    if (cre && contentEl) {
      on(contentEl, "pointermove", (e: PointerEvent) => {
        const cr = contentEl.getBoundingClientRect();
        const near =
          win.classList.contains("is-focused") &&
          e.clientX > cr.right - 120 &&
          e.clientY > cr.bottom - 120;
        if (near === creOn) return;
        creOn = near;
        cre.classList.toggle("is-on", near);
      });
      on(cre, "pointerdown", (e) => {
        if (win.getAttribute("data-mode") !== "floating") return;
        dragWin = win;
        dragMode = "resize";
        moved = false;
        const wr = win.getBoundingClientRect();
        const vr = viewportRect();
        if (!vr) return;
        dStartX = wr.left - vr.left;
        dStartY = wr.top - vr.top;
        dWinW = wr.width;
        dWinH = wr.height;
        dsx = e.clientX;
        dsy = e.clientY;
        win.style.transition = "none";
        e.preventDefault();
        e.stopPropagation();
      });
    }
  });

  on(window, "pointermove", (e) => {
    if (!dragWin) return;
    if (Math.abs(e.clientX - dsx) > 3 || Math.abs(e.clientY - dsy) > 3) moved = true;
    const vr = viewportRect();
    if (!vr) return;

    if (dragMode === "resize") {
      dragWin.style.width = Math.max(220, dWinW + (e.clientX - dsx)) + "px";
      dragWin.style.height = Math.max(160, dWinH + (e.clientY - dsy)) + "px";
    } else {
      // no clamp — window may leave the screen
      dragWin.style.left = dStartX + (e.clientX - dsx) + "px";
      dragWin.style.top = dStartY + (e.clientY - dsy) + "px";
    }
    alignCenter(dragWin);
  });

  on(window, "pointerup", () => {
    if (!dragWin) return;
    const win = dragWin;
    dragWin = null;
    dragMode = "";
    document.body.style.cursor = "";
    const vr = viewportRect();
    if (vr?.width && win.getAttribute("data-mode") === "floating") {
      const wr = win.getBoundingClientRect();
      win.style.left = ((wr.left - vr.left) / vr.width) * 100 + "%";
      win.style.top = ((wr.top - vr.top) / vr.height) * 100 + "%";
      win.style.width = (wr.width / vr.width) * 100 + "%";
      win.style.height = (wr.height / vr.height) * 100 + "%";
    }
    win.style.transition = "";
    alignCenter(win);
  });

  // wallpaper click → unfocus
  on($("#viewport"), "pointerdown", (e) => {
    const t = e.target as Element;
    if (
      t.closest(".window") ||
      t.closest(".recover") ||
      t.closest(".vp-resize") ||
      t.closest("#statusBar")
    ) {
      return;
    }
    wins.forEach((w) => w.classList.remove("is-focused"));
  }, true);

  const first = $("#winSettings") as HTMLElement | null;
  if (first) focus(first);

  return {
    wins,
    focused,
    focus,
    dragMoved: () => moved,
  };
}
