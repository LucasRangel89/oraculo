/**
 * Persistência do Oráculo — adaptador plugável.
 *
 * O projeto original dependia exclusivamente de SQLite/Prisma. Isso é ótimo em
 * produção, mas cria dois problemas reais:
 *
 *  1. ambientes de demonstração (como este preview) não têm os binários do
 *     Prisma nem `DATABASE_URL`;
 *  2. qualquer falha do banco derrubava cache, histórico e feedback.
 *
 * Aqui a persistência vira uma interface com duas implementações:
 *
 *  - `PrismaRepository` — usada quando `DATABASE_URL` existe e o schema foi
 *    aplicado (`prisma db push`). Preserva o comportamento original.
 *  - `FileRepository` — JSON em disco (`.data/oraculo.json`), zero dependência
 *    nativa. Mantém cache de análises, histórico e feedback funcionando.
 *
 * Seleção: `ORACULO_STORE=prisma|file` (explícito) ou auto-detecção com
 * fallback silencioso. Server-only.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoredAnalysis {
  id: string;
  input: string;
  normalizedInput: string;
  payload: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredFeedback {
  analysisId: string;
  useful: boolean;
  comment: string | null;
  createdAt: Date;
}

export interface AnalysisRepository {
  readonly kind: "prisma" | "file";
  findByNormalizedInput(normalizedInput: string): Promise<StoredAnalysis | null>;
  findById(id: string): Promise<StoredAnalysis | null>;
  recent(limit: number): Promise<StoredAnalysis[]>;
  save(input: {
    input: string;
    normalizedInput: string;
    payload: string;
    confidence: number;
  }): Promise<StoredAnalysis>;
  updatePayload(id: string, payload: string): Promise<void>;
  saveFeedback(input: {
    analysisId: string;
    useful: boolean;
    comment: string | null;
  }): Promise<void>;
  feedbackFor(analysisId: string): Promise<StoredFeedback | null>;
}

function newId(): string {
  return `an_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Implementação em arquivo JSON
// ---------------------------------------------------------------------------

interface FileShape {
  analyses: Record<string, StoredAnalysis & { feedback?: StoredFeedback }>;
}

const DATA_DIR = process.env.ORACULO_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "oraculo.json");

/** Fila para serializar escritas (evita corrupção em concorrência). */
let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => undefined);
  return run;
}

async function readStore(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FileShape>;
    const analyses: FileShape["analyses"] = {};
    for (const [key, value] of Object.entries(parsed.analyses ?? {})) {
      analyses[key] = {
        ...value,
        createdAt: new Date(value.createdAt),
        updatedAt: new Date(value.updatedAt),
        feedback: value.feedback
          ? { ...value.feedback, createdAt: new Date(value.feedback.createdAt) }
          : undefined,
      };
    }
    return { analyses };
  } catch {
    return { analyses: {} };
  }
}

async function writeStore(store: FileShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf-8");
  await fs.rename(tmp, DATA_FILE);
}

class FileRepository implements AnalysisRepository {
  readonly kind = "file" as const;

  async findByNormalizedInput(normalizedInput: string): Promise<StoredAnalysis | null> {
    const store = await readStore();
    return (
      Object.values(store.analyses).find((a) => a.normalizedInput === normalizedInput) ?? null
    );
  }

  async findById(id: string): Promise<StoredAnalysis | null> {
    const store = await readStore();
    return store.analyses[id] ?? null;
  }

