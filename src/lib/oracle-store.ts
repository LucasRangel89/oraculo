"use client";

/**
 * Estado global do Oráculo (zustand).
 * Orquestra views (search → analyzing → result), abas, stream SSE,
 * modal de comparação, arte-síntese, feedback e catálogo.
 */
import { create } from "zustand";
import { toast } from "@/hooks/use-toast";
import {
  AGENT_LABELS,
  DEPTH_AGENTS,
  type AgentId,
  type AgentStatus,
  type AnalysisDepth,
  type AnalysisListItem,
  type AnalysisResult,
  type CatalogEntry,
  type ComparisonResult,
} from "@/lib/oracle-types";
import {
  fetchAnalysis,
  fetchCatalog,
  fetchRecentAnalyses,
  requestArtwork,
  requestComparison,
  streamAnalyze,
  submitFeedback,
} from "@/lib/oracle-client";

export type OracleView = "search" | "analyzing" | "result";
export type OracleTab = "analise" | "explorar" | "documentacao";

interface ComparisonState {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: ComparisonResult | null;
  artwork: string | null;
  artworkLoading: boolean;
  aName: string;
  aOrigin: string;
  bName: string;
  bOrigin: string;
}

export const EMPTY_COMPARISON: ComparisonState = {
  open: false,
  loading: false,
  error: null,
  data: null,
  artwork: null,
  artworkLoading: false,
  aName: "",
  aOrigin: "",
  bName: "",
  bOrigin: "",
};

interface CompareTarget {
  aName: string;
  aOrigin: string;
  bName: string;
  bOrigin: string;
  aMotifs?: string[];
}

interface OracleState {
  // navegação / formulário
  view: OracleView;
  tab: OracleTab;
  input: string;
  depth: AnalysisDepth;

  // progresso da análise
  agentStatuses: AgentStatus[];
  progress: number;
  result: AnalysisResult | null;
  error: string | null;
  feedbackSent: boolean;

  // histórico / catálogo
  recent: AnalysisListItem[];
  catalog: CatalogEntry[];
  catalogLoading: boolean;

  // modal de comparação profunda
  comparison: ComparisonState;

  // actions
  setTab: (tab: OracleTab) => void;
  setInput: (input: string) => void;
  setDepth: (depth: AnalysisDepth) => void;
  loadRecent: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  startAnalysis: () => Promise<void>;
  loadCached: (id: string) => Promise<void>;
  openComparison: (target: CompareTarget) => Promise<void>;
  closeComparison: () => void;
  generateArtwork: () => Promise<void>;
  submitFeedbackAction: (useful: boolean, comment?: string) => Promise<void>;
  resetToSearch: () => void;
}

/** AbortController do stream em curso (fora do estado: não serializável). */
let analyzeAbort: AbortController | null = null;

function initialStatuses(depth: AnalysisDepth): AgentStatus[] {
  return DEPTH_AGENTS[depth].map((id: AgentId) => ({
    id,
    label: AGENT_LABELS[id],
    status: "pending" as const,
  }));
}

/** 5 + 90 × (concluídos/total); 'failed' conta como concluído. */
function progressFromStatuses(statuses: AgentStatus[]): number {
  if (statuses.length === 0) return 5;
  const finished = statuses.filter(
    (s) => s.status === "done" || s.status === "failed"
  ).length;
  return 5 + Math.round((90 * finished) / statuses.length);
}

