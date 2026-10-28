/**
 * Motor hermenêutico local ("modo demonstração").
 *
 * Quando nenhum provedor de LLM está configurado, o Oráculo não deve virar uma
 * tela de erro: ele passa a operar de forma **determinística e auditável** sobre
 * o catálogo curado + dossiês de referência.
 *
 * Princípios (herdados dos blueprints legados):
 *  - grounding: nada de paralelos inventados — tudo sai do catálogo;
 *  - explicabilidade: cada campo é derivado de motivos/arquétipos/temas reais;
 *  - honestidade: o resultado é marcado com `engine: "local"` e
 *    `source: "reference" | "catalog" | "heuristic"`;
 *  - utilidade: a experiência completa (8 lentes, grafo, comparação) funciona
 *    sem custo de API.
 *
 * Este módulo é server-side.
 */
import { CATALOG } from "@/lib/oracle-catalog";
import { NarrativeNotFoundError } from "@/lib/oracle-errors";
import { buildParallelConnections } from "@/lib/parallels";
import { findReferenceDossier, type ReferenceDossier } from "@/lib/reference-analyses";
import {
  buildFingerprint,
  calibrateScore,
  catalogEntryToFingerprint,
  normalizeText,
  scorePair,
} from "@/lib/similarity";
import type {
  AgentId,
  AnalysisDepth,
  AnalysisResult,
  AnalysisSource,
  ArchetypeAnalysis,
  ArchetypeEntry,
  CatalogEntry,
  Connection,
  CulturalAnalysis,
  Fingerprint,
  MediaType,
  NarrativeFacts,
  PsychoanalysisData,
  ScoreBreakdown,
  StructureAnalysis,
  SymbolAnalysis,
  SymbolEntry,
  ThematicAnalysis,
} from "@/lib/oracle-types";
import { DEPTH_AGENTS } from "@/lib/oracle-types";

// ---------------------------------------------------------------------------
// Match do input ao catálogo / dossiês
// ---------------------------------------------------------------------------

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)
  );
}

function overlapScore(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.min(ta.size, tb.size);
}

/** Similaridade de nome/alias com o input (0–1). */
function entryMatchScore(entry: CatalogEntry, needle: string): number {
  const norm = normalizeText(needle);
  const name = normalizeText(entry.name);
  if (norm === name) return 1;
  if (name.includes(norm) || norm.includes(name)) return 0.95;
  let best = overlapScore(norm, name);
  for (const character of entry.characters) {
    const c = normalizeText(character);
    if (c === norm) best = Math.max(best, 0.9);
    else if (c.length > 3 && (c.includes(norm) || norm.includes(c))) {
      best = Math.max(best, 0.8);
    }
  }
  return best;
}

export function matchCatalogEntry(input: string): CatalogEntry | null {
  let best: { entry: CatalogEntry; score: number } | null = null;
  for (const entry of CATALOG) {
    const score = entryMatchScore(entry, input);
    if (!best || score > best.score) best = { entry, score };
  }
  return best && best.score >= 0.62 ? best.entry : null;
}

