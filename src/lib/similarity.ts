import { CATALOG } from "@/lib/oracle-catalog";
import { SIMILARITY_WEIGHTS } from "@/lib/oracle-types";
import type {
  ArchetypeAnalysis,
  CatalogEntry,
  Fingerprint,
  ScoreBreakdown,
  StructureAnalysis,
  SymbolAnalysis,
  ThematicAnalysis,
} from "@/lib/oracle-types";

/** Inputs opcionais dos agentes usados para montar o fingerprint. */
export interface FingerprintInputs {
  structure?: StructureAnalysis | null;
  archetypes?: ArchetypeAnalysis | null;
  symbols?: SymbolAnalysis | null;
  themes?: ThematicAnalysis | null;
}

/** Remove acentos, lowercase, trim e colapsa espaços — normalização canônica. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Dedup preservando a ordem de inserção. */
function dedup(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const norm = normalizeText(item);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

/**
 * Monta o fingerprint narrativo a partir das saídas dos agentes:
 * - motifs  ← symbols.symbols[].symbol
 * - archetypes ← archetypes.archetypes[].archetype
 * - themes  ← themes.themes
 * - beats   ← structure.beats
 * Todos os itens passam por normalizeText + dedup.
 */
export function buildFingerprint(inputs: FingerprintInputs): Fingerprint {
  const motifs = dedup(inputs.symbols?.symbols?.map((s) => s.symbol) ?? []);
  const archetypes = dedup(inputs.archetypes?.archetypes?.map((a) => a.archetype) ?? []);
  const themes = dedup(inputs.themes?.themes ?? []);
  const beats = dedup(inputs.structure?.beats ?? []);
  return { motifs, archetypes, themes, beats };
}

/** Jaccard exato (mantido para uso pontual, ex.: fallback do /api/compare). */
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Matching semântico leve — frases relacionadas ganham crédito parcial
// ("fogo" ≈ "fogo do conhecimento", "herói" ≈ "jornada do herói").
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "da", "do", "das", "dos",
  "em", "no", "na", "nos", "nas", "por", "com", "para", "sem", "ao",
  "aos", "à", "às", "que", "se", "sua", "seu", "suas", "seus", "ser",
  "serem", "e", "ou", "como", "the", "of", "and",
]);

/** Tokens significativos de uma frase (sem stopwords). */
function tokens(s: string): string[] {
  return normalizeText(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Similaridade entre duas frases (0–1):
 * - 1.0 quando iguais após normalização;
 * - crédito parcial (0–0.75) proporcional à sobreposição de tokens;
 * - 0 quando não há tokens em comum.
 */
export function phraseSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setB = new Set(tb);
  let inter = 0;
  for (const t of new Set(ta)) {
    if (setB.has(t)) inter += 1;
  }
  if (inter === 0) return 0;
  const ratio = inter / Math.max(ta.length, tb.length);
  //match parcial vale menos que exato; sobreposição ≥ 50% dos tokens é forte
  return ratio >= 0.5 ? 0.75 : ratio * 0.5;
}

/**
 * Similaridade bidirecional entre duas listas de frases (0–1).
 * Para cada item, considera o melhor par da outra lista; normaliza pelo
 * tamanho da maior lista. Substitui o Jaccard exato, que era excessivamente
 * rigoroso com frases multi-palavra.
 */
export function listSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const total = Math.max(a.length, b.length);
  let sum = 0;
  for (const x of a) {
    let best = 0;
    for (const y of b) {
      if (best < 1) best = Math.max(best, phraseSimilarity(x, y));
    }
    sum += best;
  }
  for (const y of b) {
    let best = 0;
    for (const x of a) {
      if (best < 1) best = Math.max(best, phraseSimilarity(x, y));
    }
    sum += best;
  }
  return total === 0 ? 0 : sum / (2 * total);
}

