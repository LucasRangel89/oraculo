/**
 * Exportação do dossiê em Markdown.
 *
 * O blueprint pedia "export PDF"; Markdown é o formato-fonte (leve, versionável,
 * renderizável em PDF por qualquer ferramenta). Aqui a análise completa — com
 * as oito lentes, fingerprint e paralelos — vira um documento legível.
 */
import {
  AGENT_PERSONAS,
  MEDIA_TYPE_LABELS,
  SIMILARITY_WEIGHTS,
  type AnalysisResult,
} from "@/lib/oracle-types";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function analysisToMarkdown(result: AnalysisResult): string {
  const { facts, fingerprint } = result;
  const lines: string[] = [];

  lines.push(`# ${facts.name} — Dossiê do Oráculo`);
  lines.push("");
  lines.push(
    `> ${MEDIA_TYPE_LABELS[facts.type]} · ${facts.origin} · ${facts.period}`
  );
  lines.push("");
  lines.push(facts.synopsis);
  lines.push("");
  lines.push(
    `**Confiança global:** ${pct(result.confidence)} · **Motor:** ${
      result.engine === "local" ? "motor local (determinístico)" : "LLM"
    } · **Fonte:** ${result.source} · **Gerado em:** ${new Date(
      result.createdAt
    ).toLocaleString("pt-BR")}`
  );
  lines.push("");
  lines.push("## Síntese do Oráculo");
  lines.push("");
  lines.push(result.summary);
  lines.push("");

  if (result.structure) {
    const s = result.structure;
    lines.push(`## Estrutura narrativa — ${AGENT_PERSONAS.structure}`);
    lines.push("");
    lines.push(s.summary);
    lines.push("");
    lines.push(`- **Atos:** ${s.acts}`);
    lines.push(`- **Tom:** ${s.tone}`);
    lines.push(`- **Incidente incitante:** ${s.incitingIncident}`);
    lines.push(`- **Clímax:** ${s.climax}`);
    lines.push(`- **Resolução:** ${s.resolution}`);
    lines.push(`- **Beats:** ${s.beats.join(", ")}`);
    lines.push("");
    lines.push("### Jornada do herói (Campbell)");
    lines.push("");
    lines.push("| Estágio | Presente | Evidência |");
    lines.push("|---|---|---|");
    for (const stage of s.heroJourney) {
      lines.push(
        `| ${stage.stage} | ${stage.present ? "✓" : "—"} | ${stage.evidence.replace(/\|/g, "/")} |`
      );
    }
    lines.push("");
  }

  if (result.archetypes) {
    const a = result.archetypes;
    lines.push(`## Arquétipos — ${AGENT_PERSONAS.archetypes}`);
    lines.push("");
    lines.push(a.summary);
    lines.push("");
    lines.push("| Personagem | Arquétipo | Papel |");
    lines.push("|---|---|---|");
    for (const entry of a.archetypes) {
      lines.push(
        `| ${entry.character} | ${entry.archetype} | ${entry.description.replace(/\|/g, "/")} |`
      );
    }
    lines.push("");
    lines.push(`**Individuação:** ${a.individuation}`);
    lines.push("");
  }

  if (result.symbols) {
    const s = result.symbols;
    lines.push(`## Símbolos — ${AGENT_PERSONAS.symbols}`);
    lines.push("");
    lines.push(s.summary);
    lines.push("");
    for (const symbol of s.symbols) {
      lines.push(
        `- **${symbol.symbol}** (${symbol.presence}) — ${symbol.meaning}${
          symbol.universalMeaning ? ` *Universal:* ${symbol.universalMeaning}.` : ""
        }${
          symbol.historicalParallels.length > 0
            ? ` *Também em:* ${symbol.historicalParallels.join(", ")}.`
            : ""
        }`
      );
    }
    lines.push("");
  }

  if (result.themes) {
    const t = result.themes;
    lines.push(`## Temas — ${AGENT_PERSONAS.themes}`);
    lines.push("");
    lines.push(t.summary);
    lines.push("");
    lines.push(`**Temas:** ${t.themes.join(" · ")}`);
    lines.push("");
    if (t.existentialQuestions.length > 0) {
      lines.push("**Questões existenciais:**");
      for (const q of t.existentialQuestions) lines.push(`- ${q}`);
      lines.push("");
    }
    if (t.ethicalDilemmas.length > 0) {
      lines.push("**Dilemas éticos:**");
      for (const d of t.ethicalDilemmas) lines.push(`- ${d}`);
      lines.push("");
    }
  }

  if (result.psychoanalysis) {
    const p = result.psychoanalysis;
    lines.push(`## Psicanálise — ${AGENT_PERSONAS.psychoanalysis}`);
    lines.push("");
    if (p.speculative) lines.push(`> ⚠️ ${p.disclaimer}`);
    lines.push("");
    lines.push(p.summary);
    lines.push("");
    lines.push(`**Complexos:** ${p.complexes.join(", ")}`);
    lines.push("");
    lines.push(`**Desejos inconscientes:** ${p.unconsciousDesires.join(", ")}`);
    lines.push("");
    lines.push(`### Leitura freudiana`);
    lines.push(p.freudianReading);
    lines.push("");
    lines.push(`### Leitura junguiana`);
    lines.push(p.jungianReading);
    lines.push("");
  }

  if (result.cultural) {
    const c = result.cultural;
    lines.push(`## Cultural-histórico — ${AGENT_PERSONAS.cultural}`);
    lines.push("");
    lines.push(c.summary);
    lines.push("");
    lines.push(`**Contexto histórico:** ${c.historicalContext}`);
    lines.push("");
    lines.push(`**Influências:** ${c.culturalInfluences.join(" · ")}`);
    lines.push("");
    lines.push(`**Valores e tensões:** ${c.valuesAndTensions.join(" · ")}`);
    lines.push("");
    lines.push(`**Recepção:** ${c.reception}`);
    lines.push("");
  }

  if (result.parallels.length > 0) {
    lines.push(`## Paralelos — ${AGENT_PERSONAS.parallels}`);
    lines.push("");
    lines.push(
      `Pesos do fingerprint: motivos ${pct(SIMILARITY_WEIGHTS.motifs)}, arquétipos ${pct(
        SIMILARITY_WEIGHTS.archetypes
      )}, temas ${pct(SIMILARITY_WEIGHTS.themes)}, estrutura ${pct(
        SIMILARITY_WEIGHTS.structure
      )}.`
    );
    lines.push("");
    for (const c of result.parallels) {
      lines.push(`### ${c.name} — ${c.score}/100 (${c.origin})`);
      lines.push("");
      lines.push(c.reason);
      lines.push("");
      lines.push(
        `*Breakdown:* motivos ${c.breakdown.motifs} · arquétipos ${c.breakdown.archetypes} · temas ${c.breakdown.themes} · estrutura ${c.breakdown.structure}`
      );
      lines.push("");
      lines.push("**Convergências**");
      for (const item of c.convergences) lines.push(`- ${item}`);
      lines.push("");
      lines.push("**Diferenças**");
      for (const item of c.differences) lines.push(`- ${item}`);
      lines.push("");
    }
  }

  lines.push("## Fingerprint narrativo");
  lines.push("");
  lines.push(`- **Motivos:** ${fingerprint.motifs.join(", ") || "—"}`);
  lines.push(`- **Arquétipos:** ${fingerprint.archetypes.join(", ") || "—"}`);
  lines.push(`- **Temas:** ${fingerprint.themes.join(", ") || "—"}`);
  lines.push(`- **Beats:** ${fingerprint.beats.join(", ") || "—"}`);
  lines.push("");
  lines.push("---");
  lines.push(
    "_Documento gerado pelo Oráculo das Conexões Narrativas. Interpretações heurísticas — não substituem pesquisa nas fontes originais._"
  );

  return lines.join("\n");
}

/** Dispara o download de um arquivo de texto no navegador. */
export function downloadTextFile(filename: string, content: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Nome de arquivo seguro a partir do título da narrativa. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
