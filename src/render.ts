/**
 * 渲染层：纯函数构造器 + 属性补丁。
 * 复用 = 带类型参数导入（windowShell({...})），禁止复制粘贴标记；
 * chrome 的 DOM 结构只在本文件存在一次。
 */
import { $ } from "./dom";
import { policyOf, type Geom, type WinState, type WinType } from "./state";

/* ── 图标：24×24 viewBox、stroke-width 1.7、currentColor、圆头圆接 ── */

export const ICON = {
  back: '<path d="M14 6l-6 6 6 6"/>',
  fwd: '<path d="M10 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l3.5 3.5"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8z"/>',
  net: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16"/>',
  sound: '<path d="M9 18V7l10-2v11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
  display: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',
  dial: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  user: '<circle cx="12" cy="12" r="8"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none"/><path d="M9 14c1 1.2 2 1.8 3 1.8s2-.6 3-1.8"/>',
  star: '<path d="M12 4l2.2 4.5 5 .7-3.6 3.5.9 5L12 15.4 7.5 17.7l.9-5L4.8 9.2l5-.7z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18"/>',
  phone: '<path d="M7 4h4l1 5-2.5 1.5a12 12 0 0 0 5 5L16 13l5 1v4a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 2-2z"/>',
  grid: '<circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>',
  wifi: '<path d="M4 10c4-4 12-4 16 0"/><path d="M7 13c2.5-2.5 7.5-2.5 10 0"/><circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"/>',
  dots: '<circle cx="6" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>',
  link: '<path d="M8 8a3 3 0 1 0 0 6c2 0 2.5-1.5 4-3s2-3 4-3a3 3 0 1 1 0 6c-2 0-2.5-1.5-4-3s-2-3-4-3z"/>',
  bolt: '<path d="M13 3L6 14h5l-1 7 8-12h-5l0-6z"/>',
  apps: '<path d="M12 3l9 9-9 9-9-9z"/>',
  backspace: '<path d="M9 6h10v12H9l-6-6z"/><path d="M13 10l4 4M17 10l-4 4"/>',
  save: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 5v4h6V5"/><path d="M9 19v-5h6v5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.8 2.5H4.2z"/><path d="M10 21.5a2.4 2.4 0 0 0 4 0"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 4v4M15 4v4"/>',
  x: '<path d="M7 7l10 10M17 7L7 17"/>',
} as const;

export type IconName = keyof typeof ICON;

export function icon(name: IconName): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
}

/* ── 构造器 ── */

export type NavItem = { section: string; icon: IconName; label: string };

/** 拖动控件（收起 | 拖动 | 关闭）—— 顶栏与 recover 共用同一构造器 */
export function dragZoneHTML(attrs = ""): string {
  return `<div class="drag-zone" data-drag-zone ${attrs} title="拖动 · 双击最大化">
    <button type="button" class="icon-btn win-ctl win-min" data-win-min aria-label="收起"><i class="led led-min"></i></button>
    <button type="button" class="icon-btn grip-btn" data-grip aria-label="拖动"><span class="grip"><i></i><i></i></span></button>
    <button type="button" class="icon-btn win-ctl win-cls" data-win-cls aria-label="关闭"><i class="led led-close"></i></button>
  </div>`;
}

function navBtnsHTML(items: NavItem[]): string {
  return items
    .map(
      (it, i) =>
        `<button type="button" class="nav-btn${i === 0 ? " active" : ""}" data-section="${it.section}">${icon(it.icon)}<span class="nav-text">${it.label}</span></button>`,
    )
    .join("");
}

function topCapsuleHTML(): string {
  return `<div class="capsule top-capsule">
    <button type="button" class="icon-btn" aria-label="后退">${icon("back")}</button>
    <button type="button" class="icon-btn" aria-label="前进">${icon("fwd")}</button>
    <span class="drag-pad" aria-hidden="true"></span>
    ${dragZoneHTML()}
    <span class="drag-pad" aria-hidden="true"></span>
    <button type="button" class="icon-btn" data-search aria-label="搜索" aria-expanded="false">${icon("search")}</button>
    <button type="button" class="icon-btn" data-more aria-label="更多" aria-expanded="false">${icon("plus")}</button>
  </div>`;
}

