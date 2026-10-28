import { NextRequest, NextResponse } from "next/server";
import { isLocalMode, resolveLLMProvider } from "@/lib/llm";
import { buildArtworkDataUrl } from "@/lib/local-artwork";
import type { ArtworkRequest, ArtworkResponse } from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/artwork — gera a arte-síntese da conexão entre duas narrativas. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<ArtworkRequest> | null;

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

  const aName = body.aName.trim();
  const bName = body.bName.trim();
  const motif =
    typeof body.motif === "string" && body.motif.trim() ? body.motif.trim() : "";

  const fallback = (): NextResponse =>
    NextResponse.json({
      dataUrl: buildArtworkDataUrl({ aName, bName, motif: motif || undefined }),
    } satisfies ArtworkResponse);

  // Sem provedor de imagem: sigilo vetorial determinístico (local-artwork.ts)
  if (isLocalMode()) return fallback();

  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const motifPart = motif ? `, shared motif: ${motif}` : "";
    const prompt = `Epic mythological concept art symbolizing the narrative bond between ${aName} and ${bName}${motifPart}. Dark slate background, indigo and golden light, classical engraving fused with cyber aesthetic, symbolic composition, glowing threads connecting two worlds, high quality, detailed, no text`;

    const zai = await ZAI.create();
    const img = await zai.images.generations.create({
      prompt,
      size: "1152x864",
    });

    const base64 = img.data[0]?.base64;
    if (!base64) {
      console.warn("[oráculo] geração de imagem sem dados — usando sigilo local.");
      return fallback();
    }

    const response: ArtworkResponse = {
      dataUrl: `data:image/png;base64,${base64}`,
    };
    return NextResponse.json(response);
  } catch (err) {
    // Falha do provedor de imagem não deve matar a experiência.
    console.warn(
      `[oráculo] imagem via ${resolveLLMProvider().label} falhou — usando sigilo local.`,
      err instanceof Error ? err.message : err
    );
    return fallback();
  }
}
