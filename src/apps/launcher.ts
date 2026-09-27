/** 启动台（全局搜索器）：应用页 = 注册表真实应用网格，点击打开对应窗口 */
import { $$, on } from "../dom";
import { icon } from "../render";
import type { AppActions, AppDef } from "./index";

export function makeLauncherApp(apps: AppDef[]): AppDef {
  const content = `
<section class="set-pane" data-pane="apps">
  <header class="set-head"><h1>启动台</h1><p>应用 · 文件 · 链接 · 操作</p></header>
  <div class="set-group">
    ${apps
      .filter((a) => a.listed !== false)
      .map(
        (a) => `<button type="button" class="set-row app-row" data-launch="${a.id}">
          <span class="a-ic">${icon(a.icon)}</span>
          <div><div class="row-t">${a.title}</div><div class="row-s">${a.blurb ?? ""}</div></div>
        </button>`,
      )
      .join("")}
  </div>
</section>
<section class="set-pane" data-pane="files" hidden>
  <header class="set-head"><h1>文件</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">最近文件</div><div class="row-s">需求文档.md · 截图.png</div></div></div>
    <div class="set-row"><div><div class="row-t">下载</div><div class="row-s">anios-1.0.zip</div></div></div>
  </div>
</section>
<section class="set-pane" data-pane="links" hidden>
  <header class="set-head"><h1>链接</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">最近链接</div><div class="row-s">anios 设计规范</div></div></div>
    <div class="set-row"><div><div class="row-t">收藏</div><div class="row-s">GSAP 文档</div></div></div>
  </div>
</section>
<section class="set-pane" data-pane="acts" hidden>
  <header class="set-head"><h1>操作</h1><p>窗口类型学 · 每行是一种行为契约</p></header>
  <div class="set-group">
    <button type="button" class="set-row app-row" data-launch="perm">
      <span class="a-ic">${icon("net")}</span>
      <div><div class="row-t">位置权限</div><div class="row-s">对话框 · 模态（遮罩/焦点陷阱/Esc）</div></div>
    </button>
    <button type="button" class="set-row app-row" data-launch="notify">
      <span class="a-ic">${icon("clock")}</span>
      <div><div class="row-t">屏幕使用时间</div><div class="row-s">通知横幅 · 轻取消/不夺焦/自动退场</div></div>
    </button>
    <button type="button" class="set-row app-row" data-launch="hud">
      <span class="a-ic">${icon("sound")}</span>
      <div><div class="row-t">媒体控制</div><div class="row-s">悬浮控制 · 无底板/任意处拖动</div></div>
    </button>
    <button type="button" class="set-row app-row" data-launch="cast">
      <span class="a-ic">${icon("display")}</span>
      <div><div class="row-t">演示放映</div><div class="row-s">沉浸窗口 · 唯一覆盖系统栏</div></div>
    </button>
  </div>
</section>`;

  return {
    id: "launcher",
    title: "启动台",
    blurb: "应用 · 文件 · 链接 · 操作",
    icon: "grid",
    geom: { left: 22, top: 16, width: 56, height: 58 },
  minSize: { w: 380, h: 280 },
    z: 20,
    open: false,
    nav: [
      { section: "apps", icon: "apps", label: "应用" },
      { section: "files", icon: "file", label: "文件" },
      { section: "links", icon: "link", label: "链接" },
      { section: "acts", icon: "bolt", label: "操作" },
    ],
    content,
    searchPlaceholder: "搜索应用、文件、链接、操作…",
    searchOpen: true,
    bind(root, _store, actions: AppActions) {
      // 应用页：点击真实应用 → 打开其窗口并收起启动台（启动台行为）
      $$("[data-launch]", root).forEach((el) => {
        on(el, "click", () => {
          const appId = el.getAttribute("data-launch")!;
          actions.openApp(appId);
          actions.minimizeApp("launcher");
        });
      });
    },
  };
}
