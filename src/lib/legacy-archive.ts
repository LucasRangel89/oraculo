/**
 * Acervo legado — inventário, matriz de extração e coleções temáticas.
 *
 * Consolida a leitura dos seis documentos .docx enviados ao projeto em dados
 * navegáveis dentro do produto. A versão longa (com citações e análise crítica)
 * está em `docs/ANALISE-ARQUIVOS-LEGADOS.md`; aqui ficam apenas os artefatos
 * acionáveis.
 *
 * Módulo puro — seguro para o cliente.
 */
import { CATALOG } from "@/lib/oracle-catalog";
import { normalizeText } from "@/lib/similarity";
import type { CatalogEntry } from "@/lib/oracle-types";

// ---------------------------------------------------------------------------
// Inventário dos documentos
// ---------------------------------------------------------------------------

export interface LegacyDocument {
  id: string;
  file: string;
  title: string;
  kind: "blueprint" | "estudo-de-caso" | "portfolio" | "relatorio";
  /** o que o documento acrescenta ao projeto */
  value: string;
  /** o que foi efetivamente aproveitado */
  extracted: string[];
  /** páginas/caracteres aproximados, para dimensionar o material */
  size: string;
}

export const LEGACY_DOCUMENTS: LegacyDocument[] = [
  {
    id: "blueprint-explorador",
    file: "Blueprint_ Narrativas Conectadas - Explorador Mitológico Universal.docx",
    title: "Narrativas Conectadas — Explorador Mitológico Universal",
    kind: "blueprint",
    value:
      "O documento mais completo: define os 8 agentes especialistas (incluindo o Cultural-Histórico), o fluxo em 5 etapas, wireframes de 4 telas, prompts prontos, análise de riscos e roadmap em 4 fases.",
    extracted: [
      "Agente Cultural-Histórico (8ª lente) — prompt e lugar no pipeline",
      "Personas por agente (identificador, estruturalista, arquetípico, simbólico, psicanalítico, filosófico, cultural)",
      "Wireframe de dashboard em 3 colunas + abas de análise",
      "Tela de comparação profunda com convergências por categoria",
      "Riscos: alucinação, viés cultural, custo de API, direitos autorais",
      "Roadmap em 4 fases e KPIs de sucesso",
      "Coleções temáticas (tricksters, descidas ao submundo, heróis sacrificiais)",
    ],
    size: "~17 mil caracteres",
  },
  {
    id: "blueprint-app",
    file: "Blueprint_ App de Análise de Narrativas Mitológicas e Culturais.docx",
    title: "App de Análise de Narrativas Mitológicas e Culturais",
    kind: "blueprint",
    value:
      "Versão enxuta do fluxo, com foco em pontos fortes/fracos e priorização de MVP. Recomenda começar com Estrutural + Comparativo e expandir por feedback.",
    extracted: [
      "Fluxo de MVP enxuto (começar pequeno, expandir por feedback)",
      "Modo Iniciante × Modo Especialista (profundidade de leitura)",
      "Timeline comparativa e mapa geográfico de disseminação (backlog)",
      "Métricas: tempo por sessão, conexões descobertas, retenção",
      "Alerta de viés ocidental e de superficialidade analítica",
    ],
    size: "~3,5 mil caracteres",
  },
  {
    id: "narrativa-ia",
    file: "Narrativa IA.docx",
    title: "Narrativa.AI — Orquestrador de Análise Narrativa",
    kind: "portfolio",
    value:
      "Documento de produto/UX do antecessor direto do Oráculo: 8 agentes, mesa redonda digital, diretor de arte, chat contextual por especialista e métricas de latência.",
    extracted: [
      "Conceito de 'mesa redonda digital' e voz distinta por agente",
      "Agente Diretor de Arte → arte-síntese (com fallback local em SVG)",
      "Chat contextual por agente (backlog priorizado)",
      "KPIs: latência < 20s, engajamento por agente, fidelidade visual",
      "Execução paralela com Promise.all para reduzir latência",
    ],
    size: "~5,5 mil caracteres",
  },
  {
    id: "oraculo-conexoes",
    file: "Oráculo das conexões narrativas.docx",
    title: "Oráculo das Conexões Narrativas — estudo de caso",
    kind: "estudo-de-caso",
    value:
      "Consolida o posicionamento do produto (hermenêutica digital, dark mode Cyber-Classical) e confirma a aba de documentação integrada como decisão de produto.",
    extracted: [
      "Posicionamento: hermenêutica digital e 'DNA da história'",
      "Paleta Cyber-Classical (índigo/slate/dourado)",
      "Documentação integrada como parte da experiência",
      "Fingerprint narrativo como diferencial explicável",
    ],
    size: "~3 mil caracteres",
  },
  {
    id: "relatorio-lotr",
    file: "Relatório de Análise Completa_ A Trilogia _O Senhor dos Anéis_.docx",
    title: "Relatório de Análise Completa — O Senhor dos Anéis",
    kind: "relatorio",
    value:
      "O documento mais valioso: uma análise real, longa e de alta qualidade, em 6 lentes (Estrutural, Personagens, Temática, Estilística, Psicológica, Cultural). Funciona como gabarito de saída e como conteúdo de demonstração.",
    extracted: [
      "Dossiê de referência completo de Frodo / O Senhor dos Anéis",
      "Estrutura em 3 atos + 12 estágios da jornada com evidências",
      "Arquétipos por personagem (Frodo, Sam, Gandalf, Aragorn, Gollum, Sauron)",
      "Leitura psicanalítica detalhada (Id, cisão, Sombra, Mãe Terrível)",
      "Lente cultural: WWI, totalitarismos, industrialização, catolicismo, fontes nórdicas",
      "Modelo de voz para o agente cultural ('O Historiador Social')",
      "Lente estilística identificada como lacuna a implementar",
    ],
    size: "~16 mil caracteres",
  },
  {
    id: "analise-mitologica",
    file: "analise mitologica.docx",
    title: "Análise mitológica — blueprint técnico e prompts",
    kind: "blueprint",
    value:
      "Especificação técnica mais próxima de engenharia: esquema JSON por agente, algoritmo de similaridade com pesos, checklist de QA e ética de proveniência.",
    extracted: [
      "Contrato JSON padronizado por agente (agent, confidence, outputs)",
      "Pesos de similaridade por dimensão e re-ranking via LLM",
      "Explicabilidade: 1–2 frases justificando cada aresta do grafo",
      "Proveniência obrigatória (catálogo vs. LLM) e disclaimers",
      "Checklist: cache, dedupe por variantes, modo demo offline",
      "Graph database (Neo4j) e API pública no roadmap longo",
    ],
    size: "~13 mil caracteres",
  },
];

