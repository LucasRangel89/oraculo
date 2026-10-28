import { NextRequest, NextResponse } from "next/server";
import { buildLocalComparison } from "@/lib/local-analysis";
import { isLocalMode } from "@/lib/llm";
import { callLLMJson } from "@/lib/oracle-agents";
import { listSimilarity, normalizeText } from "@/lib/similarity";
import type { CompareRequest, ComparisonResult } from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPARE_SYSTEM = `Você é especialista em mitologia comparada e estudos narrativos (Frazer, Raglan, Propp, Campbell, Lévi-Strauss). Compare profundamente as duas narrativas informadas.
Responda APENAS com um objeto JSON válido, sem nenhum texto fora do JSON, no formato exato:
{"a": {"name": string, "origin": string, "essence": string}, "b": {"name": string, "origin": string, "essence": string}, "score": number, "convergences": [{"title": string, "points": string[]}], "differences": string[], "sharedSymbols": string[], "categories": string[], "narrative": string, "disclaimer": string}
Regras:
- "a" e "b": nome, origem cultural e essência (1 frase resumindo o coração da narrativa).
- "score": número 0-100 medindo a força do paralelismo estrutural/simbólico.
- "convergences": de 3 a 4 grupos; cada grupo tem "title" (ex.: "Estrutura do Herói", "Motivos Simbólicos", "Arquétipos", "Temas Universais") e "points" (2 a 4 pontos específicos, citando elementos concretos das duas narrativas).
- "differences": 3 a 5 diferenças significativas.
- "sharedSymbols": símbolos e motivos compartilhados (ex.: "travessia da água", "trickster").
- "categories": subconjunto de ["estrutural","arquetípica","simbólica","temática"].
- "narrative": 1 parágrafo de 80 a 120 palavras explicando o paralelismo profundo entre as duas narrativas.
- "disclaimer": aviso de que a comparação é interpretativa e aproximada.
- Nunca escreva nada fora do JSON.`;

/** Fallback determinístico quando o LLM falha. */
function buildFallbackComparison(req: CompareRequest): ComparisonResult {
  const aMotifs = (req.aMotifs ?? []).map(normalizeText).filter(Boolean);
  const bMotifs = (req.bMotifs ?? []).map(normalizeText).filter(Boolean);

  const shared = aMotifs.filter((m) => {
    const set = new Set(bMotifs);
    if (set.has(m)) return true;
    // crédito parcial: motivo contido em motivo do outro lado ("fogo" ⊂ "fogo do conhecimento")
    return [...set].some((bm) => bm.includes(m) || m.includes(bm));
  });
  const hasMotifs = aMotifs.length > 0 && bMotifs.length > 0;
  const rawScore = hasMotifs
    ? Math.round(listSimilarity(aMotifs, bMotifs) * 100)
    : 40;
  const score = hasMotifs ? Math.max(5, Math.min(99, rawScore)) : 40;

  const sharedLabel = shared.length > 0 ? shared.join(", ") : "poucos motivos diretos";

  const convergences = [
    {
      title: "Motivos compartilhados",
      points:
        shared.length > 0
          ? shared.slice(0, 4).map((m) => `Ambas mobilizam o motivo "${m}".`)
          : ["Ambas mobilizam provações transformadoras do protagonista."],
    },
    {
      title: "Estrutura narrativa",
      points: [
        `Tanto ${req.aName} quanto ${req.bName} seguem arcos de partida, prova e retorno.`,
        "A provação central força uma transformação irreversível do herói.",
      ],
    },
    {
      title: "Arquétipos",
      points: [
        "Os protagonistas ocupam posições arquetípicas equivalentes (herói/sombra/mentor).",
        "As figuras de oposição encarnam o princípio do caos ou da sombra.",
      ],
    },
  ];

  const differences = [
    `Origens culturais distintas: ${req.aOrigin} versus ${req.bOrigin}.`,
    "Contextos históricos e funções sociais diferentes para cada narrativa.",
    "Meios expressivos e épocas de registro distintos moldam o tom de cada obra.",
  ];

  const narrative = `${req.aName} (${req.aOrigin}) e ${req.bName} (${req.bOrigin}) apresentam ecos estruturais e simbólicos notáveis. ${
    shared.length > 0
      ? `Os motivos compartilhados — ${sharedLabel} — indicam que ambas respondem às mesmas perguntas humanas.`
      : "Mesmo sem motivos idênticos de superfície, ambas respondem às mesmas perguntas humanas."
  } O padrão de partida, prova e transformação aparece nos dois casos, o que sugere um arquétipo comum operando sob roupagens culturais distintas. A comparação evidencia como narrativas separadas por tempo e espaço convergem para soluções simbólicas semelhantes.`;

  return {
    a: { name: req.aName, origin: req.aOrigin, essence: `Narrativa de ${req.aOrigin}.` },
    b: { name: req.bName, origin: req.bOrigin, essence: `Narrativa de ${req.bOrigin}.` },
    score,
    convergences,
    differences,
    sharedSymbols: shared.slice(0, 6),
    categories: shared.length > 0 ? ["simbólica", "temática"] : ["estrutural", "temática"],
    narrative,
    disclaimer:
      "Comparação interpretativa de caráter aproximado; serviu-se do fallback determinístico do Oráculo.",
  };
}

