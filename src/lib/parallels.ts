/**
 * Montagem de conexões determinísticas a partir do catálogo.
 *
 * Módulo **puro** (sem Node, sem LLM) — usado tanto pelo backend (motor local)
 * quanto pelo cliente (recalcular o grafo quando o usuário ajusta os pesos).
 */
import { CATALOG } from "@/lib/oracle-catalog";
import {
  calibrateScore,
  catalogEntryToFingerprint,
  normalizeText,
  retrieveCandidates,
  scorePair,
} from "@/lib/similarity";
import type { Connection, Fingerprint, ScoreBreakdown } from "@/lib/oracle-types";

export interface BuildConnectionsOptions {
  /** pesos customizados (0–1); padrão = SIMILARITY_WEIGHTS */
  weights?: Partial<Record<keyof ScoreBreakdown, number>>;
  /** quantidade de conexões retornadas */
  limit?: number;
  /** quantos candidatos avaliar antes do corte */
  poolSize?: number;
}

/** Recupera a grafia "de exibição" (com acentos) de um termo normalizado. */
function displayOf(normalized: string, source: string[]): string {
  return (
    source.find((item) => normalizeText(item) === normalized) ??
    normalized.charAt(0).toUpperCase() + normalized.slice(1)
  );
}

function listDisplay(normalized: string[], source: string[], max: number): string {
  return normalized.slice(0, max).map((n) => displayOf(n, source)).join(", ");
}

function isSelf(candidateName: string, factsName: string): boolean {
  const a = normalizeText(candidateName);
  const b = normalizeText(factsName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Constrói as conexões: score determinístico + convergências/diferenças
 * derivadas dos fingerprints reais do catálogo.
 */
export function buildParallelConnections(
  fingerprint: Fingerprint,
  factsName: string,
  options: BuildConnectionsOptions = {}
): Connection[] {
  const { weights, limit = 5, poolSize = 10 } = options;

  const candidates = retrieveCandidates(fingerprint, poolSize, weights)
    .filter((c) => !isSelf(c.entry.name, factsName))
    .slice(0, limit);

  return candidates.map((cand) => {
    const other = catalogEntryToFingerprint(cand.entry);
    const sharedMotifs = fingerprint.motifs.filter((m) => other.motifs.includes(m));
    const sharedArchetypes = fingerprint.archetypes.filter((a) =>
      other.archetypes.includes(a)
    );
    const sharedThemes = fingerprint.themes.filter((t) => other.themes.includes(t));
    const sharedBeats = fingerprint.beats.filter((b) => other.beats.includes(b));

    const categories: string[] = [];
    if (sharedMotifs.length > 0) categories.push("simbólica");
    if (sharedArchetypes.length > 0) categories.push("arquetípica");
    if (sharedThemes.length > 0) categories.push("temática");
    if (sharedBeats.length > 0) categories.push("estrutural");
    if (categories.length === 0) categories.push("temática");

    const convergences: string[] = [];
    if (sharedMotifs.length > 0) {
      convergences.push(
        `Motivos em comum: ${listDisplay(sharedMotifs, cand.entry.motifs, 3)}.`
      );
    }
    if (sharedArchetypes.length > 0) {
      convergences.push(
        `Arquétipos equivalentes: ${listDisplay(sharedArchetypes, cand.entry.archetypes, 2)}.`
      );
    }
    if (sharedThemes.length > 0) {
      convergences.push(
        `Temas compartilhados: ${listDisplay(sharedThemes, cand.entry.themes, 2)}.`
      );
    }
    if (sharedBeats.length > 0) {
      convergences.push(
        `Beats estruturais equivalentes: ${sharedBeats.slice(0, 3).join(", ")}.`
      );
    }
    if (convergences.length < 3) {
      convergences.push(
        "Ambas organizam a transformação do protagonista em torno de uma provação que redefine sua identidade."
      );
    }

    const reasonParts: string[] = [];
    if (sharedMotifs.length > 0) {
      reasonParts.push(`motivos (${listDisplay(sharedMotifs, cand.entry.motifs, 2)})`);
    }
    if (sharedArchetypes.length > 0) {
      reasonParts.push(
        `arquétipos (${listDisplay(sharedArchetypes, cand.entry.archetypes, 1)})`
      );
    }
    if (sharedThemes.length > 0) {
      reasonParts.push(`temas (${listDisplay(sharedThemes, cand.entry.themes, 1)})`);
    }

    return {
      name: cand.entry.name,
      origin: cand.entry.origin,
      type: cand.entry.type,
      score: calibrateScore(cand.score),
      rawScore: cand.score,
      breakdown: cand.breakdown,
      convergences: convergences.slice(0, 5),
      differences: [
        `Contextos culturais distintos: ${cand.entry.origin} (${cand.entry.period}) em relação a ${factsName}.`,
        sharedThemes[0]
          ? `Ênfase temática própria: ${cand.entry.themes[0]} — enquanto a narrativa analisada destaca ${displayOf(sharedThemes[0], cand.entry.themes)}.`
          : `Ênfase temática própria: ${cand.entry.themes[0] ?? "—"}.`,
        "Meio expressivo e época de registro diferentes moldam o modo de narrar.",
      ],
      categories,
      reason:
        reasonParts.length > 0
          ? `Convergência em ${reasonParts.join(", ")}.`
          : `Ecos temáticos com ${cand.entry.name} (${cand.entry.origin}).`,
    } satisfies Connection;
  });
}

/** Recalcula o score de uma entrada específica com pesos do usuário. */
export function scoreEntry(
  fingerprint: Fingerprint,
  entryName: string,
  weights: Partial<Record<keyof ScoreBreakdown, number>>
): { score: number; breakdown: ScoreBreakdown } | null {
  const entry = CATALOG.find((e) => normalizeText(e.name) === normalizeText(entryName));
  if (!entry) return null;
  return scorePair(fingerprint, catalogEntryToFingerprint(entry), weights);
}
