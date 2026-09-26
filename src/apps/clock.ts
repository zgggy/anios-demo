/** 时钟应用：闹钟 + 世界时钟；大钟真实走时 */
import { $$ } from "../dom";
import type { AppDef } from "./index";

const content = `
<section class="set-pane" data-pane="alarm">
  <header class="set-head"><h1>闹钟</h1></header>
  <div class="dial-display" data-clock="seconds">00:00:00</div>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">07:30</div><div class="row-s">工作日 · 闹钟</div></div><div class="st-big">开</div></div>
    <div class="set-row"><div><div class="row-t">09:00</div><div class="row-s">周末 · 闹钟</div></div><div class="st-big">关</div></div>
    <div class="set-row"><div><div class="row-t">22:45</div><div class="row-s">每天 · 就寝</div></div><div class="st-big">开</div></div>
  </div>
</section>
<section class="set-pane" data-pane="world" hidden>
  <header class="set-head"><h1>世界时钟</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">北京</div><div class="row-s">UTC+8 · 本地</div></div><div class="st-big" data-clock="hm">00:00</div></div>
    <div class="set-row"><div><div class="row-t">旧金山</div><div class="row-s">UTC−8</div></div><div class="st-big">08:00</div></div>
    <div class="set-row"><div><div class="row-t">伦敦</div><div class="row-s">UTC+0</div></div><div class="st-big">16:00</div></div>
  </div>
</section>`;

export const clockApp: AppDef = {
  id: "clock",
  title: "时钟",
  blurb: "闹钟与世界时钟",
  icon: "clock",
  geom: { left: 30, top: 22, width: 34, height: 46 },
  z: 20,
  open: false,
  pinned: false,
  nav: [
    { section: "alarm", icon: "clock", label: "闹钟" },
    { section: "world", icon: "net", label: "世界" },
  ],
  content,
  searchPlaceholder: "搜索闹钟与城市…",
  editItems: ["全选", "删除闹钟"],
  bind(root) {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      $$("[data-clock]", root).forEach((el) => {
        el.textContent = el.dataset.clock === "seconds" ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
      });
    };
    tick();
    window.setInterval(tick, 1000);
  },
};
