import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { AlertCircle, Camera, ChevronDown, Compass, Cpu, Sparkles, X } from 'lucide-react';

export const RouteBar: React.FC = () => {
  const {
    experiments,
    activeExpId,
    selectExperiment,
    activeMode,
    setMode,
    isDeadShort,
  } = useCircuitStore();

  const [showExpPicker, setShowExpPicker] = useState(false);
  const activeExp = experiments.find((e) => e.id === activeExpId);

  return (
    <>
      {/* Top Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-col gap-2.5 pointer-events-auto">
        <div className="bg-[#0d0f14]/85 backdrop-blur-xl border border-white/10 rounded-g2-lg p-2.5 shadow-2xl flex items-center justify-between gap-3">
          {/* Experiment Title Selector */}
          <button
            onClick={() => setShowExpPicker(!showExpPicker)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-white/5 p-1.5 rounded-g2 transition"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/15">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] tracking-wide text-obsidian-300 flex items-center gap-1">
                <span>{activeExp?.category}</span>
                <ChevronDown className="w-3 h-3 text-obsidian-400" />
              </div>
              <div className="text-sm font-semibold text-white truncate tracking-tight">
                {activeExp?.title}
              </div>
            </div>
          </button>

          {/* Mode Switcher: Guide vs Scan */}
          <div className="flex items-center bg-black/60 p-1 rounded-full border border-white/10 shrink-0">
            <button
              onClick={() => setMode('GUIDE')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                activeMode === 'GUIDE'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-obsidian-300 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <button
              onClick={() => setMode('SCAN_CAMERA')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                activeMode === 'SCAN_CAMERA'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-obsidian-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan</span>
            </button>
          </div>
        </div>

        {/* Short Circuit Warning Alert */}
        {isDeadShort && (
          <div className="bg-[#171a22] text-white text-xs font-medium px-4 py-2.5 rounded-g2 border border-white/20 flex items-center gap-2.5 shadow-xl animate-pulse">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <span>Short circuit detected: Power rails VCC and GND are bridged.</span>
          </div>
        )}
      </div>

      {/* Experiment Picker Modal */}
      {showExpPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 pt-20">
          <div className="bg-[#0d0f14] border border-white/15 rounded-g2-xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-obsidian-200" />
                Select Experiment
              </h3>
              <button
                onClick={() => setShowExpPicker(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-obsidian-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {experiments.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => {
                    selectExperiment(exp.id);
                    setShowExpPicker(false);
                  }}
                  className={`p-3.5 rounded-g2 text-left border transition flex flex-col gap-1 ${
                    exp.id === activeExpId
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] text-obsidian-300'
                  }`}
                >
                  <div className="text-[10px] tracking-wider uppercase text-obsidian-400 font-sans font-semibold">
                    {exp.category}
                  </div>
                  <div className="text-sm font-medium text-white">{exp.title}</div>
                  <div className="text-xs text-obsidian-300 line-clamp-2 leading-relaxed font-serif">
                    {exp.aim}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
