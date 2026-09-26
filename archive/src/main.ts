import "./components/a-capsule";
import "./components/a-icon-btn";
import "./components/a-drag-ctl";
import { initAnimSpeed, initTheme } from "./theme";
import { initViewport } from "./viewport";
import { alignAll } from "./layout";
import { initWindows } from "./window";
import { toggleMaximize } from "./anim/maximize";
import { initMenus } from "./menu";
import { initRecover } from "./recover";
import { initStatusBar } from "./statusbar";
import { initScrollAndPanes } from "./ui";

function boot(): void {
  initTheme();
  initAnimSpeed();

  const ctx = initWindows();
  initMenus(ctx.wins);
  initScrollAndPanes(ctx.wins);
  initStatusBar();
  initViewport(() => alignAll(ctx.wins));

  initRecover(ctx, (win, e) => {
    win.querySelector("[data-drag-zone]")?.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: e.clientX,
        clientY: e.clientY,
        pointerId: e.pointerId,
      }),
    );
  });

  ctx.wins.forEach((win) => {
    win.addEventListener("dblclick", (e) => {
      const t = e.target as Element;
      if (!t.closest("[data-drag-zone]") && !t.closest("a-drag-ctl")) return;
      if (t.closest(".win-ctl") || t.closest("[data-win]")) return;
      toggleMaximize(win);
    });
  });

  const onResize = () => alignAll(ctx.wins);
  onResize();
  window.addEventListener("resize", onResize);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
