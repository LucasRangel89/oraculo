#!/usr/bin/env node
/**
 * Serve o export estático exatamente como o GitHub Pages faria.
 *
 * O build usa `basePath` (`/oraculo`), então abrir `out/` na raiz quebraria os
 * assets. Este servidor sem dependências monta `out/` no subcaminho correto e
 * resolve `/caminho/` → `/caminho/index.html`, como o Pages.
 *
 * Uso: `npm run preview:pages` (porta 4000, sobrescreva com PORT=8080).
 * A raiz redireciona para o subcaminho do site, para que o preview do sandbox
 * abra a página certa sem ninguém precisar digitar `/oraculo/`.
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "out");
const basePath = (process.env.PAGES_BASE_PATH ?? "/oraculo").trim().replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 4000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

if (!existsSync(root)) {
  console.error("✗ Pasta ./out não encontrada. Rode `npm run build:pages` primeiro.");
  process.exit(1);
}

/** Resolve a URL para um arquivo dentro de `out/`, com fallback de diretório. */
function resolveFile(pathname) {
  let rel = decodeURIComponent(pathname);
  if (basePath && rel.startsWith(basePath)) rel = rel.slice(basePath.length);
  else if (basePath && rel !== "/") return null;
  rel = rel.replace(/^\/+/, "");
  if (rel.includes("..")) return null;

  const candidates = [rel, path.join(rel, "index.html"), `${rel}.html`];
  for (const candidate of candidates) {
    const full = path.join(root, candidate || "index.html");
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);

  // Na raiz, manda para o subcaminho real do site (como o Pages faria).
  if (basePath && (url.pathname === "/" || url.pathname === "")) {
    res.writeHead(302, { Location: `${basePath}/${url.search}` });
    res.end();
    return;
  }

  const file = resolveFile(url.pathname);

  if (!file) {
    // 404 do Pages: mesma cara do export
    const notFound = path.join(root, "404.html");
    res.writeHead(404, { "Content-Type": MIME[".html"] });
    if (existsSync(notFound)) createReadStream(notFound).pipe(res);
    else res.end("404");
    return;
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  createReadStream(file).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`\n▸ Prévia do Pages: http://localhost:${port}${basePath}/\n`);
});
