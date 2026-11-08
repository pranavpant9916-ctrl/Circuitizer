import React, { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { LogicLevel } from '../../types/circuit';
import { Info, Sparkles, ToggleLeft, ToggleRight, Zap } from 'lucide-react';

interface GateNode {
  id: string;
  type: 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | '555' | 'JK_FF';
  x: number;
  y: number;
  inputs: { label: string; wireX: number; wireY: number; level: LogicLevel }[];
  output: { label: string; wireX: number; wireY: number; level: LogicLevel };
  formula?: string;
}

export const BooleanDiagramCanvas: React.FC = () => {
  const {
    experiments,
    activeExpId,
    circuitState,
    toggleSwitch,
  } = useCircuitStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  const activeExp = experiments.find((e) => e.id === activeExpId);

  // Animation loop for signal pulse flow
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setPulsePhase((prev) => (prev + 0.04) % 1);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Determine current input levels from circuit switches
  const swA = circuitState.switches.find((s) => s.id === 'sw-a')?.isClosed ? 1 : 0;
  const swB = circuitState.switches.find((s) => s.id === 'sw-b')?.isClosed ? 1 : 0;
  const swC = circuitState.switches.find((s) => s.id === 'sw-c')?.isClosed ? 1 : 0;
  const isAnyLedLit = circuitState.leds.some((l) => l.isLit);

  // Derive schematic topology based on active experiment or circuit model
  const deriveGates = (width: number, height: number): { gates: GateNode[]; formula: string; title: string } => {
    const centerX = width / 2;
    const centerY = height / 2;

    const expId = activeExp?.id || '';
    const expText = `${activeExp?.title} ${activeExp?.aim}`.toLowerCase();

    // 1. Majority Voter (AB + BC + AC)
    if (expText.includes('majority') || expText.includes('voter')) {
      const outAB: LogicLevel = (swA === 1 && swB === 1) ? 1 : 0;
      const outBC: LogicLevel = (swB === 1 && swC === 1) ? 1 : 0;
      const outAC: LogicLevel = (swA === 1 && swC === 1) ? 1 : 0;
      const finalY: LogicLevel = (outAB === 1 || outBC === 1 || outAC === 1) ? 1 : 0;

      return {
        formula: 'Y = (A • B) + (B • C) + (A • C)',
        title: '3-Input Majority Voter Boolean Diagram',
        gates: [
          {
            id: 'g-and1',
            type: 'AND',
            x: centerX - 140,
            y: centerY - 90,
            inputs: [
              { label: 'A', wireX: centerX - 240, wireY: centerY - 105, level: swA },
              { label: 'B', wireX: centerX - 240, wireY: centerY - 75, level: swB },
            ],
            output: { label: 'AB', wireX: centerX - 50, wireY: centerY - 90, level: outAB },
          },
          {
            id: 'g-and2',
            type: 'AND',
            x: centerX - 140,
            y: centerY,
            inputs: [
              { label: 'B', wireX: centerX - 240, wireY: centerY - 15, level: swB },
              { label: 'C', wireX: centerX - 240, wireY: centerY + 15, level: swC },
            ],
            output: { label: 'BC', wireX: centerX - 50, wireY: centerY, level: outBC },
          },
          {
            id: 'g-and3',
            type: 'AND',
            x: centerX - 140,
            y: centerY + 90,
            inputs: [
              { label: 'A', wireX: centerX - 240, wireY: centerY + 75, level: swA },
              { label: 'C', wireX: centerX - 240, wireY: centerY + 105, level: swC },
            ],
            output: { label: 'AC', wireX: centerX - 50, wireY: centerY + 90, level: outAC },
          },
          {
            id: 'g-or1',
            type: 'OR',
            x: centerX + 90,
            y: centerY,
            inputs: [
              { label: 'AB', wireX: centerX - 50, wireY: centerY - 90, level: outAB },
              { label: 'BC', wireX: centerX - 50, wireY: centerY, level: outBC },
              { label: 'AC', wireX: centerX - 50, wireY: centerY + 90, level: outAC },
            ],
            output: { label: 'Y', wireX: centerX + 210, wireY: centerY, level: finalY },
          },
        ],
      };
    }

    // 2. 2:1 Multiplexer Y = S'D0 + SD1
    if (expText.includes('multiplexer') || expText.includes('mux')) {
      const s = swA; // Select
      const d0 = swB;
      const d1 = swC;
      const sNot: LogicLevel = s === 1 ? 0 : 1;
      const and0: LogicLevel = (sNot === 1 && d0 === 1) ? 1 : 0;
      const and1: LogicLevel = (s === 1 && d1 === 1) ? 1 : 0;
      const finalY: LogicLevel = (and0 === 1 || and1 === 1) ? 1 : 0;

      return {
        formula: 'Y = (S\' • D0) + (S • D1)',
        title: '2:1 Multiplexer Logic Schematic',
        gates: [
          {
            id: 'g-not',
            type: 'NOT',
            x: centerX - 150,
            y: centerY - 70,
            inputs: [{ label: 'S', wireX: centerX - 240, wireY: centerY - 70, level: s }],
            output: { label: "S'", wireX: centerX - 90, wireY: centerY - 70, level: sNot },
          },
          {
            id: 'g-and0',
            type: 'AND',
            x: centerX - 40,
            y: centerY - 50,
            inputs: [
              { label: "S'", wireX: centerX - 90, wireY: centerY - 70, level: sNot },
              { label: 'D0', wireX: centerX - 240, wireY: centerY - 35, level: d0 },
            ],
            output: { label: "S'D0", wireX: centerX + 50, wireY: centerY - 50, level: and0 },
          },
          {
            id: 'g-and1',
            type: 'AND',
            x: centerX - 40,
            y: centerY + 50,
            inputs: [
              { label: 'S', wireX: centerX - 240, wireY: centerY + 35, level: s },
              { label: 'D1', wireX: centerX - 240, wireY: centerY + 65, level: d1 },
            ],
            output: { label: 'SD1', wireX: centerX + 50, wireY: centerY + 50, level: and1 },
          },
          {
            id: 'g-or',
            type: 'OR',
            x: centerX + 120,
            y: centerY,
            inputs: [
              { label: "S'D0", wireX: centerX + 50, wireY: centerY - 50, level: and0 },
              { label: 'SD1', wireX: centerX + 50, wireY: centerY + 50, level: and1 },
            ],
            output: { label: 'Y', wireX: centerX + 210, wireY: centerY, level: finalY },
          },
        ],
      };
    }

    // 3. 1-Bit Equality Comparator (XNOR)
    if (expText.includes('comparator') || expText.includes('equality')) {
      const xorOut: LogicLevel = swA !== swB ? 1 : 0;
      const xnorOut: LogicLevel = xorOut === 1 ? 0 : 1;

      return {
        formula: 'Y = (A ⊕ B)\' = A • B + A\' • B\'',
        title: '1-Bit Equality Comparator (XNOR) Schematic',
        gates: [
          {
            id: 'g-xor',
            type: 'XOR',
            x: centerX - 70,
            y: centerY,
            inputs: [
              { label: 'A', wireX: centerX - 200, wireY: centerY - 15, level: swA },
              { label: 'B', wireX: centerX - 200, wireY: centerY + 15, level: swB },
            ],
            output: { label: 'A ⊕ B', wireX: centerX + 10, wireY: centerY, level: xorOut },
          },
          {
            id: 'g-not',
            type: 'NOT',
            x: centerX + 80,
            y: centerY,
            inputs: [{ label: 'A ⊕ B', wireX: centerX + 10, wireY: centerY, level: xorOut }],
            output: { label: 'A == B', wireX: centerX + 190, wireY: centerY, level: xnorOut },
          },
        ],
      };
    }

    // 4. XOR from 4 NAND Gates
    if (expText.includes('xor') && expText.includes('nand')) {
      const g1: LogicLevel = (swA === 1 && swB === 1) ? 0 : 1;
      const g2: LogicLevel = (swA === 1 && g1 === 1) ? 0 : 1;
      const g3: LogicLevel = (swB === 1 && g1 === 1) ? 0 : 1;
      const g4: LogicLevel = (g2 === 1 && g3 === 1) ? 0 : 1;

      return {
        formula: 'Y = ((A • (AB)\')\' • (B • (AB)\')\')\' = A ⊕ B',
        title: 'Universal NAND Realization of XOR Gate',
        gates: [
          {
            id: 'g-nand1',
            type: 'NAND',
            x: centerX - 130,
            y: centerY,
            inputs: [
              { label: 'A', wireX: centerX - 230, wireY: centerY - 15, level: swA },
              { label: 'B', wireX: centerX - 230, wireY: centerY + 15, level: swB },
            ],
            output: { label: '(AB)\'', wireX: centerX - 50, wireY: centerY, level: g1 },
          },
          {
            id: 'g-nand2',
            type: 'NAND',
            x: centerX,
            y: centerY - 65,
            inputs: [
              { label: 'A', wireX: centerX - 230, wireY: centerY - 65, level: swA },
              { label: '(AB)\'', wireX: centerX - 50, wireY: centerY, level: g1 },
            ],
            output: { label: 'G2', wireX: centerX + 70, wireY: centerY - 65, level: g2 },
          },
          {
            id: 'g-nand3',
            type: 'NAND',
            x: centerX,
            y: centerY + 65,
            inputs: [
              { label: '(AB)\'', wireX: centerX - 50, wireY: centerY, level: g1 },
              { label: 'B', wireX: centerX - 230, wireY: centerY + 65, level: swB },
            ],
            output: { label: 'G3', wireX: centerX + 70, wireY: centerY + 65, level: g3 },
          },
          {
            id: 'g-nand4',
            type: 'NAND',
            x: centerX + 130,
            y: centerY,
            inputs: [
              { label: 'G2', wireX: centerX + 70, wireY: centerY - 65, level: g2 },
              { label: 'G3', wireX: centerX + 70, wireY: centerY + 65, level: g3 },
            ],
            output: { label: 'A ⊕ B', wireX: centerX + 210, wireY: centerY, level: g4 },
          },
        ],
      };
    }

    // 5. Half Adder (Sum = XOR, Carry = AND)
    if (expId.includes('half-adder') || expText.includes('half adder')) {
      const sum: LogicLevel = swA !== swB ? 1 : 0;
      const carry: LogicLevel = (swA === 1 && swB === 1) ? 1 : 0;

      return {
        formula: 'Sum = A ⊕ B  |  Carry = A • B',
        title: 'Binary Half Adder Schematic',
        gates: [
          {
            id: 'g-xor',
            type: 'XOR',
            x: centerX,
            y: centerY - 55,
            inputs: [
              { label: 'A', wireX: centerX - 180, wireY: centerY - 70, level: swA },
              { label: 'B', wireX: centerX - 180, wireY: centerY - 40, level: swB },
            ],
            output: { label: 'Sum (S)', wireX: centerX + 180, wireY: centerY - 55, level: sum },
          },
          {
            id: 'g-and',
            type: 'AND',
            x: centerX,
            y: centerY + 55,
            inputs: [
              { label: 'A', wireX: centerX - 180, wireY: centerY + 40, level: swA },
              { label: 'B', wireX: centerX - 180, wireY: centerY + 70, level: swB },
            ],
            output: { label: 'Carry (C)', wireX: centerX + 180, wireY: centerY + 55, level: carry },
          },
        ],
      };
    }

    // 6. Basic NOT Gate (Inverter)
    if (expId.includes('not-gate') || expText.includes('inverter') || expText.includes('not gate')) {
      const outNot: LogicLevel = swA === 1 ? 0 : 1;
      return {
        formula: 'Y = A\' (Inversion)',
        title: '7404 Hex Inverter Gate Schematic',
        gates: [
          {
            id: 'g-not',
            type: 'NOT',
            x: centerX,
            y: centerY,
            inputs: [{ label: 'Input A', wireX: centerX - 180, wireY: centerY, level: swA }],
            output: { label: "Output Y (A')", wireX: centerX + 180, wireY: centerY, level: outNot },
          },
        ],
      };
    }

    // 7. Basic OR Gate
    if (expId.includes('or-gate') || expText.includes('or gate')) {
      const outOr: LogicLevel = (swA === 1 || swB === 1) ? 1 : 0;
      return {
        formula: 'Y = A + B',
        title: '7432 Quad 2-Input OR Gate Schematic',
        gates: [
          {
            id: 'g-or',
            type: 'OR',
            x: centerX,
            y: centerY,
            inputs: [
              { label: 'Input A', wireX: centerX - 180, wireY: centerY - 18, level: swA },
              { label: 'Input B', wireX: centerX - 180, wireY: centerY + 18, level: swB },
            ],
            output: { label: 'Output Y (A + B)', wireX: centerX + 180, wireY: centerY, level: outOr },
          },
        ],
      };
    }

    // Default: 2-Input AND Gate (7408)
    const outAnd: LogicLevel = (swA === 1 && swB === 1) ? 1 : 0;
    return {
      formula: 'Y = A • B',
      title: '7408 Quad 2-Input AND Gate Schematic',
      gates: [
        {
          id: 'g-and',
          type: 'AND',
          x: centerX,
          y: centerY,
          inputs: [
            { label: 'Input A', wireX: centerX - 180, wireY: centerY - 18, level: swA },
            { label: 'Input B', wireX: centerX - 180, wireY: centerY + 18, level: swB },
          ],
          output: { label: 'Output Y (A • B)', wireX: centerX + 180, wireY: centerY, level: outAnd },
        },
      ],
    };
  };

  // Main Schematic Rendering on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Deep Navy background (#131d27)
    ctx.fillStyle = '#131d27';
    ctx.fillRect(0, 0, width, height);

    // Subtle coordinate grid dots (Teal #567C8D / Navy #2F4156)
    ctx.fillStyle = 'rgba(86, 124, 141, 0.2)';
    const gridStep = 24;
    for (let x = 0; x < width; x += gridStep) {
      for (let y = 0; y < height; y += gridStep) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    const { gates } = deriveGates(width, height);

    // Helper: Draw standard IEEE Logic Gate Symbol
    const drawGateSymbol = (gate: GateNode) => {
      const { type, x, y } = gate;
      const w = 56;
      const h = 48;

      ctx.save();
      ctx.strokeStyle = '#C8D9E6'; // Sky Blue border
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#1b2735';   // Dark Navy fill

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;

      ctx.beginPath();

      if (type === 'AND' || type === 'NAND') {
        // Flat left edge, rounded right edge
        ctx.moveTo(x - w / 2, y - h / 2);
        ctx.lineTo(x, y - h / 2);
        ctx.arc(x, y, h / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x - w / 2, y + h / 2);
        ctx.closePath();
      } else if (type === 'OR' || type === 'NOR' || type === 'XOR') {
        // Curved inward back, pointed shield front
        ctx.moveTo(x - w / 2, y - h / 2);
        ctx.quadraticCurveTo(x - w / 4, y, x - w / 2, y + h / 2);
        ctx.quadraticCurveTo(x + w / 3, y + h / 2, x + w / 2, y);
        ctx.quadraticCurveTo(x + w / 3, y - h / 2, x - w / 2, y - h / 2);
        ctx.closePath();
      } else if (type === 'NOT') {
        // Triangle pointing right
        ctx.moveTo(x - w / 2, y - h / 2);
        ctx.lineTo(x + w / 3, y);
        ctx.lineTo(x - w / 2, y + h / 2);
        ctx.closePath();
      }

      ctx.fill();
      ctx.stroke();

      // Additional input arc for XOR Gate
      if (type === 'XOR') {
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - 8, y - h / 2);
        ctx.quadraticCurveTo(x - w / 4 - 8, y, x - w / 2 - 8, y + h / 2);
        ctx.stroke();
      }

      // Inversion bubble for NAND, NOR, NOT
      if (type === 'NAND' || type === 'NOR' || type === 'NOT') {
        const bubbleX = type === 'NOT' ? x + w / 3 + 4 : x + w / 2 + 5;
        ctx.beginPath();
        ctx.fillStyle = '#1b2735';
        ctx.arc(bubbleX, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Gate Model / Type Label
      ctx.fillStyle = '#F5EFEB'; // Beige text
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type, x - 2, y);

      ctx.restore();
    };

    // Helper: Draw Orthogonal Wires with Logic State & Pulse Animation
    const drawWire = (x1: number, y1: number, x2: number, y2: number, level: LogicLevel) => {
      const isHigh = level === 1;

      ctx.save();
      ctx.strokeStyle = isHigh ? '#C8D9E6' : '#567C8D';
      ctx.lineWidth = isHigh ? 2.5 : 1.5;

      if (isHigh) {
        ctx.shadowColor = 'rgba(200, 217, 230, 0.6)';
        ctx.shadowBlur = 6;
      }

      // Orthogonal Manhattan step routing
      const midX = (x1 + x2) / 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, y1);
      ctx.lineTo(midX, y2);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Solder junction dots
      ctx.fillStyle = isHigh ? '#FFFFFF' : '#567C8D';
      ctx.beginPath();
      ctx.arc(x1, y1, 3, 0, Math.PI * 2);
      ctx.arc(x2, y2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Animated traveling signal charge pulse when HIGH
      if (isHigh) {
        const t = pulsePhase;
        let px = 0;
        let py = 0;

        const seg1 = Math.abs(midX - x1);
        const seg2 = Math.abs(y2 - y1);
        const seg3 = Math.abs(x2 - midX);
        const total = seg1 + seg2 + seg3 || 1;

        const curDist = t * total;
        if (curDist <= seg1) {
          px = x1 + (midX - x1) * (curDist / seg1);
          py = y1;
        } else if (curDist <= seg1 + seg2) {
          px = midX;
          py = y1 + (y2 - y1) * ((curDist - seg1) / seg2);
        } else {
          px = midX + (x2 - midX) * ((curDist - seg1 - seg2) / seg3);
          py = y2;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    // Draw all gates and their interconnect wires
    gates.forEach((gate) => {
      // Connect each input wire to the gate entrance
      gate.inputs.forEach((input) => {
        const entranceX = gate.type === 'XOR' ? gate.x - 36 : gate.x - 28;
        drawWire(input.wireX, input.wireY, entranceX, input.wireY, input.level);

        // Input Pin Label
        ctx.fillStyle = input.level === 1 ? '#FFFFFF' : '#C8D9E6';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(input.label, input.wireX - 8, input.wireY + 3);
      });

      // Draw Gate Symbol
      drawGateSymbol(gate);

      // Connect gate output to destination
      const exitX = (gate.type === 'NAND' || gate.type === 'NOR')
        ? gate.x + 33
        : gate.type === 'NOT'
        ? gate.x + 23
        : gate.x + 28;

      drawWire(exitX, gate.y, gate.output.wireX, gate.output.wireY, gate.output.level);

      // Output Node Badge
      ctx.fillStyle = gate.output.level === 1 ? '#FFFFFF' : '#567C8D';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(gate.output.label, gate.output.wireX + 8, gate.output.wireY + 4);
    });

  }, [circuitState, activeExpId, pulsePhase]);

  // Derive title & formula for header badge
  const canvasW = canvasRef.current?.width || 800;
  const canvasH = canvasRef.current?.height || 500;
  const { formula, title } = deriveGates(canvasW, canvasH);

  return (
    <div className="relative w-full h-full bg-[#131d27] flex flex-col justify-between overflow-hidden touch-none select-none">
      {/* Top Schematic Information Header */}
      <div className="p-4 bg-[#1b2735]/90 backdrop-blur-xl border-b border-[#567C8D]/35 flex items-center justify-between z-10 text-[#F5EFEB]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2F4156] border border-[#567C8D]/40 flex items-center justify-center text-[#C8D9E6]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-sans font-semibold tracking-wider text-[#C8D9E6]">
              Boolean Logic Diagram (IEEE 91-1984)
            </div>
            <div className="text-sm font-semibold text-white tracking-tight font-serif">
              {title}
            </div>
          </div>
        </div>

        {/* Canonical Boolean Algebra Expression */}
        <div className="bg-[#131d27]/80 px-4 py-1.5 rounded-full border border-[#567C8D]/40 text-xs font-mono font-semibold text-[#C8D9E6] shadow-sm flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#C8D9E6]" />
          <span>{formula}</span>
        </div>
      </div>

      {/* Main Vector Schematic Canvas */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight - 140}
          className="w-full h-full block"
        />

        {/* Floating Input Switch Controllers (Left Side) */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/40 p-3 rounded-g2 shadow-2xl z-20">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] px-1">
            Logic Inputs
          </div>
          {circuitState.switches.map((sw) => (
            <button
              key={sw.id}
              onClick={() => toggleSwitch(sw.id)}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border transition ${
                sw.isClosed
                  ? 'bg-[#C8D9E6] text-[#131d27] border-[#C8D9E6] shadow-md'
                  : 'bg-[#2F4156] text-[#C8D9E6] border-[#567C8D]/40 hover:bg-[#3e546e]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {sw.isClosed ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4 text-[#567C8D]" />}
                <span>{sw.label}</span>
              </div>
              <span className="font-bold">{sw.isClosed ? '1' : '0'}</span>
            </button>
          ))}
        </div>

        {/* Output Lamp / LED Status (Right Side) */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/40 p-4 rounded-g2-xl shadow-2xl z-20">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
            Circuit Output
          </div>
          <div className="relative flex items-center justify-center my-1">
            <div
              className={`w-8 h-8 rounded-full transition-all duration-300 ${
                isAnyLedLit
                  ? 'bg-white shadow-[0_0_24px_rgba(255,255,255,1)] ring-4 ring-[#C8D9E6]/60'
                  : 'bg-[#2F4156] border border-[#567C8D]/40'
              }`}
            />
            {isAnyLedLit && (
              <div className="absolute w-3 h-3 rounded-full bg-white blur-[1px]" />
            )}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wide uppercase ${
              isAnyLedLit
                ? 'bg-[#C8D9E6] text-[#131d27]'
                : 'bg-[#131d27] text-[#C8D9E6]/60 border border-[#567C8D]/30'
            }`}
          >
            {isAnyLedLit ? 'HIGH (1)' : 'LOW (0)'}
          </span>
        </div>
      </div>

      {/* Bottom Hint Strip */}
      <div className="p-2.5 bg-[#1b2735]/80 backdrop-blur-md border-t border-[#567C8D]/30 flex items-center justify-between text-xs text-[#C8D9E6]/80 px-6 font-serif z-10">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#C8D9E6]" />
          <span>Click any input switch on the left to watch signals propagate through the logic gates.</span>
        </div>
        <div className="font-mono text-[10px] text-[#C8D9E6]/60">
          Sync: Real-Time Digital Twin
        </div>
      </div>
    </div>
  );
};
