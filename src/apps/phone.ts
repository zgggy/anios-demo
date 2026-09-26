/** 电话应用：内容 + 拨号盘行为 */
import { $, on } from "../dom";
import type { AppDef } from "./index";

const content = `
<section class="set-pane" data-pane="dial">
  <header class="set-head"><h1>拨号</h1></header>
  <div class="dial-display" id="dialDisplay">输入号码</div>
  <div class="dial-pad" id="dialPad">
    <button type="button" class="dial-key"><b>1</b></button>
    <button type="button" class="dial-key"><b>2</b></button>
    <button type="button" class="dial-key"><b>3</b></button>
    <button type="button" class="dial-key"><b>4</b></button>
    <button type="button" class="dial-key"><b>5</b></button>
    <button type="button" class="dial-key"><b>6</b></button>
    <button type="button" class="dial-key"><b>7</b></button>
    <button type="button" class="dial-key"><b>8</b></button>
    <button type="button" class="dial-key"><b>9</b></button>
    <button type="button" class="dial-key"><b>*</b></button>
    <button type="button" class="dial-key"><b>0</b></button>
    <button type="button" class="dial-key"><b>#</b></button>
  </div>
  <div class="dial-actions">
    <button type="button" class="btn-quiet">+</button>
    <button type="button" class="btn-call">呼叫</button>
    <button type="button" class="btn-quiet" id="dialBack" aria-label="退格">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h10v12H9l-6-6z"/><path d="M13 10l4 4M17 10l-4 4"/></svg>
    </button>
  </div>
</section>
<section class="set-pane" data-pane="recent" hidden>
  <header class="set-head"><h1>最近</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">王小明</div><div class="row-s">呼出 · 12 分钟前</div></div></div>
    <div class="set-row"><div><div class="row-t">李工</div><div class="row-s">未接 · 1 小时前</div></div></div>
  </div>
</section>
<section class="set-pane" data-pane="contacts" hidden>
  <header class="set-head"><h1>联系人</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">王小明</div><div class="row-s">138 0013 8000</div></div></div>
    <div class="set-row"><div><div class="row-t">妈妈</div><div class="row-s">家庭</div></div></div>
  </div>
</section>
<section class="set-pane" data-pane="fav" hidden>
  <header class="set-head"><h1>收藏</h1></header>
  <div class="set-group">
    <div class="set-row"><div><div class="row-t">妈妈</div><div class="row-s">家庭</div></div></div>
  </div>
</section>`;

export const phoneApp: AppDef = {
  id: "phone",
  title: "电话",
  icon: "phone",
  geom: { left: 48, top: 18, width: 40, height: 58 },
  z: 21,
  open: true,
  nav: [
    { section: "dial", icon: "dial", label: "拨号" },
    { section: "recent", icon: "clock", label: "最近" },
    { section: "contacts", icon: "user", label: "联系人" },
    { section: "fav", icon: "star", label: "收藏" },
  ],
  content,
  searchPlaceholder: "搜索通话记录…",
  editItems: ["全选", "清除最近"],
  bind(root) {
    const disp = $<HTMLElement>("#dialDisplay", root);
    let num = "";
    on($("#dialPad", root), "click", (e) => {
      const k = (e.target as Element).closest(".dial-key")?.querySelector("b")?.textContent?.trim();
      if (k && num.length < 16) {
        num += k;
        if (disp) disp.textContent = num;
      }
    });
    on($("#dialBack", root), "click", () => {
      num = num.slice(0, -1);
      if (disp) disp.textContent = num || "输入号码";
    });
  },
};
