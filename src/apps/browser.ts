/** 浏览器应用：地址栏 + 起始页/内页导航（内置站点，点击收藏即前往） */
import { $$, on } from "../dom";
import { icon } from "../render";
import type { AppDef } from "./index";

const content = `
<div class="browser">
  <div class="br-toolbar">
    <button type="button" class="br-nav" data-br-back aria-label="后退">${icon("back")}</button>
    <div class="br-address">
      <span class="br-lock">${icon("file")}</span>
      <input type="text" data-br-url value="anios://start" spellcheck="false" />
    </div>
    <button type="button" class="br-nav" data-br-reload aria-label="重新加载">${icon("clock")}</button>
  </div>
  <div class="br-view" data-br-view>
    <section class="br-page" data-br-page="start">
      <div class="br-hero">
        <div class="br-logo">anios</div>
        <div class="br-tagline">设计系统的浏览器 · 从收藏开始</div>
      </div>
      <div class="br-fav-grid">
        <button type="button" class="br-fav" data-go="anios://docs">
          <span class="a-ic">${icon("file")}</span><span class="br-fav-name">设计规范</span>
        </button>
        <button type="button" class="br-fav" data-go="anios://news">
          <span class="a-ic">${icon("bolt")}</span><span class="br-fav-name">每日设计</span>
        </button>
        <button type="button" class="br-fav" data-go="anios://about">
          <span class="a-ic">${icon("star")}</span><span class="br-fav-name">关于 anios</span>
        </button>
        <button type="button" class="br-fav" data-go="anios://clock">
          <span class="a-ic">${icon("clock")}</span><span class="br-fav-name">时钟</span>
        </button>
      </div>
    </section>
    <section class="set-pane br-doc" data-br-page="docs" hidden>
      <header class="set-head"><h1>anios 设计规范</h1><p>几何 · 层级 · 状态 · 参数化</p></header>
      <div class="br-doc">
        <h2>几何先于像素</h2>
        <p>屏幕是一块可裁切的视口，窗口用百分比安家。间距、尺寸、字号全部是运行时参数；派生只保留几何必然，数值巧合一律拆开。</p>
        <h2>状态即真相</h2>
        <p>收起、后台、前台、关闭是四种被系统承认的状态，各自有看得见的样子。动画只是状态之间的插值，不是装饰。</p>
        <h2>打扰必须声明姿态</h2>
        <p>模态用遮罩圈住注意力，通知不夺焦点外即走，命令属于它的对象。</p>
      </div>
    </section>
    <section class="set-pane br-doc" data-br-page="news" hidden>
      <header class="set-head"><h1>每日设计 · 第 12 期</h1><p>窗口类型学：一种表面，一组关系</p></header>
      <div class="br-doc">
        <p>窗口不是一种东西。普通窗、对话框、临时窗、无背景窗、沉浸窗——每一类都是系统给定的一组行为契约：谁拥有焦点、能否拖动、如何退出、与系统栏是什么关系。</p>
        <p>类型由系统定义，内容由应用填写——这就是「应用只填内容」在窗口维度的形态。</p>
      </div>
    </section>
    <section class="set-pane br-doc" data-br-page="about" hidden>
      <header class="set-head"><h1>关于 anios</h1><p>版本 1.0</p></header>
      <div class="br-doc">
        <p>anios 是一个表达操作系统 UI/UX 设计理念的演示：系统提供控件与模式，应用只填内容。</p>
      </div>
    </section>
    <section class="set-pane" data-br-page="error" hidden>
      <div class="br-err">
        <div class="br-err-t">无法访问此网站</div>
        <div class="br-err-d" data-br-err-url></div>
        <button type="button" class="btn-call" data-br-home>返回起始页</button>
      </div>
    </section>
  </div>
</div>`;

export const browserApp: AppDef = {
  id: "browser",
  title: "浏览器",
  icon: "net",
  geom: { left: 18, top: 12, width: 54, height: 64 },
  minSize: { w: 420, h: 300 },
  z: 20,
  open: false,
  pinned: false,
  nav: [],
  content,
  searchPlaceholder: "搜索或输入网址",
  bind(root) {
    const addr = root.querySelector<HTMLInputElement>("[data-br-url]");
    const view = root.querySelector<HTMLElement>("[data-br-view]");
    const known = ["start", "docs", "news", "about"];
    const hist: string[] = ["anios://start"];
    let hi = 0;

    const show = (url: string) => {
      const page = url.replace("anios://", "") || "start";
      const knownPage = known.includes(page);
      $$("[data-br-page]", root).forEach((p) => {
        (p as HTMLElement).hidden = (p as HTMLElement).dataset.brPage !== (knownPage ? page : "error");
      });
      const errUrl = root.querySelector("[data-br-err-url]");
      if (errUrl && !knownPage) errUrl.textContent = url;
      if (addr) addr.value = url;
      if (view) view.scrollTop = 0;
    };
    const navigate = (url: string) => {
      hist.splice(hi + 1);
      hist.push(url);
      hi = hist.length - 1;
      show(url);
    };

    // 收藏与地址栏
    $$("[data-go]", root).forEach((el) => {
      on(el, "click", () => navigate(el.getAttribute("data-go")!));
    });
    on(addr, "keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") navigate((addr as HTMLInputElement).value.trim() || "anios://start");
    });
    // 工具栏
    on(root.querySelector("[data-br-back]"), "click", () => {
      if (hi > 0) {
        hi -= 1;
        show(hist[hi]);
      }
    });
    on(root.querySelector("[data-br-reload]"), "click", () => show(hist[hi]));

  },
};
