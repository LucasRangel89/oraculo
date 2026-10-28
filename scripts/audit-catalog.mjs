#!/usr/bin/env node
/**
 * Auditoria do acervo curado.
 *
 * Garante que a expansão do catálogo não degrade a qualidade das conexões:
 *  - ids únicos e nomes únicos;
 *  - todo motivo pertence ao vocabulário controlado (`catalog/vocab.ts`);
 *  - todo arquétipo pertence ao vocabulário;
 *  - nenhuma entrada repete motivo, arquétipo, tema ou personagem;
 *  - campos mínimos preenchidos (sinopse com tamanho útil, 3+ motivos, 2+ temas).
 *
 * Uso: `npm run audit:catalog`
 */
import { register } from "node:module";
import path from "node:path";

register("./ts-hooks.mjs", import.meta.url);

const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);

const { CATALOG } = await import("../src/lib/oracle-catalog.ts");
const { ALL_MOTIFS, ARCHETYPE_VOCAB } = await import("../src/lib/catalog/vocab.ts");

const allowedMotifs = new Set(ALL_MOTIFS);
const allowedArchetypes = new Set(ARCHETYPE_VOCAB);

const problems = [];
const add = (entry, message) => problems.push(`${entry.id ?? "(sem id)"} — ${message}`);

const ids = new Map();
const names = new Map();
const motifUse = new Map();

for (const entry of CATALOG) {
  if (ids.has(entry.id)) add(entry, `id duplicado (também em ${ids.get(entry.id)})`);
  ids.set(entry.id, entry.name);

  const nameKey = entry.name.toLowerCase();
  if (names.has(nameKey)) add(entry, `nome duplicado (também em ${names.get(nameKey)})`);
  names.set(nameKey, entry.id);

  if (!entry.id || !/^[a-z0-9-]+$/.test(entry.id)) add(entry, "id fora do padrão kebab-case");
  if (!entry.synopsis || entry.synopsis.length < 90) add(entry, "sinopse curta demais (< 90 caracteres)");
  if (!entry.period) add(entry, "período ausente");
  if (!entry.origin) add(entry, "origem ausente");

  if (entry.motifs.length < 3) add(entry, `poucos motivos (${entry.motifs.length})`);
  if (entry.archetypes.length < 2) add(entry, `poucos arquétipos (${entry.archetypes.length})`);
  if (entry.themes.length < 2) add(entry, `poucos temas (${entry.themes.length})`);
  if (entry.characters.length < 2) add(entry, `poucos personagens (${entry.characters.length})`);

  if (new Set(entry.motifs).size !== entry.motifs.length) add(entry, "motivo repetido");
  if (new Set(entry.archetypes).size !== entry.archetypes.length) add(entry, "arquétipo repetido");
  if (new Set(entry.themes).size !== entry.themes.length) add(entry, "tema repetido");
  if (new Set(entry.characters).size !== entry.characters.length) add(entry, "personagem repetido");

  for (const motif of entry.motifs) {
    if (!allowedMotifs.has(motif)) add(entry, `motivo fora do vocabulário: "${motif}"`);
    motifUse.set(motif, (motifUse.get(motif) ?? 0) + 1);
  }
  for (const archetype of entry.archetypes) {
    if (!allowedArchetypes.has(archetype)) add(entry, `arquétipo fora do vocabulário: "${archetype}"`);
  }
  // caracteres suspeitos (cirílico/grego acidental em texto latino)
  const text = [entry.name, entry.origin, entry.synopsis, ...entry.characters, ...entry.motifs].join(" ");
  if (/[\u0400-\u04FF\u0370-\u03FF]/.test(text)) add(entry, "caractere cirílico/grego no texto");
}

/** Motivos usados por uma única narrativa não conectam nada. */
const orphans = ALL_MOTIFS.filter((motif) => (motifUse.get(motif) ?? 0) === 1);
const unused = ALL_MOTIFS.filter((motif) => (motifUse.get(motif) ?? 0) === 0);

const byType = CATALOG.reduce((acc, e) => {
  acc[e.type] = (acc[e.type] ?? 0) + 1;
  return acc;
}, {});

const traditions = new Map();
for (const entry of CATALOG) {
  const key = entry.origin.split("(")[0].trim();
  traditions.set(key, (traditions.get(key) ?? 0) + 1);
}

console.log(`\n\x1b[1mAcervo do Oráculo\x1b[0m`);
console.log(`  narrativas: ${CATALOG.length}`);
console.log(`  tradições:  ${traditions.size}`);
console.log(`  motivos:    ${motifUse.size} usados de ${ALL_MOTIFS.length} do vocabulário`);
console.log(`  por tipo:   ${Object.entries(byType).map(([t, n]) => `${t}=${n}`).join(" · ")}`);

console.log(`\n\x1b[1mTradições\x1b[0m`);
for (const [key, count] of [...traditions].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${key}`);
}

if (unused.length > 0) {
  console.log(`\n\x1b[33mMotivos do vocabulário ainda não usados (${unused.length}):\x1b[0m ${unused.join(", ")}`);
}
if (orphans.length > 0) {
  console.log(`\n\x1b[33mMotivos órfãos — usados por uma só narrativa (${orphans.length}):\x1b[0m ${orphans.join(", ")}`);
}

if (problems.length > 0) {
  console.log(`\n\x1b[31m${problems.length} problema(s):\x1b[0m`);
  for (const problem of problems) console.log(`  ✗ ${problem}`);
  process.exit(1);
}

console.log("\n\x1b[32mCatálogo íntegro.\x1b[0m\n");
