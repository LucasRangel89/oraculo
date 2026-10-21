import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  FACTS_AGENT_CONFIDENCE,
  NarrativeNotFoundError,
  analysisResultFromRecord,
  buildDeterministicParallels,
  buildExecutiveSummary,
  runArchetypesAgent,
  runFactsAgent,
  runParallelsAgent,
  runPsychoanalysisAgent,
  runStructureAgent,
  runSymbolsAgent,
  runThemesAgent,
} from "@/lib/oracle-agents";
import { buildFingerprint, normalizeText, retrieveCandidates } from "@/lib/similarity";
import {
  AGENT_LABELS,
  DEPTH_AGENTS,
  type AgentId,
  type AgentRunStatus,
  type AnalysisDepth,
  type AnalysisResult,
  type AnalyzeStreamEvent,
  type ArchetypeAnalysis,
  type Connection,
  type NarrativeFacts,
  type PsychoanalysisData,
  type StructureAnalysis,
  type SymbolAnalysis,
  type ThematicAnalysis,
} from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AgentOutputs {
  structure: StructureAnalysis | null;
  archetypes: ArchetypeAnalysis | null;
  symbols: SymbolAnalysis | null;
  themes: ThematicAnalysis | null;
  psychoanalysis: PsychoanalysisData | null;
}

function confidenceOf(output: unknown): number | undefined {
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const c = (output as { confidence?: unknown }).confidence;
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  return undefined;
}

