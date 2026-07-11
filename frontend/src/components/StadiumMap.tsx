"use client";

import React from "react";
import { motion } from "framer-motion";

export interface GateData {
  gate_id: string;
  name: string;
  stand: string;
  x: number;
  y: number;
  status: "Open" | "Crowded" | "Closed";
  crowd_count: number;
  capacity: number;
  alternative: string;
  description: string;
}

interface StadiumMapProps {
  gates: GateData[];
  selectedBlock?: string;
  selectedGateId?: string;
  blockCoords?: { x: number; y: number } | null;
  interactive?: boolean;
  onGateClick?: (gateId: string) => void;
  heatmapMode?: boolean;
  sosBlocks?: string[]; // Block numbers with active SOS alerts to highlight
}

// ─── SVG coordinate space ────────────────────────────────────────────────────
// viewBox: "0 0 220 155"   (landscape, matches Etihad ~1.42:1 aspect ratio)
// Stadium center: cx=110, cy=77
// Pitch surface: x=64..156 (w=92), y=43..112 (h=69)
// ─────────────────────────────────────────────────────────────────────────────

const CX = 110;
const CY = 77;

// Stand density fill (heatmap)
function standFill(avgRatio: number, anyClosed: boolean): string {
  if (anyClosed) return "rgba(239,68,68,0.35)";
  if (avgRatio > 0.8) return "rgba(239,68,68,0.55)";
  if (avgRatio > 0.4) return "rgba(245,158,11,0.55)";
  return "rgba(16,185,129,0.35)";
}

