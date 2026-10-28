/**
 * Camada de acesso a LLM — provider-agnóstica.
 *
 * O projeto nasceu acoplado ao SDK `z-ai-web-dev-sdk` (que exige um arquivo
 * `.z-ai-config`). Esta camada mantém compatibilidade total com esse SDK e
 * acrescenta:
 *
 *  1. `openai` — qualquer endpoint compatível com a API de Chat Completions
 *     (OpenAI, Groq, Together, DeepSeek, OpenRouter, Ollama, vLLM...), via
 *     `ORACLE_LLM_BASE_URL` + `ORACLE_LLM_API_KEY` + `ORACLE_LLM_MODEL`.
 *  2. `local` — motor hermenêutico determinístico do Oráculo (ver
 *     `local-analysis.ts`). Não gera alucinação, funciona offline e permite
 *     demonstrar o produto sem custo de API.
 *
 * Resolução do provider (em ordem):
 *   1. `ORACLE_LLM_PROVIDER` explícito (zai | openai | local)
 *   2. existência de `.z-ai-config` (comportamento original)
 *   3. presença de `ORACLE_LLM_BASE_URL` + `ORACLE_LLM_API_KEY`
 *   4. fallback: `local`
 *
 * Server-only. Nunca importe este módulo no cliente.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export type LLMProviderId = "zai" | "openai" | "local";

export interface LLMProviderInfo {
  id: LLMProviderId;
  label: string;
  model: string;
  /** motivo legível da escolha (exibido na UI de transparência) */
  reason: string;
}

// ---------------------------------------------------------------------------
// Detecção de configuração do z-ai
// ---------------------------------------------------------------------------

/** Mesmos caminhos que o SDK original procura, em ordem de prioridade. */
function findZaiConfig(): string | null {
  const candidates = [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
    "/etc/.z-ai-config",
  ];
  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(/* turbopackIgnore: true */ candidate, "utf-8");
      const parsed = JSON.parse(raw) as { baseUrl?: string; apiKey?: string };
      if (parsed.baseUrl && parsed.apiKey) return candidate;
    } catch {
      // arquivo ausente/inválido: segue para o próximo
    }
  }
  return null;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

// ---------------------------------------------------------------------------
// Resolução do provider
// ---------------------------------------------------------------------------

let cachedInfo: LLMProviderInfo | null = null;

export function resolveLLMProvider(): LLMProviderInfo {
  if (cachedInfo) return cachedInfo;

  const explicit = env("ORACLE_LLM_PROVIDER")?.toLowerCase() as
    | LLMProviderId
    | undefined;

  if (explicit === "local") {
    cachedInfo = {
      id: "local",
      label: "Motor local",
      model: "oráculo-hermenêutico-v1",
      reason: "Forçado por ORACLE_LLM_PROVIDER=local.",
    };
    return cachedInfo;
  }

  if (explicit === "zai" || (!explicit && findZaiConfig())) {
    cachedInfo = {
      id: "zai",
      label: "z.ai",
      model: env("ORACLE_LLM_MODEL") ?? "zai-default",
      reason: explicit
        ? "Provider z.ai selecionado por variável de ambiente."
        : "Configuração .z-ai-config encontrada.",
    };
    return cachedInfo;
  }

  const baseUrl = env("ORACLE_LLM_BASE_URL");
  const apiKey = env("ORACLE_LLM_API_KEY");

  if (explicit === "openai" || (baseUrl && apiKey)) {
    cachedInfo = {
      id: "openai",
      label: "API compatível com OpenAI",
      model: env("ORACLE_LLM_MODEL") ?? "gpt-4o-mini",
      reason: baseUrl
        ? `Endpoint configurado: ${baseUrl}`
        : "Provider OpenAI selecionado por variável de ambiente.",
    };
    return cachedInfo;
  }

  cachedInfo = {
    id: "local",
    label: "Motor local",
    model: "oráculo-hermenêutico-v1",
    reason:
      "Nenhuma chave de LLM configurada — o Oráculo opera com o motor hermenêutico local sobre o catálogo curado.",
  };
  return cachedInfo;
}

