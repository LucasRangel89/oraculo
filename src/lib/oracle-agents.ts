import { MEDIA_TYPE_LABELS } from "@/lib/oracle-types";
import type {
  AnalysisResult,
  ArchetypeAnalysis,
  ArchetypeEntry,
  Connection,
  CulturalAnalysis,
  Fingerprint,
  HeroJourneyStage,
  MediaType,
  NarrativeFacts,
  PsychoanalysisData,
  StructureAnalysis,
  SymbolAnalysis,
  SymbolEntry,
  ThematicAnalysis,
} from "@/lib/oracle-types";
import { callLLMJson } from "@/lib/llm";
import { NarrativeNotFoundError } from "@/lib/oracle-errors";
import {
  ARCHETYPES_SYSTEM,
  CULTURAL_SYSTEM,
  FACTS_SYSTEM,
  PARALLELS_SYSTEM,
  PSYCHOANALYSIS_SYSTEM,
  STRUCTURE_SYSTEM,
  SUMMARY_SYSTEM,
  SYMBOLS_SYSTEM,
  THEMES_SYSTEM,
} from "@/lib/prompt-library";
import { calibrateScore, catalogEntryToFingerprint } from "@/lib/similarity";
import type { CandidateMatch } from "@/lib/similarity";
import { normalizeText } from "@/lib/similarity";

// Reexportado para os demais módulos do backend (rotas /compare etc.).
export { callLLMJson };

// ---------------------------------------------------------------------------
// Erros controlados
// ---------------------------------------------------------------------------

/** Erro emitido quando o Agente Identificador não reconhece a narrativa. */
export { NarrativeNotFoundError };


// ---------------------------------------------------------------------------
// Helpers de extração/validação
// ---------------------------------------------------------------------------
function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return fallback;
}

function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampConfidence(value: unknown, fallback = 0.8): number {
  const n = asNumber(value, fallback);
  return Math.min(1, Math.max(0, n));
}

