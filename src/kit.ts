/**
 * Shared stroke icons (24×24 viewBox, stroke-width 1.7) and the single drag-zone markup.
 * Controls are defined once here + styles.css — do not fork copies.
 */

export const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M16 16l3.5 3.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8z"/></svg>',
  net: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V7l10-2v11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/></svg>',
  display: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/></svg>',
  dial: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none"/><path d="M9 14c1 1.2 2 1.8 3 1.8s2-.6 3-1.8"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h4l1 5-2.5 1.5a12 12 0 0 0 5 5L16 13l5 1v4a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 2-2z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10c4-4 12-4 16 0"/><path d="M7 13c2.5-2.5 7.5-2.5 10 0"/><circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"/></svg>',
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8a3 3 0 1 0 0 6c2 0 2.5-1.5 4-3s2-3 4-3a3 3 0 1 1 0 6c-2 0-2.5-1.5-4-3s-2-3-4-3z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L6 14h5l-1 7 8-12h-5l0-6z"/></svg>',
  apps: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 9-9 9-9-9z"/></svg>',
} as const;

export type IconName = keyof typeof ICON;

export function ico(name: IconName): string {
  return ICON[name];
}

/**
 * Drag control (min | grip | close) — the same component for top-bar and recover.
 * Hover expands from the midpoint; neighbors are pushed via `.drag-pad`.
 */
export function dragZoneHTML(attrs = ""): string {
  return `<div class="drag-zone" data-drag-zone ${attrs} title="拖动 · 双击最大化">
    <button type="button" class="icon-btn win-ctl win-min" data-win-min aria-label="收起"><i class="led led-min"></i></button>
    <button type="button" class="icon-btn grip-btn" data-grip aria-label="拖动"><span class="grip"><i></i><i></i></span></button>
    <button type="button" class="icon-btn win-ctl win-cls" data-win-cls aria-label="关闭"><i class="led led-close"></i></button>
  </div>`;
}

/** Top-bar capsule body: back · fwd · pad · drag-zone · pad · search · more */
export function topCapsuleHTML(): string {
  return `<div class="capsule top-capsule">
    <button type="button" class="icon-btn" aria-label="后退">${ico("back")}</button>
    <button type="button" class="icon-btn" aria-label="前进">${ico("fwd")}</button>
    <span class="drag-pad" aria-hidden="true"></span>
    ${dragZoneHTML()}
    <span class="drag-pad" aria-hidden="true"></span>
    <button type="button" class="icon-btn" data-search aria-label="搜索" aria-expanded="false">${ico("search")}</button>
    <button type="button" class="icon-btn" data-more aria-label="更多" aria-expanded="false">${ico("plus")}</button>
  </div>`;
}