/** true quando não há backend de LLM e o motor determinístico assume. */
export function isLocalMode(): boolean {
  return resolveLLMProvider().id === "local";
}

/** Erro específico para diferenciar "sem provider" de "falha de API". */
export class LLMUnavailableError extends Error {
  constructor(message = "Nenhum provedor de LLM disponível.") {
    super(message);
    this.name = "LLMUnavailableError";
  }
}

// ---------------------------------------------------------------------------
// Chamada JSON com retry
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extrai o primeiro objeto JSON de um texto (tolerante a fences e texto extra). */
export function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/```[a-zA-Z]*\s*/g, "")
    .replace(/```/g, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Nenhum objeto JSON encontrado na resposta do modelo.");
  }
  return JSON.parse(cleaned.slice(first, last + 1));
}

type ZAIInstance = {
  chat: {
    completions: {
      create: (args: {
        messages: { role: string; content: string }[];
        thinking?: { type: string };
      }) => Promise<{ choices: { message?: { content?: string } }[] }>;
    };
  };
};

let zaiPromise: Promise<ZAIInstance> | null = null;

async function getZAI(): Promise<ZAIInstance> {
  if (!zaiPromise) {
    zaiPromise = (async () => {
      const mod = (await import("z-ai-web-dev-sdk")) as unknown as {
        default: { create: () => Promise<ZAIInstance> };
      };
      return mod.default.create();
    })();
  }
  return zaiPromise;
}

async function callOpenAICompatible(system: string, user: string): Promise<string> {
  const baseUrl = (env("ORACLE_LLM_BASE_URL") ?? "https://api.openai.com/v1").replace(
    /\/+$/,
    ""
  );
  const apiKey = env("ORACLE_LLM_API_KEY");
  if (!apiKey) {
    throw new LLMUnavailableError(
      "ORACLE_LLM_API_KEY não configurada para o provider OpenAI-compatível."
    );
  }
  const model = env("ORACLE_LLM_MODEL") ?? "gpt-4o-mini";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `LLM respondeu HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

async function callProvider(system: string, user: string): Promise<string> {
  const provider = resolveLLMProvider();
  if (provider.id === "local") {
    throw new LLMUnavailableError();
  }
  if (provider.id === "openai") {
    return callOpenAICompatible(system, user);
  }
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: system },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Chama o LLM exigindo JSON puro e faz parse robusto.
 * Erros "normais" consomem o orçamento de `retries`; erros de rate-limit (429)
 * têm orçamento próprio com backoff crescente, pois os agentes rodando em
 * paralelo podem estourar o limite momentâneo da API.
 */
export async function callLLMJson<T>(
  system: string,
  user: string,
  retries = 2
): Promise<T> {
  if (isLocalMode()) {
    throw new LLMUnavailableError(
      "Modo local ativo: nenhuma chamada de LLM será feita."
    );
  }

  let lastError: unknown = null;
  let normalRetriesLeft = retries;
  let rateRetriesLeft = 3;

  const isRateLimited = (msg: string): boolean =>
    /429|too many requests|rate ?limit/i.test(msg);

  while (true) {
    try {
      const text = await callProvider(system, user);
      if (!text.trim()) throw new Error("Resposta vazia do modelo.");
      return extractJsonObject(text) as T;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (isRateLimited(msg) && rateRetriesLeft > 0) {
        rateRetriesLeft -= 1;
        await sleep([5000, 15000, 30000][2 - rateRetriesLeft]);
        continue;
      }
      if (!isRateLimited(msg) && normalRetriesLeft > 0) {
        normalRetriesLeft -= 1;
        await sleep(500);
        continue;
      }
      break;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Falha ao obter JSON válido do LLM: ${msg}`);
}