export default function StadiumMap({
  gates,
  selectedBlock,
  selectedGateId,
  blockCoords,
  interactive = false,
  onGateClick,
  heatmapMode = false,
  sosBlocks = [],
}: StadiumMapProps) {

  const getGateColor = (status: string) => {
    switch (status) {
      case "Open":    return "#10b981";
      case "Crowded": return "#f59e0b";
      case "Closed":  return "#ef4444";
      default:        return "#9ca3af";
    }
  };

  const gateDensity = (gate: GateData) =>
    Math.min(100, Math.round((gate.crowd_count / gate.capacity) * 100));

  // Compute per-stand average ratio for heatmap colouring
  const standAvg = (gateIds: string[]) => {
    const matched = gates.filter(g => gateIds.includes(g.gate_id));
    if (!matched.length) return { ratio: 0, closed: false };
    const ratio = matched.reduce((a, g) => a + g.crowd_count / g.capacity, 0) / matched.length;
    return { ratio, closed: matched.some(g => g.status === "Closed") };
  };

  const north = standAvg(["Gate A", "Gate B"]);
  const east  = standAvg(["Gate C", "Gate D"]);
  const south = standAvg(["Gate E"]);
  const west  = standAvg(["Gate F"]);

  // Active gate for wayfinding
  const activeGate = gates.find(g => g.gate_id === selectedGateId);

  // Wayfinding bezier path
  const wayfindPath = () => {
    if (!activeGate || !blockCoords) return "";
    const { x: x1, y: y1 } = activeGate;
    const { x: x2, y: y2 } = blockCoords;
    // Control point bows gently inward toward stadium center
    const cx = (x1 + x2) / 2 + (CX - (x1 + x2) / 2) * 0.3;
    const cy = (y1 + y2) / 2 + (CY - (y1 + y2) / 2) * 0.3;
    return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
  };

  const blocks = Object.values(mock_data_blocks()) as any[];

  return (
    <div className="relative w-full mx-auto bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-md"
         style={{ aspectRatio: "220/155", maxWidth: 660 }}>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 text-[9px] bg-slate-900/90 border border-slate-800/80 p-1.5 rounded-lg text-slate-300 pointer-events-none">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span>Open</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span>Crowded</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span>Closed</span></div>
        {sosBlocks.length > 0 && (
          <div className="flex items-center gap-1.5 border-t border-slate-700/60 pt-1 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-400 font-black">SOS Active</span>
          </div>
        )}
      </div>

      {/* ── SVG ──────────────────────────────────────────────────────────────── */}
      <svg viewBox="0 0 220 155" className="w-full h-full" style={{ display: "block" }}>
        <defs>
          {/* Pitch gradient */}
          <radialGradient id="pitchGrad2" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1e5c34" />
            <stop offset="100%" stopColor="#0d3320" />
          </radialGradient>
          {/* Glow filter */}
          <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* SOS glow filter */}
          <filter id="sosGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Clip to stadium oval */}
          <clipPath id="stadiumClip">
            <ellipse cx={CX} cy={CY} rx="108" ry="74" />
          </clipPath>
        </defs>

        {/* ── Stadium shell ──────────────────────────────────────────────────── */}
        {/* Outer boundary ring */}
        <ellipse cx={CX} cy={CY} rx="108" ry="74"
          fill="#0f172a" stroke="#334155" strokeWidth="0.6" />

        {/* ── Stand tier 3 (outermost / upper tier, 300s) ────────────────────── */}
        {/* North upper */}
        <path
          d={`M 12,${CY - 43} A 98,60 0 0 1 208,${CY - 43}
              L 195,${CY - 37} A 85,52 0 0 0 25,${CY - 37} Z`}
          fill={heatmapMode ? standFill(north.ratio, north.closed) : "rgba(30,41,59,0.75)"}
          stroke="#1e3a5f" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* South upper */}
        <path
          d={`M 12,${CY + 43} A 98,60 0 0 0 208,${CY + 43}
              L 195,${CY + 37} A 85,52 0 0 1 25,${CY + 37} Z`}
          fill={heatmapMode ? standFill(south.ratio, south.closed) : "rgba(30,41,59,0.75)"}
          stroke="#1e3a5f" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* East upper */}
        <path
          d={`M ${CX + 98},17 A 98,60 0 0 1 ${CX + 98},138
              L ${CX + 85},132 A 85,52 0 0 0 ${CX + 85},23 Z`}
          fill={heatmapMode ? standFill(east.ratio, east.closed) : "rgba(30,41,59,0.75)"}
          stroke="#1e3a5f" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* West upper */}
        <path
          d={`M ${CX - 98},17 A 98,60 0 0 0 ${CX - 98},138
              L ${CX - 85},132 A 85,52 0 0 1 ${CX - 85},23 Z`}
          fill={heatmapMode ? standFill(west.ratio, west.closed) : "rgba(30,41,59,0.75)"}
          stroke="#1e3a5f" strokeWidth="0.4"
          className="transition-colors duration-500"
        />

        {/* ── Stand tier 2 (middle) ──────────────────────────────────────────── */}
        {/* North mid */}
        <path
          d={`M 25,${CY - 37} A 85,52 0 0 1 195,${CY - 37}
              L 186,${CY - 31} A 76,46 0 0 0 34,${CY - 31} Z`}
          fill={heatmapMode ? standFill(north.ratio, north.closed) : "rgba(22,35,53,0.9)"}
          stroke="#233554" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* South mid */}
        <path
          d={`M 25,${CY + 37} A 85,52 0 0 0 195,${CY + 37}
              L 186,${CY + 31} A 76,46 0 0 1 34,${CY + 31} Z`}
          fill={heatmapMode ? standFill(south.ratio, south.closed) : "rgba(22,35,53,0.9)"}
          stroke="#233554" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* East mid */}
        <path
          d={`M ${CX + 85},23 A 85,52 0 0 1 ${CX + 85},132
              L ${CX + 76},128 A 76,46 0 0 0 ${CX + 76},27 Z`}
          fill={heatmapMode ? standFill(east.ratio, east.closed) : "rgba(22,35,53,0.9)"}
          stroke="#233554" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* West mid */}
        <path
          d={`M ${CX - 85},23 A 85,52 0 0 0 ${CX - 85},132
              L ${CX - 76},128 A 76,46 0 0 1 ${CX - 76},27 Z`}
          fill={heatmapMode ? standFill(west.ratio, west.closed) : "rgba(22,35,53,0.9)"}
          stroke="#233554" strokeWidth="0.4"
          className="transition-colors duration-500"
        />

        {/* ── Stand tier 1 (inner / pitch-side, 1xx/0xx) ────────────────────── */}
        {/* North inner */}
        <path
          d={`M 34,${CY - 31} A 76,46 0 0 1 186,${CY - 31}
              L 158,${CY - 22} A 48,16 0 0 0 62,${CY - 22} Z`}
          fill={heatmapMode ? standFill(north.ratio, north.closed) : "rgba(18,28,48,0.95)"}
          stroke="#1e2f45" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* South inner */}
        <path
          d={`M 34,${CY + 31} A 76,46 0 0 0 186,${CY + 31}
              L 158,${CY + 22} A 48,16 0 0 1 62,${CY + 22} Z`}
          fill={heatmapMode ? standFill(south.ratio, south.closed) : "rgba(18,28,48,0.95)"}
          stroke="#1e2f45" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* East inner */}
        <path
          d={`M ${CX + 76},27 A 76,46 0 0 1 ${CX + 76},128
              L ${CX + 49},112 A 16,38 0 0 0 ${CX + 49},43 Z`}
          fill={heatmapMode ? standFill(east.ratio, east.closed) : "rgba(18,28,48,0.95)"}
          stroke="#1e2f45" strokeWidth="0.4"
          className="transition-colors duration-500"
        />
        {/* West inner */}
        <path
          d={`M ${CX - 76},27 A 76,46 0 0 0 ${CX - 76},128
              L ${CX - 49},112 A 16,38 0 0 1 ${CX - 49},43 Z`}
          fill={heatmapMode ? standFill(west.ratio, west.closed) : "rgba(18,28,48,0.95)"}
          stroke="#1e2f45" strokeWidth="0.4"
          className="transition-colors duration-500"
        />

        {/* ── Seat-row lines (North & South stands) — visual detail ─────────── */}
        {[CY - 37, CY - 31, CY - 26, CY - 22].map((y, i) => (
          <ellipse key={`nr${i}`} cx={CX} cy={y} rx={85 - i*9} ry={1.5}
            fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="0.3" />
        ))}
        {[CY + 22, CY + 26, CY + 31, CY + 37].map((y, i) => (
          <ellipse key={`sr${i}`} cx={CX} cy={y} rx={85 - (3-i)*9} ry={1.5}
            fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="0.3" />
        ))}

        {/* ── Seat-row lines (East & West stands) ──────────────────────────── */}
        {[CX + 76, CX + 68, CX + 60, CX + 52].map((x, i) => (
          <ellipse key={`er${i}`} cx={x} cy={CY} rx={1.5} ry={46 - i*8}
            fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="0.3" />
        ))}
        {[CX - 52, CX - 60, CX - 68, CX - 76].map((x, i) => (
          <ellipse key={`wr${i}`} cx={x} cy={CY} rx={1.5} ry={46 - (3-i)*8}
            fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="0.3" />
        ))}

        {/* Stand divider lines — vertical separators between blocks ─────────── */}
        {/* North */}
        {[-30, -10, 10, 30, 50, 70, 90].map((dx, i) => (
          <line key={`nd${i}`}
            x1={CX + dx} y1={CY - 37}
            x2={CX + dx * 0.7} y2={CY - 22}
            stroke="rgba(51,65,85,0.5)" strokeWidth="0.3" />
        ))}
        {/* South */}
        {[-30, -10, 10, 30, 50, 70, 90].map((dx, i) => (
          <line key={`sd${i}`}
            x1={CX + dx} y1={CY + 37}
            x2={CX + dx * 0.7} y2={CY + 22}
            stroke="rgba(51,65,85,0.5)" strokeWidth="0.3" />
        ))}
        {/* East */}
        {[-18, -6, 6, 18, 30].map((dy, i) => (
          <line key={`ed${i}`}
            x1={CX + 76} y1={CY + dy}
            x2={CX + 49} y2={CY + dy * 0.8}
            stroke="rgba(51,65,85,0.5)" strokeWidth="0.3" />
        ))}
        {/* West */}
        {[-18, -6, 6, 18, 30].map((dy, i) => (
          <line key={`wd${i}`}
            x1={CX - 76} y1={CY + dy}
            x2={CX - 49} y2={CY + dy * 0.8}
            stroke="rgba(51,65,85,0.5)" strokeWidth="0.3" />
        ))}

        {/* ── Stand labels ──────────────────────────────────────────────────── */}
        <text x={CX} y={CY - 45} fill="rgba(148,163,184,0.5)" fontSize="4"
          fontWeight="bold" textAnchor="middle" pointerEvents="none">NORTH STAND</text>
        <text x={CX} y={CY + 52} fill="rgba(148,163,184,0.5)" fontSize="4"
          fontWeight="bold" textAnchor="middle" pointerEvents="none">SOUTH STAND</text>
        <text x={CX + 90} y={CY + 1.5} fill="rgba(148,163,184,0.5)" fontSize="3.5"
          fontWeight="bold" textAnchor="middle"
          transform={`rotate(90 ${CX + 90} ${CY})`} pointerEvents="none">EAST</text>
        <text x={CX - 90} y={CY + 1.5} fill="rgba(148,163,184,0.5)" fontSize="3.5"
          fontWeight="bold" textAnchor="middle"
          transform={`rotate(-90 ${CX - 90} ${CY})`} pointerEvents="none">WEST (COLIN BELL)</text>

        {/* ── Football Pitch ────────────────────────────────────────────────── */}
        {/* Safety zone / pitch perimeter border */}
        <rect x={60} y={40} width={100} height={75} rx={1}
          fill="#0a2115" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" />
        {/* Main pitch surface */}
        <rect x={63} y={43} width={94} height={69} rx={0.5}
          fill="url(#pitchGrad2)" />
        {/* Pitch stripe pattern */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={`stripe${i}`} x={63 + i * 13.4} y={43} width={6.7} height={69}
            fill="rgba(0,0,0,0.06)" />
        ))}

        {/* Pitch boundary lines */}
        <rect x={64} y={44} width={92} height={67} rx={0}
          fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
        {/* Halfway line */}
        <line x1={110} y1={44} x2={110} y2={111}
          stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
        {/* Centre circle */}
        <circle cx={110} cy={77.5} r={8}
          fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
        {/* Centre spot */}
        <circle cx={110} cy={77.5} r={0.7} fill="rgba(255,255,255,0.6)" />

        {/* Left penalty box (full size) */}
        <rect x={64} y={59} width={15} height={37}
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        {/* Left goal box */}
        <rect x={64} y={66} width={6} height={23}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
        {/* Left penalty arc */}
        <path d={`M 79,68 A 8,8 0 0 1 79,87`}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
        {/* Left penalty spot */}
        <circle cx={75} cy={77.5} r={0.7} fill="rgba(255,255,255,0.55)" />

        {/* Right penalty box */}
        <rect x={141} y={59} width={15} height={37}
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        {/* Right goal box */}
        <rect x={150} y={66} width={6} height={23}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
        {/* Right penalty arc */}
        <path d={`M 141,68 A 8,8 0 0 0 141,87`}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
        {/* Right penalty spot */}
        <circle cx={145} cy={77.5} r={0.7} fill="rgba(255,255,255,0.55)" />

        {/* Corner arcs */}
        <path d="M 64,46.5 A 2.5,2.5 0 0 1 66.5,44" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
        <path d="M 153.5,44 A 2.5,2.5 0 0 1 156,46.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
        <path d="M 64,108.5 A 2.5,2.5 0 0 0 66.5,111" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
        <path d="M 153.5,111 A 2.5,2.5 0 0 0 156,108.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />

        {/* Goals */}
        <rect x={59} y={70} width={5} height={15} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <rect x={156} y={70} width={5} height={15} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />

        {/* ── Wayfinding Path ───────────────────────────────────────────────── */}
        {activeGate && blockCoords && (
          <>
            {/* Base track */}
            <path d={wayfindPath()} fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth="1.4" />
            {/* Animated dashed */}
            <motion.path
              d={wayfindPath()} fill="none"
              stroke="#f59e0b" strokeWidth="1.4"
              strokeDasharray="4, 3"
              animate={{ strokeDashoffset: [0, -28] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
              filter="url(#glow2)"
            />
          </>
        )}

        {/* ── Seating Block Dots ────────────────────────────────────────────── */}
        {blocks.map((block: any) => {
          const isSelected = block.block === selectedBlock;
          const isSOS = sosBlocks.includes(block.block);

          // ── SOS beacon ──────────────────────────────────────────────────────
          if (isSOS) {
            return (
              <g key={`block-${block.block}`}>
                <motion.circle cx={block.x} cy={block.y} r={5.5}
                  fill="none" stroke="#ef4444" strokeWidth="0.6"
                  animate={{ scale: [1, 2.4, 1], opacity: [0.9, 0, 0.9] }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: "easeOut" }}
                />
                <motion.circle cx={block.x} cy={block.y} r={3.5}
                  fill="none" stroke="#fca5a5" strokeWidth="0.5"
                  animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.1, delay: 0.28, ease: "easeOut" }}
                />
                <circle cx={block.x} cy={block.y} r={2.2}
                  fill="#ef4444" filter="url(#sosGlow)" />
                <text x={block.x} y={block.y - 5} fill="#fca5a5"
                  fontSize="2.4" fontWeight="bold" textAnchor="middle" pointerEvents="none">
                  SOS·{block.block}
                </text>
              </g>
            );
          }

          // ── Selected block (audience wayfinding) ────────────────────────────
          if (isSelected) {
            return (
              <g key={`block-${block.block}`}>
                <motion.circle cx={block.x} cy={block.y} r={4}
                  fill="none" stroke="#ef4444" strokeWidth="0.8"
                  animate={{ scale: [1, 2, 1], opacity: [0.8, 0.15, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                />
                <circle cx={block.x} cy={block.y} r={2} fill="#ef4444" filter="url(#glow2)" />
                <text x={block.x} y={block.y - 3.5} fill="#ffffff"
                  fontSize="2.8" fontWeight="bold" textAnchor="middle" pointerEvents="none">
                  B{block.block}
                </text>
              </g>
            );
          }

          // ── Heatmap dot ─────────────────────────────────────────────────────
          if (heatmapMode) {
            const hash = block.block.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
            const d = hash % 3;
            const fill = d === 2 ? "rgba(239,68,68,0.45)" : d === 1 ? "rgba(245,158,11,0.35)" : "rgba(16,185,129,0.25)";
            return (
              <circle key={`block-${block.block}`}
                cx={block.x} cy={block.y} r={1}
                fill={fill} pointerEvents="none" />
            );
          }

          return null;
        })}

        {/* ── Block number labels in heatmap mode ──────────────────────────── */}
        {heatmapMode && blocks
          .filter((b: any) => !sosBlocks.includes(b.block) && b.block !== selectedBlock)
          .filter((_: any, i: number) => i % 3 === 0) // thin out to avoid clutter
          .map((block: any) => (
            <text key={`lbl-${block.block}`}
              x={block.x} y={block.y - 2}
              fill="rgba(148,163,184,0.35)" fontSize="1.8"
              fontWeight="bold" textAnchor="middle" pointerEvents="none">
              {block.block}
            </text>
          ))}

        {/* ── Gate Nodes ───────────────────────────────────────────────────── */}
        {gates.map((gate) => {
          const isSelected = gate.gate_id === selectedGateId;
          const color = getGateColor(gate.status);
          const density = gateDensity(gate);

          return (
            <g key={gate.gate_id}
              transform={`translate(${gate.x}, ${gate.y})`}
              className={interactive ? "cursor-pointer" : ""}
              onClick={() => interactive && onGateClick && onGateClick(gate.gate_id)}
            >
              {/* Pulsing ring for crowded / selected */}
              {(gate.status === "Crowded" || isSelected) && (
                <motion.circle cx={0} cy={0} r={5.5}
                  fill="none" stroke={color} strokeWidth="0.8"
                  animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
              {/* Main gate circle */}
              <circle cx={0} cy={0} r={3.2}
                fill="#0f172a" stroke={color}
                strokeWidth={isSelected ? "1.8" : "1.2"}
                filter="url(#glow2)"
              />
              {/* Gate letter */}
              <text x={0} y={1.1} fill="#ffffff" fontSize="2.8"
                fontWeight="bold" textAnchor="middle" pointerEvents="none">
                {gate.gate_id.replace("Gate ", "")}
              </text>
              {/* Density % label */}
              <text x={0} y={-5} fill="rgba(255,255,255,0.75)" fontSize="1.8"
                fontWeight="bold" textAnchor="middle" pointerEvents="none">
                {gate.status === "Closed" ? "CLOSED" : `${density}%`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Block coordinate lookup ──────────────────────────────────────────────────
// Mirrors mock_data.py but runs client-side.
// SVG space: 220×155, center (110,77). Elliptical geometry (rx > ry).
function mock_data_blocks() {
  const blocks: any = {};
  const CX = 110, CY = 77;

  function elliptic(angleDeg: number, lvl: number): { x: number; y: number } {
    const rx = 52 + lvl * 16; // 68 / 84 / 100
    const ry = 36 + lvl * 11; // 47 / 58 / 69
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: Math.round((CX + rx * Math.cos(rad)) * 10) / 10,
      y: Math.round((CY + ry * Math.sin(rad)) * 10) / 10,
    };
  }

  // East Stand: 101-109, 201-209, 301-309
  for (const lvl of [1, 2, 3]) {
    for (let idx = 1; idx <= 9; idx++) {
      const bn = `${lvl}0${idx}`;
      const { x, y } = elliptic(-40 + idx * 10, lvl);
      blocks[bn] = { block: bn, primary_gate: idx <= 5 ? "Gate C" : "Gate D", x, y };
    }
  }

  // South Stand: 114-120, 214-220, 314-320
  for (const lvl of [1, 2, 3]) {
    for (let idx = 14; idx <= 20; idx++) {
      const bn = `${lvl}${idx}`;
      const { x, y } = elliptic(55 + (idx - 14) * 11.6, lvl);
      blocks[bn] = { block: bn, primary_gate: "Gate E", x, y };
    }
  }

  // West Stand: 122-132, 222-232, 322-332
  for (const lvl of [1, 2, 3]) {
    for (let idx = 22; idx <= 32; idx++) {
      const bn = `${lvl}${idx}`;
      const { x, y } = elliptic(135 + (idx - 22) * 9, lvl);
      blocks[bn] = { block: bn, primary_gate: "Gate F", x, y };
    }
  }

  // North Stand: 136-142, 236-242, 336-342
  for (const lvl of [1, 2, 3]) {
    for (let idx = 36; idx <= 42; idx++) {
      const bn = `${lvl}${idx}`;
      const { x, y } = elliptic(230 + (idx - 36) * 11, lvl);
      blocks[bn] = { block: bn, primary_gate: idx <= 39 ? "Gate A" : "Gate B", x, y };
    }
  }

  return blocks;
}
