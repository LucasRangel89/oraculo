"use client";

import { useEffect, useMemo, useState } from "react";
import { Library, Search, SearchX, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOracleStore } from "@/lib/oracle-store";
import {
  MEDIA_TYPE_COLORS,
  MEDIA_TYPE_LABELS,
  type CatalogEntry,
  type MediaType,
} from "@/lib/oracle-types";

const TYPE_OPTIONS: { value: "todos" | MediaType; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "mito", label: "Mito" },
  { value: "lenda", label: "Lenda" },
  { value: "filme", label: "Filme" },
  { value: "serie", label: "Série" },
  { value: "livro", label: "Livro" },
];

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesQuery(entry: CatalogEntry, q: string): boolean {
  const needle = normalizeText(q.trim());
  if (!needle) return true;
  const haystack = normalizeText(
    [entry.name, entry.origin, entry.synopsis, ...entry.motifs, ...entry.themes].join(" ")
  );
  return haystack.includes(needle);
}

export function ExploreTab() {
  const catalog = useOracleStore((s) => s.catalog);
  const catalogLoading = useOracleStore((s) => s.catalogLoading);
  const loadCatalog = useOracleStore((s) => s.loadCatalog);
  const setInput = useOracleStore((s) => s.setInput);
  const setTab = useOracleStore((s) => s.setTab);
  const startAnalysis = useOracleStore((s) => s.startAnalysis);

  const [q, setQ] = useState("");
  const [type, setType] = useState<"todos" | MediaType>("todos");

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const filtered = useMemo(
    () =>
      catalog.filter(
        (entry) => (type === "todos" || entry.type === type) && matchesQuery(entry, q)
      ),
    [catalog, q, type]
  );

  const handleAnalyze = (name: string) => {
    setInput(name);
    setTab("analise");
    void startAnalysis();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-col gap-1.5">
        <h1 className="oracle-title font-serif text-2xl font-bold md:text-3xl">
          Explorar o Catálogo
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Narrativas curadas pelo Oráculo — clique em “Analisar” para dissecar
          qualquer uma delas, ou toque num motivo para filtrar.
        </p>
      </header>

      {/* Controles */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <label htmlFor="catalog-search" className="sr-only">
            Buscar no catálogo
          </label>
          <Input
            id="catalog-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, origem, motivo ou tema..."
            className="h-10 border-slate-700 bg-slate-950/60 pl-9 text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-400/70"
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as "todos" | MediaType)}>
          <SelectTrigger
            className="w-full border-slate-700 bg-slate-950/60 text-slate-300 sm:w-[170px]"
            aria-label="Filtrar por tipo de mídia"
          >
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900">
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-slate-300">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {catalogLoading && catalog.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-slate-800 bg-slate-900/50">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-6 w-2/3 bg-slate-800" />
                <Skeleton className="h-4 w-1/3 bg-slate-800" />
                <Skeleton className="h-16 w-full bg-slate-800" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 bg-slate-800" />
                  <Skeleton className="h-5 w-16 bg-slate-800" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-800 py-16 text-center">
          <SearchX className="size-8 text-slate-600" aria-hidden="true" />
          <p className="text-sm text-slate-400">
            Nenhuma narrativa encontrada com esses filtros.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setType("todos");
            }}
            className="text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <Card
              key={entry.id}
              className="group flex flex-col border-slate-800 bg-slate-900/50 transition-colors hover:border-indigo-400/30 hover:bg-slate-900/80"
            >
              <CardContent className="flex flex-1 flex-col p-5">
                <h2 className="font-serif text-lg font-semibold leading-snug text-slate-100">
                  {entry.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="border-slate-700 bg-slate-950/50 text-[10px] text-slate-300"
                  >
                    <span
                      className="mr-0.5 inline-block size-1.5 rounded-full"
                      style={{ backgroundColor: MEDIA_TYPE_COLORS[entry.type] }}
                      aria-hidden="true"
                    />
                    {MEDIA_TYPE_LABELS[entry.type]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-slate-700 bg-slate-950/50 text-[10px] text-slate-400"
                  >
                    {entry.origin}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-slate-700 bg-slate-950/50 text-[10px] text-slate-500"
                  >
                    {entry.period}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">
                  {entry.synopsis}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.motifs.slice(0, 4).map((motif) => (
                    <Badge
                      key={motif}
                      variant="secondary"
                      className="cursor-pointer bg-slate-800/70 px-2 py-0 font-mono text-[10px] font-normal text-slate-400 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
                      onClick={() => setQ(motif.replace(/_/g, " "))}
                    >
                      {motif.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAnalyze(entry.name)}
                  className="mt-4 w-full border border-indigo-400/30 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/30"
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  Analisar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <footer className="mt-8 flex items-center justify-center gap-2 border-t border-slate-800/60 pt-5 text-center text-xs text-slate-500">
        <Library className="size-3.5 text-indigo-400/60" aria-hidden="true" />
        <span>
          {filtered.length} de {catalog.length || 24} narrativas curadas —
          mitologias de 10 tradições + cultura pop
        </span>
      </footer>
    </div>
  );
}
