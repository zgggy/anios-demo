import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

execSync("node node_modules/typescript/bin/tsc -p tsconfig.json", { stdio: "inherit" });

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

// single-file app: inline CSS + JS + wallpapers
// NOTE: must use function replacer — String.replace treats $$ as "$"
const html = readFileSync("index.template.html", "utf8");
let css = readFileSync("styles.css", "utf8");
const js = readFileSync("dist/bundle.iife.js", "utf8");
const light = readFileSync("assets/wallpaper-light.jpg").toString("base64");
const dark = readFileSync("assets/wallpaper-dark.jpg").toString("base64");
css = css
  .replace('url("assets/wallpaper-light.jpg")', () => `url("data:image/jpeg;base64,${light}")`)
  .replace('url("assets/wallpaper-dark.jpg")', () => `url("data:image/jpeg;base64,${dark}")`);
const single = html
  .replace("<!-- INJECT_CSS -->", () => `<style>\n${css}\n</style>`)
  .replace("<!-- INJECT_JS -->", () => `<script>\n${js}\n</script>`);
mkdirSync("dist", { recursive: true });
writeFileSync("index.html", single);
console.log("ok index.html (single-file app) · dist/bundle.js");
