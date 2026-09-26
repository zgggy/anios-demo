/** DOM 助手：查询、事件、动画时长令牌读取。 */
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T | null =>
  r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T[] =>
  [...r.querySelectorAll<T>(s)];

export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget | null | undefined,
  type: K,
  fn: (ev: HTMLElementEventMap[K]) => void,
  opts?: boolean | AddEventListenerOptions,
): void {
  el?.addEventListener(type, fn as EventListener, opts);
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** 从 CSS 令牌读动画时长（ms） */
export function durMs(name: string): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) && v > 0 ? v : 360;
}

/** 从 CSS 令牌读像素值（几何度量运行时可调，JS 侧按需读取） */
export function pxVar(name: string, fallback: number): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}