/** POST /api/compare — comparação profunda entre duas narrativas. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Partial<CompareRequest> | null;

    if (
      !body ||
      typeof body.aName !== "string" ||
      !body.aName.trim() ||
      typeof body.bName !== "string" ||
      !body.bName.trim()
    ) {
      return NextResponse.json(
        { error: "Corpo inválido: informe aName e bName." },
        { status: 400 }
      );
    }

    const request: CompareRequest = {
      aName: body.aName.trim(),
      aOrigin: typeof body.aOrigin === "string" ? body.aOrigin.trim() : "",
      bName: body.bName.trim(),
      bOrigin: typeof body.bOrigin === "string" ? body.bOrigin.trim() : "",
      aMotifs: Array.isArray(body.aMotifs) ? body.aMotifs.filter((m): m is string => typeof m === "string") : [],
      bMotifs: Array.isArray(body.bMotifs) ? body.bMotifs.filter((m): m is string => typeof m === "string") : [],
    };

    // Sem LLM: o motor local compara fingerprints do catálogo curado.
    if (isLocalMode()) {
      return NextResponse.json(
        buildLocalComparison(
          request.aName,
          request.aOrigin,
          request.bName,
          request.bOrigin
        )
      );
    }

    try {
      const user = [
        `Narrativa A: "${request.aName}" (origem: ${request.aOrigin || "não informada"}).`,
        `Motivos conhecidos de A: ${request.aMotifs?.join(", ") || "—"}`,
        ``,
        `Narrativa B: "${request.bName}" (origem: ${request.bOrigin || "não informada"}).`,
        `Motivos conhecidos de B: ${request.bMotifs?.join(", ") || "—"}`,
        ``,
        `Produza a comparação profunda (somente JSON).`,
      ].join("\n");

      const raw = await callLLMJson<Record<string, unknown>>(COMPARE_SYSTEM, user, 1);

      const a = (raw.a ?? {}) as Record<string, unknown>;
      const b = (raw.b ?? {}) as Record<string, unknown>;
      const scoreRaw = typeof raw.score === "number" ? raw.score : Number(raw.score);
      const score = Number.isFinite(scoreRaw)
        ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
        : 50;

      const groups = (Array.isArray(raw.convergences) ? raw.convergences : [])
        .map((g) => {
          const obj = (g ?? {}) as Record<string, unknown>;
          const title = typeof obj.title === "string" ? obj.title : "";
          const points = Array.isArray(obj.points)
            ? obj.points.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
            : [];
          return { title, points };
        })
        .filter((g) => g.title.length > 0 && g.points.length > 0)
        .slice(0, 4);

      const result: ComparisonResult = {
        a: {
          name: typeof a.name === "string" && a.name.trim() ? a.name.trim() : request.aName,
          origin: typeof a.origin === "string" ? a.origin : request.aOrigin,
          essence: typeof a.essence === "string" ? a.essence : "",
        },
        b: {
          name: typeof b.name === "string" && b.name.trim() ? b.name.trim() : request.bName,
          origin: typeof b.origin === "string" ? b.origin : request.bOrigin,
          essence: typeof b.essence === "string" ? b.essence : "",
        },
        score,
        convergences: groups,
        differences: Array.isArray(raw.differences)
          ? raw.differences.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
          : [],
        sharedSymbols: Array.isArray(raw.sharedSymbols)
          ? raw.sharedSymbols.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          : [],
        categories: Array.isArray(raw.categories)
          ? raw.categories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
          : [],
        narrative: typeof raw.narrative === "string" && raw.narrative.trim() ? raw.narrative.trim() : "",
        disclaimer:
          typeof raw.disclaimer === "string" && raw.disclaimer.trim()
            ? raw.disclaimer.trim()
            : "Comparação interpretativa de caráter aproximado.",
      };

      if (result.convergences.length === 0 || !result.narrative) {
        return NextResponse.json(buildFallbackComparison(request));
      }

      return NextResponse.json(result);
    } catch {
      return NextResponse.json(buildFallbackComparison(request));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na comparação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
