"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Globe2, Library, Search, SearchX, Sparkles, X } from "lucide-react";
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
  { value: "todos", label: "Todos os tipos" },
  { value: "mito", label: "Mito" },
  { value: "lenda", label: "Lenda" },
  { value: "filme", label: "Filme" },
  { value: "serie", label: "Série" },
  { value: "livro", label: "Livro" },
  { value: "musica", label: "Música" },
  { value: "arte", label: "Arte" },
];

const PAGE_SIZE = 18;

/** Agrupa origens por família de tradição ("Cinema (2019)" → "Cinema"). */
function originGroup(origin: string): string {
  return origin.split("(")[0].trim();
}

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
    [entry.name, entry.origin, entry.synopsis, entry.period, ...entry.motifs, ...entry.themes].join(" ")
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
  const [origin, setOrigin] = useState("todas");
  // Paginação ancorada na combinação de filtros: ao mudar qualquer filtro a
  // lista volta ao topo sem precisar de efeito (nada de setState em effect).
  const [page, setPage] = useState({ key: "", count: PAGE_SIZE });

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const origins = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of catalog) {
      const group = originGroup(entry.origin);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [catalog]);

  const filtered = useMemo(
    () =>
      catalog.filter(
        (entry) =>
          (type === "todos" || entry.type === type) &&
          (origin === "todas" || originGroup(entry.origin) === origin) &&
          matchesQuery(entry, q)
      ),
    [catalog, q, type, origin]
  );

  const filterKey = `${q}\u0000${type}\u0000${origin}`;
  const visible = page.key === filterKey ? page.count : PAGE_SIZE;
  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > shown.length;
  const activeFilters = (q ? 1 : 0) + (type !== "todos" ? 1 : 0) + (origin !== "todas" ? 1 : 0);

  const clearFilters = () => {
    setQ("");
    setType("todos");
    setOrigin("todas");
  };

  const handleAnalyze = (name: string) => {
    setInput(name);
    setTab("analise");
    void startAnalysis();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-col gap-1.5">
        <h1 className="oracle-title font-serif text-2xl font-bold md:text-3xl">
          Explorar o Catálogo
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Um acervo de {catalog.length > 0 ? `${catalog.length} narrativas` : "narrativas curadas"}{" "}
          em {origins.length > 0 ? `${origins.length} tradições` : "dezenas de tradições"} — do épico
          mesopotâmico ao cinema brasileiro. Clique em “Analisar” para dissecar qualquer uma delas,
          ou toque num motivo para filtrar.
        </p>
      </header>

      {/* Controles — empilhados no mobile, em linha a partir de md */}
      <div className="mb-4 flex flex-col gap-2.5 md:flex-row md:items-center">
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
            className="h-10 border-slate-700 bg-slate-950/60 pl-9 pr-9 text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-400/70"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:flex md:items-center">
          <Select value={type} onValueChange={(v) => setType(v as "todos" | MediaType)}>
            <SelectTrigger
              className="w-full border-slate-700 bg-slate-950/60 text-slate-300 md:w-[160px]"
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
          <Select value={origin} onValueChange={setOrigin}>
            <SelectTrigger
              className="w-full border-slate-700 bg-slate-950/60 text-slate-300 md:w-[220px]"
              aria-label="Filtrar por tradição"
            >
              <Globe2 className="mr-1.5 size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <SelectValue placeholder="Tradição" />
            </SelectTrigger>
            <SelectContent className="max-h-[320px] border-slate-800 bg-slate-900">
              <SelectItem value="todas" className="text-slate-300">
                Todas as tradições
              </SelectItem>
              {origins.map(([name, count]) => (
                <SelectItem key={name} value={name} className="text-slate-300">
                  {name} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estado dos filtros — linha única, sem sobrepor o grid */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-3 text-xs text-slate-500">
        <span aria-live="polite">
          <span className="font-mono text-slate-300">{filtered.length}</span> de{" "}
          <span className="font-mono text-slate-300">{catalog.length}</span> narrativas
          {activeFilters > 0 ? " com os filtros atuais" : " no acervo"}
        </span>
        {activeFilters > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
          >
            <X className="size-3.5" aria-hidden="true" />
            Limpar {activeFilters > 1 ? `${activeFilters} filtros` : "filtro"}
          </Button>
        ) : null}
      </div>

      {/* Grid */}
      {catalogLoading && catalog.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-slate-800 bg-slate-900/50 py-0">
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
          <p className="max-w-sm text-sm text-slate-400">
            Nenhuma narrativa encontrada com esses filtros. Tente uma tradição mais ampla ou limpe a
            busca.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <>
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((entry) => (
              <Card
                key={entry.id}
                className="group gap-0 border-slate-800 bg-slate-900/50 py-0 transition-colors hover:border-indigo-400/30 hover:bg-slate-900/80"
              >
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif text-lg font-semibold leading-snug text-slate-100">
                      {entry.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className="mt-0.5 shrink-0 border-slate-700 bg-slate-950/50 text-[10px] text-slate-300"
                    >
                      <span
                        className="mr-1 inline-block size-1.5 rounded-full"
                        style={{ backgroundColor: MEDIA_TYPE_COLORS[entry.type] }}
                        aria-hidden="true"
                      />
                      {MEDIA_TYPE_LABELS[entry.type]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {entry.origin} · {entry.period}
                  </p>
                  <p className="mt-2.5 line-clamp-4 flex-1 text-sm leading-relaxed text-slate-400">
                    {entry.synopsis}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.motifs.slice(0, 4).map((motif) => (
                      <Badge
                        key={motif}
                        variant="secondary"
                        className="cursor-pointer bg-slate-800/70 px-2 py-0 font-mono text-[10px] font-normal text-slate-400 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
                        onClick={() => setQ(motif)}
                        title={`Filtrar por ${motif}`}
                      >
                        {motif}
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

          {hasMore ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage({ key: filterKey, count: visible + PAGE_SIZE })}
                className="border-slate-700 bg-slate-950/50 text-slate-200 hover:bg-slate-800 hover:text-slate-100"
              >
                <ChevronDown className="size-4" aria-hidden="true" />
                Mostrar mais {Math.min(PAGE_SIZE, filtered.length - shown.length)} narrativas
              </Button>
              <p className="text-[11px] text-slate-400">
                Exibindo {shown.length} de {filtered.length}
              </p>
            </div>
          ) : null}
        </>
      )}

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-slate-800/60 pt-5 text-center text-xs text-slate-500">
        <Library className="size-3.5 text-indigo-400/60" aria-hidden="true" />
        <span>
          {filtered.length} de {catalog.length} narrativas curadas — {origins.length} tradições,
          mito, literatura, cinema, série e canção.
        </span>
      </footer>
    </div>
  );
}
