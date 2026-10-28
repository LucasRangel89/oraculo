import { NextResponse } from "next/server";
import { getRepository } from "@/lib/persistence";
import type { AnalysisListItem } from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/analyses — últimas 10 análises (histórico). */
export async function GET() {
  try {
    const repo = await getRepository();
    const records = await repo.recent(10);

    const items: AnalysisListItem[] = records.map((r) => ({
      id: r.id,
      input: r.input,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ items, store: repo.kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao listar análises.";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
