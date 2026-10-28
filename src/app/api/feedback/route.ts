import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/persistence";
import type { FeedbackRequest } from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/feedback — registra/atualiza feedback de uma análise. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Partial<FeedbackRequest> | null;

    if (!body || typeof body.analysisId !== "string" || !body.analysisId.trim()) {
      return NextResponse.json(
        { error: "Corpo inválido: informe analysisId e useful." },
        { status: 400 }
      );
    }
    if (typeof body.useful !== "boolean") {
      return NextResponse.json(
        { error: "Corpo inválido: o campo 'useful' deve ser boolean." },
        { status: 400 }
      );
    }

    const analysisId = body.analysisId.trim();
    const repo = await getRepository();
    const analysis = await repo.findById(analysisId);

    if (!analysis) {
      return NextResponse.json(
        { error: "Análise não encontrada para o analysisId informado." },
        { status: 404 }
      );
    }

    const comment =
      typeof body.comment === "string" && body.comment.trim().length > 0
        ? body.comment.trim()
        : null;

    await repo.saveFeedback({ analysisId, useful: body.useful, comment });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
