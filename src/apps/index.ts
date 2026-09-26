/**
 * 应用注册表：系统给控件与模式，应用只填内容。
 * 新增应用 = 加一个 AppDef（内容 + 可选 bind），chrome 由 render.windowShell 统一生成。
 */
import type { Geom } from "../state";
import type { IconName, NavItem } from "../render";
import type { Store } from "../state";
import { settingsApp } from "./settings";
import { phoneApp } from "./phone";
import { launcherApp } from "./launcher";

export type AppDef = {
  id: string; // data-app / App 栏 data-app-id
  title: string;
  icon: IconName;
  geom: Geom; // 初始浮动几何（% of viewport）
  z: number;
  open: boolean; // 初始是否打开
  focused?: boolean;
  nav: NavItem[];
  /** 应用内容 = content-scroll 内部 HTML */
  content: string;
  searchPlaceholder: string;
  searchOpen?: boolean;
  editItems?: string[];
  /** 应用自带的内容行为（交互层：只 dispatch，不改 chrome） */
  bind?: (root: HTMLElement, store: Store) => void;
};

export function winIdOf(appId: string): string {
  return `win-${appId}`;
}

export const APPS: AppDef[] = [settingsApp, phoneApp, launcherApp];

export { settingsApp, phoneApp, launcherApp };
