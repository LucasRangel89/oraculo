"use client";

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

  return (
    <div className="oracle-bg flex min-h-screen flex-col text-slate-200">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8">
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
