import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import type { ArtworkRequest, ArtworkResponse } from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/artwork — gera a arte-síntese da conexão entre duas narrativas. */
export async function POST(req: NextRequest) {
  try {
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

    const motifPart = motif ? `, shared motif: ${motif}` : "";
    const prompt = `Epic mythological concept art symbolizing the narrative bond between ${aName} and ${bName}${motifPart}. Dark slate background, indigo and golden light, classical engraving fused with cyber aesthetic, symbolic composition, glowing threads connecting two worlds, high quality, detailed, no text`;

    const zai = await ZAI.create();
    const img = await zai.images.generations.create({
      prompt,
      size: "1152x864",
    });

    const base64 = img.data[0]?.base64;
    if (!base64) {
      return NextResponse.json(
        { error: "Geração de imagem não retornou dados." },
        { status: 500 }
      );
    }

    const response: ArtworkResponse = {
      dataUrl: `data:image/png;base64,${base64}`,
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar arte.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
