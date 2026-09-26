import gsap from "gsap";
import { $, $$, on, layoutCenter, durMs } from "./dom";
import type { WinApi, WinGeom } from "./types";

/**
 * Window unit = top-bar + nav-bar + content + recover.
 * Chrome (top-bar / nav-bar) share one z-index; content is below them.
 * Unfocused chrome is fully hidden. FLIP uses static gsap — inverse is applied
 * in the same task before paint (no dynamic import).
 */
export function initWindows(): WinApi {
  const viewport = $<HTMLElement>("#viewport")!;
  const wins = $$(".window");
  let dragWin: HTMLElement | null = null;
  let dragMode: "move" | "resize" = "move";
  let moved = false;
  let sx = 0;
  let sy = 0;
  let ox = 0;
  let oy = 0;
  let ow = 0;
  let oh = 0;

  const focused = () => $<HTMLElement>(".window.is-focused");

  function appIconOf(win: HTMLElement): HTMLElement | null {
    const id = win.dataset.app;
    if (!id) return null;
    return $<HTMLElement>(`.app-item[data-app-id="${id}"]`);
  }

  function align(win: HTMLElement): void {
    const content = $<HTMLElement>(".content", win);
    const topbar = $<HTMLElement>("[data-topbar]", win);
    const navbar = $<HTMLElement>("[data-nav]", win);
    if (!content || !topbar) return;
    const { cx, cy } = layoutCenter(content);
    topbar.style.setProperty("--content-cx", `${cx}px`);
    navbar?.style.setProperty("--content-cy", `${cy}px`);
  }

  function raise(win: HTMLElement): void {
    // never wrap below other windows — always above the current max
    let maxZ = 20;
    for (const w of wins) {
      const z = parseInt(w.style.zIndex || "0", 10);
      if (Number.isFinite(z) && z > maxZ) maxZ = z;
    }
    win.style.zIndex = String(maxZ + 1);
  }

  function focus(win: HTMLElement): void {
    wins.forEach((w) => {
      w.classList.toggle("is-focused", w === win);
      if (w !== win) {
        $$("[data-resize].is-on", w).forEach((el) => el.classList.remove("is-on"));
        const rec = $<HTMLElement>("[data-recover]", w);
        if (rec) {
          rec.hidden = true;
          rec.classList.remove("is-on");
        }
      }
    });
    raise(win);
    win.dataset.open = "1";
    align(win);
  }

  function blurAll(): void {
    wins.forEach((w) => {
      w.classList.remove("is-focused");
      $$("[data-resize].is-on", w).forEach((el) => el.classList.remove("is-on"));
      const rec = $<HTMLElement>("[data-recover]", w);
      if (rec) {
        rec.hidden = true;
        rec.classList.remove("is-on");
      }
    });
  }

  /**
   * FLIP for chrome bars (fixed-size capsules → translate only).
   * Inverse must be applied in the same task before paint.
   * xp/yp keep CSS centering (top-bar translateX(-50%), nav translateY(-50%)).
   */
  function flipNow(
    el: HTMLElement | null,
    f: DOMRect | undefined,
    l: DOMRect | undefined,
    xp: number,
    yp: number,
    d: number,
    win: HTMLElement,
  ): void {
    if (!el || !f || !l) return;
    const dx = f.left - l.left;
    const dy = f.top - l.top;
    gsap.set(el, { x: dx, y: dy, xPercent: xp, yPercent: yp, force3D: true });
    gsap.to(el, {
      x: 0,
      y: 0,
      xPercent: xp,
      yPercent: yp,
      duration: d,
      ease: "power3.inOut",
      overwrite: true,
      onComplete: () => {
        gsap.set(el, { clearProps: "transform,x,y,xPercent,yPercent" });
        // restore CSS base centering
        if (xp) el.style.transform = `translateX(${xp}%)`;
        else if (yp) el.style.transform = `translateY(${yp}%)`;
        align(win);
      },
    });
  }

  /** scroller padding differs between floating and maximized content */
  function padOf(el: HTMLElement): Record<string, string> {
    const s = getComputedStyle(el);
    return {
      paddingLeft: s.paddingLeft,
      paddingTop: s.paddingTop,
      paddingRight: s.paddingRight,
    };
  }

  function toggleMaximize(win: HTMLElement): void {
    if (win.dataset.flipping === "1") return;
    focus(win);
    const content = $<HTMLElement>(".content", win);
    const navbar = $<HTMLElement>("[data-nav]", win);
    const topbar = $<HTMLElement>("[data-topbar]", win);
    if (!content) return;

    const mode = win.getAttribute("data-mode");
    const d = Math.max(0.12, durMs("--anim-window") / 1000);
    const scroller = $<HTMLElement>(".content-scroll", content);

    const fC = content.getBoundingClientRect();
    const fN = navbar?.getBoundingClientRect();
    const fT = topbar?.getBoundingClientRect();
    const fPad = scroller ? padOf(scroller) : null;

    win.dataset.flipping = "1";
    win.style.transition = "none";

    if (mode === "maximized") {
      const raw = win.dataset.savedGeom;
      const g: WinGeom | null = raw ? (JSON.parse(raw) as WinGeom) : null;
      if (!g) {
        win.setAttribute("data-mode", "floating");
        win.dataset.flipping = "0";
        win.style.transition = "";
        return;
      }
      win.setAttribute("data-mode", "floating");
      win.style.left = `${g.left}px`;
      win.style.top = `${g.top}px`;
      win.style.width = `${g.width}px`;
      win.style.height = `${g.height}px`;
    } else {
      const wr = win.getBoundingClientRect();
      const vr = viewport.getBoundingClientRect();
      win.dataset.savedGeom = JSON.stringify({
        left: wr.left - vr.left,
        top: wr.top - vr.top,
        width: wr.width,
        height: wr.height,
      } satisfies WinGeom);
      win.setAttribute("data-mode", "maximized");
      win.style.left = "0px";
      win.style.top = "0px";
      win.style.width = "100%";
      win.style.height = "100%";
    }

    void win.offsetHeight;
    win.style.transition = "";
    align(win);

    const lC = content.getBoundingClientRect();
    const lN = navbar?.getBoundingClientRect();
    const lT = topbar?.getBoundingClientRect();
    const lPad = scroller ? padOf(scroller) : null;

    // Content: tween the REAL rect (never scale). Scaling would snap the inner
    // layout to the end-state and visually squeeze it back — the box must
    // reflow with the animation instead. Window box is already final, so the
    // start/end rects are expressed relative to it.
    const wr2 = win.getBoundingClientRect();
    gsap.fromTo(
      content,
      {
        left: fC.left - wr2.left,
        top: fC.top - wr2.top,
        width: fC.width,
        height: fC.height,
        right: "auto",
        bottom: "auto",
        borderRadius: mode === "maximized" ? 0 : 16,
      },
      {
        left: lC.left - wr2.left,
        top: lC.top - wr2.top,
        width: lC.width,
        height: lC.height,
        right: "auto",
        bottom: "auto",
        borderRadius: mode === "maximized" ? 16 : 0,
        duration: d,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          gsap.set(content, {
            clearProps: "left,top,width,height,right,bottom,borderRadius",
          });
          win.dataset.flipping = "0";
          align(win);
        },
      },
    );
    if (scroller && fPad && lPad) {
      gsap.fromTo(scroller, fPad, {
        ...lPad,
        duration: d,
        ease: "power3.inOut",
        overwrite: true,
        clearProps: "paddingLeft,paddingTop,paddingRight",
      });
    }

    flipNow(navbar, fN, lN, 0, -50, d, win);
    flipNow(topbar, fT, lT, -50, 0, d, win);
  }

  /** 收起：缩向 App 栏图标 */
  function minimize(win: HTMLElement): void {
    if (win.dataset.anim === "1") return;
    win.dataset.anim = "1";
    const d = Math.max(0.12, durMs("--anim-window") / 1000);
    const icon = appIconOf(win);
    const wr = win.getBoundingClientRect();
    const cx0 = wr.left + wr.width / 2;
    const cy0 = wr.top + wr.height / 2;
    let tx = cx0;
    let ty = cy0 + 80;
    if (icon) {
      const ir = icon.getBoundingClientRect();
      tx = ir.left + ir.width / 2;
      ty = ir.top + ir.height / 2;
    }
    gsap.to(win, {
      scale: 0.12,
      opacity: 0,
      x: tx - cx0,
      y: ty - cy0,
      transformOrigin: "50% 50%",
      duration: d,
      ease: "power3.in",
      overwrite: true,
      onComplete: () => {
        win.style.display = "none";
        win.dataset.open = "0";
        gsap.set(win, { clearProps: "transform,opacity,scale,x,y,transformOrigin" });
        win.dataset.anim = "0";
        blurAll();
        document.dispatchEvent(new CustomEvent("anios:win-close"));
      },
    });
  }

  /** 关闭：原地缩小 */
  function close(win: HTMLElement): void {
    if (win.dataset.anim === "1") return;
    win.dataset.anim = "1";
    const d = Math.max(0.12, durMs("--anim-window") / 1000);
    gsap.to(win, {
      scale: 0.55,
      opacity: 0,
      transformOrigin: "50% 50%",
      duration: d,
      ease: "power3.in",
      overwrite: true,
      onComplete: () => {
        win.style.display = "none";
        win.dataset.open = "0";
        gsap.set(win, { clearProps: "transform,opacity,scale,transformOrigin" });
        win.dataset.anim = "0";
        blurAll();
        document.dispatchEvent(new CustomEvent("anios:win-close"));
      },
    });
  }

  /** 从 App 栏图标处打开 */
  function open(win: HTMLElement): void {
    if (win.dataset.anim === "1") return;
    const visible = win.style.display !== "none" && !win.hidden && win.dataset.open !== "0";
    if (visible) {
      focus(win);
      return;
    }
    win.dataset.anim = "1";
    win.hidden = false;
    win.style.display = "";
    win.dataset.open = "1";
    focus(win);
    const d = Math.max(0.12, durMs("--anim-window") / 1000);
    const icon = appIconOf(win);
    const wr = win.getBoundingClientRect();
    const cx0 = wr.left + wr.width / 2;
    const cy0 = wr.top + wr.height / 2;
    let tx = cx0;
    let ty = cy0 + 80;
    if (icon) {
      const ir = icon.getBoundingClientRect();
      tx = ir.left + ir.width / 2;
      ty = ir.top + ir.height / 2;
    }
    gsap.fromTo(
      win,
      {
        scale: 0.12,
        opacity: 0,
        x: tx - cx0,
        y: ty - cy0,
        transformOrigin: "50% 50%",
      },
      {
        scale: 1,
        opacity: 1,
        x: 0,
        y: 0,
        duration: d,
        ease: "power3.out",
        overwrite: true,
        onComplete: () => {
          gsap.set(win, { clearProps: "transform,opacity,scale,x,y,transformOrigin" });
          win.dataset.anim = "0";
          align(win);
        },
      },
    );
  }

  function startMove(win: HTMLElement, e: PointerEvent): void {
    dragWin = win;
    dragMode = "move";
    moved = false;
    focus(win);
    const wr = win.getBoundingClientRect();
    const vr = viewport.getBoundingClientRect();
    ox = wr.left - vr.left;
    oy = wr.top - vr.top;
    ow = wr.width;
    oh = wr.height;
    sx = e.clientX;
    sy = e.clientY;
    win.style.transition = "none";
    win.style.left = `${ox}px`;
    win.style.top = `${oy}px`;
    win.style.width = `${ow}px`;
    win.style.height = `${oh}px`;
    e.preventDefault();
  }

  wins.forEach((win) => {
    win.dataset.open = win.hidden || win.style.display === "none" ? "0" : "1";
    if (!win.style.zIndex) win.style.zIndex = "20";

    on(win, "pointerdown", (e) => {
      const t = e.target as Element;
      if (t.closest(".content, .top-bar, .nav-bar, .recover")) focus(win);
    }, true);

    const zone = $<HTMLElement>(".top-bar [data-drag-zone]", win);
    if (zone) {
      on(zone, "pointerdown", (e) => {
        const t = e.target as Element;
        if (t.closest("[data-win-min], [data-win-cls]")) return;
        startMove(win, e as PointerEvent);
      });
      on(zone, "dblclick", (e) => {
        const t = e.target as Element;
        if (t.closest("[data-win-min], [data-win-cls]")) return;
        toggleMaximize(win);
      });
    }

    // use querySelectorAll so recover twin never steals the only listener
    $$("[data-topbar] [data-win-min]", win).forEach((el) => {
      on(el, "click", (e) => {
        e.stopPropagation();
        if (moved) return;
        minimize(win);
      });
    });
    $$("[data-topbar] [data-win-cls]", win).forEach((el) => {
      on(el, "click", (e) => {
        e.stopPropagation();
        if (moved) return;
        close(win);
      });
    });

    const cre = $<HTMLElement>("[data-resize]", win);
    const content = $<HTMLElement>(".content", win);
    if (cre && content) {
      let creOn = false;
      const sync = (e: PointerEvent) => {
        const ok =
          win.classList.contains("is-focused") &&
          e.clientX > content.getBoundingClientRect().right - 120 &&
          e.clientY > content.getBoundingClientRect().bottom - 120;
        if (ok === creOn) return;
        creOn = ok;
        cre.classList.toggle("is-on", ok);
      };
      on(content, "pointermove", (e) => sync(e as PointerEvent));
      on(content, "pointerleave", () => {
        creOn = false;
        cre.classList.remove("is-on");
      });
      on(cre, "pointerdown", (e) => {
        if (!win.classList.contains("is-focused")) return;
        dragWin = win;
        dragMode = "resize";
        moved = false;
        const wr = win.getBoundingClientRect();
        const vr = viewport.getBoundingClientRect();
        ox = wr.left - vr.left;
        oy = wr.top - vr.top;
        ow = wr.width;
        oh = wr.height;
        sx = (e as PointerEvent).clientX;
        sy = (e as PointerEvent).clientY;
        win.style.transition = "none";
        e.preventDefault();
        e.stopPropagation();
      });
    }

    align(win);
  });

  on(window, "pointermove", (e) => {
    if (!dragWin) return;
    const ev = e as PointerEvent;
    if (Math.abs(ev.clientX - sx) > 3 || Math.abs(ev.clientY - sy) > 3) moved = true;
    if (dragMode === "resize") {
      dragWin.style.width = `${Math.max(240, ow + (ev.clientX - sx))}px`;
      dragWin.style.height = `${Math.max(180, oh + (ev.clientY - sy))}px`;
    } else {
      dragWin.style.left = `${ox + (ev.clientX - sx)}px`;
      dragWin.style.top = `${oy + (ev.clientY - sy)}px`;
    }
    align(dragWin);
  });

  on(window, "pointerup", () => {
    if (!dragWin) return;
    const win = dragWin;
    dragWin = null;
    const vr = viewport.getBoundingClientRect();
    if (vr.width && win.getAttribute("data-mode") === "floating") {
      const wr = win.getBoundingClientRect();
      win.style.left = `${((wr.left - vr.left) / vr.width) * 100}%`;
      win.style.top = `${((wr.top - vr.top) / vr.height) * 100}%`;
      win.style.width = `${(wr.width / vr.width) * 100}%`;
      win.style.height = `${(wr.height / vr.height) * 100}%`;
    }
    win.style.transition = "";
    align(win);
  });

  on(viewport, "pointerdown", (e) => {
    const t = e.target as Element;
    if (
      t.closest(".window") ||
      t.closest(".sys-status") ||
      t.closest(".sys-appbar") ||
      t.closest(".vp-resize")
    ) {
      return;
    }
    blurAll();
  }, true);

  // Chrome vars (--content-cx/cy) are px values on %-geometry windows: any
  // screen resize (window resize, scrollbar, presets) leaves them stale, so
  // the bars drift off the content center until the next click re-focuses.
  const reAlign = () => {
    if (dragWin || wins.some((w) => w.dataset.flipping === "1")) return;
    wins.forEach((w) => align(w));
  };
  new ResizeObserver(reAlign).observe(viewport);
  window.addEventListener("resize", reAlign);
  window.addEventListener("load", reAlign);

  if (wins[0]) focus(wins[0]);

  return {
    wins,
    focused,
    focus,
    blurAll,
    isDragging: () => !!dragWin,
    toggleMaximize,
    align,
    minimize,
    close,
    open,
  };
}
