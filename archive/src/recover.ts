import { $, clamp, on } from "./dom";
import type { Edge, Orient } from "./types";
import type { WinCtx } from "./window";
import { toggleMaximize } from "./maximize";
import { viewportRect } from "./viewport";

const GAP = 5;
const DRAG_H = 28;
const NEAR = DRAG_H + 2 * GAP; // 38

function getRecover(win: HTMLElement): HTMLElement | null {
  return $("[data-recover]", win);
}

function dragHandleVisible(win: HTMLElement): boolean {
  const bar = $(".topbar", win);
  if (!bar) return true;
  const h = bar.getBoundingClientRect();
  const v = viewportRect();
  if (!v) return true;
  return (
    h.top >= v.top - 0.5 &&
    h.left >= v.left - 0.5 &&
    h.right <= v.right + 0.5 &&
    h.bottom <= v.bottom + 0.5
  );
}

function hideAll(wins: HTMLElement[]): void {
  wins.forEach((w) => {
    const rc = getRecover(w);
    if (!rc) return;
    rc.hidden = true;
    rc.classList.remove("is-on");
  });
}

/**
 * Recover drag control (owned by the window).
 * Show when focused window's drag control is off-screen and mouse is near an edge.
 * Place outside the nearest CONTENT edge; nav is treated as off-screen on the left.
 */
export function initRecover(ctx: WinCtx, onDragStart: (win: HTMLElement, e: PointerEvent) => void): void {
  let visible = false;

  const place = (e: PointerEvent) => {
    const win = ctx.focused();
    const rc = win ? getRecover(win) : null;
    const contentEl = win ? $("[data-content]", win) : null;
    const navEl = win ? $(".navbar", win) : null;
    if (!win || !rc || !contentEl || win.getAttribute("data-mode") !== "floating") {
      hideAll(ctx.wins);
      visible = false;
      return;
    }
    if (dragHandleVisible(win)) {
      hideAll(ctx.wins);
      visible = false;
      return;
    }

    const wr = contentEl.getBoundingClientRect();
    const winBox = win.getBoundingClientRect();
    const vr = viewportRect();
    if (!vr) return;
    const nr =
      navEl && getComputedStyle(navEl).opacity !== "0" ? navEl.getBoundingClientRect() : null;

    const mx = e.clientX;
    const my = e.clientY;
    const dist: Record<Edge, number> = {
      left: Math.abs(mx - wr.left),
      right: Math.abs(mx - wr.right),
      top: Math.abs(my - wr.top),
      bottom: Math.abs(my - wr.bottom),
    };

    let edge: Edge = "top";
    let best = dist.top;
    if (dist.bottom < best) {
      edge = "bottom";
      best = dist.bottom;
    }
    if (dist.left < best) {
      edge = "left";
      best = dist.left;
    }
    if (dist.right < best) {
      edge = "right";
      best = dist.right;
    }
    if (best > NEAR) {
      hideAll(ctx.wins);
      visible = false;
      return;
    }

    let ex0 = Math.max(wr.left, vr.left);
    let ex1 = Math.min(wr.right, vr.right);
    let ey0 = Math.max(wr.top, vr.top);
    let ey1 = Math.min(wr.bottom, vr.bottom);

    // nav occupies left — cut it from left-edge remainder
    if (nr && edge === "left") {
      const cutTop = Math.max(ey0, nr.top);
      const cutBot = Math.min(ey1, nr.bottom);
      if (cutBot > cutTop) {
        if (cutBot - ey0 < ey1 - cutTop) ey1 = cutTop;
        else ey0 = cutBot;
      }
    }

    const orient: Orient = edge === "top" || edge === "bottom" ? "h" : "v";
    rc.setAttribute("data-orient", orient);
    rc.setAttribute("data-edge", edge);
    rc.hidden = false;

    const halfH = (rc.offsetHeight || 28) / 2;
    const halfW = (rc.offsetWidth || 28) / 2;

    let cx: number;
    let cy: number;
    if (edge === "top") {
      cx = (ex0 + ex1) / 2 - winBox.left;
      cy = wr.top - winBox.top - GAP - halfH;
    } else if (edge === "bottom") {
      cx = (ex0 + ex1) / 2 - winBox.left;
      cy = wr.bottom - winBox.top + GAP + halfH;
    } else if (edge === "left") {
      cx = wr.left - winBox.left - GAP - halfW;
      cy = (ey0 + ey1) / 2 - winBox.top;
    } else {
      cx = wr.right - winBox.left + GAP + halfW;
      cy = (ey0 + ey1) / 2 - winBox.top;
    }

    let vx = winBox.left + cx;
    let vy = winBox.top + cy;
    vx = clamp(vx, halfW, vr.left + vr.width - halfW);
    vy = clamp(vy, halfH, vr.top + vr.height - halfH);
    cx = vx - winBox.left;
    cy = vy - winBox.top;

    rc.style.left = Math.round(cx) + "px";
    rc.style.top = Math.round(cy) + "px";
    rc.classList.add("is-on");
    visible = true;
  };

  let pending: PointerEvent | null = null;
  let queued = false;

  on($("#viewport"), "pointermove", (e) => {
    pending = e;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!pending) return;
      place(pending);
      pending = null;
    });
  });

  on($("#viewport"), "pointerleave", () => {
    if (!visible) return;
    hideAll(ctx.wins);
    visible = false;
  });

  ctx.wins.forEach((win) => {
    const zone = $("[data-recover-zone]", win);
    on(zone, "pointerdown", (e) => {
      if (!win.classList.contains("is-focused")) return;
      onDragStart(win, e as PointerEvent);
    });
    on(zone, "dblclick", () => {
      if (ctx.dragMoved()) return;
      toggleMaximize(win);
      hideAll(ctx.wins);
    });
    on($("[data-recover-min]", win), "click", () => {
      if (ctx.dragMoved()) return;
      $('[data-win="min"]', win)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      hideAll(ctx.wins);
    });
    on($("[data-recover-close]", win), "click", () => {
      if (ctx.dragMoved()) return;
      $('[data-win="close"]', win)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      hideAll(ctx.wins);
    });
  });
}
