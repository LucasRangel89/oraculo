import ZAI from "z-ai-web-dev-sdk";
import { MEDIA_TYPE_LABELS } from "@/lib/oracle-types";
import type {
  AnalysisResult,
  ArchetypeAnalysis,
  ArchetypeEntry,
  Connection,
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
import { catalogEntryToFingerprint } from "@/lib/similarity";
import type { CandidateMatch } from "@/lib/similarity";
import { normalizeText } from "@/lib/similarity";

// ---------------------------------------------------------------------------
// Singleton ZAI (backend only)
// ---------------------------------------------------------------------------

type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>;

let zaiPromise: Promise<ZAIInstance> | null = null;

async function getZAI(): Promise<ZAIInstance> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return zaiPromise;
}

// ---------------------------------------------------------------------------
// Erros controlados
// ---------------------------------------------------------------------------

/** Erro emitido quando o Agente Identificador não reconhece a narrativa. */
export class NarrativeNotFoundError extends Error {
  variants: string[];
  constructor(message: string, variants: string[]) {
    super(message);
    this.name = "NarrativeNotFoundError";
    this.variants = variants;
  }
}

// ---------------------------------------------------------------------------
// Helpers de extração/validação
// ---------------------------------------------------------------------------

/** Extrai o primeiro objeto JSON de um texto (tolerante a fences e texto extra). */
function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/```[a-zA-Z]*\s*/g, "")
    .replace(/```/g, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Nenhum objeto JSON encontrado na resposta do modelo.");
  }
  const slice = cleaned.slice(first, last + 1);
  return JSON.parse(slice);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chama o LLM exigindo JSON puro e faz parse robusto.
 * Erros "normais" consomem o orçamento de `retries`; erros de rate-limit (429)
 * têm orçamento próprio com backoff crescente, pois os agentes rodando em
 * paralelo podem estourar o limite momentâneo da API.
 */
