/**
 * Oráculo das Conexões Narrativas — Contrato de tipos compartilhado
 * Fonte única de verdade entre frontend (2-b) e backend (2-a).
 * NÃO alterar sem atualizar o worklog.
 */

export type MediaType =
  | "mito"
  | "lenda"
  | "filme"
  | "serie"
  | "livro"
  | "musica"
  | "arte";

export type AnalysisDepth = "rapida" | "completa";

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  mito: "Mito",
  lenda: "Lenda",
  filme: "Filme",
  serie: "Série",
  livro: "Livro",
  musica: "Música",
  arte: "Arte",
};

/** Paleta "Cyber-Classical" (spec dos blueprints: mito=dourado, filme=indigo/azul, livro=verde) */
export const MEDIA_TYPE_COLORS: Record<MediaType, string> = {
  mito: "#eab308", // dourado
  lenda: "#d97706", // âmbar terroso
  filme: "#818cf8", // indigo
  serie: "#a78bfa", // violeta
  livro: "#4ade80", // verde
  musica: "#f472b6", // rosa
  arte: "#2dd4bf", // teal
};

/** Pesos do fingerprint narrativo (transparentes na UI, spec dos blueprints) */
export const SIMILARITY_WEIGHTS = {
  motifs: 0.35,
  archetypes: 0.25,
  themes: 0.25,
  structure: 0.15,
} as const;

export type SimilarityWeights = typeof SIMILARITY_WEIGHTS;

