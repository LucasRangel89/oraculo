import { NextRequest, NextResponse } from "next/server";
import { analysisResultFromRecord } from "@/lib/oracle-agents";
import { getRepository } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/analysis/[id] — recupera análise cacheada por id. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repo = await getRepository();
    const record = await repo.findById(id);

    if (!record) {
      return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });
    }

    return NextResponse.json(analysisResultFromRecord(record));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar análise.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
