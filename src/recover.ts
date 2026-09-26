/** 临时拖动 recover：与控制栏拖动钮同一组件、同一套 hover。 */
import { $, $$, on, clamp, pxVar } from "./dom";
import type { Store } from "./state";
import type { WinApi } from "./windows";

type Edge = "top" | "bottom" | "left" | "right";

export function initRecover(store: Store, api: WinApi): void {
  const viewport = $<HTMLElement>("#viewport")!;

  const hideAll = () => {
    for (const w of $$<HTMLElement>(".window")) {
      const r = $<HTMLElement>("[data-recover]", w);
      if (!r) continue;
      r.hidden = true;
      r.classList.remove("is-on");
    }
  };

  // 焦点变化 → 立即收起（视图瞬态跟随语义状态）
  let lastFocused = api.focusedId();
  store.subscribe(() => {
    const cur = api.focusedId();
    if (cur !== lastFocused) {
      lastFocused = cur;
      hideAll();
    }
  });

  function place(e: PointerEvent): void {
    const id = api.focusedId();
    const win = id ? api.el(id) : null;
    const ws = id ? store.get().wins[id] : null;
    if (!win || !ws || api.isDragging() || ws.mode !== "floating") {
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
    // 几何度量运行时可调：贴边间距 = gap，阈值 = 派生值 --recover-near
    const gap = pxVar("--gap", 5);
    const near = pxVar("--recover-near", 38);
    const dist: Record<Edge, number> = {
      left: Math.abs(mx - wr.left),
      right: Math.abs(mx - wr.right),
      top: Math.abs(my - wr.top),
      bottom: Math.abs(my - wr.bottom),
    };
    let edge: Edge = "top";
    let best = dist.top;
    for (const k of ["bottom", "left", "right"] as Edge[]) {
      if (dist[k] < best) {
        edge = k;
        best = dist[k];
      }
    }
    if (best > near) {
      hideAll();
      return;
    }

    // 该内容边的屏内剩余段
    const x0 = Math.max(wr.left, vr.left);
    const x1 = Math.min(wr.right, vr.right);
    const y0 = Math.max(wr.top, vr.top);
    const y1 = Math.min(wr.bottom, vr.bottom);

    for (const w of $$<HTMLElement>(".window")) {
      const r = $<HTMLElement>("[data-recover]", w);
      if (!r) continue;
      if (w === win) {
        r.hidden = false;
        r.classList.add("is-on");
      } else {
        r.hidden = true;
        r.classList.remove("is-on");
      }
    }

    rec.dataset.orient = edge === "left" || edge === "right" ? "v" : "h";

    const hw = rec.offsetWidth / 2 || 14;
    const hh = rec.offsetHeight / 2 || 14;
    let cx: number;
    let cy: number;
    if (edge === "top") {
      cx = (x0 + x1) / 2;
      cy = wr.top - gap - hh;
    } else if (edge === "bottom") {
      cx = (x0 + x1) / 2;
      cy = wr.bottom + gap + hh;
    } else if (edge === "left") {
      cx = wr.left - gap - hw;
      cy = (y0 + y1) / 2;
    } else {
      cx = wr.right + gap + hw;
      cy = (y0 + y1) / 2;
    }
    cx = clamp(cx, hw, vr.left + vr.width - hw);
    cy = clamp(cy, hh, vr.top + vr.height - hh);

    // recover 在 .window 内 → 窗口相对坐标
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

  // 拖 recover = 拖窗：转发给顶栏拖动钮
  for (const win of $$<HTMLElement>(".window")) {
    const zone = $<HTMLElement>("[data-recover] [data-drag-zone]", win);
    if (!zone) continue;
    on(zone, "pointerdown", (e) => {
      $<HTMLElement>("[data-topbar] [data-drag-zone]", win)?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: (e as PointerEvent).clientX,
          clientY: (e as PointerEvent).clientY,
        }),
      );
    });
    on(zone, "dblclick", () => {
      api.toggleMaximize(win.id);
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
  }
}
