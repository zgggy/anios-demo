import { $, $$, on, clamp } from "./dom";

/**
 * In-page viewport (a "screen"). Host tools: size preset / screen type / theme.
 * Resize knob sits at top=viewport bottom, left=viewport right (outside the corner).
 */
export function initViewport(onChange: () => void): void {
  const vp = $<HTMLElement>("#viewport");
  const handle = $<HTMLElement>("#vpResize");
  if (!vp) return;

  // only host-tool buttons, never the viewport itself
  $$("button[data-size]").forEach((b) => {
    on(b, "click", () => {
      const v = b.getAttribute("data-size")!;
      vp.dataset.size = v;
      vp.style.width = "";
      vp.style.height = "";
      $$("button[data-size]").forEach((x) =>
        x.setAttribute("aria-pressed", x.getAttribute("data-size") === v ? "true" : "false"),
      );
      onChange();
    });
  });

  $$("button[data-screen]").forEach((b) => {
    on(b, "click", () => {
      const v = b.getAttribute("data-screen")!;
      vp.dataset.screen = v;
      $$("button[data-screen]").forEach((x) =>
        x.setAttribute("aria-pressed", x.getAttribute("data-screen") === v ? "true" : "false"),
      );
      onChange();
    });
  });

  if (!handle) return;
  let dragging = false;
  let x0 = 0;
  let y0 = 0;
  let w0 = 0;
  let h0 = 0;

  on(handle, "pointerdown", (e) => {
    dragging = true;
    x0 = e.clientX;
    y0 = e.clientY;
    w0 = vp.offsetWidth;
    h0 = vp.offsetHeight;
    vp.dataset.size = "custom";
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  on(window, "pointermove", (e) => {
    if (!dragging) return;
    vp.style.width = `${clamp(w0 + (e.clientX - x0), 360, window.innerWidth - 24)}px`;
    vp.style.height = `${clamp(h0 + (e.clientY - y0), 420, window.innerHeight - 100)}px`;
    onChange();
  });

  on(window, "pointerup", () => {
    if (!dragging) return;
    dragging = false;
    onChange();
  });
}
