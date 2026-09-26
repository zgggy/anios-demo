import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { $ } from "../dom";
import { alignCenter } from "../layout";
import { windowDurMs } from "../theme";
import type { WinGeom } from "../types";

gsap.registerPlugin(Flip);

/**
 * Maximize / restore with GSAP Flip:
 * content scales to screen edges; navbar / topbar translate with it.
 */
export function toggleMaximize(win: HTMLElement): void {
  if (win.dataset.flipping === "1") return;
  win.dataset.flipping = "1";

  const mode = win.getAttribute("data-mode");
  const dur = windowDurMs() / 1000;
  const contentEl = $("[data-content]", win) as HTMLElement | null;
  const navEl = $(".navbar", win) as HTMLElement | null;
  const topEl = $("[data-topbar]", win) as HTMLElement | null;
  if (!contentEl) {
    win.dataset.flipping = "0";
    return;
  }

  const targets = [contentEl, navEl, topEl].filter(Boolean) as HTMLElement[];

  // FIRST
  const state = Flip.getState(targets, { props: "borderRadius" });

  const settle = () => {
    win.dataset.flipping = "0";
    alignCenter(win);
  };

  if (mode === "maximized") {
    const raw = win.dataset.savedGeom;
    const g: WinGeom | null = raw ? JSON.parse(raw) : null;
    if (!g) {
      win.setAttribute("data-mode", "floating");
      win.dataset.flipping = "0";
      return;
    }
    // LAST layout
    win.style.transition = "none";
    win.setAttribute("data-mode", "floating");
    win.style.left = `${g.left}px`;
    win.style.top = `${g.top}px`;
    win.style.width = `${g.width}px`;
    win.style.height = `${g.height}px`;
    win.style.borderRadius = "";
    contentEl.style.borderRadius = "";
    void win.offsetHeight;
    win.style.transition = "";

    Flip.from(state, {
      duration: dur,
      ease: "power3.inOut",
      absolute: false,
      nested: true,
      onComplete: () => {
        const vr = $("#viewport")?.getBoundingClientRect();
        if (vr?.width) {
          win.style.left = `${(g.left / vr.width) * 100}%`;
          win.style.top = `${(g.top / vr.height) * 100}%`;
          win.style.width = `${(g.width / vr.width) * 100}%`;
          win.style.height = `${(g.height / vr.height) * 100}%`;
        }
        settle();
      },
    });
    return;
  }

  // maximize
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

  win.style.transition = "none";
  win.setAttribute("data-mode", "maximized");
  win.style.left = "0px";
  win.style.top = "0px";
  win.style.width = "100%";
  win.style.height = "100%";
  win.style.borderRadius = "0px";
  void win.offsetHeight;
  win.style.transition = "";

  Flip.from(state, {
    duration: dur,
    ease: "power3.inOut",
    absolute: false,
    nested: true,
    onComplete: settle,
  });
}
