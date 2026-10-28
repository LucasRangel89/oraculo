"use client";

import { useMemo } from "react";
import { Check, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MEDIA_TYPE_COLORS,
  type AnalysisResult,
  type Connection,
} from "@/lib/oracle-types";

function scoreColor(score: number): string {
  if (score >= 75) return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (score >= 50) return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  return "border-slate-600/60 bg-slate-700/30 text-slate-300";
}

interface ParallelsListProps {
  result: AnalysisResult;
  onSelect: (connection: Connection) => void;
}

export function ParallelsList({ result, onSelect }: ParallelsListProps) {
  const parallels = useMemo(
    () => [...result.parallels].sort((a, b) => b.score - a.score),
    [result.parallels]
  );

  return (
    <Card className="flex h-full flex-col border-slate-800 bg-slate-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between font-serif text-lg text-slate-100">
          <span className="flex items-center gap-2">
            <Network className="size-4 text-amber-400/90" aria-hidden="true" />
            Paralelos Descobertos
          </span>
          <Badge
            variant="outline"
            className="border-slate-700 bg-slate-950/50 font-mono text-xs text-slate-300"
          >
            {parallels.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {parallels.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Nenhum paralelo mapeado nesta análise.
          </p>
        ) : (
          <ScrollArea className="-mr-2.5 max-h-[560px] pr-2.5 oracle-scroll">
            <div className="flex flex-col gap-2.5">
              {parallels.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onSelect(c)}
                  className="group w-full rounded-lg border border-slate-800/80 bg-slate-950/40 p-3.5 text-left transition-all outline-none hover:border-indigo-400/40 hover:bg-slate-900/70 hover:ring-1 hover:ring-indigo-400/40 focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                  aria-label={`Comparar ${result.facts.name} com ${c.name} (similaridade ${Math.round(c.score)}%)`}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: MEDIA_TYPE_COLORS[c.type] }}
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium text-slate-100">
                        {c.name}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      title={
                        typeof c.rawScore === "number"
                          ? `Índice calibrado ${Math.round(c.score)} · similaridade bruta ${c.rawScore}`
                          : undefined
                      }
                      className={`shrink-0 font-mono text-xs ${scoreColor(c.score)}`}
                    >
                      {Math.round(c.score)}%
                    </Badge>
                  </div>
                  <p className="mb-2 truncate text-xs text-slate-500">
                    {c.origin}
                    {typeof c.rawScore === "number" ? (
                      <span className="ml-1.5 font-mono text-[10px] text-slate-600">
                        bruto {Math.round(c.rawScore)}
                      </span>
                    ) : null}
                  </p>
                  <p className="line-clamp-3 text-sm leading-snug text-slate-300">
                    {c.reason}
                  </p>
                  {c.convergences.length > 0 ? (
                    <ul className="mt-2.5 space-y-1">
                      {c.convergences.slice(0, 2).map((conv) => (
                        <li
                          key={conv}
                          className="flex items-start gap-1.5 text-xs text-slate-400"
                        >
                          <Check
                            className="mt-0.5 size-3 shrink-0 text-emerald-400/80"
                            aria-hidden="true"
                          />
                          <span className="line-clamp-1">{conv}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {c.categories.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {c.categories.slice(0, 4).map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="bg-slate-800/80 px-1.5 py-0 text-[10px] font-normal text-slate-400"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
