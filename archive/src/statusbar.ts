import { $, on } from "./dom";

export function initStatusBar(): void {
  const bar = $("#statusBar");
  const capsule = $("#statusCapsule");
  const time = $("#stTime");
  const arc = $("#batArc") as SVGCircleElement | null;
  const pct = $("#batPct");
  const more = $("#stMore");
  const side = $("#stSide");

  const tick = () => {
    if (!time) return;
    const d = new Date();
    time.textContent =
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  const battery = (p: number) => {
    if (!arc || !pct) return;
    const c = 2 * Math.PI * 14;
    arc.style.strokeDasharray = String(c);
    arc.style.strokeDashoffset = String(c * (1 - p / 100));
    pct.textContent = String(Math.round(p));
  };

  tick();
  window.setInterval(tick, 30_000);
  battery(72);

  on(more, "click", (e) => {
    e.stopPropagation();
    const open = !capsule?.classList.contains("is-open");
    capsule?.classList.toggle("is-open", open);
    more?.setAttribute("aria-expanded", open ? "true" : "false");
    side?.setAttribute("aria-hidden", open ? "false" : "true");
  });

  on(document, "pointerdown", (e) => {
    if (!capsule?.classList.contains("is-open")) return;
    if ((e.target as Element).closest("#statusBar")) return;
    capsule.classList.remove("is-open");
    more?.setAttribute("aria-expanded", "false");
    side?.setAttribute("aria-hidden", "true");
  });

  // net type via settings; icon is display-only
  void bar;
}
