"use client";

import { Check, Download, Minus, Palette, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreRing } from "@/components/oracle/ScoreRing";
import { useOracleStore } from "@/lib/oracle-store";

function LoadingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando comparação">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <Skeleton className="h-8 w-3/4 bg-slate-800" />
        <Skeleton className="size-20 rounded-full bg-slate-800" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-24 bg-slate-800" />
        <Skeleton className="h-24 bg-slate-800" />
      </div>
      <Skeleton className="h-28 bg-slate-800" />
      <Skeleton className="h-20 bg-slate-800" />
      <p className="text-center text-xs text-slate-500">
        O Oráculo está cruzando os fios das duas narrativas...
      </p>
    </div>
  );
}

export function ComparisonModal() {
  const comparison = useOracleStore((s) => s.comparison);
  const closeComparison = useOracleStore((s) => s.closeComparison);
  const generateArtwork = useOracleStore((s) => s.generateArtwork);
  const { open, loading, error, data, artwork, artworkLoading } = comparison;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeComparison();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-900 oracle-scroll sm:max-w-4xl">
        {loading ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Comparação profunda</DialogTitle>
              <DialogDescription>
                Comparando {comparison.aName} e {comparison.bName}
              </DialogDescription>
            </DialogHeader>
            <LoadingSkeleton />
          </>
        ) : error && !data ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="font-serif text-slate-100">
                Comparação indisponível
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {comparison.aName} ⚡ {comparison.bName}
              </DialogDescription>
            </DialogHeader>
            <Alert
              variant="destructive"
              className="border-red-500/30 bg-red-500/10 text-red-200"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={closeComparison}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                <DialogTitle className="font-serif text-xl leading-snug text-slate-100 md:text-2xl">
                  {data.a.name}{" "}
                  <Zap className="mx-0.5 inline size-5 text-amber-400" aria-hidden="true" />{" "}
                  {data.b.name}
                </DialogTitle>
                <ScoreRing value={data.score} size={80} label="Similaridade" />
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {data.a.origin} · {data.b.origin}
              </DialogDescription>
            </DialogHeader>

            {/* Essências */}
            <div className="grid gap-3 md:grid-cols-2">
              {[data.a, data.b].map((side) => (
                <div
                  key={side.name}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 p-4"
                >
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Essência · {side.name}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300">{side.essence}</p>
                </div>
              ))}
            </div>

            {/* Convergências por categoria */}
            {data.convergences.length > 0 ? (
              <section aria-label="Pontos de convergência">
                <h4 className="mb-2.5 font-serif text-base font-semibold text-slate-100">
                  Pontos de Convergência
                </h4>
                <div className="space-y-3">
                  {data.convergences.map((group) => (
                    <div
                      key={group.title}
                      className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5"
                    >
                      <Badge
                        variant="outline"
                        className="mb-2 border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                      >
                        {group.title}
                      </Badge>
                      <ul className="space-y-1.5">
                        {group.points.map((point) => (
                          <li
                            key={point}
                            className="flex items-start gap-2 text-sm text-slate-300"
                          >
                            <Check
                              className="mt-0.5 size-4 shrink-0 text-emerald-400"
                              aria-hidden="true"
                            />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Diferenças + símbolos compartilhados */}
            <div className="grid gap-3 md:grid-cols-2">
              {data.differences.length > 0 ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Diferenças
                  </h4>
                  <ul className="space-y-1.5">
                    {data.differences.map((diff) => (
                      <li
                        key={diff}
                        className="flex items-start gap-2 text-sm text-slate-400"
                      >
                        <Minus
                          className="mt-0.5 size-4 shrink-0 text-slate-600"
                          aria-hidden="true"
                        />
                        <span className="leading-relaxed">{diff}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {data.sharedSymbols.length > 0 ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Símbolos Compartilhados
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {data.sharedSymbols.map((symbol) => (
                      <Badge
                        key={symbol}
                        variant="outline"
                        className="border-amber-400/40 bg-amber-400/10 text-amber-200"
                      >
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Categorias */}
            {data.categories.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">
                  Categoria da conexão:
                </span>
                {data.categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="border-slate-700 bg-slate-950/50 text-slate-300"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            ) : null}

            <Separator className="bg-slate-800" />

            {/* Narrativa explicativa */}
            <blockquote
              className="border-l-2 border-amber-400/60 pl-4 text-sm italic leading-relaxed text-slate-300"
              cite="Oráculo"
            >
              {data.narrative}
            </blockquote>

            <Alert className="border-slate-800 bg-slate-950/40 py-2.5">
              <AlertDescription className="text-xs text-slate-500">
                {data.disclaimer}
              </AlertDescription>
            </Alert>

            <Separator className="bg-slate-800" />

            {/* Arte-síntese */}
            <section aria-label="Arte-síntese">
              {!artwork && !artworkLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={() => void generateArtwork()}
                    className="bg-gradient-to-r from-indigo-500 to-amber-500 text-white shadow-[0_0_24px_-8px_rgba(251,191,36,0.6)] hover:from-indigo-400 hover:to-amber-400"
                  >
                    <Palette className="size-4" aria-hidden="true" />
                    Gerar Arte-Síntese
                  </Button>
                  <p className="text-center text-[11px] text-slate-500">
                    Uma imagem inédita fundindo os símbolos de {data.a.name} e{" "}
                    {data.b.name}
                  </p>
                </div>
              ) : null}
              {artworkLoading ? (
                <div className="space-y-2" aria-busy="true">
                  <Skeleton className="aspect-[1152/864] w-full rounded-lg bg-slate-800" />
                  <p className="text-center text-xs text-slate-500">
                    Pintando o arquétipo compartilhado... (pode levar alguns segundos)
                  </p>
                </div>
              ) : null}
              {artwork && !artworkLoading ? (
                <div className="space-y-2">
                  <img
                    src={artwork}
                    alt={`Arte-síntese gerada por IA para a conexão entre ${data.a.name} e ${data.b.name}`}
                    className="w-full rounded-lg border border-slate-800"
                  />
                  <div className="flex justify-end">
                    <a
                      href={artwork}
                      download={`arte-sintese-${data.a.name}-${data.b.name}`.replace(/\s+/g, "-").toLowerCase()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Baixar arte
                    </a>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