// ---------------------------------------------------------------------------
// Matriz de extração (documento → decisão de produto)
// ---------------------------------------------------------------------------

export type ExtractionStatus = "implementado" | "incorporado" | "backlog";

export interface ExtractionItem {
  id: string;
  /** capacidade do produto */
  capability: string;
  /** de onde veio */
  provenance: string;
  /** o que foi feito */
  decision: string;
  status: ExtractionStatus;
}

export const EXTRACTION_MATRIX: ExtractionItem[] = [
  {
    id: "agentes-8",
    capability: "Oito lentes especialistas com vozes distintas",
    provenance: "Explorador Mitológico Universal §Sistema de Agentes; Narrativa IA",
    decision:
      "As 7 lentes existentes foram mantidas e a 8ª (Cultural-Histórico / 'O Historiador Social') foi implementada com prompt próprio, painel na UI e participação no fingerprint.",
    status: "incorporado",
  },
  {
    id: "pipeline-paralelo",
    capability: "Orquestração paralela com progresso em tempo real",
    provenance: "Explorador §Fluxo Principal; Narrativa IA §Performance",
    decision:
      "Mantido o streaming SSE com stagger para evitar rate-limit. No motor local, o progresso é distribuído por lente para preservar a pedagogia do processo.",
    status: "implementado",
  },
  {
    id: "cultural",
    capability: "Contexto histórico e diálogo cultural",
    provenance: "Relatório LOTR §6; Blueprint App §Agente Cultural",
    decision:
      "Nova lente entrega contexto histórico, influências, valores em tensão e recepção — separando explicitamente fato documentado de interpretação.",
    status: "incorporado",
  },
  {
    id: "estilistico",
    capability: "Lente estilística (voz, ritmo, recursos expressivos)",
    provenance: "Relatório LOTR §4 (ausente nos blueprints)",
    decision:
      "Identificada como lacuna; registrada no backlog com o texto do relatório como especificação de saída.",
    status: "backlog",
  },
  {
    id: "fingerprint",
    capability: "Fingerprint narrativo + score transparente",
    provenance: "oraculo-conexoes; analise mitologica §5",
    decision:
      "Já existia; agora aceita pesos ajustáveis pelo usuário, com recálculo do grafo no cliente e breakdown por dimensão exposto.",
    status: "incorporado",
  },
  {
    id: "grounding",
    capability: "Grounding anti-alucinação",
    provenance: "analise mitologica §5 e §13; Explorador §Pontos Fracos",
    decision:
      "O Agente Comparativo recebe lista fechada de candidatos e só pode citar nomes aprovados; o score determinístico nunca é inventado pelo modelo.",
    status: "implementado",
  },
  {
    id: "dossies",
    capability: "Dossiês de referência (gabarito de qualidade)",
    provenance: "Relatório LOTR; exemplos Perseu/Prometeu dos blueprints",
    decision:
      "Quatro dossiês curados (O Senhor dos Anéis, Perseu, Prometeu, Édipo) servem de demonstração, teste de contrato e conteúdo da aba Acervo.",
    status: "incorporado",
  },
  {
    id: "prompts",
    capability: "Biblioteca de prompts navegável e exportável",
    provenance: "Narrativa IA §Funcionalidades; analise mitologica §4",
    decision:
      "Prompts extraídos para módulo puro, com persona, base teórica e entrega; a UI permite ler, copiar e baixar o kit completo.",
    status: "incorporado",
  },
  {
    id: "modo-local",
    capability: "Modo demonstração offline (sem chave de API)",
    provenance: "analise mitologica §15 (checklist técnico)",
    decision:
      "Motor hermenêutico determinístico sobre o catálogo + dossiês: permite visitar todo o produto sem custo e sem alucinação, com selo de proveniência.",
    status: "incorporado",
  },
  {
    id: "provedores",
    capability: "Independência de provedor de LLM",
    provenance: "Explorador §Ensemble de modelos; README (nota sobre z-ai)",
    decision:
      "Camada `llm.ts` suporta z.ai (original), qualquer endpoint OpenAI-compatible e fallback local, escolhidos por variáveis de ambiente.",
    status: "incorporado",
  },
  {
    id: "persistencia",
    capability: "Cache, histórico e feedback resilientes",
    provenance: "Blueprint App §Métrica; analise mitologica §15",
    decision:
      "Persistência plugável: Prisma/SQLite quando disponível, JSON em disco como fallback — o produto não quebra se o banco não existir.",
    status: "incorporado",
  },
  {
    id: "arte",
    capability: "Arte-síntese da conexão",
    provenance: "Narrativa IA §Diretor de Arte; oraculo-conexoes §Síntese Visual",
    decision:
      "Mantida a geração por IA quando há provedor; sem ele, um sigilo SVG determinístico é gerado localmente (mesma entrada → mesma arte).",
    status: "incorporado",
  },
  {
    id: "export",
    capability: "Exportação do estudo (PDF/JSON)",
    provenance: "Blueprint App §Melhorias; Narrativa IA §Melhorias",
    decision:
      "JSON já existia; adicionado dossiê completo em Markdown (renderizável em PDF), com todas as lentes, breakdown e disclaimers.",
    status: "incorporado",
  },
  {
    id: "chat",
    capability: "Chat contextual com cada especialista",
    provenance: "Narrativa IA §Chat Contextual",
    decision:
      "Requer LLM com memória por agente; especificado no backlog como próxima feature de engajamento.",
    status: "backlog",
  },
  {
    id: "timeline",
    capability: "Timeline comparativa e mapa geográfico",
    provenance: "Blueprint App §Visualizações; Explorador §Dashboard",
    decision:
      "O grafo force-directed cobre a comparação; timeline e mapa exigem dados geo/temporais estruturados — backlog.",
    status: "backlog",
  },
  {
    id: "inverso",
    capability: "Modo inverso ('de que mito vem este filme?')",
    provenance: "Explorador §FASE 3",
    decision:
      "O catálogo já permite busca por motivo/arquétipo na aba Explorar; a classificação livre de um plot exigiria LLM. Backlog.",
    status: "backlog",
  },
  {
    id: "pdf",
    capability: "Export PDF nativo",
    provenance: "Blueprint App §Melhorias",
    decision:
      "Atendido na prática pelo dossiê Markdown (impressão/PDF pelo navegador), sem adicionar dependência pesada.",
    status: "incorporado",
  },
  {
    id: "api-publica",
    capability: "API pública para pesquisadores",
    provenance: "Explorador §FASE 3; analise mitologica §11",
    decision: "As rotas já são REST/SSE; falta autenticação, limites e documentação pública. Backlog.",
    status: "backlog",
  },
  {
    id: "rag",
    capability: "RAG com base vetorial e citações verificáveis",
    provenance: "analise mitologica §5; Explorador §RAG",
    decision:
      "O grounding atual é catálogo + fingerprints (determinístico). Vetores e citações de fontes primárias ficam para a fase de expansão do corpus.",
    status: "backlog",
  },
  {
    id: "colecoes",
    capability: "Coleções temáticas curadas",
    provenance: "Explorador §FASE 2 (Coleções Temáticas)",
    decision:
      "Coleções derivadas do catálogo por motivo/arquétipo, navegáveis e acionáveis na aba Acervo.",
    status: "incorporado",
  },
  {
    id: "gamificacao",
    capability: "Gamificação, badges e 'jornada de descoberta'",
    provenance: "Explorador §FASE 2",
    decision:
      "O progresso por lente já gamifica a espera; badges e trilhas ficam no backlog de engajamento.",
    status: "backlog",
  },
];

