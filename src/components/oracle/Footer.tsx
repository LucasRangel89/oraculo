"use client";

import { Info } from "lucide-react";

const TECH_TAGS = [
  "Next.js 16",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
  "IA multiagente",
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/60 bg-slate-950/80 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:justify-between md:gap-6">
        <p className="flex max-w-2xl items-start gap-2 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 size-3.5 shrink-0 text-amber-400/70" aria-hidden="true" />
          <span>
            Análises geradas por IA são interpretações heurísticas — não
            substituem estudo acadêmico. Verifique as fontes.
          </span>
        </p>
        <div className="flex flex-col gap-1.5 md:items-end">
          <p className="text-xs text-slate-500">
            {TECH_TAGS.map((tag, i) => (
              <span key={tag}>
                <span className="text-slate-400">{tag}</span>
                {i < TECH_TAGS.length - 1 ? (
                  <span className="mx-1.5 text-slate-700">·</span>
                ) : null}
              </span>
            ))}
          </p>
          <p className="text-[11px] text-slate-400">
            © 2025 Oráculo das Conexões Narrativas
          </p>
        </div>
      </div>
    </footer>
  );
}
