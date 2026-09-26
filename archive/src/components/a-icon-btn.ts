import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

/** Circular icon button — used in all capsules. */
@customElement("a-icon-btn")
export class AIconButton extends LitElement {
  @property({ type: String }) label = "";
  @property({ type: Boolean }) active = false;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  static override styles = css`
    :host {
      display: contents;
    }
    button {
      appearance: none;
      border: 0;
      background: transparent;
      width: var(--btn, 22px);
      height: var(--btn, 22px);
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--ink-2, #334155);
      cursor: pointer;
      padding: 0;
      transition: background 120ms ease;
    }
    button:hover {
      background: var(--hover, rgba(15, 23, 42, 0.08));
    }
    button.active {
      background: var(--soft, rgba(15, 23, 42, 0.05));
      color: var(--accent, #3b82f6);
    }
    ::slotted(svg) {
      width: 14px;
      height: 14px;
    }
  `;

  override render() {
    return html`<button
      type="button"
      class=${"tb-btn " + (this.active ? "active" : "")}
      aria-label=${this.label || "button"}
      title=${this.label}
    >
      <slot></slot>
    </button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a-icon-btn": AIconButton;
  }
}
