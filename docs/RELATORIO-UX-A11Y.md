# Relatório de UX, UI e Acessibilidade — Oráculo

**Data:** 28/10/2026 · **Escopo:** aplicação Next.js (`/home/user/oraculo`) já publicada em
<https://lucasrangel89.github.io/oraculo/> · **Alvo declarado:** WCAG 2.2 nível AA
para as telas principais, sem trocar a identidade visual nem remover funcionalidades.

---

## A. Resumo executivo

A avaliação partiu de quatro eixos — usabilidade, acessibilidade, engenharia e
ergonomia cognitiva — e de uma regra de trabalho: **só entra o que é proporcional e
verificável**. Nada de redesenho: os tokens, a tipografia e a linguagem visual
"cyber-classical dark" foram preservados; o que mudou foi contraste, foco, teclado,
semântica e feedback de estado.

**O que estava quebrado.** A varredura inicial encontrou **12 bloqueantes e 3 avisos**:
textos em `slate-600` com **2,4–2,6:1** de contraste (o mínimo AA é 4,5:1), cartões
"clicáveis" que eram `<span>` (invisíveis para teclado e leitor de tela), `<div>`
dentro de `<button>` (HTML inválido), ausência de *skip link*, foco perdido após
trocar de aba, erro de rede exibido apenas em toast transitório, grafo inacessível
sem mouse, "Nova Análise" invisível no mobile e uma ordem de cabeçalho que empurrava
as ações para fora da tela em larguras intermediárias.

**O que passou a existir.** Todas as telas agora têm caminho por teclado, foco
visível e anunciado, contraste mínimo de **7,7:1** em texto e **0 violações** nas
regras do axe-core no HTML servido. O ganho não é só visual: o produto ficou
utilizável em telas pequenas, com leitor de tela e sem mouse — e a checagem virou
**portão de CI**, então a regressão é barrada antes do deploy.

**Limite honesto.** Não há navegador no ambiente de desenvolvimento. Tudo o que
depende de layout real (contraste amostrado em pixel, foco em estados hidratados,
leitor de tela de verdade, zoom 200 %) está listado em **D** como não verificado e
em **E** como pendência — não foi substituído por suposição.

| Indicador | Antes | Depois |
| --- | --- | --- |
| Achados do auditor estático | 12 bloqueantes + 3 avisos | **0 + 0** |
| Arquivos cobertos pelo auditor | 15 | **63** |
| Regras do auditor | 7 | **12** |
| Tokens de texto abaixo de 4,5:1 | 40 ocorrências | **0** |
| Violações axe no HTML publicado | não medido | **0** |
| Contraste mínimo de texto comum | 2,4:1 | **7,7:1** |
| Elementos acionáveis por teclado (grafo, filtros, variantes) | parcial | **todos** |

---

## B. Problemas encontrados

Classificação por impacto real de uso (não por ordem de arquivo).
**B** = bloqueante (impede uma tarefa), **A** = alto, **M** = médio, **L** = baixo.

### B.1 Acessibilidade

| # | Sev. | Problema | Onde | Evidência |
| --- | --- | --- | --- | --- |
| 1 | **B** | Texto em `slate-500/600` reprovava o contraste AA | 15 componentes | 2,4:1–4,1:1 sobre `#070b14` |
| 2 | **B** | Cartões de paralelo: `<button>` continha `<div>`/`<p>` | `ParallelsList.tsx` | conteúdo de `button` é só *phrasing* |
| 3 | **B** | Motivos e variantes "você quis dizer" eram `Badge`/`span` com `onClick` | `ExploreTab`, `Dashboard` | sem foco, sem Enter/Espaço |
| 4 | **B** | Sem *skip link* e sem foco gerenciado ao trocar de aba/etapa | `page.tsx` | foco ficava no botão que sumia |
| 5 | **B** | Grafo force-directed só respondia ao mouse | `NarrativeGraph.tsx` | nós não focáveis, sem tecla |
| 6 | **A** | Erro de análise aparecia só em toast (some em ~5 s) | `SearchScreen` | sem mensagem persistente |
| 7 | **A** | Progresso da análise não era anunciado | `ProgressScreen` | sem `aria-live`/`status` |
| 8 | **A** | Fechar do toast sem nome acessível; região em inglês ("Notifications (F8)") | `ui/toast.tsx`, `ui/toaster.tsx` | botão só com ícone |
| 9 | **M** | Placeholders em `slate-500` (4,1:1) | busca, dashboard, explorar | placeholder é texto |
| 10 | **M** | `h4` sem `h3` no modal de comparação | `ComparisonModal` | hierarquia de títulos |
| 11 | **M** | Resultado sem `h1` próprio; página sem título de contexto | `Dashboard` | navegação por títulos |
| 12 | **M** | Modal com `90vh` estourava com teclado virtual no mobile | `ComparisonModal` | unidades de viewport |

