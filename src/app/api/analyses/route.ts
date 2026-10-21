import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AnalysisListItem } from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/analyses — últimas 10 análises (histórico). */
export async function GET() {
  try {
    const records = await db.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, input: true, createdAt: true },
    });

    const items: AnalysisListItem[] = records.map((r) => ({
      id: r.id,
      input: r.input,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao listar análises.";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
