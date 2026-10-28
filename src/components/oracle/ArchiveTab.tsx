"use client";

/**
 * Aba "Acervo" — a memória do projeto virando interface.
 *
 * Reúne o material extraído dos documentos legados em quatro superfícies
 * navegáveis:
 *   1. Dossiês de referência (análises completas curadas, 6 lentes cada);
 *   2. Biblioteca de prompts dos agentes (ler, copiar, exportar);
 *   3. Coleções temáticas derivadas do catálogo;
 *   4. Matriz de extração + inventário dos documentos.
 *
 * Tudo funciona offline — nenhuma chamada de LLM é necessária para navegar.
 */
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardCopy,
  Compass,
  Download,
  FileText,
  FlaskConical,
  Landmark,
  Layers,
  LibraryBig,
  PlayCircle,
  ScrollText,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { downloadTextFile } from "@/lib/export-markdown";
import {
  LEGACY_DOCUMENTS,
  EXTRACTION_MATRIX,
  THEMATIC_COLLECTIONS,
  catalogStats,
  collectionEntries,
  extractionSummary,
  type ExtractionStatus,
} from "@/lib/legacy-archive";
import { useOracleStore } from "@/lib/oracle-store";
import { promptsToMarkdown, PROMPT_LIBRARY } from "@/lib/prompt-library";
import { REFERENCE_DOSSIERS, type ReferenceDossier } from "@/lib/reference-analyses";
import { AGENT_LABELS, MEDIA_TYPE_LABELS, type AgentId } from "@/lib/oracle-types";

// ---------------------------------------------------------------------------
// Helpers visuais
// ---------------------------------------------------------------------------

const ACCENT: Record<string, string> = {
  amber: "border-amber-400/30 bg-amber-400/5 text-amber-200",
  indigo: "border-indigo-400/30 bg-indigo-500/5 text-indigo-200",
  emerald: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
  rose: "border-rose-400/30 bg-rose-400/5 text-rose-200",
  teal: "border-teal-400/30 bg-teal-400/5 text-teal-200",
  violet: "border-violet-400/30 bg-violet-400/5 text-violet-200",
};

const STATUS_STYLE: Record<ExtractionStatus, string> = {
  implementado: "border-slate-600/60 bg-slate-700/30 text-slate-300",
  incorporado: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  backlog: "border-amber-400/40 bg-amber-400/10 text-amber-300",
};

const STATUS_LABEL: Record<ExtractionStatus, string> = {
  implementado: "já existia",
  incorporado: "incorporado agora",
  backlog: "backlog priorizado",
};

const AGENT_ICON: Record<AgentId, typeof Layers> = {
  facts: LibraryBig,
  structure: Layers,
  archetypes: Compass,
  symbols: Sparkles,
  themes: BookOpen,
  psychoanalysis: CircleDot,
  cultural: Landmark,
  parallels: Waypoints,
};

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Layers;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/10">
        <Icon className="size-4 text-indigo-300" aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-serif text-xl font-bold text-slate-100 md:text-2xl">{title}</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-400">{description}</p>
      </div>
    </header>
  );
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: label });
  } catch {
    toast({
      title: "Não foi possível copiar",
      description: "Seu navegador bloqueou o acesso à área de transferência.",
      variant: "destructive",
    });
  }
}

/** Executa a análise de uma narrativa e leva o usuário ao dashboard. */
function useOpenInOracle() {
  const setInput = useOracleStore((s) => s.setInput);
  const setTab = useOracleStore((s) => s.setTab);
  const startAnalysis = useOracleStore((s) => s.startAnalysis);
  return (name: string) => {
    setInput(name);
    setTab("analise");
    void startAnalysis();
  };
}

// ---------------------------------------------------------------------------
// Dossiês de referência
// ---------------------------------------------------------------------------

