/** 设置应用：内容 + 内容行为（主题/强调色/动画/滚动指示/网络类型） */
import { $, $$, on } from "../dom";
import type { Store } from "../state";
import type { AppDef } from "./index";

const content = `
<section class="set-pane" data-pane="home">
  <header class="set-head"><h1>主页</h1><p>系统与个性化</p></header>
  <div class="set-group">
    <div class="set-row">
      <div><div class="row-t">主题</div><div class="row-s">浅色 / 深色</div></div>
      <div class="seg small">
        <button type="button" data-theme="light" aria-pressed="true">浅</button>
        <button type="button" data-theme="dark">深</button>
      </div>
    </div>
    <div class="set-row">
      <div><div class="row-t">强调色</div><div class="row-s">控件与高亮</div></div>
      <div class="dots">
        <button type="button" class="cd active" style="--c:#3b82f6"></button>
        <button type="button" class="cd" style="--c:#7c5cff"></button>
        <button type="button" class="cd" style="--c:#10b981"></button>
        <button type="button" class="cd" style="--c:#f59e0b"></button>
      </div>
    </div>
  </div>
  <div class="set-group">
    <div class="set-group-title">动画</div>
    <div class="set-row col">
      <div class="row-t">全局 / 窗口 / 切换 / 菜单</div>
      <div class="slider-row"><input class="slider" id="animGlobal" type="range" min="100" max="2000" step="50" value="360" /><span class="slider-val" id="animGlobalVal">360ms</span></div>
      <div class="slider-row"><input class="slider" id="animWindow" type="range" min="100" max="2000" step="50" value="360" /><span class="slider-val" id="animWindowVal">360ms</span></div>
      <div class="slider-row"><input class="slider" id="animPane" type="range" min="80" max="800" step="20" value="200" /><span class="slider-val" id="animPaneVal">200ms</span></div>
      <div class="slider-row"><input class="slider" id="animMenu" type="range" min="80" max="800" step="20" value="200" /><span class="slider-val" id="animMenuVal">200ms</span></div>
    </div>
    <div class="set-row">
      <div class="row-t">滚动指示</div>
      <div class="seg small">
        <button type="button" data-scroll-mode="percent" aria-pressed="true">百分比</button>
        <button type="button" data-scroll-mode="position">位置</button>
      </div>
    </div>
    <div class="set-row">
      <div class="row-t">网络类型</div>
      <div class="seg small">
        <button type="button" data-net-mode="wifi" aria-pressed="true">Wi-Fi</button>
        <button type="button" data-net-mode="cell">5G</button>
      </div>
    </div>
  </div>
</section>
<section class="set-pane" data-pane="network" hidden>
  <header class="set-head"><h1>网络</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">Studio-5G</div><div class="row-s">已连接</div></div></div>
    <div class="set-row"><div class="row-t">网络类型</div>
      <div class="seg small">
        <button type="button" data-net-mode="wifi" aria-pressed="true">Wi-Fi</button>
        <button type="button" data-net-mode="cell">5G</button>
      </div>
    </div>
  </div>
</section>
<section class="set-pane" data-pane="sound" hidden>
  <header class="set-head"><h1>声音</h1></header>
  <div class="set-group">
    <div class="set-row col"><div class="row-t">输出音量</div>
      <div class="slider-row"><input class="slider" type="range" min="0" max="100" value="62" /><span class="slider-val">62%</span></div>
    </div>
  </div>
</section>
<section class="set-pane" data-pane="display" hidden>
  <header class="set-head"><h1>显示</h1></header>
  <div class="set-group">
    <div class="set-row col"><div class="row-t">亮度</div>
      <div class="slider-row"><input class="slider" type="range" min="0" max="100" value="78" /><span class="slider-val">78%</span></div>
    </div>
  </div>
</section>`;

export const settingsApp: AppDef = {
  id: "settings",
  title: "设置",
  icon: "gear",
  geom: { left: 14, top: 10, width: 58, height: 72 },
  z: 22,
  open: true,
  focused: true,
  nav: [
    { section: "home", icon: "home", label: "主页" },
    { section: "network", icon: "net", label: "网络" },
    { section: "sound", icon: "sound", label: "声音" },
    { section: "display", icon: "display", label: "显示" },
  ],
  content,
  searchPlaceholder: "在设置中搜索…",
  editItems: ["撤销", "重做", "剪切", "拷贝"],
  bind(root, store: Store) {
    // 主题
    $$("button[data-theme]", root).forEach((b) => {
      on(b, "click", () => {
        const m = b.getAttribute("data-theme") as "light" | "dark";
        store.update((s) => (s.settings.theme = m));
      });
    });
    // 强调色
    $$(".cd", root).forEach((d) => {
      on(d, "click", () => {
        $$(".cd", root).forEach((x) => x.classList.remove("active"));
        d.classList.add("active");
        const c = getComputedStyle(d).getPropertyValue("--c").trim();
        if (c) store.update((s) => (s.settings.accent = c));
      });
    });
    // 动画时长（全局 = 同时设置三个）
    const bindDur = (id: string, key: "animGlobal" | "animWindow" | "animPane" | "animMenu") => {
      const el = $<HTMLInputElement>(`#${id}`, root);
      if (!el) return;
      on(el, "input", () => {
        const v = Number(el.value);
        store.update((s) => {
          s.settings[key] = v;
          if (key === "animGlobal") {
            s.settings.animWindow = v;
            s.settings.animPane = v;
            s.settings.animMenu = v;
          }
        });
      });
    };
    bindDur("animGlobal", "animGlobal");
    bindDur("animWindow", "animWindow");
    bindDur("animPane", "animPane");
    bindDur("animMenu", "animMenu");
    // 滚动指示
    $$("[data-scroll-mode]", root).forEach((b) => {
      on(b, "click", () => {
        const m = b.getAttribute("data-scroll-mode") as "percent" | "position";
        store.update((s) => (s.settings.scrollMode = m));
      });
    });
    // 网络类型（只在设置里切换，状态栏不提供）
    $$("[data-net-mode]", root).forEach((b) => {
      on(b, "click", () => {
        const m = b.getAttribute("data-net-mode") as "wifi" | "cell";
        store.update((s) => (s.settings.net = m));
      });
    });
  },
};
