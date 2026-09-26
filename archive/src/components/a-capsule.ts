import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { chromeCss } from "./chrome-css";

/**
 * Shared frosted capsule — same look for navbar / statusbar / controlbar / recover.
 * `axis`: "h" (control bar) | "v" (navbar, statusbar)
 */
@customElement("a-capsule")
export class ACapsule extends LitElement {
  @property({ type: String }) axis: "h" | "v" = "h";

  /** Light DOM so CSS/JS keep working (no shadow encapsulation). */
  override createRenderRoot(): HTMLElement {
    return this;
  }

  static override styles = [chromeCss];

  override render() {
    return html`<div class="shell" data-dir=${this.axis === "v" ? "col" : "row"}>
      <slot></slot>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a-capsule": ACapsule;
  }
}
