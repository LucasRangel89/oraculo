"use client";

import { useEffect, useRef } from "react";
import { ArchiveTab } from "@/components/oracle/ArchiveTab";
import { Dashboard } from "@/components/oracle/Dashboard";
import { ComparisonModal } from "@/components/oracle/ComparisonModal";
import { DocsTab } from "@/components/oracle/DocsTab";
import { ExploreTab } from "@/components/oracle/ExploreTab";
import { Footer } from "@/components/oracle/Footer";
import { Header } from "@/components/oracle/Header";
import { ProgressScreen } from "@/components/oracle/ProgressScreen";
import { SearchScreen } from "@/components/oracle/SearchScreen";
import { useOracleStore } from "@/lib/oracle-store";

export default function Page() {
  const tab = useOracleStore((s) => s.tab);
  const view = useOracleStore((s) => s.view);
  const mainRef = useRef<HTMLElement | null>(null);
  const isFirstRender = useRef(true);

  /**
   * Trocas de aba e de etapa (busca → progresso → resultado) são, na prática,
   * trocas de página numa SPA. Sem isso o usuário de teclado continua com o
   * foco no botão que sumiu e o usuário vidente continua com o scroll na
   * posição antiga. A primeira renderização é ignorada para não roubar o foco
   * de quem chegou por âncora/leitor de tela.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    mainRef.current?.focus({ preventScroll: true });
  }, [tab, view]);

  return (
    <div className="oracle-bg flex min-h-screen flex-col text-slate-200">
      {/* Primeiro elemento focável da página (WCAG 2.4.1) */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Pular para o conteúdo principal
      </a>
      <Header />
      <main
        id="conteudo"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none md:py-8"
      >
        {tab === "documentacao" ? (
          <DocsTab />
        ) : tab === "explorar" ? (
          <ExploreTab />
        ) : tab === "acervo" ? (
          <ArchiveTab />
        ) : view === "search" ? (
          <SearchScreen />
        ) : view === "analyzing" ? (
          <ProgressScreen />
        ) : (
          <Dashboard />
        )}
      </main>
      <ComparisonModal />
      <Footer />
    </div>
  );
}
