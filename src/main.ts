/**
 * boot：store（唯一数据源）→ 结构渲染 → 交互绑定 → 对齐。
 * 分层单向：interact 只 dispatch，render 补丁状态，anim 只读插值。
 */
import { $ } from "./dom";
import { createStore } from "./state";
import { initialState, initWindows } from "./windows";
import { initMenus } from "./menus";
import { initRecover } from "./recover";
import { initStatusBar, initAppBar, bindSettingsPatch } from "./systembar";
import { initHost } from "./host";
import { APPS } from "./apps";

function boot(): void {
  try {
    const store = createStore(initialState(APPS));
    bindSettingsPatch(store);
    const api = initWindows(store);
    initMenus(api);
    initRecover(store, api);
    initStatusBar(store);
    initAppBar(store, api);
    initHost(store, api);
    api.alignAll();
  } catch (err) {
    console.error("[anios] boot failed", err);
    const vp = $("#viewport");
    if (vp) {
      vp.insertAdjacentHTML(
        "beforeend",
        '<div class="content" style="inset:auto 16px 16px 16px;top:auto;padding:16px">启动失败，请查看控制台。</div>',
      );
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
