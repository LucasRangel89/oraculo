"use client";

import {
  Accessibility,
  BookOpen,
  Brain,
  Compass,
  Database,
  Drama,
  Fingerprint,
  Image as ImageIcon,
  KeyRound,
  Landmark,
  Layers,
  Lightbulb,
  Map as MapIcon,
  Network,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AGENT_LABELS, SIMILARITY_WEIGHTS, type AgentId } from "@/lib/oracle-types";

const AGENT_ROLES: Record<AgentId, string> = {
  facts: "Identifica a obra — tipo de mídia, origem cultural, período, personagens e sinopse. É a base factual de tudo.",
  structure: "Aplica a jornada do herói de Campbell: atos, beats, incidente detonante, clímax e resolução.",
  archetypes: "Classifica os personagens em arquétipos junguianos (Herói, Sombra, Mentor...) e interpreta a individuação.",
  symbols: "Extrai símbolos e motivos com significado local e universal, além de paralelos históricos.",
  themes: "Levanta temas universais, questões existenciais e dilemas éticos da narrativa.",
  psychoanalysis: "Produz leituras freudiana e junguiana — complexos, desejos inconscientes — sempre marcadas como especulativas.",
  cultural: "“O Historiador Social”: situa a obra no tempo, nas tradições e nos valores da época — influências, tensões e recepção.",
  parallels: "Compara a narrativa contra o catálogo curado: scores por critério, convergências, diferenças e categorias.",
};

