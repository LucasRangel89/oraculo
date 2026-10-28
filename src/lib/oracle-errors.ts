/**
 * Erros de domínio do Oráculo.
 *
 * Vive em módulo próprio (puro, sem dependências de Node) para que o motor de
 * análise possa ser reaproveitado no navegador — no build estático do GitHub
 * Pages, a análise inteira roda no cliente.
 */
export class NarrativeNotFoundError extends Error {
  variants: string[];

  constructor(message: string, variants: string[]) {
    super(message);
    this.name = "NarrativeNotFoundError";
    this.variants = variants;
  }
}
