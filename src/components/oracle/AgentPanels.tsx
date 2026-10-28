"use client";

import {
  Brain,
  Check,
  CircleSlash,
  Compass,
  Drama,
  HelpCircle,
  KeyRound,
  Landmark,
  Layers,
  Minus,
  Scale,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MEDIA_TYPE_LABELS,
  SIMILARITY_WEIGHTS,
  type AnalysisResult,
  type Fingerprint,
} from "@/lib/oracle-types";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">Confiança do agente</span>
        <span className="font-mono font-semibold text-indigo-300">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function NotRun() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <CircleSlash className="size-6 text-slate-600" aria-hidden="true" />
      <p className="text-sm text-slate-500">
        Agente não executado nesta profundidade.
      </p>
      <p className="text-xs text-slate-600">
        Selecione “Análise completa” na busca para incluir esta lente.
      </p>
    </div>
  );
}

function ChipGroup({
  label,
  items,
  tone = "indigo",
}: {
  label: string;
  items: string[];
  tone?: "indigo" | "amber" | "slate";
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "amber"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : tone === "slate"
        ? "border-slate-700 bg-slate-800/60 text-slate-300"
        : "border-indigo-400/30 bg-indigo-500/10 text-indigo-200";
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge
            key={item}
            variant="outline"
            className={`font-normal ${toneClass}`}
          >
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

const FINGERPRINT_GROUPS: {
  label: string;
  weight: number;
  pick: (fp: Fingerprint) => string[];
}[] = [
  {
    label: "Motivos",
    weight: SIMILARITY_WEIGHTS.motifs,
    pick: (fp) => fp.motifs,
  },
  {
    label: "Arquétipos",
    weight: SIMILARITY_WEIGHTS.archetypes,
    pick: (fp) => fp.archetypes,
  },
  {
    label: "Temas",
    weight: SIMILARITY_WEIGHTS.themes,
    pick: (fp) => fp.themes,
  },
  {
    label: "Estrutura",
    weight: SIMILARITY_WEIGHTS.structure,
    pick: (fp) => fp.beats,
  },
];

const PRESENCE_STYLES: Record<string, string> = {
  forte: "border-amber-400/50 bg-amber-400/15 text-amber-300",
  moderado: "border-indigo-400/40 bg-indigo-500/10 text-indigo-300",
  leve: "border-slate-600/60 bg-slate-800/60 text-slate-400",
};

interface AgentPanelsProps {
  result: AnalysisResult;
}

export function AgentPanels({ result }: AgentPanelsProps) {
  const {
    facts,
    structure,
    archetypes,
    symbols,
    themes,
    psychoanalysis,
    cultural,
    fingerprint,
  } = result;

  return (
    <Card className="flex h-full flex-col border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800/70 px-4 pt-4 md:px-5">
        <Tabs defaultValue="resumo" className="gap-3">
          <div className="overflow-x-auto oracle-scroll pb-1">
            <TabsList className="h-auto min-w-max bg-slate-950/70 p-1">
              <TabsTrigger
                value="resumo"
                className="gap-1.5 text-xs data-[state=active]:border-indigo-400/40 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-100 sm:text-sm"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                Resumo
              </TabsTrigger>
              <TabsTrigger
                value="estrutura"
                className="gap-1.5 text-xs data-[state=active]:border-indigo-400/40 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-100 sm:text-sm"
              >
                <Layers className="size-3.5" aria-hidden="true" />
                Estrutura
              </TabsTrigger>
              <TabsTrigger
                value="arquetipos"
                className="gap-1.5 text-xs data-[state=active]:border-amber-400/40 data-[state=active]:bg-amber-400/10 data-[state=active]:text-amber-100 sm:text-sm"
              >
                <Drama className="size-3.5" aria-hidden="true" />
                Arquétipos
              </TabsTrigger>
              <TabsTrigger
                value="simbolos"
                className="gap-1.5 text-xs data-[state=active]:border-indigo-400/40 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-100 sm:text-sm"
              >
                <KeyRound className="size-3.5" aria-hidden="true" />
                Símbolos
              </TabsTrigger>
              <TabsTrigger
                value="temas"
                className="gap-1.5 text-xs data-[state=active]:border-indigo-400/40 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-100 sm:text-sm"
              >
                <Compass className="size-3.5" aria-hidden="true" />
                Temas
              </TabsTrigger>
              <TabsTrigger
                value="psicanalise"
                className="gap-1.5 text-xs data-[state=active]:border-indigo-400/40 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-100 sm:text-sm"
              >
                <Brain className="size-3.5" aria-hidden="true" />
                Psicanálise
              </TabsTrigger>
              <TabsTrigger
                value="cultural"
                className="gap-1.5 text-xs data-[state=active]:border-amber-400/40 data-[state=active]:bg-amber-400/10 data-[state=active]:text-amber-100 sm:text-sm"
              >
                <Landmark className="size-3.5" aria-hidden="true" />
                Cultural
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ---------------------------------------------------- Resumo */}
          <TabsContent value="resumo">
            <ScrollArea className="h-[520px] pr-2.5 oracle-scroll lg:h-[560px]">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Narrativa analisada
                  </p>
                  <p className="mt-1 font-serif text-lg text-slate-100">{facts.name}</p>
                  <p className="text-xs text-slate-400">
                    {MEDIA_TYPE_LABELS[facts.type]} · {facts.origin} · {facts.period}
                  </p>
                  {facts.characters.length > 0 ? (
                    <div className="mt-2.5">
                      <ChipGroup label="Personagens" items={facts.characters} tone="slate" />
                    </div>
                  ) : null}
                </div>
                <Separator className="bg-slate-800/70" />
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Fingerprint narrativo — base do score de similaridade
                  </p>
                  <div className="space-y-3">
                    {FINGERPRINT_GROUPS.map((group) => (
                      <div key={group.label}>
                        <p className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-medium text-slate-300">{group.label}</span>
                          <Badge
                            variant="outline"
                            className="border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0 font-mono text-[10px] text-indigo-300"
                          >
                            {Math.round(group.weight * 100)}%
                          </Badge>
                        </p>
                        {group.pick(fingerprint).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {group.pick(fingerprint).map((item) => (
                              <Badge
                                key={item}
                                variant="secondary"
                                className="bg-slate-800/70 px-2 py-0.5 font-mono text-[10px] font-normal text-slate-300"
                              >
                                {item.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600">—</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ------------------------------------------------- Estrutura */}
          <TabsContent value="estrutura">
            {!structure ? (
              <NotRun />
            ) : (
              <ScrollArea className="h-[520px] pr-2.5 oracle-scroll lg:h-[560px]">
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-300">
                    {structure.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                    >
                      {structure.acts} {structure.acts === 1 ? "ato" : "atos"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-700 bg-slate-800/60 text-slate-300"
                    >
                      Tom: {structure.tone}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Incidente detonante", text: structure.incitingIncident },
                      { label: "Clímax", text: structure.climax },
                      { label: "Resolução", text: structure.resolution },
                      { label: "Tom narrativo", text: structure.tone },
                    ].map((b) => (
                      <div
                        key={b.label}
                        className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3"
                      >
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {b.label}
                        </p>
                        <p className="text-xs leading-relaxed text-slate-300">{b.text}</p>
                      </div>
                    ))}
                  </div>
                  {structure.heroJourney.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Jornada do Herói (Campbell)
                      </p>
                      <ul className="space-y-1.5">
                        {structure.heroJourney.map((stage) => (
                          <li key={stage.stage} className="flex items-start gap-2">
                            {stage.present ? (
                              <Check
                                className="mt-0.5 size-3.5 shrink-0 text-emerald-400"
                                aria-hidden="true"
                              />
                            ) : (
                              <Minus
                                className="mt-0.5 size-3.5 shrink-0 text-slate-600"
                                aria-hidden="true"
                              />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`text-sm ${stage.present ? "text-slate-200" : "text-slate-500"}`}
                              >
                                {stage.stage}
                              </p>
                              <p className="text-xs leading-snug text-slate-500">
                                {stage.evidence}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {structure.beats.length > 0 ? (
                    <ChipGroup
                      label="Beats"
                      items={structure.beats.map((b) => b.replace(/_/g, " "))}
                      tone="indigo"
                    />
                  ) : null}
                  <ConfidenceBar value={structure.confidence} />
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ----------------------------------------------- Arquétipos */}
          <TabsContent value="arquetipos">
            {!archetypes ? (
              <NotRun />
            ) : (
              <ScrollArea className="h-[520px] pr-2.5 oracle-scroll lg:h-[560px]">
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-300">
                    {archetypes.summary}
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {archetypes.archetypes.map((entry) => (
                      <div
                        key={`${entry.character}-${entry.archetype}`}
                        className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-slate-100">
                            {entry.character}
                          </p>
                          <Badge
                            variant="outline"
                            className="shrink-0 border-amber-400/50 bg-amber-400/10 text-amber-300"
                          >
                            {entry.archetype}
                          </Badge>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-400">
                          {entry.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
                      Processo de individuação
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {archetypes.individuation}
                    </p>
                  </div>
                  <ConfidenceBar value={archetypes.confidence} />
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* -------------------------------------------------- Símbolos */}
          <TabsContent value="simbolos">
            {!symbols ? (
              <NotRun />
            ) : (
              <ScrollArea className="h-[520px] pr-2.5 oracle-scroll lg:h-[560px]">
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-300">
                    {symbols.summary}
                  </p>
                  <ul className="space-y-2.5">
                    {symbols.symbols.map((s) => (
                      <li
                        key={s.symbol}
                        className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3"
                      >
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <p className="font-medium capitalize text-slate-100">{s.symbol}</p>
                          <Badge
                            variant="outline"
                            className={`px-1.5 py-0 text-[10px] capitalize ${PRESENCE_STYLES[s.presence] ?? PRESENCE_STYLES.leve}`}
                          >
                            presença {s.presence}
                          </Badge>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-300">{s.meaning}</p>
                        {s.universalMeaning ? (
                          <p className="mt-1.5 text-xs italic leading-relaxed text-slate-400">
                            “{s.universalMeaning}”
                          </p>
                        ) : null}
                        {s.historicalParallels.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {s.historicalParallels.map((p) => (
                              <Badge
                                key={p}
                                variant="outline"
                                className="border-slate-700 bg-slate-900 px-1.5 py-0 text-[10px] font-normal text-slate-400"
                              >
                                cf. {p}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <ConfidenceBar value={symbols.confidence} />
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ---------------------------------------------------- Temas */}
          <TabsContent value="temas">
            {!themes ? (
              <NotRun />
            ) : (
              <ScrollArea className="h-[520px] pr-2.5 oracle-scroll lg:h-[560px]">
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-300">{themes.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {themes.themes.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-200"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                  {themes.existentialQuestions.length > 0 ? (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <HelpCircle className="size-3.5 text-indigo-400/80" aria-hidden="true" />
                        Questões existenciais
                      </p>
                      <ul className="space-y-1.5">
                        {themes.existentialQuestions.map((q) => (
                          <li
                            key={q}
                            className="rounded-md border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-sm leading-relaxed text-slate-300"
                          >
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {themes.ethicalDilemmas.length > 0 ? (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <Scale className="size-3.5 text-amber-400/80" aria-hidden="true" />
                        Dilemas éticos
                      </p>
                      <ul className="space-y-1.5">
                        {themes.ethicalDilemmas.map((d) => (
                          <li
                            key={d}
                            className="flex items-start gap-2 rounded-md border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-sm leading-relaxed text-slate-300"
                          >
                            <Scale
                              className="mt-0.5 size-3.5 shrink-0 text-amber-400/70"
                              aria-hidden="true"
                            />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <ConfidenceBar value={themes.confidence} />
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ---------------------------------------------- Psicanálise */}
          <TabsContent value="psicanalise">
            {!psychoanalysis ? (
              <NotRun />
            ) : (
              <ScrollArea className="h-[520px] pr-2.5 oracle-scroll lg:h-[560px]">
                <div className="space-y-4">
                  {psychoanalysis.speculative ? (
                    <Alert className="border-amber-400/30 bg-amber-400/5 text-amber-200">
                      <Brain className="size-4" aria-hidden="true" />
                      <AlertDescription className="text-xs leading-relaxed text-amber-200/90">
                        Leitura especulativa — {psychoanalysis.disclaimer}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <p className="text-sm leading-relaxed text-slate-300">
                    {psychoanalysis.summary}
                  </p>
                  <ChipGroup
                    label="Complexos"
                    items={psychoanalysis.complexes}
                    tone="indigo"
                  />
                  <ChipGroup
                    label="Desejos inconscientes"
                    items={psychoanalysis.unconsciousDesires}
                    tone="amber"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <Brain className="size-3.5 text-indigo-400" aria-hidden="true" />
                        Leitura Freudiana
                      </p>
                      <p className="text-xs leading-relaxed text-slate-400">
                        {psychoanalysis.freudianReading}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <Brain className="size-3.5 text-amber-400" aria-hidden="true" />
                        Leitura Junguiana
                      </p>
                      <p className="text-xs leading-relaxed text-slate-400">
                        {psychoanalysis.jungianReading}
                      </p>
                    </div>
                  </div>
                  <ConfidenceBar value={psychoanalysis.confidence} />
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ------------------------------------------- Cultural-Histórico */}
          <TabsContent value="cultural">
            {!cultural ? (
              <NotRun />
            ) : (
              <ScrollArea className="h-[520px] pr-2.5 oracle-scroll lg:h-[560px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-2">
                    <Landmark className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <p className="text-xs text-amber-200/90">
                      O Historiador Social — lente cultural-histórica incorporada dos
                      blueprints legados.
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {cultural.summary}
                  </p>
                  <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Contexto histórico
                    </p>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {cultural.historicalContext}
                    </p>
                  </div>
                  <ChipGroup
                    label="Influências e linhagens"
                    items={cultural.culturalInfluences}
                    tone="indigo"
                  />
                  <ChipGroup
                    label="Valores e tensões"
                    items={cultural.valuesAndTensions}
                    tone="amber"
                  />
                  <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Recepção e diálogo cultural
                    </p>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {cultural.reception}
                    </p>
                  </div>
                  <ConfidenceBar value={cultural.confidence} />
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
