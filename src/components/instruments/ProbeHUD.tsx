import React from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { Gauge, Sparkles, X } from 'lucide-react';

export const ProbeHUD: React.FC = () => {
  const { isProbeMode, probedNet, toggleProbeMode, probeHole } = useCircuitStore();

  if (!isProbeMode) return null;

  return (
    <div className="absolute top-48 left-4 right-4 z-20 pointer-events-auto flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-2">
      {probedNet ? (
        <div className="w-full max-w-md bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/40 rounded-g2-xl p-4 shadow-2xl flex flex-col gap-3 text-[#F5EFEB]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#567C8D]/25 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#2F4156] border border-[#567C8D]/40 flex items-center justify-center text-[#C8D9E6]">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5 font-serif">
                  <span>Hole {probedNet.holeId.toUpperCase()}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] font-mono border border-[#567C8D]/40">
                    {probedNet.section.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => probeHole(null)}
              className="w-6 h-6 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] hover:text-white flex items-center justify-center transition border border-[#567C8D]/30"
              title="Clear Selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Voltage & Logic Level Readout */}
          <div className="flex items-baseline justify-between bg-[#131d27]/70 p-3 rounded-g2 border border-[#567C8D]/30">
            <div>
              <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/80">
                Potential / Logic State
              </div>
              <div className="text-xl font-bold font-mono tracking-tight text-white mt-0.5">
                {probedNet.voltageText}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wide uppercase ${
                  probedNet.isShort
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : probedNet.logicLevel === 1
                    ? 'bg-[#C8D9E6] text-[#131d27] font-bold shadow-sm'
                    : probedNet.logicLevel === 0
                    ? 'bg-[#2F4156] text-[#C8D9E6] border border-[#567C8D]/40'
                    : 'bg-[#131d27] text-[#C8D9E6]/60 border border-[#567C8D]/20'
                }`}
              >
                {probedNet.isShort
                  ? 'SHORT CIRCUIT'
                  : probedNet.logicLevel === 1
                  ? 'LOGIC 1 (HIGH)'
                  : probedNet.logicLevel === 0
                  ? 'LOGIC 0 (LOW)'
                  : 'FLOATING (Z)'}
              </span>
            </div>
          </div>

          {/* Connected Components & Net Statistics */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
              Interconnections on this Net ({probedNet.connectedHoles.length} holes):
            </div>
            {probedNet.connectedComponents.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {probedNet.connectedComponents.map((comp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[11px] text-[#C8D9E6] font-mono"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[#C8D9E6]/70 font-serif italic">
                Tie-point open; no discrete components attached directly to this hole.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Hint pill when in probe mode */
        <div className="bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/40 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 text-xs text-[#F5EFEB]">
          <Sparkles className="w-3.5 h-3.5 text-[#C8D9E6] animate-pulse" />
          <span className="font-serif">Tap any breadboard hole to probe voltage and trace its electrical net.</span>
          <button
            onClick={toggleProbeMode}
            className="ml-2 w-5 h-5 rounded-full bg-[#2F4156] hover:bg-[#3e546e] flex items-center justify-center text-[#C8D9E6] hover:text-white transition border border-[#567C8D]/30"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
