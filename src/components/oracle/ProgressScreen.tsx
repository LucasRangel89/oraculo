"use client";

import { CircleDashed, Loader2, XCircle, CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOracleStore } from "@/lib/oracle-store";
import { AGENT_LABELS, type AgentId } from "@/lib/oracle-types";

/** Micro-descrição fixa por agente (progresso gamificado). */
const AGENT_MICROS: Record<AgentId, string> = {
  facts: "Identificando contexto e fatos",
  structure: "Mapeando estrutura narrativa (Campbell)",
  archetypes: "Classificando arquétipos junguianos",
  symbols: "Extraindo símbolos e motivos",
  themes: "Questões existenciais e éticas",
  psychoanalysis: "Leitura psicanalítica (Freud/Jung)",
  parallels: "Traçando paralelos mitológicos",
};

function StatusIcon({ status }: { status: "pending" | "running" | "done" | "failed" }) {
  switch (status) {
    case "running":
      return <Loader2 className="size-5 animate-spin text-indigo-400" aria-hidden="true" />;
    case "done":
      return <CheckCircle2 className="size-5 text-emerald-400" aria-hidden="true" />;
    case "failed":
      return <XCircle className="size-5 text-red-400" aria-hidden="true" />;
    default:
      return <CircleDashed className="size-5 text-slate-600" aria-hidden="true" />;
  }
}

export function ProgressScreen() {
  const input = useOracleStore((s) => s.input);
  const depth = useOracleStore((s) => s.depth);
  const agentStatuses = useOracleStore((s) => s.agentStatuses);
  const progress = useOracleStore((s) => s.progress);
  const resetToSearch = useOracleStore((s) => s.resetToSearch);

  const running = agentStatuses.filter((s) => s.status === "running").length;

  return (
    <div className="flex justify-center py-6 md:py-12">
      <Card className="w-full max-w-xl border-slate-800 bg-slate-900/60 shadow-[0_0_60px_-15px_rgba(99,102,241,0.3)]">
        <CardContent className="p-6 md:p-8">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="oracle-title font-serif text-xl font-bold md:text-2xl">
              Analisando: “{input}”
            </h1>
          </div>
          <div className="mb-6">
            <Badge
              variant="outline"
              className={
                depth === "completa"
                  ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                  : "border-amber-400/40 bg-amber-400/10 text-amber-200"
              }
            >
              {depth === "completa" ? "Análise completa · 7 agentes" : "Análise rápida · 4 agentes"}
            </Badge>
          </div>

          <ul className="mb-6 space-y-1" aria-label="Agentes em execução">
            {agentStatuses.map((agent) => (
              <li
                key={agent.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  agent.status === "running"
                    ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-400/25"
                    : agent.status === "done" || agent.status === "failed"
                      ? "opacity-80"
                      : "opacity-60"
                }`}
              >
                <StatusIcon status={agent.status} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${
                      agent.status === "done"
                        ? "text-emerald-200"
                        : agent.status === "failed"
                          ? "text-red-300"
                          : agent.status === "running"
                            ? "text-indigo-100"
                            : "text-slate-400"
                    }`}
                  >
                    {agent.label || AGENT_LABELS[agent.id]}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {AGENT_MICROS[agent.id]}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">
                {running > 0
                  ? "O Oráculo está consultando as lentes..."
                  : progress >= 100
                    ? "Sintetizando as revelações..."
                    : "Despachando os agentes..."}
              </span>
              <span className="font-mono text-sm font-semibold text-indigo-300">
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              aria-label={`Progresso da análise: ${progress}%`}
              className="h-2 bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-indigo-400 [&>div]:to-amber-300"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToSearch}
              className="text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
            >
              <X className="size-4" aria-hidden="true" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
