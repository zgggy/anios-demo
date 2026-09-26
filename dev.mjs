/**
 * dev 服务：静态文件 + POST /api/save-def。
 * 设置里的「设为默认」按钮把当前值写回 src/state.ts 对应参数的 def（参数唯一定义源）。
 * 用法：npm run dev → http://127.0.0.1:8931
 */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 8931);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

/** 定位单行 `key: "X", … def: N,` 定义并改写 def */
async function saveDef(key, value) {
  const file = join(root, "src", "state.ts");
  const src = await readFile(file, "utf8");
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(`key: "${key}"`)) continue;
    const next = lines[i].replace(/def:\s*[-\d.]+/, `def: ${value}`);
    if (next === lines[i]) return false;
    lines[i] = next;
    await writeFile(file, lines.join("\n"));
    console.log(`[dev] default ${key} = ${value} → src/state.ts`);
    return true;
  }
  return false;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/save-def") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const { key, value } = JSON.parse(body);
      const ok = await saveDef(String(key), Number(value));
      res.writeHead(ok ? 200 : 404, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok }));
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const file = normalize(join(root, url.pathname === "/" ? "/index.html" : url.pathname));
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, () => {
  console.log(`[dev] http://127.0.0.1:${port}  （save-def → src/state.ts）`);
});
