"use client";

/**
 * Grafo de conexões narrativas — simulação force-directed própria em SVG,
 * sem bibliotecas externas. Pan (arrastar fundo), zoom (scroll), drag de nós
 * e clique para comparação profunda. Exportação PNG via serialização do SVG.
 *
 * A simulação vive em refs (mutadas só em handlers/effects); a cada tick um
 * snapshot imutável é publicado no state para a renderização.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MEDIA_TYPE_COLORS,
  MEDIA_TYPE_LABELS,
  type AnalysisResult,
  type MediaType,
} from "@/lib/oracle-types";

const VB_W = 800;
const VB_H = 520;
const CX = 400;
const CY = 260;
const MAX_TICKS = 400;

interface GraphNodeData {
  id: string;
  name: string;
  type: MediaType;
  score: number;
  origin: string;
  reason: string;
  isCenter: boolean;
}

interface SimNode extends GraphNodeData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
}

interface SimState {
  nodes: SimNode[];
  ticks: number;
  running: boolean;
  raf: number | null;
}

interface ViewState {
  tx: number;
  ty: number;
  zoom: number;
}

/** Snapshot imutável consumido pela renderização. */
interface Frame {
  nodes: SimNode[];
  view: ViewState;
}

interface TooltipState {
  node: GraphNodeData;
  x: number;
  y: number;
}

function radiusOf(isCenter: boolean, score: number): number {
  return isCenter ? 24 : 13 + score / 12;
}

function truncate(text: string, max = 18): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function buildNodes(result: AnalysisResult): GraphNodeData[] {
  const center: GraphNodeData = {
    id: "center",
    name: result.facts.name,
    type: result.facts.type,
    score: 100,
    origin: result.facts.origin,
    reason: result.facts.synopsis,
    isCenter: true,
  };
  const parallels: GraphNodeData[] = result.parallels.slice(0, 6).map((p) => ({
    id: p.name,
    name: p.name,
    type: p.type,
    score: p.score,
    origin: p.origin,
    reason: p.reason,
    isCenter: false,
  }));
  return [center, ...parallels];
}

