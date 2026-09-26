import { $, on, clamp } from "./dom";
import type { Edge, WinApi } from "./types";

const GAP = 5;
const NEAR = 28 + 2 * GAP; // 38px

/**
 * Recover = same drag-zone component as top-bar.
 * Coordinates are window-relative (recover lives inside .window).
 * Show when drag chrome is off-screen AND pointer is within 38px of a content edge.
 * Place on the on-screen remainder of the nearest content edge, gap 5px outside.
 * Left/right edges rotate the group 90°. Does not follow the pointer.
 */
export function initRecover(api: WinApi): void {
  const viewport = $<HTMLElement>("#viewport")!;

  const hideAll = () => {
    api.wins.forEach((w) => {
      const r = $<HTMLElement>("[data-recover]", w);
      if (!r) return;
      r.hidden = true;
      r.classList.remove("is-on");
    });
  };

  function place(e: PointerEvent): void {
    const win = api.focused();
    if (!win || api.isDragging() || win.getAttribute("data-mode") !== "floating") {
      hideAll();
      return;
    }
    const content = $<HTMLElement>(".content", win);
    const zone = $<HTMLElement>(".top-bar [data-drag-zone]", win);
    const rec = $<HTMLElement>("[data-recover]", win);
    if (!content || !rec) return;

    const vr = viewport.getBoundingClientRect();
    const zr = zone?.getBoundingClientRect();
    const chromeVisible =
      !!zr &&
      zr.left >= vr.left - 1 &&
      zr.top >= vr.top - 1 &&
      zr.right <= vr.right + 1 &&
      zr.bottom <= vr.bottom + 1;
    if (chromeVisible) {
      hideAll();
      return;
    }

    const wr = content.getBoundingClientRect();
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
    const others: Edge[] = ["bottom", "left", "right"];
    for (const k of others) {
      if (dist[k] < best) {
        edge = k;
        best = dist[k];
      }
    }
    if (best > NEAR) {
      hideAll();
      return;
    }

    // on-screen remainder of this content edge
    const x0 = Math.max(wr.left, vr.left);
    const x1 = Math.min(wr.right, vr.right);
    const y0 = Math.max(wr.top, vr.top);
    const y1 = Math.min(wr.bottom, vr.bottom);

    // hide other recovers; show this one
    api.wins.forEach((w) => {
      const r = $<HTMLElement>("[data-recover]", w);
      if (!r) return;
      if (w === win) {
        r.hidden = false;
        r.classList.add("is-on");
      } else {
        r.hidden = true;
        r.classList.remove("is-on");
      }
    });

    rec.dataset.orient = edge === "left" || edge === "right" ? "v" : "h";

    const hw = rec.offsetWidth / 2 || 14;
    const hh = rec.offsetHeight / 2 || 14;
    let cx: number;
    let cy: number;
    if (edge === "top") {
      cx = (x0 + x1) / 2;
      cy = wr.top - GAP - hh;
    } else if (edge === "bottom") {
      cx = (x0 + x1) / 2;
      cy = wr.bottom + GAP + hh;
    } else if (edge === "left") {
      cx = wr.left - GAP - hw;
      cy = (y0 + y1) / 2;
    } else {
      cx = wr.right + GAP + hw;
      cy = (y0 + y1) / 2;
    }
    cx = clamp(cx, hw, vr.left + vr.width - hw);
    cy = clamp(cy, hh, vr.top + vr.height - hh);

    // recover is inside .window → window-relative
    const box = win.getBoundingClientRect();
    rec.style.left = `${cx - box.left}px`;
    rec.style.top = `${cy - box.top}px`;
  }

  let raf = 0;
  let ev: PointerEvent | null = null;
  on(viewport, "pointermove", (e) => {
    ev = e as PointerEvent;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (ev) place(ev);
    });
  });
  on(viewport, "pointerleave", hideAll);

  api.wins.forEach((win) => {
    const zone = $<HTMLElement>("[data-recover] [data-drag-zone]", win);
    if (!zone) return;
    // recover drag = window drag (forward to top-bar drag-zone)
    on(zone, "pointerdown", (e) => {
      const t = e.target as Element;
      if (t.closest("[data-win-min], [data-win-cls]")) return;
      $<HTMLElement>("[data-topbar] [data-drag-zone]", win)?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: (e as PointerEvent).clientX,
          clientY: (e as PointerEvent).clientY,
        }),
      );
    });
    on(zone, "dblclick", () => {
      api.toggleMaximize(win);
      hideAll();
    });
    on($<HTMLElement>("[data-recover] [data-win-min]", win), "click", () => {
      $<HTMLElement>("[data-topbar] [data-win-min]", win)?.click();
      hideAll();
    });
    on($<HTMLElement>("[data-recover] [data-win-cls]", win), "click", () => {
      $<HTMLElement>("[data-topbar] [data-win-cls]", win)?.click();
      hideAll();
    });
  });
}
