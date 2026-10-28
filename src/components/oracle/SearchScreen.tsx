"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Cpu,
  Dices,
  FlaskConical,
  History,
  ScanEye,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchEngineStatus, IS_STATIC, relativeTime } from "@/lib/oracle-client";
import { useOracleStore } from "@/lib/oracle-store";
import type { AnalysisDepth, EngineStatus } from "@/lib/oracle-types";

const FALLBACK_SUGGESTIONS = [
  "Perseu",
  "Prometeu",
  "Édipo",
  "Odisseu",
  "Gilgamesh",
  "Fausto",
  "Matrix",
  "Luke Skywalker",
  "Harry Potter",
  "Hamlet",
];

const DEPTH_OPTIONS: {
  id: AnalysisDepth;
  title: string;
  desc: string;
  icon: typeof Zap;
}[] = [
  { id: "rapida", title: "Rápida", desc: "4 agentes essenciais", icon: Zap },
  { id: "completa", title: "Completa", desc: "Todas as 8 lentes", icon: ScanEye },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: Zap,
    title: "Nexus",
    desc: "Informe qualquer narrativa — um mito, um filme, um livro ou um personagem.",
  },
  {
    step: "2",
    icon: ScanEye,
    title: "Lentes",
    desc: "Até 8 lentes especialistas dissecam a história em paralelo — do estrutural ao cultural-histórico.",
  },
  {
    step: "3",
    icon: Share2,
    title: "Conexões",
    desc: "Receba um grafo interativo, scores transparentes e comparações profundas entre narrativas.",
  },
];

