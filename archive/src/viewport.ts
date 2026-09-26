import { $, $$, clamp, on } from "./dom";
import { alignCenter } from "./layout";

export function initViewport(onGeomChange: () => void): void {
  const viewport = $("#viewport");
  const vpResize = $("#vpResize");
  if (!viewport) return;

  $$("button[data-size-preset]").forEach((btn) => {
    on(btn, "click", () => {
      const v = btn.getAttribute("data-size-preset");
      viewport.setAttribute("data-size-preset", v ?? "large");
      viewport.style.width = "";
      viewport.style.height = "";
      $$("button[data-size-preset]").forEach((b) => {
        b.setAttribute(
          "aria-pressed",
          b.getAttribute("data-size-preset") === v ? "true" : "false",
        );
      });
      onGeomChange();
    });
  });

  $$("button[data-screen]").forEach((btn) => {
    on(btn, "click", () => {
      const v = btn.getAttribute("data-screen") ?? "pointer";
      viewport.setAttribute("data-screen", v);
      $$("button[data-screen]").forEach((b) => {
        b.setAttribute("aria-pressed", b.getAttribute("data-screen") === v ? "true" : "false");
      });
    });
  });

  $$("button[data-net-mode]").forEach((btn) => {
    on(btn, "click", () => {
      const mode = btn.getAttribute("data-net-mode") ?? "wifi";
      $("#statusBar")?.setAttribute("data-net", mode);
      $$("button[data-net-mode]").forEach((b) => {
        b.setAttribute(
          "aria-pressed",
          b.getAttribute("data-net-mode") === mode ? "true" : "false",
        );
      });
    });
  });

  let resizing = false;
  let rsx = 0;
  let rsy = 0;
  let rw = 0;
  let rh = 0;

  on(vpResize, "pointerdown", (e) => {
    resizing = true;
    rsx = e.clientX;
    rsy = e.clientY;
    rw = viewport.offsetWidth;
    rh = viewport.offsetHeight;
    viewport.setAttribute("data-size-preset", "custom");
    $$("button[data-size-preset]").forEach((b) => b.setAttribute("aria-pressed", "false"));
    try {
      vpResize!.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    e.preventDefault();
    e.stopPropagation();
  });

  on(window, "pointermove", (e) => {
    if (!resizing) return;
    const w = clamp(rw + (e.clientX - rsx), 420, window.innerWidth - 40);
    const h = clamp(rh + (e.clientY - rsy), 320, window.innerHeight - 100);
    viewport.style.width = w + "px";
    viewport.style.height = h + "px";
    onGeomChange();
  });

  const end = () => {
    if (!resizing) return;
    resizing = false;
    onGeomChange();
  };
  on(window, "pointerup", end);
  on(window, "pointercancel", end);
}

export function viewportRect(): DOMRect | null {
  return $("#viewport")?.getBoundingClientRect() ?? null;
}

export { alignCenter };
