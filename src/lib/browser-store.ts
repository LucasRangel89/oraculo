/**
 * Persistência do build estático — `localStorage`.
 *
 * Substitui o `FileRepository`/`PrismaRepository` quando não há servidor:
 * guarda as análises, o feedback e o índice por input normalizado, com o mesmo
 * shape usado pelas rotas (`AnalysisRecord` serializável).
 *
 * Tudo falha em silêncio: navegador em modo privado, cota cheia ou
 * `localStorage` desabilitado degradam para "sem histórico" — nunca para erro.
 */
import { normalizeText } from "@/lib/similarity";
import type { AnalysisResult } from "@/lib/oracle-types";

const ANALYSES_KEY = "oraculo:analyses:v1";
const FEEDBACK_KEY = "oraculo:feedback:v1";

/** Quantas análises ficam disponíveis no histórico (as mais recentes). */
const MAX_ANALYSES = 25;
const MAX_FEEDBACK = 200;

export interface StoredAnalysis {
  id: string;
  input: string;
  normalizedInput: string;
  createdAt: string;
  payload: AnalysisResult;
}

interface StoredFeedback {
  analysisId: string;
  useful: boolean;
  comment?: string;
  createdAt: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `localStorage` só existe no navegador — e pode lançar em modo restrito. */
function storage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // cota cheia / modo privado: histórico é conveniência, não requisito
  }
}

/** Mais recentes primeiro. */
export function listStored(): StoredAnalysis[] {
  const items = read<StoredAnalysis[]>(ANALYSES_KEY, []);
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => typeof item?.id === "string" && item.payload)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function findStoredById(id: string): StoredAnalysis | null {
  return listStored().find((item) => item.id === id) ?? null;
}

/** Dedupe por input normalizado — mesmo comportamento do cache do backend. */
export function findStoredByInput(input: string): StoredAnalysis | null {
  const needle = normalizeText(input);
  return listStored().find((item) => item.normalizedInput === needle) ?? null;
}

/** Insere/substitui (por id ou por input normalizado) e poda o excedente. */
export function saveStored(result: AnalysisResult): StoredAnalysis {
  const record: StoredAnalysis = {
    id: result.id,
    input: result.input,
    normalizedInput: normalizeText(result.input),
    createdAt: result.createdAt,
    payload: result,
  };

  const others = listStored().filter(
    (item) => item.id !== record.id && item.normalizedInput !== record.normalizedInput
  );
  const next = [record, ...others].slice(0, MAX_ANALYSES);
  write(ANALYSES_KEY, next);
  return record;
}

export function saveFeedback(feedback: {
  analysisId: string;
  useful: boolean;
  comment?: string;
}): void {
  const all = read<StoredFeedback[]>(FEEDBACK_KEY, []);
  const entry: StoredFeedback = {
    ...feedback,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...(Array.isArray(all) ? all : [])].slice(0, MAX_FEEDBACK);
  write(FEEDBACK_KEY, next);
}

/** Limpa o histórico local (usado por testes e por "recomeçar"). */
export function clearStored(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(ANALYSES_KEY);
    store.removeItem(FEEDBACK_KEY);
  } catch {
    // ignora
  }
}
