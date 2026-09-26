import { $, $$, on } from "./dom";
import { paneDurMs } from "./theme";

export function initScrollAndPanes(wins: HTMLElement[]): void {
  wins.forEach((win) => {
    // scroll indicator
    const scroller = $("[data-content-scroll]", win);
    const indicator = $("[data-scroll-indicator]", win);
    const thumb = $("[data-scroll-thumb]", win);
    let raf = 0;
    let hideTimer = 0;

    const paint = () => {
      raf = 0;
      if (!scroller || !thumb || !indicator) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (max <= 0) {
        indicator.classList.remove("is-on");
        return;
      }
      const track = 80;
      const mode = indicator.getAttribute("data-mode") || "percent";
      const progress = scroller.scrollTop / max;
      if (mode === "percent") {
        thumb.style.top = "0px";
        thumb.style.height = Math.max(8, progress * track) + "px";
      } else {
        const ratio = scroller.clientHeight / scroller.scrollHeight;
        const h = Math.max(18, Math.min(32, track * ratio));
        thumb.style.height = h + "px";
        thumb.style.top = progress * (track - h) + "px";
      }
      indicator.classList.add("is-on");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => indicator.classList.remove("is-on"), 500);
    };

    on(scroller, "scroll", () => {
      if (raf) return;
      raf = requestAnimationFrame(paint);
    }, { passive: true });

    // pane switch
    const btns = $$(".nav-btn", win);
    const panes = $$(".set-pane", win);
    let current =
      btns.find((b) => b.classList.contains("active"))?.getAttribute("data-section") ?? "";
    let swapping = false;

    const show = (name: string) => {
      if (!name || name === current || swapping) return;
      const oldPane = panes.find((p) => p.getAttribute("data-pane") === current);
      const newPane = panes.find((p) => p.getAttribute("data-pane") === name);
      if (!newPane) return;
      const order = btns.map((b) => b.getAttribute("data-section") ?? "");
      const forward = order.indexOf(name) > order.indexOf(current);
      const out = forward ? "to-above" : "to-below";
      const inn = forward ? "from-below" : "from-above";
      const dur = paneDurMs();
      swapping = true;

      if (oldPane) {
        oldPane.classList.remove("is-entering", "from-above", "from-below");
        oldPane.classList.add("is-leaving", out);
      }
      window.setTimeout(() => {
        if (oldPane) {
          oldPane.hidden = true;
          oldPane.classList.remove("is-leaving", "to-above", "to-below");
        }
        newPane.hidden = false;
        newPane.classList.add("is-entering", inn);
        window.setTimeout(() => {
          newPane.classList.remove("is-entering", "from-above", "from-below");
          current = name;
          swapping = false;
        }, dur);
      }, dur);
    };

    btns.forEach((btn) => {
      on(btn, "click", () => {
        if (swapping) return;
        btns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        show(btn.getAttribute("data-section") ?? "");
      });
    });

    // sliders
    $$(".slider", win).forEach((slider) => {
      if (["animGlobal", "animWindow", "animPane", "animMenu"].includes(slider.id)) return;
      const el = slider as HTMLInputElement;
      const sync = () => {
        const min = Number(el.min || 0);
        const max = Number(el.max || 100);
        el.style.setProperty("--val", ((Number(el.value) - min) / (max - min)) * 100 + "%");
        const val = el.closest(".slider-row")?.querySelector(".slider-val");
        if (val) val.textContent = Math.round(Number(el.value)) + "%";
      };
      on(el, "input", sync);
      sync();
    });

    // scroll mode toggle (settings)
    $$("[data-scroll-mode]").forEach((btn) => {
      on(btn, "click", () => {
        const mode = btn.getAttribute("data-scroll-mode") ?? "percent";
        $$("[data-scroll-indicator]").forEach((ind) => ind.setAttribute("data-mode", mode));
        $$("[data-scroll-mode]").forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            b.getAttribute("data-scroll-mode") === mode ? "true" : "false",
          ),
        );
      });
    });

    // phone dial
    const display = $("#dialDisplay", win);
    const pad = $("#dialPad", win);
    const back = $("#dialBack", win);
    let num = "";
    const render = () => {
      if (!display) return;
      display.textContent = num || "输入号码";
    };
    on(pad, "click", (e) => {
      const k = (e.target as Element).closest(".dial-key")?.querySelector("b")?.textContent?.trim();
      if (k && num.length < 16) num += k;
      render();
    });
    on(back, "click", () => {
      num = num.slice(0, -1);
      render();
    });
  });
}