// ---------------------------------------------------------------------------
// Coleções temáticas (derivadas do catálogo, não hard-coded por id)
// ---------------------------------------------------------------------------

export interface ThematicCollection {
  id: string;
  title: string;
  subtitle: string;
  /** termos procurados em motivos, arquétipos e temas */
  keywords: string[];
  accent: "amber" | "indigo" | "emerald" | "rose" | "teal" | "violet";
}

export const THEMATIC_COLLECTIONS: ThematicCollection[] = [
  {
    id: "tricksters",
    title: "Tricksters através das culturas",
    subtitle:
      "A astúcia que rompe a ordem para renová-la — de Loki a Anansi, de Prometeu a V.",
    keywords: ["trickster", "astúcia", "máscara", "caos e transformação", "revolução"],
    accent: "amber",
  },
  {
    id: "submundo",
    title: "Descidas ao submundo",
    subtitle:
      "Katábasis: quem desce ao escuro volta diferente — ou não volta inteiro.",
    keywords: ["descida ao submundo", "morte e renascimento", "ressurreição", "julgamento dos mortos"],
    accent: "violet",
  },
  {
    id: "sacrificiais",
    title: "Heróis sacrificiais",
    subtitle:
      "O corpo que paga pelo coletivo: mártires, messias e doadores de fogo.",
    keywords: ["sacrifício", "mártir", "messias", "sacrifício pela humanidade", "expiação"],
    accent: "rose",
  },
  {
    id: "retorno-rei",
    title: "Retorno do rei",
    subtitle:
      "A ordem legítima perdida que retorna — Ítaca, Gondor, o ciclo da savana.",
    keywords: ["retorno do rei", "jornada de retorno", "redenção do pai", "ciclo da vida"],
    accent: "emerald",
  },
  {
    id: "fogo",
    title: "O fogo do conhecimento",
    subtitle:
      "Prometeu, Fausto, Matrix: o preço de saber — e de querer mais do que se deve.",
    keywords: ["fogo do conhecimento", "pacto com o diabo", "busca do conhecimento", "desafio aos deuses", "realidade simulada"],
    accent: "indigo",
  },
  {
    id: "diluvio",
    title: "Dilúvio e renovação",
    subtitle:
      "Fins de mundo que são recomeços: água, ciclo e purificação.",
    keywords: ["dilúvio", "fim do mundo ciclico", "purificação", "ciclo da vida", "renascimento"],
    accent: "teal",
  },
];