function DossierDetail({ dossier }: { dossier: ReferenceDossier }) {
  const openInOracle = useOpenInOracle();
  const { structure, archetypes, symbols, themes, psychoanalysis, cultural } = dossier;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-slate-700 bg-slate-950/50 text-xs text-slate-300">
              {MEDIA_TYPE_LABELS[dossier.facts.type]}
            </Badge>
            <Badge variant="outline" className="border-slate-700 bg-slate-950/50 text-xs text-slate-400">
              {dossier.facts.origin}
            </Badge>
            <Badge
              variant="outline"
              className="border-emerald-400/40 bg-emerald-400/10 text-[10px] uppercase tracking-wider text-emerald-300"
            >
              <FlaskConical className="mr-1 size-3" aria-hidden="true" />
              dossiê curado
            </Badge>
          </div>
          <h2 className="font-serif text-2xl font-bold text-slate-100">{dossier.title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            {dossier.facts.synopsis}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => openInOracle(dossier.facts.name)}
          className="bg-indigo-500 text-white hover:bg-indigo-400"
        >
          <PlayCircle className="size-4" aria-hidden="true" />
          Abrir no Oráculo
        </Button>
      </div>

      <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
        <ScrollText className="mr-1.5 inline size-3.5 align-text-bottom" aria-hidden="true" />
        Proveniência: {dossier.provenance}
      </p>

      {/* Estrutura */}
      <Card className="border-slate-800 bg-slate-950/40">
        <CardContent className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-serif text-lg text-slate-100">
            <Layers className="size-4 text-indigo-300" aria-hidden="true" />
            Estrutura narrativa
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">{structure.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="bg-slate-800/70 text-[10px] text-slate-300">
              {structure.acts} atos
            </Badge>
            <Badge variant="secondary" className="bg-slate-800/70 text-[10px] text-slate-300">
              tom {structure.tone}
            </Badge>
            {structure.beats.slice(0, 7).map((beat) => (
              <Badge
                key={beat}
                variant="outline"
                className="border-slate-700 bg-slate-900/60 font-mono text-[10px] text-slate-400"
              >
                {beat.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
            <p>
              <span className="text-slate-500">Incidente incitante: </span>
              {structure.incitingIncident}
            </p>
            <p>
              <span className="text-slate-500">Clímax: </span>
              {structure.climax}
            </p>
            <p>
              <span className="text-slate-500">Resolução: </span>
              {structure.resolution}
            </p>
          </div>
          <Separator className="bg-slate-800/70" />
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Jornada do herói (Campbell)
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {structure.heroJourney.map((stage) => (
                <li
                  key={stage.stage}
                  className={`rounded-md border px-2.5 py-1.5 text-xs ${
                    stage.present
                      ? "border-indigo-400/20 bg-indigo-500/5 text-slate-300"
                      : "border-slate-800 bg-slate-900/30 text-slate-600"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className={`inline-block size-1.5 rounded-full ${
                        stage.present ? "bg-amber-400" : "bg-slate-700"
                      }`}
                    />
                    {stage.stage}
                  </span>
                  <span className="mt-0.5 block leading-relaxed text-[11px] text-slate-400">
                    {stage.evidence}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Arquétipos */}
        <Card className="border-slate-800 bg-slate-950/40">
          <CardContent className="space-y-2.5 p-4">
            <h3 className="flex items-center gap-2 font-serif text-lg text-slate-100">
              <Compass className="size-4 text-amber-300" aria-hidden="true" />
              Arquétipos
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">{archetypes.summary}</p>
            <ul className="space-y-1.5">
              {archetypes.archetypes.map((item) => (
                <li key={item.character} className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                  <p className="text-xs font-medium text-slate-200">
                    {item.character}
                    <Badge
                      variant="outline"
                      className="ml-2 border-amber-400/30 bg-amber-400/5 px-1.5 py-0 text-[10px] text-amber-200"
                    >
                      {item.archetype}
                    </Badge>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
            <p className="rounded-md border border-slate-800 bg-slate-900/40 p-2 text-[11px] leading-relaxed text-slate-400">
              <span className="text-slate-500">Individuação: </span>
              {archetypes.individuation}
            </p>
          </CardContent>
        </Card>

        {/* Símbolos */}
        <Card className="border-slate-800 bg-slate-950/40">
          <CardContent className="space-y-2.5 p-4">
            <h3 className="flex items-center gap-2 font-serif text-lg text-slate-100">
              <Sparkles className="size-4 text-indigo-300" aria-hidden="true" />
              Símbolos
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">{symbols.summary}</p>
            <ul className="space-y-1.5">
              {symbols.symbols.map((symbol) => (
                <li key={symbol.symbol} className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                  <p className="flex items-center justify-between text-xs font-medium text-slate-200">
                    {symbol.symbol}
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {symbol.presence}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{symbol.meaning}</p>
                  {symbol.historicalParallels.length > 0 ? (
                    <p className="mt-1 text-[10px] text-slate-400">
                      também em: {symbol.historicalParallels.join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Temas */}
        <Card className="border-slate-800 bg-slate-950/40">
          <CardContent className="space-y-2.5 p-4">
            <h3 className="flex items-center gap-2 font-serif text-lg text-slate-100">
              <BookOpen className="size-4 text-indigo-300" aria-hidden="true" />
              Temas e dilemas
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">{themes.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {themes.themes.map((theme) => (
                <Badge
                  key={theme}
                  variant="outline"
                  className="border-indigo-400/30 bg-indigo-500/10 text-[10px] font-normal text-indigo-200"
                >
                  {theme}
                </Badge>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Questões existenciais
              </p>
              {themes.existentialQuestions.map((question) => (
                <p key={question} className="text-[11px] leading-relaxed text-slate-400">
                  · {question}
                </p>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Dilemas éticos
              </p>
              {themes.ethicalDilemmas.map((dilemma) => (
                <p key={dilemma} className="text-[11px] leading-relaxed text-slate-400">
                  · {dilemma}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Psicanálise */}
        <Card className="border-slate-800 bg-slate-950/40">
          <CardContent className="space-y-2.5 p-4">
            <h3 className="flex items-center gap-2 font-serif text-lg text-slate-100">
              <CircleDot className="size-4 text-violet-300" aria-hidden="true" />
              Psicanálise
            </h3>
            <p className="rounded-md border border-amber-400/25 bg-amber-400/5 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/90">
              Leitura especulativa — {psychoanalysis.disclaimer}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">{psychoanalysis.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {psychoanalysis.complexes.map((complex) => (
                <Badge
                  key={complex}
                  variant="outline"
                  className="border-violet-400/30 bg-violet-500/10 text-[10px] font-normal text-violet-200"
                >
                  {complex}
                </Badge>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Freud
              </p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {psychoanalysis.freudianReading}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Jung
              </p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {psychoanalysis.jungianReading}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cultural */}
        <Card className="border-slate-800 bg-slate-950/40 lg:col-span-2">
          <CardContent className="space-y-2.5 p-4">
            <h3 className="flex items-center gap-2 font-serif text-lg text-slate-100">
              <Landmark className="size-4 text-amber-300" aria-hidden="true" />
              Cultural-histórico
              <Badge
                variant="outline"
                className="border-emerald-400/40 bg-emerald-400/10 text-[10px] uppercase tracking-wider text-emerald-300"
              >
                nova lente
              </Badge>
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">{cultural.summary}</p>
            <p className="text-xs leading-relaxed text-slate-400">{cultural.historicalContext}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Influências e linhagens
                </p>
                <ul className="mt-1 space-y-0.5">
                  {cultural.culturalInfluences.map((item) => (
                    <li key={item} className="text-[11px] leading-relaxed text-slate-400">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Valores e tensões
                </p>
                <ul className="mt-1 space-y-0.5">
                  {cultural.valuesAndTensions.map((item) => (
                    <li key={item} className="text-[11px] leading-relaxed text-slate-400">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              <span className="text-slate-500">Recepção: </span>
              {cultural.reception}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DossiersSection() {
  const [selected, setSelected] = useState(REFERENCE_DOSSIERS[0]?.id ?? "");
  const dossier =
    REFERENCE_DOSSIERS.find((d) => d.id === selected) ?? REFERENCE_DOSSIERS[0];

  return (
    <div>
      <SectionTitle
        icon={BookMarked}
        title="Dossiês de referência"
        description="Análises completas curadas a partir do acervo legado. Servem como gabarito de qualidade, conteúdo de demonstração e teste de contrato das oito lentes."
      />
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Dossiês">
          {REFERENCE_DOSSIERS.map((item) => {
            const active = item.id === dossier?.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                aria-current={active ? "true" : undefined}
                className={`min-w-[180px] rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                  active
                    ? "border-indigo-400/40 bg-indigo-500/10"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-serif text-sm font-semibold text-slate-100">
                    {item.title}
                  </span>
                  <ChevronRight
                    className={`size-3.5 shrink-0 ${active ? "text-indigo-300" : "text-slate-600"}`}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-0.5 block text-[11px] leading-tight text-slate-400">
                  {item.facts.origin}
                </span>
              </button>
            );
          })}
          <p className="mt-1 hidden rounded-lg border border-slate-800/70 bg-slate-950/30 p-2.5 text-[10px] leading-relaxed text-slate-400 lg:block">
            Dossiês são <span className="text-slate-400">ground truth</span>: no modo
            local, a análise de uma dessas narrativas retorna exatamente este conteúdo.
          </p>
        </nav>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4 md:p-5">
            {dossier ? <DossierDetail dossier={dossier} /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Biblioteca de prompts
// ---------------------------------------------------------------------------

function PromptsSection() {
  const [openId, setOpenId] = useState<string | null>(PROMPT_LIBRARY[0]?.agentId ?? null);

  return (
    <div>
      <SectionTitle
        icon={FileText}
        title="Biblioteca de prompts"
        description="Os prompts de sistema de cada lente — persona, base teórica, entrega e contrato JSON. Leia, copie ou exporte o kit completo para outro provedor."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadTextFile("oraculo-biblioteca-de-prompts.md", promptsToMarkdown())
          }
          className="border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <Download className="size-4" aria-hidden="true" />
          Exportar kit (.md)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void copyText(promptsToMarkdown(), "Biblioteca completa copiada em Markdown.")
          }
          className="border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <ClipboardCopy className="size-4" aria-hidden="true" />
          Copiar tudo
        </Button>
        <span className="text-xs text-slate-500">
          {PROMPT_LIBRARY.length} lentes · schemas sincronizados com o contrato
        </span>
      </div>

      <div className="space-y-2.5">
        {PROMPT_LIBRARY.map((spec) => {
          const Icon = AGENT_ICON[spec.agentId];
          const open = openId === spec.agentId;
          return (
            <Card key={spec.agentId} className="border-slate-800 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : spec.agentId)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950/60">
                  <Icon className="size-4 text-indigo-300" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-serif text-base font-semibold text-slate-100">
                      {spec.persona}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">
                      {AGENT_LABELS[spec.agentId]}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                    {spec.deliverable}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">{spec.theory}</span>
                </span>
                <ChevronRight
                  className={`mt-1 size-4 shrink-0 text-slate-500 transition-transform ${
                    open ? "rotate-90" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {open ? (
                <div className="border-t border-slate-800/70 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Prompt de sistema
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyText(spec.system, `Prompt de ${spec.persona} copiado.`)}
                      className="h-7 text-xs text-slate-400 hover:text-slate-100"
                    >
                      <ClipboardCopy className="size-3.5" aria-hidden="true" />
                      Copiar prompt
                    </Button>
                  </div>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[11px] leading-relaxed text-slate-400 oracle-scroll">
                    {spec.system}
                  </pre>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coleções temáticas
// ---------------------------------------------------------------------------

const COLLECTION_PREVIEW = 12;

function CollectionCard({
  title,
  subtitle,
  accentClass,
  items,
  onOpen,
}: {
  title: string;
  subtitle: string;
  accentClass: string;
  items: { id: string; name: string }[];
  onOpen: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, COLLECTION_PREVIEW);
  const hidden = items.length - shown.length;

  return (
    <Card className={`border bg-slate-900/40 ${accentClass}`}>
      <CardContent className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold text-slate-100">{title}</h3>
          <Badge
            variant="outline"
            className="shrink-0 border-slate-700 bg-slate-950/50 font-mono text-[10px] text-slate-400"
          >
            {items.length}
          </Badge>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">{subtitle}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {shown.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onOpen(entry.name)}
              title={`Analisar ${entry.name}`}
              className="group inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-[11px] text-slate-300 transition-colors outline-none hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            >
              {entry.name}
              <ArrowRight
                className="size-3 text-slate-600 group-hover:text-indigo-300"
                aria-hidden="true"
              />
            </button>
          ))}
          {items.length === 0 ? (
            <span className="text-[11px] text-slate-400">
              Nenhuma narrativa desta coleção no catálogo atual.
            </span>
          ) : null}
        </div>
        {items.length > COLLECTION_PREVIEW ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-3 h-7 px-2 text-[11px] text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
          >
            {expanded ? "Mostrar menos" : `Ver as outras ${hidden} narrativas`}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CollectionsSection() {
  const openInOracle = useOpenInOracle();
  const entries = useMemo(
    () =>
      THEMATIC_COLLECTIONS.map((collection) => ({
        collection,
        items: collectionEntries(collection),
      })),
    []
  );

  return (
    <div>
      <SectionTitle
        icon={LibraryBig}
        title="Coleções temáticas"
        description="Curadoria derivada do catálogo por motivo, arquétipo e tema — a materialização do item 'Coleções Temáticas' do blueprint Explorador."
      />
      <div className="grid items-start gap-4 md:grid-cols-2">
        {entries.map(({ collection, items }) => (
          <CollectionCard
            key={collection.id}
            title={collection.title}
            subtitle={collection.subtitle}
            accentClass={ACCENT[collection.accent] ?? ACCENT.indigo}
            items={items}
            onOpen={openInOracle}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extração + documentos
// ---------------------------------------------------------------------------

function ExtractionSection() {
  const [filter, setFilter] = useState<ExtractionStatus | "todos">("todos");
  const summary = extractionSummary();
  const stats = catalogStats();

  const items = EXTRACTION_MATRIX.filter(
    (item) => filter === "todos" || item.status === filter
  );

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle
          icon={Waypoints}
          title="Matriz de extração"
          description="Cada capacidade do produto rastreada até o documento de origem — o que já existia, o que foi incorporado nesta iteração e o que ficou priorizado no backlog."
        />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "narrativas", value: stats.narratives },
            { label: "tradições", value: stats.traditions },
            { label: "motivos", value: stats.motifs },
            { label: "temas", value: stats.themes },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <p className="font-serif text-xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["todos", "implementado", "incorporado", "backlog"] as const).map((option) => {
            const active = filter === option;
            const count =
              option === "todos" ? EXTRACTION_MATRIX.length : summary[option];
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-100"
                    : "border-slate-700 bg-slate-950/40 text-slate-400 hover:text-slate-200"
                }`}
              >
                {option === "todos" ? "todos" : STATUS_LABEL[option]}
                <span className="ml-1.5 font-mono text-[10px] text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="border-slate-800 bg-slate-900/40">
              <CardContent className="flex flex-col gap-1.5 p-3.5 sm:flex-row sm:items-start sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100">{item.capability}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{item.provenance}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.decision}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 self-start text-[10px] uppercase tracking-wider ${STATUS_STYLE[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle
          icon={Archive}
          title="Inventário dos documentos"
          description="Os seis arquivos enviados, o que cada um acrescenta e o que foi efetivamente aproveitado."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {LEGACY_DOCUMENTS.map((doc) => (
            <Card key={doc.id} className="border-slate-800 bg-slate-900/40">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-base font-semibold leading-snug text-slate-100">
                    {doc.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-slate-700 bg-slate-950/50 text-[10px] text-slate-400"
                  >
                    {doc.size}
                  </Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  <FileText className="mr-1 inline size-3 align-text-bottom" aria-hidden="true" />
                  {doc.file}
                </p>
                <p className="text-xs leading-relaxed text-slate-400">{doc.value}</p>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Aproveitado
                  </p>
                  <ul className="space-y-0.5">
                    {doc.extracted.map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400"
                      >
                        <Check className="mt-0.5 size-3 shrink-0 text-emerald-400" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ArchiveTab() {
  const stats = catalogStats();
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 py-2">
        <Badge
          variant="outline"
          className="mb-3 border-amber-400/30 bg-amber-400/5 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-300/90"
        >
          Acervo legado
        </Badge>
        <h1 className="oracle-title font-serif text-3xl font-bold md:text-4xl">
          O que os documentos antigos viraram
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Seis documentos de projeto (blueprints, estudo de caso e um relatório
          completo de análise) foram dissecados, comparados com a implementação e
          convertidos em produto: uma oitava lente, quatro dossiês de referência,
          um motor local, uma biblioteca de prompts e um mapa de rastreabilidade.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-1">
            {stats.narratives} narrativas · {stats.traditions} tradições
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-1">
            {PROMPT_LIBRARY.length} prompts documentados
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-1">
            {REFERENCE_DOSSIERS.length} dossiês completos
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-1">
            {THEMATIC_COLLECTIONS.length} coleções temáticas
          </span>
        </div>
      </header>

      <Tabs defaultValue="dossies" className="gap-4">
        <div className="overflow-x-auto oracle-scroll pb-1">
          <TabsList className="h-auto min-w-max bg-slate-950/70 p-1">
            {[
              { id: "dossies", label: "Dossiês", icon: BookMarked },
              { id: "prompts", label: "Prompts", icon: FileText },
              { id: "colecoes", label: "Coleções", icon: LibraryBig },
              { id: "extracao", label: "Extração", icon: Waypoints },
            ].map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="gap-1.5 text-xs data-[state=active]:border-indigo-400/40 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-100 sm:text-sm"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="dossies">
          <DossiersSection />
        </TabsContent>
        <TabsContent value="prompts">
          <PromptsSection />
        </TabsContent>
        <TabsContent value="colecoes">
          <CollectionsSection />
        </TabsContent>
        <TabsContent value="extracao">
          <ExtractionSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