export function SearchScreen() {
  const input = useOracleStore((s) => s.input);
  const setInput = useOracleStore((s) => s.setInput);
  const depth = useOracleStore((s) => s.depth);
  const setDepth = useOracleStore((s) => s.setDepth);
  const startAnalysis = useOracleStore((s) => s.startAnalysis);
  const recent = useOracleStore((s) => s.recent);
  const loadRecent = useOracleStore((s) => s.loadRecent);
  const loadCached = useOracleStore((s) => s.loadCached);
  const catalog = useOracleStore((s) => s.catalog);
  const loadCatalog = useOracleStore((s) => s.loadCatalog);
  const hasResult = useOracleStore((s) => s.result !== null);
  const [engine, setEngine] = useState<EngineStatus | null>(null);

  // Chips de sugestão vêm do catálogo curado (fallback estático)
  // Amostra espalhada pelo acervo: mostra a variedade de tradições em vez de
  // repetir sempre as dez primeiras entradas.
  const suggestions = useMemo(() => {
    if (catalog.length === 0) return FALLBACK_SUGGESTIONS;
    const step = Math.max(1, Math.floor(catalog.length / 10));
    return catalog.filter((_, i) => i % step === 0).slice(0, 10).map((e) => e.name);
  }, [catalog]);

  useEffect(() => {
    void loadRecent();
    void loadCatalog();
    let alive = true;
    fetchEngineStatus()
      .then((status) => {
        if (alive) setEngine(status);
      })
      .catch(() => {
        // status é informativo: falha silenciosa
      });
    return () => {
      alive = false;
    };
  }, [loadRecent, loadCatalog]);

  const canAnalyze = input.trim().length >= 2;

  const randomSuggestion = useMemo(
    () => () => {
      const pool = suggestions.filter((s) => s !== input.trim());
      if (pool.length === 0) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setInput(pick);
    },
    [suggestions, input, setInput]
  );

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center px-2 py-10 text-center md:py-16">
        <Badge
          variant="outline"
          className="mb-5 border-amber-400/30 bg-amber-400/5 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-300/90"
        >
          Hermenêutica Digital
        </Badge>
        <h1 className="oracle-title max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
          Oráculo das Conexões Narrativas
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
          Uma estação de trabalho analítica que disseca o monomito e a estrutura
          narrativa — revelando os fios invisíveis que conectam mitos,
          literatura e cultura pop.
        </p>
      </section>

      {/* Card de busca */}
      <Card className="w-full max-w-2xl border-slate-800 bg-slate-900/60 py-0 shadow-[0_0_60px_-15px_rgba(99,102,241,0.25)]">
        <CardContent className="p-5 md:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canAnalyze) void startAnalysis();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="narrative-input" className="sr-only">
              Narrativa para analisar
            </label>
            <Input
              id="narrative-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'Ex.: "Perseu", "Matrix", "Fausto"...'}
              className="h-14 flex-1 border-slate-700 bg-slate-950/60 text-lg text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/70 focus-visible:ring-indigo-400/30"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={randomSuggestion}
                aria-label="Sugestão aleatória"
                title="Sugestão aleatória"
                className="h-14 w-12 shrink-0 border-slate-700 bg-slate-950/40 text-amber-300/90 hover:bg-amber-400/10 hover:text-amber-200"
              >
                <Dices className="size-5" />
              </Button>
              <Button
                type="submit"
                disabled={!canAnalyze}
                className="h-14 flex-1 bg-indigo-500 text-base font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.7)] hover:bg-indigo-400 sm:flex-none sm:px-7"
              >
                <Sparkles className="size-5" />
                Analisar
              </Button>
            </div>
          </form>

          {/* Profundidade */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Profundidade da análise
            </p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Profundidade da análise">
              {DEPTH_OPTIONS.map((opt) => {
                const selected = depth === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDepth(opt.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                      selected
                        ? "border-indigo-400/60 bg-indigo-500/10 shadow-[inset_0_0_20px_-8px_rgba(99,102,241,0.5)]"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    <Icon
                      className={`size-5 shrink-0 ${selected ? "text-indigo-300" : "text-slate-500"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold ${selected ? "text-indigo-100" : "text-slate-300"}`}
                      >
                        {opt.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chips de sugestão */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Experimente
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((name) => (
                <button key={name} type="button" onClick={() => setInput(name)}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer border-slate-700 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-200"
                  >
                    {name}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {hasResult ? (
            <button
              type="button"
              onClick={() => useOracleStore.setState({ view: "result" })}
              className="mt-5 inline-flex items-center gap-1 text-xs text-amber-300/90 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            >
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              Voltar ao resultado anterior
            </button>
          ) : null}
        </CardContent>
      </Card>

      {/* Selo de motor / transparência operacional */}
      {engine ? (
        engine.engine === "local" ? (
          <div className="mt-5 flex w-full max-w-2xl items-start gap-2.5 rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3.5 py-2.5">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-emerald-200/90">
              <strong className="font-semibold">
                {IS_STATIC ? "Edição estática — motor local no navegador" : "Modo demonstração local"}
              </strong>{" "}
              — {IS_STATIC ? (
                <>
                  esta página é servida pelo GitHub Pages: as oito lentes rodam
                  inteiramente no seu navegador sobre {engine.catalog.narratives} narrativas
                  curadas ({engine.catalog.traditions} tradições), sem servidor e sem chave de
                  API. Seu histórico fica salvo apenas neste dispositivo.
                </>
              ) : (
                <>
                  sem chave de LLM conectada, o Oráculo usa o motor hermenêutico
                  determinístico sobre {engine.catalog.narratives} narrativas curadas (
                  {engine.catalog.traditions} tradições). Configure{" "}
                  <code className="text-emerald-100">ORACLE_LLM_BASE_URL</code> e{" "}
                  <code className="text-emerald-100">ORACLE_LLM_API_KEY</code> para ativar as oito
                  lentes generativas.
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="mt-5 flex w-full max-w-2xl items-center gap-2.5 rounded-lg border border-indigo-400/25 bg-indigo-500/5 px-3.5 py-2.5">
            <Cpu className="size-4 shrink-0 text-indigo-400" aria-hidden="true" />
            <p className="text-xs text-indigo-200/90">
              Agentes generativos ativos · {engine.provider} ({engine.model}) · perspectivas
              armazenadas via{" "}
              {engine.store === "prisma"
                ? "Prisma/SQLite"
                : engine.store === "browser"
                  ? "armazenamento do navegador"
                  : "arquivo local"}
              .
            </p>
          </div>
        )
      ) : null}

      {/* Análises recentes */}
      {recent.length > 0 ? (
        <section className="mt-8 w-full max-w-2xl" aria-label="Análises recentes">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <History className="size-4 text-slate-500" aria-hidden="true" />
            Análises recentes
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void loadCached(item.id)}
                className="group flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 py-1.5 pl-3 pr-3.5 text-xs text-slate-300 transition-colors outline-none hover:border-amber-400/40 hover:bg-amber-400/5 focus-visible:ring-2 focus-visible:ring-indigo-400/60"
              >
                <span className="max-w-[180px] truncate font-medium">
                  {item.input}
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-amber-300/70">
                  {relativeTime(item.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Como funciona */}
      <section className="mt-12 w-full max-w-5xl" aria-label="Como funciona">
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                className="border-slate-800/80 bg-slate-900/40 py-0 transition-colors hover:border-slate-700"
              >
                <CardContent className="flex gap-3.5 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/10">
                    <Icon className="size-4.5 text-indigo-300" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                      <span className="mr-1.5 font-serif text-amber-300/80">
                        {item.step}.
                      </span>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
