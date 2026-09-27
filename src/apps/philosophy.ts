/** 设计理念：这个 Demo 的主张与其在自身中的对应物（文案即内容，随时可改） */
import type { AppDef } from "./index";

const content = `
<section class="set-pane" data-pane="creed">
  <header class="set-head"><h1>设计理念</h1><p>六条主张</p></header>
  <div class="creed">
    <div class="creed-item">
      <div class="creed-n">一</div>
      <div>
        <div class="creed-t">系统拥有表现，应用只拥有内容</div>
        <div class="creed-d">窗口的真实本体是内容区。控制栏、导航、救援件，都是系统绘制的家具——随窗移动，但不属于窗。</div>
      </div>
    </div>
    <div class="creed-item">
      <div class="creed-n">二</div>
      <div>
        <div class="creed-t">几何先于像素</div>
        <div class="creed-d">屏幕是一块可裁切的视口，窗口用百分比安家。间距、尺寸、字号全部是运行时参数；派生只保留几何必然，数值巧合一律拆开。</div>
      </div>
    </div>
    <div class="creed-item">
      <div class="creed-n">三</div>
      <div>
        <div class="creed-t">形态是模式，不是移植</div>
        <div class="creed-d">桌面多窗、移动单应用、触控只放大命中——同一个模型的三种投影，而不是三套界面。</div>
      </div>
    </div>
    <div class="creed-item">
      <div class="creed-n">四</div>
      <div>
        <div class="creed-t">状态即真相</div>
        <div class="creed-d">收起、后台、前台、关闭，是四种被系统承认的状态，各自有看得见的样子。动画只是状态之间的插值，不是装饰。</div>
      </div>
    </div>
    <div class="creed-item">
      <div class="creed-n">五</div>
      <div>
        <div class="creed-t">系统永远在场</div>
        <div class="creed-d">状态栏与 App 栏不属于任何窗口，层级最高、永不夺焦。唯一被允许盖过它们的，是沉浸窗口。</div>
      </div>
    </div>
    <div class="creed-item">
      <div class="creed-n">六</div>
      <div>
        <div class="creed-t">打扰必须声明姿态</div>
        <div class="creed-d">模态用遮罩圈住注意力，通知不夺焦点外即走，命令属于它的对象。系统如何打断你，就是系统如何看待你。</div>
      </div>
    </div>
  </div>
</section>
<section class="set-pane" data-pane="demo" hidden>
  <header class="set-head"><h1>在本 Demo 中</h1><p>每条主张的对应物</p></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">窗口类型样例</div><div class="row-s">模态、轻取消、无底板、沉浸 → 启动台 · 操作</div></div></div>
    <div class="set-row"><div><div class="row-t">四态 App 栏</div><div class="row-s">收起飞向图标 · 后台圆点 · 关闭隐去</div></div></div>
    <div class="set-row"><div><div class="row-t">几何参数面板</div><div class="row-s">设置 → 尺寸：每个滑块都是一条可调的主张</div></div></div>
    <div class="set-row"><div><div class="row-t">真全屏</div><div class="row-s">视口 · 全屏：屏幕即系统</div></div></div>
    <div class="set-row"><div><div class="row-t">三档形态</div><div class="row-s">视口 · 紧凑 / 大型（移动断点换模型）</div></div></div>
  </div>
</section>`;

export const philosophyApp: AppDef = {
  id: "philosophy",
  title: "设计理念",
  icon: "star",
  geom: { left: 26, top: 14, width: 46, height: 64 },
  minSize: { w: 340, h: 280 },
  z: 20,
  open: false,
  pinned: false,
  nav: [
    { section: "creed", icon: "star", label: "主张" },
    { section: "demo", icon: "apps", label: "在本 Demo" },
  ],
  content,
  searchPlaceholder: "搜索设计理念…",
};
