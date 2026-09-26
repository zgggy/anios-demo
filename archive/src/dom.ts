/** Tiny DOM helpers. */

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  [...root.querySelectorAll<T>(sel)];

export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget | null | undefined,
  type: K,
  fn: (ev: HTMLElementEventMap[K]) => void,
  opts?: boolean | AddEventListenerOptions,
): void {
  el?.addEventListener(type, fn as EventListener, opts);
}

export function raf(fn: () => void): void {
  requestAnimationFrame(fn);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
