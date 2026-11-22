import React, { useEffect, useRef } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { LogicLevel } from '../../types/circuit';
import { BooleanCompiler, CompiledGateOp } from '../../engine/booleanCompiler';
import { Info, ToggleLeft, ToggleRight, Zap } from 'lucide-react';

interface GatePort {
  sourceId: string;
  label: string;
  portX: number;
  portY: number;
  level: LogicLevel;
}

interface GateNode {
  id: string;
  type: 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | '555' | 'JK_FF';
  x: number;
  y: number;
  layer: number;
  entranceX: number;
  exitX: number;
  inputs: GatePort[];
  output: {
    label: string;
    portX: number;
    portY: number;
    level: LogicLevel;
  };
}

interface SchematicWire {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  level: LogicLevel;
  label?: string;
}

export const BooleanDiagramCanvas: React.FC = () => {
  const {
    experiments,
    activeExpId,
    circuitState,
    toggleSwitch,
  } = useCircuitStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulsePhaseRef = useRef<number>(0);

  const activeExp = experiments.find((e) => e.id === activeExpId);

  // Resize canvas responsively with window
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = Math.max(400, window.innerHeight - 140);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAnyLedLit = circuitState.leds.some((l) => l.isLit);

  // Derive schematic topology based on active experiment or arbitrary formula
  const deriveSchematic = (
    width: number,
    height: number
  ): { gates: GateNode[]; wires: SchematicWire[]; formula: string; title: string } => {
    const centerX = width / 2;
    const centerY = height / 2;

    const expText = `${activeExp?.title || ''} ${activeExp?.aim || ''}`.toLowerCase();

    // 1. Specialized Sequential Block: NE555 Timer in Astable Mode
    if (expText.includes('555') || expText.includes('astable')) {
      const clkVal = isAnyLedLit ? 1 : 0;
      return {
        formula: 'f ≈ 1.44 / ((RA + 2RB) • C)',
        title: 'NE555 Astable Multivibrator Waveform Generator',
        gates: [
          {
            id: 'g-555',
            type: '555',
            x: centerX,
            y: centerY,
            layer: 1,
            entranceX: centerX - 50,
            exitX: centerX + 50,
            inputs: [
              { sourceId: 'VCC', label: 'VCC (8)', portX: centerX - 50, portY: centerY - 40, level: 1 },
              { sourceId: 'TRIG', label: 'TRIG (2)', portX: centerX - 50, portY: centerY - 15, level: clkVal },
              { sourceId: 'THRES', label: 'THRES (6)', portX: centerX - 50, portY: centerY + 15, level: clkVal },
              { sourceId: 'GND', label: 'GND (1)', portX: centerX - 50, portY: centerY + 40, level: 0 },
            ],
            output: { label: 'OUT Pin 3 (Square Wave)', portX: centerX + 50, portY: centerY, level: clkVal },
          },
        ],
        wires: [
          {
            id: 'wire-555-out',
            fromX: centerX + 50,
            fromY: centerY,
            toX: width - 180,
            toY: centerY,
            level: clkVal,
            label: 'CLK Out',
          },
        ],
      };
    }

    // 2. Specialized Sequential Block: 7476 Dual JK Flip-Flop
    if (expText.includes('7476') || expText.includes('jk')) {
      const jVal = circuitState.switches.find((s) => s.id === 'sw-a')?.isClosed ? 1 : 0;
      const kVal = circuitState.switches.find((s) => s.id === 'sw-b')?.isClosed ? 1 : 0;
      const qVal: LogicLevel = isAnyLedLit ? 1 : 0;
      return {
        formula: 'Q(next) = J • Q\' + K\' • Q',
        title: '7476 Dual Master-Slave JK Flip-Flop',
        gates: [
          {
            id: 'g-jk',
            type: 'JK_FF',
            x: centerX,
            y: centerY,
            layer: 1,
            entranceX: centerX - 50,
            exitX: centerX + 50,
            inputs: [
              { sourceId: 'J', label: 'J Input', portX: centerX - 50, portY: centerY - 25, level: jVal },
              { sourceId: 'CLK', label: 'CLK Clock', portX: centerX - 50, portY: centerY, level: 1 },
              { sourceId: 'K', label: 'K Input', portX: centerX - 50, portY: centerY + 25, level: kVal },
            ],
            output: { label: 'Q State Output', portX: centerX + 50, portY: centerY, level: qVal },
          },
        ],
        wires: [
          {
            id: 'wire-jk-out',
            fromX: centerX + 50,
            fromY: centerY,
            toX: width - 180,
            toY: centerY,
            level: qVal,
            label: 'Q',
          },
        ],
      };
    }

    // 3. Universal Topological DAG Schematic Synthesis (Standard Experiments + Arbitrary Desmos Formulas)
    let candidateFormula = 'Y = A • B';
    let title = activeExp?.title || 'Boolean Logic Diagram';

    if (activeExp?.title?.includes('Compiled Logic:')) {
      candidateFormula = activeExp.title.replace('Compiled Logic:', '').trim();
    } else if (activeExp?.theory?.includes('Formula:') || activeExp?.theory?.includes('equation:')) {
      const match = activeExp.theory.match(/(?:Formula|equation):\s*([^\.\n]+)/i);
      if (match && match[1]) candidateFormula = match[1].trim();
    } else {
      if (expText.includes('majority') || expText.includes('voter')) candidateFormula = 'Y = (A • B) + (B • C) + (A • C)';
      else if (expText.includes('multiplexer') || expText.includes('mux')) candidateFormula = "Y = (S' • D0) + (S • D1)";
      else if (expText.includes('half adder')) candidateFormula = 'Y = A ⊕ B';
      else if (expText.includes('xor') && expText.includes('nand')) candidateFormula = "Y = ((A • (A • B)')' • (B • (A • B)')')'";
      else if (expText.includes('comparator') || expText.includes('equality')) candidateFormula = "Y = (A • B) + (A' • B')";
      else if (expText.includes('nand')) candidateFormula = "Y = (A • B)'";
      else if (expText.includes('nor')) candidateFormula = "Y = (A + B)'";
      else if (expText.includes('not') || expText.includes('inverter')) candidateFormula = "Y = A'";
      else if (expText.includes('or')) candidateFormula = 'Y = A + B';
      else if (expText.includes('and')) candidateFormula = 'Y = A • B';
    }

    try {
      const multi = BooleanCompiler.parseMultiExpression(candidateFormula);
      const ops: CompiledGateOp[] = [];
      let counter = 1;
      multi.outputs.forEach((out, idx) => {
        const linearized = BooleanCompiler.linearizeGates(out.ast, counter, `g${idx + 1}`);
        counter = linearized.nextCounter;
        ops.push(...linearized.ops);
      });

      if (ops.length > 0) {
        // Read input switch levels from current digital twin state
        const env: Record<string, 0 | 1> = {};
        multi.allVariables.forEach((v) => {
          const sw = circuitState.switches.find(
            (s) => s.id === `sw-${v.toLowerCase()}` || s.label.toUpperCase().includes(v.toUpperCase())
          );
          env[v] = sw?.isClosed ? 1 : 0;
        });

        // Compute topological layers (ranks) for each gate
        const gateLayerMap: Record<string, number> = {};
        for (const op of ops) {
          let maxInLayer = 0;
          for (const inp of op.inputs) {
            if (gateLayerMap[inp] !== undefined) {
              maxInLayer = Math.max(maxInLayer, gateLayerMap[inp]);
            }
          }
          gateLayerMap[op.id] = maxInLayer + 1;
        }

        const maxLayer = Math.max(...Object.values(gateLayerMap), 1);

        // Group operations by layer
        const layerGroups: Record<number, CompiledGateOp[]> = {};
        for (let l = 1; l <= maxLayer; l++) layerGroups[l] = [];
        for (const op of ops) {
          layerGroups[gateLayerMap[op.id]].push(op);
        }

        // Layout bounds (leaving room for inputs on left and output lamp on right)
        const leftBoundary = Math.max(260, width * 0.24);
        const rightBoundary = Math.min(width - 240, width * 0.74);
        const colStep = maxLayer > 1 ? (rightBoundary - leftBoundary) / (maxLayer - 1) : 0;

        // Evaluate logic levels for all gates in topological order
        const gateLevels: Record<string, LogicLevel> = {};
        for (const op of ops) {
          const inLevels: LogicLevel[] = op.inputs.map((inp) => {
            const inpStr = String(inp);
            if (env[inpStr] !== undefined) return env[inpStr];
            if (gateLevels[inpStr] !== undefined) return gateLevels[inpStr];
            if (inpStr === '1') return 1;
            if (inpStr === '0') return 0;
            return 0;
          });

          let outLevel: LogicLevel = 0;
          if (op.op === 'NOT') outLevel = inLevels[0] === 1 ? 0 : 1;
          else if (op.op === 'AND') outLevel = inLevels.every((l) => l === 1) ? 1 : 0;
          else if (op.op === 'OR') outLevel = inLevels.some((l) => l === 1) ? 1 : 0;
          else if (op.op === 'XOR') outLevel = inLevels[0] !== inLevels[1] ? 1 : 0;
          else if (op.op === 'NAND') outLevel = inLevels.every((l) => l === 1) ? 0 : 1;
          else if (op.op === 'NOR') outLevel = inLevels.some((l) => l === 1) ? 0 : 1;
          else if (op.op === 'XNOR') outLevel = inLevels[0] === inLevels[1] ? 1 : 0;
          gateLevels[op.outputId] = outLevel;
        }

        // Compute gate coordinates and port locations
        const gateNodes: GateNode[] = [];
        const gateNodeMap: Record<string, GateNode> = {};

        for (let l = 1; l <= maxLayer; l++) {
          const group = layerGroups[l] || [];
          const K = group.length;
          const verticalSpacing = Math.min(130, Math.max(85, (height - 240) / Math.max(K, 1)));
          const startY = centerY - ((K - 1) * verticalSpacing) / 2;
          const gateX = maxLayer === 1 ? centerX : leftBoundary + (l - 1) * colStep;

          group.forEach((op, j) => {
            const gateY = startY + j * verticalSpacing;
            const entranceX = op.op === 'XOR' || op.op === 'XNOR' ? gateX - 36 : gateX - 28;
            const exitX =
              op.op === 'NOT'
                ? gateX + 23
                : op.op === 'NAND' || op.op === 'NOR'
                ? gateX + 33
                : gateX + 28;

            // Compute input ports
            const inputPorts: GatePort[] = op.inputs.map((inp, iIdx) => {
              let portY = gateY;
              if (op.op !== 'NOT') {
                if (op.inputs.length === 2) {
                  portY = gateY + (iIdx === 0 ? -14 : 14);
                } else if (op.inputs.length >= 3) {
                  const step = 28 / (op.inputs.length - 1);
                  portY = gateY - 14 + iIdx * step;
                }
              }

              const inpStr = String(inp);
              const inLevel =
                env[inpStr] !== undefined
                  ? env[inpStr]
                  : gateLevels[inpStr] !== undefined
                  ? gateLevels[inpStr]
                  : 0;

              return {
                sourceId: inpStr,
                label: env[inpStr] !== undefined ? inpStr : '',
                portX: entranceX,
                portY,
                level: inLevel,
              };
            });

            const outLevel = gateLevels[op.outputId] ?? 0;

            const node: GateNode = {
              id: op.id,
              type: op.op,
              x: gateX,
              y: gateY,
              layer: l,
              entranceX,
              exitX,
              inputs: inputPorts,
              output: {
                label: op.outputLabel,
                portX: exitX,
                portY: gateY,
                level: outLevel,
              },
            };

            gateNodes.push(node);
            gateNodeMap[op.id] = node;
          });
        }

        // Map primary input switch Y positions on the left panel
        const numSwitches = multi.allVariables.length || 1;
        const swSpacing = 44;
        const swStartY = centerY - ((numSwitches - 1) * swSpacing) / 2;
        const switchYMap: Record<string, number> = {};
        multi.allVariables.forEach((v, idx) => {
          switchYMap[v] = swStartY + idx * swSpacing;
        });

        // Generate clean Manhattan interconnect wires
        const wires: SchematicWire[] = [];
        const inputBusX = 175; // Right edge of Logic Inputs HUD panel

        // 1. Connect input ports to sources (upstream gate outputs OR primary switch inputs)
        gateNodes.forEach((gate) => {
          gate.inputs.forEach((port, pIdx) => {
            const srcId = port.sourceId;

            if (gateNodeMap[srcId]) {
              // Driven by an upstream gate
              const upGate = gateNodeMap[srcId];
              wires.push({
                id: `wire-${upGate.id}-to-${gate.id}-in${pIdx}`,
                fromX: upGate.output.portX,
                fromY: upGate.output.portY,
                toX: port.portX,
                toY: port.portY,
                level: port.level,
                label: upGate.output.label,
              });
            } else {
              // Driven by a primary variable switch
              const startY = switchYMap[srcId] ?? port.portY;
              wires.push({
                id: `wire-sw-${srcId}-to-${gate.id}-in${pIdx}`,
                fromX: inputBusX,
                fromY: startY,
                toX: port.portX,
                toY: port.portY,
                level: port.level,
                label: srcId,
              });
            }
          });
        });

        // 2. Connect the output gates into the Circuit Output LED indicator(s)
        const outputBusX = width - 170; // Left edge of Circuit Output HUD panel
        const numOutputs = multi.outputs.length;
        const outSpacing = Math.min(60, (height - 200) / Math.max(numOutputs, 1));
        const outStartY = centerY - ((numOutputs - 1) * outSpacing) / 2;

        multi.outputs.forEach((out, oIdx) => {
          const outPrefix = `g${oIdx + 1}_`;
          const outGates = gateNodes.filter((g) => g.id.startsWith(outPrefix));
          const termGate =
            outGates.find((g) => !outGates.some((other) => other.inputs.some((inp) => inp.sourceId === g.id))) ||
            outGates[outGates.length - 1] ||
            gateNodes[gateNodes.length - 1];

          if (termGate) {
            const outY = outStartY + oIdx * outSpacing;
            wires.push({
              id: `wire-final-to-output-${oIdx}`,
              fromX: termGate.output.portX,
              fromY: termGate.output.portY,
              toX: outputBusX,
              toY: outY,
              level: termGate.output.level,
              label: out.normalizedExpr,
            });
          }
        });

        return {
          formula: multi.combinedFormula,
          title,
          gates: gateNodes,
          wires,
        };
      }
    } catch (err) {
      console.warn('Topological schematic synthesis fallback:', err);
    }

    // Default Baseline: 2-Input AND Gate (7408)
    const swA = circuitState.switches.find((s) => s.id === 'sw-a')?.isClosed ? 1 : 0;
    const swB = circuitState.switches.find((s) => s.id === 'sw-b')?.isClosed ? 1 : 0;
    const outAnd: LogicLevel = swA === 1 && swB === 1 ? 1 : 0;

    return {
      formula: 'Y = A • B',
      title: '7408 Quad 2-Input AND Gate Schematic',
      gates: [
        {
          id: 'g-and',
          type: 'AND',
          x: centerX,
          y: centerY,
          layer: 1,
          entranceX: centerX - 28,
          exitX: centerX + 28,
          inputs: [
            { sourceId: 'A', label: 'A', portX: centerX - 28, portY: centerY - 14, level: swA },
            { sourceId: 'B', label: 'B', portX: centerX - 28, portY: centerY + 14, level: swB },
          ],
          output: { label: 'A • B', portX: centerX + 28, portY: centerY, level: outAnd },
        },
      ],
      wires: [
        { id: 'w-a', fromX: 175, fromY: centerY - 22, toX: centerX - 28, toY: centerY - 14, level: swA, label: 'A' },
        { id: 'w-b', fromX: 175, fromY: centerY + 22, toX: centerX - 28, toY: centerY + 14, level: swB, label: 'B' },
        { id: 'w-out', fromX: centerX + 28, fromY: centerY, toX: width - 170, toY: centerY, level: outAnd, label: 'Y = A • B' },
      ],
    };
  };

  // Main Schematic Rendering Loop on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      pulsePhaseRef.current = (pulsePhaseRef.current + 0.035) % 1;
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

      const { gates, wires } = deriveSchematic(width, height);

      // Helper: Draw standard IEEE Logic Gate Symbol
      const drawGateSymbol = (gate: GateNode) => {
        const { type, x, y } = gate;
        const w = 56;
        const h = 48;

        ctx.save();
        ctx.strokeStyle = '#C8D9E6'; // Sky Blue border
        ctx.lineWidth = 2.5;
        ctx.fillStyle = '#1b2735'; // Dark Navy fill

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
        } else if (type === 'OR' || type === 'NOR' || type === 'XOR' || type === 'XNOR') {
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
        } else if (type === '555' || type === 'JK_FF') {
          // Dual In-Line rectangular IC block
          ctx.roundRect(x - 50, y - 55, 100, 110, 8);
        }

        ctx.fill();
        ctx.stroke();

        // Additional curved input arc for XOR / XNOR Gate
        if (type === 'XOR' || type === 'XNOR') {
          ctx.beginPath();
          ctx.moveTo(x - w / 2 - 8, y - h / 2);
          ctx.quadraticCurveTo(x - w / 4 - 8, y, x - w / 2 - 8, y + h / 2);
          ctx.stroke();
        }

        // Inversion bubble for NAND, NOR, NOT, XNOR
        if (type === 'NAND' || type === 'NOR' || type === 'NOT' || type === 'XNOR') {
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

      // Helper: Draw Orthogonal Manhattan Wires with Logic State & Pulse Animation
      const drawWire = (wire: SchematicWire) => {
        const { fromX, fromY, toX, toY, level, label } = wire;
        const isHigh = level === 1;

        ctx.save();
        ctx.strokeStyle = isHigh ? '#C8D9E6' : '#567C8D';
        ctx.lineWidth = isHigh ? 2.5 : 1.5;

        if (isHigh) {
          ctx.shadowColor = 'rgba(200, 217, 230, 0.6)';
          ctx.shadowBlur = 6;
        }

        // Manhattan 3-segment routing with midpoint step
        const midX = (fromX + toX) / 2;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(midX, fromY);
        ctx.lineTo(midX, toY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Solder connection points
        ctx.fillStyle = isHigh ? '#FFFFFF' : '#567C8D';
        ctx.beginPath();
        ctx.arc(fromX, fromY, 2.5, 0, Math.PI * 2);
        ctx.arc(toX, toY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Wire signal label
        if (label) {
          ctx.fillStyle = isHigh ? '#FFFFFF' : '#C8D9E6';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          // Print label near the source
          ctx.fillText(label, fromX + 8, fromY - 6);
        }

        // Animated traveling electron pulse when HIGH
        if (isHigh) {
          const t = pulsePhaseRef.current;
          const seg1 = Math.abs(midX - fromX);
          const seg2 = Math.abs(toY - fromY);
          const seg3 = Math.abs(toX - midX);
          const total = seg1 + seg2 + seg3 || 1;

          const curDist = t * total;
          let px = 0;
          let py = 0;

          if (curDist <= seg1) {
            px = fromX + (midX - fromX) * (curDist / (seg1 || 1));
            py = fromY;
          } else if (curDist <= seg1 + seg2) {
            px = midX;
            py = fromY + (toY - fromY) * ((curDist - seg1) / (seg2 || 1));
          } else {
            px = midX + (toX - midX) * ((curDist - seg1 - seg2) / (seg3 || 1));
            py = toY;
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

      // 1. Draw all Interconnect Wires first
      wires.forEach((wire) => {
        drawWire(wire);
      });

      // 2. Draw all Gates over wires
      gates.forEach((gate) => {
        drawGateSymbol(gate);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [circuitState, activeExpId]);

  // Derive title & formula for header badge
  const canvasW = canvasRef.current?.width || 800;
  const canvasH = canvasRef.current?.height || 500;
  const { formula, title } = deriveSchematic(canvasW, canvasH);

  return (
    <div className="relative w-full h-full bg-[#131d27] flex flex-col justify-between overflow-hidden touch-none select-none">
      {/* Top Schematic Information Header */}
      <div className="p-4 bg-[#1b2735] border-b border-[#567C8D]/35 flex items-center justify-between z-10 text-[#F5EFEB]">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#C8D9E6] shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-sans font-semibold tracking-wider text-[#C8D9E6]">
              Boolean Logic Diagram (IEEE 91-1984)
            </div>
            <div className="text-sm font-semibold text-white tracking-tight font-serif">
              {title}
            </div>
          </div>
        </div>

        {/* Canonical Boolean Algebra Expression Badge */}
        <div className="bg-[#131d27] px-3.5 py-1.5 rounded-g2-sm border border-[#567C8D]/40 text-xs font-mono font-semibold text-[#C8D9E6] shadow-sm flex items-center gap-2">
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
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 bg-[#1b2735] border border-[#567C8D]/40 p-3 rounded-g2 shadow-md z-20">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] px-1">
            Logic Inputs
          </div>
          {circuitState.switches.map((sw) => (
            <button
              key={sw.id}
              onClick={() => toggleSwitch(sw.id)}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-g2-sm text-xs font-mono font-semibold border transition ${
                sw.isClosed
                  ? 'bg-[#C8D9E6] text-[#131d27] border-[#C8D9E6] shadow-sm'
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
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-[#1b2735] border border-[#567C8D]/40 p-4 rounded-g2-xl shadow-md z-20">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
            Circuit Output
          </div>
          {circuitState.leds.length > 1 ? (
            <div className="flex flex-col gap-2 my-1">
              {circuitState.leds.map((led, lIdx) => {
                const colorHex =
                  led.color === 'red' ? '#ef4444' :
                  led.color === 'green' ? '#10b981' :
                  led.color === 'yellow' ? '#eab308' :
                  led.color === 'blue' ? '#3b82f6' : '#ffffff';
                const label = lIdx === 0 ? 'SUM / Y1' : lIdx === 1 ? 'COUT / Y2' : `OUT ${lIdx + 1}`;
                return (
                  <div key={led.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-g2-sm bg-[#131d27] border border-[#567C8D]/30 min-w-[125px]">
                    <span className="text-[11px] font-mono font-bold text-[#C8D9E6]">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-semibold" style={{ color: led.isLit ? colorHex : '#567C8D' }}>
                        {led.isLit ? '1' : '0'}
                      </span>
                      <div
                        className="w-3.5 h-3.5 rounded-full transition-all"
                        style={{
                          backgroundColor: led.isLit ? colorHex : '#2F4156',
                          boxShadow: led.isLit ? `0 0 10px ${colorHex}` : 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
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
                className={`px-3 py-1 rounded-g2-sm text-[11px] font-mono font-bold tracking-wide uppercase ${
                  isAnyLedLit
                    ? 'bg-[#C8D9E6] text-[#131d27]'
                    : 'bg-[#131d27] text-[#C8D9E6]/60 border border-[#567C8D]/30'
                }`}
              >
                {isAnyLedLit ? 'HIGH (1)' : 'LOW (0)'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Hint Strip */}
      <div className="p-2.5 bg-[#1b2735] border-t border-[#567C8D]/30 flex items-center justify-between text-xs text-[#C8D9E6]/80 px-6 font-serif z-10">
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
