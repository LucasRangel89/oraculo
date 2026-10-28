import { NextResponse } from "next/server";
import { resolveLLMProvider } from "@/lib/llm";
import { catalogStats } from "@/lib/legacy-archive";
import { getRepository } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/status — transparência operacional.
 * Informa qual motor está ativo, qual armazenamento responde e o tamanho do
 * acervo. Consumido pela UI (selo de modo) e por verificações de saúde.
 */
export async function GET() {
  const provider = resolveLLMProvider();
  const repo = await getRepository();
  return NextResponse.json({
    ok: true,
    engine: provider.id,
    provider: provider.label,
    model: provider.model,
    reason: provider.reason,
    store: repo.kind,
    catalog: catalogStats(),
    timestamp: new Date().toISOString(),
  });
}
