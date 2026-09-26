import { $ } from "./dom";

/** Keep topbar pill centered on content (layout coords — immune to FLIP transforms). */
export function alignCenter(win: HTMLElement): void {
  const contentEl = $("[data-content]", win);
  const topbar = $("[data-topbar]", win);
  if (!contentEl || !topbar) return;
  const cx = (contentEl as HTMLElement).offsetLeft + (contentEl as HTMLElement).offsetWidth / 2;
  (topbar as HTMLElement).style.setProperty("--content-cx", cx + "px");
}

export function alignAll(windows: HTMLElement[]): void {
  windows.forEach(alignCenter);
}
