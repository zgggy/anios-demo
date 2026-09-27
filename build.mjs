import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

execSync("node node_modules/typescript/bin/tsc -p tsconfig.json", { stdio: "inherit" });

// 几何/字号令牌默认值从 state.ts 生成（参数唯一定义源），替换 styles.css 的 /* METRIC_DEFAULTS */
const { METRICS, DERIVS, metricVar, defaultMetrics, defaultDerivTerms } = await import("./dist/state.js");
const d0 = defaultMetrics();
const t0 = defaultDerivTerms();
const defaultsBlock = [
  ...METRICS.map((m) => `  ${metricVar(m.key)}: ${m.def}px;`),
  ...DERIVS.map((d) => `  ${d.cssVar}: ${d.compute(d0, t0)}px;`),
].join("\n");

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  outfile: "dist/bundle.js",
  target: "es2022",
});

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  outfile: "dist/bundle.iife.js",
  target: "es2022",
});

// single-file app: inline CSS + JS + wallpapers (壁纸 URL 在 CSS 中出现多次：背景 + 设置缩略图)
// NOTE: must use function replacer — String.replace treats $$ as "$"
const html = readFileSync("index.template.html", "utf8");
let css = readFileSync("styles.css", "utf8").replace("/* METRIC_DEFAULTS */", defaultsBlock);
const js = readFileSync("dist/bundle.iife.js", "utf8");
const light = readFileSync("assets/wallpaper-light.svg").toString("base64");
const dark = readFileSync("assets/wallpaper-dark.svg").toString("base64");
const lightJpg = readFileSync("assets/wallpaper-light.jpg").toString("base64");
const darkJpg = readFileSync("assets/wallpaper-dark.jpg").toString("base64");
css = css
  .replaceAll('url("assets/wallpaper-light.svg")', () => `url("data:image/svg+xml;base64,${light}")`)
  .replaceAll('url("assets/wallpaper-dark.svg")', () => `url("data:image/svg+xml;base64,${dark}")`)
  .replaceAll('url("assets/wallpaper-light.jpg")', () => `url("data:image/jpeg;base64,${lightJpg}")`)
  .replaceAll('url("assets/wallpaper-dark.jpg")', () => `url("data:image/jpeg;base64,${darkJpg}")`);
const single = html
  .replace("<!-- INJECT_CSS -->", () => `<style>\n${css}\n</style>`)
  .replace("<!-- INJECT_JS -->", () => `<script>\n${js}\n</script>`);
mkdirSync("dist", { recursive: true });
writeFileSync("index.html", single);
console.log("ok index.html (single-file app) · dist/bundle.js");