### B.2 Usabilidade, layout e ergonomia

| # | Sev. | Problema | Onde |
| --- | --- | --- | --- |
| 13 | **A** | "Nova Análise" desaparecia no mobile; ações e navegação disputavam `ml-auto` e se sobrepunham em ~768 px | `Header.tsx` |
| 14 | **A** | Usuário podia recalcular o grafo com soma de pesos ≤ 0 e ficar com tela vazia sem explicação | `Dashboard` → `WeightsDialog` |
| 15 | **M** | Ao trocar de aba o scroll ficava na posição antiga (página longa → aba nova abria no rodapé) | `page.tsx` |
| 16 | **M** | Rodapé com ano fixo ("© 2025") — erro silencioso que envelhece sozinho | `Footer.tsx` |
| 17 | **M** | Dica do grafo não mencionava teclado; impossível "perder" o grafo com pan/zoom sem saída | `NarrativeGraph` |
| 18 | **L** | Etapas ausentes e ícones de estado em `slate-600` (quase invisíveis) | `ArchiveTab`, `AgentPanels` |
| 19 | **L** | Separadores do rodapé sem `aria-hidden` (leitor lia "·") | `Footer` |

---

## C. Melhorias

### C.1 Implementadas (com efeito observável)

**Navegação por teclado e foco**
- *Skip link* "Pular para o conteúdo principal" como primeiro elemento focável e
  `<main id="conteudo" tabIndex={-1}>` recebendo foco a cada troca de aba/etapa, com
  rolagem ao topo — a primeira renderização é ignorada para não roubar o foco de
  quem chega por leitor de tela. (`src/app/page.tsx`)
- Grafo: cada nó é `<g role="button|img" tabIndex={0} aria-label="…">`, Enter/Espaço
  abrem a comparação, o tooltip aparece no **foco** (não só no hover), o `<svg>`
  declara `role="group"` com instrução de uso e o foco é desenhado por CSS
  (`.oracle-node:focus-visible circle/text`). Botão **Recentralizar** recupera o
  enquadramento perdido. (`NarrativeGraph.tsx`, `globals.css`)
- Profundidade da análise virou radiogroup de verdade: **padrão APG** — só a opção
  marcada entra na ordem de tabulação, setas percorrem e já selecionam, Home/End vão
  aos extremos. (`SearchScreen.tsx`)
- Motivos da busca e variantes "você quis dizer" viraram `<button type="button">`
  com anel de foco, em vez de badges decorativos. (`ExploreTab`, `Dashboard`)
- Cards de paralelo: container `<div>` + `<button>` com apenas *phrasing content*;
  origem, motivo e convergências continuam visíveis e são entregues a leitores de
  tela por `aria-describedby` + `sr-only`. (`ParallelsList.tsx`)

**Contraste e legibilidade**
- Piso de contraste documentado e aplicado: **texto comum nunca abaixo de `slate-400`
  (7,7:1)**; `slate-500` (4,1:1) ficou restrito a ícones decorativos e bordas;
  placeholders promovidos a `slate-400`. Foram 40 substituições em 15 componentes.
- Etapas ausentes, ícones de estado e textos auxiliares saíram de `slate-600`
  (2,6:1) para `slate-400`.

**Feedback e estado**
- Erro de rede: além do toast, um banner persistente `role="alert"` acima do
  formulário, com botão "Dispensar mensagem de erro" (`clearError` no store).
- Progresso: `role="status"` `aria-live="polite"` resumindo *n lentes · % · concluído*
  (um resumo, não a lista inteira falando a cada tick) e `aria-busy` na lista.
- Pesos: aviso `role="alert"` e botão "Recalcular grafo" **desabilitado** quando a
  soma é ≤ 0, com "Soma atual" visível.
- Rodapé com ano dinâmico e separadores `aria-hidden`.

**Layout e mobile**
- Cabeçalho reorganizado: navegação em linha própria abaixo de 768 px, grupo de ações
  com `ml-auto` sem competir com a navegação, e **Nova Análise sempre visível**
  (ícone + rótulo a partir de `md`).
- Modal de comparação com `max-h-[90dvh]` (não estoura com a barra do navegador no
  celular) e títulos na hierarquia correta.
- Rodapé/toast: fechar sempre visível, com contraste e nome acessível; região de
  notificações em português.

**Movimento**
- `@media (prefers-reduced-motion: reduce)` desliga animações infinitas
  (`.oracle-pulse`, `.oracle-gold`) e reduz transições.

