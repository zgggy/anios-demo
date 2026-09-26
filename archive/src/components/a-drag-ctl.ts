import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * Drag control: min | grip | close.
 * Same element for window chrome and recover — only host placement differs.
 * Hover expands from the midpoint (CSS width + negative margins).
 */
@customElement("a-drag-ctl")
export class ADragCtl extends LitElement {
  @property({ type: String }) orient: "h" | "v" = "h";

  override createRenderRoot(): HTMLElement {
    return this;
  }

  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: var(--tb-btn, 22px);
      width: var(--tb-btn, 22px);
      border-radius: calc(var(--tb-btn, 22px) / 2);
      overflow: visible;
      cursor: grab;
      transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1),
        margin 220ms cubic-bezier(0.22, 1, 0.36, 1),
        background 140ms ease;
    }
    :host(:hover) {
      width: calc(var(--tb-btn, 22px) * 3);
      margin-left: calc(var(--tb-btn, 22px) * -1);
      margin-right: calc(var(--tb-btn, 22px) * -1);
      background: var(--hover, rgba(15, 23, 42, 0.08));
    }
    :host:active {
      cursor: grabbing;
    }
  `;

  override render() {
    return html`
      <button type="button" class="tb-btn win-ctl win-min" data-win="min" aria-label="收起" title="收起">
        <i class="led led-min"></i>
      </button>
      <button type="button" class="tb-btn drag-btn" data-drag-handle aria-label="拖动">
        <span class="grip"><i></i><i></i></span>
      </button>
      <button type="button" class="tb-btn win-ctl win-close" data-win="close" aria-label="关闭" title="关闭">
        <i class="led led-close"></i>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a-drag-ctl": ADragCtl;
  }
}
