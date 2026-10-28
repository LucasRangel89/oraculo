#!/usr/bin/env node
/**
 * Verificação do build estático (GitHub Pages).
 *
 * Duas frentes:
 *
 *   1. **Comportamento** — executa o motor do navegador (`client-engine.ts`) no
 *      Node, com um `localStorage` de mentira, e confere o contrato: eventos do
 *      stream, payload completo, cache por input, comparação, arte, catálogo e
 *      erro amigável para narrativa desconhecida.
 *   2. **Artefato** — inspeciona `out/`: caminhos com o basePath correto,
 *      `.nojekyll`, `404.html` e ausência de código de servidor no bundle.
 *
 * Uso: `npm run verify:pages` (depois de `npm run build:pages`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { register } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "out");
const basePath = (process.env.PAGES_BASE_PATH ?? "").trim().replace(/\/+$/, "");

let failures = 0;
const ok = (label, detail = "") =>
  console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? ` \x1b[90m${detail}\x1b[0m` : ""}`);
const bad = (label, detail = "") => {
  failures += 1;
  console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` \x1b[90m${detail}\x1b[0m` : ""}`);
};
const check = (condition, label, detail) => (condition ? ok(label, detail) : bad(label, detail));

// ---------------------------------------------------------------------------
// localStorage de mentira (o navegador não existe aqui)
// ---------------------------------------------------------------------------
class MemoryStorage {
  #map = new Map();
  getItem(key) {
    return this.#map.has(key) ? this.#map.get(key) : null;
  }
  setItem(key, value) {
    this.#map.set(key, String(value));
  }
  removeItem(key) {
    this.#map.delete(key);
  }
  clear() {
    this.#map.clear();
  }
  get size() {
    return this.#map.size;
  }
}

const localStorageStub = new MemoryStorage();
globalThis.window = { localStorage: localStorageStub };

// ---------------------------------------------------------------------------
// 1. Comportamento do motor no navegador
// ---------------------------------------------------------------------------
console.log("\n\x1b[1m1. Motor estático (executado no navegador)\x1b[0m");

register("./ts-hooks.mjs", import.meta.url);

let engine;
try {
  engine = await import("../src/lib/client-engine.ts");
  ok("módulos do motor carregados", "client-engine.ts");
} catch (err) {
  bad("carregar client-engine.ts", err.message);
}

if (engine) {
  let catalogTotal = 0;
  // 1.1 Catálogo
  try {
    const catalog = await engine.fetchCatalogStatic();
    catalogTotal = catalog.total;
    check(catalog.total >= 120, "catálogo amplo", `${catalog.total} narrativas`);
    const origins = new Set(catalog.entries.map((e) => e.origin));
    check(origins.size >= 40, "acervo multicultural", `${origins.size} origens`);
    const filtered = await engine.fetchCatalogStatic("", "mito");
    check(filtered.entries.every((e) => e.type === "mito"), "filtro por tipo", `${filtered.total} mitos`);
    const searched = await engine.fetchCatalogStatic("trickster");
    check(searched.total > 0, "busca textual", `${searched.total} resultados`);
  } catch (err) {
    bad("catálogo", err.message);
  }

  // 1.2 Status
  try {
    const status = await engine.fetchEngineStatusStatic();
    check(status.engine === "local" && status.store === "browser", "status declarado", `${status.engine}/${status.store}`);
    check(status.catalog.narratives === catalogTotal, "status traz o catálogo", `${status.catalog.narratives}`);
  } catch (err) {
    bad("status", err.message);
  }

  // 1.3 Stream completo (dossiê de referência)
  try {
    const events = [];
    await engine.streamAnalyzeStatic("O Senhor dos Anéis", "completa", (e) => events.push(e));
    const types = events.map((e) => e.type);
    const done = events.filter((e) => e.type === "agent_done");
    const complete = events.find((e) => e.type === "complete");
    const result = complete?.result;

    check(types[0] === "start", "stream começa com start");
    check(done.length === 8, "oito lentes concluídas", `${done.length}`);
    check(types.at(-1) === "complete", "stream termina com complete");
    check(Boolean(result?.facts?.name), "fatos presentes", result?.facts?.name);
    check(result?.structure?.heroJourney?.length === 12, "12 estágios de Campbell");
    check(result?.structure?.heroJourney?.every((s) => s.present), "todos os estágios reconhecidos");
    check(Boolean(result?.cultural), "lente cultural presente");
    check(Array.isArray(result?.parallels) && result.parallels.length === 5, "cinco paralelos", `${result?.parallels?.length}`);
    check(result?.engine === "local" && result?.source === "reference", "proveniência declarada", `${result?.engine}/${result?.source}`);
    check(result?.parallels?.every((p) => p.name && p.score > 0), "paralelos com nome e score");
    check(typeof result?.score !== "number" && result?.parallels?.[0]?.reason?.length > 0, "cada paralelo explica a conexão");

    // 1.4 Persistência + cache
    const history = await engine.fetchRecentAnalysesStatic();
    check(history.length === 1 && history[0].input === "O Senhor dos Anéis", "histórico persistido", `${history.length} item`);
    const reopened = await engine.fetchAnalysisStatic(result.id);
    check(reopened.cached === true && reopened.id === result.id, "reabrir do histórico", result.id);

    const second = await engine.analyzeStatic("o senhor dos aneis", "completa");
    check(second.id === result.id, "cache por input normalizado", "mesma análise");
  } catch (err) {
    bad("stream completo", err.message);
  }

  // 1.5 Profundidade rápida e narrativa sem dossiê
  try {
    const quick = await engine.analyzeStatic("Matrix", "rapida");
    check(quick.parallels.length > 0 && quick.source === "catalog", "modo rápido via catálogo", quick.source);
    check(quick.archetypes === null && quick.themes === null, "lentes não pedidas ficam nulas");
  } catch (err) {
    bad("profundidade rápida", err.message);
  }

  // 1.6 Erro amigável
  try {
    await engine.analyzeStatic("Narrativa Inexistente XYZ", "completa");
    bad("input desconhecido deveria falhar");
  } catch (err) {
    check(err.name === "NarrativeNotFoundError", "erro de narrativa desconhecida", err.name);
    check(Array.isArray(err.variants) && err.variants.length > 0, "sugestões de variantes", `${err.variants?.length}`);
  }

  // 1.7 Comparação
  try {
    const cmp = await engine.requestComparisonStatic({
      aName: "Prometeu",
      aOrigin: "Mitologia Grega",
      bName: "Loki",
      bOrigin: "Mitologia Nórdica",
    });
    check(typeof cmp.score === "number" && cmp.score > 0, "score da comparação", String(cmp.score));
    check(cmp.convergences.length > 0, "convergências", `${cmp.convergences.length} grupos`);
  } catch (err) {
    bad("comparação", err.message);
  }

  // 1.8 Arte-síntese
  try {
    const art = await engine.requestArtworkStatic({ aName: "Prometeu", bName: "Loki", motif: "fogo" });
    check(art.dataUrl.startsWith("data:image/svg+xml;base64,"), "sigilo SVG local", `${art.dataUrl.length} bytes`);
  } catch (err) {
    bad("arte-síntese", err.message);
  }

  // 1.9 Feedback
  try {
    await engine.submitFeedbackStatic({ analysisId: "an_teste", useful: true, comment: "ok" });
    const raw = localStorageStub.getItem("oraculo:feedback:v1");
    check(Boolean(raw && JSON.parse(raw).length === 1), "feedback registrado");
  } catch (err) {
    bad("feedback", err.message);
  }
}

// ---------------------------------------------------------------------------
// 2. Artefato exportado
// ---------------------------------------------------------------------------
console.log("\n\x1b[1m2. Artefato estático (out/)\x1b[0m");

const indexPath = path.join(outDir, "index.html");
check(existsSync(indexPath), "out/index.html existe");

if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf8");
  const prefix = basePath ? `${basePath}/` : "/";
  check(html.includes(`${prefix}_next/static/`), "assets com basePath", prefix);
  check(!/https?:\/\/localhost/.test(html), "nenhuma referência a localhost");
  check(html.includes("Oráculo das Conexões Narrativas"), "shell do app no HTML");

  const assets = [...html.matchAll(/(?:href|src)="([^"]+\.(?:css|js))"/g)].map((m) => m[1]);
  const missing = assets.filter((asset) => {
    const rel = asset.startsWith(prefix) ? asset.slice(prefix.length) : asset.replace(/^\//, "");
    return !existsSync(path.join(outDir, rel));
  });
  check(assets.length > 0 && missing.length === 0, "todos os assets existem", `${assets.length} referências`);
}

check(existsSync(path.join(outDir, ".nojekyll")), ".nojekyll presente");
check(existsSync(path.join(outDir, "404.html")), "404.html presente");

/** Percorre os chunks do bundle procurando código de servidor. */
function scanChunks(dir, hits = { files: 0, forbidden: [] }) {
  if (!existsSync(dir)) return hits;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      scanChunks(full, hits);
      continue;
    }
    if (!/\.(js|mjs)$/.test(entry)) continue;
    hits.files += 1;
    const code = readFileSync(full, "utf8");
    for (const marker of ["z-ai-web-dev-sdk", "@prisma/client", "node:fs", "node:path"]) {
      if (code.includes(marker)) hits.forbidden.push(`${entry} → ${marker}`);
    }
  }
  return hits;
}

