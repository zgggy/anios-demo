/**
 * 设置应用：内容 + 内容行为。
 * 所有参数滑杆由 state.ts 的参数表生成（METRICS / ANIMS / DERIV_TERMS），
 * 每个滑杆带默认值旗标与「设为默认」按钮（写回 src/state.ts 的 def）。
 */
import { $, $$, on } from "../dom";
import {
  METRICS,
  ANIMS,
  DERIVS,
  DERIV_TERMS,
  findParam,
  defaultMetrics,
  defaultDerivTerms,
  type MetricKey,
  type AnimKey,
  type Store,
} from "../state";
import { icon } from "../render";
import type { AppActions, AppDef } from "./index";

type Kind = "metric" | "anim" | "term";
type RowDef = { key: string; label: string; min: number; max: number; step: number; def: number };

/** 参数滑杆行：默认值旗标（--p = 默认位置）+ 数值回显 + 设为默认按钮 */
function paramRow(
  d: RowDef,
  kind: Kind,
  unit: string,
  opts: { termLabel?: string; desc?: string } = {},
): string {
  const p = (d.def - d.min) / (d.max - d.min);
  return `<div class="slider-row">
    ${opts.termLabel ? `<span class="term-l">${opts.termLabel}</span>` : ""}
    <div class="slider-field">
      <input class="slider" type="range" data-${kind}="${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${d.def}" />
      <i class="def-flag" style="--p: ${p.toFixed(3)}" title="默认 ${d.def}${unit}"></i>
    </div>
    <span class="slider-val" data-${kind}-val="${d.key}">${d.def}${unit}</span>
    <button type="button" class="def-save" data-save="${d.key}" title="设为默认（写入 src/state.ts）">${icon("save")}</button>
  </div>`;
}

/** 参数块 = 标题 + 解释 + 滑杆（与派生组的「公式 + 可调项」同款结构） */
function paramBlock(d: RowDef & { desc?: string }, kind: Kind, unit: string): string {
  return `<div class="set-row col">
    <div class="row-t">${d.label}</div>
    ${d.desc ? `<div class="row-s">${d.desc}</div>` : ""}
    ${paramRow(d, kind, unit)}
  </div>`;
}

const metricsPane = `
<section class="set-pane" data-pane="metrics" hidden>
  <header class="set-head"><h1>尺寸</h1><p>间距 · 控件 · 字号 · 派生</p></header>
  ${(["间距", "控件", "字号"] as const)
    .map(
      (g) => `<div class="set-group">
        <div class="set-group-title">${g}</div>
        ${METRICS.filter((m) => m.group === g).map((m) => paramBlock(m, "metric", "px")).join("")}
      </div>`,
    )
    .join("")}
  <div class="set-group">
    <div class="set-group-title">派生</div>
    ${DERIVS.map((d) => {
      const t = defaultDerivTerms();
      return `<div class="set-row col">
        <div class="deriv-head">
          <div class="row-t">${d.label}</div>
          <div class="deriv-f" data-deriv-f="${d.key}">${d.formula(defaultMetrics(), t)}</div>
          <div class="deriv-v" data-deriv-val="${d.key}">${d.compute(defaultMetrics(), t)}px</div>
        </div>
        ${d.terms
          .map((tk) => {
            const t = DERIV_TERMS.find((x) => x.key === tk)!;
            return paramRow(t, "term", "", { termLabel: t.label });
          })
          .join("")}
      </div>`;
    }).join("")}
  </div>
</section>`;

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
      <div><div class="row-t">壁纸</div><div class="row-s">每组随主题换明暗</div></div>
      <div class="wp-opts">
        <button type="button" class="wp-opt" data-wallpaper="emblem" aria-pressed="true">
          <i class="wp-thumb"></i><span class="wp-name">徽记</span>
        </button>
        <button type="button" class="wp-opt" data-wallpaper="glow">
          <i class="wp-thumb"></i><span class="wp-name">流光</span>
        </button>
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
    <div class="set-group-title">通知</div>
    <div class="set-row">
      <div><div class="row-t">发送测试通知</div><div class="row-s">横幅从屏幕顶部滑入，存入通知栏</div></div>
      <button type="button" class="btn-call" data-push-notice>增加</button>
    </div>
  </div>
  <div class="set-group">
    <div class="set-group-title">动画</div>
    <div class="set-row col">
      <div class="row-t">全局 / 窗口 / 切换 / 菜单</div>
      ${ANIMS.map((a) => paramRow(a, "anim", "ms")).join("")}
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
<section class="set-pane" data-pane="battery" hidden>
  <header class="set-head"><h1>电池</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">这台设备</div><div class="row-s">预计 5 小时</div></div><div class="st-big">72%</div></div>
    <div class="set-row"><div><div class="row-t">低电量模式</div><div class="row-s">降低亮度与后台活动</div></div><button type="button" class="quick-toggle" data-quick="dnd"></button></div>
  </div>
</section>
<section class="set-pane" data-pane="usage" hidden>
  <header class="set-head"><h1>使用时间</h1><p>今天 · 截到现在</p></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">屏幕使用时间</div></div><div class="st-big">5 小时</div></div>
    <div class="set-row"><div><div class="row-t">社交</div><div class="row-s">2 小时 10 分</div></div></div>
    <div class="set-row"><div><div class="row-t">学习</div><div class="row-s">1 小时 30 分</div></div></div>
    <div class="set-row"><div><div class="row-t">其他</div><div class="row-s">1 小时 32 分</div></div></div>
  </div>