export const useOracleStore = create<OracleState>()((set, get) => ({
  view: "search",
  tab: "analise",
  input: "",
  depth: "completa",

  agentStatuses: initialStatuses("completa"),
  progress: 0,
  result: null,
  error: null,
  feedbackSent: false,

  recent: [],
  catalog: [],
  catalogLoading: false,

  comparison: { ...EMPTY_COMPARISON },

  setTab: (tab) => set({ tab }),

  setInput: (input) => set({ input }),

  setDepth: (depth) =>
    set({ depth, agentStatuses: initialStatuses(depth) }),

  loadRecent: async () => {
    try {
      const items = await fetchRecentAnalyses();
      set({ recent: items });
    } catch {
      // Histórico é opcional: falha silenciosa (backend pode estar iniciando).
    }
  },

  loadCatalog: async () => {
    if (get().catalogLoading) return;
    set({ catalogLoading: true });
    try {
      const data = await fetchCatalog();
      set({ catalog: data.entries ?? [], catalogLoading: false });
    } catch {
      set({ catalogLoading: false });
    }
  },

  startAnalysis: async () => {
    const { input, depth } = get();
    const trimmed = input.trim();
    if (trimmed.length < 2) return;

    // Aborta análise anterior, se houver
    analyzeAbort?.abort();
    const controller = new AbortController();
    analyzeAbort = controller;

    set({
      view: "analyzing",
      error: null,
      progress: 5,
      result: null,
      feedbackSent: false,
      agentStatuses: initialStatuses(depth),
    });

    const patchStatus = (id: AgentId, status: AgentStatus["status"]) => {
      set((state) => {
        const agentStatuses = state.agentStatuses.map((s) =>
          s.id === id ? { ...s, status } : s
        );
        return { agentStatuses, progress: progressFromStatuses(agentStatuses) };
      });
    };

    try {
      await streamAnalyze(
        trimmed,
        depth,
        (event) => {
          if (controller.signal.aborted) return;
          switch (event.type) {
            case "start":
              set({ agentStatuses: event.agents });
              break;
            case "agent_start":
              patchStatus(event.id, "running");
              break;
            case "agent_done":
              patchStatus(event.id, "done");
              break;
            case "agent_failed":
              patchStatus(event.id, "failed");
              break;
            case "complete":
              set({
                result: event.result,
                view: "result",
                progress: 100,
                error: null,
              });
              void get().loadRecent();
              break;
            case "error":
              set({ error: event.message, view: "search" });
              toast({
                title: "O Oráculo não pôde concluir",
                description: event.message,
                variant: "destructive",
              });
              break;
          }
        },
        controller.signal
      );
      // Stream terminou sem 'complete' nem 'error' (ex.: conexão caiu)
      if (!controller.signal.aborted && get().view === "analyzing") {
        set({ view: "search", error: "Conexão interrompida antes da conclusão." });
        toast({
          title: "Stream interrompido",
          description: "A análise terminou de forma inesperada. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return; // cancelado pelo usuário
      const message =
        err instanceof Error ? err.message : "Erro desconhecido no servidor.";
      set({ error: message, view: "search" });
      toast({
        title: "Falha na análise",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (analyzeAbort === controller) analyzeAbort = null;
    }
  },

  loadCached: async (id) => {
    try {
      const result = await fetchAnalysis(id);
      set({ result, view: "result", error: null, feedbackSent: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível abrir a análise.";
      toast({
        title: "Análise indisponível",
        description: message,
        variant: "destructive",
      });
    }
  },

  openComparison: async (target) => {
    set({
      comparison: {
        ...EMPTY_COMPARISON,
        open: true,
        loading: true,
        aName: target.aName,
        aOrigin: target.aOrigin,
        bName: target.bName,
        bOrigin: target.bOrigin,
      },
    });
    try {
      const data = await requestComparison({
        aName: target.aName,
        aOrigin: target.aOrigin,
        bName: target.bName,
        bOrigin: target.bOrigin,
        aMotifs: target.aMotifs,
      });
      set((state) => ({
        comparison: { ...state.comparison, loading: false, data, error: null },
      }));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível comparar as narrativas.";
      set((state) => ({
        comparison: { ...state.comparison, loading: false, error: message },
      }));
      toast({
        title: "Erro na comparação",
        description: message,
        variant: "destructive",
      });
    }
  },

  closeComparison: () =>
    set((state) => ({
      comparison: { ...state.comparison, open: false },
    })),

  generateArtwork: async () => {
    const { comparison } = get();
    const data = comparison.data;
    if (!data || comparison.artworkLoading) return;
    set((state) => ({
      comparison: { ...state.comparison, artworkLoading: true },
    }));
    try {
      const res = await requestArtwork({
        aName: data.a.name,
        bName: data.b.name,
        motif: data.sharedSymbols[0],
      });
      set((state) => ({
        comparison: {
          ...state.comparison,
          artwork: res.dataUrl,
          artworkLoading: false,
        },
      }));
    } catch (err) {
      set((state) => ({
        comparison: { ...state.comparison, artworkLoading: false },
      }));
      const message =
        err instanceof Error ? err.message : "Falha ao gerar a arte-síntese.";
      toast({
        title: "Arte-síntese indisponível",
        description: message,
        variant: "destructive",
      });
    }
  },

  submitFeedbackAction: async (useful, comment) => {
    const { result } = get();
    if (!result || get().feedbackSent) return;
    try {
      await submitFeedback({
        analysisId: result.id,
        useful,
        comment: comment?.trim() ? comment.trim() : undefined,
      });
      set({ feedbackSent: true });
      toast({
        title: "Obrigado pelo feedback!",
        description:
          "Sua avaliação ajuda a calibrar as lentes do Oráculo.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível enviar.";
      toast({
        title: "Feedback não enviado",
        description: message,
        variant: "destructive",
      });
    }
  },

  resetToSearch: () => {
    analyzeAbort?.abort();
    analyzeAbort = null;
    set({
      view: "search",
      error: null,
      progress: 0,
      agentStatuses: initialStatuses(get().depth),
      comparison: { ...EMPTY_COMPARISON },
    });
    void get().loadRecent();
  },
}));
