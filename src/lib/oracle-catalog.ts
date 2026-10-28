/**
 * Catálogo curado do Oráculo das Conexões Narrativas.
 *
 * O acervo é montado por módulos, um por família de tradições. Todos os
 * elementos compartilham o mesmo vocabulário controlado de motivos
 * (`src/lib/catalog/vocab.ts`), o que é o que faz o motor de similaridade
 * encontrar conexões reais em vez de coincidências de superfície.
 */
import type { CatalogEntry } from "@/lib/oracle-types";
import { CATALOG_CORE } from "@/lib/catalog/nucleo";
import { CATALOG_GREGO_ROMANA } from "@/lib/catalog/greco-romana";
import { CATALOG_NORDICA } from "@/lib/catalog/nordica";
import { CATALOG_ORIENTE_ANTIGO } from "@/lib/catalog/oriente-antigo";
import { CATALOG_ASIA } from "@/lib/catalog/asia";
import { CATALOG_AMERICAS_AFRICA } from "@/lib/catalog/americas-africa";
import { CATALOG_EUROPA } from "@/lib/catalog/europa";
import { CATALOG_CONTEMPORANEO } from "@/lib/catalog/contemporaneo";

export const CATALOG: CatalogEntry[] = [
  ...CATALOG_CORE,
  ...CATALOG_GREGO_ROMANA,
  ...CATALOG_NORDICA,
  ...CATALOG_ORIENTE_ANTIGO,
  ...CATALOG_ASIA,
  ...CATALOG_AMERICAS_AFRICA,
  ...CATALOG_EUROPA,
  ...CATALOG_CONTEMPORANEO,
];

/** Quantas narrativas existem no acervo curado. */
export const CATALOG_SIZE = CATALOG.length;