function menuPanelHTML(opts: {
  title: string;
  editItems?: string[];
}): string {
  const edit = opts.editItems?.length
    ? `<button type="button" class="mp-expand-btn" data-expand="edit">编辑 <span>˅</span></button>
       <div class="mp-expand" data-expand-pane="edit">
         ${opts.editItems.map((t) => `<button type="button">${t}</button>`).join("")}
       </div>`
    : "";
  return `<div class="more-panel menu-panel" data-more-panel hidden>
    <button type="button" class="mp-info" data-act="about"><strong>${opts.title}</strong><span>anios 1.0</span></button>
    ${edit}
    <button type="button" class="mp-expand-btn" data-expand="win">窗口 <span>˅</span></button>
    <div class="mp-expand" data-expand-pane="win">
      <button type="button" data-act="min">最小化</button>
      <button type="button" data-act="max">缩放</button>
    </div>
    <hr />
    <button type="button" class="danger" data-act="quit">退出</button>
  </div>`;
}

export type WindowShellOpts = {
  id: string;
  app: string;
  title: string;
  geom: Geom;
  z: number;
  open: boolean;
  focused: boolean;
  nav: NavItem[];
  /** 应用只填 content（content-scroll 内部 HTML） */
  content: string;
  searchPlaceholder: string;
  searchOpen?: boolean;
  editItems?: string[];
  /** 窗口类型（默认 normal）：chrome 按类型策略裁剪 */
  winType?: WinType;
};

/** 窗口单元 = top-bar + nav-bar + content + 浮层 + recover；chrome 按窗口类型策略裁剪 */
export function windowShellHTML(o: WindowShellOpts): string {
  const g = o.geom;
  const p = policyOf(o.winType);
  return `<div class="window${o.focused ? " is-focused" : ""}" id="${o.id}" data-app="${o.app}" data-title="${o.title}" data-wintype="${o.winType ?? "normal"}" data-mode="floating" ${o.open ? "" : "hidden"} style="left:${g.left}%;top:${g.top}%;width:${g.width}%;height:${g.height}%;z-index:${o.z}">
    ${p.chrome.topbar ? `<div class="top-bar" data-topbar>
      ${topCapsuleHTML()}
    </div>` : ""}
    ${p.chrome.nav && o.nav.length ? `<div class="nav-bar" data-nav>
      <div class="capsule nav-capsule">${navBtnsHTML(o.nav)}</div>
    </div>` : ""}
    <div class="content">
      <div class="scroll-indicator" data-scroll-indicator data-mode="percent"><div class="scroll-thumb"></div></div>
      ${p.resize ? `<button type="button" class="resize-knob" data-resize aria-label="缩放"></button>` : ""}
      <div class="content-scroll">${o.content}</div>
    </div>
    ${p.chrome.topbar ? `<div class="search-panel" data-search-panel ${o.searchOpen ? "" : "hidden"}>
      <input class="search-input" placeholder="${o.searchPlaceholder}" />
    </div>
    ${menuPanelHTML({ title: o.title, editItems: o.editItems })}` : ""}
    ${p.chrome.recover ? `<div class="recover" data-recover hidden data-orient="h">
      ${dragZoneHTML("data-recover-zone")}
    </div>` : ""}
  </div>`;
}

/** 当月日历（格子）：时间面板与时钟应用共用 */
export function calendarHTML(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: string[] = ["日", "一", "二", "三", "四", "五", "六"].map(
    (w) => `<span class="cal-dow">${w}</span>`,
  );
  for (let i = 0; i < first; i++) cells.push('<span class="cal-day empty"></span>');
  for (let day = 1; day <= days; day++) {
    cells.push(`<span class="cal-day${day === d.getDate() ? " today" : ""}">${day}</span>`);
  }
  return `<div class="cal"><div class="cal-head">${y} 年 ${m + 1} 月</div><div class="cal-grid">${cells.join("")}</div></div>`;
}

