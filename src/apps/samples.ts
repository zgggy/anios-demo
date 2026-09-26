/**
 * 窗口类型学样例：每个样例是一种窗口类型的「可感道具」——
 * 表达行为契约（模态/轻取消/无底板/覆盖系统栏），不做支撑管线。
 * 由启动台「操作」页唤起（listed: false，不进应用网格）。
 */
import { $$, on } from "../dom";
import type { AppActions, AppDef } from "./index";

/** 对话框：模态（遮罩 + 焦点陷阱 + Esc），系统给定契约 */
export const samplePerm: AppDef = {
  id: "perm",
  title: "位置权限",
  icon: "net",
  winType: "dialog",
  listed: false,
  geom: { left: 30, top: 32, width: 40, height: 32 },
  z: 150,
  open: false,
  nav: [],
  content: `
    <div class="dlg">
      <div class="dlg-title">允许「时钟」使用你的位置？</div>
      <div class="dlg-desc">用于显示本地时间与时区。可随时在设置中关闭。</div>
      <div class="dlg-actions">
        <button type="button" class="btn-quiet" data-act="deny">不允许</button>
        <button type="button" class="btn-call" data-act="allow">允许</button>
      </div>
    </div>`,
  searchPlaceholder: "",
  bind(root, _store, actions: AppActions) {
    $$("[data-act]", root).forEach((b) => {
      on(b, "click", () => actions.closeApp("perm"));
    });
  },
};

/** 通知横幅：轻取消 + 不夺焦 + 自动退场 */
export const sampleNote: AppDef = {
  id: "notify",
  title: "屏幕使用时间",
  icon: "clock",
  winType: "transient",
  listed: false,
  geom: { left: 30, top: 6, width: 40, height: 14 },
  z: 60,
  open: false,
  nav: [],
  content: `
    <div class="note">
      <div class="row-t">屏幕使用时间</div>
      <div class="row-s">你今天的屏幕时间比昨天少 32 分钟。轻触或点外部关闭。</div>
    </div>`,
  searchPlaceholder: "",
  bind(root, _store, actions: AppActions) {
    on(root, "click", () => actions.closeApp("notify"));
  },
};

/** 悬浮控制：无背景窗口——透明处不拦截、任意处可拖动 */
export const sampleHud: AppDef = {
  id: "hud",
  title: "媒体控制",
  icon: "sound",
  winType: "chromeless",
  listed: false,
  geom: { left: 36, top: 72, width: 28, height: 10 },
  z: 60,
  open: false,
  nav: [],
  content: `
    <div class="hud">
      <button type="button" class="hud-btn" aria-label="播放">▶</button>
      <div><div class="row-t">耳机 · 夜航星</div><div class="row-s">3:42 · 可在任意处拖动</div></div>
    </div>`,
  searchPlaceholder: "",
};

/** 沉浸放映：全屏——唯一被允许盖过系统栏的窗口类型 */
export const sampleCast: AppDef = {
  id: "cast",
  title: "演示放映",
  icon: "display",
  winType: "immersive",
  listed: false,
  geom: { left: 0, top: 0, width: 100, height: 100 },
  z: 200,
  open: false,
  nav: [],
  content: `
    <div class="cast">
      <div class="cast-title">演示放映</div>
      <div class="cast-sub">沉浸窗口覆盖系统栏 —— 唯一被允许这样做的窗口类型</div>
      <button type="button" class="btn-call" data-act="exit">退出沉浸</button>
    </div>`,
  searchPlaceholder: "",
  bind(root, _store, actions: AppActions) {
    $$("[data-act]", root).forEach((b) => {
      on(b, "click", () => actions.closeApp("cast"));
    });
  },
};
