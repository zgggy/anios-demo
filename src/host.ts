/**
 * 宿主层：页面外的演示脚手架（视口尺寸/屏幕类型/色彩）+ 通用控件绑定
 * （滚动指示、缩放钮、滑杆）+ 临时面板（点外关闭）。
 */
import { $, $$, on, clamp } from "./dom";
import type { Store } from "./state";
import type { WinApi } from "./windows";

/** 滚动指示：同宽双胶囊（长浅灰/短深灰），滚动时才出现 */
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

/** 临时面板的缩放钮（窗口级缩放在 windows.ts） */
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
  on(root, "pointermove", (e) => {
    const ev = e as PointerEvent;
    const r = root.getBoundingClientRect();
    const near = ev.clientX > r.right - 120 && ev.clientY > r.bottom - 120;
    knob.classList.toggle("is-on", near);
  });
  on(root, "pointerleave", () => knob.classList.remove("is-on"));
}

export function initHost(store: Store, api: WinApi): void {
  const vp = $<HTMLElement>("#viewport");
  const handle = $<HTMLElement>("#vpResize");
  if (!vp) return;

  // 视口尺寸预设 / 屏幕类型（接口预留）：宿主工具，DOM 本地
  $$("button[data-size]").forEach((b) => {
    on(b, "click", () => {
      vp.dataset.size = b.getAttribute("data-size")!;
      vp.style.width = "";
      vp.style.height = "";
      $$("button[data-size]").forEach((x) =>
        x.setAttribute("aria-pressed", x.getAttribute("data-size") === b.getAttribute("data-size") ? "true" : "false"),
      );
      api.alignAll();
    });
  });

  $$("button[data-screen]").forEach((b) => {
    on(b, "click", () => {
      vp.dataset.screen = b.getAttribute("data-screen")!;
      $$("button[data-screen]").forEach((x) =>
        x.setAttribute("aria-pressed", x.getAttribute("data-screen") === b.getAttribute("data-screen") ? "true" : "false"),
      );
      api.alignAll();
    });
  });

  // 色彩：宿主工具的全局主题 → 设置状态
  $$(".host-tools button[data-theme]").forEach((b) => {
    on(b, "click", () => {
      const m = b.getAttribute("data-theme") as "light" | "dark";
      store.update((s) => (s.settings.theme = m));
    });
  });

  // 视口缩放钮：角外侧（top=视口下边、left=视口右边）
  if (handle) {
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
      api.alignAll();
    });
    on(window, "pointerup", () => {
      dragging = false;
      api.alignAll();
    });
  }

  // 通用滑杆：.slider-val 标签回显（百分比）；参数滑杆由设置补丁回显
  for (const s of $$(".slider")) {
    const el = s as HTMLInputElement;
    if (el.dataset.metric || el.dataset.anim || el.dataset.term) continue;
    const sync = () => {
      const lab = el.closest(".slider-row")?.querySelector(".slider-val");
      if (lab && !lab.id) lab.textContent = `${Math.round(Number(el.value))}%`;
    };
    on(el, "input", sync);
    sync();
  }

  // 临时面板（状态栏内容等）：点外关闭；可滚可缩
  const closePanel = (panel: HTMLElement) => {
    panel.hidden = true;
    panel.dispatchEvent(new CustomEvent("temp:close", { bubbles: true }));
  };
  on(document, "pointerdown", (e) => {
    const t = e.target as Element;
    if (!t || typeof t.closest !== "function") return;
    for (const panel of $$<HTMLElement>("[data-temp]")) {
      if (panel.hidden) continue;
      if (panel.contains(t)) continue;
      const anchor = panel.dataset.tempAnchor;
      if (anchor) {
        try {
          if (t.closest(anchor)) continue;
        } catch {
          /* 非法选择器忽略 */
        }
      }
      closePanel(panel);
    }
  });
  for (const panel of $$<HTMLElement>("[data-temp]")) {
    bindScrollIndicator(panel);
    bindResize(panel);
  }
}
