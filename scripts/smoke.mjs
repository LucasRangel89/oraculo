#!/usr/bin/env node
/**
 * Smoke test do Oráculo — valida a página e todos os endpoints públicos.
 *
 * Uso:
 *   node scripts/smoke.mjs
 *   ORACLE_URL=https://meu-deploy.exemplo.com node scripts/smoke.mjs
 *
 * Sai com código 1 em caso de falha (bom para CI).
 */

const BASE = (process.env.ORACLE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

let failures = 0;

function ok(label, detail = "") {
  console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? ` \x1b[90m${detail}\x1b[0m` : ""}`);
}

function fail(label, detail = "") {
  failures += 1;
  console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` \x1b[90m${detail}\x1b[0m` : ""}`);
}

function assert(condition, label, detail) {
  if (condition) ok(label, detail);
  else fail(label, detail);
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // não-JSON: mantém null
  }
  return { res, json, text };
}

/** Consome um stream SSE e devolve os eventos parseados. */
async function readSse(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    return { res, events: [], raw: "" };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        try {
          events.push(JSON.parse(line.slice(5).trim()));
        } catch {
          // ignora evento malformado
        }
      }
    }
  }
  return { res, events, raw: buffer };
}

console.log(`\n\x1b[1mOráculo — smoke test\x1b[0m \x1b[90m(${BASE})\x1b[0m\n`);

// 1. Página
try {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  assert(res.ok, "GET /", `HTTP ${res.status} · ${html.length} bytes`);
  assert(
    html.includes("Oráculo") || html.includes("Or&aacute;culo"),
    "HTML contém a marca do Oráculo"
  );
  assert(html.includes("Acervo"), "navegação inclui a aba Acervo");
} catch (err) {
  fail("GET /", err.message);
}

// 2. Status
try {
  const { res, json } = await getJson("/api/status");
  assert(res.ok && json?.ok === true, "GET /api/status");
  assert(
    ["zai", "openai", "local"].includes(json?.engine),
    "motor declarado",
    json?.engine
  );
  assert(["prisma", "file"].includes(json?.store), "armazenamento declarado", json?.store);
  assert(json?.catalog?.narratives >= 24, "catálogo íntegro", `${json?.catalog?.narratives} narrativas`);
  console.log(`    \x1b[90mprovider: ${json?.provider} · modelo: ${json?.model}\x1b[0m`);
} catch (err) {
  fail("GET /api/status", err.message);
}

// 3. Catálogo
try {
  const { res, json } = await getJson("/api/catalog");
  assert(res.ok && Array.isArray(json?.entries), "GET /api/catalog");
  assert(json?.entries?.length === json?.total, "total do catálogo consistente", String(json?.total));
} catch (err) {
  fail("GET /api/catalog", err.message);
}

// 4. Análise completa
let analysisId = null;
try {
  const { res, events } = await readSse("/api/analyze", {
    input: "Prometeu",
    depth: "completa",
  });
  assert(res.ok, "POST /api/analyze aceito", `HTTP ${res.status}`);
  const types = events.map((e) => e.type);
  assert(types[0] === "start", "stream começa com start");
  assert(types.includes("complete"), "stream termina com complete");
  const doneCount = events.filter((e) => e.type === "agent_done").length;
  const cacheHit = events.some(
    (e) =>
      e.type === "start" &&
      Array.isArray(e.agents) &&
      e.agents.length > 0 &&
      e.agents.every((agent) => agent.status === "done")
  );
  assert(
    doneCount >= 4 || cacheHit,
    "lentes concluídas (ou cache integral)",
    cacheHit ? "cache" : String(doneCount)
  );
  const result = events.find((e) => e.type === "complete")?.result;
  if (result) {
    analysisId = result.id;
    assert(Boolean(result.facts?.name), "fatos presentes", result.facts?.name);
    assert(Boolean(result.structure?.heroJourney?.length), "12 estágios presentes");
    assert(Boolean(result.cultural), "lente cultural presente");
    assert(Array.isArray(result.parallels), "paralelos presentes", `${result.parallels.length}`);
    assert(["llm", "local"].includes(result.engine), "engine declarado", result.engine);
    assert(["llm", "reference", "catalog", "heuristic"].includes(result.source), "source declarado", result.source);
  } else {
    fail("resultado completo no evento complete");
  }
} catch (err) {
  fail("POST /api/analyze", err.message);
}

// 5. Análise cacheada
if (analysisId) {
  try {
    const { res, json } = await getJson(`/api/analysis/${analysisId}`);
    assert(res.ok && json?.id === analysisId, "GET /api/analysis/[id]", analysisId);
    assert(json?.cached === true, "análise marcada como cacheada");
  } catch (err) {
    fail("GET /api/analysis/[id]", err.message);
  }
}

// 6. Histórico
try {
  const { res, json } = await getJson("/api/analyses");
  assert(res.ok && Array.isArray(json?.items), "GET /api/analyses", `${json?.items?.length} itens`);
} catch (err) {
  fail("GET /api/analyses", err.message);
}

// 7. Feedback
if (analysisId) {
  try {
    const res = await fetch(`${BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, useful: true, comment: "smoke test" }),
    });
    assert(res.ok, "POST /api/feedback");
  } catch (err) {
    fail("POST /api/feedback", err.message);
  }
}

// 8. Comparação
try {
  const res = await fetch(`${BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aName: "Prometeu",
      aOrigin: "Mitologia Grega",
      bName: "Loki",
      bOrigin: "Mitologia Nórdica",
    }),
  });
  const json = await res.json();
  assert(res.ok, "POST /api/compare", `HTTP ${res.status}`);
  assert(typeof json?.score === "number", "score da comparação", String(json?.score));
  assert(Array.isArray(json?.convergences) && json.convergences.length > 0, "convergências presentes");
} catch (err) {
  fail("POST /api/compare", err.message);
}

// 9. Arte-síntese
try {
  const res = await fetch(`${BASE}/api/artwork`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aName: "Prometeu", bName: "Loki", motif: "fogo do conhecimento" }),
  });
  const json = await res.json();
  assert(res.ok, "POST /api/artwork", `HTTP ${res.status}`);
  assert(
    typeof json?.dataUrl === "string" && json.dataUrl.startsWith("data:image/"),
    "dataUrl de imagem",
    json?.dataUrl?.slice(0, 24)
  );
} catch (err) {
  fail("POST /api/artwork", err.message);
}

// 10. Input desconhecido deve falhar de forma amigável
try {
  const { events } = await readSse("/api/analyze", {
    input: "Narrativa Inexistente XYZ",
    depth: "rapida",
  });
  const hasError = events.some((e) => e.type === "error");
  assert(hasError, "input desconhecido retorna erro declarado");
} catch (err) {
  fail("POST /api/analyze (input desconhecido)", err.message);
}

console.log(
  failures === 0
    ? "\n\x1b[32mTodos os testes passaram.\x1b[0m\n"
    : `\n\x1b[31m${failures} teste(s) falharam.\x1b[0m\n`
);
process.exit(failures === 0 ? 0 : 1);
