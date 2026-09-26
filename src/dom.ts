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

/** Read animation duration from CSS token (ms). */
export function durMs(name: string): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) && v > 0 ? v : 360;
}

/** Layout center of `el` relative to its offsetParent (no transforms). */
export function layoutCenter(el: HTMLElement): { cx: number; cy: number } {
  return {
    cx: el.offsetLeft + el.offsetWidth / 2,
    cy: el.offsetTop + el.offsetHeight / 2,
  };
}