const scan = scanChunks(path.join(outDir, "_next", "static", "chunks"));
check(scan.files > 0, "chunks publicados", `${scan.files} arquivos`);
check(scan.forbidden.length === 0, "sem código de servidor no bundle", scan.forbidden.join(", "));

// O bundle publicado não pode conter chamadas de rede: se `IS_STATIC` não for
// inlinado como `true`, o dispatcher mantém os `fetch("/api/...")` e a página
// publicada quebraria em 404. Este é o teste de regressão dessa decisão.
const apiStrings = [];
for (const entry of readdirSync(path.join(outDir, "_next", "static", "chunks"))) {
  if (!entry.endsWith(".js")) continue;
  const code = readFileSync(path.join(outDir, "_next", "static", "chunks", entry), "utf8");
  for (const api of ["/api/analyze", "/api/status", "/api/catalog", "/api/compare"]) {
    if (code.includes(`"${api}"`)) apiStrings.push(`${entry} → ${api}`);
  }
}
check(apiStrings.length === 0, "nenhuma chamada /api no bundle estático", apiStrings.join(", "));

const engineChunk = readdirSync(path.join(outDir, "_next", "static", "chunks")).some((f) => {
  if (!f.endsWith(".js")) return false;
  return readFileSync(path.join(outDir, "_next", "static", "chunks", f), "utf8").includes(
    "oráculo-hermenêutico-v1"
  );
});
check(engineChunk, "motor hermenêutico embarcado no bundle");

console.log(
  failures === 0
    ? "\n\x1b[32mBuild estático verificado — pronto para publicar.\x1b[0m\n"
    : `\n\x1b[31m${failures} verificação(ões) falharam.\x1b[0m\n`
);
process.exit(failures === 0 ? 0 : 1);
