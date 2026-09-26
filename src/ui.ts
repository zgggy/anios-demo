import { $, $$, on, durMs, clamp } from "./dom";

/** Scroll indicator: two equal-width pills (track + thumb), no blur. */
export function bindScrollIndicator(root: HTMLElement): void {
  const scroller = $<HTMLElement>(".content-scroll", root);
  const ind = $<HTMLElement>(".scroll-indicator", root);
  const thumb = $<HTMLElement>(".scroll-thumb", root);
  if (!scroller || !ind || !thumb) return;
  let raf = 0;
  let hideT = 0;
  const paint = () => {
    raf = 0;
    const max = scroller.scrollHeight - scroller.clientHeight;
    if (max <= 0) {
      ind.classList.remove("on");
      return;
    }
    const track = scroller.clientHeight * 0.45;
    ind.style.height = `${track}px`;
    const p = scroller.scrollTop / max;
    const mode = ind.dataset.mode || "percent";
    if (mode === "percent") {
      thumb.style.top = "0px";
      thumb.style.height = `${Math.max(8, p * track)}px`;
    } else {
      const ratio = scroller.clientHeight / scroller.scrollHeight;
      const h = Math.max(18, Math.min(track * 0.55, track * ratio));
      thumb.style.height = `${h}px`;
      thumb.style.top = `${p * (track - h)}px`;
    }
    ind.classList.add("on");
    window.clearTimeout(hideT);
    hideT = window.setTimeout(() => ind.classList.remove("on"), 600);
  };
  on(scroller, "scroll", () => {
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
}

/** Resize knob for a content panel (window content or temp window). */
export function bindResize(root: HTMLElement): void {
  const knob = $<HTMLElement>("[data-resize]", root);
  if (!knob) return;
  let dragging = false;
  let x0 = 0;
  let y0 = 0;
  let w0 = 0;
  let h0 = 0;
  on(knob, "pointerdown", (e) => {
    dragging = true;
    x0 = (e as PointerEvent).clientX;
    y0 = (e as PointerEvent).clientY;
    w0 = root.offsetWidth;
    h0 = root.offsetHeight;
    knob.setPointerCapture((e as PointerEvent).pointerId);
    e.preventDefault();
    e.stopPropagation();
  });
  on(window, "pointermove", (e) => {
    if (!dragging) return;
    const ev = e as PointerEvent;
    root.style.width = `${clamp(w0 + (ev.clientX - x0), 200, 480)}px`;
    root.style.height = `${clamp(h0 + (ev.clientY - y0), 160, 560)}px`;
  });
  on(window, "pointerup", () => {
    dragging = false;
  });
  // show knob on hover near bottom-right when root is focused-ish
  on(root, "pointermove", (e) => {
    const ev = e as PointerEvent;
    const r = root.getBoundingClientRect();
    const near = ev.clientX > r.right - 120 && ev.clientY > r.bottom - 120;
    knob.classList.toggle("is-on", near);
  });
  on(root, "pointerleave", () => knob.classList.remove("is-on"));
}

/**
 * App content helpers: theme, accent, animation speed, scroll indicator,
 * nav pane switch (out-then-in), sliders, dial pad.
 */
export function initUi(wins: HTMLElement[]): void {
  // theme (host tools + settings)
  $$("button[data-theme]").forEach((b) => {
    on(b, "click", () => {
      const m = b.getAttribute("data-theme")!;
      document.documentElement.setAttribute("data-theme", m);
      $$("button[data-theme]").forEach((x) =>
        x.setAttribute("aria-pressed", x.getAttribute("data-theme") === m ? "true" : "false"),
      );
    });
  });

  $$(".cd").forEach((d) => {
    on(d, "click", () => {
      $$(".cd").forEach((x) => x.classList.remove("active"));
      d.classList.add("active");
      const c = getComputedStyle(d).getPropertyValue("--c").trim();
      if (c) document.documentElement.style.setProperty("--accent", c);
    });
  });

  const bindDur = (id: string, token: string, label: string) => {
    const el = $<HTMLInputElement>(`#${id}`);
    if (!el) return;
    on(el, "input", () => {
      document.documentElement.style.setProperty(token, `${el.value}ms`);
      const l = $(`#${label}`);
      if (l) l.textContent = `${el.value}ms`;
    });
  };
  bindDur("animGlobal", "--dur", "animGlobalVal");
  bindDur("animWindow", "--anim-window", "animWindowVal");
  bindDur("animPane", "--anim-pane", "animPaneVal");
  bindDur("animMenu", "--anim-menu", "animMenuVal");

  $$("[data-scroll-mode]").forEach((b) => {
    on(b, "click", () => {
      const m = b.getAttribute("data-scroll-mode")!;
      $$(".scroll-indicator").forEach((el) => (el.dataset.mode = m));
      $$("[data-scroll-mode]").forEach((x) =>
        x.setAttribute("aria-pressed", x.getAttribute("data-scroll-mode") === m ? "true" : "false"),
      );
    });
  });

  // network type only from Settings (not status bar)
  $$("[data-net-mode]").forEach((b) => {
    on(b, "click", () => {
      const m = b.getAttribute("data-net-mode")!;
      $(".sys-status")?.setAttribute("data-net", m);
      $$("[data-net-mode]").forEach((x) =>
        x.setAttribute("aria-pressed", x.getAttribute("data-net-mode") === m ? "true" : "false"),
      );
    });
  });

  wins.forEach((win) => {
    // nav pane switch: out-then-in vertical scroll, no overlap
    const btns = $$(".nav-btn", win);
    const panes = $$(".set-pane", win);
    let cur = btns.find((b) => b.classList.contains("active"))?.dataset.section || "";
    let busy = false;

    btns.forEach((btn) => {
      on(btn, "click", () => {
        if (busy) return;
        const name = btn.dataset.section;
        if (!name || name === cur) return;
        const oldP = panes.find((p) => p.dataset.pane === cur);
        const newP = panes.find((p) => p.dataset.pane === name);
        if (!newP) return;
        const order = btns.map((b) => b.dataset.section);
        const fwd = order.indexOf(name) > order.indexOf(cur);
        const d = durMs("--anim-pane");
        busy = true;
        btns.forEach((b) => b.classList.toggle("active", b === btn));
        if (oldP) {
          oldP.classList.add(fwd ? "leave-up" : "leave-down");
          window.setTimeout(() => {
            oldP.hidden = true;
            oldP.classList.remove("leave-up", "leave-down");
            newP.hidden = false;
            newP.classList.add(fwd ? "enter-up" : "enter-down");
            window.setTimeout(() => {
              newP.classList.remove("enter-up", "enter-down");
              cur = name;
              busy = false;
            }, d);
          }, d);
        } else {
          newP.hidden = false;
          cur = name;
          busy = false;
        }
      });
    });

    bindScrollIndicator(win);
    // window-level resize lives in window.ts; temp panels use bindResize

    $$(".slider", win).forEach((s) => {
      const el = s as HTMLInputElement;
      const sync = () => {
        const min = Number(el.min || 0);
        const max = Number(el.max || 100);
        el.style.setProperty("--val", `${((Number(el.value) - min) / (max - min)) * 100}%`);
        const lab = el.closest(".slider-row")?.querySelector(".slider-val");
        if (lab) lab.textContent = `${Math.round(Number(el.value))}%`;
      };
      on(el, "input", sync);
      sync();
    });

    const disp = $<HTMLElement>("#dialDisplay", win);
    let num = "";
    on($("#dialPad", win), "click", (e) => {
      const k = (e.target as Element).closest(".dial-key")?.querySelector("b")?.textContent?.trim();
      if (k && num.length < 16) {
        num += k;
        if (disp) disp.textContent = num;
      }
    });
    on($("#dialBack", win), "click", () => {
      num = num.slice(0, -1);
      if (disp) disp.textContent = num || "输入号码";
    });
  });

  // temp windows (status panel / future no-top-bar panels)
  $$<HTMLElement>("[data-temp]").forEach((panel) => {
    bindScrollIndicator(panel);
    bindResize(panel);
  });
}
