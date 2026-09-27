/**
 * 应用注册表：系统给控件与模式，应用只填内容。
 * 新增应用 = 加一个 AppDef（内容 + 可选 bind），chrome 由 render.windowShell 统一生成。
 */
import type { Geom, Store, WinType } from "../state";
import { policyOf } from "../state";
import type { IconName, NavItem } from "../render";
import { settingsApp } from "./settings";
import { phoneApp } from "./phone";
import { clockApp } from "./clock";
import { filesApp } from "./files";
import { browserApp } from "./browser";
import { philosophyApp } from "./philosophy";
import { samplePerm, sampleNote, sampleHud, sampleCast } from "./samples";
import { makeLauncherApp } from "./launcher";

/** 应用可调用的系统动作（按 appId，应用不接触窗口内部） */
export type AppActions = {
  openApp: (appId: string) => void;
  minimizeApp: (appId: string) => void;
  closeApp: (appId: string) => void;
  /** 请系统发一条通知（横幅 + 通知栏）；app = 点击横幅进入的应用 */
  notify: (title: string, body: string, app?: string) => void;
};

export type AppDef = {
  id: string; // data-app / App 栏 data-app-id
  title: string;
  icon: IconName;
  geom: Geom; // 初始浮动几何（% of viewport）
  /** 最小窗口尺寸（px）：切档/缩放视口时窗口不得小于此 */
  minSize: { w: number; h: number };
  z: number;
  open: boolean; // 初始是否打开
  focused?: boolean;
  /** 快速启动（用户固定）：App 栏常驻；未固定者仅在打开时出现在「已打开」区 */
  pinned?: boolean;
  /** 窗口类型（默认 normal）：决定 chrome/拖动/模态/层级等行为契约 */
  winType?: WinType;
  /** 是否出现在启动台应用网格（系统样例等为 false，由「操作」页唤起） */
  listed?: boolean;
  nav: NavItem[];
  /** 应用内容 = content-scroll 内部 HTML */
  content: string;
  searchPlaceholder: string;
  searchOpen?: boolean;
  editItems?: string[];
  /** 应用自带的内容行为（交互层：只 dispatch，不改 chrome） */
  bind?: (root: HTMLElement, store: Store, actions: AppActions) => void;
};

export function winIdOf(appId: string): string {
  return `win-${appId}`;
}

const baseApps: AppDef[] = [settingsApp, phoneApp, clockApp, filesApp, browserApp, philosophyApp];
export const samples: AppDef[] = [samplePerm, sampleNote, sampleHud, sampleCast];

export const APPS: AppDef[] = [...baseApps, ...samples, makeLauncherApp(baseApps)];

/** 应用的窗口行为契约（类型策略） */
export function appPolicy(app: AppDef) {
  return policyOf(app.winType);
}

export { settingsApp, phoneApp, clockApp, filesApp, browserApp, philosophyApp, samplePerm, sampleNote, sampleHud, sampleCast };
