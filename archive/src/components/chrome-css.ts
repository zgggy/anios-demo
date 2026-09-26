import { css } from "lit";

/**
 * Shared CSS for system chrome — one frost material, one capsule shape.
 */
export const chromeCss = css`
  :host {
    display: block;
    box-sizing: border-box;
    --chrome-h: 28px;
    --btn: 22px;
    --pad: calc((var(--chrome-h) - var(--btn)) / 2);
    font: inherit;
    color: inherit;
  }

  .shell {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: var(--chrome-h);
    padding: var(--pad) var(--pad);
    border-radius: calc(var(--chrome-h) / 2);
    pointer-events: auto;
    width: max-content;
  }

  .shell::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--frost-bg, rgba(255, 255, 255, 0.72));
    border: 1px solid var(--chrome-border, rgba(15, 23, 42, 0.08));
    box-shadow: var(--chrome-shadow, 0 8px 24px rgba(15, 23, 42, 0.1));
    backdrop-filter: var(--frost-blur, blur(28px) saturate(180%));
    -webkit-backdrop-filter: var(--frost-blur, blur(28px) saturate(180%));
    z-index: -1;
    pointer-events: none;
  }

  .shell[data-dir="col"] {
    flex-direction: column;
    width: var(--chrome-h);
    min-height: max-content;
    border-radius: calc(var(--chrome-h) / 2);
    padding: var(--pad) 0;
  }

  ::slotted(.item),
  .item {
    appearance: none;
    border: 0;
    background: transparent;
    width: var(--btn);
    height: var(--btn);
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--ink-2, #334155);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background 120ms ease;
  }

  ::slotted(.item:hover),
  .item:hover {
    background: var(--hover, rgba(15, 23, 42, 0.08));
  }

  ::slotted(svg),
  svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;