/** IDs canônicos dos agentes (ordem de exibição) */
export const AGENT_IDS = [
  "facts",
  "structure",
  "archetypes",
  "symbols",
  "themes",
  "psychoanalysis",
  "cultural",
  "parallels",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_LABELS: Record<AgentId, string> = {
  facts: "Agente Identificador",
  structure: "Agente Estruturalista",
  archetypes: "Agente Arquetípico",
  symbols: "Agente Simbólico",
  themes: "Agente Filosófico-Temático",
  psychoanalysis: "Agente Psicanalítico",
  cultural: "Agente Cultural-Histórico",
  parallels: "Agente Comparativo Mitológico",
};

/** Personas dos agentes — vozes distintas extraídas dos blueprints legados. */
export const AGENT_PERSONAS: Record<AgentId, string> = {
  facts: "O Arquivista",
  structure: "O Arquiteto Narrativo",
  archetypes: "O Dramaturgo",
  symbols: "O Simbolista",
  themes: "O Filósofo",
  psychoanalysis: "O Psicanalista",
  cultural: "O Historiador Social",
  parallels: "O Comparativista",
};

/** Agentes executados por profundidade */
export const DEPTH_AGENTS: Record<AnalysisDepth, AgentId[]> = {
  rapida: ["facts", "structure", "symbols", "parallels"],
  completa: [...AGENT_IDS],
};

/**
 * Motor que produziu a análise.
 * - "llm": agentes especialistas apoiados em um modelo de linguagem;
 * - "local": motor hermenêutico determinístico sobre o catálogo curado
 *   (modo demonstração — funciona sem chave de API).
 */
export type AnalysisEngine = "llm" | "local";

/**
 * Origem do conteúdo de uma análise.
 * - "llm": gerado pelos agentes;
 * - "reference": dossiê curado (extraído do acervo legado);
 * - "catalog": derivado do catálogo curado;
 * - "heuristic": derivado por heurística simbólica.
 */
export type AnalysisSource = "llm" | "reference" | "catalog" | "heuristic";

// ---------------------------------------------------------------------------
// Fatos da narrativa (Agente Identificador)
// ---------------------------------------------------------------------------

export interface NarrativeFacts {
  name: string;
  type: MediaType;
  /** origem cultural, ex: "Mitologia Grega" */
  origin: string;
  /** período aproximado, ex: "séc. VIII a.C." */
  period: string;
  /** personagens principais (0–6) */
  characters: string[];
  /** sinopse breve (máx. ~100 palavras) */
  synopsis: string;
  /** narrativa reconhecida pelo agente? */
  found: boolean;
  /** variantes de título sugeridas quando found=false */
  variants: string[];
}

// ---------------------------------------------------------------------------
// Saídas dos agentes especialistas
// ---------------------------------------------------------------------------

export interface HeroJourneyStage {
  /** ex: "Chamado à Aventura" */
  stage: string;
  present: boolean;
  /** evidência textual/cena específica (curta) */
  evidence: string;
}

export interface StructureAnalysis {
  /** parágrafo resumo (máx. ~120 palavras) */
  summary: string;
  acts: number;
  /** beats principais, ex: ["chamado_a_aventura", "provação", "retorno"] */
  beats: string[];
  incitingIncident: string;
  climax: string;
  resolution: string;
  /** os 12 estágios de Campbell (apenas os relevantes, ou todos) */
  heroJourney: HeroJourneyStage[];
  tone: string;
  /** 0–1 */
  confidence: number;
}

export interface ArchetypeEntry {
  character: string;
  /** Herói, Mentor, Sombra, Trickster, Anima/Animus... */
  archetype: string;
  /** papel + objetivo consciente/inconsciente (curto) */
  description: string;
}

export interface ArchetypeAnalysis {
  summary: string;
  archetypes: ArchetypeEntry[];
  /** nota sobre processo de individuação ("não aplicável" se for o caso) */
  individuation: string;
  confidence: number;
}

export interface SymbolEntry {
  /** ex: "fogo", "travessia da água" */
  symbol: string;
  meaning: string;
  /** significado universal (vazio se muito específico) */
  universalMeaning: string;
  presence: "leve" | "moderado" | "forte";
  /** comparáveis históricos, ex: ["Gilgamesh", "Noé"] */
  historicalParallels: string[];
}

export interface SymbolAnalysis {
  summary: string;
  symbols: SymbolEntry[];
  confidence: number;
}

export interface ThematicAnalysis {
  summary: string;
  /** temas universais (2–4 palavras cada) */
  themes: string[];
  existentialQuestions: string[];
  ethicalDilemmas: string[];
  confidence: number;
}

export interface PsychoanalysisData {
  summary: string;
  complexes: string[];
  unconsciousDesires: string[];
  /** leitura freudiana (1 parágrafo) */
  freudianReading: string;
  /** leitura junguiana (1 parágrafo) */
  jungianReading: string;
  /** true se for interpretação especulativa */
  speculative: boolean;
  disclaimer: string;
  confidence: number;
}

/**
 * Agente Cultural-Histórico ("O Historiador Social").
 * Presente nos blueprints legados e no relatório de "O Senhor dos Anéis",
 * estava ausente da implementação original — incorporado nesta versão.
 */
export interface CulturalAnalysis {
  summary: string;
  /** parágrafo sobre o momento histórico de criação/produção */
  historicalContext: string;
  /** influências, fontes e linhagens reconhecíveis */
  culturalInfluences: string[];
  /** valores da época refletidos, contestados ou subvertidos */
  valuesAndTensions: string[];
  /** recepção, impacto e diálogo cultural */
  reception: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Fingerprint narrativo + similaridade
// ---------------------------------------------------------------------------

export interface Fingerprint {
  /** normalizados: lowercase, sem acentos */
  motifs: string[];
  archetypes: string[];
  themes: string[];
  beats: string[];
}

export interface ScoreBreakdown {
  motifs: number;
  archetypes: number;
  themes: number;
  structure: number;
}

export interface Connection {
  name: string;
  origin: string;
  type: MediaType;
  /** 0–100, índice calibrado exibido na UI (ranking idêntico ao bruto) */
  score: number;
  /**
   * 0–100, similaridade bruta do fingerprint (média ponderada de listSimilarity).
   * Preservada para auditoria: o índice exibido é uma correção monotônica.
   */
  rawScore?: number;
  /** transparência do cálculo (exibida na UI) */
  breakdown: ScoreBreakdown;
  /** 3–5 pontos de convergência específicos */
  convergences: string[];
  /** 2–3 diferenças significativas */
  differences: string[];
  /** ["estrutural","arquetípica","simbólica","temática"] */
  categories: string[];
  /** justificativa curta legível (máx. ~40 palavras) */
  reason: string;
}

// ---------------------------------------------------------------------------
// Resultado completo da análise
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  /** id no banco (cache/feedback) */
  id: string;
  /** input original do usuário */
  input: string;
  facts: NarrativeFacts;
  structure: StructureAnalysis | null;
  archetypes: ArchetypeAnalysis | null;
  symbols: SymbolAnalysis | null;
  themes: ThematicAnalysis | null;
  psychoanalysis: PsychoanalysisData | null;
  cultural: CulturalAnalysis | null;
  /** paralelos ordenados por score desc */
  parallels: Connection[];
  fingerprint: Fingerprint;
  /** 0–1 */
  confidence: number;
  /** resumo executivo do Orquestrador (80–120 palavras) */
  summary: string;
  cached: boolean;
  /** motor que produziu a análise */
  engine: AnalysisEngine;
  /** origem predominante do conteúdo */
  source: AnalysisSource;
  /** ISO string */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Eventos do stream SSE de análise
// ---------------------------------------------------------------------------

export type AgentRunStatus = "pending" | "running" | "done" | "failed";

export interface AgentStatus {
  id: AgentId;
  label: string;
  status: AgentRunStatus;
}

export type AnalyzeStreamEvent =
  | { type: "start"; agents: AgentStatus[] }
  | { type: "agent_start"; id: AgentId }
  | { type: "agent_done"; id: AgentId; confidence?: number }
  | { type: "agent_failed"; id: AgentId; error?: string }
  | { type: "complete"; result: AnalysisResult }
  | { type: "error"; message: string };

// ---------------------------------------------------------------------------
// Comparação profunda (modal)
// ---------------------------------------------------------------------------

export interface ComparisonResult {
  a: { name: string; origin: string; essence: string };
  b: { name: string; origin: string; essence: string };
  /** 0–100 */
  score: number;
  /** convergências agrupadas por categoria */
  convergences: { title: string; points: string[] }[];
  differences: string[];
  sharedSymbols: string[];
  categories: string[];
  /** parágrafo explicando o paralelismo (80–120 palavras) */
  narrative: string;
  disclaimer: string;
}

export interface CompareRequest {
  aName: string;
  aOrigin: string;
  bName: string;
  bOrigin: string;
  /** motivos conhecidos de cada lado para dar contexto ao LLM */
  aMotifs?: string[];
  bMotifs?: string[];
}

// ---------------------------------------------------------------------------
// Arte-síntese (imagem gerada por IA)
// ---------------------------------------------------------------------------

export interface ArtworkRequest {
  aName: string;
  bName: string;
  motif?: string;
}

export interface ArtworkResponse {
  dataUrl: string;
}

// ---------------------------------------------------------------------------
// Catálogo curado
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  id: string;
  name: string;
  type: MediaType;
  origin: string;
  period: string;
  synopsis: string;
  motifs: string[];
  archetypes: string[];
  themes: string[];
  characters: string[];
}

export interface CatalogResponse {
  entries: CatalogEntry[];
  total: number;
}

// ---------------------------------------------------------------------------
// Feedback / histórico
// ---------------------------------------------------------------------------

export interface EngineStatus {
  ok: boolean;
  engine: "zai" | "openai" | "local";
  provider: string;
  model: string;
  reason: string;
  /** "browser" = build estático (GitHub Pages), persistido em localStorage */
  store: "prisma" | "file" | "browser";
  catalog: {
    narratives: number;
    traditions: number;
    motifs: number;
    archetypes: number;
    themes: number;
  };
  timestamp: string;
}

export interface FeedbackRequest {
  analysisId: string;
  useful: boolean;
  comment?: string;
}

export interface AnalysisListItem {
  id: string;
  input: string;
  createdAt: string;
}
