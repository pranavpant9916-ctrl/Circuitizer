import React, { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { PlacedSwitch } from '../../types/circuit';
import { Activity, ChevronDown, ChevronUp, Play, Pause, RotateCw, ToggleLeft, ToggleRight, X } from 'lucide-react';

export const LogicAnalyzerDock: React.FC = () => {
  const {
    isAnalyzerOpen,
    toggleAnalyzer,
    isSimRunning,
    toggleSimulation,
    stepClock,
    clockHz,
    setClockHz,
    waveforms,
    circuitState,
    toggleSwitch,
  } = useCircuitStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isAnalyzerOpen) return null;

  // Simulation interval loop when isSimRunning is true
  useEffect(() => {
    if (!isSimRunning) return;
    const intervalMs = (1 / clockHz) * 1000;
    const timer = setInterval(() => {
      stepClock();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isSimRunning, clockHz, stepClock]);

  // Draw Waveforms on Canvas using the Monochrome Obsidian Palette
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMinimized) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Pure black background matching the palette
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e2029';
    ctx.lineWidth = 1;
    // Horizontal track separators (4 channels: CLK, A, B, Y)
    const channelHeight = height / 4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * channelHeight);
      ctx.lineTo(width, i * channelHeight);
      ctx.stroke();
    }

    if (waveforms.length < 2) return;

    // Palette shades from the image
    const channels = [
      { name: 'CLK', color: '#ffffff', key: 'clk' },
      { name: 'A', color: '#cfd3dd', key: 'inputA' },
      { name: 'B', color: '#a3a9b7', key: 'inputB' },
      { name: 'OUT Y', color: '#ffffff', key: 'outY' },
    ];

    const stepWidth = Math.max(12, width / 28);

    channels.forEach((ch, chIdx) => {
      const topY = chIdx * channelHeight + 6;
      const botY = (chIdx + 1) * channelHeight - 6;

      ctx.save();
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
      ctx.shadowBlur = 4;

      ctx.beginPath();
      waveforms.forEach((pt, pIdx) => {
        const x = pIdx * stepWidth;
        const val = (pt as any)[ch.key];
        const y = val === 1 ? topY : botY;

        if (pIdx === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevVal = (waveforms[pIdx - 1] as any)[ch.key];
          const prevY = prevVal === 1 ? topY : botY;
          // Step transition
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.restore();

      // Channel label
      ctx.fillStyle = '#787f8f';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.fillText(ch.name, 8, topY + 12);
    });
  }, [waveforms, isMinimized]);

  return (
    <div className="absolute left-4 right-4 bottom-32 z-20 pointer-events-auto">
      <div className="bg-[#0d0f14]/90 backdrop-blur-xl border border-white/10 rounded-g2-xl shadow-2xl overflow-hidden">
        {/* Dock Header */}
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white tracking-tight">
              Waveform Analyzer
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={toggleSimulation}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                isSimRunning
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              {isSimRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isSimRunning ? 'Pause' : 'Run'}</span>
            </button>

            {/* Single Step Pulse */}
            <button
              onClick={stepClock}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-obsidian-200 hover:text-white transition"
              title="Step Clock Pulse"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Minimize / Expand */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-obsidian-300 hover:text-white transition"
              title={isMinimized ? 'Expand' : 'Collapse'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Close Dock */}
            <button
              onClick={toggleAnalyzer}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-obsidian-300 hover:text-white transition"
              title="Close Waveform Analyzer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Waveform Screen & Controls */}
        {!isMinimized && (
          <div className="p-3 flex flex-col gap-2.5">
            {/* Waveform Canvas */}
            <div className="w-full h-24 bg-[#06070a] rounded-g2 overflow-hidden border border-white/5">
              <canvas
                ref={canvasRef}
                width={360}
                height={96}
                className="w-full h-full block"
              />
            </div>

            {/* Input Switches & Frequency */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-obsidian-400">
                  Inputs:
                </span>
                {circuitState.switches.map((sw: PlacedSwitch) => (
                  <button
                    key={sw.id}
                    onClick={() => toggleSwitch(sw.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border transition ${
                      sw.isClosed
                        ? 'bg-white text-black font-semibold border-white'
                        : 'bg-white/5 border-white/10 text-obsidian-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {sw.isClosed ? (
                      <ToggleRight className="w-3.5 h-3.5 text-black" />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5 text-obsidian-400" />
                    )}
                    <span>{sw.label}: {sw.isClosed ? 'HIGH' : 'LOW'}</span>
                  </button>
                ))}
              </div>

              {/* Frequency Selector */}
              <select
                value={clockHz}
                onChange={(e) => setClockHz(Number(e.target.value))}
                className="bg-white/5 border border-white/10 text-obsidian-200 text-xs rounded-full px-2.5 py-1 focus:outline-none focus:border-white/30 font-mono"
              >
                <option value={0.5} className="bg-[#0d0f14] text-white">0.5 Hz</option>
                <option value={1} className="bg-[#0d0f14] text-white">1.0 Hz</option>
                <option value={2} className="bg-[#0d0f14] text-white">2.0 Hz</option>
                <option value={5} className="bg-[#0d0f14] text-white">5.0 Hz</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
