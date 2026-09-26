import { $, $$, on } from "./dom";

/**
 * 临时窗口 = 没有顶栏的窗口。
 * 规则：点击窗口外任意位置即关闭；锚点（打开钮/胶囊）上的点击不算关闭。
 * 适用于 [data-temp] 面板，以及将来没有 top-bar 的 .window。
 */
export function initTempWindows(): void {
  const isInsideAnchor = (t: Element, sel: string | null | undefined): boolean => {
    if (!sel) return false;
    try {
      return !!t.closest(sel);
    } catch {
      return false;
    }
  };

  const closePanel = (panel: HTMLElement) => {
    panel.hidden = true;
    panel.dispatchEvent(new CustomEvent("temp:close", { bubbles: true }));
  };

  const closeWin = (win: HTMLElement) => {
    win.style.display = "none";
    win.dataset.open = "0";
    win.dispatchEvent(new CustomEvent("temp:close", { bubbles: true }));
  };

  on(document, "pointerdown", (e) => {
    const t = e.target as Element;
    if (!t || typeof t.closest !== "function") return;

    $$<HTMLElement>("[data-temp]").forEach((panel) => {
      if (panel.hidden) return;
      if (panel.contains(t)) return;
      if (isInsideAnchor(t, panel.dataset.tempAnchor)) return;
      closePanel(panel);
    });

    $$(".window").forEach((win) => {
      if (win.hidden || win.style.display === "none") return;
      if (win.dataset.open === "0") return;
      if ($("[data-topbar]", win)) return;
      if (win.contains(t)) return;
      if (isInsideAnchor(t, win.dataset.tempAnchor)) return;
      closeWin(win);
    });
  });
}