</section>
<section class="set-pane" data-pane="sound" hidden>
  <header class="set-head"><h1>声音</h1></header>
  <div class="set-group">
    <div class="set-row col"><div class="row-t">输出音量</div>
      <div class="slider-row">
        <div class="slider-field"><input class="slider" type="range" min="0" max="100" value="62" /></div>
        <span class="slider-val">62%</span>
      </div>
    </div>
  </div>
</section>
<section class="set-pane" data-pane="display" hidden>
  <header class="set-head"><h1>显示</h1></header>
  <div class="set-group">
    <div class="set-row col"><div class="row-t">亮度</div>
      <div class="slider-row">
        <div class="slider-field"><input class="slider" type="range" min="0" max="100" value="78" /></div>
        <span class="slider-val">78%</span>
      </div>
    </div>
  </div>
</section>`;

/** 设为默认：把当前值写回 src/state.ts 对应参数的 def（dev 服务端点） */
async function saveDefault(key: string, value: number, btn: HTMLElement): Promise<void> {
  try {
    const res = await fetch("/api/save-def", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const d = findParam(key);
    const input = $<HTMLInputElement>(
      `[data-metric="${key}"],[data-anim="${key}"],[data-term="${key}"]`,
    );
    const flag = input?.closest(".slider-field")?.querySelector<HTMLElement>(".def-flag");
    if (d && flag) {
      const p = (value - d.min) / (d.max - d.min);
      flag.style.setProperty("--p", p.toFixed(3));
      flag.title = `默认 ${value}${d.unit}`;
    }
    btn.classList.remove("failed");
    btn.classList.add("saved");
  } catch {
    btn.classList.remove("saved");
    btn.classList.add("failed");
  }
  window.setTimeout(() => btn.classList.remove("saved", "failed"), 1200);
}

export const settingsApp: AppDef = {
  id: "settings",
  title: "设置",
  icon: "gear",
  pinned: true,
  geom: { left: 6.50391, top: 4.45312, width: 60.5127, height: 66.8338 },
  minSize: { w: 360, h: 260 },
  z: 22,
  open: true,
  focused: true,
  nav: [
    { section: "home", icon: "home", label: "主页" },
    { section: "network", icon: "net", label: "网络" },
    { section: "battery", icon: "bolt", label: "电池" },
    { section: "usage", icon: "clock", label: "使用时间" },
    { section: "sound", icon: "sound", label: "声音" },
    { section: "display", icon: "display", label: "显示" },
    { section: "metrics", icon: "grid", label: "尺寸" },
  ],
  content: content + metricsPane,
  searchPlaceholder: "在设置中搜索…",
  editItems: ["撤销", "重做", "剪切", "拷贝"],
  bind(root, store: Store, actions: AppActions) {
    // 主题
    $$("button[data-theme]", root).forEach((b) => {
      on(b, "click", () => {
        const m = b.getAttribute("data-theme") as "light" | "dark";
        store.update((s) => (s.settings.theme = m));
      });
    });
    // 壁纸
    $$("[data-wallpaper]", root).forEach((b) => {
      on(b, "click", () => {
        const m = b.getAttribute("data-wallpaper") as "emblem" | "glow";
        store.update((s) => (s.settings.wallpaper = m));
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
    // 动画时长（全局 = 同时设置四个）
    $$("[data-anim]", root).forEach((el) => {
      on(el, "input", () => {
        const key = el.getAttribute("data-anim") as AnimKey;
        const v = Number((el as HTMLInputElement).value);
        store.update((s) => {
          s.settings[key] = v;
          if (key === "animGlobal") {
            s.settings.animWindow = v;
            s.settings.animPane = v;
            s.settings.animMenu = v;
          }
        });
      });
    });
    // 通知：经 AppActions.notify 请系统发送
    let ni = 0;
    const notices = [
      ["屏幕使用时间", "你今天的屏幕时间比昨天少 32 分钟。"],
      ["低电量", "电量低于 20%，已切换低电量模式。"],
      ["投屏", "客厅电视已开始镜像你的屏幕。"],
    ];
    $$("[data-push-notice]", root).forEach((b) => {
      on(b, "click", () => {
        const [t, body] = notices[ni++ % notices.length];
        actions.notify(t, body);
      });
    });
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
    // 几何度量 → CSS 令牌
    $$("[data-metric]", root).forEach((el) => {
      on(el, "input", () => {
        const key = el.getAttribute("data-metric") as MetricKey;
        const v = Number((el as HTMLInputElement).value);
        store.update((s) => {
          s.settings.metrics = { ...s.settings.metrics, [key]: v };
        });
      });
    });
    // 派生公式的可调项（倍率/偏移/补偿）
    $$("[data-term]", root).forEach((el) => {
      on(el, "input", () => {
        const key = el.getAttribute("data-term")!;
        const v = Number((el as HTMLInputElement).value);
        store.update((s) => {
          s.settings.derivTerms = { ...s.settings.derivTerms, [key]: v };
        });
      });
    });
    // 设为默认：写回源文件
    $$("[data-save]", root).forEach((btn) => {
      on(btn, "click", () => {
        const key = btn.getAttribute("data-save")!;
        const input = $<HTMLInputElement>(
          `[data-metric="${key}"],[data-anim="${key}"],[data-term="${key}"]`,
          root,
        );
        if (input) void saveDefault(key, Number(input.value), btn);
      });
    });
  },
};
