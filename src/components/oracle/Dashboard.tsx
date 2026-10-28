"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Cpu,
  Download,
  FileText,
  FlaskConical,
  Info,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScoreRing } from "@/components/oracle/ScoreRing";
import { ParallelsList } from "@/components/oracle/ParallelsList";
import { NarrativeGraph } from "@/components/oracle/NarrativeGraph";
import { AgentPanels } from "@/components/oracle/AgentPanels";
import { Slider } from "@/components/ui/slider";
import { copyJson, downloadJson } from "@/lib/oracle-client";
import { analysisToMarkdown, downloadTextFile, slugify } from "@/lib/export-markdown";
import { useOracleStore } from "@/lib/oracle-store";
import {
  MEDIA_TYPE_COLORS,
  MEDIA_TYPE_LABELS,
  SIMILARITY_WEIGHTS,
  type AnalysisResult,
  type ScoreBreakdown,
} from "@/lib/oracle-types";
import { toast } from "@/hooks/use-toast";

// ----------------------------------------------------------------- FactsCard

function FactsCard({ result }: { result: AnalysisResult }) {
  const { facts, fingerprint } = result;
  const maxMotifs = 8;
  const shownMotifs = fingerprint.motifs.slice(0, maxMotifs);
  const extraMotifs = fingerprint.motifs.length - shownMotifs.length;

  return (
    <section
      className="flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 md:flex-row md:items-start md:justify-between md:p-6"
      aria-label="Fatos da narrativa"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-slate-700 bg-slate-950/50 text-xs text-slate-200"
          >
            <span
              className="mr-0.5 inline-block size-2 rounded-full"
              style={{ backgroundColor: MEDIA_TYPE_COLORS[facts.type] }}
              aria-hidden="true"
            />
            {MEDIA_TYPE_LABELS[facts.type]}
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-700 bg-slate-950/50 text-xs text-slate-300"
          >
            {facts.origin}
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-700 bg-slate-950/50 text-xs text-slate-400"
          >
            {facts.period}
          </Badge>
          {result.cached ? (
            <Badge
              variant="outline"
              className="border-amber-400/40 bg-amber-400/10 text-[10px] uppercase tracking-wider text-amber-300"
            >
              do cache
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={
              result.engine === "local"
                ? "border-emerald-400/40 bg-emerald-400/10 text-[10px] uppercase tracking-wider text-emerald-300"
                : "border-indigo-400/40 bg-indigo-500/10 text-[10px] uppercase tracking-wider text-indigo-300"
            }
            title={
              result.engine === "local"
                ? "Análise determinística sobre o catálogo curado — sem chamadas de LLM"
                : "Análise produzida por agentes de IA"
            }
          >
            {result.engine === "local" ? (
              <FlaskConical className="mr-1 size-3" aria-hidden="true" />
            ) : (
              <Cpu className="mr-1 size-3" aria-hidden="true" />
            )}
            {result.engine === "local"
              ? result.source === "reference"
                ? "motor local · dossiê curado"
                : "motor local · catálogo"
              : "agentes de IA"}
          </Badge>
        </div>

        <h2 className="oracle-title font-serif text-2xl font-bold leading-tight md:text-3xl">
          {facts.name}
        </h2>

        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-300">
          {facts.synopsis}
        </p>

        {shownMotifs.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {shownMotifs.map((motif) => (
              <Badge
                key={motif}
                variant="secondary"
                className="bg-slate-800/70 px-2 py-0.5 font-mono text-[10px] font-normal text-slate-300"
              >
                {motif.replace(/_/g, " ")}
              </Badge>
            ))}
            {extraMotifs > 0 ? (
              <Badge
                variant="secondary"
                className="bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-300"
              >
                +{extraMotifs}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {!facts.found && facts.variants.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span className="text-xs text-amber-200/90">
              Narrativa não reconhecida com precisão. Você quis dizer:
            </span>
            {facts.variants.map((variant) => (
              <Badge
                key={variant}
                variant="outline"
                className="cursor-pointer border-amber-400/40 bg-transparent text-amber-200 hover:bg-amber-400/10"
                onClick={() => {
                  useOracleStore.getState().setInput(variant);
                  void useOracleStore.getState().startAnalysis();
                }}
              >
                {variant}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 self-start md:pl-4">
        <ScoreRing value={result.confidence * 100} size={88} label="Confiança" />
      </div>
    </section>
  );
}

// --------------------------------------------------------------- SummaryCard

function SummaryCard({ result }: { result: AnalysisResult }) {
  return (
    <section
      className="rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-slate-900/60 to-slate-900/60 p-5 md:p-6"
      aria-label="Síntese do Oráculo"
    >
      <h3 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-slate-100">
        <Sparkles className="size-4 text-amber-300" aria-hidden="true" />
        Síntese do Oráculo
      </h3>
      <p className="max-w-4xl text-sm leading-relaxed text-slate-300">
        {result.summary}
      </p>
      <Alert className="mt-4 border-slate-800 bg-slate-950/40 py-2.5">
        <Info className="size-3.5 text-slate-500" aria-hidden="true" />
        <AlertDescription className="text-xs text-slate-500">
          {result.engine === "local"
            ? "Interpretação determinística sobre o catálogo curado — hipóteses heurísticas, não fatos. Configure um provedor de LLM para ativar as oito lentes generativas."
            : "Interpretação gerada por IA — hipóteses heurísticas, não fatos."}
        </AlertDescription>
      </Alert>
    </section>
  );
}

// -------------------------------------------------------------- WeightsDialog

const WEIGHT_FIELDS: {
  key: keyof ScoreBreakdown;
  label: string;
  hint: string;
}[] = [
  { key: "motifs", label: "Motivos", hint: "símbolos e imagens recorrentes" },
  { key: "archetypes", label: "Arquétipos", hint: "funções junguianas" },
  { key: "themes", label: "Temas", hint: "questões filosóficas e éticas" },
  { key: "structure", label: "Estrutura", hint: "beats e jornada do herói" },
];

/**
 * Ajuste de pesos do score — reivindicação explícita dos blueprints legados
 * ("permitir usuário ajustar prioridades"). Recalcula o grafo no cliente.
 */
function WeightsDialog() {
  const weights = useOracleStore((s) => s.weights);
  const setWeights = useOracleStore((s) => s.setWeights);
  const applyWeights = useOracleStore((s) => s.applyWeights);
  const resetWeights = useOracleStore((s) => s.resetWeights);
  const customized = useOracleStore((s) => s.weightsCustomized);
  const [open, setOpen] = useState(false);

  const total = WEIGHT_FIELDS.reduce((acc, f) => acc + weights[f.key], 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={
          customized
            ? "border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
            : "border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        }
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Ajustar pesos
      </Button>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-slate-100">
            <Scale className="size-4 text-amber-300" aria-hidden="true" />
            Pesos do score de similaridade
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Mude o que importa para você e veja o grafo se reorganizar. O score
            é sempre a média ponderada apenas das dimensões ativas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {WEIGHT_FIELDS.map((field) => {
            const value = Math.round(weights[field.key] * 100);
            return (
              <div key={field.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <label
                    htmlFor={`weight-${field.key}`}
                    className="text-sm text-slate-200"
                  >
                    {field.label}
                    <span className="ml-1.5 text-xs text-slate-500">{field.hint}</span>
                  </label>
                  <span className="font-mono text-xs text-indigo-300">{value}%</span>
                </div>
                <Slider
                  id={`weight-${field.key}`}
                  value={[value]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([next]) =>
                    setWeights({ ...weights, [field.key]: (next ?? 0) / 100 })
                  }
                  aria-label={`Peso de ${field.label}`}
                />
              </div>
            );
          })}
          <p className="text-xs text-slate-500">
            Soma atual: <span className="font-mono text-slate-300">{Math.round(total * 100)}%</span>{" "}
            — a normalização é automática, então não é preciso fechar em 100%.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetWeights()}
            className="mr-auto text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Padrão (35/25/25/15)
          </Button>
          <Button
            size="sm"
            onClick={() => {
              applyWeights();
              setOpen(false);
            }}
            className="bg-indigo-500 text-white hover:bg-indigo-400"
          >
            Recalcular grafo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------- ActionBar

function ActionBar({ result }: { result: AnalysisResult }) {
  const feedbackSent = useOracleStore((s) => s.feedbackSent);
  const submitFeedbackAction = useOracleStore((s) => s.submitFeedbackAction);
  const resetToSearch = useOracleStore((s) => s.resetToSearch);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comment, setComment] = useState("");

  const handleCopy = async () => {
    try {
      await copyJson(result);
      toast({ title: "JSON copiado!", description: "Análise completa na área de transferência." });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Seu navegador bloqueou o acesso à área de transferência.",
        variant: "destructive",
      });
    }
  };

  const submitNegative = async () => {
    setDialogOpen(false);
    await submitFeedbackAction(false, comment);
    setComment("");
  };

  return (
    <section
      className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
      aria-label="Ações da análise"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadJson(result)}
        className="border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
      >
        <Download className="size-4" aria-hidden="true" />
        Exportar JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleCopy()}
        className="border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
      >
        <Copy className="size-4" aria-hidden="true" />
        Copiar JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          downloadTextFile(
            `${slugify(result.facts.name)}-oraculo.md`,
            analysisToMarkdown(result)
          )
        }
        className="border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
      >
        <FileText className="size-4" aria-hidden="true" />
        Dossiê .md
      </Button>
      <WeightsDialog />

      <div className="mx-1 hidden h-6 w-px bg-slate-800 sm:block" aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Esta análise foi útil?</span>
        <Button
          variant="outline"
          size="icon"
          disabled={feedbackSent}
          onClick={() => void submitFeedbackAction(true)}
          aria-label="Sim, foi útil"
          title="Sim, foi útil"
          className="size-8 border-slate-700 bg-slate-950/40 text-slate-400 hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300"
        >
          {feedbackSent ? <Check className="size-4" /> : <ThumbsUp className="size-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={feedbackSent}
          onClick={() => setDialogOpen(true)}
          aria-label="Não foi útil (comentário opcional)"
          title="Não foi útil (comentário opcional)"
          className="size-8 border-slate-700 bg-slate-950/40 text-slate-400 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
        >
          <ThumbsDown className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={resetToSearch}
        className="ml-auto border-amber-400/30 bg-amber-400/5 text-amber-200 hover:bg-amber-400/15 hover:text-amber-100"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Nova Análise
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-slate-100">
              O que poderia ser melhor?
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Seu comentário é anônimo e ajuda a calibrar as lentes do Oráculo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex.: paralelos pouco relevantes, símbolos genéricos..."
            rows={4}
            className="border-slate-700 bg-slate-950/60 text-slate-200 placeholder:text-slate-600"
            aria-label="Comentário sobre a análise"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => void submitNegative()}
              className="bg-indigo-500 text-white hover:bg-indigo-400"
            >
              Enviar feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ----------------------------------------------------------------- Dashboard

export function Dashboard() {
  const result = useOracleStore((s) => s.result);
  const openComparison = useOracleStore((s) => s.openComparison);

  if (!result) return null;

  const handleSelectConnection = (bName: string, bOrigin: string) => {
    void openComparison({
      aName: result.facts.name,
      aOrigin: result.facts.origin,
      bName,
      bOrigin,
      aMotifs: result.fingerprint.motifs,
    });
  };

  return (
    <div className="space-y-4">
      <FactsCard result={result} />
      <SummaryCard result={result} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <ParallelsList result={result} onSelect={(c) => handleSelectConnection(c.name, c.origin)} />
        <NarrativeGraph result={result} onSelect={handleSelectConnection} />
      </div>
      <AgentPanels result={result} />
      <ActionBar result={result} />
    </div>
  );
}