/** Inicialização determinística (sem Math.random) para evitar mismatch de hidratação. */
function buildSim(nodes: GraphNodeData[]): SimState {
  const simNodes: SimNode[] = nodes.map((n, i) => {
    if (n.isCenter) {
      return { ...n, x: CX, y: CY, vx: 0, vy: 0, fixed: true };
    }
    const angle = (i / Math.max(nodes.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
    const jx = ((i * 53) % 17) - 8;
    const jy = ((i * 31) % 13) - 6;
    return {
      ...n,
      x: CX + Math.cos(angle) * 170 + jx,
      y: CY + Math.sin(angle) * 170 + jy,
      vx: 0,
      vy: 0,
      fixed: false,
    };
  });
  return { nodes: simNodes, ticks: 0, running: false, raf: null };
}

/**
 * Um tick da simulação (muta o estado mutável da simulação).
 * Retorna false quando a simulação deve parar (energia baixa ou limite).
 */
function simulate(sim: SimState): boolean {
  const ns = sim.nodes;

  // Repulsão par-a-par: k = 9000 / d²
  for (let i = 0; i < ns.length; i++) {
    for (let j = i + 1; j < ns.length; j++) {
      const a = ns[i];
      const b = ns[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) {
        dx = ((i + j) % 2 === 0 ? 1 : -1) * 0.7;
        dy = 0.7;
        d2 = 1;
      }
      const d = Math.sqrt(d2);
      const f = 9000 / d2;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      if (!a.fixed) {
        a.vx -= fx;
        a.vy -= fy;
      }
      if (!b.fixed) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  // Molas centro↔paralelo: distância ideal menor para scores altos
  const center = ns[0];
  for (let i = 1; i < ns.length; i++) {
    const n = ns[i];
    const dx = n.x - center.x;
    const dy = n.y - center.y;
    const d = Math.max(Math.hypot(dx, dy), 0.01);
    const ideal = 100 + (100 - n.score) * 0.8;
    const f = 0.02 * (d - ideal);
    if (!n.fixed) {
      n.vx -= (dx / d) * f;
      n.vy -= (dy / d) * f;
    }
    if (!center.fixed) {
      center.vx += (dx / d) * f;
      center.vy += (dy / d) * f;
    }
  }

  // Gravidade ao centro + integração com damping 0.85 + clamp nas bordas
  let energy = 0;
  for (const n of ns) {
    if (n.fixed) continue;
    n.vx += (CX - n.x) * 0.015;
    n.vy += (CY - n.y) * 0.015;
    n.vx *= 0.85;
    n.vy *= 0.85;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.min(VB_W - 70, Math.max(70, n.x));
    n.y = Math.min(VB_H - 50, Math.max(50, n.y));
    energy += n.vx * n.vx + n.vy * n.vy;
  }

  sim.ticks++;
  return sim.ticks <= MAX_TICKS && energy >= 0.05;
}

interface NarrativeGraphProps {
  result: AnalysisResult;
  onSelect: (bName: string, bOrigin: string) => void;
}

export function NarrativeGraph({ result, onSelect }: NarrativeGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<ViewState>({ tx: 0, ty: 0, zoom: 1 });
  const simRef = useRef<SimState | null>(null);
  const dragRef = useRef<
    | null
    | {
        mode: "node" | "pan";
        id?: string;
        lastClientX: number;
        lastClientY: number;
        moved: number;
      }
  >(null);

  const nodes = useMemo(() => buildNodes(result), [result]);
  const simKey = useMemo(
    () => `${result.id}:${result.parallels.slice(0, 6).map((p) => p.name).join("|")}`,
    [result]
  );

  const [frame, setFrame] = useState<Frame | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  /** Publica um snapshot imutável da simulação + view para a renderização. */
  const publish = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setFrame({
      nodes: sim.nodes.map((n) => ({ ...n })),
      view: { ...viewRef.current },
    });
  }, []);

  const findSim = useCallback(
    (id?: string) => simRef.current?.nodes.find((n) => n.id === id) ?? null,
    []
  );

  // --------------------------------------------------------------- physics
  const startSim = useCallback(
    (initial = false) => {
      const sim = simRef.current;
      if (!sim) return;
      if (sim.raf !== null) cancelAnimationFrame(sim.raf);
      sim.ticks = initial ? 0 : Math.max(sim.ticks, MAX_TICKS - 90);
      if (sim.running) return;
      sim.running = true;
      const loop = () => {
        const s = simRef.current;
        if (!s || !s.running) return;
        const alive = simulate(s);
        publish();
        if (!alive) {
          s.running = false;
          s.raf = null;
          return;
        }
        s.raf = requestAnimationFrame(loop);
      };
      sim.raf = requestAnimationFrame(loop);
    },
    [publish]
  );

  useEffect(() => {
    simRef.current = buildSim(nodes);
    viewRef.current = { tx: 0, ty: 0, zoom: 1 };
    publish();
    startSim(true);
    return () => {
      const sim = simRef.current;
      if (sim?.raf !== null && sim?.raf !== undefined) {
        cancelAnimationFrame(sim.raf);
      }
      if (sim) sim.running = false;
    };
  }, [nodes, simKey, publish, startSim]);

  // ------------------------------------------------------------------ zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const view = viewRef.current;
      const s = Math.min(rect.width / VB_W, rect.height / VB_H);
      const ox = (rect.width - VB_W * s) / 2;
      const oy = (rect.height - VB_H * s) / 2;
      const vbX = (e.clientX - rect.left - ox) / s;
      const vbY = (e.clientY - rect.top - oy) / s;
      const wx = (vbX - view.tx) / view.zoom;
      const wy = (vbY - view.ty) / view.zoom;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newZoom = Math.min(2.5, Math.max(0.4, view.zoom * factor));
      view.tx = vbX - wx * newZoom;
      view.ty = vbY - wy * newZoom;
      view.zoom = newZoom;
      publish();
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [publish]);

  // --------------------------------------------------------------- pointer
  const screenToViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    const s =
      rect && rect.width
        ? Math.min(rect.width / VB_W, rect.height / VB_H)
        : 1;
    const ox = rect ? (rect.width - VB_W * s) / 2 : 0;
    const oy = rect ? (rect.height - VB_H * s) / 2 : 0;
    return {
      vbX: (clientX - (rect?.left ?? 0) - ox) / s,
      vbY: (clientY - (rect?.top ?? 0) - oy) / s,
      s,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    const nodeEl = target.closest("[data-node-id]") as SVGElement | null;
    const nodeId = nodeEl?.getAttribute("data-node-id") ?? undefined;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: nodeId ? "node" : "pan",
      id: nodeId,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      moved: 0,
    };
    if (nodeId) {
      const n = findSim(nodeId);
      if (n) {
        n.fixed = true;
        n.vx = 0;
        n.vy = 0;
      }
    }
    setTooltip(null);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      // hover → tooltip seguindo o mouse
      const nodeEl = (e.target as Element).closest("[data-node-id]") as SVGElement | null;
      const id = nodeEl?.getAttribute("data-node-id");
      if (id && containerRef.current) {
        const node = nodes.find((n) => n.id === id);
        const rect = containerRef.current.getBoundingClientRect();
        if (node) {
          setTooltip({
            node,
            x: Math.min(e.clientX - rect.left + 14, Math.max(rect.width - 260, 0)),
            y: e.clientY - rect.top + 14,
          });
          return;
        }
      }
      setTooltip(null);
      return;
    }

    const dx = e.clientX - drag.lastClientX;
    const dy = e.clientY - drag.lastClientY;
    drag.lastClientX = e.clientX;
    drag.lastClientY = e.clientY;
    drag.moved += Math.hypot(dx, dy);

    const { s } = screenToViewBox(e.clientX, e.clientY);
    const view = viewRef.current;

    if (drag.mode === "pan") {
      view.tx += dx / s;
      view.ty += dy / s;
    } else if (drag.id) {
      const n = findSim(drag.id);
      if (n) {
        n.x += dx / (s * view.zoom);
        n.y += dy / (s * view.zoom);
        n.vx = 0;
        n.vy = 0;
      }
    }
    publish();
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!drag) return;

    if (drag.mode === "node") {
      const n = findSim(drag.id);
      if (n) n.fixed = false;
      if (drag.moved < 4 && drag.id && drag.id !== "center") {
        const node = nodes.find((nd) => nd.id === drag.id);
        if (node) {
          onSelect(node.name, node.origin);
          return;
        }
      }
    }
    // Soltou arrasto/pan: retoma a simulação brevemente para reacomodar
    startSim(false);
  };

  // ------------------------------------------------------------ export png
  const handleExportPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", "1600");
    clone.setAttribute("height", "1040");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serialized = new XMLSerializer().serializeToString(clone);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1040;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, 1600, 1040);
      ctx.drawImage(img, 0, 0, 1600, 1040);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "grafo-conexoes.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    img.src = dataUrl;
  }, []);

  // ---------------------------------------------------------------- render
  const frameNodes = frame?.nodes;
  const centerNode = frameNodes?.[0];
  const fView = frame?.view ?? { tx: 0, ty: 0, zoom: 1 };
  const legendTypes = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.type))),
    [nodes]
  );

  return (
    <Card className="flex h-full flex-col border-slate-800 bg-slate-900/60">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-lg text-slate-100">
          <Share2 className="size-4 text-indigo-400" aria-hidden="true" />
          Grafo de Conexões
        </CardTitle>
        <div className="flex items-center gap-3">
          <div
            className="hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex"
            aria-label="Legenda de tipos"
          >
            {legendTypes.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: MEDIA_TYPE_COLORS[t] }}
                  aria-hidden="true"
                />
                {MEDIA_TYPE_LABELS[t]}
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPng}
            className="border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <ImageDown className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">PNG</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div
          ref={containerRef}
          className="relative h-[420px] w-full overflow-hidden rounded-lg border border-slate-800/70 bg-[#070b14]"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            style={{ touchAction: "none" }}
            role="img"
            aria-label={`Grafo de conexões de ${result.facts.name} com ${result.parallels.length} paralelos`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => setTooltip(null)}
          >
            <defs>
              <linearGradient id="oracleEdgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <filter id="oracleNodeGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#818cf8" floodOpacity="0.5" />
              </filter>
            </defs>

            {frameNodes && centerNode ? (
              <g transform={`translate(${fView.tx} ${fView.ty}) scale(${fView.zoom})`}>
                {/* arestas */}
                {frameNodes.slice(1).map((n) => (
                  <line
                    key={`edge-${n.id}`}
                    x1={centerNode.x}
                    y1={centerNode.y}
                    x2={n.x}
                    y2={n.y}
                    stroke="url(#oracleEdgeGradient)"
                    strokeOpacity={0.25 + n.score / 200}
                    strokeWidth={1 + n.score / 22}
                  />
                ))}

                {/* nós */}
                {frameNodes.map((n) => {
                  const r = radiusOf(n.isCenter, n.score);
                  const color = MEDIA_TYPE_COLORS[n.type];
                  return (
                    <g
                      key={`node-${n.id}`}
                      data-node-id={n.id}
                      className={n.isCenter ? undefined : "cursor-pointer"}
                    >
                      {n.isCenter ? (
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={r + 9}
                          fill="none"
                          stroke="#818cf8"
                          strokeOpacity={0.35}
                          strokeWidth={1.5}
                        />
                      ) : null}
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={r}
                        fill={color}
                        stroke="#020617"
                        strokeWidth={2}
                        filter={n.isCenter ? "url(#oracleNodeGlow)" : undefined}
                      />
                      <text
                        x={n.x}
                        y={n.y + r + 16}
                        textAnchor="middle"
                        fontSize={n.isCenter ? 13 : 11}
                        fontWeight={n.isCenter ? 700 : 500}
                        fill={n.isCenter ? "#f1f5f9" : "#cbd5e1"}
                        stroke="#020617"
                        strokeWidth={3}
                        paintOrder="stroke"
                        style={{ pointerEvents: "none" }}
                      >
                        {truncate(n.name)}
                      </text>
                    </g>
                  );
                })}
              </g>
            ) : null}
          </svg>

          {tooltip ? (
            <div
              className="pointer-events-none absolute z-10 max-w-[250px] rounded-lg border border-indigo-400/30 bg-slate-900/95 p-2.5 text-xs shadow-2xl shadow-black/60"
              style={{
                left: tooltip.x,
                top: tooltip.y,
              }}
              role="tooltip"
            >
              <p className="font-semibold text-slate-100">{tooltip.node.name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                {tooltip.node.origin}
              </p>
              {!tooltip.node.isCenter ? (
                <p className="mt-1 text-[11px] font-semibold text-amber-300">
                  Similaridade {Math.round(tooltip.node.score)}%
                </p>
              ) : null}
              <p className="mt-1 line-clamp-2 leading-snug text-slate-400">
                {tooltip.node.reason}
              </p>
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500 md:text-left">
          Arraste para reposicionar · Scroll para zoom · Clique num nó para
          comparação profunda
        </p>
      </CardContent>
    </Card>
  );
}
