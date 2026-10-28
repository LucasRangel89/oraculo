/**
 * Núcleo do modo estático (GitHub Pages).
 *
 * O GitHub Pages serve apenas arquivos — não existe `/api`. Para que a página
 * publicada seja o produto completo, e não uma casca, toda a análise passa a
 * rodar **no navegador**, reaproveitando o mesmo motor hermenêutico
 * determinístico do backend (`local-analysis.ts`, `parallels.ts`,
 * `similarity.ts`).
 *
 * Este módulo é puro: nada de `fs`, `localStorage` ou `fetch`. A camada de
 * armazenamento do navegador vive em `browser-store.ts` e a orquestração de
 * eventos em `client-engine.ts`.
 */
import { CATALOG } from "@/lib/oracle-catalog";
import { catalogStats } from "@/lib/legacy-archive";
import { buildLocalAnalysis } from "@/lib/local-analysis";
import { normalizeText } from "@/lib/similarity";
import type {
  AnalysisDepth,
  AnalysisResult,
  CatalogEntry,
  CatalogResponse,
  EngineStatus,
  MediaType,
} from "@/lib/oracle-types";

/** `true` quando o bundle foi gerado para o GitHub Pages. */
export const IS_STATIC_BUILD = process.env.NEXT_PUBLIC_ORACLE_STATIC === "1";

/** Modelo declarado pelo motor local — o mesmo do backend. */
export const STATIC_MODEL = "oráculo-hermenêutico-v1";

let seq = 0;

/** Id local no mesmo formato do backend (`an_...`), curto e ordenável. */
export function makeStaticId(): string {
  seq += 1;
  const stamp = Date.now().toString(36);
  const salt = Math.random().toString(36).slice(2, 7);
  return `an_${stamp}${salt}${seq.toString(36)}`;
}

export interface StaticAnalysisOptions {
  input: string;
  depth: AnalysisDepth;
  /** id/createdAt permitem reaproveitar o payload ao reabrir do histórico */
  id?: string;
  createdAt?: string;
}

/**
 * Executa a análise local completa. Lança `NarrativeNotFoundError` quando o
 * input não corresponde ao catálogo nem aos dossiês (a UI mostra as sugestões).
 */
export function buildStaticResult(options: StaticAnalysisOptions): AnalysisResult {
  const { input, depth } = options;
  const id = options.id ?? makeStaticId();
  const createdAt = options.createdAt ?? new Date().toISOString();
  return buildLocalAnalysis({ input, depth, id, createdAt });
}

/** Busca no catálogo — espelha `GET /api/catalog?q=&type=`. */
export function searchCatalog(q?: string, type?: string): CatalogResponse {
  const needle = normalizeText(q ?? "");
  const wanted = (type ?? "").trim();
  let entries: CatalogEntry[] = CATALOG;

  if (wanted && wanted !== "todos") {
    entries = entries.filter((e) => e.type === (wanted as MediaType));
  }

  if (needle) {
    entries = entries.filter((e) => {
      const haystack = normalizeText(
        [
          e.name,
          e.origin,
          e.synopsis,
          e.motifs.join(" "),
          e.archetypes.join(" "),
          e.themes.join(" "),
          e.characters.join(" "),
        ].join(" ")
      );
      return haystack.includes(needle);
    });
  }

  return { entries, total: entries.length };
}

/** Status operacional — espelha `GET /api/status` no build estático. */
export function staticEngineStatus(): EngineStatus {
  return {
    ok: true,
    engine: "local",
    provider: "Motor local (no navegador)",
    model: STATIC_MODEL,
    reason:
      "Página estática publicada no GitHub Pages: toda a análise roda no seu navegador, sem chave de API e sem servidor.",
    store: "browser",
    catalog: catalogStats(),
    timestamp: new Date().toISOString(),
  };
}
