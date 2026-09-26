import { $, raf } from "./dom";
import { alignCenter } from "./layout";
import { windowDurMs } from "./theme";
import type { WinGeom } from "./types";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function flip(el: HTMLElement, from: DOMRect, to: DOMRect, scale: boolean, base = ""): void {
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  el.style.transition = "none";
  el.style.transformOrigin = "top left";
  el.style.transform = scale
    ? `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) ${base}`.trim()
    : `translate(${dx}px, ${dy}px) ${base}`.trim();
}

function playFlip(el: HTMLElement, dur: number, base = "none"): void {
  el.style.transition = `transform ${dur}ms ${EASE}`;
  el.style.transform = base;
  const done = () => {
    el.style.transition = "";
    el.style.transform = "";
    el.style.transformOrigin = "";
    el.removeEventListener("transitionend", done);
  };
  el.addEventListener("transitionend", done);
  window.setTimeout(done, dur + 80);
}

function radius(el: HTMLElement, from: string, to: string, dur: number): void {
  if (!el.animate) return;
  el.getAnimations().forEach((a) => a.cancel());
  el.animate([{ borderRadius: from }, { borderRadius: to }], {
    duration: dur,
    easing: EASE,
    fill: "forwards",
  });
}

/**
 * Maximize / restore:
 * snap window box instantly, FLIP only content / navbar / topbar.
 * Navbar keeps translateY(-50%); topbar keeps translateX(-50%).
 */
export function toggleMaximize(win: HTMLElement): void {
  if (win.dataset.flipping === "1") return;
  win.dataset.flipping = "1";

  const mode = win.getAttribute("data-mode");
  const dur = windowDurMs();
  const contentEl = $("[data-content]", win) as HTMLElement | null;
  const navEl = $(".navbar", win) as HTMLElement | null;
  const topEl = $("[data-topbar]", win) as HTMLElement | null;
  if (!contentEl) {
    win.dataset.flipping = "0";
    return;
  }

  const settle = () => {
    window.setTimeout(() => {
      win.dataset.flipping = "0";
      alignCenter(win);
    }, dur + 40);
  };

  const flipKids = (fContent: DOMRect, fNav: DOMRect | undefined, fTop: DOMRect | undefined) => {
    const lContent = contentEl.getBoundingClientRect();
    const lNav = navEl?.getBoundingClientRect();
    const lTop = topEl?.getBoundingClientRect();
    flip(contentEl, fContent, lContent, true);
    if (navEl && fNav && lNav) flip(navEl, fNav, lNav, false, "translateY(-50%)");
    if (topEl && fTop && lTop) flip(topEl, fTop, lTop, false, "translateX(-50%)");
    raf(() => {
      playFlip(contentEl, dur);
      if (navEl) playFlip(navEl, dur, "translateY(-50%)");
      if (topEl) playFlip(topEl, dur, "translateX(-50%)");
    });
  };

  if (mode === "maximized") {
    const raw = win.dataset.savedGeom;
    const g: WinGeom | null = raw ? (JSON.parse(raw) as WinGeom) : null;
    if (!g) {
      win.setAttribute("data-mode", "floating");
      win.dataset.flipping = "0";
      return;
    }

    const fContent = contentEl.getBoundingClientRect();
    const fNav = navEl?.getBoundingClientRect();
    const fTop = topEl?.getBoundingClientRect();

    win.style.transition = "none";
    win.setAttribute("data-mode", "floating");
    win.style.left = g.left + "px";
    win.style.top = g.top + "px";
    win.style.width = g.width + "px";
    win.style.height = g.height + "px";
    win.style.borderRadius = "";
    contentEl.style.borderRadius = "";
    void win.offsetHeight;
    win.style.transition = "";

    flipKids(fContent, fNav, fTop);
    radius(contentEl, "0px", "16px", dur);
    radius(win, "0px", "16px", dur);

    window.setTimeout(() => {
      const vr = $("#viewport")?.getBoundingClientRect();
      if (!vr?.width) return;
      win.style.left = (g.left / vr.width) * 100 + "%";
      win.style.top = (g.top / vr.height) * 100 + "%";
      win.style.width = (g.width / vr.width) * 100 + "%";
      win.style.height = (g.height / vr.height) * 100 + "%";
      alignCenter(win);
    }, dur + 20);
    settle();
    return;
  }

  const wr = win.getBoundingClientRect();
  const vr = $("#viewport")?.getBoundingClientRect();
  if (!vr) {
    win.dataset.flipping = "0";
    return;
  }

  win.dataset.savedGeom = JSON.stringify({
    left: wr.left - vr.left,
    top: wr.top - vr.top,
    width: wr.width,
    height: wr.height,
  } satisfies WinGeom);

  const fContent = contentEl.getBoundingClientRect();
  const fNav = navEl?.getBoundingClientRect();
  const fTop = topEl?.getBoundingClientRect();

  win.style.transition = "none";
  win.setAttribute("data-mode", "maximized");
  win.style.left = "0px";
  win.style.top = "0px";
  win.style.width = "100%";
  win.style.height = "100%";
  win.style.borderRadius = "0px";
  void win.offsetHeight;
  win.style.transition = "";

  flipKids(fContent, fNav, fTop);
  radius(contentEl, "16px", "0px", dur);
  radius(win, "16px", "0px", dur);
  settle();
}