export async function callLLMJson<T>(
  system: string,
  user: string,
  retries = 2
): Promise<T> {
  let lastError: unknown = null;
  let normalRetriesLeft = retries;
  let rateRetriesLeft = 3;

  const isRateLimited = (msg: string): boolean =>
    /429|too many requests|rate ?limit/i.test(msg);

  while (true) {
    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });
      const text = completion.choices[0]?.message?.content ?? "";
      if (!text.trim()) {
        throw new Error("Resposta vazia do modelo.");
      }
      const parsed = extractJsonObject(text);
      return parsed as T;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (isRateLimited(msg) && rateRetriesLeft > 0) {
        rateRetriesLeft -= 1;
        await sleep([5000, 15000, 30000][2 - rateRetriesLeft]); // 5s, 15s, 30s
        continue;
      }
      if (!isRateLimited(msg) && normalRetriesLeft > 0) {
        normalRetriesLeft -= 1;
        await sleep(500);
        continue;
      }
      break;
    }
  }
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Falha ao obter JSON válido do LLM: ${msg}`);
}

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

const FACTS_SYSTEM = `Você é o Agente Identificador do Oráculo das Conexões Narrativas. Você faz busca factual sobre narrativas mundiais (mitologia, folclore, literatura, cinema, séries, música, arte).
Sua tarefa: identificar a narrativa informada pelo usuário e devolver fatos objetivos.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"name": string, "type": "mito"|"lenda"|"filme"|"serie"|"livro"|"musica"|"arte", "origin": string, "period": string, "characters": string[], "synopsis": string, "found": boolean, "variants": string[]}
Regras:
- "name": nome oficial mais reconhecível da narrativa (forma consagrada em português, quando existir).
- "type": um dos valores exatamente como listado acima.
- "origin": origem cultural (ex.: "Mitologia Grega").
- "period": período aproximado (ex.: "séc. VIII a.C.").
- "characters": até 6 personagens principais.
- "synopsis": sinopse breve com no máximo 100 palavras.
- Se você NÃO reconhecer a narrativa com confiança razoável: "found": false e "variants" com até 5 nomes de narrativas semelhantes que o usuário talvez quisesse dizer.
- Se reconhecer: "found": true e "variants": [].
- Nunca escreva nada fora do JSON.`;

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

const STRUCTURE_SYSTEM = `Você é o Agente Estruturalista do Oráculo das Conexões Narrativas, especialista em narratologia comparada e nas teorias de Joseph Campbell (A Jornada do Herói) e Christopher Vogler.
Recebe os fatos de uma narrativa e devolve a análise estrutural completa.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"summary": string, "acts": number, "beats": string[], "incitingIncident": string, "climax": string, "resolution": string, "tone": string, "heroJourney": [{"stage": string, "present": boolean, "evidence": string}], "confidence": number}
Regras:
- "summary": parágrafo de no máximo 120 palavras sobre a arquitetura narrativa.
- "acts": quantidade de atos (1, 2, 3 ou 5).
- "beats": de 4 a 8 beats narrativos principais em snake_case (ex.: "chamado_a_aventura", "provacao", "retorno").
- "incitingIncident", "climax", "resolution": descrições curtas e específicas.
- "tone": tom dominante da narrativa (ex.: "épico-trágico").
- "heroJourney": avalie TODOS os 12 estágios de Campbell, nesta ordem exata: "Mundo Comum", "Chamado à Aventura", "Recusa do Chamado", "Encontro com o Mentor", "Travessia do Primeiro Limiar", "Testes, Aliados e Inimigos", "Aproximação da Caverna Oculta", "Provação", "Recompensa", "Caminho de Volta", "Ressurreição", "Retorno com Elixir". Para cada estágio: "present" (true/false) e "evidence" = cena ou evidência específica curta; se o estágio estiver ausente da narrativa, a "evidence" deve descrever o impacto narrativo dessa ausência.
- "confidence": número entre 0 e 1.
- Nunca escreva nada fora do JSON.`;

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

const ARCHETYPES_SYSTEM = `Você é o Agente Arquetípico do Oráculo das Conexões Narrativas, especialista na psicologia analítica de Carl Gustav Jung e Marie-Louise von Franz.
Recebe os fatos de uma narrativa e mapeia os arquétipos junguianos presentes nos personagens.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"summary": string, "archetypes": [{"character": string, "archetype": string, "description": string}], "individuation": string, "confidence": number}
Regras:
- "summary": parágrafo curto sobre o quadro arquetípico da narrativa.
- "archetypes": de 3 a 6 entradas. "archetype" deve ser um arquétipo junguiano (ex.: "Herói", "Mentor", "Sombra", "Trickster", "Anima/Animus", "Guardião do Limiar", "Rei Sagrado", "Messias", "Herói Trágico", "Herói Cultural", "Grande Mãe").
- "description": papel do personagem + objetivo consciente/inconsciente, curto.
- "individuation": nota sobre o processo de individuação presente na narrativa ("não aplicável" se for o caso).
- "confidence": número entre 0 e 1.
- Nunca escreva nada fora do JSON.`;

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

const SYMBOLS_SYSTEM = `Você é o Agente Simbólico do Oráculo das Conexões Narrativas, especialista em dicionários de símbolos (Jean Chevalier & Alain Gheerbrant, Juan Eduardo Cirlot) e hermenêutica simbólica.
Recebe os fatos de uma narrativa e extrai os símbolos centrais e seus significados.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"summary": string, "symbols": [{"symbol": string, "meaning": string, "universalMeaning": string, "presence": "leve"|"moderado"|"forte", "historicalParallels": string[]}], "confidence": number}
Regras:
- "summary": parágrafo curto sobre o tecido simbólico da narrativa.
- "symbols": de 3 a 6 símbolos centrais.
- IMPORTANTE: prefira símbolos e motivos UNIVERSAIS em forma curta (ex.: "fogo", "travessia da água", "monstro a ser morto", "auxílio divino", "proibição", "descida ao submundo", "máscara") em vez de objetos muito específicos (evite nomes próprios ou artefatos exclusivos como "escudo de Atena"); inclua no máximo 1 símbolo muito específico da obra.
- VOCABULÁRIO CANÔNICO PREFERENCIAL (use estas formas curtas sempre que se aplicarem à narrativa): "jornada do herói", "chamado à aventura", "travessia", "travessia da água", "nascimento miraculoso", "orfandade", "profecia", "destino inevitável", "mentor sábio", "auxílio divino", "objeto mágico", "monstro a ser morto", "missão impossível", "resgate", "sacrifício", "sacrifício pela humanidade", "descida ao submundo", "morte e renascimento", "ressurreição", "renascimento", "dilúvio", "fogo", "fogo do conhecimento", "árvore da vida", "máscara", "vingança", "pacto proibido", "tentação", "proibição", "expiação", "queda e redenção", "exílio", "retorno do rei", "trickster", "astúcia", "punição divina", "desafio aos deuses", "apocalipse", "julgamento". Selecione APENAS os que realmente operam na narrativa — não force todos.
- Exemplo de escolha boa para Prometeu: ["fogo do conhecimento", "punição divina", "sacrifício pela humanidade", "desafio aos deuses"] — e NÃO ["fígado regenerando-se", "montanha"].
- "meaning": significado do símbolo NO contexto da narrativa.
- "universalMeaning": significado universal do símbolo (string vazia se for muito específico).
- "presence": intensidade com que o símbolo opera na narrativa ("leve"|"moderado"|"forte").
- "historicalParallels": até 3 outras narrativas, mitos ou obras históricas em que o mesmo símbolo aparece.
- "confidence": número entre 0 e 1.
- Nunca escreva nada fora do JSON.`;

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

const THEMES_SYSTEM = `Você é o Agente Filosófico-Temático do Oráculo das Conexões Narrativas, especialista em filosofia, ética e temas universais da condição humana.
Recebe os fatos de uma narrativa e extrai temas, questões existenciais e dilemas éticos.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"summary": string, "themes": string[], "existentialQuestions": string[], "ethicalDilemmas": string[], "confidence": number}
Regras:
- "summary": parágrafo curto sobre o horizonte temático da narrativa.
- "themes": de 3 a 5 temas universais, cada um com 2 a 4 palavras (ex.: "sacrifício pela humanidade", "destino versus livre-arbítrio").
- "existentialQuestions": de 2 a 4 perguntas existenciais que a narrativa formula ao leitor.
- "ethicalDilemmas": de 1 a 3 dilemas éticos centrais.
- "confidence": número entre 0 e 1.
- Nunca escreva nada fora do JSON.`;

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

const PSYCHOANALYSIS_SYSTEM = `Você é o Agente Psicanalítico do Oráculo das Conexões Narrativas, especialista nas lentes freudiana (inconsciente, pulsões, recalcamento, complexo de Édipo) e junguiana (complexos, arquétipos, sombra, individuação).
Recebe os fatos de uma narrativa e produz uma leitura psicanalítica.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"summary": string, "complexes": string[], "unconsciousDesires": string[], "freudianReading": string, "jungianReading": string, "speculative": boolean, "disclaimer": string, "confidence": number}
Regras:
- "summary": parágrafo curto da leitura psicanalítica.
- "complexes": de 2 a 4 complexos psíquicos identificados nos personagens.
- "unconsciousDesires": de 2 a 4 desejos inconscientes em jogo na narrativa.
- "freudianReading": 1 parágrafo (máx. ~110 palavras) na lente freudiana.
- "jungianReading": 1 parágrafo (máx. ~110 palavras) na lente junguiana.
- "speculative": true sempre que a leitura for hipótese interpretativa (na prática, quase sempre true).
- "disclaimer": aviso obrigatório de que a leitura psicanalítica é interpretativa e especulativa, sem valor diagnóstico.
- "confidence": número entre 0 e 1.
- Nunca escreva nada fora do JSON.`;

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
// Agente Comparativo Mitológico (parallels) — com GROUNDING no catálogo
// ---------------------------------------------------------------------------

const PARALLELS_SYSTEM = `Você é o Agente Comparativo Mitológico do Oráculo das Conexões Narrativas, especialista em mitologia comparada (James Frazer, Lord Raglan, Vladimir Propp, Joseph Campbell, Claude Lévi-Strauss).
Você receberá: (1) os fatos da narrativa analisada; (2) o fingerprint narrativo; (3) uma lista FECHADA de candidatos aprovados pelo sistema de similaridade determinística.
REGRA DE GROUNDING ABSOLUTA: use APENAS nomes que estejam na lista de candidatos. NUNCA invente, substitua ou acrescente paralelos fora da lista.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"parallels": [{"name": string, "convergences": string[], "differences": string[], "categories": string[], "reason": string, "adjust": number}]}
Regras:
- Retorne exatamente os 5 melhores candidatos da lista, ordenados pela força do paralelismo.
- "name": EXATAMENTE igual ao nome do candidato da lista.
- "convergences": de 3 a 5 pontos de convergência específicos, citando motivos, arquétipos, temas ou beats concretos de ambos os lados.
- "differences": de 2 a 3 diferenças significativas.
- "categories": subconjunto de ["estrutural","arquetípica","simbólica","temática"].
- "reason": justificativa legível de no máximo 40 palavras.
- "adjust": número entre -8 e 8 ajustando o score determinístico conforme sua avaliação qualitativa do paralelismo (0 se neutro).
- Nunca escreva nada fora do JSON.`;

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
    score: Math.max(5, Math.min(99, cand.score)),
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
  const score = Math.max(5, Math.min(99, cand.score + adjust));

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

/** Converte o registro do DB (payload JSON) de volta para AnalysisResult (cached). */
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
        parallels: parsed.parallels ?? [],
        fingerprint: parsed.fingerprint,
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : meta.confidence,
        summary: parsed.summary ?? "",
        cached: true,
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
    parallels: [],
    fingerprint: { motifs: [], archetypes: [], themes: [], beats: [] },
    confidence: meta.confidence,
    summary: "",
    cached: true,
    createdAt: meta.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Orquestrador — resumo executivo
// ---------------------------------------------------------------------------

const SUMMARY_SYSTEM = `Você é o Orquestrador do Oráculo das Conexões Narrativas. Sua função é escrever o resumo executivo da análise.
Você recebe o input do usuário, os fatos da narrativa e os paralelos ranqueados.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"summary": string}
Regras:
- "summary": 1 parágrafo de 80 a 120 palavras explicando o paralelismo principal da narrativa, citando explicitamente as conexões mais fortes (nomes e scores de 0 a 100) e o que elas revelam sobre a narrativa analisada.
- IMPORTANTE: baseie-se SOMENTE na lista de paralelos fornecida; NUNCA invente conexões, nomes ou scores fora dessa lista. Se a lista estiver vazia, explique que nenhum paralelo forte foi encontrado no catálogo e destaque os padrões universais identificados.
- Nunca escreva nada fora do JSON.`;

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