/** 状态栏（左上）：胶囊 + 每钮一块临时面板 + 通知横幅 */
export function statusBarHTML(): string {
  return `<div class="sys-status" data-net="wifi">
    <div class="capsule nav-capsule status-capsule">
      <button type="button" class="nav-btn" data-battery data-status-open="battery" aria-label="电量" aria-expanded="false">
        <span class="bat">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle class="bat-track" cx="18" cy="18" r="14" />
            <circle class="bat-arc" cx="18" cy="18" r="14" />
          </svg>
          <span class="bat-pct">72</span>
        </span>
        <span class="nav-text">电量</span>
      </button>
      <button type="button" class="nav-btn" data-time-btn data-status-open="time" aria-label="时间" aria-expanded="false">
        <span class="st-time" data-time>12:00</span>
        <span class="nav-text">时间</span>
      </button>
      <button type="button" class="nav-btn" data-network data-status-open="network" aria-label="网络" aria-expanded="false">
        ${icon("wifi")}
        <span class="net-5g">5G<span class="net-bars"><i></i><i></i><i></i><i></i></span></span>
        <span class="nav-text">网络</span>
      </button>
      <button type="button" class="nav-btn" data-status-notify aria-label="通知" hidden>
        ${icon("bell")}
        <span class="nav-text">通知</span>
      </button>
      <button type="button" class="nav-btn" data-status-toggle data-status-open="more" aria-label="状态与快捷操作" aria-expanded="false">
        ${icon("dots")}
        <span class="nav-text">更多</span>
      </button>
    </div>
    <div class="content status-content" data-status-panel="battery" hidden>
      <div class="content-scroll">
        <header class="set-head"><h1>电量</h1><p>所有设备</p></header>
        <div class="set-group">
          <div class="set-row"><div><div class="row-t">这台设备</div><div class="row-s">预计 5 小时</div></div><div class="st-big">72%</div></div>
          <div class="set-row"><div><div class="row-t">耳机</div><div class="row-s">已连接</div></div><div class="st-big">84%</div></div>
          <div class="set-row"><div><div class="row-t">手表</div><div class="row-s">2 小时前同步</div></div><div class="st-big">40%</div></div>
        </div>
        <div class="set-group">
          <div class="set-group-title">设备使用时间</div>
          <div class="set-row"><div><div class="row-t">今天</div><div class="row-s">截至现在</div></div><div class="st-big">5 小时</div></div>
        </div>
      </div>
      <div class="panel-foot">
        <button type="button" class="panel-jump" data-jump="settings:battery">设置 · 电池</button>
        <button type="button" class="panel-jump" data-jump="settings:usage">设置 · 使用时间</button>
      </div>
    </div>
    <div class="content status-content" data-status-panel="time" hidden>
      <div class="content-scroll">
        <header class="set-head"><h1>时间</h1></header>
        <div class="dial-display" data-panel-clock>00:00</div>
        ${calendarHTML()}
      </div>
      <div class="panel-foot">
        <button type="button" class="panel-jump" data-jump="clock:alarm">时钟 · 时间</button>
        <button type="button" class="panel-jump" data-jump="clock:calendar">时钟 · 日历</button>
      </div>
    </div>
    <div class="content status-content" data-status-panel="network" hidden>
      <div class="content-scroll">
        <header class="set-head"><h1>网络</h1></header>
        <div class="set-group">
          <div class="set-row"><div class="row-t">网络类型</div>
            <div class="seg small">
              <button type="button" data-quick="wifi" aria-pressed="true">Wi-Fi</button>
              <button type="button" data-quick="cell">5G</button>
            </div>
          </div>
          <div class="set-row"><div><div class="row-t">Studio-5G</div><div class="row-s">已连接</div></div></div>
          <div class="set-row"><div><div class="row-t">Guest</div><div class="row-s">需要密码</div></div></div>
        </div>
      </div>
      <div class="panel-foot">
        <button type="button" class="panel-jump" data-jump="settings:network">设置 · 网络</button>
      </div>
    </div>
    <div class="content status-content" data-status-panel="more" hidden>
      <div class="content-scroll">
        <header class="set-head"><h1>设备状态</h1><p>状态与快捷操作</p></header>
        <div class="set-group">
          <div class="set-row">
            <div><div class="row-t">电量</div><div class="row-s">72% · 预计 5 小时</div></div>
            <div class="st-big">72%</div>
          </div>
          <div class="set-row">
            <div><div class="row-t">时间</div><div class="row-s" data-time-full>今日</div></div>
            <div class="st-big" data-time>12:00</div>
          </div>
          <div class="set-row">
            <div><div class="row-t">网络</div><div class="row-s">当前连接</div></div>
            <div class="seg small">
              <button type="button" data-net-mode="wifi" data-quick="wifi" aria-pressed="true">Wi-Fi</button>
              <button type="button" data-net-mode="cell" data-quick="cell">5G</button>
            </div>
          </div>
        </div>
        <div class="set-group">
          <div class="set-group-title">快捷操作</div>
          <div class="set-row">
            <div class="row-t">主题</div>
            <div class="seg small">
              <button type="button" data-theme="light" data-quick="theme-light" aria-pressed="true">浅</button>
              <button type="button" data-theme="dark" data-quick="theme-dark">深</button>
            </div>
          </div>
          <div class="set-row">
            <div><div class="row-t">勿扰</div><div class="row-s">静音通知</div></div>
            <button type="button" class="quick-toggle" data-quick="dnd"></button>
          </div>
          <div class="set-row">
            <div><div class="row-t">蓝牙</div><div class="row-s">附近设备</div></div>
            <button type="button" class="quick-toggle" data-quick="bt"></button>
          </div>
          <div class="set-row col">
            <div class="row-t">音量</div>
            <div class="slider-row"><input class="slider" type="range" min="0" max="100" value="62" /><span class="slider-val">62%</span></div>
          </div>
          <div class="set-row col">
            <div class="row-t">亮度</div>
            <div class="slider-row"><input class="slider" type="range" min="0" max="100" value="78" /><span class="slider-val">78%</span></div>
          </div>
        </div>
      </div>
    </div>
    <div class="notice-stack" data-notice-stack>
      <div class="notice-actions" data-notice-actions hidden>
        <button type="button" class="notice-act" data-notice-clear-all>一键清除</button>
        <button type="button" class="notice-act" data-notice-collapse-all>全部收起</button>
      </div>
    </div>
  </div>`;
}

