/** 浏览器应用：浏览（标签页 + 地址栏）/ 书签 / 历史——内容区不重复顶栏功能 */
import { $$, on } from "../dom";
import { icon } from "../render";
import type { AppDef } from "./index";

const SITES: Record<string, string> = {
  "anios://start": "起始页",
  "anios://docs": "设计规范",
  "anios://news": "每日设计",
  "anios://about": "关于 anios",
};

const content = `
<section class="set-pane" data-pane="browse">
  <div class="br-tabs" data-br-tabs></div>
  <div class="br-toolbar">
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
</section>
<section class="set-pane" data-pane="bookmarks" hidden>
  <header class="set-head"><h1>书签</h1></header>
  <div class="set-group" data-br-bookmarks></div>
</section>
<section class="set-pane" data-pane="history" hidden>
  <header class="set-head"><h1>历史</h1></header>
  <div class="set-group" data-br-history></div>
</section>`;

export const browserApp: AppDef = {
  id: "browser",
  title: "浏览器",
  icon: "net",
  geom: { left: 18, top: 12, width: 54, height: 64 },
  minSize: { w: 420, h: 320 },
  z: 20,
  open: false,
  pinned: false,
  nav: [
    { section: "browse", icon: "net", label: "浏览" },
    { section: "bookmarks", icon: "star", label: "书签" },
    { section: "history", icon: "clock", label: "历史" },
  ],
  content,
  searchPlaceholder: "搜索或输入网址",
  bind(root) {
    type BrTab = { id: number; title: string; url: string };
    let tabs: BrTab[] = [{ id: 1, title: "起始页", url: "anios://start" }];
    let activeId = 1;
    let seq = 2;
    const history: Array<{ url: string; title: string }> = [];

    const addr = root.querySelector<HTMLInputElement>("[data-br-url]");
    const tabsEl = root.querySelector<HTMLElement>("[data-br-tabs]")!;
    const bookmarksEl = root.querySelector<HTMLElement>("[data-br-bookmarks]")!;
    const historyEl = root.querySelector<HTMLElement>("[data-br-history]")!;

    const titleOf = (url: string): string => SITES[url] ?? url;
    const show = (url: string) => {
      const page = url.replace("anios://", "") || "start";
      $$("[data-br-page]", root).forEach((p) => {
        (p as HTMLElement).hidden = (p as HTMLElement).dataset.brPage !== page;
      });
      const errUrl = root.querySelector("[data-br-err-url]");
      if (errUrl && page === "error") errUrl.textContent = url;
      if (addr) addr.value = url;
      const view = root.querySelector<HTMLElement>("[data-br-view]");
      if (view) view.scrollTop = 0;
    };
    const navigate = (url: string) => {
      const t = tabs.find((x) => x.id === activeId);
      if (t) {
        t.url = url;
        t.title = titleOf(url);
      }
      if (!history.some((h) => h.url === url)) history.unshift({ url, title: titleOf(url) });
      show(url);
      renderTabs();
    };

    const renderTabs = () => {
      tabsEl.innerHTML = tabs
        .map(
          (t) => `<div class="br-tab${t.id === activeId ? " on" : ""}" data-tab="${t.id}">
            <span class="br-tab-t">${t.title}</span>
            ${tabs.length > 1 ? `<button type="button" class="br-tab-x" data-tab-x="${t.id}" aria-label="关闭标签页">${icon("x")}</button>` : ""}
          </div>`,
        )
        .join("") + `<button type="button" class="br-add" data-tab-add aria-label="新建标签页">${icon("plus")}</button>`;
    };

    // 标签：切换 / 关闭 / 新增
    on(tabsEl, "click", (e) => {
      const t = e.target as Element;
      const x = t.closest("[data-tab-x]");
      if (x) {
        e.stopPropagation();
        const id = Number(x.getAttribute("data-tab-x"));
        if (tabs.length > 1) {
          tabs = tabs.filter((x2) => x2.id !== id);
          if (activeId === id) activeId = tabs[0].id;
          show(tabs.find((x2) => x2.id === activeId)!.url);
        }
        renderTabs();
        return;
      }
      const tab = t.closest("[data-tab]");
      if (tab) {
        activeId = Number(tab.getAttribute("data-tab"));
        show(tabs.find((x) => x.id === activeId)!.url);
        renderTabs();
        return;
      }
      if (t.closest("[data-tab-add]")) {
        tabs.push({ id: seq++, title: "起始页", url: "anios://start" });
        activeId = tabs[tabs.length - 1].id;
        show("anios://start");
        renderTabs();
      }
    });

    // 书签 / 历史列表
    const renderLists = () => {
      bookmarksEl.innerHTML = Object.entries(SITES)
        .filter(([url]) => url !== "anios://start")
        .map(
          ([url, title]) =>
            `<div class="set-row"><div><div class="row-t">${title}</div><div class="row-s">${url}</div></div></div>`,
        )
        .join("");
      historyEl.innerHTML = history.length
        ? history
            .map(
              (h) =>
                `<div class="set-row"><div><div class="row-t">${h.title}</div><div class="row-s">${h.url}</div></div></div>`,
            )
            .join("")
        : '<div class="set-empty">暂无历史</div>';
    };
    renderLists();

    // 收藏点击 → 前往
    $$("[data-go]", root).forEach((el) => {
      on(el, "click", () => navigate(el.getAttribute("data-go")!));
    });
    // 地址栏回车 → 导航（未知地址进错误页）
    on(addr, "keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") {
        const url = (addr as HTMLInputElement).value.trim() || "anios://start";
        navigate(SITES[url] ? url : url);
      }
    });
    // 历史页打开时刷新列表
    on(root.querySelector(".nav-btn[data-section='history']"), "click", () => {
      historyEl.innerHTML = history.length
        ? history
            .map(
              (h) =>
                `<div class="set-row"><div><div class="row-t">${h.title}</div><div class="row-s">${h.url}</div></div></div>`,
            )
            .join("")
        : '<div class="set-empty">暂无历史</div>';
    });
  },
};