  async recent(limit: number): Promise<StoredAnalysis[]> {
    const store = await readStore();
    return Object.values(store.analyses)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async save(input: {
    input: string;
    normalizedInput: string;
    payload: string;
    confidence: number;
  }): Promise<StoredAnalysis> {
    return enqueue(async () => {
      const store = await readStore();
      const existing = Object.values(store.analyses).find(
        (a) => a.normalizedInput === input.normalizedInput
      );
      const now = new Date();
      const record: StoredAnalysis = existing
        ? {
            ...existing,
            input: input.input,
            payload: input.payload,
            confidence: input.confidence,
            updatedAt: now,
          }
        : {
            id: newId(),
            input: input.input,
            normalizedInput: input.normalizedInput,
            payload: input.payload,
            confidence: input.confidence,
            createdAt: now,
            updatedAt: now,
          };
      store.analyses[record.id] = { ...record, feedback: existing?.feedback };
      await writeStore(store);
      return record;
    });
  }

  async updatePayload(id: string, payload: string): Promise<void> {
    await enqueue(async () => {
      const store = await readStore();
      const record = store.analyses[id];
      if (!record) return;
      record.payload = payload;
      record.updatedAt = new Date();
      await writeStore(store);
    });
  }

  async saveFeedback(input: {
    analysisId: string;
    useful: boolean;
    comment: string | null;
  }): Promise<void> {
    await enqueue(async () => {
      const store = await readStore();
      const record = store.analyses[input.analysisId];
      if (!record) return;
      record.feedback = {
        analysisId: input.analysisId,
        useful: input.useful,
        comment: input.comment,
        createdAt: new Date(),
      };
      await writeStore(store);
    });
  }

  async feedbackFor(analysisId: string): Promise<StoredFeedback | null> {
    const store = await readStore();
    return store.analyses[analysisId]?.feedback ?? null;
  }
}

// ---------------------------------------------------------------------------
// Implementação Prisma (comportamento original)
// ---------------------------------------------------------------------------

type PrismaLike = {
  analysis: {
    findUnique: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    upsert: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    count: () => Promise<number>;
  };
  feedback: {
    upsert: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
  };
};

function toStored(row: {
  id: string;
  input: string;
  normalizedInput: string;
  payload: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}): StoredAnalysis {
  return { ...row };
}

class PrismaRepository implements AnalysisRepository {
  readonly kind = "prisma" as const;
  private db: PrismaLike;
  constructor(db: PrismaLike) {
    this.db = db;
  }

  async findByNormalizedInput(normalizedInput: string): Promise<StoredAnalysis | null> {
    const row = (await this.db.analysis.findUnique({
      where: { normalizedInput },
    })) as Parameters<typeof toStored>[0] | null;
    return row ? toStored(row) : null;
  }

  async findById(id: string): Promise<StoredAnalysis | null> {
    const row = (await this.db.analysis.findUnique({ where: { id } })) as
      | Parameters<typeof toStored>[0]
      | null;
    return row ? toStored(row) : null;
  }

  async recent(limit: number): Promise<StoredAnalysis[]> {
    const rows = (await this.db.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    })) as Parameters<typeof toStored>[0][];
    return rows.map(toStored);
  }

  async save(input: {
    input: string;
    normalizedInput: string;
    payload: string;
    confidence: number;
  }): Promise<StoredAnalysis> {
    const row = (await this.db.analysis.upsert({
      where: { normalizedInput: input.normalizedInput },
      update: {
        input: input.input,
        payload: input.payload,
        confidence: input.confidence,
      },
      create: input,
    })) as Parameters<typeof toStored>[0];
    return toStored(row);
  }

  async updatePayload(id: string, payload: string): Promise<void> {
    await this.db.analysis.update({ where: { id }, data: { payload } });
  }

  async saveFeedback(input: {
    analysisId: string;
    useful: boolean;
    comment: string | null;
  }): Promise<void> {
    await this.db.feedback.upsert({
      where: { analysisId: input.analysisId },
      update: { useful: input.useful, comment: input.comment },
      create: input,
    });
  }

  async feedbackFor(analysisId: string): Promise<StoredFeedback | null> {
    const row = (await this.db.feedback.findUnique({ where: { analysisId } })) as
      | { analysisId: string; useful: boolean; comment: string | null; createdAt: Date }
      | null;
    return row ? { ...row } : null;
  }
}

// ---------------------------------------------------------------------------
// Seleção do adaptador
// ---------------------------------------------------------------------------

let repositoryPromise: Promise<AnalysisRepository> | null = null;

async function detect(): Promise<AnalysisRepository> {
  const explicit = (process.env.ORACULO_STORE ?? "").toLowerCase();

  if (explicit === "file") return new FileRepository();
  if (explicit === "prisma") {
    return new PrismaRepository((await import("@/lib/db")).db as unknown as PrismaLike);
  }

  const hasDatabase = Boolean(process.env.DATABASE_URL);
  if (hasDatabase) {
    try {
      const db = (await import("@/lib/db")).db as unknown as PrismaLike;
      // probe: confirma que o schema foi aplicado e o engine existe
      await db.analysis.count();
      return new PrismaRepository(db);
    } catch (err) {
      console.warn(
        "[oráculo] Prisma indisponível — usando armazenamento em arquivo. Detalhe:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return new FileRepository();
}

export function getRepository(): Promise<AnalysisRepository> {
  if (!repositoryPromise) repositoryPromise = detect();
  return repositoryPromise;
}
