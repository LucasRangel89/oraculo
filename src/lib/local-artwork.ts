/**
 * Arte-síntese local.
 *
 * O blueprint "Narrativa IA" previa um agente "Diretor de Arte" que traduz a
 * análise em imagem. Sem provedor de imagem, o Oráculo gera um **sigilo
 * determinístico em SVG**: duas constelações ligadas por fios dourados, com
 * anéis concêntricos derivados de um hash dos nomes. Mesmo input → mesma arte,
 * e nenhuma chamada de rede.
 */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pseudoRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ArtworkInput {
  aName: string;
  bName: string;
  motif?: string;
}

/** Gera um SVG (string) representando a conexão entre duas narrativas. */
export function buildArtworkSvg({ aName, bName, motif }: ArtworkInput): string {
  const seed = hash(`${aName}|${bName}|${motif ?? ""}`);
  const rand = pseudoRandom(seed);
  const width = 1152;
  const height = 864;
  const cxA = width * 0.3;
  const cxB = width * 0.7;
  const cy = height * 0.44;

  const star = (x: number, y: number, r: number, opacity: number) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fbbf24" opacity="${opacity.toFixed(2)}"/>`;

  const motes = Array.from({ length: 90 }, () => {
    const x = rand() * width;
    const y = rand() * height;
    const r = 0.4 + rand() * 1.5;
    return star(x, y, r, 0.15 + rand() * 0.55);
  }).join("");

  const ring = (cx: number, cy: number, base: number, count: number, color: string) =>
    Array.from({ length: count }, (_, i) => {
      const r = base + i * 9 + rand() * 5;
      const dash = 2 + Math.round(rand() * 8);
      return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(0.6 + rand() * 0.9).toFixed(2)}" stroke-dasharray="${dash} ${dash + 3}" opacity="${(0.18 + rand() * 0.35).toFixed(2)}"/>`;
    }).join("");

  const threads = Array.from({ length: 7 }, (_, i) => {
    const offset = (i - 3) * 26;
    const c1x = cxA + 130 + rand() * 60;
    const c1y = cy + offset * 1.6;
    const c2x = cxB - 130 - rand() * 60;
    const c2y = cy + offset * 1.6;
    return `<path d="M ${cxA} ${cy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cxB} ${cy}" fill="none" stroke="url(#thread)" stroke-width="${(0.7 + rand() * 1.1).toFixed(2)}" opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
  }).join("");

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  const label = motif ? `motivo compartilhado · ${motif}` : "conexão narrativa";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Arte-síntese da conexão entre ${escapeXml(aName)} e ${escapeXml(bName)}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="78%">
      <stop offset="0%" stop-color="#1b2440"/>
      <stop offset="55%" stop-color="#0d1424"/>
      <stop offset="100%" stop-color="#060911"/>
    </radialGradient>
    <radialGradient id="glowA" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="thread" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0.15"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${motes}

  <circle cx="${cxA}" cy="${cy}" r="220" fill="url(#glowA)" opacity="0.16"/>
  <circle cx="${cxB}" cy="${cy}" r="220" fill="url(#glowA)" opacity="0.16"/>

  ${ring(cxA, cy, 54, 6, "#818cf8")}
  ${ring(cxB, cy, 54, 6, "#818cf8")}
  ${threads}

  <circle cx="${cxA}" cy="${cy}" r="16" fill="#0b1220" stroke="#fbbf24" stroke-width="1.6"/>
  <circle cx="${cxB}" cy="${cy}" r="16" fill="#0b1220" stroke="#fbbf24" stroke-width="1.6"/>
  <circle cx="${cxA}" cy="${cy}" r="4.5" fill="#fbbf24" filter="url(#soft)"/>
  <circle cx="${cxB}" cy="${cy}" r="4.5" fill="#fbbf24" filter="url(#soft)"/>

  <text x="${cxA}" y="${cy - 92}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" fill="#f8fafc" opacity="0.92">${escapeXml(initials(aName))}</text>
  <text x="${cxB}" y="${cy - 92}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" fill="#f8fafc" opacity="0.92">${escapeXml(initials(bName))}</text>

  <text x="${width / 2}" y="${height - 128}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#e2e8f0">${escapeXml(aName)}</text>
  <text x="${width / 2}" y="${height - 84}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#fbbf24" opacity="0.85">${escapeXml(label)}</text>
  <text x="${width / 2}" y="${height - 44}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#e2e8f0">${escapeXml(bName)}</text>

  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="#334155" stroke-width="1" opacity="0.7"/>
</svg>`;
}

/** Data URL pronto para uso em `<img src>` ou download. */
export function buildArtworkDataUrl(input: ArtworkInput): string {
  const svg = buildArtworkSvg(input);
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}
