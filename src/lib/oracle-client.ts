/**
 * Clientes de API do Oráculo.
 *
 * Duas implementações, **um único contrato** (`oracle-types.ts`):
 *
 * - **servidor** (padrão): chamadas relativas a `/api/...`;
 * - **estático** (`NEXT_PUBLIC_ORACLE_STATIC=1`, build do GitHub Pages): as
 *   mesmas funções são atendidas por `client-engine.ts`, que executa o motor
 *   hermenêutico no navegador e persiste em `localStorage`.
 *
 * A escolha é feita em tempo de build (o `NEXT_PUBLIC_*` é inlinado), então o
 * bundle publicado não carrega nenhuma chamada de rede.
 */
import type {
  AnalysisDepth,
  AnalysisListItem,
  AnalysisResult,
  AnalyzeStreamEvent,
  ArtworkRequest,
  ArtworkResponse,
  CatalogResponse,
  CompareRequest,
  EngineStatus,
  ComparisonResult,
  FeedbackRequest,
} from "@/lib/oracle-types";

/** `true` no bundle estático publicado (GitHub Pages). */
export const IS_STATIC = process.env.NEXT_PUBLIC_ORACLE_STATIC === "1";

/** Carrega o backend de navegador sob demanda (não entra no bundle do servidor). */
function staticApi() {
  return import("@/lib/client-engine");
}

// ---------------------------------------------------------------------------
// Erro HTTP com mensagem amigável
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error || data.message || `Erro HTTP ${res.status}`;
  } catch {
    return `Erro HTTP ${res.status}`;
  }
}

// ---------------------------------------------------------------------------
// fetchJSON genérico
// ---------------------------------------------------------------------------

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// SSE — POST /api/analyze
// ---------------------------------------------------------------------------

/**
 * Inicia a análise e consome o stream SSE (text/event-stream).
 * Cada bloco "data: {json}\n\n" é parseado e repassado via onEvent.
 * Linhas ":" (keep-alive) são ignoradas.
 */
export async function streamAnalyze(
  input: string,
  depth: AnalysisDepth,
  onEvent: (event: AnalyzeStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  if (IS_STATIC) {
    const { streamAnalyzeStatic } = await staticApi();
    return streamAnalyzeStatic(input, depth, onEvent, signal);
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, depth }),
    signal,
  });

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }
  if (!res.body) {
    throw new ApiError("Resposta sem corpo de stream.", res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Blocos de evento são separados por linha em branco ("\n\n")
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        handleBlock(block, onEvent);
      }
    }
    // Processa possível bloco final sem "\n\n"
    if (buffer.trim().length > 0) {
      handleBlock(buffer, onEvent);
    }
  } finally {
    reader.releaseLock();
  }
}

function handleBlock(block: string, onEvent: (event: AnalyzeStreamEvent) => void) {
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) continue; // keep-alive / comentário
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
    // "event:", "id:", "retry:" não são usados pelo contrato — ignorados.
  }
  if (dataLines.length === 0) return;
  const payload = dataLines.join("\n");
  try {
    const parsed = JSON.parse(payload) as AnalyzeStreamEvent;
    onEvent(parsed);
  } catch {
    // Bloco malformado: ignora silenciosamente para não matar o stream.
  }
}

// ---------------------------------------------------------------------------
// Endpoints REST
// ---------------------------------------------------------------------------

export async function fetchRecentAnalyses(): Promise<AnalysisListItem[]> {
  if (IS_STATIC) {
    const { fetchRecentAnalysesStatic } = await staticApi();
    return fetchRecentAnalysesStatic();
  }
  const data = await fetchJSON<{ items: AnalysisListItem[] }>("/api/analyses");
  return data.items ?? [];
}

export async function fetchCatalog(
  q?: string,
  type?: string
): Promise<CatalogResponse> {
  if (IS_STATIC) {
    const { fetchCatalogStatic } = await staticApi();
    return fetchCatalogStatic(q, type);
  }
  const params = new URLSearchParams();
  if (q && q.trim()) params.set("q", q.trim());
  if (type && type !== "todos") params.set("type", type);
  const qs = params.toString();
  return fetchJSON<CatalogResponse>(`/api/catalog${qs ? `?${qs}` : ""}`);
}

export async function fetchAnalysis(id: string): Promise<AnalysisResult> {
  if (IS_STATIC) {
    const { fetchAnalysisStatic } = await staticApi();
    return fetchAnalysisStatic(id);
  }
  return fetchJSON<AnalysisResult>(`/api/analysis/${encodeURIComponent(id)}`);
}

export async function submitFeedback(payload: FeedbackRequest): Promise<void> {
  if (IS_STATIC) {
    const { submitFeedbackStatic } = await staticApi();
    return submitFeedbackStatic(payload);
  }
  await fetchJSON<{ ok: boolean }>("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function requestComparison(
  req: CompareRequest
): Promise<ComparisonResult> {
  if (IS_STATIC) {
    const { requestComparisonStatic } = await staticApi();
    return requestComparisonStatic(req);
  }
  return fetchJSON<ComparisonResult>("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export async function requestArtwork(
  req: ArtworkRequest
): Promise<ArtworkResponse> {
  if (IS_STATIC) {
    const { requestArtworkStatic } = await staticApi();
    return requestArtworkStatic(req);
  }
  return fetchJSON<ArtworkResponse>("/api/artwork", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

// ---------------------------------------------------------------------------
// Exportar / copiar JSON
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "analise";
}

export function downloadJson(result: AnalysisResult): void {
  const blob = new Blob([JSON.stringify(result, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oraculo-${slugify(result.facts?.name || result.input)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyJson(result: AnalysisResult): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// Helpers de UI (data relativa PT-BR, sem dependência de locale do servidor)
// ---------------------------------------------------------------------------

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}


// ---------------------------------------------------------------------------
// GET /api/status — motor ativo, armazenamento e tamanho do acervo
// ---------------------------------------------------------------------------

export async function fetchEngineStatus(): Promise<EngineStatus> {
  if (IS_STATIC) {
    const { fetchEngineStatusStatic } = await staticApi();
    return fetchEngineStatusStatic();
  }
  return fetchJSON<EngineStatus>("/api/status", { cache: "no-store" });
}
