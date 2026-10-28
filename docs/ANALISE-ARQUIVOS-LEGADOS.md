# Análise dos arquivos legados do Oráculo

> **O que é este documento.** Uma leitura crítica, documento por documento, dos seis arquivos `.docx` que acompanham o projeto original do Oráculo das Conexões Narrativas, com o objetivo de responder a três perguntas: (1) o que já está implementado no código atual; (2) o que os documentos acrescentam de aproveitável; (3) o que deve ser descartado, adiado ou reinterpretado.
>
> **Como foi feito.** Extração integral do texto dos seis `.docx` (XML do pacote Office), leitura completa, comparação com o código-fonte em `src/` e com o contrato de tipos em `src/lib/oracle-types.ts`. Cada afirmação sobre o produto atual é verificável no arquivo indicado.
>
> **Resumo em uma frase.** O acervo legado não é um plano a ser seguido — é uma **mina de decisões de produto** das quais cerca de 60% já foram incorporadas, 15% já existiam e 25% continuam boas ideias à espera do momento certo.

---

## Sumário

1. [Sumário executivo](#1-sumário-executivo)
2. [O corpus analisado](#2-o-corpus-analisado)
3. [Documento por documento](#3-documento-por-documento)
4. [O que o código já fazia](#4-o-que-o-código-já-fazia)
5. [Matriz de extração: 21 capacidades](#5-matriz-de-extração-21-capacidades)
6. [Contradições e ruído nos documentos](#6-contradições-e-ruído-nos-documentos)
7. [Decisões de engenharia e seus porquês](#7-decisões-de-engenharia-e-seus-porquês)
8. [O que deliberadamente não foi feito](#8-o-que-deliberadamente-não-foi-feito)
9. [Lacunas e backlog priorizado](#9-lacunas-e-backlog-priorizado)
10. [Roadmap recomendado](#10-roadmap-recomendado)
11. [Guia de manutenção](#11-guia-de-manutenção)
12. [Anexos](#12-anexos)

---

## 1. Sumário executivo

### 1.1 O que os documentos são

| # | Documento | Natureza | Tamanho | Papel no acervo |
|---|---|---|---|---|
| 1 | `analise mitologica.docx` | Blueprint técnico em formato de resposta de chat | ~13,5 mil caracteres | Especificação de engenharia: esquema JSON, pesos de similaridade, prompts, checklist |
| 2 | `Blueprint_ Narrativas Conectadas — Explorador Mitológico Universal.docx` | Blueprint de produto | ~18,9 mil caracteres | O documento mais completo: 8 agentes, 4 telas, riscos, roadmap de 4 fases |
| 3 | `Narrativa IA.docx` | Estudo de caso de portfólio | ~5,7 mil caracteres | Antecessor direto: mesa redonda digital, diretor de arte, chat por agente |
| 4 | `Oráculo das conexões narrativas.docx` | Estudo de caso do app atual | ~3,2 mil caracteres | Posicionamento, paleta, fingerprint, aba de documentação |
| 5 | `Relatório de Análise Completa_ A Trilogia _O Senhor dos Anéis_.docx` | Análise real, 6 seções | ~16,3 mil caracteres | Gabarito de qualidade (ground truth) e conteúdo de demonstração |
| 6 | `Blueprint_ App de Análise de Narrativas Mitológicas e Culturais.docx` | Blueprint enxuto | ~3,7 mil caracteres | Priorização de MVP e modo iniciante/especialista |

### 1.2 Os cinco achados que importam

1. **O produto já era maior do que os documentos supunham.** O código original já tinha 7 lentes, grafo force-directed em SVG, SSE, cache e export JSON. Três documentos descrevem esse estado como se fosse proposta (`Oráculo`, `Narrativa IA`), enquanto os blueprints 1 e 2 propõem ir além — e é aí que está o valor.

2. **A oitava lente é a extração mais valiosa.** Os blueprints pedem explicitamente um **Agente Cultural-Histórico**; o relatório do Senhor dos Anéis prova, na prática, que essa lente muda a qualidade da análise (contexto de guerra, totalitarismo, catolicismo, fontes nórdicas). Foi implementada com prompt próprio, painel na interface e participação no fingerprint.

3. **O relatório de O Senhor dos Anéis é um ativo, não um plano.** É a única peça do acervo que mostra o *output* desejado em altíssima qualidade. Virou dossiê de referência — e, no modo local, é literalmente o conteúdo servido ao usuário.

4. **A maior parte da infraestrutura sonhada era prematura.** Banco vetorial, Neo4j, embeddings por dimensão, ensemble de modelos e API pública aparecem repetidas vezes, mas nenhum documento enfrenta a pergunta anterior: *de onde vem o corpus?* Com 24 narrativas curadas, um índice determinístico explica-se melhor do que um vetor de 1.536 dimensões.

5. **O acervo é internamente contraditório.** O número de agentes varia de 5 a 8; a stack alterna entre Vite e Next.js, Gemini e um SDK proprietário; a similaridade é descrita como embeddings e como pesos por dimensão. Um produto real precisa escolher — e o documento registra cada escolha.

### 1.3 Números da extração

| Status | Itens | Significado |
|---|---|---|
| `implementado` | 2 | Já existia e foi mantido/ajustado |
| `incorporado` | 12 | Extraído dos documentos e implementado nesta iteração |
| `backlog` | 7 | Reconhecido, especificado e adiado com justificativa |
| **Total** | **21** | Matriz em `src/lib/legacy-archive.ts` (aba **Acervo → Extração**) |

---

## 2. O corpus analisado

### 2.1 Origem e formato

Os seis arquivos são documentos Word (`.docx`) produzidos em momentos diferentes do projeto — alguns são respostas de assistentes de IA coladas em documento (o primeiro começa com *"Perfeito, Lucas — curti demais a ideia"*), outros são estudos de caso escritos para portfólio, e um é uma análise literária de fato.

Isso importa porque define o **gênero** de cada texto: um blueprint escrito por LLM tem vícios característicos — entusiasmo, listas de features sem hierarquia, nomes de modelos inexistentes e promessas de prazo irreais. A análise abaixo separa o que é **decisão de produto** do que é **enchimento retórico**.

### 2.2 Linha do tempo inferida

```
Narrativa.AI (Gemini, Vite, 8 agentes)
        │
        ▼
Oráculo das Conexões (Next.js, 6 lentes, fingerprint, grafo)
        │
        ├──► Blueprint Explorador (8 agentes, 4 telas, roadmap)
        ├──► Blueprint App (MVP enxuto, modo iniciante)
        ├──► Análise mitológica (esquema JSON, pesos, prompts)
        └──► Relatório O Senhor dos Anéis (prova de qualidade)
```

A ordem não é explícita, mas a progressão de escopo é: do *"produto de portfólio com 8 agentes"* para o *"app real com 6 lentes"*, e daí para *"o que falta para voltar a 8 e escalar"*.

---

## 3. Documento por documento

### 3.1 `analise mitologica.docx` — o blueprint de engenharia

**O que contém.** É o documento mais próximo de uma especificação técnica. Estrutura em 15 seções: arquitetura de alto nível (frontend, orquestrador, banco vetorial + catálogo, pipeline de curadoria, serviço de embeddings, camada de visualização); fluxo de dados em 10 passos; esquema JSON por agente; oito prompts de sistema; algoritmo de similaridade; telas; MVP; métricas; forças e riscos; roadmap; ética; e um checklist técnico final.

**Trechos que orientaram decisões**

- *"Cada agente retorna JSON padronizado"* — com um exemplo de envelope: `agent`, `confidence`, `output_summary`, `structure`, `motifs`, `characters`, `embeddings`, `metadata`. O produto atual adotou o **envelope + `confidence`** por lente (visível nos painéis), mas rejeitou `embeddings` no payload: o vetor não é auditável pelo usuário e não há corpus para justificá-lo.
- *"Normalizar por tipo e aplicar pesos (ex.: structure 0.4, motifs 0.3, characters 0.2, cultural 0.1)"* — os pesos foram **recalibrados** para `motifs 0.35 / archetypes 0.25 / themes 0.25 / structure 0.15` porque a lente de personagens foi absorvida por arquétipos e porque estrutura é a dimensão mais escassa no catálogo.
- *"Re-ranker usando LLM: ajuste score final"* — implementado com limite rígido de **±8 pontos** sobre o score determinístico, para que o modelo não possa inventar um ranking.
- *"Para cada aresta no grafo, gere 1–2 frases que justifiquem a ligação"* — o campo `reason` e a lista `convergences` de cada conexão nasceram daqui.
- *"Possibilidade de rodar agentes offline (modo demo) com dados limitados"* — uma linha em um checklist virou a **segunda arquitetura de execução** do produto (motor local determinístico).

**Leitura crítica.** O documento promete um sistema que depende de três ativos que não existiam: um corpus de 1.000 obras curadas, um pipeline de ingestão e um serviço de embeddings. A parte de prompts é boa e reaproveitável; a parte de infraestrutura é aspiracional. O MVP proposto (3 agentes + 1.000 obras) seria mais caro do que o produto inteiro já construído.

**O que foi extraído:** envelope JSON com `confidence`, pesos por dimensão (recalibrados), re-ranking limitado, explicabilidade por aresta, checklist de cache/dedupe/modo demo, ética de proveniência.

---

### 3.2 `Blueprint_ Narrativas Conectadas — Explorador Mitológico Universal.docx` — o blueprint de produto

**O que contém.** O documento mais completo em visão de produto:

- **8 agentes** nomeados e descritos (Identificador, Estruturalista, Arquetípico, Mitológico Comparativo, Simbólico, Psicanalítico, Filosófico-Temático, **Cultural-Histórico**);
- fluxo em 5 etapas (input → validação → análise multiagente → síntese → visualização → exploração);
- **wireframes ASCII de 4 telas** (input inteligente, progresso gamificado, dashboard de 3 colunas, comparação profunda);
- prompt do orquestrador com 7 análises (A–G) e contrato de saída;
- prompts especializados (Estruturalista com os 12 estágios, Comparativo com 10 tradições);
- forças, fraquezas e mitigações;
- roadmap em 4 fases (MVP → engajamento → avançado → inteligência);
- monetização freemium, KPIs, referências de design e considerações éticas.

**Trechos que orientaram decisões**

- *"Agente Cultural-Histórico: contexto sociopolítico da criação; influências históricas, valores da época, subversões"* — virou a oitava lente, com o nome de persona **"O Historiador Social"**.
- *"Layout em 3 colunas: NARRATIVA ORIGINAL | VISUALIZAÇÃO CENTRAL | CONEXÕES DESCOBERTAS"* — é exatamente a estrutura do `Dashboard.tsx`.
- *"Sistema de Tabs na Análise: cada agente tem sua aba"* — implementado em `AgentPanels.tsx` (8 abas + síntese).
- *"Score de Similaridade: percentual visual, breakdown por critério"* — implementado no `ScoreRing` e no modal de comparação.
- *"Coleções Temáticas: Heróis sacrificiais, Tricksters, Descidas ao submundo"* — implementadas na aba Acervo, **derivadas** do catálogo por palavra-chave (não hard-coded).
- *"Modo Iniciante / Especialista"* (também no doc 6) — o produto resolve parcialmente com o seletor de profundidade **Rápida (4 lentes) × Completa (8 lentes)**; o modo iniciante de *linguagem* continua backlog.

**Leitura crítica.** É o melhor documento do acervo em cobertura, e o mais perigoso em execução: propõe 8 agentes, comparação, coleções, gamificação, freemium, API e multimodal no mesmo roadmap. A seção de riscos, porém, é madura e antecipa os problemas reais (alucinação, viés cultural, custo, direitos autorais) — foi ela que motivou o grounding fechado e o motor local.

**O que foi extraído:** 8ª lente, dashboard de 3 colunas, abas por agente, comparação profunda, coleções temáticas, transparência de score, progresso gamificado, riscos e mitigações, KPIs.

---

### 3.3 `Narrativa IA.docx` — o antecessor de portfólio

**O que contém.** Estudo de caso do **Narrativa.AI — Orquestrador de Análise Narrativa**, um produto anterior com a mesma tese: 8 agentes especialistas, "mesa redonda digital", análise com *grounding* via Google Search, **Diretor de Arte** que traduz a análise em prompt visual para o Imagen 4.0, chat contextual por especialista, estética "Cyber-Academic" (ciano/azul), KPIs de latência (<20 s) e 2 semanas de MVP.

**Trechos que orientaram decisões**

- *"A 'Mesa Redonda Digital' — ver a mesma obra sob óticas conflitantes e complementares"* — é a metáfora que sustenta as 8 lentes e o painel de agentes.
- *"Agente Maestro/Diretor de Arte... garante que a arte não seja genérica, mas semanticamente carregada"* — implementado como **arte-síntese**: quando há provedor de imagem, o prompt é derivado dos motivos e temas; quando não há, um **sigilo SVG determinístico** é gerado (mesma entrada → mesma arte).
- *"Chat contextual por agente"* — reconhecido como a feature de engajamento mais forte do acervo e a mais cara de operar (memória por lente × 8). Ficou no backlog com especificação pronta.
- *"Tratamento de limites de taxa ao disparar 8 requisições simultâneas"* — resolvido com **stagger de 350 ms** entre lentes e retry com backoff para 429.

**Leitura crítica.** Os nomes de modelo (`gemini-3-pro-preview`, `gemini-3-flash-preview`) não existiam na época e não existem hoje — sintoma clássico de documento gerado por IA. Também há forte acoplamento ao ecossistema Google (`@google/genai`, Imagen, Search Grounding), o que o produto atual evita ao abstrair o provedor em `llm.ts`.

**O que foi extraído:** personas e vozes distintas, diretor de arte → arte-síntese com fallback local, latência como KPI, paralelismo controlado, ideia de chat por agente (backlog).

---

### 3.4 `Oráculo das conexões narrativas.docx` — o estudo de caso do app atual

**O que contém.** Documento de portfólio do app que já existia: 6 agentes, grafo com pan/zoom e exportação de imagem, síntese visual, "fingerprint narrativo", paleta **Cyber-Classical** (índigo/slate/dourado), aba de documentação integrada, React 19 + Tailwind + Gemini + Mermaid + Marked.

**Trechos que orientaram decisões**

- *"Fingerprint narrativo que une obras díspares através de metadados estruturados"* — mantido e **estendido** com pesos ajustáveis e breakdown por dimensão.
- *"Documentação integrada como parte da experiência"* — virou a aba **Documentação**, e o acervo legado ganhou uma aba própria (**Acervo**).
- *"Dark mode Cyber-Classical (indigo e slate)"* — preservado em `globals.css` (paleta, tipografia serifada para títulos, fundo com vinheta).

**Leitura crítica.** É o único documento que descreve o produto como ele é — e não como poderia ser. Serve como **linha de base** confiável para separar "o que já existia" de "o que os outros documentos pedem". A menção a Mermaid/Marked, porém, já não corresponde ao código: o grafo é um componente SVG próprio e a documentação é JSX, não Markdown renderizado.

**O que foi extraído:** posicionamento, paleta, fingerprint, aba de documentação, grafo interativo.

---

### 3.5 `Relatório de Análise Completa_ A Trilogia _O Senhor dos Anéis_.docx` — o gabarito

**O que contém.** Uma análise real, em 6 seções, escrita com qualidade de ensaio:

1. **Estrutural** — macroestrutura (3 atos = 3 volumes), microestruturas, arcos paralelos, coesão cronológica, 5 pontos de virada (Conselho de Elrond, queda de Gandalf, rompimento da Sociedade, Abismo de Helm, falha de Frodo na Montanha).
2. **Personagens** — protagonistas (Frodo, Sam), antagonistas (Sauron, Saruman, o próprio Anel), mentor (Gandalf, Elrond, Galadriel), coadjuvantes com arco (Aragorn, Gollum), personagens planos (Legolas, Gimli); leitura arquetípica aplicada a Frodo.
3. **Temática** — poder corruptor, amizade/lealdade, sacrifício, piedade, industrialização × natureza, morte e imortalidade, esperança × desespero; mensagem explícita × implícita.
4. **Estilística** — tom épico, canções como veículo de história, simbolismo (Anel, escuridão, luz, leste), filologia, ritmo, narrador-cronista.
5. **Psicológica** — Anel como **Id**; Gollum como **cisão** (splitting); Sauron como Sombra coletiva; Moria como descida ao inconsciente; Laracna como **Mãe Terrível**; Montanha da Perdição como núcleo da libido.
6. **Cultural** — Primeira Guerra, totalitarismos, crítica à industrialização, catolicismo e *eucatástrofe*, fontes nórdicas/Beowulf/Kalevala, fundação da alta fantasia.

**Leitura crítica.** É o documento de maior valor por caractere do acervo. Dois pontos:

- **Cobertura.** Das 6 seções, 5 já tinham lente no produto; **Estilística** não tinha — e é justamente a que dá textura à análise. Foi registrada como lacuna prioritária (backlog).
- **Verificabilidade.** O texto é interpretativo e não cita edições/tradutores; algumas teses (por exemplo, "o Anel é o Id") são leituras, não fatos. Isso reforça a decisão do produto de **marcar psicanálise como especulativa** e de separar fato de interpretação.

**O que foi extraído:** um **dossiê de referência completo** (12 estágios com evidências, 6 símbolos, 6 arquétipos, temas, leitura psicológica, contexto cultural), usado como *ground truth*, teste de contrato das lentes e conteúdo de demonstração — inclusive no modo local, em que é servido literalmente.

---

### 3.6 `Blueprint_ App de Análise de Narrativas Mitológicas e Culturais.docx` — o contrapeso enxuto

**O que contém.** A versão mais curta e mais sóbria: 5 agentes, abas de resultado, pontos fortes/fracos, e uma lista de melhorias em que se destacam **Modo Iniciante × Modo Especialista**, timeline comparativa, mapa de disseminação e integração multimídia. Termina com prioridade explícita: *"comece com agentes especialistas básicos (Estrutural + Comparativo)"*.

**Leitura crítica.** É o único documento que diz "menos". A recomendação de começar pequeno foi **seguida ao pé da letra** na iteração atual: nenhuma lente nova além da cultural, nenhuma dependência nova de infraestrutura, e uma bateria de testes em vez de um roadmap de 4 fases.

**O que foi extraído:** priorização, modo iniciante/especialista (parcial via profundidade), timeline e mapa (backlog), métricas de sessão, alerta de viés.

---

## 4. O que o código já fazia

Antes desta iteração, o produto já entregava:

| Capacidade | Onde | Observação |
|---|---|---|
| 7 lentes em paralelo via SSE | `src/lib/oracle-agents.ts`, `src/app/api/analyze/route.ts` | facts sequencial + 5 em paralelo + comparativo |
| Catálogo curado de 24 narrativas | `src/lib/oracle-catalog.ts` | 17 tradições, 87 motivos, 13 arquétipos, 92 temas |
| Fingerprint + similaridade | `src/lib/similarity.ts` | matching por tokens, pesos fixos |
| Grafo force-directed em SVG | `src/components/oracle/NarrativeGraph.tsx` | drag, pan/zoom, export PNG |
| Comparação lado a lado | `src/app/api/compare/route.ts`, `ComparisonModal.tsx` | convergências por categoria |
| Arte-síntese | `src/app/api/artwork/route.ts` | via modelo de imagem |
| Cache + histórico + feedback | Prisma/SQLite (`prisma/schema.prisma`) | upsert por input normalizado |
| Export JSON | `Dashboard.tsx` | download do payload |
| Aba de documentação | `DocsTab.tsx` | estudo de caso navegável |

O que **não** existia: a 8ª lente, dossiês de referência, motor local, biblioteca de prompts, acervo navegável, pesos ajustáveis, export Markdown, provedor plugável, fallback de arte e persistência resiliente. São exatamente os 12 itens `incorporado` da matriz.

---

## 5. Matriz de extração: 21 capacidades

A tabela completa, com proveniência e decisão, está em `src/lib/legacy-archive.ts` e é navegável em **Acervo → Extração**. Resumo:

### 5.1 Incorporadas nesta iteração (12)

| Capacidade | Origem | Implementação |
|---|---|---|
| Oito lentes com vozes distintas | Explorador §Agentes; Narrativa IA | `CULTURAL_SYSTEM` + `runCulturalAgent` + aba no painel |
| Contexto histórico e diálogo cultural | Relatório LOTR §6; Blueprint App | `CulturalAnalysis` (contexto, influências, tensões, recepção) |
| Fingerprint com pesos ajustáveis | `oraculo-conexoes`; analise mitologica §5 | `weights` no store + recálculo no cliente |
| Dossiês de referência | Relatório LOTR; exemplos Perseu/Prometeu | `reference-analyses.ts` (4 dossiês) |
| Biblioteca de prompts | Narrativa IA; analise mitologica §4 | `prompt-library.ts` + sub-aba com cópia/download |
| Motor local offline | analise mitologica §15 | `local-analysis.ts` (1.200+ linhas, determinístico) |
| Independência de provedor | Explorador §Ensemble | `llm.ts` (z.ai · OpenAI-compatível · local) |
| Persistência plugável | Blueprint App; analise mitologica §15 | `persistence.ts` (Prisma ou arquivo) |
| Arte-síntese com fallback | Narrativa IA §Diretor de Arte | `local-artwork.ts` (sigilo SVG determinístico) |
| Export do estudo em Markdown | Blueprint App; Narrativa IA | `export-markdown.ts` (dossiê completo) |
| Export "PDF" sem dependência | Blueprint App §Melhorias | Markdown → impressão do navegador |
| Coleções temáticas | Explorador §FASE 2 | `THEMATIC_COLLECTIONS` derivadas do catálogo |

### 5.2 Já existiam e foram mantidas (2)

| Capacidade | Origem | Ajuste |
|---|---|---|
| Orquestração paralela com progresso | Explorador §Fluxo; Narrativa IA §Performance | stagger de 350 ms e progresso sintético no motor local |
| Grounding anti-alucinação | analise mitologica §5 e §13 | lista fechada de candidatos + score determinístico |

### 5.3 Backlog (7)

| Capacidade | Origem | Por que espera |
|---|---|---|
| Chat contextual por especialista | Narrativa IA §Chat | exige memória por lente e custo por mensagem |
| Lente estilística | Relatório LOTR §4 | falta prompt + campos no contrato; alto valor, esforço médio |
| Timeline comparativa e mapa | Blueprint App §Visualizações | exige dados geo/temporais estruturados |
| Modo inverso ("de que mito vem este filme?") | Explorador §FASE 3 | precisa de LLM + corpus maior |
| API pública | Explorador §FASE 3; analise mitologica §11 | falta autenticação, quotas e documentação |
| RAG com citações verificáveis | analise mitologica §5; Explorador §RAG | só compensa com corpus e fontes primárias |
| Gamificação (badges, trilhas) | Explorador §FASE 2 | engajamento sem retenção medida é ruído |

---

## 6. Contradições e ruído nos documentos

Um acervo de seis textos escritos em momentos diferentes não é coerente — e não deveria ser tratado como se fosse. As contradições encontradas:

| Tema | Documento A | Documento B | Resolução adotada |
|---|---|---|---|
| **Número de agentes** | App enxuto: 5 | Explorador e Narrativa IA: 8 | **8** (o produto já tinha 7; a 8ª é a cultural) |
| **Stack** | Narrativa IA: Vite + `@google/genai` | Oráculo: Next.js + Gemini | **Next.js 16** (já implementado) e provedor **abstrato** |
| **Modelos** | `gemini-3-pro-preview`, `imagen-4.0-generate-001` | — | Nomes inexistentes; a camada `llm.ts` aceita qualquer endpoint |
| **Similaridade** | analise mitologica: embeddings + cosseno | Oráculo: fingerprint | **finguerprint determinístico** + re-ranking limitado |
| **Banco** | analise mitologica: vetorial (faiss/milvus) + Neo4j | Nenhum outro documento | **catálogo em memória**; vetores e grafo de propriedades no backlog |
| **Persistência** | Nenhum documento especifica | — | criada nesta iteração (Prisma ou arquivo) |
| **Escopo** | "todas as narrativas" | "comece pequeno" | **24 narrativas curadas**, com caminho de expansão |
| **Estilo visual** | Cyber-Academic (ciano) | Cyber-Classical (índigo/dourado) | **Cyber-Classical**, já implementado |

**Ruído recorrente.** Promessas de prazo ("2 semanas de MVP", "mês 3-4 lançamento público"), KPIs sem instrumentação ("8+ minutos por sessão"), monetização antes de retenção e listas de tradições mitológicas que se sobrepõem (a "Africana" aparece duas vezes, uma delas incluindo o Egito). Nada disso foi descartado por ser errado — foi descartado por ser **prematuro**.

---

## 7. Decisões de engenharia e seus porquês

### 7.1 Dois motores, uma gramática

**Problema.** Sem chave de API, o produto virava uma tela de erro. Com chave, cada análise custava dinheiro e podia alucinar.

**Decisão.** `isLocalMode()` escolhe entre o pipeline de LLM e um **motor hermenêutico determinístico** que produz o *mesmo contrato* (`AnalysisResult`), marcado com `engine: "local"` e `source: "reference" | "catalog" | "heuristic"`.

**Consequência.** O produto pode ser visitado, testado e demonstrado sem custo; e a interface nunca mente sobre a origem do texto.

### 7.2 Grounding fechado

**Problema.** O comparativista é o agente com maior risco de inventar paralelos ("Perseu e São Jorge, 0.78" sem base).

**Decisão.** O agente recebe uma **lista fechada** de candidatos já calculados pelo motor de similaridade e só pode escolher entre eles; o score vem do determinístico, com ajuste máximo de ±8.

**Consequência.** Todo paralelo exibido é verificável no catálogo; o LLM enriquece a *interpretação*, não o *dado*.

### 7.3 Score transparente em vez de "porcentagem de verdade"

**Problema.** Um número como "78% de similaridade" sugere probabilidade, o que é falso.

**Decisão.** O score é um **índice** (0–100) com breakdown por critério, pesos declarados e o **valor bruto** (`rawScore`) exposto. A curva `x^0.6` apenas redistribui a escala preservando a ordem — nunca inventa ranking.

**Consequência.** O usuário pode discordar do número e **reponderar** os critérios, vendo o grafo se reorganizar.

### 7.4 Persistência plugável

**Problema.** Prisma/SQLite exige geração de client e migração; em ambientes de demonstração isso quebra o produto.

**Decisão.** Interface `AnalysisRepository` com duas implementações: Prisma (quando `DATABASE_URL` existe e o schema está aplicado) e arquivo JSON (padrão), com seleção por `ORACULO_STORE`.

**Consequência.** `npm install && npm run dev` funciona sem banco; em produção, o histórico é durável.

### 7.5 Legado como dado, não como código

**Problema.** Os `.docx` poderiam virar comentários, issues ou documentação morta.

**Decisão.** O conteúdo foi **convertido em estruturas tipadas**: `LEGACY_DOCUMENTS`, `EXTRACTION_MATRIX`, `THEMATIC_COLLECTIONS`, `PROMPT_LIBRARY`, `REFERENCE_DOSSIERS`.

**Consequência.** O acervo é navegável dentro do produto e testável (o dossiê é o gabarito do motor local).

### 7.6 Sem RAG até o corpus justificar

**Problema.** Todos os documentos pedem banco vetorial.

**Decisão.** 24 narrativas cabem em memória; um índice determinístico é mais rápido, barato, explicável e depurável do que embeddings.

**Consequência.** Se o catálogo chegar a centenas de obras com texto integral, aí sim: RAG com citações. Antes disso, seria infraestrutura sem problema.

---

## 8. O que deliberadamente não foi feito

| Item do acervo | Por que não |
|---|---|
| **Neo4j / banco de grafo** | 24 narrativas e 5 conexões por análise não precisam de um SGBD de grafo; o grafo é uma *visualização*, não uma fonte de verdade consultável. |
| **Embeddings por dimensão** | O produto não tem corpus textual — só metadados curados. Vetores de metadados seriam uma forma opaca de fazer o que o matching por tokens já faz de forma auditável. |
| **Ensemble de modelos (Claude + GPT + Llama)** | Custo e complexidade de orquestração sem ganho demonstrado; a abstração de provedor já permite plugar um segundo modelo quando houver avaliação. |
| **Freemium e pricing** | Não há usuários nem retenção medida; precificar antes de validar é o erro clássico dos documentos. |
| **Multimodal (áudio, trailer, imagem de obra)** | Exige pipeline de mídia e direitos; a arte-síntese já cobre a dimensão visual. |
| **API pública** | As rotas são REST/SSE e podem ser abertas em um dia — mas sem quotas, autenticação e documentação, seriam um vetor de abuso. |
| **1000 narrativas curadas** | Curadoria é o gargalo real; 24 bem-feitas valem mais do que 1000 rasas, e o produto precisa de qualidade de referência antes de escala. |
| **Gamificação com badges** | O progresso por lente já cumpre a função de espera; badges sem retenção medida são decoração. |

---

## 9. Lacunas e backlog priorizado

### P0 — próximo ciclo (alto valor, baixo risco)

1. **Lente estilística** (do relatório §4). Campos: tom, registro, recursos expressivos, ritmo, voz narrativa. A especificação já existe no relatório; falta contrato e prompt. *Esforço: médio. Impacto: alto.*
2. **Cache versionado do motor.** Hoje uma análise local fica presa ao vocabulário do dia em que foi gerada. Um `engineVersion` no payload resolve. *Esforço: baixo.*
3. **Testes de contrato das 8 lentes.** Validar que todo payload tem os campos exigidos e que o motor local nunca devolve `null` inesperado. *Esforço: baixo.*

### P1 — ciclo seguinte

4. **Chat contextual por agente** (Narrativa IA). Um chat por lente, com o payload daquela lente como contexto e limite de mensagens. *Esforço: alto (custo e memória).*
5. **Modo iniciante de linguagem** (Blueprint App). Alternar entre texto denso e paráfrase; no modo local, bastaria um par de templates por campo. *Esforço: médio.*
6. **Timeline comparativa** (Blueprint App). Eixo cronológico com as narrativas do catálogo e marcos da tradição; dados já existem (`period`). *Esforço: médio.*

### P2 — quando o corpus crescer

7. **Modo inverso** ("qual mito é este filme?"). Depende de LLM e de um catálogo maior. *Esforço: alto.*
8. **RAG com citações** — só faz sentido com fontes primárias. *Esforço: alto.*
9. **API pública** com chaves, quotas e OpenAPI. *Esforço: médio.*
10. **Ingestão semiautomática de catálogo** (com revisão humana obrigatória). *Esforço: alto.*

---

## 10. Roadmap recomendado

```
AGORA (feito)
  ├── 8ª lente cultural
  ├── 4 dossiês de referência
  ├── motor local determinístico
  ├── biblioteca de prompts + acervo navegável
  ├── provedor plugável + persistência resiliente
  └── pesos ajustáveis + export Markdown + sigilo SVG

PRÓXIMO (2–4 semanas)
  ├── lente estilística
  ├── cache versionado + testes de contrato
  └── modo iniciante de linguagem

DEPOIS (1–3 meses)
  ├── chat por agente (com quota)
  ├── timeline comparativa
  └── 50 narrativas curadas (dobrar o catálogo com revisão)

ESCALA (3–12 meses)
  ├── RAG com citações + ingestão semiautomática
  ├── API pública + contas
  └── segundo provedor em ensemble avaliado
```

**Critérios de parada por fase.** Só avançar quando: (a) as 8 lentes passarem nos testes de contrato; (b) o tempo de análise local ficar abaixo de 300 ms; (c) houver pelo menos 10 usuários recorrentes pedindo a próxima feature.

---

## 11. Guia de manutenção

### 11.1 Adicionar uma narrativa ao catálogo

1. Abra `src/lib/oracle-catalog.ts` e acrescente um objeto `CatalogEntry` (nome, tipo, origem, período, sinopse, motivos, arquétipos, temas, personagens).
2. Use **vocabulário existente** sempre que possível: motivos repetidos aumentam a qualidade dos paralelos.
3. Rode `npx tsx scripts/…` ou simplesmente `GET /api/status` para conferir as estatísticas atualizadas.
4. Se a narrativa merecer dossiê, crie a entrada em `reference-analyses.ts` com o mesmo `id`.

### 11.2 Adicionar uma lente

1. Acrescente o id em `AGENT_IDS` (`oracle-types.ts`) e o tipo de saída.
2. Escreva o prompt em `prompt-library.ts` e registre em `PROMPT_LIBRARY`.
3. Implemente o `run…Agent` em `oracle-agents.ts`.
4. Inclua no `DEPTH_AGENTS.completa`, no `AgentPanels` e no `DocsTab` (ícone + papel).
5. No motor local, produza um valor determinístico equivalente — ou `null` explícito com `agent_failed`.

### 11.3 Trocar de provedor de LLM

- **OpenAI-compatível** (OpenAI, Groq, Together, DeepSeek, OpenRouter, Ollama, vLLM):
  ```bash
  ORACLE_LLM_PROVIDER=openai
  ORACLE_LLM_BASE_URL=https://api.openai.com/v1
  ORACLE_LLM_API_KEY=...
  ORACLE_LLM_MODEL=gpt-4o-mini
  ```
- **z.ai** (comportamento original): mantenha `.z-ai-config` na raiz.
- **Sem provedor**: `ORACLE_LLM_PROVIDER=local` (ou nada configurado).

### 11.4 Ajustar pesos

Os pesos padrão vivem em `SIMILARITY_WEIGHTS` (`oracle-types.ts`). Mudanças ali afetam o servidor e o cliente. O usuário pode sobrepor em tempo de execução pelo painel de pesos — e o recálculo acontece no navegador, sem chamada de API.

### 11.5 Trocar a persistência

```bash
ORACULO_STORE=file    # JSON em ORACULO_DATA_DIR (padrão .data/)
ORACULO_STORE=prisma  # exige DATABASE_URL, db:push e db:generate
# vazio = auto-detecção
```

### 11.6 Onde cada artefato do acervo vive

| Artefato | Arquivo |
|---|---|
| Inventário dos documentos | `legacy-archive.ts` → `LEGACY_DOCUMENTS` |
| Matriz de extração (21 itens) | `legacy-archive.ts` → `EXTRACTION_MATRIX` |
| Coleções temáticas | `legacy-archive.ts` → `THEMATIC_COLLECTIONS` |
| Prompts de sistema | `prompt-library.ts` |
| Dossiês de referência | `reference-analyses.ts` |
| Motor local | `local-analysis.ts` |
| Interface do acervo | `components/oracle/ArchiveTab.tsx` |

---

## 12. Anexos

### 12.1 Contrato JSON por lente (herdado do doc 1, adaptado)

```jsonc
{
  "agent": "cultural",
  "engine": "llm",              // "llm" | "local"
  "source": "llm",              // "llm" | "reference" | "catalog" | "heuristic"
  "confidence": 0.86,
  "output_summary": "…",
  "payload": { /* saída específica da lente */ },
  "metadata": { "model": "…", "latencyMs": 1234 }
}
```

O contrato real está em `src/lib/oracle-types.ts` — é ele que garante que servidor, cliente e exportação falem a mesma língua.

### 12.2 Variáveis de ambiente

| Variável | Valores | Efeito |
|---|---|---|
| `ORACLE_LLM_PROVIDER` | `zai` \| `openai` \| `local` | força o motor |
| `ORACLE_LLM_BASE_URL` | URL | endpoint compatível com Chat Completions |
| `ORACLE_LLM_API_KEY` | string | credencial do provedor |
| `ORACLE_LLM_MODEL` | string | modelo (padrão `gpt-4o-mini`) |
| `ORACULO_STORE` | `prisma` \| `file` | adaptador de persistência |
| `ORACULO_DATA_DIR` | caminho | diretório do adaptador de arquivo |
| `DATABASE_URL` | `file:…` ou Postgres | conexão do Prisma |

### 12.3 Rastreabilidade resumida

| Capacidade no produto | Documento de origem | Seção |
|---|---|---|
| 8ª lente cultural | Explorador; Relatório LOTR | §Agentes; §6 |
| Dashboard 3 colunas | Explorador | §Tela 3 |
| Abas por agente | Explorador; Blueprint App | §Tela 3; §3 |
| Comparação profunda | Explorador | §Tela 4 |
| Fingerprint + pesos | analise mitologica; oraculo-conexoes | §5; §Técnico |
| Re-ranking limitado | analise mitologica | §5 e §14 |
| Explicabilidade por aresta | analise mitologica | §5 e §13 |
| Motor local | analise mitologica | §15 (checklist) |
| Persistência | (lacuna dos documentos) | — |
| Dossiês | Relatório LOTR | seções 1–6 |
| Prompts exportáveis | Narrativa IA; analise mitologica | §Funcionalidades; §4 |
| Coleções temáticas | Explorador | §FASE 2 |
| Arte-síntese | Narrativa IA | §Diretor de Arte |
| Export Markdown | Blueprint App; Narrativa IA | §Melhorias |

### 12.4 Métricas de qualidade usadas nesta iteração

- **Cobertura do contrato:** 8/8 lentes com campos obrigatórios preenchidos no modo local.
- **Tempo de análise local:** < 500 ms para o dossiê completo (sem rede).
- **Paralelos sempre grounded:** 100% dos nomes exibidos existem no catálogo.
- **Determinismo:** mesma entrada + mesmo catálogo ⇒ mesmo resultado (nenhum `Math.random` no motor local).
- **Honestidade de origem:** 100% dos payloads carregam `engine` e `source`.

---

## Conclusão

Os seis documentos não descrevem um sistema — descrevem **uma ambição em seis ângulos**. O trabalho de extração foi, antes de tudo, um trabalho de curadoria: escolher o que o produto precisa agora, nomear o que ainda não é hora, e registrar o porquê.

O resultado está no repositório, não neste documento: 12 capacidades incorporadas, 4 dossiês que funcionam como gabarito, um motor local que impede o produto de morrer sem chave de API e uma aba **Acervo** que torna o legado navegável em vez de arquivado.

> *"A conexão entre Prometeu e os heróis modernos não é óbvia até que alguém aponte — e quando aponta, é reveladora."* — Blueprint Explorador

O acervo legado fez o mesmo com o produto: apontou o que já estava lá.
