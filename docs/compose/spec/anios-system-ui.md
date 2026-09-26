---
feature: anios-system-ui
status: delivered
updated: 2026-09-26
branch: main
commits: see git history
---

# anios System UI

## Report

**What was built** — anios system UI shell per REQUIREMENTS.md: viewport host, app windows (设置 / 电话 / 启动台) with control bar + navbar + recover, maximize/restore, + menu, status bar (3-state), App bar (launch/pinned/open), settings panes, phone dial, scroll indicator, theme/animation controls, mobile breakpoint layout.

**Verification** — `npm run build` PASS（tsc strict + esbuild + 单文件产物）；浏览器交互冒烟：拖动/缩放/最大化还原/收起打开/菜单/状态栏/App 栏/recover/宿主工具。

## Decisions（与早期计划的偏差，以此为准）

1. **不使用 Lit**。系统 UI 的难点是全局几何契约（同心圆、唯一磨砂、仅焦点 chrome），需要全局 CSS；light-DOM Lit 等于放弃封装只剩模板。chrome 由**纯函数构造器**生成（传参复用，禁止复制粘贴标记）。组件运行时留给将来的第三方**应用内容**，系统 chrome 不用。
2. **动画原语两种，禁止 scale 压内容**：
   - 内容区（随盒子重排）：**真实矩形补间**（left/top/width/height + 圆角 + 滚动内边距）；
   - 壳（固定尺寸胶囊）：**位移 FLIP**（first/last rect，translate-only）。
   - 教训：scale FLIP 会让内部排版瞬间跳成终态再被视觉拉回（内容先「变成放大后的样子」再随盒子恢复正常）。
3. **四层架构（单向数据流）**：state（纯 TS 唯一数据源）→ render（构造器 + 属性补丁）→ interact（只 dispatch；手势快速路径例外，拖动中直写 DOM、结束 commit）→ anim（只读插值，不写语义状态）。
4. **对齐变量必须跟随尺寸变化**：`--content-cx/cy` 是像素值而窗口几何是百分比，任何 resize（浏览器窗口、滚动条、预设）都要重对齐（ResizeObserver + resize/load），否则栏与内容失准直到下次点击。

## Structure

```text
index.template.html   宿主页脚手架（host-tools + viewport 壳）
styles.css            令牌 + 布局 + 应用内容样式（全局，唯一磨砂/同心圆）
src/
  state.ts            类型 + store（唯一数据源：窗口几何/焦点/模式/开合、设置）
  render.ts           纯函数构造器（icon/dragZone/topCapsule/navBar/windowShell/
                      statusBar/appBar…）+ 属性补丁（isOpen 等判定单一来源）
  anim.ts             align 对齐、壳位移 FLIP、内容矩形补间、收起/打开/关闭补间
  apps/
    index.ts          应用注册表 AppDef { id, title, icon, nav, menu, content, geom }
    settings.ts       设置内容（应用只填 content）
    phone.ts          电话内容
    launcher.ts       启动台内容
  windows.ts          窗口交互：焦点/拖动/缩放/最大化（手势快速路径 + dispatch）
  menus.ts            + 菜单 / 搜索面板（二级原地展开）
  recover.ts          临时拖动（38px 阈值、贴边 5px、左右 rotate90°）
  systembar.ts        状态栏三态 + App 栏（订阅 store，不用 MutationObserver）
  host.ts             视口宿主工具 + 临时面板 + 设置控件绑定
  dom.ts              $ / on / clamp / durMs
  main.ts             boot：store → 渲染 → 绑定
```

**Contracts (enforced):**

- Content rect is the window; control bar center = content centerX; navbar centerY = content centerY.
- Gaps 5px chrome↔content; insets 5px system bars (= same gap, maximized nav too); concentric `margin=(edge−btn)/2−1px`.
- Recover: show if drag chrome off-screen and edge distance &lt; 38px; place on nearest content edge remainder, gap 5px; v = rotate(90deg).
- Maximize: content rect tween to viewport edges; chrome translate-FLIP follows; radius 16↔0.
- Z-order: floating = content over chrome (shadows off content); maximized & any `data-flipping` transition = chrome over content (restore slides bars out from inside).
- App bar: launchpad bottom → pinned → open; any maximized window ⇒ only launchpad.
- Mobile &lt;720px: no control bar, nav bottom + labels, apps maximized only.

## Out of Scope

- Real AR/VR spatial interaction (API flag only)
- Backend / real networking of settings
- Pixel-perfect icon set beyond 24-grid stroke icons
