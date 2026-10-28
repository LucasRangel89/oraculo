#!/usr/bin/env node
/**
 * Build estático para o GitHub Pages.
 *
 * O Pages serve apenas arquivos estáticos, então as rotas de `/api` precisam
 * sair da árvore do App Router durante o export (`output: "export"` recusa
 * route handlers com POST/streaming). Este script:
 *
 *   1. move `src/app/api` para fora de `src` (stash temporário);
 *   2. roda `next build` com `STATIC_EXPORT=1` e `NEXT_PUBLIC_ORACLE_STATIC=1`;
 *   3. restaura a pasta da API — sempre, inclusive em caso de falha;
 *   4. grava `out/.nojekyll` (impede o Jekyll de descartar `_next/`).
 *
 * A UI não muda: `oracle-client.ts` detecta o build estático e atende as
 * chamadas com `client-engine.ts`, que roda o motor local no navegador.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const apiDir = path.join(root, "src", "app", "api");
const stashDir = path.join(root, ".pages-stash", "api");
const outDir = path.join(root, "out");

/** Nome do repositório → subcaminho no GitHub Pages. */
function resolveBasePath() {
  const explicit = process.env.PAGES_BASE_PATH;
  if (typeof explicit === "string") return explicit.trim().replace(/\/+$/, "");

  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo) return "";
  // repositórios `<user>.github.io` são servidos na raiz
  return repo.endsWith(".github.io") ? "" : `/${repo}`;
}

const basePath = resolveBasePath();

function moveApiToStash() {
  if (!existsSync(apiDir)) return false;
  rmSync(path.dirname(stashDir), { recursive: true, force: true });
  mkdirSync(path.dirname(stashDir), { recursive: true });
  renameSync(apiDir, stashDir);
  return true;
}

function restoreApi(moved) {
  if (!moved) return;
  if (existsSync(apiDir)) {
    // a árvore foi regenerada durante o build: descarta o stash
    rmSync(path.dirname(stashDir), { recursive: true, force: true });
    return;
  }
  renameSync(stashDir, apiDir);
  rmSync(path.dirname(stashDir), { recursive: true, force: true });
}

console.log(`\n▸ Build estático do Oráculo`);
console.log(`  basePath: ${basePath || "(raiz)"}`);

let moved = false;
try {
  moved = moveApiToStash();
  if (moved) console.log("  ✓ rotas de /api retiradas do build estático");

  rmSync(outDir, { recursive: true, force: true });

  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      STATIC_EXPORT: "1",
      NEXT_PUBLIC_ORACLE_STATIC: "1",
      PAGES_BASE_PATH: basePath,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  if (result.status !== 0) {
    console.error("\n✗ Falha no `next build` do modo estático.");
    process.exitCode = result.status ?? 1;
  } else {
    writeFileSync(path.join(outDir, ".nojekyll"), "");
    console.log(`\n✓ Export estático pronto em ./out (${basePath || "/"})`);
    console.log("  Publique com a action de GitHub Pages ou `npx serve out`.\n");
  }
} catch (err) {
  console.error("✗ Erro inesperado no build estático:", err);
  process.exitCode = 1;
} finally {
  restoreApi(moved);
  if (moved) console.log("  ✓ rotas de /api restauradas");
}