function closestCatalogNames(input: string, n = 5): string[] {
  return CATALOG.map((entry) => ({ entry, score: entryMatchScore(entry, input) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((m) => m.entry.name);
}

// ---------------------------------------------------------------------------
// Léxicos autorais (extraídos/condensados do acervo legado)
// ---------------------------------------------------------------------------

interface MotifLexiconEntry {
  universal: string;
  presence?: SymbolEntry["presence"];
  parallels?: string[];
}

/**
 * Dicionário de motivos → significado universal.
 * Sintetiza a lente simbólica de Chevalier/Cirlot usada nos blueprints.
 */
const MOTIF_LEXICON: Record<string, MotifLexiconEntry> = {
  "monstro a ser morto": {
    universal: "O obstáculo que precisa ser nomeado e enfrentado para que a comunidade sobreviva.",
    presence: "forte",
    parallels: ["São Jorge e o dragão", "Beowulf e Grendel", "Indra e Vritra"],
  },
  "auxílio divino": {
    universal: "Graça, orientação e transmissão de conhecimento: a vitória nunca é solitária.",
    parallels: ["Gilgamesh e Shamash", "Eneias e Vênus", "Arjuna e Krishna"],
  },
  travessia: {
    universal: "Rito de passagem e mudança de estado entre duas ordens de realidade.",
    parallels: ["Estige", "Rio dos Mortos egípcio", "Jordão"],
  },
  "travessia da água": {
    universal: "Purificação, transição e retorno à origem.",
    presence: "forte",
    parallels: ["Estige", "Dilúvio de Gilgamesh", "Batismo no Jordão"],
  },
  resgate: {
    universal: "Salvação, aliança e continuidade da vida.",
    parallels: ["Teseu e Ariadne", "Héracles e Hesíone", "São Jorge e a princesa"],
  },
  "fogo do conhecimento": {
    universal: "Consciência, iluminação e poder criador.",
    presence: "forte",
    parallels: ["Loki e o fogo nórdico", "Mauí e o fogo maori", "Árvore do conhecimento"],
  },
  trickster: {
    universal: "A astúcia que rompe a ordem para renová-la.",
    parallels: ["Loki", "Anansi", "Hermes"],
  },
  "punição divina": {
    universal: "Dívida, expiação e limite transgressor.",
    parallels: ["Tântalo", "Sísifo", "Lúcifer"],
  },
  "sacrifício pela humanidade": {
    universal: "Redenção pelo sofrimento voluntário em nome do coletivo.",
    presence: "forte",
    parallels: ["Cristo", "Odín em Yggdrasil", "Ixquic maia"],
  },
  "desafio aos deuses": {
    universal: "Hybris: a tensão entre autonomia e limite.",
    parallels: ["Torre de Babel", "Fausto", "Frankenstein"],
  },
  profecia: {
    universal: "Destino, onisciência e o limite do livre-arbítrio.",
    presence: "forte",
    parallels: ["Macbeth", "Cassandra", "Nornas"],
  },
  "destino inevitável": {
    universal: "A força que se cumpre precisamente pelo esforço de evitá-la.",
    parallels: ["Édipo", "Macbeth", "Ragnarök"],
  },
  parricídio: {
    universal: "Ruptura com a autoridade fundadora e a culpa que dela decorre.",
    parallels: ["Édipo", "Orestes", "Zeus e Cronos"],
  },
  enigma: {
    universal: "Conhecimento iniciático e prova de passagem.",
    parallels: ["Esfinge de Tebas", "Enigmas de Amon", "Turandot"],
  },
  cegueira: {
    universal: "Insight, renúncia e conhecimento interior.",
    parallels: ["Tirésias", "Gloucester em Rei Lear", "Belisário"],
  },
  "jornada de retorno": {
    universal: "Regresso ao lar como prova de fidelidade a si mesmo.",
    parallels: ["Odisseia", "Êxodo", "Sinuhe"],
  },
  astúcia: {
    universal: "A inteligência prática (métis) que compensa a força.",
    parallels: ["Odisseu", "Anansi", "Renart"],
  },
  tentação: {
    universal: "A prova interior que revela o desejo mais profundo.",
    parallels: ["Cristo no deserto", "Buda e Mara", "Fausto"],
  },
  "missão impossível": {
    universal: "A tarefa que exige transformação de quem a aceita.",
    parallels: ["Doze trabalhos", "Sísifo", "Teseu"],
  },
  expiação: {
    universal: "Reparação pelo sofrimento; a dívida que só o corpo pode pagar.",
    parallels: ["Héracles", "Édipo em Colono", "Raskólnikov"],
  },
  "descida ao submundo": {
    universal: "Morte simbólica e conhecimento proibido — a katábasis iniciática.",
    presence: "forte",
    parallels: ["Inanna", "Orfeu", "Nekyia de Odisseu"],
  },
  "morte e renascimento": {
    universal: "Transformação radical: morrer para uma identidade e nascer para outra.",
    presence: "forte",
    parallels: ["Osíris", "Dionísio", "Inanna"],
  },
  ressurreição: {
    universal: "Retorno da vida sobre a morte, promessa de renovação.",
    presence: "forte",
    parallels: ["Osíris", "Cristo", "Balder"],
  },
  dilúvio: {
    universal: "Purificação cósmica e recomeço da humanidade.",
    presence: "forte",
    parallels: ["Gilgamesh / Utnapishtim", "Noé", "Manu hindu"],
  },
  exílio: {
    universal: "Separação da origem como condição do amadurecimento.",
    parallels: ["Odisseu", "Moisés", "Simba"],
  },
  "pacto com o diabo": {
    universal: "O desejo de transcender o limite humano e o preço que ele cobra.",
    presence: "forte",
    parallels: ["Fausto", "Pacto de Teófilo", "O Retrato de Dorian Gray"],
  },
  "objeto mágico": {
    universal: "Poder concentrado em um objeto: quem o porta é transformado por ele.",
    parallels: ["Anel dos Nibelungos", "Graal", "Lâmpada de Aladim"],
  },
  "tentação do poder": {
    universal: "A corrupção como processo interno, não como evento externo.",
    presence: "forte",
    parallels: ["O Anel de Giges", "Macbeth", "Dorian Gray"],
  },
  "carga impossível": {
    universal: "O fardo que define o herói: carregar o que ninguém suportaria.",
    parallels: ["Atlas", "Sísifo", "Cristo e a cruz"],
  },
  "retorno do rei": {
    universal: "Restauração de uma ordem legítima perdida.",
    parallels: ["Rei Arthur", "Odisseu em Ítaca", "Osíris"],
  },
  máscara: {
    universal: "Identidade oculta e poder da persona sobre o rosto.",
    parallels: ["Dionísio", "Commedia dell'arte", "V de Vingança"],
  },
  "ideia imortal": {
    universal: "A sobrevivência do símbolo ao corpo que o porta.",
    parallels: ["Sócrates", "Mártires", "Guy Fawkes"],
  },
  revolução: {
    universal: "A ruptura da ordem em nome de outro futuro.",
    parallels: ["Prometeu", "Spartacus", "Antígona"],
  },
  "realidade simulada": {
    universal: "A suspeita de que o mundo dado é uma construção — e a escolha de despertar.",
    parallels: ["Caverna de Platão", "Maya hindu", "Sonhos de Zhuangzi"],
  },
  "busca da imortalidade": {
    universal: "O desejo de transcender a morte e sua decepção final.",
    parallels: ["Gilgamesh", "Tithonus", "Sísifo"],
  },
  "amizade": {
    universal: "O vínculo que sustenta a provação.",
    parallels: ["Gilgamesh e Enkidu", "Davi e Jônatas", "Frodo e Sam"],
  },
  trovão: {
    universal: "A voz da autoridade cósmica e a energia que fertiliza ou destrói.",
    parallels: ["Zeus", "Thor", "Tlaloc"],
  },
  ragnarök: {
    universal: "Fim do mundo cíclico seguido de renascimento.",
    parallels: ["Apocalipse", "Pralaya hindu", "Quinto Sol asteca"],
  },
  traição: {
    universal: "A ruptura da aliança e a revelação do que estava oculto.",
    parallels: ["Judas", "Loki e Balder", "Ganelon"],
  },
  "julgamento dos mortos": {
    universal: "A prestação de contas e a justiça além-túmulo.",
    parallels: ["Maat egípcia", "Rhadamanthys", "Bardo tibetano"],
  },
  "criação da humanidade": {
    universal: "A passagem do divino ao humano e a responsabilidade do criador.",
    presence: "forte",
    parallels: ["Enuma Elish", "Gênesis", "Popol Vuh"],
  },
  "nascimento miraculoso": {
    universal: "A origem extraordinária que legitima o herói.",
    parallels: ["Perseu", "Krishna", "Jesus"],
  },
  "aliados animais": {
    universal: "A natureza como aliada de quem respeita suas regras.",
    parallels: ["Gilgamesh e Humbaba", "Mowgli", "São Francisco"],
  },
  "fúria guerreira": {
    universal: "A força que ultrapassa o humano e exige contenção.",
    parallels: ["Cú Chulainn", "Aquiles", "Berserkers"],
  },
  "destino trágico": {
    universal: "A grandeza e a ruína como faces do mesmo caráter.",
    parallels: ["Édipo", "Aquiles", "Hamlet"],
  },
  transformação: {
    universal: "A passagem de forma como metáfora do amadurecimento.",
    parallels: ["Metamorfoses de Ovídio", "Loki", "Procusto"],
  },
  vingança: {
    universal: "A justiça tomada pelas próprias mãos e o preço que ela cobra.",
    presence: "forte",
    parallels: ["Oresteia", "Hamlet", "Conde de Monte Cristo"],
  },
  "queda e redenção": {
    universal: "A possibilidade de reconstrução depois do erro.",
    parallels: ["Davi", "Boromir", "Jean Valjean"],
  },
  loucura: {
    universal: "A razão desestabilizada e a verdade que só o louco enuncia.",
    parallels: ["Hamlet", "Ájax", "Dom Quixote"],
  },
  fantasma: {
    universal: "O passado não resolvido que exige ser escutado.",
    presence: "moderado",
    parallels: ["Hamlet", "Banquo", "Espíritos do Nō"],
  },
  "loucura ou sagacidade": {
    universal: "A fronteira tênue entre loucura e insight.",
    parallels: ["Erasmo", "Dom Quixote", "Hamlet"],
  },
  "dúvida existencial": {
    universal: "A pergunta sobre o sentido que paralisa a ação.",
    parallels: ["Hamlet", "Kierkegaard", "Sartre"],
  },
  morte: {
    universal: "O limite que dá forma à vida.",
    parallels: ["Memento mori", "Livro dos Mortos", "Bardo"],
  },
  "jornada de redenção": {
    universal: "O percurso que transforma culpa em reparação.",
    parallels: ["Bunyan", "Fausto II", "Jean Valjean"],
  },
  "guia espiritual": {
    universal: "A voz que orienta na travessia do desconhecido.",
    parallels: ["Virgílio", "Beatrice", "Hermes"],
  },
  purificação: {
    universal: "A remoção da mácula por rito, sofrimento ou tempo.",
    parallels: ["Batismo", "Banhos rituais egípcios", "Catharsis"],
  },
  escolha: {
    universal: "O momento em que o personagem se define pelo que decide.",
    parallels: ["Héracles na encruzilhada", "Buda", "A escolha de Aquiles"],
  },
  messias: {
    universal: "A espera coletiva por quem salvará o mundo.",
    presence: "forte",
    parallels: ["Cristo", "Mitra", "Neo"],
  },
  despertar: {
    universal: "A passagem da ignorância à consciência.",
    parallels: ["Caverna de Platão", "Buda", "Neo"],
  },
  "jornada do herói": {
    universal: "O padrão narrativo da transformação pelo afastamento e retorno.",
    presence: "forte",
    parallels: ["Campbell", "Propp", "Vogler"],
  },
  orfandade: {
    universal: "A ausência da origem que obriga a construir identidade própria.",
    parallels: ["Harry Potter", "Luke Skywalker", "Héracles"],
  },
  "mentor sábio": {
    universal: "O saber transmitido como condição da travessia.",
    parallels: ["Gandalf", "Mentor de Telêmaco", "Yoda"],
  },
  "morte do pai": {
    universal: "O fim da autoridade que abre espaço à autonomia.",
    presence: "forte",
    parallels: ["Hamlet", "Simba", "Luke Skywalker"],
  },
  "ciclo da vida": {
    universal: "A aceitação da alternância entre perda e renovação.",
    parallels: ["Rei Leão", "Osíris", "Ragnarök"],
  },
};

const ARCHETYPE_MEANINGS: Record<string, string> = {
  "Herói": "Aquele que atravessa a provação e retorna transformado.",
  Mentor: "A figura que transmite saber e prepara a travessia.",
  "Guardião do Limiar": "A prova de entrada: quem testa se o herói pode passar.",
  Trickster: "A astúcia que subverte a ordem e revela suas fissuras.",
  "Herói Cultural": "O doador de um bem civilizador (fogo, técnica, escrita).",
  "Mártir": "Aquele que paga com o corpo pela dádiva coletiva.",
  "Herói Trágico": "O herói cuja virtude é também a causa de sua ruína.",
  Sombra: "O que foi reprimido e retorna como oposição.",
  "Rei Sagrado": "A autoridade legitimada pelo sagrado — e por ele julgada.",
  Artista: "O criador cuja obra disputa com a morte.",
  "Anima/Animus": "A contraparte psíquica que completa e perturba.",
  Messias: "A figura de salvação esperada pelo coletivo.",
};

// ---------------------------------------------------------------------------
// Heurísticas de estrutura
// ---------------------------------------------------------------------------

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return (match ? match[0] : text).trim();
}

function truncate(text: string, words: number): string {
  const parts = text.split(/\s+/);
  return parts.length <= words ? text : `${parts.slice(0, words).join(" ")}…`;
}

const STAGE_KEYWORDS: Record<string, string[]> = {
  "Mundo Comum": ["jornada", "infância", "reino", "lar", "família", "aldeia", "comunidade"],
  "Chamado à Aventura": [
    "chamado", "profecia", "missão", "guerra", "peste", "revelação", "pacto",
    "despertar", "convocação", "vingança",
  ],
  "Recusa do Chamado": ["recusa", "medo", "dúvida", "hesitação", "proibição", "resistência"],
  "Encontro com o Mentor": ["mentor", "mestre", "guia", "sábio", "auxílio divino", "mestre"],
  "Travessia do Primeiro Limiar": ["travessia", "limiar", "partida", "viagem", "exílio", "jornada"],
  "Testes, Aliados e Inimigos": [
    "provação", "provas", "aliados", "inimigos", "batalha", "tentação", "desafio",
  ],
  "Aproximação da Caverna Oculta": ["descida", "caverna", "submundo", "limiar", "noite escura"],
  "Provação": ["provação", "sacrifício", "morte", "batalha", "confronto", "pacto", "enigma"],
  "Recompensa": ["recompensa", "objeto mágico", "resgate", "redenção", "conhecimento", "vitória"],
  "Caminho de Volta": ["retorno", "regresso", "volta", "cura", "expiação"],
  "Ressurreição": ["ressurreição", "renascimento", "despertar", "transformação", "redenção"],
  "Retorno com Elixir": ["retorno do rei", "ciclo da vida", "redenção", "legado", "ideia imortal"],
};

const STAGE_ABSENCE: Record<string, string> = {
  "Mundo Comum": "Sem um 'mundo comum' delineado, a narrativa começa já em crise — o que reduz o contraste da transformação.",
  "Chamado à Aventura": "A ausência de um chamado explícito torna a partida menos motivada dramaticamente.",
  "Recusa do Chamado": "Sem recusa, o herói adere sem resistência: a jornada perde a tensão interna inicial.",
  "Encontro com o Mentor": "Sem mentor, o saber precisa ser conquistado sozinho — o que aumenta o isolamento do herói.",
  "Travessia do Primeiro Limiar": "A não marcação do limiar enfraquece a sensação de passagem entre mundos.",
  "Testes, Aliados e Inimigos": "A prova se concentra em um único evento, sem a malha de aliados e adversários.",
  "Aproximação da Caverna Oculta": "Não há preparação para o ponto mais escuro: a crise chega sem clímax geográfico ou psíquico.",
  "Provação": "Sem provação central, a transformação do protagonista fica implícita.",
  "Recompensa": "A vitória não é convertida em bem concreto — o sentido fica suspenso.",
  "Caminho de Volta": "Sem caminho de volta, o retorno ao mundo comum (e suas consequências) não é explorado.",
  "Ressurreição": "A ausência de um renascimento simbólico deixa o arco emocional em aberto.",
  "Retorno com Elixir": "O elixir não é partilhado: o aprendizado não retorna à comunidade.",
};

/**
 * Ponte arquétipo → estágio do monomito.
 *
 * Um "Mentor" no elenco é indício estrutural do Encontro com o Mentor; um
 * "Guardião do Limiar" indica a Travessia; uma "Sombra" aponta para a
 * Provação. É uma inferência declarada — não uma leitura do texto integral.
 */
const ARCHETYPE_STAGE_HINTS: Record<string, string[]> = {
  Mentor: ["Encontro com o Mentor"],
  "Mentor Sábio": ["Encontro com o Mentor"],
  "Guardião do Limiar": ["Travessia do Primeiro Limiar"],
  Sombra: ["Provação", "Aproximação da Caverna Oculta"],
  Trickster: ["Testes, Aliados e Inimigos"],
  Aliado: ["Testes, Aliados e Inimigos"],
  "Aliados": ["Testes, Aliados e Inimigos"],
  Arauto: ["Chamado à Aventura"],
  "Herói Relutante": ["Recusa do Chamado"],
  "Herói": ["Chamado à Aventura"],
  "Herói Messiânico": ["Ressurreição", "Retorno com Elixir"],
  Messias: ["Ressurreição", "Retorno com Elixir"],
  "Mãe Terrível": ["Aproximação da Caverna Oculta"],
  "Velho Sábio": ["Encontro com o Mentor"],
};

/**
 * Estágios que o próprio corpus do Oráculo trata como quase-universais no arco
 * de transformação. Quando não há marcação explícita, entram como "inferidos"
 * — o texto da evidência deixa isso claro, para não confundir leitura com
 * dedução estrutural.
 */
const INFERRED_STAGES = new Set([
  "Mundo Comum",
  "Testes, Aliados e Inimigos",
  "Provação",
  "Recompensa",
  "Caminho de Volta",
  "Retorno com Elixir",
]);

function buildStructure(entry: CatalogEntry, facts: NarrativeFacts): StructureAnalysis {
  const haystack = normalizeText(
    [
      ...entry.motifs,
      ...entry.themes,
      ...entry.archetypes,
      entry.synopsis,
      entry.period,
    ].join(" ")
  );

  let explicitStages = 0;
  const heroJourney = Object.keys(STAGE_KEYWORDS).map((stage) => {
    const matched = STAGE_KEYWORDS[stage].find((kw) => haystack.includes(normalizeText(kw)));
    const hero = entry.characters[0] ?? "o protagonista";

    if (matched) {
      explicitStages += 1;
      const motif = entry.motifs.find((m) => normalizeText(m).includes(normalizeText(matched)));
      const reference = motif ? `"${motif}"` : `"${matched}"`;
      return {
        stage,
        present: true,
        evidence: truncate(
          `${facts.name} dramatiza este estágio por meio de ${reference}, com ${hero} no centro da cena.`,
          38
        ),
      };
    }

    // Inferência declarada a partir do elenco arquetípico
    const hintArchetype = entry.archetypes.find((a) =>
      (ARCHETYPE_STAGE_HINTS[a] ?? []).includes(stage)
    );
    if (hintArchetype) {
      const holder = entry.characters.find((_, i) => entry.archetypes[i] === hintArchetype);
      return {
        stage,
        present: true,
        evidence: truncate(
          `Inferido do arquétipo "${hintArchetype}"${holder ? ` (${holder})` : ""}: a função estrutural deste estágio está presente mesmo sem marcação explícita no resumo.`,
          38
        ),
      };
    }

    // Prior estrutural do corpus: estágios quase-universais entram como inferidos
    if (INFERRED_STAGES.has(stage)) {
      return {
        stage,
        present: true,
        evidence: truncate(
          `Inferido do arco narrativo de "${facts.name}" — o resumo curado não isola este estágio, mas ${hero} o atravessa como parte da transformação.`,
          38
        ),
      };
    }

    return { stage, present: false, evidence: STAGE_ABSENCE[stage] ?? "" };
  });

  const presentCount = heroJourney.filter((s) => s.present).length;

  const beatCandidates = [
    entry.motifs.find((m) => /chamado|profecia|pacto|missão|guerra/i.test(m)) &&
      "chamado_a_aventura",
    entry.motifs.some((m) => /travessia|exílio|jornada|partida/i.test(m)) && "travessia_do_limiar",
    entry.motifs.some((m) => /provação|tentação|batalha|desafio|enigma/i.test(m)) && "provacao",
    entry.motifs.some((m) => /descida|submundo|morte/i.test(m)) && "descida_ao_submundo",
    entry.motifs.some((m) => /retorno|ressurreição|renascimento|redenção/i.test(m)) && "retorno",
    entry.motifs.some((m) => /sacrifício|expiação/i.test(m)) && "sacrificio",
  ].filter((b): b is string => typeof b === "string");

  const beats = Array.from(
    new Set([
      ...beatCandidates,
      "chamado_a_aventura",
      "provacao",
      "climax",
      "retorno",
    ])
  ).slice(0, 8);

  const tone = /trágic|morte|luto|queda|vingança/i.test(haystack)
    ? "trágico"
    : /épic|guerra|batalha|glória/i.test(haystack)
      ? "épico"
      : /sábi|conhecimento|enigma|dúvida/i.test(haystack)
        ? "reflexivo"
        : "mítico";

  return {
    summary: `Em "${facts.name}" (${entry.origin}), a arquitetura narrativa organiza ${entry.motifs.slice(0, 3).join(", ")} em torno de uma provação central. ` +
    `${presentCount} dos 12 estágios de Campbell são reconhecíveis neste recorte (${explicitStages} com marcação explícita; ${presentCount - explicitStages} inferidos do arco ou do elenco arquetípico). ${presentCount >= 10 ? "A adesão ao monomito é alta." : presentCount >= 7 ? "A adesão é parcial: a obra dobra o modelo aos seus próprios temas." : "A narrativa se afasta do monomito clássico e organiza sua transformação por outros eixos — um contraexemplo útil ao modelo campbelliano."} ${firstSentence(entry.synopsis)}`,
    acts: 3,
    beats,
    incitingIncident: `${firstSentence(entry.synopsis)} — é o evento que rompe o estado inicial e coloca o conflito em movimento.`,
    climax: `O confronto em torno de "${entry.motifs[0] ?? "seu motivo central"}" com ${entry.characters[0] ?? "o protagonista"}: o ponto em que a transformação se torna irreversível.`,
    resolution: `A resolução reorganiza o mundo em torno de ${entry.themes[0] ?? "seu tema central"} — sem apagar o custo da travessia.`,
    tone,
    heroJourney,
    confidence: 0.72,
  };
}

// ---------------------------------------------------------------------------
// Heurísticas de arquétipos
// ---------------------------------------------------------------------------

function buildArchetypes(entry: CatalogEntry, facts: NarrativeFacts): ArchetypeAnalysis {
  const archetypes: ArchetypeEntry[] = entry.archetypes.slice(0, 6).map((archetype, i) => {
    const character = entry.characters[i] ?? entry.characters[0] ?? "—";
    const meaning = ARCHETYPE_MEANINGS[archetype] ?? "Função arquetípica na economia simbólica da narrativa.";
    return {
      character,
      archetype,
      description: `${meaning} Em "${facts.name}", ${character} ocupa essa posição e a leva até as últimas consequências.`,
    };
  });

  const hasShadow = entry.archetypes.includes("Sombra");
  const hasSelf = entry.themes.some((t) => /identidade|transformação|despertar|redenção/i.test(t));

  return {
    summary: `O quadro arquetípico de "${facts.name}" se organiza em torno de ${entry.archetypes.slice(0, 3).join(", ")}. ${hasShadow ? "A Sombra comparece de forma explícita — o antagonista não é apenas obstáculo, mas aspecto recalcado que retorna." : "A oposição é difusa: o conflito se dá mais entre valores do que entre personagens."}`,
    archetypes,
    individuation: hasSelf
      ? `Há um processo de individuação reconhecível: ${entry.characters[0] ?? "o protagonista"} precisa integrar aquilo que rejeita (${entry.motifs.slice(0, 2).join(", ")}) para se tornar quem é.`
      : "O processo de individuação não é o eixo da narrativa: a transformação do protagonista ocorre no plano coletivo ou fica em segundo plano.",
    confidence: 0.74,
  };
}

// ---------------------------------------------------------------------------
// Heurísticas de símbolos
// ---------------------------------------------------------------------------

function buildSymbols(entry: CatalogEntry, facts: NarrativeFacts): SymbolAnalysis {
  const symbols: SymbolEntry[] = entry.motifs.slice(0, 6).map((motif) => {
    const lexicon = MOTIF_LEXICON[normalizeText(motif)];
    const siblings = CATALOG.filter(
      (other) =>
        other.id !== entry.id &&
        other.motifs.some((m) => normalizeText(m) === normalizeText(motif))
    )
      .slice(0, 3)
      .map((o) => o.name);

    const presence: SymbolEntry["presence"] =
      lexicon?.presence ??
      (entry.themes.some((t) => normalizeText(t).includes(normalizeText(motif)))
        ? "forte"
        : entry.motifs.indexOf(motif) < 2
          ? "moderado"
          : "leve");

    return {
      symbol: motif,
      meaning: `Em "${facts.name}", "${motif}" opera como ${entry.archetypes[0] ?? "eixo"} simbólico e sustenta ${entry.themes[0] ?? "o tema central"}.`,
      universalMeaning:
        lexicon?.universal ??
        `Motivo recorrente no imaginário coletivo, associado a ${entry.themes[0] ?? "transformação"}.`,
      presence,
      historicalParallels:
        siblings.length > 0
          ? siblings
          : (lexicon?.parallels?.slice(0, 3) ?? []),
    };
  });

  return {
    summary: `O tecido simbólico de "${facts.name}" é feito de ${entry.motifs.slice(0, 3).join(", ")}. ${symbols.some((s) => s.presence === "forte") ? "Há pelo menos um símbolo em intensidade máxima, funcionando como eixo de leitura da obra." : "Os símbolos operam em intensidade média: são recorrentes, mas não organizam sozinhos a narrativa."}`,
    symbols,
    confidence: 0.7,
  };
}

// ---------------------------------------------------------------------------
// Heurísticas de temas
// ---------------------------------------------------------------------------

function buildThemes(entry: CatalogEntry, facts: NarrativeFacts): ThematicAnalysis {
  const themes = entry.themes.slice(0, 5);
  const [t1 = "transformação", t2 = "destino"] = themes;

  return {
    summary: `"${facts.name}" pensa ${t1} e ${t2} como problemas, não como respostas: a narrativa coloca o leitor diante de escolhas sem solução limpa. ${entry.synopsis.split(".")[1]?.trim() ?? ""}`.trim(),
    themes,
    existentialQuestions: [
      `Até que ponto "${t1}" é escolha e até que ponto é destino?`,
      `O que a narrativa exige que se sacrifique em nome de "${t2}"?`,
      `Quem tem autoridade para decidir o que é justo quando "${t1}" e "${t2}" se chocam?`,
      `O que resta ao sujeito depois de atravessar "${t1}"?`,
    ].slice(0, 4),
    ethicalDilemmas: [
      `Se "${t1}" exige violar "${t2}", qual dos dois valores a narrativa considera superior?`,
      `O protagonista poderia agir de outro modo sem deixar de ser fiel a "${t1}"?`,
    ],
    confidence: 0.76,
  };
}

// ---------------------------------------------------------------------------
// Heurísticas psicanalíticas
// ---------------------------------------------------------------------------

const COMPLEX_TRIGGERS: { pattern: RegExp; complex: string }[] = [
  { pattern: /parricídio|profecia|morte do pai|pacto/i, complex: "Complexo de Édipo (rivalidade com a autoridade)" },
  { pattern: /vingança|traição/i, complex: "Dívida simbólica e compulsão à repetição" },
  { pattern: /sacrifício|expiação|culpa/i, complex: "Complexo de culpa inconsciente" },
  { pattern: /máscara|identidade|realidade simulada/i, complex: "Crise de identidade (falso self)" },
  { pattern: /tentação do poder|objeto mágico|poder/i, complex: "Complexo do poder e onipotência infantil" },
  { pattern: /orfandade|exílio/i, complex: "Complexo paterno e busca de origem" },
  { pattern: /descida|submundo|morte e renascimento/i, complex: "Regressão e retorno ao útero materno" },
  { pattern: /arte|histórias/i, complex: "Sublimação criativa" },
  { pattern: /loucura|dúvida/i, complex: "Cisão do Ego" },
];

function buildPsychoanalysis(entry: CatalogEntry, facts: NarrativeFacts): PsychoanalysisData {
  const haystack = normalizeText([...entry.motifs, ...entry.themes].join(" "));
  const complexes = Array.from(
    new Set(
      COMPLEX_TRIGGERS.filter((t) => t.pattern.test(haystack)).map((t) => t.complex)
    )
  ).slice(0, 4);

  const protagonist = entry.characters[0] ?? "o protagonista";
  const antagonist = entry.characters[1] ?? "a figura de oposição";
  const motif = entry.motifs[0] ?? "o desejo";
  const theme = entry.themes[0] ?? "a transformação";

  return {
    summary: `A leitura psicanalítica de "${facts.name}" encontra em ${motif} um operador do desejo e da interdição. ${protagonist} é o ponto onde o conflito entre impulso e norma se torna visível.`,
    complexes:
      complexes.length > 0
        ? complexes
        : ["Complexo de individuação", "Conflito entre desejo e interdição"],
    unconsciousDesires: [
      `Ser reconhecido sem precisar pagar o preço de ${motif}`,
      "Retornar a uma origem idealizada",
      `Dominar aquilo que ${antagonist} representa`,
      "Transcender o limite imposto pela morte",
    ],
    freudianReading: `Em chave freudiana, "${facts.name}" dramatiza o conflito entre o desejo — condensado em ${motif} — e a interdição que o organiza. ${protagonist} oscila entre a gratificação imediata e a renúncia exigida pela realidade; quando a renúncia falha, o sintoma aparece como repetição. A figura de ${antagonist} funciona como instância de proibição e, ao mesmo tempo, como objeto de identificação. O desfecho indica quanto dessa renúncia a narrativa considera suportável.`,
    jungianReading: `Em chave junguiana, ${protagonist} precisa confrontar a própria Sombra, projetada em ${antagonist}. ${motif} opera como símbolo numinoso: atrai e ameaça ao mesmo tempo. O caminho de individuação exige integrar o que foi rejeitado, e é justamente aí que "${theme}" deixa de ser um tema abstrato e se torna uma tarefa psicológica. A narrativa mede o preço dessa integração — ou a impossibilidade dela.`,
    speculative: true,
    disclaimer:
      "Leitura interpretativa de caráter especulativo, gerada pelo motor hermenêutico local a partir do catálogo. Não constitui diagnóstico clínico.",
    confidence: 0.66,
  };
}

// ---------------------------------------------------------------------------
// Heurísticas culturais-históricas
// ---------------------------------------------------------------------------

interface TraditionContext {
  context: string;
  influences: string[];
  tensions: string[];
}

const TRADITION_CONTEXT: { match: RegExp; data: TraditionContext }[] = [
  {
    match: /grega/i,
    data: {
      context:
        "A tradição grega se forma entre a oralidade arcaica e a fixação escrita do século VIII a.C., em cidades-estado que legitimavam linhagens e instituições por meio de genealogias míticas. O mito não é ornamento: é direito, calendário, memória e explicação do mundo.",
      influences: [
        "Tradição oral micênica e arcaica",
        "Hesíodo e Homero como fontes de fixação",
        "Culto cívico e iconografia (vasos, escudos, templos)",
        "Recepção romana e helenística",
      ],
      tensions: [
        "Legitimação aristocrática por ascendência divina",
        "Tensão entre destino (moira) e iniciativa humana",
        "Domesticação olímpica de potências ctônicas anteriores",
      ],
    },
  },
  {
    match: /n.rdica/i,
    data: {
      context:
        "A mitologia nórdica chega até nós sobretudo pela Edda em prosa (Snorri Sturluson, séc. XIII) e pela Edda poética, escritas séculos depois da cristianização da Islândia. O que sobrevive é, portanto, uma reconstrução erudita de uma tradição oral pagã.",
      influences: [
        "Edda Poética e Edda em Prosa",
        "Tradição escáldica e kenningar",
        "Culto pré-cristão escandinavo",
        "Recepção romântica e wagneriana",
      ],
      tensions: [
        "Honra, destino (wyrd) e aceitação do Ragnarök",
        "Ordem cósmica contra as forças do caos (gigantes)",
        "Cristianização e reinterpretação dos mitos pagãos",
      ],
    },
  },
  {
    match: /eg.pcia/i,
    data: {
      context:
        "Os mitos egípcios se organizam em torno da realeza, do ciclo solar e da promessa de vida após a morte. Textos das Pirâmides, sarcófagos e Livro dos Mortos funcionam como liturgia: o mito é operado ritualmente, não apenas narrado.",
      influences: [
        "Textos das Pirâmides e dos Sarcófagos",
        "Livro dos Mortos",
        "Teologia de Heliópolis (Atum, Osíris, Ísis)",
        "Recepção greco-romana de Ísis",
      ],
      tensions: [
        "Ordem (maat) contra o caos (isfet)",
        "Legitimação do faraó como Horus vivo",
        "Morte como passagem, não como fim",
      ],
    },
  },
  {
    match: /mesopot/i,
    data: {
      context:
        "A literatura mesopotâmica (suméria, acádia, babilônica) é a mais antiga tradição escrita de que se tem registro. Epopeias como Gilgamesh tratam de amizade, mortalidade e o limite do humano sob a sombra de deuses indiferentes.",
      influences: [
        "Ciclo de Gilgamesh (versões sumérias e acádia)",
        "Enuma Elish e Atrahasis",
        "Escrita cuneiforme e cultura palaciana",
        "Influência sobre Gênesis e a literatura grega",
      ],
      tensions: [
        "Mortalidade humana contra a imortalidade divina",
        "Civilização urbana contra a natureza selvagem",
        "Dilúvio como reinício da humanidade",
      ],
    },
  },
  {
    match: /hindu|ram/i,
    data: {
      context:
        "A tradição hindu organiza-se em torno do dharma, do ciclo de renascimentos (samsara) e das epopeias Ramáiana e Mahabharata, transmitidas oralmente e fixadas entre os séculos IV a.C. e IV d.C. O mito é inseparável da prática ritual e devocional.",
      influences: [
        "Ramáiana de Valmiki e Mahabharata",
        "Purāṇas e tradição védica",
        "Devotional bhakti",
        "Difusão no sudeste asiático",
      ],
      tensions: [
        "Dharma (dever) contra desejo individual",
        "Ordem cósmica e o papel do avatar divino",
        "Fidelidade, honra e renúncia",
      ],
    },
  },
  {
    match: /african|ashanti|iorub/i,
    data: {
      context:
        "As tradições orais africanas (ashanti, iorubá e outras) preservam cosmologias, linhagens e sabedoria prática por meio de contadores de histórias, tambores e rituais. A figura do trickster — Anansi, Exu — é central: a astúcia é uma forma de sobrevivência cultural.",
      influences: [
        "Tradição oral akan e iorubá",
        "Contos de Anansi e a diáspora atlântica",
        "Rituais e sociedades secretas",
        "Reinterpretação na literatura afro-brasileira e caribenha",
      ],
      tensions: [
        "Sabedoria popular contra poder centralizado",
        "O trickster como crítica social e sobrevivência",
        "Transmissão oral e memória da diáspora",
      ],
    },
  },
  {
    match: /asteca|maia|inca|amer.ndi/i,
    data: {
      context:
        "As tradições mesoamericanas foram registradas em códices e na oralidade, muitas vezes sob a violência da colonização. Mitos de criação, sacrifício e ciclos cósmicos (os Sóis) organizam uma visão de mundo em que a dívida com os deuses é permanente.",
      influences: [
        "Popol Vuh (maia k'iche')",
        "Códices e crônicas coloniais",
        "Cosmologia dos Cinco Sóis",
        "Releituras indígenas contemporâneas",
      ],
      tensions: [
        "Sacrifício como manutenção cósmica",
        "Ciclos de criação e destruição",
        "Colonização e apagamento de fontes",
      ],
    },
  },
  {
    match: /japon/i,
    data: {
      context:
        "O folclore japonês combina xintoísmo, budismo e tradições locais; os contos (mukashibanashi) circulam em versões regionais e foram fixados na era Edo por coletores como Seki Keigo. A narrativa é muitas vezes uma prova de virtude e cooperação.",
      influences: [
        "Xintoísmo (kami) e budismo",
        "Coleções da era Edo",
        "Teatro nō e kabuki",
        "Difusão moderna em anime e cinema",
      ],
      tensions: [
        "Cooperação contra força individual",
        "Virtude como proteção sobrenatural",
        "Fronteira entre humanos e kami",
      ],
    },
  },
  {
    match: /celta|irland/i,
    data: {
      context:
        "A tradição celta irlandesa chega por manuscritos medievais (Ulster Cycle, Lebor Gabála) redigidos por monges cristãos séculos após a transmissão oral. O herói Cú Chulainn combina glória individual e destino trágico, sob um mundo em que a magia é cotidiana.",
      influences: [
        "Ciclo de Ulster e manuscritos medievais",
        "Druidismo e tradição oral",
        "Hagiografia cristã irlandesa",
        "Renascimento literário irlandês",
      ],
      tensions: [
        "Glória individual contra dever coletivo",
        "Destino e geas (interdições rituais)",
        "Cristianização de mitos pagãos",
      ],
    },
  },
  {
    match: /alem|shakespeare|italian|inglesa/i,
    data: {
      context:
        "A obra se insere em uma tradição literária que dialoga com fontes clássicas e medievais. O período de composição define menos seus temas do que seu vocabulário moral: honra, culpa, destino e legitimidade do poder são questões vivas no teatro e na literatura da época.",
      influences: [
        "Fontes clássicas e medievais",
        "Tradição teatral e retórica escolar",
        "Cristianismo e debate moral",
        "Recepção moderna e adaptações",
      ],
      tensions: [
        "Ambição e legitimidade do poder",
        "Culpa e redenção",
        "Indivíduo contra ordem social",
      ],
    },
  },
  {
    match: /persa|p.rsi|árabe|arabe|sufi|isl.m/i,
    data: {
      context:
        "As narrativas persas e árabes que chegaram ao acervo passam pelo Shahnameh de Firdusi (c. 1010), pela poesia mística de Attar e pela tradição do amor cortês beduíno. São textos de fronteira: preservam cosmogonias zoroastrianas dentro de uma moldura islâmica e fazem da linguagem poética o principal veículo de filosofia.",
      influences: [
        "Shahnameh e a epopeia nacional persa",
        "Sufismo e poesia mística (Attar, Rumi)",
        "Tradição oral dos contadores (naqqāl)",
        "Recepção europeia via Orientalismo",
      ],
      tensions: [
        "Livre-arbítrio e decreto divino",
        "Tirania legitimada contra legitimidade conquistada",
        "Amor humano como metáfora do divino",
      ],
    },
  },
  {
    match: /brasileir|afro-brasileir|guarani|tupi/i,
    data: {
      context:
        "As narrativas brasileiras combinam cosmologias indígenas, matrizes africanas e a literatura de um país que se pensou como projeto europeu nos trópicos. Folclore, romance e canção funcionam aqui como arquivo de tensões raciais e sociais que a história oficial preferiu silenciar.",
      influences: [
        "Cosmologias tupi-guarani e iorubá",
        "Registros jesuíticos e crônicas coloniais",
        "Romantismo indianista e modernismo",
        "Tradição oral e cultura popular nordestina",
      ],
      tensions: [
        "Tradição oral contra arquivo escrito",
        "Mestiçagem como mito e como violência",
        "Idealização do povo e exclusão real",
      ],
    },
  },
  {
    match: /latino-american|hispano|maya|maia|asteca|inca|andina/i,
    data: {
      context:
        "As narrativas latino-americanas que o acervo reúne vão das crônicas maias do Popol Vuh ao realismo mágico do século XX. Todas lidam com o mesmo problema: contar um mundo cuja experiência não cabe nas formas narrativas herdadas da Europa.",
      influences: [
        "Popol Vuh e crônicas indígenas coloniais",
        "Tradição oral andina e amazônica",
        "Boom latino-americano e realismo mágico",
        "Teologia da libertação e crítica pós-colonial",
      ],
      tensions: [
        "Tempo cíclico contra tempo linear",
        "Conquista e sobrevivência cultural",
        "Mito comunitário e voz individual",
      ],
    },
  },
  {
    match: /eslav|russo|polon|tchec|b.ltic/i,
    data: {
      context:
        "O material eslavo chega por compilações tardias: Afanásiev no século XIX, crônicas medievais e a tradição dos byliny cantados. Muita coisa sobreviveu em forma de conto de fadas, o que fez a tradição ser lida por folcloristas antes de ser lida como mitologia.",
      influences: [
        "Contos de Afanásiev e compilações folclóricas",
        "Crônicas medievais e hagiografia",
        "Byliny e cantos épicos eslavos",
        "Recepção romântica e nacionalista",
      ],
      tensions: [
        "Cristianismo sobrevivendo ao paganismo",
        "Fronteira entre a aldeia e a floresta",
        "Destino e obediência ao mais velho",
      ],
    },
  },
  {
    match: /polin.si|maori|havaian|pac.fic|abor.gen/i,
    data: {
      context:
        "As tradições do Pacífico são orais e performáticas: genealogias cantadas, navegação estelar e relatos que só fazem sentido dentro de uma comunidade que os recita. A colonização transformou essas narrativas em 'mitos' justamente quando lhes negava a condição de história.",
      influences: [
        "Genealogias e cantos rituais polinésios",
        "Navegação de longa distância e conhecimento estelar",
        "Registros missionários e etnográficos",
        "Renascimento cultural e línguas nativas",
      ],
      tensions: [
        "Oralidade contra arquivo colonial",
        "Terra e mar como parentes, não recursos",
        "Trickster como legislador e transgressor",
      ],
    },
  },
  {
    match: /nativo|norte-americ|inuit|iroques|anishinaabe|algonquin|lakota|navajo/i,
    data: {
      context:
        "As narrativas nativas norte-americanas que o acervo recolhe pertencem a nações distintas, com línguas e cosmologias próprias. Muitas só podem ser contadas em certas estações e por pessoas autorizadas — o que torna qualquer antologia impressa já uma tradução política.",
      influences: [
        "Tradição oral de nações algonquinas, iroquesas e sioux",
        "Ciclos do trickster Coiote",
        "Etnografia do século XIX e XX",
        "Literatura indígena contemporânea",
      ],
      tensions: [
        "Narrativa como propriedade comunitária",
        "Sobrevivência após genocídio e remoção",
        "Animais como pessoas, não símbolos",
      ],
    },
  },
  {
    match: /chin|china|corean|vietnam|joseon/i,
    data: {
      context:
        "As narrativas do leste asiático circulam entre clássicos canônicos, romances de dinastia, teatro e tradição oral. Há um fundo compartilhado — budismo, confucionismo e taoísmo — mas cada tradição nacional reorganiza esse fundo segundo sua própria política de gênero e de classe.",
      influences: [
        "Clássicos chineses e romances de dinastia",
        "Budismo, taoísmo e confucionismo",
        "Pansori e teatro popular coreano",
        "Folclore vietnamita e crônicas locais",
      ],
      tensions: [
        "Dever filial contra desejo individual",
        "Hierarquia confuciana e mobilidade social",
        "Ordem cósmica e catástrofe natural",
      ],
    },
  },
  {
    match: /cinema|literatura contempor|graphic novel|ficção|anima|mang.|quadrinho|s.rie\(/i,
    data: {
      context:
        "A obra pertence a um repertório popular de massas: cinema, literatura de gênero e quadrinhos são formas industriais, distribuídas globalmente e imediatamente absorvidas pelo mercado e pelo fandom. Essa circulação molda tanto a estrutura (três atos, franquias) quanto a recepção.",
      influences: [
        "Cinema clássico de gênero e Hollywood",
        "Mitologias tradicionais reelaboradas",
        "Cultura de fandom e franquias",
        "Crítica acadêmica de cultura popular",
      ],
      tensions: [
        "Mito antigo e entretenimento industrial",
        "Indivíduo prodigioso contra sistema",
        "Mercado, autoria e propriedade intelectual",
      ],
    },
  },
];

function buildCultural(entry: CatalogEntry, facts: NarrativeFacts): CulturalAnalysis {
  const tradition =
    TRADITION_CONTEXT.find((t) => t.match.test(entry.origin))?.data ??
    TRADITION_CONTEXT[TRADITION_CONTEXT.length - 1].data;

  const sameTradition = CATALOG.filter(
    (o) => o.id !== entry.id && normalizeText(o.origin) === normalizeText(entry.origin)
  )
    .slice(0, 3)
    .map((o) => o.name);

  return {
    summary: `"${facts.name}" pertence ao repertório de ${entry.origin} e circula em ${entry.period}. ${truncate(tradition.tensions[0] ?? "", 16)} organiza seu horizonte de valores.`,
    historicalContext: tradition.context,
    culturalInfluences: [
      ...tradition.influences.slice(0, 4),
      ...(sameTradition.length > 0
        ? [`Outras narrativas da mesma tradição no catálogo: ${sameTradition.join(", ")}`]
        : []),
    ].slice(0, 5),
    valuesAndTensions: [
      ...tradition.tensions.slice(0, 3),
      `Tema próprio da obra: ${entry.themes[0] ?? "transformação"}`,
    ].slice(0, 4),
    reception: `A recepção de "${facts.name}" foi moldada pela forma como ${entry.origin} circulou: ${entry.period}. Obras assim costumam ser relidas a cada geração, e cada releitura desloca o sentido original — o que torna a análise cultural sempre provisória.`,
    confidence: 0.68,
  };
}

// ---------------------------------------------------------------------------
// Fatos a partir do catálogo
// ---------------------------------------------------------------------------

function factsFromEntry(entry: CatalogEntry): NarrativeFacts {
  return {
    name: entry.name,
    type: entry.type,
    origin: entry.origin,
    period: entry.period,
    characters: entry.characters.slice(0, 6),
    synopsis: entry.synopsis,
    found: true,
    variants: [],
  };
}

// ---------------------------------------------------------------------------
// Paralelos determinísticos (módulo compartilhado)
// ---------------------------------------------------------------------------

/** Conexões determinísticas do catálogo (mesma lógica usada no cliente). */
export function localParallels(fingerprint: Fingerprint, factsName: string): Connection[] {
  return buildParallelConnections(fingerprint, factsName, { limit: 5, poolSize: 10 });
}

// ---------------------------------------------------------------------------
// Resumo executivo local
// ---------------------------------------------------------------------------

function localSummary(facts: NarrativeFacts, parallels: Connection[], source: AnalysisSource): string {
  if (parallels.length === 0) {
    return `${facts.name} (${facts.origin}) não encontrou paralelos acima do limiar no catálogo curado. A análise estrutural, simbólica e arquetípica sugere, ainda assim, que a narrativa mobiliza padrões universais — provações, mediações e transformações — que atravessam culturas distintas.`;
  }
  const top = parallels[0];
  const others = parallels
    .slice(1, 4)
    .map((p) => `${p.name} (${Math.round(p.score)})`)
    .join(", ");
  const origem =
    source === "reference"
      ? "O dossiê curado do acervo legado"
      : "A leitura determinística sobre o catálogo";
  const elenco = facts.characters.slice(0, 2).join(" e ");
  return `${origem} situa ${facts.name}, de ${facts.origin}, no centro de uma rede de motivos recorrentes${elenco ? `, com ${elenco} como eixo da travessia` : ""}. O paralelo mais forte é ${top.name} (${Math.round(top.score)}/100) — ${top.reason} Em seguida aparecem ${others}. O conjunto mostra que a força da história não está em sua originalidade absoluta, mas na maneira específica como recombina padrões arquetípicos já circulantes — e é justamente essa recombinação que o Oráculo torna visível.`;
}


/** Une dois fingerprints preservando ordem e removendo duplicatas normalizadas. */
function mergeFingerprints(a: Fingerprint, b: Fingerprint): Fingerprint {
  const merge = (x: string[], y: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of [...x, ...y]) {
      const norm = normalizeText(item);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      out.push(norm);
    }
    return out;
  };
  return {
    motifs: merge(a.motifs, b.motifs),
    archetypes: merge(a.archetypes, b.archetypes),
    themes: merge(a.themes, b.themes),
    beats: merge(a.beats, b.beats),
  };
}

// ---------------------------------------------------------------------------
// Montagem do resultado
// ---------------------------------------------------------------------------

export interface LocalAnalysisOptions {
  input: string;
  depth: AnalysisDepth;
  id: string;
  createdAt: string;
}

/**
 * Produz o `AnalysisResult` completo no modo local.
 * Lança `NarrativeNotFoundError` quando o input não corresponde a nada no
 * catálogo nem aos dossiês de referência.
 */
export function buildLocalAnalysis(options: LocalAnalysisOptions): AnalysisResult {
  const { input, depth, id, createdAt } = options;
  const dossier: ReferenceDossier | null = findReferenceDossier(input);
  const entry = dossier
    ? (CATALOG.find((e) => e.id === dossier.id) ?? null)
    : matchCatalogEntry(input);

  if (!dossier && !entry) {
    const variants = closestCatalogNames(input);
    throw new NarrativeNotFoundError(
      `O motor local ainda não conhece "${input}". Ele opera sobre o catálogo curado — tente uma destas narrativas.`,
      variants
    );
  }

  const catalogEntry: CatalogEntry =
    entry ?? {
      id: dossier!.id,
      name: dossier!.facts.name,
      type: dossier!.facts.type as MediaType,
      origin: dossier!.facts.origin,
      period: dossier!.facts.period,
      synopsis: dossier!.facts.synopsis,
      motifs: dossier!.symbols.symbols.map((s) => s.symbol),
      archetypes: dossier!.archetypes.archetypes.map((a) => a.archetype),
      themes: dossier!.themes.themes,
      characters: dossier!.facts.characters,
    };

  const facts = dossier ? dossier.facts : factsFromEntry(catalogEntry);

  const structure = dossier ? dossier.structure : buildStructure(catalogEntry, facts);
  const archetypes = dossier ? dossier.archetypes : buildArchetypes(catalogEntry, facts);
  const symbols = dossier ? dossier.symbols : buildSymbols(catalogEntry, facts);
  const themes = dossier ? dossier.themes : buildThemes(catalogEntry, facts);
  const psychoanalysis = dossier
    ? dossier.psychoanalysis
    : buildPsychoanalysis(catalogEntry, facts);
  const cultural = dossier ? dossier.cultural : buildCultural(catalogEntry, facts);

  const requested = new Set(DEPTH_AGENTS[depth]);
  const keep = <T,>(agentId: AgentId, value: T): T | null =>
    requested.has(agentId) ? value : null;

  // O fingerprint combina o vocabulário canônico do catálogo (que garante
  // comparabilidade) com o vocabulário próprio do dossiê (que preserva a
  // riqueza simbólica da análise curada).
  const fingerprint = dossier
    ? mergeFingerprints(
        buildFingerprint({ structure, archetypes, symbols, themes }),
        buildFingerprint({
          structure,
          archetypes: {
            ...archetypes,
            archetypes: [
              ...archetypes.archetypes,
              ...(entry?.archetypes ?? []).map((archetype) => ({
                character: "—",
                archetype,
                description: "",
              })),
            ],
          },
          symbols: {
            ...symbols,
            symbols: [
              ...symbols.symbols,
              ...(entry?.motifs ?? []).map((symbol) => ({
                symbol,
                meaning: "",
                universalMeaning: "",
                presence: "moderado" as const,
                historicalParallels: [],
              })),
            ],
          },
          themes: {
            ...themes,
            themes: [...themes.themes, ...(entry?.themes ?? [])],
          },
        })
      )
    : buildFingerprint({ structure, archetypes, symbols, themes });

  const parallels = requested.has("parallels") ? localParallels(fingerprint, facts.name) : [];
  const source: AnalysisSource = dossier ? "reference" : "catalog";

  const confidences = [
    0.92,
    structure.confidence,
    archetypes.confidence,
    symbols.confidence,
    themes.confidence,
    psychoanalysis.confidence,
    cultural.confidence,
  ];
  const confidence =
    confidences.reduce((acc, c) => acc + c, 0) / confidences.length;

  return {
    id,
    input,
    facts,
    structure: keep("structure", structure),
    archetypes: keep("archetypes", archetypes),
    symbols: keep("symbols", symbols),
    themes: keep("themes", themes),
    psychoanalysis: keep("psychoanalysis", psychoanalysis),
    cultural: keep("cultural", cultural),
    parallels,
    fingerprint,
    confidence,
    summary: localSummary(facts, parallels, source),
    cached: false,
    engine: "local",
    source,
    createdAt,
  };
}

// ---------------------------------------------------------------------------
// Comparação local (usada por /api/compare quando não há LLM)
// ---------------------------------------------------------------------------

export function buildLocalComparison(aName: string, aOrigin: string, bName: string, bOrigin: string) {
  const a = matchCatalogEntry(aName) ?? matchCatalogEntry(aOrigin);
  const b = matchCatalogEntry(bName) ?? matchCatalogEntry(bOrigin);

  const aMotifs = a?.motifs.map(normalizeText) ?? [];
  const bMotifs = b?.motifs.map(normalizeText) ?? [];
  const sharedMotifs = aMotifs.filter((m) =>
    bMotifs.some((bm) => bm === m || bm.includes(m) || m.includes(bm))
  );

  const aArch = a?.archetypes ?? [];
  const bArch = b?.archetypes ?? [];
  const sharedArchetypes = aArch.filter((x) => bArch.includes(x));

  const aThemes = a?.themes.map(normalizeText) ?? [];
  const bThemes = b?.themes.map(normalizeText) ?? [];
  const sharedThemes = aThemes.filter((t) =>
    bThemes.some((bt) => bt === t || bt.includes(t) || t.includes(bt))
  );

  // Mesma métrica do grafo: scorePair sobre os fingerprints do catálogo,
  // quando as duas narrativas estão no acervo. Fallback heurístico só então.
  let rawScore: number;
  if (a && b) {
    rawScore = scorePair(
      catalogEntryToFingerprint(a),
      catalogEntryToFingerprint(b)
    ).score;
  } else {
    rawScore = Math.min(
      100,
      Math.round(
        (sharedMotifs.length * 18 + sharedArchetypes.length * 14 + sharedThemes.length * 12) /
          Math.max(1, Math.min(4, aMotifs.length || 4)) || 40
      )
    );
  }
  const score = calibrateScore(rawScore);

  const convergences = [
    {
      title: "Motivos compartilhados",
      points:
        sharedMotifs.length > 0
          ? sharedMotifs.slice(0, 4).map((m) => `Ambas mobilizam o motivo "${m}".`)
          : ["Não há motivos idênticos de superfície — o parentesco é estrutural."],
    },
    {
      title: "Arquétipos",
      points:
        sharedArchetypes.length > 0
          ? sharedArchetypes.map((a) => `A função de ${a} aparece nas duas narrativas.`)
          : ["Os protagonistas ocupam posições equivalentes no sistema de personagens."],
    },
    {
      title: "Temas universais",
      points:
        sharedThemes.length > 0
          ? sharedThemes.slice(0, 4).map((t) => `Ambas tratam de "${t}".`)
          : ["Ambas respondem a perguntas humanas semelhantes sob roupagens culturais distintas."],
    },
  ];

  return {
    a: {
      name: aName,
      origin: aOrigin,
      essence:
        a?.synopsis.split(".")[0] ??
        `Narrativa de ${aOrigin}, analisada pelo motor local sobre o catálogo curado.`,
    },
    b: {
      name: bName,
      origin: bOrigin,
      essence:
        b?.synopsis.split(".")[0] ??
        `Narrativa de ${bOrigin}, analisada pelo motor local sobre o catálogo curado.`,
    },
    score,
    convergences,
    differences: [
      `Origens culturais distintas: ${aOrigin} versus ${bOrigin}.`,
      `Períodos e meios expressivos diferentes: ${a?.period ?? "—"} / ${b?.period ?? "—"}.`,
      `Ênfases temáticas próprias: ${a?.themes[0] ?? "—"} contra ${b?.themes[0] ?? "—"}.`,
    ],
    sharedSymbols: sharedMotifs.slice(0, 6),
    categories: [
      ...(sharedMotifs.length ? ["simbólica"] : []),
      ...(sharedArchetypes.length ? ["arquetípica"] : []),
      ...(sharedThemes.length ? ["temática"] : []),
    ],
    narrative: `${aName} (${aOrigin}) e ${bName} (${bOrigin}) convergem em ${[
      sharedMotifs.slice(0, 2).join(", "),
      sharedArchetypes.slice(0, 1).join(", "),
      sharedThemes.slice(0, 2).join(", "),
    ]
      .filter(Boolean)
      .join("; ") || "padrões estruturais de partida, prova e transformação"}. A comparação é feita pelo motor local com base nos fingerprints do catálogo — cada ponto pode ser verificado na ficha de cada narrativa.`,
    disclaimer:
      "Comparação determinística produzida pelo motor local sobre o catálogo curado. Interpretativa e aproximada; não substitui leitura crítica das fontes.",
  };
}
