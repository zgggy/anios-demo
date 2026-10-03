/**
 * 动画层：对状态迁移做视觉插值，只读 —— 永不写语义状态，结束只清瞬态。
 * 两种原语：
 *   - 壳（固定尺寸胶囊）：位移 FLIP（translate-only）；
 *   - 内容（随盒子重排）：真实矩形补间 —— 禁止 scale 压内容。
 */
import gsap from "gsap";
import { $, durMs } from "./dom";
import { align } from "./render";

const EASE = "power3.inOut";

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 动画时长（秒）；reduced-motion 时趋近 0 */
export function durSec(token = "--anim-window"): number {
  if (prefersReducedMotion()) return 0.00001;
  return Math.max(0.12, durMs(token) / 1000);
}

export type ShellFirst = {
  content: DOMRect;
  nav?: DOMRect;
  topbar?: DOMRect;
  radius: string;
  pad: Record<string, string>;
};

function padOf(el: HTMLElement): Record<string, string> {
  const s = getComputedStyle(el);
  return {
    paddingLeft: s.paddingLeft,
    paddingTop: s.paddingTop,
    paddingRight: s.paddingRight,
  };
}

/** 状态切换前捕获 first 矩形（壳 + 内容 + 圆角 + 内边距） */
export function captureShell(win: HTMLElement): ShellFirst {
  const content = $<HTMLElement>(".content", win)!;
  const scroller = $<HTMLElement>(".content-scroll", content);
  return {
    content: content.getBoundingClientRect(),
    nav: $<HTMLElement>("[data-nav]", win)?.getBoundingClientRect(),
    topbar: $<HTMLElement>("[data-topbar]", win)?.getBoundingClientRect(),
    radius: getComputedStyle(content).borderRadius,
    pad: scroller ? padOf(scroller) : {},
  };
}

/**
 * 状态已切换（几何/模式已落到 DOM）后播放过渡：
 * 内容 = 真实矩形补间（含圆角与滚动内边距），壳 = 位移 FLIP。
 */
export function playShell(win: HTMLElement, first: ShellFirst): void {
  const content = $<HTMLElement>(".content", win);
  if (!content) return;
  const navbar = $<HTMLElement>("[data-nav]", win);
  const topbar = $<HTMLElement>("[data-topbar]", win);
  const scroller = $<HTMLElement>(".content-scroll", content);
  const d = durSec("--anim-window");

  // 测量前置条件：派生对齐变量必须反映「切换后」的内容盒，
  // 否则壳 FLIP 的终点是陈旧基点，动画结束一刷新就会跳。
  align(win);

  const lC = content.getBoundingClientRect();
  const lN = navbar?.getBoundingClientRect();
  const lT = topbar?.getBoundingClientRect();
  const wr = win.getBoundingClientRect();

  gsap.fromTo(
    content,
    {
      left: first.content.left - wr.left,
      top: first.content.top - wr.top,
      width: first.content.width,
      height: first.content.height,
      right: "auto",
      bottom: "auto",
      borderRadius: first.radius,
    },
    {
      left: lC.left - wr.left,
      top: lC.top - wr.top,
      width: lC.width,
      height: lC.height,
      right: "auto",
      bottom: "auto",
      borderRadius: getComputedStyle(content).borderRadius,
      duration: d,
      ease: EASE,
      overwrite: true,
      onComplete: () => {
        gsap.set(content, {
          clearProps: "left,top,width,height,right,bottom,borderRadius",
        });
        win.dataset.flipping = "0";
        align(win);
      },
      onInterrupt: () => {
        win.dataset.flipping = "0";
      },
    },
  );

  if (scroller && Object.keys(first.pad).length) {
    gsap.fromTo(scroller, first.pad, {
      ...padOf(scroller),
      duration: d,
      ease: EASE,
      overwrite: true,
      clearProps: "paddingLeft,paddingTop,paddingRight",
    });
  }

  flipShell(navbar, first.nav, lN, 0, -50, d, win);
  flipShell(topbar, first.topbar, lT, -50, 0, d, win);
}

/** 壳位移 FLIP：反演须在绘制前的同一任务内应用；xp/yp 保持 CSS 居中基变换 */
function flipShell(
  el: HTMLElement | null,
  f: DOMRect | undefined,
  l: DOMRect | undefined,
  xp: number,
  yp: number,
  d: number,
  win: HTMLElement,
): void {
  if (!el || !f || !l) return;
  gsap.set(el, {
    x: f.left - l.left,
    y: f.top - l.top,
    xPercent: xp,
    yPercent: yp,
    force3D: true,
  });
  gsap.to(el, {
    x: 0,
    y: 0,
    xPercent: xp,
    yPercent: yp,
    duration: d,
    ease: EASE,
    overwrite: true,
    onComplete: () => {
      gsap.set(el, { clearProps: "transform,x,y,xPercent,yPercent" });
      if (xp) el.style.transform = `translateX(${xp}%)`;
      else if (yp) el.style.transform = `translateY(${yp}%)`;
      align(win);
    },
  });
}

