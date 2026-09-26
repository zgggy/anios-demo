/* anios Desktop — interactions (perf-tuned) */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const viewport = $("#viewport");
  const vpResize = $("#vpResize");
  const windows = $$(".window");
  function getRecover(win) {
    return win?.querySelector("[data-recover]");
  }

  /* ---------- theme ---------- */
  function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    $$("[data-theme]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme") === mode ? "true" : "false");
    });
  }

  $$("[data-theme]").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.getAttribute("data-theme")));
  });

  $$(".cd").forEach((dot) => {
    dot.addEventListener("click", () => {
      $$(".cd").forEach((d) => d.classList.remove("active"));
      dot.classList.add("active");
      const c = getComputedStyle(dot).getPropertyValue("--c").trim();
      if (c) document.documentElement.style.setProperty("--accent", c);
    });
  });

  /* ---------- animation speeds ---------- */
  const animGlobal = $("#animGlobal");
  const animWindow = $("#animWindow");
  const animPane = $("#animPane");
  const animMenu = $("#animMenu");

  function setCssMs(name, ms) {
    document.documentElement.style.setProperty(name, ms + "ms");
  }

  function syncAnimAll() {
    const g = Number(animGlobal?.value || 360);
    setCssMs("--dur", g);
    const gv = $("#animGlobalVal");
    if (gv) gv.textContent = g + "ms";

    const w = Number(animWindow?.value || 360);
    setCssMs("--anim-window", w);
    const wv = $("#animWindowVal");
    if (wv) wv.textContent = w + "ms";

    const p = Number(animPane?.value || 200);
    setCssMs("--anim-pane", p);
    const pv = $("#animPaneVal");
    if (pv) pv.textContent = p + "ms";

    const m = Number(animMenu?.value || 200);
    setCssMs("--anim-menu", m);
    const mv = $("#animMenuVal");
    if (mv) mv.textContent = m + "ms";
  }

  animGlobal?.addEventListener("input", () => {
    const g = Number(animGlobal.value);
    if (animWindow) animWindow.value = g;
    if (animPane) animPane.value = Math.min(200, Math.round(g * 0.55));
    if (animMenu) animMenu.value = Math.min(200, Math.round(g * 0.55));
    syncAnimAll();
  });
  [animWindow, animPane, animMenu].forEach((el) => el?.addEventListener("input", syncAnimAll));
  syncAnimAll();

  function windowDurMs() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--anim-window")) || 360;
  }
  function paneDurMs() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--anim-pane")) || 200;
  }

  /* ---------- viewport size presets (buttons only — never the viewport itself) ---------- */
  const sizeBtns = $$("button[data-size-preset]");

  function applySizePreset(v) {
    viewport.setAttribute("data-size-preset", v);
    // clear inline size so CSS preset applies
    viewport.style.width = "";
    viewport.style.height = "";
    sizeBtns.forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-size-preset") === v ? "true" : "false");
    });
    scheduleAlignAll();
  }

  sizeBtns.forEach((btn) => {
    btn.addEventListener("click", () => applySizePreset(btn.getAttribute("data-size-preset")));
  });

  /* screen type: touch / pointer / spatial — interface only, no size changes */
  const screenBtns = $$("button[data-screen]");

  function applyScreen(mode) {
    viewport.setAttribute("data-screen", mode);
    screenBtns.forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-screen") === mode ? "true" : "false");
    });
  }

  screenBtns.forEach((btn) => {
    btn.addEventListener("click", () => applyScreen(btn.getAttribute("data-screen")));
  });

  /* scroll indicator mode: percent | position */
  const scrollModeBtns = $$("button[data-scroll-mode]");

  function applyScrollMode(mode) {
    $$("[data-scroll-indicator]").forEach((el) => {
      el.setAttribute("data-mode", mode);
    });
    scrollModeBtns.forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-scroll-mode") === mode ? "true" : "false");
    });
  }

  scrollModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => applyScrollMode(btn.getAttribute("data-scroll-mode")));
  });
  applyScrollMode("percent");

  let resizing = false;
  let rsx = 0, rsy = 0, rw = 0, rh = 0;

  vpResize?.addEventListener("pointerdown", (e) => {
    resizing = true;
    rsx = e.clientX;
    rsy = e.clientY;
    rw = viewport.offsetWidth;
    rh = viewport.offsetHeight;
    // mark custom but KEEP dimensions — never clear inline size on click
    viewport.setAttribute("data-size-preset", "custom");
    sizeBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
  });

  window.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    const w = Math.max(420, Math.min(rw + (e.clientX - rsx), window.innerWidth - 40));
    const h = Math.max(320, Math.min(rh + (e.clientY - rsy), window.innerHeight - 100));
    viewport.style.width = w + "px";
    viewport.style.height = h + "px";
    // light align during resize (no heavy work)
    windows.forEach(alignCenter);
  });

  function endResize() {
    if (!resizing) return;
    resizing = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    scheduleAlignAll();
  }

  window.addEventListener("pointerup", endResize);
  window.addEventListener("pointercancel", endResize);

  /**
   * Topbar pill center = content center (layout coords, not getBoundingClientRect).
   * Rects include transforms, so FLIP frames made --content-cx jump → flicker.
   */
  function alignCenter(win) {
    const contentEl = win.querySelector("[data-content]");
    const topbar = win.querySelector("[data-topbar]");
    if (!contentEl || !topbar) return;
    const cx = contentEl.offsetLeft + contentEl.offsetWidth / 2;
    topbar.style.setProperty("--content-cx", cx + "px");
  }

  let alignQueued = false;
  function scheduleAlignAll() {
    if (alignQueued) return;
    alignQueued = true;
    requestAnimationFrame(() => {
      alignQueued = false;
      windows.forEach(alignCenter);
    });
  }

  const alignRO = new ResizeObserver(scheduleAlignAll);
  windows.forEach((w) => alignRO.observe(w));
  if (viewport) alignRO.observe(viewport);
  window.addEventListener("resize", scheduleAlignAll);

  /* ---------- focus ---------- */
  let zTop = 20;

  function focusWindow(win) {
    if (!win || win.classList.contains("is-focused")) return;
    windows.forEach((w) => {
      w.classList.remove("is-focused");
      w.querySelectorAll("[data-content-resize].is-on").forEach((el) => {
        el.classList.remove("is-on");
      });
    });
    win.classList.add("is-focused");
    // keep window z below recover (9998) / statusbar (9999)
    zTop += 1;
    if (zTop > 100) zTop = 30;
    win.style.zIndex = String(zTop);
    windows.forEach((w) => {
      if (w !== win) closeMenu(w);
    });
  }

  // click-through: only content + chrome capsules take focus
  windows.forEach((win) => {
    const hits = [
      win.querySelector("[data-content]"),
      win.querySelector(".topbar"),
      win.querySelector(".navbar"),
    ].filter(Boolean);
    hits.forEach((el) => {
      el.addEventListener("pointerdown", () => focusWindow(win), { capture: true });
    });
  });

  // click empty screen (wallpaper) → all windows unfocus
  viewport?.addEventListener(
    "pointerdown",
    (e) => {
      // ignore windows / system chrome — status bar must not unfocus a maximized window
      if (
        e.target.closest(".window") ||
        e.target.closest(".recover") ||
        e.target.closest(".vp-resize") ||
        e.target.closest("#statusBar")
      ) {
        return;
      }
      windows.forEach((w) => w.classList.remove("is-focused"));
    },
    true
  );

  focusWindow($("#winSettings"));

  /* ---------- window drag: transform-based, unclamped, one global move ---------- */
  let dragWin = null;
  let dragMode = ""; // "handle" | "recover"
  let dsx = 0, dsy = 0;
  let dStartX = 0, dStartY = 0; // window start in px relative to viewport
  let dWinW = 0, dWinH = 0;

  let dragMoved = false;

  function beginDrag(win, mode, e) {
    if (!win || win.getAttribute("data-mode") !== "floating") return;
    // entire capsule is draggable, including min / close
    dragWin = win;
    dragMode = mode;
    dragMoved = false;
    focusWindow(win);

    const wr = win.getBoundingClientRect();
    const vr = viewport.getBoundingClientRect();
    dStartX = wr.left - vr.left;
    dStartY = wr.top - vr.top;
    dWinW = wr.width;
    dWinH = wr.height;
    dsx = e.clientX;
    dsy = e.clientY;

    // switch to px positioning for the whole drag (no % thrash)
    win.style.transition = "none";
    win.style.left = dStartX + "px";
    win.style.top = dStartY + "px";
    win.style.width = dWinW + "px";
    win.style.height = dWinH + "px";

    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }

  function moveDrag(e) {
    if (!dragWin) return;
    if (Math.abs(e.clientX - dsx) > 3 || Math.abs(e.clientY - dsy) > 3) {
      dragMoved = true;
    }
    const vr = viewport.getBoundingClientRect();
    // NO clamping — window may leave the screen
    const nx = dStartX + (e.clientX - dsx);
    const ny = dStartY + (e.clientY - dsy);
    dragWin.style.left = nx + "px";
    dragWin.style.top = ny + "px";

    // recover is a child of the window — it moves with the window,
    // do not add a second offset (that caused drift)

    // cheap align (inline, no rAF queue flood)
    alignCenter(dragWin);
  }

  function endDrag() {
    if (!dragWin) return;
    const win = dragWin;
    const mode = dragMode;
    dragWin = null;
    dragMode = "";
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    // restore % after a tick so layout stays responsive
    const vr = viewport.getBoundingClientRect();
    if (vr.width > 0 && win.getAttribute("data-mode") === "floating") {
      const wr = win.getBoundingClientRect();
      win.style.left = ((wr.left - vr.left) / vr.width) * 100 + "%";
      win.style.top = ((wr.top - vr.top) / vr.height) * 100 + "%";
      win.style.width = (wr.width / vr.width) * 100 + "%";
      win.style.height = (wr.height / vr.height) * 100 + "%";
    }
    win.style.transition = "";
    if (mode === "recover") hideRecover();
    scheduleAlignAll();
  }

  window.addEventListener("pointermove", moveDrag, { passive: true });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  /* per-window chrome */
  windows.forEach((win) => {
    const dragZone = win.querySelector("[data-drag-zone]");
    dragZone?.addEventListener("pointerdown", (e) => beginDrag(win, "handle", e));
    dragZone?.addEventListener("dblclick", (e) => {
      if (e.target.closest(".win-ctl")) return;
      toggleMaximize(win);
    });

    win.querySelector('[data-win="min"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dragMoved) return;
      win.style.transition = "opacity 180ms ease, transform 180ms ease";
      win.style.opacity = "0";
      win.style.transform = "scale(0.94) translateY(10px)";
      setTimeout(() => {
        win.style.opacity = "";
        win.style.transform = "";
        win.style.transition = "";
      }, 200);
    });

    win.querySelector('[data-win="close"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dragMoved) return;
      win.style.transition = "opacity 180ms ease, transform 180ms ease";
      win.style.opacity = "0";
      win.style.transform = "scale(0.96)";
      setTimeout(() => {
        win.style.display = "none";
        setTimeout(() => {
          win.style.display = "";
          win.style.opacity = "";
          win.style.transform = "";
          win.style.transition = "";
          focusWindow(win);
        }, 350);
      }, 180);
    });

    /* maximize */
    win._savedGeom = null;

    /* content resize knob */
    const cre = win.querySelector("[data-content-resize]");
    cre?.addEventListener("pointerdown", (e) => {
      if (win.getAttribute("data-mode") !== "floating") return;
      const wr = win.getBoundingClientRect();
      const vr = viewport.getBoundingClientRect();
      dragWin = win;
      dragMode = "content-resize";
      dStartX = wr.left - vr.left;
      dStartY = wr.top - vr.top;
      dWinW = wr.width;
      dWinH = wr.height;
      dsx = e.clientX;
      dsy = e.clientY;
      win.style.transition = "none";
      win.style.left = dStartX + "px";
      win.style.top = dStartY + "px";
      win.style.width = dWinW + "px";
      win.style.height = dWinH + "px";
      e.preventDefault();
      e.stopPropagation();
      document.body.style.cursor = "nwse-resize";
      document.body.style.userSelect = "none";
    });

    /* app menu */
    const plus = win.querySelector("[data-plus]");
    const menu = win.querySelector("[data-app-menu]");

    function openMenu() {
      if (!menu) return;
      menu.hidden = false;
      plus?.setAttribute("aria-expanded", "true");
    }
    function closeMenuSelf() {
      if (!menu) return;
      menu.hidden = true;
      plus?.setAttribute("aria-expanded", "false");
      menu.querySelectorAll(".mp-expand").forEach((p) => p.classList.remove("is-open"));
      menu.querySelectorAll(".mp-expand-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
    }
    win._closeMenu = closeMenuSelf;

    plus?.addEventListener("click", (e) => {
      e.stopPropagation();
      focusWindow(win);
      if (menu && !menu.hidden) closeMenuSelf();
      else openMenu();
    });

    menu?.querySelectorAll("[data-expand]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = btn.getAttribute("data-expand");
        const pane = menu.querySelector('[data-expand-pane="' + key + '"]');
        if (!pane) return;
        const open = pane.classList.contains("is-open");
        menu.querySelectorAll(".mp-expand").forEach((p) => p.classList.remove("is-open"));
        menu.querySelectorAll(".mp-expand-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
        if (!open) {
          pane.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    menu?.querySelectorAll("[data-act]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = el.getAttribute("data-act");
        if (act === "about") {
          closeMenuSelf();
          window.alert((win.getAttribute("data-title") || "应用") + " · anios Studio 1.0");
        } else if (act === "quit") {
          closeMenuSelf();
          win.querySelector('[data-win="close"]')?.click();
        } else if (act === "min") {
          closeMenuSelf();
          win.querySelector('[data-win="min"]')?.click();
        } else if (act === "max") {
          closeMenuSelf();
          toggleMaximize(win);
        }
      });
    });

    /* nav panes */
    const sectionBtns = [...win.querySelectorAll(".nav-btn")];
    const panes = [...win.querySelectorAll(".set-pane")];
    let current = sectionBtns.find((b) => b.classList.contains("active"))?.getAttribute("data-section");
    let swapping = false;

    function showSection(name) {
      if (!name || name === current || swapping) return;
      const oldPane = panes.find((p) => p.getAttribute("data-pane") === current);
      const newPane = panes.find((p) => p.getAttribute("data-pane") === name);
      if (!newPane) return;
      const order = sectionBtns.map((b) => b.getAttribute("data-section"));
      const forward = order.indexOf(name) > order.indexOf(current);
      const outClass = forward ? "to-above" : "to-below";
      const inClass = forward ? "from-below" : "from-above";
      const dur = paneDurMs();
      swapping = true;
      if (oldPane) {
        oldPane.classList.remove("is-entering", "from-above", "from-below");
        oldPane.classList.add("is-leaving", outClass);
      }
      setTimeout(() => {
        if (oldPane) {
          oldPane.hidden = true;
          oldPane.classList.remove("is-leaving", "to-above", "to-below");
        }
        newPane.hidden = false;
        newPane.classList.remove("is-leaving", "to-above", "to-below");
        newPane.classList.add("is-entering", inClass);
        setTimeout(() => {
          newPane.classList.remove("is-entering", "from-above", "from-below");
          current = name;
          swapping = false;
        }, dur);
      }, dur);
    }

    sectionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (swapping) return;
        focusWindow(win);
        sectionBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        showSection(btn.getAttribute("data-section"));
      });
    });

    /* scroll indicator — 1:1 tracking via rAF, no thumb transition */
    const scroller = win.querySelector("[data-content-scroll]");
    const indicator = win.querySelector("[data-scroll-indicator]");
    const thumb = win.querySelector("[data-scroll-thumb]");
    let scrollTimer = null;
    let scrollRaf = 0;

    function paintScroll() {
      scrollRaf = 0;
      if (!thumb || !indicator || !scroller) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (max <= 0) {
        indicator.classList.remove("is-on");
        return;
      }
      const trackH = 80;
      const mode = indicator.getAttribute("data-mode") || "percent";
      const progress = scroller.scrollTop / max; // 0..1

      if (mode === "percent") {
        // Apple Watch: top always aligned with track top; height = progress
        const thumbH = Math.max(8, progress * trackH);
        thumb.style.top = "0px";
        thumb.style.height = thumbH + "px";
      } else {
        // position: sliding thumb shows current location
        const ratio = scroller.clientHeight / scroller.scrollHeight;
        const thumbH = Math.max(18, Math.min(32, trackH * ratio));
        thumb.style.height = thumbH + "px";
        thumb.style.top = progress * (trackH - thumbH) + "px";
      }

      indicator.classList.add("is-on");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => indicator.classList.remove("is-on"), 500);
    }

    scroller?.addEventListener(
      "scroll",
      () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(paintScroll);
      },
      { passive: true }
    );

    /* content resize knob: focused window only + pointer near bottom-right */
    const contentEl = win.querySelector("[data-content]");
    let creOn = false;
    function syncCre(e) {
      if (!cre) return;
      const focused = win.classList.contains("is-focused");
      const cr = contentEl.getBoundingClientRect();
      const near =
        focused &&
        e.clientX > cr.right - 120 &&
        e.clientY > cr.bottom - 120 &&
        e.clientX < cr.right + 12 &&
        e.clientY < cr.bottom + 12;
      if (near === creOn) return;
      creOn = near;
      cre.classList.toggle("is-on", near);
    }
    contentEl?.addEventListener("pointermove", syncCre);
    contentEl?.addEventListener("pointerleave", () => {
      if (!creOn) return;
      creOn = false;
      cre?.classList.remove("is-on");
    });

    /* sliders */
    win.querySelectorAll(".slider").forEach((slider) => {
      if (["animGlobal", "animWindow", "animPane", "animMenu"].includes(slider.id)) return;
      const sync = () => {
        const min = Number(slider.min || 0);
        const max = Number(slider.max || 100);
        slider.style.setProperty("--val", ((Number(slider.value) - min) / (max - min)) * 100 + "%");
        const val = slider.closest(".slider-row")?.querySelector(".slider-val");
        if (val) val.textContent = Math.round(Number(slider.value)) + "%";
      };
      slider.addEventListener("input", sync);
      sync();
    });

    /* dial pad */
    const dialDisplay = win.querySelector("#dialDisplay");
    const dialPad = win.querySelector("#dialPad");
    const dialBack = win.querySelector("#dialBack");
    let number = "";
    function renderDial() {
      if (!dialDisplay) return;
      dialDisplay.textContent = number || "输入号码";
      dialDisplay.style.color = number ? "" : "var(--ink-3)";
    }
    dialPad?.querySelectorAll(".dial-key").forEach((key) => {
      key.addEventListener("click", () => {
        const ch = key.querySelector("b")?.textContent?.trim() || "";
        if (ch && number.length < 16) number += ch;
        renderDial();
      });
    });
    dialBack?.addEventListener("click", () => {
      number = number.slice(0, -1);
      renderDial();
    });
  });

  /* content-resize uses same moveDrag: when dragMode is content-resize, resize not move */
  // override moveDrag behavior for content-resize via flag check — patch below

  function flipRect(el, from, to, extra) {
    if (!el || !to.width || !to.height) return;
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    const base = (extra && extra.base) || "";
    el.style.transition = "none";
    el.style.transformOrigin = "top left";
    if (extra && extra.scale) {
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) ${base}`.trim();
    } else {
      el.style.transform = `translate(${dx}px, ${dy}px) ${base}`.trim();
    }
  }

  function playFlip(el, dur, base) {
    const endT = base || "none";
    el.style.transition = `transform ${dur}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    el.style.transform = endT;
    const done = () => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
    setTimeout(done, dur + 80);
  }

  function animateRadius(el, from, to, dur) {
    if (!el || !el.animate) return;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [{ borderRadius: from }, { borderRadius: to }],
      { duration: dur, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
  }

  /**
   * Maximize / restore:
   * 1. Snap .window box + data-mode instantly (window's own left/top
   *    transition is disabled so it cannot fight child FLIP)
   * 2. FLIP only content / navbar / topbar from old visual → new layout
   * 3. Navbar keeps translateY(-50%) as its base transform
   */
  function toggleMaximize(win) {
    if (win._flipping) return;
    win._flipping = true;

    const mode = win.getAttribute("data-mode");
    const dur = windowDurMs();
    const contentEl = win.querySelector("[data-content]");
    const navEl = win.querySelector(".navbar");
    const topEl = win.querySelector("[data-topbar]");

    const endFlip = () => {
      setTimeout(() => {
        win._flipping = false;
        alignCenter(win);
      }, dur + 40);
    };

    if (mode === "maximized") {
      const g = win._savedGeom;
      if (!g || !contentEl) {
        win.setAttribute("data-mode", "floating");
        win._flipping = false;
        return;
      }

      // FIRST: maximized visual
      const fContent = contentEl.getBoundingClientRect();
      const fNav = navEl?.getBoundingClientRect();
      const fTop = topEl?.getBoundingClientRect();

      // SNAP window to floating (no CSS transition)
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

      const lContent = contentEl.getBoundingClientRect();
      const lNav = navEl?.getBoundingClientRect();
      const lTop = topEl?.getBoundingClientRect();

      flipRect(contentEl, fContent, lContent, { scale: true });
      if (navEl && fNav && lNav) {
        flipRect(navEl, fNav, lNav, { scale: false, base: "translateY(-50%)" });
      }
      if (topEl && fTop && lTop) flipRect(topEl, fTop, lTop, { scale: false });

      animateRadius(contentEl, "0px", "16px", dur);
      animateRadius(win, "0px", "16px", dur);

      requestAnimationFrame(() => {
        playFlip(contentEl, dur);
        if (navEl) playFlip(navEl, dur, "translateY(-50%)");
        if (topEl) playFlip(topEl, dur);
      });

      setTimeout(() => {
        const vr = viewport.getBoundingClientRect();
        if (vr.width > 0) {
          win.style.left = (g.left / vr.width) * 100 + "%";
          win.style.top = (g.top / vr.height) * 100 + "%";
          win.style.width = (g.width / vr.width) * 100 + "%";
          win.style.height = (g.height / vr.height) * 100 + "%";
        }
      }, dur + 20);
      endFlip();
    } else {
      const wr = win.getBoundingClientRect();
      const vr = viewport.getBoundingClientRect();
      win._savedGeom = {
        left: wr.left - vr.left,
        top: wr.top - vr.top,
        width: wr.width,
        height: wr.height,
      };

      const fContent = contentEl.getBoundingClientRect();
      const fNav = navEl?.getBoundingClientRect();
      const fTop = topEl?.getBoundingClientRect();

      // SNAP window to full viewport (no transition on the box)
      win.style.transition = "none";
      win.setAttribute("data-mode", "maximized");
      win.style.left = "0px";
      win.style.top = "0px";
      win.style.width = "100%";
      win.style.height = "100%";
      win.style.borderRadius = "0px";
      void win.offsetHeight;
      win.style.transition = "";

      const lContent = contentEl.getBoundingClientRect();
      const lNav = navEl?.getBoundingClientRect();
      const lTop = topEl?.getBoundingClientRect();

      flipRect(contentEl, fContent, lContent, { scale: true });
      if (navEl && fNav && lNav) {
        flipRect(navEl, fNav, lNav, { scale: false, base: "translateY(-50%)" });
      }
      if (topEl && fTop && lTop) flipRect(topEl, fTop, lTop, { scale: false });

      animateRadius(contentEl, "16px", "0px", dur);
      animateRadius(win, "16px", "0px", dur);

      requestAnimationFrame(() => {
        playFlip(contentEl, dur);
        if (navEl) playFlip(navEl, dur, "translateY(-50%)");
        if (topEl) playFlip(topEl, dur);
      });

      endFlip();
    }
    closeMenu(win);
  }

  function trackAlign(win, ms) {
    // one pass after settle — do not run per-frame (flicker source)
    setTimeout(() => alignCenter(win), ms);
  }

  function closeMenu(win) {
    if (win && win._closeMenu) win._closeMenu();
  }

  document.addEventListener("pointerdown", (e) => {
    windows.forEach((win) => {
      const menu = win.querySelector("[data-app-menu]");
      if (!menu || menu.hidden) return;
      if (e.target.closest("[data-app-menu]") || e.target.closest("[data-plus]")) return;
      closeMenu(win);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    windows.forEach(closeMenu);
    windows.forEach((win) => {
      if (win.getAttribute("data-mode") === "maximized") toggleMaximize(win);
    });
  });

  /* =========================================================
     Recovery control

     SHOW when BOTH:
       1) focused window's drag control is not fully on-screen
       2) min distance(mouse → any window edge) < dragH + 2*gap
          dragH = topbar-h, gap = win-pad  →  28 + 2*5 = 38px

     PLACE:
       edge = nearest window edge to the mouse
       on-screen remainder of that edge
       center-align to that remainder
       sit OUTSIDE that edge, gap == topbar-to-window gap
       top→above, left→left, bottom→below, right→right
       when nearest edge changes, re-place

     SHAPE:
       top/bottom → horizontal wide pill; hover grows L+R from midpoint
       left/right  → vertical tall pill;   hover grows T+B from midpoint
     ========================================================= */
  /* recover events — one control per window */
  windows.forEach((win) => {
    const zone = win.querySelector("[data-recover-zone]");
    const rMin = win.querySelector("[data-recover-min]");
    const rClose = win.querySelector("[data-recover-close]");

    zone?.addEventListener("pointerdown", (e) => {
      if (!win.classList.contains("is-focused")) return;
      beginDrag(win, "recover", e);
    });
    zone?.addEventListener("dblclick", (e) => {
      if (dragMoved) return;
      toggleMaximize(win);
      hideRecover();
    });
    rMin?.addEventListener("click", () => {
      if (dragMoved) return;
      win.querySelector('[data-win="min"]')?.click();
      hideRecover();
    });
    rClose?.addEventListener("click", () => {
      if (dragMoved) return;
      win.querySelector('[data-win="close"]')?.click();
      hideRecover();
    });
  });

  function focusedWindow() {
    return $(".window.is-focused") || null;
  }

  function dragHandleVisible(win) {
    const bar =
      win.querySelector(".topbar") ||
      win.querySelector("[data-drag-handle]");
    if (!bar) return true;
    const h = bar.getBoundingClientRect();
    const v = viewport.getBoundingClientRect();
    return (
      h.top >= v.top - 0.5 &&
      h.left >= v.left - 0.5 &&
      h.right <= v.right + 0.5 &&
      h.bottom <= v.bottom + 0.5
    );
  }

  let recoverVisible = false;

  function hideRecover() {
    windows.forEach((w) => {
      const rc = getRecover(w);
      if (!rc) return;
      rc.hidden = true;
      rc.classList.remove("is-on");
      rc.removeAttribute("data-placed");
      rc.removeAttribute("data-edge");
    });
    recoverVisible = false;
    dbgSet("xy", "未显示");
    document.querySelector('[data-dbg="xy"]')?.parentElement?.classList.remove("live");
  }

  function showRecover(win, cx, cy, orient, edge) {
    const recoverCtl = getRecover(win);
    if (!recoverCtl) return;
    recoverCtl.setAttribute("data-orient", orient);
    recoverCtl.setAttribute("data-edge", edge);
    recoverCtl.hidden = false;
    recoverCtl.style.left = Math.round(cx) + "px";
    recoverCtl.style.top = Math.round(cy) + "px";
    recoverCtl.classList.add("is-on");
    recoverCtl.setAttribute("data-placed", "1");
    recoverVisible = true;
  }

  /* ---- debug bar ---- */
  const dbgLast = {};

  function dbgSet(key, val) {
    const s = String(val);
    if (dbgLast[key] === s) return;
    dbgLast[key] = s;
    const el = document.querySelector('[data-dbg="' + key + '"]');
    if (el) el.textContent = s;
  }

  let lastDbgRecover = 0;

  function dbgRecover(info) {
    if (document.getElementById("debugBar")?.hidden) return;
    const now = performance.now();
    if (now - lastDbgRecover < 200) return;
    lastDbgRecover = now;
    dbgSet("mouse", info.mouse);
    dbgSet("winRect", info.winRect);
    dbgSet("dist", info.dist);
    dbgSet("nearest", info.nearest);
    dbgSet("near", info.near);
    dbgSet("c1", info.c1);
    dbgSet("c2", info.c2);
    dbgSet("remainder", info.remainder);
    dbgSet("orient", info.orient);
    dbgSet("half", info.half);
    dbgSet("xy", info.xy);
    document
      .querySelector('[data-dbg="xy"]')
      ?.parentElement?.classList.toggle("live", !!info.live);
  }

  function dbgSystem() {
    if (document.getElementById("debugBar")?.hidden) return;
    const win = focusedWindow();
    if (!win) return;

    dbgSet(
      "focus",
      windows
        .map((w) => (w.classList.contains("is-focused") ? "●" : "○") + " " + w.id)
        .join("  ")
    );
    dbgSet("mode", win.getAttribute("data-mode"));
    dbgSet("zindex", win.style.zIndex || "auto");
    dbgSet(
      "winList",
      windows.map((w) => w.id + ":" + (w.style.display === "none" ? "隐藏" : "开")).join(" ")
    );

    const wr = win.getBoundingClientRect();
    dbgSet(
      "winSize",
      wr.width.toFixed(0) + "×" + wr.height.toFixed(0) +
        " @ " + wr.left.toFixed(0) + "," + wr.top.toFixed(0)
    );

    const handle = win.querySelector("[data-drag-handle]");
    const hr = handle?.getBoundingClientRect();
    dbgSet(
      "dragRect",
      hr
        ? hr.left.toFixed(0) + "," + hr.top.toFixed(0) + " " +
          hr.width.toFixed(0) + "×" + hr.height.toFixed(0)
        : "—"
    );

    const topbar = win.querySelector("[data-topbar]");
    dbgSet("cx", topbar?.style.getPropertyValue("--content-cx") || "—");

    const nav = win.querySelector(".navbar");
    const chrome = win.querySelector(".chrome-ctl");
    dbgSet(
      "chromeVis",
      "nav:" + (nav && getComputedStyle(nav).opacity !== "0" ? "显" : "隐") +
        "  ctl:" + (chrome && getComputedStyle(chrome).opacity !== "0" ? "显" : "隐")
    );

    const menu = win.querySelector("[data-app-menu]");
    dbgSet("menu", menu && !menu.hidden ? "打开" : "关闭");

    const scroller = win.querySelector("[data-content-scroll]");
    const indicator = win.querySelector("[data-scroll-indicator]");
    if (scroller && indicator) {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const pct = max > 0 ? Math.round((scroller.scrollTop / max) * 100) : 0;
      dbgSet(
        "scroll",
        (indicator.getAttribute("data-mode") || "percent") +
          "  " + pct + "%  " +
          (indicator.classList.contains("is-on") ? "显" : "隐")
      );
    }

    dbgSet(
      "vpSize",
      viewport.offsetWidth + "×" + viewport.offsetHeight
    );
    dbgSet(
      "vpMeta",
      (viewport.getAttribute("data-size-preset") || "—") +
        " / " + (viewport.getAttribute("data-screen") || "—")
    );
    dbgSet("theme", document.documentElement.getAttribute("data-theme") || "—");
    dbgSet(
      "dur",
      getComputedStyle(document.documentElement).getPropertyValue("--dur").trim()
    );
  }

  /**
   * The CONTENT area is the window.
   * Nav + top control bar float outside it — they are NOT the window.
   * Recover control is placed against the CONTENT rect.
   * Nav-occupied space is treated as off-screen so the control
   * does not sit on top of the nav.
   */
  function placeRecover(e) {
    if (dragWin || !viewport) return;

    const win = focusedWindow();
    const recoverCtl = getRecover(win);
    if (!win || !recoverCtl) return;

    const contentEl = win.querySelector("[data-content]");
    const navEl = win.querySelector(".navbar");
    const wr = contentEl ? contentEl.getBoundingClientRect() : null;
    const winBox = win.getBoundingClientRect();
    const vr = viewport.getBoundingClientRect();
    const nr = navEl && getComputedStyle(navEl).opacity !== "0"
      ? navEl.getBoundingClientRect()
      : null;
    const mx = e.clientX;
    const my = e.clientY;

    const gap = 5;
    const dragH = 28;
    const NEAR = dragH + 2 * gap;

    if (!wr || win.getAttribute("data-mode") !== "floating") {
      dbgRecover({
        mouse: mx + "," + my,
        winRect: wr ? rectStr(wr) : "—",
        dist: "—",
        nearest: "—",
        near: NEAR,
        c1: "—",
        c2: "—",
        remainder: "—",
        orient: "—",
        half: "—",
        xy: "未显示",
        live: false,
      });
      hideRecover();
      return;
    }

    const c1pass = !dragHandleVisible(win);

    const dist = {
      left: Math.abs(mx - wr.left),
      right: Math.abs(mx - wr.right),
      top: Math.abs(my - wr.top),
      bottom: Math.abs(my - wr.bottom),
    };

    let edge = "top";
    let best = dist.top;
    if (dist.bottom < best) { edge = "bottom"; best = dist.bottom; }
    if (dist.left < best) { edge = "left"; best = dist.left; }
    if (dist.right < best) { edge = "right"; best = dist.right; }

    const c2pass = best <= NEAR;

    const prevEdge = recoverCtl.getAttribute("data-edge");
    if (
      prevEdge &&
      recoverVisible &&
      edge !== prevEdge &&
      best + 12 > (dist[prevEdge] || Infinity)
    ) {
      edge = prevEdge;
    }

    // on-screen remainder of the CONTENT edge, minus nav (treated as off-screen)
    let ex0 = Math.max(wr.left, vr.left);
    let ex1 = Math.min(wr.right, vr.right);
    let ey0 = Math.max(wr.top, vr.top);
    let ey1 = Math.min(wr.bottom, vr.bottom);

    if (nr && edge === "left") {
      // nav is on the LEFT of content — only the left edge treats it as off-screen
      const cutTop = Math.max(ey0, nr.top);
      const cutBot = Math.min(ey1, nr.bottom);
      if (cutBot > cutTop) {
        const segAbove = cutTop - ey0;
        const segBelow = ey1 - cutBot;
        if (segBelow > segAbove) ey0 = cutBot;
        else ey1 = cutTop;
      }
    }

    const orient = edge === "top" || edge === "bottom" ? "h" : "v";

    const base = {
      mouse: mx.toFixed(0) + "," + my.toFixed(0),
      winRect: "内容 " + rectStr(wr),
      dist:
        dist.top.toFixed(0) +
        "/" +
        dist.bottom.toFixed(0) +
        "/" +
        dist.left.toFixed(0) +
        "/" +
        dist.right.toFixed(0),
      nearest: edge + " @ " + best.toFixed(0),
      near: NEAR,
      c1: c1pass ? "是（离屏）" : "否（完整）",
      c2: c2pass ? "是" : "否 (" + best.toFixed(0) + ">" + NEAR + ")",
      remainder:
        "x[" +
        ex0.toFixed(0) +
        "," +
        ex1.toFixed(0) +
        "] y[" +
        ey0.toFixed(0) +
        "," +
        ey1.toFixed(0) +
        "]" +
        (nr ? " ·nav扣除" : ""),
      orient: orient + " / " + edge,
      half: "—",
      xy: "未显示",
      live: false,
    };

    if (!c1pass || !c2pass) {
      dbgRecover(base);
      hideRecover();
      return;
    }

    const halfH = (recoverCtl.offsetHeight || 28) / 2;
    const halfW = (recoverCtl.offsetWidth || 28) / 2;
    base.half = halfW.toFixed(0) + "/" + halfH.toFixed(0);

    // position in WINDOW coordinates (recover is a child of .window)
    let cx;
    let cy;
    if (edge === "top") {
      cx = (ex0 + ex1) / 2 - winBox.left;
      cy = wr.top - winBox.top - gap - halfH;
    } else if (edge === "bottom") {
      cx = (ex0 + ex1) / 2 - winBox.left;
      cy = wr.bottom - winBox.top + gap + halfH;
    } else if (edge === "left") {
      cx = wr.left - winBox.left - gap - halfW;
      cy = (ey0 + ey1) / 2 - winBox.top;
    } else {
      cx = wr.right - winBox.left + gap + halfW;
      cy = (ey0 + ey1) / 2 - winBox.top;
    }

    let vx = winBox.left + cx;
    let vy = winBox.top + cy;
    vx = Math.max(halfW, Math.min(vx, vr.left + vr.width - halfW));
    vy = Math.max(halfH, Math.min(vy, vr.top + vr.height - halfH));
    cx = vx - winBox.left;
    cy = vy - winBox.top;

    const wouldOverlap =
      winBox.left + cx + halfW > wr.left &&
      winBox.left + cx - halfW < wr.right &&
      winBox.top + cy + halfH > wr.top &&
      winBox.top + cy - halfH < wr.bottom;
    if (wouldOverlap) {
      base.xy = "跳过（会压住内容）";
      base.live = false;
      dbgRecover(base);
      hideRecover();
      return;
    }

    const nx = Math.round(cx);
    const ny = Math.round(cy);
    const heldEdge = recoverCtl.getAttribute("data-edge");
    const prevLeft = recoverCtl.style.left;
    const prevTop = recoverCtl.style.top;

    // only touch DOM when something actually changed — avoids flicker
    if (
      recoverVisible &&
      heldEdge === edge &&
      prevLeft === nx + "px" &&
      prevTop === ny + "px"
    ) {
      base.xy = nx + " , " + ny + " (保持)";
      base.live = true;
      dbgRecover(base);
      return;
    }

    showRecover(win, nx, ny, orient, edge);
    base.xy = nx + " , " + ny;
    base.live = true;
    dbgRecover(base);
  }

  function rectStr(r) {
    return (
      r.left.toFixed(0) +
      "," +
      r.top.toFixed(0) +
      " " +
      r.width.toFixed(0) +
      "×" +
      r.height.toFixed(0)
    );
  }

  // rAF-throttled placeRecover; debug at low frequency (DOM text churn
  // was forcing full-page paints that flickered the window below)
  let movePending = false;
  let lastMove = null;
  let lastDbg = 0;

  viewport?.addEventListener(
    "pointermove",
    (e) => {
      lastMove = e;
      if (movePending) return;
      movePending = true;
      requestAnimationFrame(() => {
        movePending = false;
        if (!lastMove) return;
        if (!dragWin) placeRecover(lastMove);
        const now = performance.now();
        if (now - lastDbg > 400) {
          lastDbg = now;
          dbgSystem();
        }
      });
    },
    { passive: true }
  );

  viewport?.addEventListener("pointerleave", () => {
    if (!dragWin) hideRecover();
    dbgSystem();
  });

  /* (recover events bound per-window above) */

  /* content-resize resizes via the same moveDrag (dragMode === "content-resize") */
  // wrap: if content-resize, change width/height instead of left/top of window position
  window.removeEventListener("pointermove", moveDrag);
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!dragWin) return;
      if (dragMode === "content-resize") {
        const vr = viewport.getBoundingClientRect();
        const w = Math.max(220, dWinW + (e.clientX - dsx));
        const h = Math.max(160, dWinH + (e.clientY - dsy));
        dragWin.style.width = w + "px";
        dragWin.style.height = h + "px";
        alignCenter(dragWin);
        return;
      }
      moveDrag(e);
    },
    { passive: true }
  );

  /* ---------- system status bar ---------- */
  const statusBar = $("#statusBar");
  const stTime = $("#stTime");
  const batArc = $("#batArc");
  const batPct = $("#batPct");
  const stMore = $("#stMore");
  const statusPanel = $("#statusPanel");

  function tickClock() {
    if (!stTime) return;
    const d = new Date();
    stTime.textContent =
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function setBattery(pct) {
    if (!batArc || !batPct) return;
    const p = Math.max(0, Math.min(100, pct));
    const C = 2 * Math.PI * 14;
    batArc.style.strokeDasharray = String(C);
    batArc.style.strokeDashoffset = String(C * (1 - p / 100));
    batPct.textContent = String(Math.round(p));
  }

  tickClock();
  setInterval(tickClock, 30000);
  setBattery(72);

  /* network type switches in Settings → 网络, not on the status icon */
  $$("[data-net-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-net-mode");
      statusBar?.setAttribute("data-net", mode);
      $$("[data-net-mode]").forEach((b) => {
        b.setAttribute(
          "aria-pressed",
          b.getAttribute("data-net-mode") === mode ? "true" : "false"
        );
      });
    });
  });

  const statusCapsule = $("#statusCapsule");
  const stSide = $("#stSide");

  function openStatusPanel(open) {
    statusCapsule?.classList.toggle("is-open", open);
    stMore?.setAttribute("aria-expanded", open ? "true" : "false");
    if (stSide) stSide.setAttribute("aria-hidden", open ? "false" : "true");
  }

  stMore?.addEventListener("click", (e) => {
    e.stopPropagation();
    openStatusPanel(!statusCapsule?.classList.contains("is-open"));
  });

  document.addEventListener("pointerdown", (e) => {
    if (!statusCapsule?.classList.contains("is-open")) return;
    if (e.target.closest("#statusBar")) return;
    openStatusPanel(false);
  });

  setTheme("light");
  scheduleAlignAll();
})();