/**
 * Correção monotônica do score bruto para leitura humana.
 *
 * `listSimilarity` é conservadora por construção (normaliza pelo maior
 * conjunto e exige sobreposição de vocabulário), então narrativas claramente
 * aparentadas tendem a cair na faixa 10–35. A curva `x^0.6` preserva
 * integralmente a ordem (não inventa ranking), apenas redistribui a escala
 * para a faixa 25–95. O valor bruto continua exposto no breakdown e em
 * `rawScore`; não é uma probabilidade.
 */
export function calibrateScore(raw: number): number {
  const clamped = Math.min(100, Math.max(0, raw));
  if (clamped === 0) return 0;
  return round2(Math.min(99, Math.max(5, 100 * Math.pow(clamped / 100, 0.6))));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Dimension {
  weight: number;
  a: string[];
  b: string[];
}

/**
 * Score composto ponderado (0–100) com breakdown por dimensão (0–100).
 *
 * Duas regras de justiça:
 * 1. Matching semântico leve (listSimilarity) em vez de igualdade exata.
 * 2. A média ponderada considera apenas dimensões ATIVAS (com dados nos dois
 *    lados) — assim o catálogo (sem beats) não é penalizado na dimensão
 *    "structure", e análises rápidas não são punidas por agentes ausentes.
 */
export function scorePair(
  fp: Fingerprint,
  other: Fingerprint,
  weights: Partial<Record<keyof ScoreBreakdown, number>> = SIMILARITY_WEIGHTS
): { score: number; breakdown: ScoreBreakdown } {
  const dims: Record<keyof ScoreBreakdown, Dimension> = {
    motifs: { weight: weights.motifs ?? SIMILARITY_WEIGHTS.motifs, a: fp.motifs, b: other.motifs },
    archetypes: {
      weight: weights.archetypes ?? SIMILARITY_WEIGHTS.archetypes,
      a: fp.archetypes,
      b: other.archetypes,
    },
    themes: { weight: weights.themes ?? SIMILARITY_WEIGHTS.themes, a: fp.themes, b: other.themes },
    structure: {
      weight: weights.structure ?? SIMILARITY_WEIGHTS.structure,
      a: fp.beats,
      b: other.beats,
    },
  };

  const breakdown: ScoreBreakdown = {
    motifs: 0,
    archetypes: 0,
    themes: 0,
    structure: 0,
  };

  let weightedSum = 0;
  let weightSum = 0;
  for (const key of Object.keys(dims) as (keyof ScoreBreakdown)[]) {
    const dim = dims[key];
    if (dim.a.length > 0 && dim.b.length > 0) {
      const sim = round2(listSimilarity(dim.a, dim.b) * 100);
      breakdown[key] = sim;
      weightedSum += sim * dim.weight;
      weightSum += dim.weight;
    }
  }

  const score = weightSum > 0 ? round2(weightedSum / weightSum) : 0;
  return { score, breakdown };
}

/** Mapeia uma entrada do catálogo para fingerprint (beats vazio). */
export function catalogEntryToFingerprint(entry: CatalogEntry): Fingerprint {
  return {
    motifs: dedup(entry.motifs),
    archetypes: dedup(entry.archetypes),
    themes: dedup(entry.themes),
    beats: [],
  };
}

export interface CandidateMatch {
  entry: CatalogEntry;
  score: number;
  breakdown: ScoreBreakdown;
}

/**
 * Recupera os melhores candidatos do catálogo para um fingerprint dado.
 * Ordena por score desc, descarta score <= 0, retorna top n (default 8).
 */
export function retrieveCandidates(
  fp: Fingerprint,
  n = 8,
  weights?: Partial<Record<keyof ScoreBreakdown, number>>
): CandidateMatch[] {
  const matches: CandidateMatch[] = CATALOG.map((entry) => {
    const { score, breakdown } = scorePair(fp, catalogEntryToFingerprint(entry), weights);
    return { entry, score, breakdown };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
  return matches.slice(0, n);
}
