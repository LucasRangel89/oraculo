"use client";

import { Github, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOracleStore, type OracleTab } from "@/lib/oracle-store";

/** Logo: olho/grafo com 3 nós conectados (indigo + dourado). */
function OracleLogo() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="13.5" stroke="#818cf8" strokeWidth="1.4" opacity="0.45" />
      <path d="M8 21 L16 9.5 L24 21" stroke="#818cf8" strokeWidth="1.4" opacity="0.9" />
      <path d="M8 21 L24 21" stroke="#fbbf24" strokeWidth="1.1" opacity="0.85" />
      <path d="M16 9.5 L16 16" stroke="#818cf8" strokeWidth="0.9" opacity="0.5" />
      <circle cx="16" cy="9.5" r="2.7" fill="#fbbf24" />
      <circle cx="8" cy="21" r="2.1" fill="#818cf8" />
      <circle cx="24" cy="21" r="2.1" fill="#818cf8" />
      <circle cx="16" cy="16" r="1.15" fill="#e2e8f0" />
    </svg>
  );
}

const TABS: { id: OracleTab; label: string }[] = [
  { id: "analise", label: "Análise" },
  { id: "explorar", label: "Explorar" },
  { id: "acervo", label: "Acervo" },
  { id: "documentacao", label: "Documentação" },
];

export function Header() {
  const tab = useOracleStore((s) => s.tab);
  const setTab = useOracleStore((s) => s.setTab);
  const view = useOracleStore((s) => s.view);
  const resetToSearch = useOracleStore((s) => s.resetToSearch);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:flex-nowrap md:gap-5 md:py-3">
        <button
          type="button"
          onClick={() => setTab("analise")}
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
          aria-label="Ir para a análise"
        >
          <OracleLogo />
          <span className="min-w-0">
            <span className="oracle-title block font-serif text-lg font-bold leading-tight md:text-xl">
              Oráculo
            </span>
            <span className="hidden text-[11px] leading-tight text-slate-400 sm:block">
              das Conexões Narrativas
            </span>
          </span>
        </button>

        <nav
          className="order-3 -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-900/60 p-1 oracle-scroll md:order-none md:mx-0 md:ml-auto md:w-auto md:overflow-visible"
          aria-label="Navegação principal"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 sm:px-3.5 sm:text-sm ${
                  active
                    ? "bg-indigo-500/15 text-indigo-200 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.35)]"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Ações à direita: agrupadas para não disputarem o `ml-auto` */}
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          {view === "result" ? (
            <Button
              size="sm"
              onClick={resetToSearch}
              aria-label="Nova análise"
              title="Nova análise"
              className="shrink-0 border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 hover:text-amber-100"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">Nova Análise</span>
            </Button>
          ) : null}

          <a
            href="https://github.com/LucasRangel89/oraculo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repositório do Oráculo no GitHub (abre em nova aba)"
            title="Repositório no GitHub"
            className="rounded-md p-2 text-slate-400 transition-colors outline-none hover:bg-slate-800/60 hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-400/60"
          >
            <Github className="size-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}
