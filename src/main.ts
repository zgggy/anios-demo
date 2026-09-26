import { initWindows } from "./window";
import { initRecover } from "./recover";
import { initMenus } from "./menu";
import { initStatusBar, initAppBar } from "./systembar";
import { initUi } from "./ui";
import { initViewport } from "./viewport";
import { initTempWindows } from "./temp";

function boot(): void {
  try {
    const api = initWindows();
    initMenus(api);
    initRecover(api);
    initStatusBar();
    initAppBar(api);
    initUi(api.wins);
    initTempWindows();
    initViewport(() => {
      api.wins.forEach((w) => api.align(w));
    });
    requestAnimationFrame(() => {
      api.wins.forEach((w) => api.align(w));
    });
  } catch (err) {
    console.error("[anios] boot failed", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