/** App 栏（左下）：DOM 顺序 = 视觉自上而下，启动台永远最后（最下） */
export type AppBarItem = { appId: string; icon: IconName; label: string };

export function appBarHTML(items: AppBarItem[]): string {
  return `<div class="sys-appbar">
    <div class="capsule nav-capsule app-capsule">
      <div class="app-stack">
        ${items
          .map(
            (it) =>
              `<button type="button" class="nav-btn app-item" data-app-id="${it.appId}" aria-label="${it.label}">${icon(it.icon)}<span class="nav-text">${it.label}</span><i class="app-ind"></i></button>`,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

/* ── 属性补丁：把 WinState 落到 DOM（结构渲染低频、属性补丁高频） ── */

/** 布局中心（offsetParent 坐标，不含 transform —— 动画中禁止 getBoundingClientRect 写变量） */
export function layoutCenter(el: HTMLElement): { cx: number; cy: number } {
  return {
    cx: el.offsetLeft + el.offsetWidth / 2,
    cy: el.offsetTop + el.offsetHeight / 2,
  };
}

/**
 * 派生布局补丁：控制栏中心 = 内容中心 X，导航中心 = 内容中心 Y。
 * 变量写在窗口上（top-bar/nav-bar/浮层继承同一锚点）。
 * 不变量：凡几何/模式从状态写入，同一任务内必须刷新本变量——
 * 否则以 --content-cx/cy 为基点的 FLIP 会把陈旧位置当终点，动画结束一刷新就跳。
 */
export function align(win: HTMLElement): void {
  const content = $<HTMLElement>(".content", win);
  if (!content) return;
  const { cx, cy } = layoutCenter(content);
  win.style.setProperty("--content-cx", `${cx}px`);
  win.style.setProperty("--content-cy", `${cy}px`);
}

/**
 * 开合可见性由 anim 的生命周期补间负责（收起/打开/关闭是「先过渡、结束 commit」），
 * 这里只补丁语义属性：焦点、模式、几何、层级；并同步派生对齐。
 */
export function patchWinEl(el: HTMLElement, ws: WinState): void {
  el.classList.toggle("is-focused", ws.focused);
  el.setAttribute("data-mode", ws.mode);
  el.style.zIndex = String(ws.z);
  // 几何写入须抑制 CSS transition：写入 → 强制回流 → 恢复
  const t = el.style.transition;
  el.style.transition = "none";
  el.style.left = `${ws.geom.left}%`;
  el.style.top = `${ws.geom.top}%`;
  el.style.width = `${ws.geom.width}%`;
  el.style.height = `${ws.geom.height}%`;
  void el.offsetHeight;
  el.style.transition = t;
  align(el);
}