/* ── 生命周期补间：先过渡、结束由交互层 commit（手势类例外） ── */

/** 收起：缩向 App 栏图标 */
export function minimizeTo(
  win: HTMLElement,
  icon: HTMLElement | null,
  onDone: () => void,
): void {
  const d = durSec("--anim-window");
  const wr = win.getBoundingClientRect();
  const cx0 = wr.left + wr.width / 2;
  const cy0 = wr.top + wr.height / 2;
  let tx = cx0;
  let ty = cy0 + 80;
  if (icon) {
    const ir = icon.getBoundingClientRect();
    tx = ir.left + ir.width / 2;
    ty = ir.top + ir.height / 2;
  }
  // 不补间 opacity：祖先 opacity<1 会形成 backdrop root，
  // 磨砂面板瞬间变成透明玻璃；消失用「缩小 + 隐藏」表达
  gsap.to(win, {
    scale: 0.12,
    x: tx - cx0,
    y: ty - cy0,
    transformOrigin: "50% 50%",
    duration: d,
    ease: "power3.in",
    overwrite: true,
    onComplete: () => {
      win.hidden = true;
      gsap.set(win, { clearProps: "transform,scale,x,y,transformOrigin" });
      onDone();
    },
  });
}

/** 打开：从 App 栏图标处飞入 */
export function openFrom(
  win: HTMLElement,
  icon: HTMLElement | null,
  onDone: () => void,
): void {
  const d = durSec("--anim-window");
  const wr = win.getBoundingClientRect();
  const cx0 = wr.left + wr.width / 2;
  const cy0 = wr.top + wr.height / 2;
  let tx = cx0;
  let ty = cy0 + 80;
  if (icon) {
    const ir = icon.getBoundingClientRect();
    tx = ir.left + ir.width / 2;
    ty = ir.top + ir.height / 2;
  }
  gsap.fromTo(
    win,
    {
      scale: 0.12,
      x: tx - cx0,
      y: ty - cy0,
      transformOrigin: "50% 50%",
    },
    {
      scale: 1,
      x: 0,
      y: 0,
      duration: d,
      ease: "power3.out",
      overwrite: true,
      onComplete: () => {
        gsap.set(win, { clearProps: "transform,scale,x,y,transformOrigin" });
        onDone();
      },
    },
  );
}

/** 关闭：原地缩小 */
export function closeIn(win: HTMLElement, onDone: () => void): void {
  const d = durSec("--anim-window");
  gsap.to(win, {
    scale: 0.12,
    transformOrigin: "50% 50%",
    duration: d,
    ease: "power3.in",
    overwrite: true,
    onComplete: () => {
      win.hidden = true;
      gsap.set(win, { clearProps: "transform,scale,transformOrigin" });
      onDone();
    },
  });
}

/**
 * 形变补间：真实矩形（px）+ --dock-p 同步到位。停靠收尾/还原、点击还原共用。
 * 自带 flipping 守卫（补间中跳过几何补丁）与 rAF 冻结看门狗（幂等收尾）。
 */
/** 每窗形变序号：旧 morph 的看门狗晚到时不得收尾新 morph */
const morphSeq = new WeakMap<HTMLElement, number>();

export function morphTo(
  win: HTMLElement,
  box: { left: number; top: number; width: number; height: number },
  dockP: number,
  onDone: () => void,
): void {
  const seq = (morphSeq.get(win) ?? 0) + 1;
  morphSeq.set(win, seq);
  const t = win.style.transition;
  win.style.transition = "none";
  win.dataset.flipping = "1";
  let done = false;
  const finish = () => {
    if (done || morphSeq.get(win) !== seq) return;
    done = true;
    gsap.killTweensOf(win); // 残余 tick 会把已落位几何拽回中途值
    // 收尾钳到终点：补间被 rAF 饿死时也精确落位
    win.style.left = `${box.left}px`;
    win.style.top = `${box.top}px`;
    win.style.width = `${box.width}px`;
    win.style.height = `${box.height}px`;
    win.style.setProperty("--dock-p", String(dockP));
    align(win);
    win.dataset.flipping = "0";
    win.style.transition = t;
    onDone();
  };
  gsap.to(win, {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    "--dock-p": dockP,
    duration: durSec("--anim-window"),
    ease: EASE,
    overwrite: true,
    onUpdate: () => align(win),
    onComplete: finish,
  });
  window.setTimeout(finish, durMs("--anim-window") + 250);
}
