import { NextRequest, NextResponse } from "next/server";
import { CATALOG } from "@/lib/oracle-catalog";
import { normalizeText } from "@/lib/similarity";
import type { CatalogEntry, CatalogResponse, MediaType } from "@/lib/oracle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/catalog?q=&type= — catálogo curado com busca opcional. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = (searchParams.get("type") ?? "").trim();

  const normalizedQ = normalizeText(q);

  let entries: CatalogEntry[] = CATALOG;

  if (type) {
    entries = entries.filter((e) => e.type === (type as MediaType));
  }

  if (normalizedQ) {
    entries = entries.filter((e) => {
      const haystack = normalizeText(
        [
          e.name,
          e.origin,
          e.synopsis,
          e.motifs.join(" "),
          e.archetypes.join(" "),
          e.themes.join(" "),
          e.characters.join(" "),
        ].join(" ")
      );
      return haystack.includes(normalizedQ);
    });
  }

  const response: CatalogResponse = { entries, total: entries.length };
  return NextResponse.json(response);
}