/** Entradas do catálogo que pertencem a uma coleção. */
export function collectionEntries(collection: ThematicCollection): CatalogEntry[] {
  const keys = collection.keywords.map(normalizeText);
  return CATALOG.filter((entry) => {
    const haystack = normalizeText(
      [...entry.motifs, ...entry.archetypes, ...entry.themes].join(" ")
    );
    return keys.some((key) => haystack.includes(key));
  });
}

/** Estatísticas do catálogo (usadas no cabeçalho do Acervo). */
export function catalogStats() {
  const traditions = new Set(CATALOG.map((e) => e.origin.split("(")[0].trim()));
  const motifs = new Set(CATALOG.flatMap((e) => e.motifs.map(normalizeText)));
  const archetypes = new Set(CATALOG.flatMap((e) => e.archetypes.map(normalizeText)));
  const themes = new Set(CATALOG.flatMap((e) => e.themes.map(normalizeText)));
  return {
    narratives: CATALOG.length,
    traditions: traditions.size,
    motifs: motifs.size,
    archetypes: archetypes.size,
    themes: themes.size,
  };
}

/** Contagem por status — para o resumo da matriz. */
export function extractionSummary(): Record<ExtractionStatus, number> {
  const base: Record<ExtractionStatus, number> = {
    implementado: 0,
    incorporado: 0,
    backlog: 0,
  };
  for (const item of EXTRACTION_MATRIX) base[item.status] += 1;
  return base;
}
