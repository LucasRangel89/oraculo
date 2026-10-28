/**
 * Backend do build estático — roda no navegador.
 *
 * Cada função aqui espelha uma rota de `src/app/api/*` e é chamada
 * transparentemente por `oracle-client.ts` quando o bundle é gerado para o
 * GitHub Pages (`NEXT_PUBLIC_ORACLE_STATIC=1`). A UI não sabe a diferença:
 * continua consumindo o mesmo contrato de `oracle-types.ts`.
 *
 * Importante: o fluxo de eventos de `streamAnalyzeStatic` reproduz o do
 * servidor (start → agent_start → agent_done/agent_failed → complete), para
 * que a tela de progresso gamificada se comporte de forma idêntica.
 */
import {
  findStoredById,
  findStoredByInput,
  listStored,
  saveFeedback,
  saveStored,
} from "@/lib/browser-store";
import { buildArtworkDataUrl } from "@/lib/local-artwork";
import { buildLocalComparison } from "@/lib/local-analysis";
import { NarrativeNotFoundError } from "@/lib/oracle-errors";
import {
  AGENT_LABELS,
  DEPTH_AGENTS,
  type AgentId,
  type AgentRunStatus,
  type AnalysisDepth,
  type AnalysisListItem,
  type AnalysisResult,
  type AnalyzeStreamEvent,
  type ArtworkRequest,
  type ArtworkResponse,
  type CatalogResponse,
  type CompareRequest,
  type ComparisonResult,
  type EngineStatus,
  type FeedbackRequest,
} from "@/lib/oracle-types";
import {
  buildStaticResult,
  makeStaticId,
  searchCatalog,
  staticEngineStatus,
} from "@/lib/static-core";

/** Erro com o mesmo formato do `ApiError` para a UI tratar igual. */
export class StaticApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "StaticApiError";
    this.status = status;
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

// ---------------------------------------------------------------------------
// POST /api/analyze (equivalente SSE)
// ---------------------------------------------------------------------------

/**
 * Executa a análise e emite os mesmos eventos do stream do servidor.
 * O atraso por lente existe para preservar a pedagogia do progresso — e é o
 * único ponto onde a versão estática difere do backend.
 */
export async function streamAnalyzeStatic(
  input: string,
  depth: AnalysisDepth,
  onEvent: (event: AnalyzeStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const trimmed = input.trim();
  const agentIds = DEPTH_AGENTS[depth];
  const emit = (event: AnalyzeStreamEvent) => {
    if (!signal?.aborted) onEvent(event);
  };

  // 1. Cache local por input normalizado
  const cached = findStoredByInput(trimmed);
  if (cached) {
    emit({
      type: "start",
      agents: agentIds.map((id) => ({
        id,
        label: AGENT_LABELS[id],
        status: "done" as AgentRunStatus,
      })),
    });
    emit({
      type: "complete",
      result: { ...cached.payload, input: trimmed, cached: true },
    });
    return;
  }

  emit({
    type: "start",
    agents: agentIds.map((id) => ({
      id,
      label: AGENT_LABELS[id],
      status: "pending" as AgentRunStatus,
    })),
  });

  // 2. Motores locais: dossiê de referência ou catálogo curado
  let draft: AnalysisResult;
  try {
    draft = buildStaticResult({ input: trimmed, depth, id: makeStaticId() });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Narrativa não reconhecida pelo motor local.";
    // O catálogo sabe quais narrativas são vizinhas do input — mostramos as
    // sugestões junto do erro (no servidor elas ficam em `variants`).
    const variants = err instanceof NarrativeNotFoundError ? err.variants.slice(0, 4) : [];
    const full = variants.length > 0 ? `${message} Sugestões: ${variants.join(", ")}.` : message;
    emit({ type: "agent_failed", id: "facts", error: full });
    emit({ type: "error", message: full });
    return;
  }

  // 3. Progresso por lente (mesma ordem do backend)
  for (const id of agentIds) {
    if (signal?.aborted) return;
    emit({ type: "agent_start", id });
    await sleep(140, signal);
    if (signal?.aborted) return;
    const hasValue =
      id === "facts"
        ? true
        : id === "parallels"
          ? draft.parallels.length > 0
          : Boolean(
              draft[
                id as
                  | "structure"
                  | "archetypes"
                  | "symbols"
                  | "themes"
                  | "psychoanalysis"
                  | "cultural"
              ]
            );
    if (hasValue) emit({ type: "agent_done", id });
    else emit({ type: "agent_failed", id, error: "Lente não executada nesta profundidade." });
  }

  // 4. Persistência + conclusão
  const saved = saveStored(draft);
  emit({ type: "complete", result: saved.payload });
}

/** Versão "await" do stream — usada por verificações e pelo teste de fumaça. */
export async function analyzeStatic(
  input: string,
  depth: AnalysisDepth
): Promise<AnalysisResult> {
  return new Promise<AnalysisResult>((resolve, reject) => {
    let result: AnalysisResult | null = null;
    void streamAnalyzeStatic(input, depth, (event) => {
      if (event.type === "complete") result = event.result;
      if (event.type === "error") {
        // recupera as variantes do catálogo (o evento carrega só a mensagem)
        try {
          buildStaticResult({ input, depth, id: "probe" });
          reject(new NarrativeNotFoundError(event.message, []));
        } catch (err) {
          reject(
            err instanceof NarrativeNotFoundError
              ? new NarrativeNotFoundError(event.message, err.variants)
              : err
          );
        }
      }
    })
      .then(() => {
        if (result) resolve(result);
        else reject(new StaticApiError("A análise terminou sem resultado.", 500));
      })
      .catch(reject);
  });
}

// ---------------------------------------------------------------------------
// GET /api/analysis/[id] · GET /api/analyses
// ---------------------------------------------------------------------------

export async function fetchAnalysisStatic(id: string): Promise<AnalysisResult> {
  const record = findStoredById(id);
  if (!record) {
    throw new StaticApiError(
      "Esta análise não está mais no histórico deste navegador. Rode a análise novamente.",
      404
    );
  }
  return { ...record.payload, cached: true };
}

export async function fetchRecentAnalysesStatic(): Promise<AnalysisListItem[]> {
  return listStored()
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      input: item.input,
      createdAt: item.createdAt,
    }));
}

// ---------------------------------------------------------------------------
// GET /api/catalog · GET /api/status
// ---------------------------------------------------------------------------

export async function fetchCatalogStatic(q?: string, type?: string): Promise<CatalogResponse> {
  return searchCatalog(q, type);
}

export async function fetchEngineStatusStatic(): Promise<EngineStatus> {
  return staticEngineStatus();
}

// ---------------------------------------------------------------------------
// POST /api/compare · POST /api/artwork · POST /api/feedback
// ---------------------------------------------------------------------------

export async function requestComparisonStatic(
  req: CompareRequest
): Promise<ComparisonResult> {
  return buildLocalComparison(req.aName, req.aOrigin, req.bName, req.bOrigin);
}

export async function requestArtworkStatic(
  req: ArtworkRequest
): Promise<ArtworkResponse> {
  return {
    dataUrl: buildArtworkDataUrl({
      aName: req.aName,
      bName: req.bName,
      motif: req.motif,
    }),
  };
}

export async function submitFeedbackStatic(payload: FeedbackRequest): Promise<void> {
  saveFeedback(payload);
}
