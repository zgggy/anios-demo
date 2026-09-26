/** 文件应用：最近 + 下载 */
import type { AppDef } from "./index";

const content = `
<section class="set-pane" data-pane="recent">
  <header class="set-head"><h1>最近</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">需求文档.md</div><div class="row-s">今天 14:20 · 文稿</div></div></div>
    <div class="set-row"><div><div class="row-t">截图 2026-09-26.png</div><div class="row-s">今天 11:05 · 图片</div></div></div>
    <div class="set-row"><div><div class="row-t">设计稿.fig</div><div class="row-s">昨天 · 设计</div></div></div>
    <div class="set-row"><div><div class="row-t">周报.docx</div><div class="row-s">9月24日 · 文稿</div></div></div>
  </div>
</section>
<section class="set-pane" data-pane="downloads" hidden>
  <header class="set-head"><h1>下载</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">anios-1.0.zip</div><div class="row-s">昨天 · 4.2 MB</div></div></div>
    <div class="set-row"><div><div class="row-t">wallpaper-pack.zip</div><div class="row-s">9月20日 · 18 MB</div></div></div>
  </div>
</section>`;

export const filesApp: AppDef = {
  id: "files",
  title: "文件",
  blurb: "最近与下载",
  icon: "file",
  geom: { left: 40, top: 16, width: 36, height: 52 },
  z: 20,
  open: false,
  pinned: false,
  nav: [
    { section: "recent", icon: "file", label: "最近" },
    { section: "downloads", icon: "bolt", label: "下载" },
  ],
  content,
  searchPlaceholder: "搜索文件…",
  editItems: ["全选", "清除最近"],
};