const AGENT_ICONS: Record<AgentId, typeof Search> = {
  facts: Search,
  structure: Layers,
  archetypes: Drama,
  symbols: KeyRound,
  themes: Compass,
  psychoanalysis: Brain,
  cultural: Landmark,
  parallels: Network,
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Search;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/50 py-0">
      <CardContent className="p-5 md:p-7">
        <h2 className="mb-4 flex items-center gap-2.5 font-serif text-xl font-bold text-slate-100 md:text-2xl">
          <span className="flex size-9 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/10">
            <Icon className="size-4.5 text-indigo-300" aria-hidden="true" />
          </span>
          {title}
        </h2>
        <div className="space-y-3.5 text-sm leading-relaxed text-slate-300">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function DocsTab() {
  return (
    <article className="mx-auto max-w-3xl space-y-5">
      {/* Hero */}
      <header className="py-6 text-center md:py-10">
        <Badge
          variant="outline"
          className="mb-4 border-indigo-400/30 bg-indigo-500/5 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300/90"
        >
          Documentação do Projeto
        </Badge>
        <h1 className="oracle-title font-serif text-3xl font-bold leading-tight md:text-5xl">
          Como o Oráculo enxerga as histórias
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
          Um mergulho na arquitetura, nas decisões de design e nas escolhas
          éticas por trás da estação de trabalho de hermenêutica digital.
        </p>
      </header>

      {/* 1. Sobre */}
      <Section icon={BookOpen} title="1. Sobre o projeto">
        <p>
          O <strong className="text-slate-100">Oráculo das Conexões Narrativas</strong>{" "}
          nasce de uma pergunta simples: <em className="text-amber-200/90">
          por que histórias de culturas separadas por milênios contam, no fundo,
          a mesma história?</em> A hipótese — monomito de Campbell, inconsciente
          coletivo de Jung — vira aqui um instrumento de investigação: agentes de
          IA dissecam qualquer narrativa e a conectam a um catálogo curado de
          mitos, lendas, livros e cultura pop.
        </p>
        <p>
          <strong className="text-slate-100">Público-alvo:</strong> roteiristas
          que querem posicionar suas histórias na grande conversa narrativa;
          acadêmicos de literatura e mitologia comparada; game designers em
          busca de estruturas de missão universais; e qualquer narrador curioso.
        </p>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            O fluxo em três movimentos
          </p>
          <ol className="space-y-1.5">
            <li className="flex gap-2">
              <span className="font-serif font-bold text-amber-300">1.</span>
              <span>
                <strong className="text-slate-100">Nexus</strong> — você informa
                a narrativa (de “Perseu” a “Matrix”).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-serif font-bold text-amber-300">2.</span>
              <span>
                <strong className="text-slate-100">Lentes</strong> — até 7
                agentes especialistas analisam em paralelo, com progresso ao
                vivo via streaming.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-serif font-bold text-amber-300">3.</span>
              <span>
                <strong className="text-slate-100">Conexões</strong> — grafo
                interativo, scores transparentes e comparações profundas lado a
                lado.
              </span>
            </li>
          </ol>
        </div>
      </Section>

      {/* 2. Arquitetura */}
      <Section icon={Layers} title="2. Arquitetura">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5">
            <p className="mb-1 font-semibold text-indigo-200">Frontend</p>
            <p className="text-xs leading-relaxed text-slate-400">
              Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui.
              Página única com três views (busca → progresso → dashboard) e
              estado global via zustand.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5">
            <p className="mb-1 font-semibold text-indigo-200">Orquestrador (SSE)</p>
            <p className="text-xs leading-relaxed text-slate-400">
              POST /api/analyze transmite eventos <code className="text-indigo-300">agent_start</code>/
              <code className="text-indigo-300">agent_done</code> em tempo real
              (Server-Sent Events), alimentando o progresso gamificado.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5 sm:col-span-2">
            <p className="mb-2 font-semibold text-indigo-200">
              As 8 lentes especialistas
            </p>
            <ul className="space-y-1.5">
              {(Object.keys(AGENT_LABELS) as AgentId[]).map((id) => {
                const Icon = AGENT_ICONS[id];
                return (
                  <li key={id} className="flex items-start gap-2.5">
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-amber-400/80"
                      aria-hidden="true"
                    />
                    <span className="text-xs leading-relaxed">
                      <strong className="text-slate-200">{AGENT_LABELS[id]}</strong>
                      {" — "}
                      <span className="text-slate-400">{AGENT_ROLES[id]}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5 sm:col-span-2">
            <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-indigo-200">
              <Fingerprint className="size-4" aria-hidden="true" />
              Motor de Similaridade híbrido
            </p>
            <p className="mb-2.5 text-xs leading-relaxed text-slate-400">
              Score determinístico (Jaccard ponderado sobre o fingerprint) contra
              catálogo estático curado, com enriquecimento textual via LLM. Zero
              alucinação de paralelos: toda conexão nasce do dado, a IA apenas
              explica.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["Motivos", SIMILARITY_WEIGHTS.motifs],
                  ["Arquétipos", SIMILARITY_WEIGHTS.archetypes],
                  ["Temas", SIMILARITY_WEIGHTS.themes],
                  ["Estrutura", SIMILARITY_WEIGHTS.structure],
                ] as const
              ).map(([label, weight]) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="border-indigo-400/30 bg-indigo-500/10 font-mono text-[10px] text-indigo-200"
                >
                  {label} {Math.round(weight * 100)}%
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-indigo-200">
              <Database className="size-4" aria-hidden="true" />
              Persistência plugável
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Análises idênticas são servidas do cache, marcadas como “do
              cache”, com feedback persistido. O adaptador usa Prisma/SQLite
              quando disponível e cai para arquivo JSON local quando não há
              banco — o produto não quebra em ambientes de demonstração.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-indigo-200">
              <ImageIcon className="size-4" aria-hidden="true" />
              Geração de Arte
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              No modal de comparação, um modelo de imagem funde os símbolos
              compartilhados em uma “arte-síntese” inédita do par.
            </p>
          </div>
        </div>
      </Section>

      {/* 3. UX/UI */}
      <Section icon={Accessibility} title="3. UX & UI">
        <p>
          O tema <strong className="text-slate-100">Cyber-Classical Dark</strong>{" "}
          une o clássico (tipografia serifada, dourado para o “mítico”) ao cyber
          (indigo elétrico, grid de fundo, glassmorphism sutil). Mito = dourado;
          filme = indigo; livro = verde — a cor é informação, não decoração.
        </p>
        <Separator className="bg-slate-800/70" />
        <ul className="space-y-2">
          <li className="flex gap-2.5">
            <Waypoints className="mt-0.5 size-4 shrink-0 text-indigo-400/80" aria-hidden="true" />
            <span>
              <strong className="text-slate-200">Dashboard em 3 colunas</strong>{" "}
              (paralelos · grafo · lentes) que empilha no mobile sem perder
              hierarquia.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Waypoints className="mt-0.5 size-4 shrink-0 text-indigo-400/80" aria-hidden="true" />
            <span>
              <strong className="text-slate-200">Grafo interativo próprio</strong>{" "}
              — simulação force-directed em SVG puro, com pan, zoom, drag de nós
              e exportação PNG; a espessura e a distância das arestas codificam o
              score.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Waypoints className="mt-0.5 size-4 shrink-0 text-indigo-400/80" aria-hidden="true" />
            <span>
              <strong className="text-slate-200">Score transparente e ajustável</strong> —
              cada conexão exibe o breakdown por critério (motivos, arquétipos,
              temas, estrutura), e o usuário pode reponderar os critérios e ver o
              grafo se reorganizar em tempo real.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Waypoints className="mt-0.5 size-4 shrink-0 text-indigo-400/80" aria-hidden="true" />
            <span>
              <strong className="text-slate-200">Responsividade mobile-first</strong>,
              alvos de toque ≥ 44px, foco visível, aria-labels e contraste
              verificado.
            </span>
          </li>
        </ul>
      </Section>

      {/* 4. Inovação */}
      <Section icon={Lightbulb} title="4. O que há de novo aqui">
        <ul className="space-y-3">
          <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-1 font-semibold text-amber-200">
              Dois motores, uma gramática
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Com chave de LLM, oito agentes generativos analisam a obra. Sem
              chave, um motor hermenêutico determinístico produz o mesmo
              contrato a partir do catálogo curado e dos dossiês de referência —
              sem alucinação e sem custo. O selo no topo do resultado diz sempre
              qual motor respondeu.
            </p>
          </li>
          <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-1 font-semibold text-amber-200">
              Acervo rastreável
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              A aba <strong className="text-slate-200">Acervo</strong> converte a
              documentação legada em memória viva do produto: dossiês de
              referência, biblioteca de prompts exportável, coleções temáticas e
              a matriz que liga cada capacidade ao documento que a originou.
            </p>
          </li>
          <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-1 font-semibold text-amber-200">
              Fingerprint narrativo
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Cada narrativa é reduzida a um vetor comparável: motivos,
              arquétipos, temas e beats — tornando a “semelhança” mensurável,
              replicável e explicável.
            </p>
          </li>
          <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-1 font-semibold text-amber-200">
              Grounding anti-alucinação
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Os paralelos são calculados deterministicamente contra um catálogo
              curado por humanos. Os LLMs nunca inventam conexões — apenas
              redigem a interpretação daquelas que o dado comprova.
            </p>
          </li>
          <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-1 font-semibold text-amber-200">
              Explicabilidade por critério
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Nenhum score é caixa-preta: o usuário vê exatamente <em>por que</em>{" "}
              Perseu conversa com Luke Skywalker (35% motivos, 25% arquétipos...)
              e pode abrir a comparação profunda ponto a ponto.
            </p>
          </li>
        </ul>
      </Section>

      {/* 5. Roadmap */}
      <Section icon={MapIcon} title="5. Roadmap">
        <div className="space-y-4">
          <div>
            <Badge
              variant="outline"
              className="mb-2 border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
            >
              Curto prazo
            </Badge>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
              <li>Exportação da análise completa em PDF formatado.</li>
              <li>Comparação lado a lado de qualquer par do catálogo.</li>
              <li>Histórico com busca e filtros.</li>
            </ul>
          </div>
          <div>
            <Badge
              variant="outline"
              className="mb-2 border-amber-400/40 bg-amber-400/10 text-amber-300"
            >
              Médio prazo
            </Badge>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
              <li>Ingestão de novos itens no catálogo pela comunidade.</li>
              <li>Contas de usuário e análises salvas na nuvem.</li>
              <li>Aprofundamento por agente (pergunte à lente).</li>
            </ul>
          </div>
          <div>
            <Badge
              variant="outline"
              className="mb-2 border-indigo-400/40 bg-indigo-500/10 text-indigo-300"
            >
              Longo prazo
            </Badge>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
              <li>Análise multimodal (storyboards, trilhas, cinemática).</li>
              <li>API pública para pesquisa em narratologia computacional.</li>
              <li>Mapa-múndi das tradições mitológicas conectadas.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 6. Ética */}
      <Section icon={ShieldAlert} title="6. Ética & Limitações">
        <ul className="space-y-2.5">
          <li className="flex gap-2.5">
            <Scale className="mt-0.5 size-4 shrink-0 text-amber-400/80" aria-hidden="true" />
            <span className="text-xs leading-relaxed text-slate-400">
              <strong className="text-slate-200">Interpretações, não verdades.</strong>{" "}
              Toda saída é hipótese heurística gerada por IA — um ponto de
              partida para o pensamento, nunca substituto do estudo acadêmico.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Scale className="mt-0.5 size-4 shrink-0 text-amber-400/80" aria-hidden="true" />
            <span className="text-xs leading-relaxed text-slate-400">
              <strong className="text-slate-200">Viés de catálogo.</strong> O
              acervo cresceu de 24 para 140 narrativas e 69 tradições — incluindo
              Índia, Pérsia, China, Japão, Coreia, Vietnã, África Ocidental,
              povos originários das Américas, Oceania e folclore brasileiro — mas
              a tradição greco-romana ainda ocupa 16 entradas e a documentação
              escrita continua super-representada em relação à oralidade.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Scale className="mt-0.5 size-4 shrink-0 text-amber-400/80" aria-hidden="true" />
            <span className="text-xs leading-relaxed text-slate-400">
              <strong className="text-slate-200">Psicanálise sinalizada.</strong>{" "}
              As leituras freudiana/junguiana são sempre rotuladas como
              especulativas e exibidas com disclaimer próprio.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Scale className="mt-0.5 size-4 shrink-0 text-amber-400/80" aria-hidden="true" />
            <span className="text-xs leading-relaxed text-slate-400">
              <strong className="text-slate-200">Proveniência clara.</strong>{" "}
              Fatos vêm do catálogo curado; interpretações, dos LLMs; scores, do
              motor determinístico. Cada bloco da interface deixa isso visível.
            </span>
          </li>
        </ul>
      </Section>

      {/* 7. Operação */}
      <Section icon={Database} title="7. Operação: motores, dados e deploy">
        <p>
          O Oráculo foi desenhado para <strong className="text-slate-100">não
          quebrar</strong> quando falta infraestrutura. Duas decisões garantem
          isso: um motor local determinístico e uma camada de persistência
          plugável.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Motor
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              <code className="text-amber-200/90">ORACLE_LLM_PROVIDER</code>{" "}
              (<code>zai</code>, <code>openai</code> ou <code>local</code>) ou,
              na ausência dele, auto-detecção: <code>.z-ai-config</code> → z.ai;{" "}
              <code>ORACLE_LLM_BASE_URL</code> + <code>ORACLE_LLM_API_KEY</code> →
              qualquer endpoint compatível com Chat Completions; nada → motor
              local.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Persistência
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              <code className="text-amber-200/90">ORACULO_STORE</code>{" "}
              (<code>prisma</code> ou <code>file</code>). O adaptador Prisma usa{" "}
              <code>DATABASE_URL</code>; o de arquivo grava em{" "}
              <code>ORACULO_DATA_DIR</code> (padrão <code>.data/</code>). Se o
              banco não estiver disponível, o app cai no arquivo automaticamente
              — o cache e o histórico continuam funcionando.
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          <strong className="text-slate-200">Diagnóstico ao vivo:</strong>{" "}
          <code className="text-amber-200/90">GET /api/status</code> devolve o
          motor ativo, o modelo, o adaptador de armazenamento e as estatísticas do
          catálogo — é o primeiro lugar a olhar depois de qualquer deploy.
        </p>
        <p className="text-xs leading-relaxed text-slate-400">
          <strong className="text-slate-200">Deploy:</strong> build standalone
          (<code>npm run build</code> + <code>node .next/standalone/server.js</code>),
          Docker multi-stage ou qualquer plataforma Node. Em ambientes
          serverless, o sistema de arquivos é efêmero: use{" "}
          <code>ORACULO_STORE=prisma</code> com banco externo para histórico
          durável. O guia completo está em{" "}
          <code className="text-amber-200/90">docs/DEPLOY.md</code> e a bateria de
          validação em <code className="text-amber-200/90">npm run smoke</code>.
        </p>
      </Section>

      <p className="flex items-center justify-center gap-2 py-6 text-center text-xs text-slate-400">
        <Sparkles className="size-3.5 text-amber-400/50" aria-hidden="true" />
        Construído para quem acredita que toda história nova é um eco antigo.
        <Sparkles className="size-3.5 text-amber-400/50" aria-hidden="true" />
      </p>
    </article>
  );
}