**Engenharia preventiva**
- `scripts/a11y-audit.mjs` reescrito: análise via API do compilador TypeScript, agora
  com **12 regras** (contraste por token, teclado, `role` sem foco/handler, `tabIndex`
  positivo, nome acessível, rótulo de campo, `aria-hidden` focável, HTML inválido,
  `type` em formulário, `rel="noopener"`, `alt`) e **63 arquivos** no escopo.
- `npm run audit:a11y` adicionado ao `package.json` e como **etapa obrigatória do
  workflow de deploy** — um build com regressão de acessibilidade não publica.

### C.2 Recomendadas (não implementadas nesta rodada)

| Recomendação | Por que não entrou | Ganho estimado |
| --- | --- | --- |
| Teste E2E com Playwright + axe nos estados hidratados | exige baixar binário de navegador, indisponível no sandbox | alto: cobre modal, grafo e abas |
| Estado em URL (`#acervo`, `?analise=…`) | mexe no roteamento e na persistência; risco desproporcional agora | alto: links compartilháveis e botão Voltar |
| Leitor de tela real (NVDA/VoiceOver) | não há como operar no ambiente | alto: valida a experiência, não só a marcação |
| Medir contraste em pixel com amostragem do tema | depende de renderização real | médio: pega `opacity` e gradientes |
| Zoom 200 % / reflow a 320 px (1.4.10) | depende de viewport real | médio |
| `tablist`/`tabpanel` na navegação principal + setas | `aria-current` já resolve; migrar muda o modelo mental | baixo |
| Reduzir os 29 motivos órfãos do vocabulário | é conteúdo, não UX; já documentado | baixo |

---

## D. Testes executados

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit` | **0 erros** |
| Lint | `npx eslint src --max-warnings=0` | **limpo** |
| Auditor estático de a11y | `npm run audit:a11y` | **0 bloqueantes · 0 avisos · 63 arquivos** |
| axe-core no HTML exportado | `axe-core` + `jsdom` sobre `out/index.html` | **0 violações** (tags wcag2a…wcag22aa + best-practice) |
| Landmarks e skip link no HTML servido | inspeção do HTML de `out/` e de `localhost:3000` | `<header>`, `<nav aria-label>`, `<main id="conteudo">`, `<footer>`, skip link e `lang="pt-BR"` presentes |
| Build de produção | `npm run build` | ok (rotas `/` e `/api/*`) |
| Export estático | `PAGES_BASE_PATH=/oraculo npm run build:pages` | ok |
| Integridade do artefato | `PAGES_BASE_PATH=/oraculo npm run verify:pages` | **40/40 checagens** |
| API e motor | `npm run smoke` | **29/29 checagens**, 10 grupos |
| Acervo | `npm run audit:catalog` | 140 narrativas / 69 tradições, sem id duplicado |

**O que NÃO pôde ser verificado** (declarado, não estimado): ausência de navegador
no ambiente impede (a) rodar axe nos estados interativos — modal aberto, grafo com
nós, abas Explorar/Acervo/Documentação; (b) teste manual com leitor de tela;
(c) conferência visual de sobreposição em 320/768/1440 px; (d) zoom e reflow;
(e) navegação real por teclado com `Tab`/`Shift+Tab`. O que foi possível foi
verificação estática de marcação e tokens, cálculo de contraste a partir dos valores
do tema e teste de contrato das rotas.

---

## E. Pendências

1. **Confirmar o deploy** do commit na `main` (workflow *Deploy no GitHub Pages*) e
   reabrir a página publicada.
2. **Passar o checklist com navegador real** — 10 minutos, na ordem: `Tab` a partir do
   topo (skip link primeiro), abas, busca, grafo, modal, mobile a 360 px.
3. **Conteúdo do acervo:** 29 motivos usados por uma só narrativa e 13 motivos do
   vocabulário ainda sem uso (`npm run audit:catalog` lista todos). É curadoria, não UX.
4. **`npm run smoke`** exige servidor em `localhost:3000`: continua sendo passo manual.

---

## F. Próximos passos

1. **Curto prazo (esta semana):** validar com navegador real usando o checklist de
   `E.2`; qualquer desvio entra como issue com print.
2. **Médio prazo:** Playwright + `@axe-core/playwright` em CI cobrindo os três fluxos
   (busca → resultado, comparação, explorar/acervo) com uma *baseline* de violações 0.
3. **Médio prazo:** deep links (`#acervo`, `?analise=…`) e integração com o botão
   Voltar — hoje só o estado em memória/persistência guarda o contexto.
4. **Longo prazo:** auditoria com leitor de tela (NVDA e VoiceOver) e teste com
   usuários; publicar os resultados aqui em vez de presumi-los.