function truncateWords(s: string, maxWords: number): string {
  const words = s.split(/\s+/);
  if (words.length <= maxWords) return s;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const MEDIA_TYPE_VALUES: MediaType[] = [
  "mito",
  "lenda",
  "filme",
  "serie",
  "livro",
  "musica",
  "arte",
];

/** Normaliza o tipo de mídia retornado pelo LLM para um MediaType válido. */
export function normalizeMediaType(value: unknown): MediaType {
  const raw = normalizeText(asString(value));
  if (!raw) return "livro";
  if (MEDIA_TYPE_VALUES.includes(raw as MediaType)) return raw as MediaType;
  if (/(mitolog|mito)/.test(raw)) return "mito";
  if (/(lend|folclore|folk)/.test(raw)) return "lenda";
  if (/(film|cinema|movie)/.test(raw)) return "filme";
  if (/(seri|tv|televi)/.test(raw)) return "serie";
  if (/(music|can[cç][aã]o|song|[óo]pera)/.test(raw)) return "musica";
  if (/(arte|pintura|quadro|escultura)/.test(raw)) return "arte";
  return "livro";
}

/** Normaliza um beat para snake_case canônico. */
function normalizeBeat(beat: string): string {
  return normalizeText(beat)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Digest compacto dos fatos para contextualizar os agentes. */
function factsDigest(facts: NarrativeFacts): string {
  return [
    `Nome: ${facts.name}`,
    `Tipo: ${MEDIA_TYPE_LABELS[facts.type]}`,
    `Origem: ${facts.origin}`,
    `Período: ${facts.period}`,
    `Personagens: ${facts.characters.join(", ") || "—"}`,
    `Sinopse: ${facts.synopsis}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Agente Identificador (facts)
// ---------------------------------------------------------------------------

export const FACTS_AGENT_CONFIDENCE = 0.85;

export async function runFactsAgent(input: string): Promise<NarrativeFacts> {
  const user = `Narrativa a identificar: "${input}"`;
  const raw = await callLLMJson<Record<string, unknown>>(FACTS_SYSTEM, user);
  const found = raw.found === true;

  if (!found) {
    const variants = asStringArray(raw.variants, 5);
    const suggestion = variants.length > 0 ? variants.join(", ") : "nenhuma sugestão disponível";
    throw new NarrativeNotFoundError(
      `Narrativa não identificada. Sugestões: ${suggestion}`,
      variants
    );
  }

  const characters = asStringArray(raw.characters, 6);
  return {
    name: asString(raw.name, input),
    type: normalizeMediaType(raw.type),
    origin: asString(raw.origin, "Origem não identificada"),
    period: asString(raw.period, "Período não identificado"),
    characters,
    synopsis: asString(raw.synopsis, "Sinopse não disponível."),
    found: true,
    variants: [],
  };
}

// ---------------------------------------------------------------------------
// Agente Estruturalista (structure)
// ---------------------------------------------------------------------------

export const CAMPBELL_STAGES = [
  "Mundo Comum",
  "Chamado à Aventura",
  "Recusa do Chamado",
  "Encontro com o Mentor",
  "Travessia do Primeiro Limiar",
  "Testes, Aliados e Inimigos",
  "Aproximação da Caverna Oculta",
  "Provação",
  "Recompensa",
  "Caminho de Volta",
  "Ressurreição",
  "Retorno com Elixir",
] as const;

function validateHeroJourney(value: unknown): HeroJourneyStage[] {
  const arr = Array.isArray(value) ? value.map(asRecord) : [];
  return CAMPBELL_STAGES.map((stage, index) => {
    const canonical = normalizeText(stage);
    const found =
      arr.find((entry) => {
        const s = normalizeText(asString(entry.stage));
        if (!s) return false;
        return canonical.includes(s) || s.includes(canonical);
      }) ?? arr[index];
    if (found) {
      return {
        stage,
        present: found.present === true,
        evidence: asString(
          found.evidence,
          "Estágio não identificado na narrativa."
        ),
      };
    }
    return {
      stage,
      present: false,
      evidence: "Estágio não identificado na narrativa.",
    };
  });
}

const DEFAULT_BEATS = [
  "chamado_a_aventura",
  "travessia_do_limiar",
  "provacao",
  "climax",
  "retorno",
];

export async function runStructureAgent(
  _input: string,
  facts: NarrativeFacts
): Promise<StructureAnalysis> {
  const user = `Fatos da narrativa:\n${factsDigest(facts)}\n\nProduza a análise estrutural (somente JSON).`;
  const raw = await callLLMJson<Record<string, unknown>>(STRUCTURE_SYSTEM, user);

  const beats = asStringArray(raw.beats, 8)
    .map(normalizeBeat)
    .filter((b) => b.length > 0);

  const actsRaw = Math.round(asNumber(raw.acts, 3));
  const acts = [1, 2, 3, 5].includes(actsRaw) ? actsRaw : 3;

  return {
    summary: asString(raw.summary, "Análise estrutural não disponível."),
    acts,
    beats: beats.length >= 4 ? beats : [...new Set([...beats, ...DEFAULT_BEATS])].slice(0, 8),
    incitingIncident: asString(raw.incitingIncident, "Incidente incitante não identificado."),
    climax: asString(raw.climax, "Clímax não identificado."),
    resolution: asString(raw.resolution, "Resolução não identificada."),
    tone: asString(raw.tone, "tom não identificado"),
    heroJourney: validateHeroJourney(raw.heroJourney),
    confidence: clampConfidence(raw.confidence),
  };
}

// ---------------------------------------------------------------------------
// Agente Arquetípico (archetypes)
// ---------------------------------------------------------------------------

export async function runArchetypesAgent(
  _input: string,
  facts: NarrativeFacts
): Promise<ArchetypeAnalysis> {
  const user = `Fatos da narrativa:\n${factsDigest(facts)}\n\nProduza a análise arquetípica (somente JSON).`;
  const raw = await callLLMJson<Record<string, unknown>>(ARCHETYPES_SYSTEM, user);

  const entries: ArchetypeEntry[] = (Array.isArray(raw.archetypes) ? raw.archetypes : [])
    .slice(0, 6)
    .map((item) => asRecord(item))
    .filter((obj) => asString(obj.archetype).length > 0)
    .map((obj) => ({
      character: asString(obj.character, "—"),
      archetype: asString(obj.archetype),
      description: asString(obj.description, ""),
    }));

  return {
    summary: asString(raw.summary, "Análise arquetípica não disponível."),
    archetypes: entries,
    individuation: asString(raw.individuation, "não aplicável"),
    confidence: clampConfidence(raw.confidence),
  };
}

// ---------------------------------------------------------------------------
// Agente Simbólico (symbols)
// ---------------------------------------------------------------------------

const PRESENCE_VALUES: SymbolEntry["presence"][] = ["leve", "moderado", "forte"];

export async function runSymbolsAgent(
  _input: string,
  facts: NarrativeFacts
): Promise<SymbolAnalysis> {
  const user = `Fatos da narrativa:\n${factsDigest(facts)}\n\nProduza a análise simbólica (somente JSON).`;
  const raw = await callLLMJson<Record<string, unknown>>(SYMBOLS_SYSTEM, user);

  const symbols: SymbolEntry[] = (Array.isArray(raw.symbols) ? raw.symbols : [])
    .slice(0, 6)
    .map((item) => asRecord(item))
    .filter((obj) => asString(obj.symbol).length > 0)
    .map((obj) => {
      const presence = normalizeText(asString(obj.presence, "moderado"));
      return {
        symbol: asString(obj.symbol),
        meaning: asString(obj.meaning, ""),
        universalMeaning: asString(obj.universalMeaning, ""),
        presence: (PRESENCE_VALUES.includes(presence as SymbolEntry["presence"])
          ? presence
          : "moderado") as SymbolEntry["presence"],
        historicalParallels: asStringArray(obj.historicalParallels, 3),
      };
    });

  return {
    summary: asString(raw.summary, "Análise simbólica não disponível."),
    symbols,
    confidence: clampConfidence(raw.confidence),
  };
}

// ---------------------------------------------------------------------------
// Agente Filosófico-Temático (themes)
// ---------------------------------------------------------------------------

export async function runThemesAgent(
  _input: string,
  facts: NarrativeFacts
): Promise<ThematicAnalysis> {
  const user = `Fatos da narrativa:\n${factsDigest(facts)}\n\nProduza a análise filosófico-temática (somente JSON).`;
  const raw = await callLLMJson<Record<string, unknown>>(THEMES_SYSTEM, user);

  return {
    summary: asString(raw.summary, "Análise temática não disponível."),
    themes: asStringArray(raw.themes, 5),
    existentialQuestions: asStringArray(raw.existentialQuestions, 4),
    ethicalDilemmas: asStringArray(raw.ethicalDilemmas, 3),
    confidence: clampConfidence(raw.confidence),
  };
}

// ---------------------------------------------------------------------------
// Agente Psicanalítico (psychoanalysis)
// ---------------------------------------------------------------------------

export async function runPsychoanalysisAgent(
  _input: string,
  facts: NarrativeFacts
): Promise<PsychoanalysisData> {
  const user = `Fatos da narrativa:\n${factsDigest(facts)}\n\nProduza a leitura psicanalítica (somente JSON).`;
  const raw = await callLLMJson<Record<string, unknown>>(PSYCHOANALYSIS_SYSTEM, user);

  return {
    summary: asString(raw.summary, "Leitura psicanalítica não disponível."),
    complexes: asStringArray(raw.complexes, 4),
    unconsciousDesires: asStringArray(raw.unconsciousDesires, 4),
    freudianReading: asString(raw.freudianReading, ""),
    jungianReading: asString(raw.jungianReading, ""),
    speculative: raw.speculative !== false,
    disclaimer: asString(
      raw.disclaimer,
      "Leitura interpretativa de caráter especulativo; não constitui diagnóstico clínico nem afirmação factual sobre os autores."
    ),
    confidence: clampConfidence(raw.confidence),
  };
}

// ---------------------------------------------------------------------------
// Agente Cultural-Histórico (cultural) — "O Historiador Social"
// Lente presente nos blueprints legados e no relatório de O Senhor dos Anéis
// ("contexto histórico", "diálogo cultural", "intertextualidade").
// ---------------------------------------------------------------------------

export async function runCulturalAgent(
  _input: string,
  facts: NarrativeFacts
): Promise<CulturalAnalysis> {
  const user = `Fatos da narrativa:\n${factsDigest(facts)}\n\nProduza a leitura cultural-histórica (somente JSON).`;
  const raw = await callLLMJson<Record<string, unknown>>(CULTURAL_SYSTEM, user);

  return {
    summary: asString(raw.summary, "Leitura cultural-histórica não disponível."),
    historicalContext: asString(raw.historicalContext, ""),
    culturalInfluences: asStringArray(raw.culturalInfluences, 5),
    valuesAndTensions: asStringArray(raw.valuesAndTensions, 4),
    reception: asString(raw.reception, ""),
    confidence: clampConfidence(raw.confidence),
  };
}

// ---------------------------------------------------------------------------
// Agente Comparativo Mitológico (parallels) — com GROUNDING no catálogo
// ---------------------------------------------------------------------------

function candidatesDigest(candidates: CandidateMatch[]): string {
  return candidates
    .map((cand, i) => {
      const e = cand.entry;
      return [
        `${i + 1}. "${e.name}" (origem: ${e.origin}; tipo: ${MEDIA_TYPE_LABELS[e.type]})`,
        `   motivos: ${e.motifs.join(", ")}`,
        `   arquétipos: ${e.archetypes.join(", ")}`,
        `   temas: ${e.themes.join(", ")}`,
        `   score determinístico: ${cand.score}`,
      ].join("\n");
    })
    .join("\n");
}

/** Partes determinísticas de uma conexão (motivos compartilhados, categorias, reason). */
function deterministicParts(fingerprint: Fingerprint, cand: CandidateMatch) {
  const cf = catalogEntryToFingerprint(cand.entry);
  const sharedMotifs = fingerprint.motifs.filter((m) => cf.motifs.includes(m));
  const sharedArchetypes = fingerprint.archetypes.filter((a) =>
    cf.archetypes.includes(a)
  );
  const sharedThemes = fingerprint.themes.filter((t) => cf.themes.includes(t));
  const sharedBeats = fingerprint.beats.filter((b) => cf.beats.includes(b));

  const categories: string[] = [];
  if (sharedBeats.length > 0) categories.push("estrutural");
  if (sharedArchetypes.length > 0) categories.push("arquetípica");
  if (sharedMotifs.length > 0) categories.push("simbólica");
  if (sharedThemes.length > 0) categories.push("temática");
  if (categories.length === 0) categories.push("temática");

  const convergences: string[] = [];
  if (sharedMotifs.length > 0) {
    convergences.push(
      `Motivos simbólicos compartilhados: ${sharedMotifs.slice(0, 3).join(", ")}.`
    );
  }
  if (sharedArchetypes.length > 0) {
    convergences.push(
      `Arquétipos em comum: ${sharedArchetypes.slice(0, 2).join(", ")}.`
    );
  }
  if (sharedThemes.length > 0) {
    convergences.push(
      `Temas recorrentes: ${sharedThemes.slice(0, 2).join(", ")}.`
    );
  }
  if (sharedBeats.length > 0) {
    convergences.push(
      `Beats estruturais equivalentes: ${sharedBeats.slice(0, 3).join(", ")}.`
    );
  }
  if (convergences.length < 3) {
    convergences.push(
      `Ambas as narrativas dialogam com o imaginário coletivo e mobilizam provações transformadoras do protagonista.`
    );
  }

  const differences: string[] = [
    `Origem e contexto distintos: ${cand.entry.origin} (${cand.entry.period}).`,
    `Meio expressivo diferente: ${MEDIA_TYPE_LABELS[cand.entry.type]} em contraste com a narrativa analisada.`,
    `Ênfase temática própria do repertório de ${cand.entry.name}.`,
  ];

  const sharedBits = [
    sharedMotifs.slice(0, 2).join(", "),
    sharedArchetypes.slice(0, 1).join(", "),
    sharedThemes.slice(0, 1).join(", "),
  ].filter((s) => s.length > 0);

  const reason =
    sharedBits.length > 0
      ? `Compartilha os motivos: ${sharedBits.join("; ")}.`
      : `Ecos temáticos com ${cand.entry.name} (${cand.entry.origin}).`;

  return { categories, convergences, differences, reason };
}

function deterministicConnection(
  fingerprint: Fingerprint,
  cand: CandidateMatch
): Connection {
  const parts = deterministicParts(fingerprint, cand);
  return {
    name: cand.entry.name,
    origin: cand.entry.origin,
    type: cand.entry.type,
    score: calibrateScore(cand.score),
    rawScore: cand.score,
    breakdown: cand.breakdown,
    convergences: parts.convergences.slice(0, 5),
    differences: parts.differences.slice(0, 3),
    categories: parts.categories,
    reason: parts.reason,
  };
}

/** Conexão baseada na resposta do LLM, mesclada com o score determinístico. */
function mergeLLMConnection(
  fingerprint: Fingerprint,
  cand: CandidateMatch,
  raw: Record<string, unknown>
): Connection {
  const adjustRaw = asNumber(raw.adjust, 0);
  const adjust = Math.max(-8, Math.min(8, adjustRaw));
  const rawScore = Math.max(0, Math.min(100, cand.score + adjust));
  const score = calibrateScore(rawScore);

  const parts = deterministicParts(fingerprint, cand);

  let convergences = asStringArray(raw.convergences, 5);
  while (convergences.length < 3 && parts.convergences.length > 0) {
    const next = parts.convergences.shift();
    if (!next) break;
    convergences.push(next);
  }

  let differences = asStringArray(raw.differences, 3);
  while (differences.length < 2 && parts.differences.length > 0) {
    const next = parts.differences.shift();
    if (!next) break;
    differences.push(next);
  }

  const validCategories = ["estrutural", "arquetípica", "simbólica", "temática"];
  const normalizedValid = validCategories.map(normalizeText);
  const categories = asStringArray(raw.categories, 4)
    .map((c) => {
      const idx = normalizedValid.indexOf(normalizeText(c));
      return idx >= 0 ? validCategories[idx] : null;
    })
    .filter((c): c is string => c !== null);
  const finalCategories =
    categories.length > 0 ? categories : parts.categories;

  const reason = truncateWords(
    asString(raw.reason, parts.reason),
    45
  );

  return {
    name: cand.entry.name,
    origin: cand.entry.origin,
    type: cand.entry.type,
    score,
    rawScore,
    breakdown: cand.breakdown,
    convergences: convergences.slice(0, 5),
    differences: differences.slice(0, 3),
    categories: finalCategories,
    reason,
  };
}

/**
 * Executa o Agente Comparativo com grounding na lista de candidatos.
 * Mescla as respostas do LLM com os scores determinísticos (ajuste ±8, clamp 5–99)
 * e preenche candidatos não cobertos pelo LLM de forma determinística.
 */
export async function runParallelsAgent(
  _input: string,
  facts: NarrativeFacts,
  fingerprint: Fingerprint,
  candidates: CandidateMatch[]
): Promise<Connection[]> {
  const top = candidates.slice(0, 5);
  if (top.length === 0) return [];

  const user = [
    `Narrativa analisada: "${facts.name}" (origem: ${facts.origin}).`,
    `Fingerprint narrativo:`,
    `- Motivos: ${fingerprint.motifs.join(", ") || "—"}`,
    `- Arquétipos: ${fingerprint.archetypes.join(", ") || "—"}`,
    `- Temas: ${fingerprint.themes.join(", ") || "—"}`,
    `- Beats: ${fingerprint.beats.join(", ") || "—"}`,
    ``,
    `Candidatos aprovados (lista FECHADA — use apenas estes nomes):`,
    candidatesDigest(top),
    ``,
    `Produza os 5 paralelos (somente JSON).`,
  ].join("\n");

  const raw = await callLLMJson<Record<string, unknown>>(PARALLELS_SYSTEM, user);
  const llmParallels = Array.isArray(raw.parallels) ? raw.parallels : [];

  const byName = new Map<string, Record<string, unknown>>();
  for (const item of llmParallels) {
    const obj = asRecord(item);
    const name = normalizeText(asString(obj.name));
    if (name) byName.set(name, obj);
  }

  const connections = top.map((cand) => {
    const llm = byName.get(normalizeText(cand.entry.name));
    return llm ? mergeLLMConnection(fingerprint, cand, llm) : deterministicConnection(fingerprint, cand);
  });

  return connections.sort((a, b) => b.score - a.score);
}

/** Fallback determinístico completo (usado se o Agente Comparativo falhar). */
export function buildDeterministicParallels(
  fingerprint: Fingerprint,
  candidates: CandidateMatch[]
): Connection[] {
  return candidates
    .slice(0, 5)
    .map((cand) => deterministicConnection(fingerprint, cand));
}

// ---------------------------------------------------------------------------
// Reconstrução do AnalysisResult a partir do registro do banco (cache)
// ---------------------------------------------------------------------------

export interface AnalysisRecordLike {
  id: string;
  input: string;
  payload: string;
  confidence: number;
  createdAt: Date;
}

/**
 * Converte o registro do DB (payload JSON) de volta para AnalysisResult (cached).
 */
export function analysisResultFromRecord(
  record: AnalysisRecordLike
): AnalysisResult {
  const meta = {
    id: record.id,
    input: record.input,
    cached: true,
    createdAt: record.createdAt.toISOString(),
    confidence: record.confidence,
  };

  try {
    const parsed = JSON.parse(record.payload) as Partial<AnalysisResult> | null;
    if (parsed && parsed.facts && parsed.fingerprint) {
      return {
        id: meta.id,
        input: parsed.input ?? meta.input,
        facts: parsed.facts,
        structure: parsed.structure ?? null,
        archetypes: parsed.archetypes ?? null,
        symbols: parsed.symbols ?? null,
        themes: parsed.themes ?? null,
        psychoanalysis: parsed.psychoanalysis ?? null,
        cultural: parsed.cultural ?? null,
        parallels: parsed.parallels ?? [],
        fingerprint: parsed.fingerprint,
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : meta.confidence,
        summary: parsed.summary ?? "",
        cached: true,
        // payloads antigos não registravam o motor: assume-se LLM
        engine: parsed.engine === "local" ? "local" : "llm",
        source: parsed.source ?? "llm",
        createdAt: meta.createdAt,
      };
    }
  } catch {
    // payload corrompido — cai no fallback mínimo abaixo
  }

  return {
    id: meta.id,
    input: meta.input,
    facts: {
      name: meta.input,
      type: "livro",
      origin: "",
      period: "",
      characters: [],
      synopsis: "",
      found: false,
      variants: [],
    },
    structure: null,
    archetypes: null,
    symbols: null,
    themes: null,
    psychoanalysis: null,
    cultural: null,
    parallels: [],
    fingerprint: { motifs: [], archetypes: [], themes: [], beats: [] },
    confidence: meta.confidence,
    summary: "",
    cached: true,
    engine: "llm",
    source: "llm",
    createdAt: meta.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Orquestrador — resumo executivo
// ---------------------------------------------------------------------------

function executiveSummaryFallback(
  facts: NarrativeFacts,
  parallels: Connection[]
): string {
  if (parallels.length === 0) {
    return `${facts.name} (${facts.origin}) não apresentou paralelos fortes no catálogo curado do Oráculo. Mesmo assim, a análise estrutural, simbólica e arquetípica revela como essa narrativa mobiliza padrões universais — uma indicação de que ela participa do imaginário coletivo mesmo fora das obras de referência.`;
  }
  const top = parallels[0];
  const others = parallels
    .slice(1, 4)
    .map((p) => `${p.name} (${p.score})`)
    .join(", ");
  return `A análise de ${facts.name} (${facts.origin}) revela seu paralelismo mais forte com ${top.name} (${top.score}/100): ${top.reason} Juntos, os dois relatos demonstram como estruturas narrativas universais — provações, transformações e retornos — atravessam culturas e épocas distintas. Outras conexões relevantes incluem ${others}. Esses paralelos mostram que ${facts.name} não é um caso isolado, mas parte de uma rede de narrativas que reimaginam os mesmos padrões arquetípicos e simbólicos da experiência humana.`;
}

export async function buildExecutiveSummary(
  input: string,
  facts: NarrativeFacts,
  parallels: Connection[]
): Promise<string> {
  // Sem paralelos: usa o template determinístico diretamente — evita que o
  // LLM invente conexões fora da lista de grounding.
  if (parallels.length === 0) {
    return executiveSummaryFallback(facts, parallels);
  }

  const user = [
    `Input do usuário: "${input}"`,
    `Fatos da narrativa:`,
    factsDigest(facts),
    ``,
    `Paralelos ranqueados:`,
    ...parallels.map(
      (p, i) => `${i + 1}. ${p.name} (${p.score}/100) — ${p.reason}`
    ),
    ``,
    `Produza o resumo executivo (somente JSON).`,
  ].join("\n");

  try {
    const raw = await callLLMJson<Record<string, unknown>>(SUMMARY_SYSTEM, user, 1);
    const summary = asString(raw.summary);
    if (summary.length > 0) return summary;
    return executiveSummaryFallback(facts, parallels);
  } catch {
    return executiveSummaryFallback(facts, parallels);
  }
}

