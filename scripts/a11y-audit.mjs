#!/usr/bin/env node
/**
 * Auditor de acessibilidade estática do Oráculo.
 *
 * Não substitui teste com navegador + leitor de tela: cobre apenas uma classe de
 * erros que é detectável por análise de JSX e de tokens de cor. Ainda assim,
 * roda em segundos e impede regressões objetivas:
 *
 *  1. `onClick` em elemento não interativo (fora do teclado).
 *  2. `<img>` sem `alt`.
 *  3. Botão só de ícone sem nome acessível (`aria-label`/`title`/`sr-only`).
 *  4. `<div>` dentro de `<button>` (conteúdo permitido de button é phrasing).
 *  5. Contraste: uso de tokens reprovados em texto (`slate-600`, `slate-700`).
 *  6. `<button>` sem `type` dentro de `<form>` (vira submit por acidente).
 *  7. Links `target="_blank"` sem `rel="noopener"`.
 *  8. `role` interativo sem `tabIndex`/`onKeyDown` (widget inalcançável).
 *  9. `tabIndex` positivo (quebra a ordem natural de foco — 2.4.3).
 * 10. Campo de formulário sem rótulo acessível (3.3.2 / 4.1.2).
 * 11. Link sem `href` (não entra na ordem de foco).
 * 12. `aria-hidden="true"` em elemento focável (armadilha para leitor de tela).
 *
 * Uso: `npm run audit:a11y`  (falha com exit 1 quando há achados)
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src/components/oracle", "src/components/ui", "src/app"];
const INTERACTIVE = new Set([
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "details",
  "option",
  "Button",
  "Link",
]);
/**
 * Tokens de texto reprovados no fundo escuro do produto.
 * Medido sobre #070b14: slate-600 = 2,6:1 · slate-700 ≈ 1,7:1 · slate-500 = 4,14:1.
 * Todos ficam abaixo de 4,5:1 (WCAG 1.4.3), então o piso aceito é slate-400 (7,7:1).
 */
const LOW_CONTRAST_TOKENS = ["text-slate-500", "text-slate-600", "text-slate-700"];
/** Papéis que prometem comportamento de widget: precisam de foco e teclado. */
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "tab",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "checkbox",
  "radio",
  "switch",
  "option",
]);
/** Elementos que já entram na ordem de foco sem `tabIndex` explícito. */
const NATIVELY_FOCUSABLE = new Set(["button", "input", "select", "textarea", "summary"]);
/** Campos que exigem rótulo acessível. */
const FORM_FIELDS = new Set(["input", "textarea", "select"]);

const files = [];
function walk(dir) {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (entry.name.endsWith(".tsx")) files.push(rel);
  }
}
for (const dir of SCAN_DIRS) walk(dir);

const findings = [];
/** severity: "error" reprova o script; "warn" só informa. */
const add = (file, line, rule, message, severity = "error") =>
  findings.push({ file, line, rule, message, severity });

const jsxTagName = (node) => {
  const tag = node.tagName;
  if (ts.isIdentifier(tag)) return tag.text;
  if (ts.isPropertyAccessExpression(tag)) return tag.name.text;
  return "";
};

const attrName = (attr) =>
  ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) ? attr.name.text : "";

const hasAttr = (node, name) =>
  node.attributes.properties.some((a) => attrName(a) === name);

/**
 * Componentes primitivos (ui/) repassam `{...props}`: rótulo e conteúdo chegam
 * do ponto de uso, então as regras de nome/rótulo não se aplicam ao wrapper.
 */
const spreadsProps = (node) =>
  node.attributes.properties.some((a) => ts.isJsxSpreadAttribute(a));

const getAttrText = (node, name) => {
  const attr = node.attributes.properties.find((a) => attrName(a) === name);
  if (!attr || !ts.isJsxAttribute(attr)) return "";
  const init = attr.initializer;
  if (!init) return "";
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    if (ts.isStringLiteral(init.expression)) return init.expression.text;
    return init.expression.getText();
  }
  return "";
};

/** Texto literal (ou expressão) contido em um nó JSX, para detectar botão-ícone. */
const nodeText = (node) => (node.getText?.() ?? "").replace(/\s+/g, " ");

