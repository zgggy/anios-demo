/** 启动台（全局搜索器）：本身是窗口，视口居中，导航四项 */
import type { AppDef } from "./index";

const content = `
<section class="set-pane" data-pane="apps">
  <header class="set-head"><h1>启动台</h1><p>应用 · 文件 · 链接 · 操作</p></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">设置</div><div class="row-s">系统与个性化</div></div></div>
    <div class="set-row"><div><div class="row-t">电话</div><div class="row-s">拨号与联系人</div></div></div>
  </div>
</section>
<section class="set-pane" data-pane="files" hidden>
  <header class="set-head"><h1>文件</h1></header>
  <div class="set-group"><div class="set-row"><div class="row-t">最近文件</div></div></div>
</section>
<section class="set-pane" data-pane="links" hidden>
  <header class="set-head"><h1>链接</h1></header>
  <div class="set-group"><div class="set-row"><div class="row-t">最近链接</div></div></div>
</section>
<section class="set-pane" data-pane="acts" hidden>
  <header class="set-head"><h1>操作</h1></header>
  <div class="set-group"><div class="set-row"><div class="row-t">快捷操作</div></div></div>
</section>`;

export const launcherApp: AppDef = {
  id: "launcher",
  title: "启动台",
  icon: "grid",
  geom: { left: 22, top: 16, width: 56, height: 58 },
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
};