/** POST /api/analyze — análise completa via SSE. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { input?: unknown; depth?: unknown }
    | null;

  const input = typeof body?.input === "string" ? body.input.trim() : "";
  const depth: AnalysisDepth = body?.depth === "completa" ? "completa" : "rapida";

  if (input.length < 2) {
    return NextResponse.json(
      { error: "Informe uma narrativa com pelo menos 2 caracteres." },
      { status: 400 }
    );
  }

  const normalizedInput = normalizeText(input);
  const agentIds = DEPTH_AGENTS[depth];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (ev: AnalyzeStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          // cliente desconectou — ignora
        }
      };

      const finish = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // já fechado
          }
        }
      };

      try {
        // ------------------------------------------------------------------
        // 1. Cache
        // ------------------------------------------------------------------
        const cachedRecord = await db.analysis.findUnique({ where: { normalizedInput } });

        if (cachedRecord) {
          const result = analysisResultFromRecord(cachedRecord);
          send({
            type: "start",
            agents: agentIds.map((id) => ({
              id,
              label: AGENT_LABELS[id],
              status: "done" as AgentRunStatus,
            })),
          });
          send({
            type: "complete",
            result: { ...result, input, cached: true },
          });
          finish();
          return;
        }

        // ------------------------------------------------------------------
        // 2. Start
        // ------------------------------------------------------------------
        send({
          type: "start",
          agents: agentIds.map((id) => ({
            id,
            label: AGENT_LABELS[id],
            status: "pending" as AgentRunStatus,
          })),
        });

        // ------------------------------------------------------------------
        // 3. Facts (sequencial primeiro)
        // ------------------------------------------------------------------
        send({ type: "agent_start", id: "facts" });

        let facts: NarrativeFacts;
        const confidences: number[] = [];

        try {
          facts = await runFactsAgent(input);
          confidences.push(FACTS_AGENT_CONFIDENCE);
          send({ type: "agent_done", id: "facts", confidence: FACTS_AGENT_CONFIDENCE });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Falha ao identificar a narrativa.";
          send({ type: "agent_failed", id: "facts", error: message });
          send({
            type: "error",
            message:
              err instanceof NarrativeNotFoundError
                ? message
                : "Não foi possível identificar a narrativa agora (falha temporária do serviço de IA). Tente novamente em instantes.",
          });
          finish();
          return;
        }

        // ------------------------------------------------------------------
        // 4. Agentes intermediários em paralelo
        // ------------------------------------------------------------------
        const outputs: AgentOutputs = {
          structure: null,
          archetypes: null,
          symbols: null,
          themes: null,
          psychoanalysis: null,
        };

        const runMiddleAgent = async (id: AgentId, staggerMs = 0): Promise<void> => {
          send({ type: "agent_start", id });
          // stagger leve para reduzir rajadas de rate-limit na API do LLM
          if (staggerMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, staggerMs));
          }
          try {
            let result: unknown = null;
            if (id === "structure") {
              outputs.structure = await runStructureAgent(input, facts);
              result = outputs.structure;
            } else if (id === "archetypes") {
              outputs.archetypes = await runArchetypesAgent(input, facts);
              result = outputs.archetypes;
            } else if (id === "symbols") {
              outputs.symbols = await runSymbolsAgent(input, facts);
              result = outputs.symbols;
            } else if (id === "themes") {
              outputs.themes = await runThemesAgent(input, facts);
              result = outputs.themes;
            } else if (id === "psychoanalysis") {
              outputs.psychoanalysis = await runPsychoanalysisAgent(input, facts);
              result = outputs.psychoanalysis;
            } else {
              return;
            }
            const conf = confidenceOf(result);
            if (typeof conf === "number") confidences.push(conf);
            send({ type: "agent_done", id, confidence: conf });
          } catch (err) {
            send({
              type: "agent_failed",
              id,
              error: err instanceof Error ? err.message : "Erro desconhecido",
            });
          }
        };

        const middleIds = agentIds.filter((id) => id !== "facts" && id !== "parallels");
        const middlePromises = middleIds.map((id, index) =>
          runMiddleAgent(id, index * 350)
        );
        await Promise.allSettled(middlePromises);

        // ------------------------------------------------------------------
        // 5. Fingerprint + candidatos + paralelos
        // ------------------------------------------------------------------
        const fingerprint = buildFingerprint({
          structure: outputs.structure,
          archetypes: outputs.archetypes,
          symbols: outputs.symbols,
          themes: outputs.themes,
        });
        // candidatos do catálogo, excluindo a própria narrativa analisada (self-match,
        // inclusive quando o nome reconhecido é mais longo que o do catálogo)
        const allCandidates = retrieveCandidates(fingerprint, 10);
        const factsNameNorm = normalizeText(facts.name);
        const isSelf = (candidateName: string): boolean => {
          const n = normalizeText(candidateName);
          return (
            n.length > 0 &&
            (n === factsNameNorm || factsNameNorm.includes(n) || n.includes(factsNameNorm))
          );
        };
        const candidates = allCandidates
          .filter((c) => !isSelf(c.entry.name))
          .slice(0, 8);

        send({ type: "agent_start", id: "parallels" });
        let parallels: Connection[] = [];
        try {
          parallels = await runParallelsAgent(input, facts, fingerprint, candidates);
          send({ type: "agent_done", id: "parallels" });
        } catch (err) {
          parallels = buildDeterministicParallels(fingerprint, candidates);
          send({
            type: "agent_failed",
            id: "parallels",
            error:
              err instanceof Error
                ? err.message
                : "Agente comparativo falhou; usando paralelos determinísticos.",
          });
        }

        // ------------------------------------------------------------------
        // 6. Resumo executivo + confiança global
        // ------------------------------------------------------------------
        const summary = await buildExecutiveSummary(input, facts, parallels);
        const globalConfidence =
          confidences.length > 0
            ? confidences.reduce((acc, c) => acc + c, 0) / confidences.length
            : 0.75;

        const coreResult = {
          input,
          facts,
          structure: outputs.structure,
          archetypes: outputs.archetypes,
          symbols: outputs.symbols,
          themes: outputs.themes,
          psychoanalysis: outputs.psychoanalysis,
          parallels,
          fingerprint,
          confidence: globalConfidence,
          summary,
        };

        // ------------------------------------------------------------------
        // 7. Persistência + complete
        // ------------------------------------------------------------------
        const record = await db.analysis.upsert({
          where: { normalizedInput },
          update: { input, confidence: globalConfidence },
          create: {
            input,
            normalizedInput,
            payload: JSON.stringify(coreResult),
            confidence: globalConfidence,
          },
        });

        const result: AnalysisResult = {
          id: record.id,
          input,
          facts,
          structure: outputs.structure,
          archetypes: outputs.archetypes,
          symbols: outputs.symbols,
          themes: outputs.themes,
          psychoanalysis: outputs.psychoanalysis,
          parallels,
          fingerprint,
          confidence: globalConfidence,
          summary,
          cached: false,
          createdAt: record.createdAt.toISOString(),
        };

        // guarda o payload completo (com id/cached/createdAt) para leitura futura
        await db.analysis.update({
          where: { id: record.id },
          data: { payload: JSON.stringify(result) },
        });

        send({ type: "complete", result });
        finish();
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Erro inesperado na análise.",
        });
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