for (const rel of files) {
  const source = readFileSync(path.join(root, rel), "utf8");
  const sf = ts.createSourceFile(
    rel,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const lineOf = (node) =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node, insideForm = false) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = jsxTagName(opening);
      const isForm = tag === "form";
      const nowInsideForm = insideForm || isForm;

      // 1. handler de clique em elemento não interativo. Um `tabIndex` presente
      // indica intenção de teclado — o padrão correto ainda precisa dos handlers
      // de tecla, que nenhuma regra estática consegue validar.
      const clickAttr = opening.attributes.properties.find(
        (a) => attrName(a) === "onClick"
      );
      const focusable = hasAttr(opening, "tabIndex") || hasAttr(opening, "role");
      if (clickAttr && tag && !INTERACTIVE.has(tag) && !focusable) {
        add(
          rel,
          lineOf(clickAttr),
          "teclado",
          `onClick em <${tag}> — não é focável nem acionável por teclado`
        );
      }

      // 8. widget declarado por `role` mas inalcançável por teclado.
      const role = getAttrText(opening, "role");
      if (INTERACTIVE_ROLES.has(role) && getAttrText(opening, "aria-disabled") !== "true") {
        if (!hasAttr(opening, "tabIndex") && !NATIVELY_FOCUSABLE.has(tag)) {
          add(rel, lineOf(opening), "teclado", `role="${role}" sem tabIndex — não recebe foco`);
        } else if (!hasAttr(opening, "onKeyDown") && !hasAttr(opening, "onKeyUp")) {
          add(
            rel,
            lineOf(opening),
            "teclado",
            `role="${role}" focável sem handler de tecla — Enter/Espaço não ativam`,
            "warn"
          );
        }
      }

      // 9. tabIndex positivo desalinha a ordem de foco.
      if (hasAttr(opening, "tabIndex")) {
        const value = Number.parseInt(getAttrText(opening, "tabIndex"), 10);
        if (Number.isFinite(value) && value > 0) {
          add(rel, lineOf(opening), "ordem-foco", `tabIndex={${value}} positivo — use 0 e ordene no DOM`);
        }
      }

      // 2. img sem alt
      if (tag === "img" && !hasAttr(opening, "alt")) {
        add(rel, lineOf(opening), "texto-alt", "<img> sem alt");
      }

      // 3/6. botão
      if (tag === "button" || tag === "Button") {
        const inner = ts.isJsxElement(node) ? node.children.map(nodeText).join(" ") : "";
        const accessible =
          hasAttr(opening, "aria-label") ||
          hasAttr(opening, "aria-labelledby") ||
          hasAttr(opening, "title") ||
          inner.replace(/<[^>]+>/g, " ").trim().length > 0;
        const childrenFromProps = ts.isJsxSelfClosingElement(node) && spreadsProps(opening);
        if (!accessible && !childrenFromProps) {
          add(rel, lineOf(opening), "nome-acessivel", `<${tag}> sem nome acessível`);
        }
        if (tag === "button" && insideForm && !hasAttr(opening, "type")) {
          add(rel, lineOf(opening), "formulario", "<button> dentro de <form> sem type (submit acidental)");
        }
      }

      // 4. div dentro de button
      if (ts.isJsxElement(node) && (tag === "button" || tag === "Button")) {
        const hasBlock = node.children.some(
          (child) => ts.isJsxElement(child) && /^(div|section|p|ul|li)$/.test(jsxTagName(child.openingElement))
        );
        if (hasBlock) {
          add(rel, lineOf(opening), "html-invalido", `<${tag}> contém bloco (<div>/<p>) — conteúdo permitido é phrasing`);
        }
      }

      // 7. target=_blank sem noopener
      if (tag === "a" && getAttrText(opening, "target") === "_blank") {
        const relAttr = getAttrText(opening, "rel");
        if (!relAttr.includes("noopener")) {
          add(rel, lineOf(opening), "seguranca", `target="_blank" sem rel="noopener"`);
        }
      }

      // 10. campo sem rótulo acessível.
      if (FORM_FIELDS.has(tag)) {
        const id = getAttrText(opening, "id").replace(/^\{|\}$/g, "");
        const labelled =
          hasAttr(opening, "aria-label") || hasAttr(opening, "aria-labelledby") || hasAttr(opening, "title");
        if (!labelled && !spreadsProps(opening)) {
          const linked = id && new RegExp(`htmlFor=["'{]\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(source);
          if (!linked) {
            add(
              rel,
              lineOf(opening),
              "rotulo-campo",
              `<${tag}> sem aria-label/label associado${id ? ` (id="${id}")` : " e sem id"}`,
              id ? "warn" : "error"
            );
          }
        }
      }

      // 11. link sem href não é focável.
      if (tag === "a" && !hasAttr(opening, "href") && hasAttr(opening, "onClick")) {
        add(rel, lineOf(opening), "teclado", "<a> com onClick e sem href — use <button>");
      }

      // 12. aria-hidden em elemento focável esconde conteúdo do leitor de tela.
      if (
        getAttrText(opening, "aria-hidden") === "true" &&
        (INTERACTIVE.has(tag) || hasAttr(opening, "tabIndex") || hasAttr(opening, "onClick"))
      ) {
        add(rel, lineOf(opening), "aria-oculto", `aria-hidden="true" em <${tag}> focável — contraste com 4.1.2`);
      }

      const visitChild = (child) => visit(child, nowInsideForm);
      if (ts.isJsxElement(node)) node.children.forEach(visitChild);
      opening.attributes.properties.forEach(visitChild);
      return;
    }
    ts.forEachChild(node, (child) => visit(child, insideForm));
  };
  visit(sf);

  // 5. contraste por token.
  //    - texto normal: reprova (< 4,5:1 em #070b14)
  //    - placeholder: reprova também (é texto, não decoração)
  //    - ícone `aria-hidden`: só avisa (decoração é isenta pela 1.4.3)
  source.split("\n").forEach((line, i) => {
    for (const token of LOW_CONTRAST_TOKENS) {
      if (!line.includes(token)) continue;
      const isPlaceholder = /placeholder:/.test(line);
      const decorative = /aria-hidden="true"/.test(line);
      const rule = isPlaceholder
        ? "contraste-placeholder"
        : decorative
          ? "contraste-icone"
          : "contraste";
      add(
        rel,
        i + 1,
        rule,
        `token ${token} — até 4,1:1 sobre o fundo (#070b14); texto comum exige 4,5:1 (WCAG 1.4.3). Use slate-400 ou mais claro.`,
        decorative && !isPlaceholder ? "warn" : "error"
      );
    }
  });
}

const RULE_LABEL = {
  teclado: "Teclado (2.1.1)",
  "texto-alt": "Texto alternativo (1.1.1)",
  "nome-acessivel": "Nome acessível (4.1.2)",
  "html-invalido": "HTML válido (1.3.1)",
  formulario: "Formulário (3.2.2)",
  seguranca: "Segurança (rel=noopener)",
  contraste: "Contraste (1.4.3)",
  "contraste-placeholder": "Contraste de placeholder (1.4.3)",
  "contraste-icone": "Ícone decorativo com contraste baixo (aviso)",
  "ordem-foco": "Ordem de foco (2.4.3)",
  "rotulo-campo": "Rótulo de campo (3.3.2)",
  "aria-oculto": "aria-hidden focável (4.1.2)",
};

const byRule = new Map();
for (const f of findings) {
  if (!byRule.has(f.rule)) byRule.set(f.rule, []);
  byRule.get(f.rule).push(f);
}

const errors = findings.filter((f) => f.severity === "error");
const warnings = findings.filter((f) => f.severity === "warn");

console.log(`\n\x1b[1mAuditoria estática de acessibilidade\x1b[0m — ${files.length} arquivos\n`);
if (findings.length === 0) {
  console.log("\x1b[32mNenhum achado nas regras cobertas.\x1b[0m\n");
  process.exit(0);
}

for (const [rule, list] of byRule) {
  const isWarn = list.every((f) => f.severity === "warn");
  const color = isWarn ? "\x1b[33m" : "\x1b[31m";
  console.log(`\x1b[1m${RULE_LABEL[rule] ?? rule}\x1b[0m — ${list.length}`);
  for (const f of list) {
    console.log(`  ${color}${isWarn ? "!" : "✗"}\x1b[0m ${f.file}:${f.line}  ${f.message}`);
  }
  console.log("");
}

if (errors.length > 0) {
  console.log(`\x1b[31m${errors.length} bloqueante(s)\x1b[0m · ${warnings.length} aviso(s)\n`);
  process.exit(1);
}
console.log(`\x1b[32m0 bloqueantes\x1b[0m · ${warnings.length} aviso(s)\n`);
