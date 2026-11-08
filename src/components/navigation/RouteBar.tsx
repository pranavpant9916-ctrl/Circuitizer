import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { AICircuitCopilot } from './AICircuitCopilot';
import { AlertCircle, Camera, ChevronDown, Compass, Cpu, Grid, Sparkles, X, Zap } from 'lucide-react';

export const RouteBar: React.FC = () => {
  const {
    experiments,
    activeExpId,
    selectExperiment,
    activeMode,
    setMode,
    viewMode,
    setViewMode,
    isDeadShort,
  } = useCircuitStore();

  const [showExpPicker, setShowExpPicker] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const activeExp = experiments.find((e) => e.id === activeExpId);

  return (
    <>
      {/* Top Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-col gap-2.5 pointer-events-auto">
        <div className="bg-[#1b2735]/90 backdrop-blur-xl border border-[#567C8D]/35 rounded-g2-lg p-2.5 shadow-2xl flex items-center justify-between gap-3 text-[#F5EFEB]">
          {/* Experiment Title Selector */}
          <button
            onClick={() => setShowExpPicker(!showExpPicker)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-[#2F4156]/50 p-1.5 rounded-g2 transition"
          >
            <div className="w-8 h-8 rounded-full bg-[#2F4156] text-[#C8D9E6] flex items-center justify-center shrink-0 border border-[#567C8D]/40 shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] tracking-wide text-[#C8D9E6] flex items-center gap-1 font-sans">
                <span>{activeExp?.category}</span>
                <ChevronDown className="w-3 h-3 text-[#567C8D]" />
              </div>
              <div className="text-sm font-semibold text-[#F5EFEB] truncate tracking-tight font-serif">
                {activeExp?.title}
              </div>
            </div>
          </button>

          {/* AI Aim Evaluator & Feasibility Action Pill */}
          <button
            onClick={() => setShowCopilot(true)}
            className="px-3 py-1.5 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#F5EFEB] border border-[#567C8D]/40 text-xs font-medium flex items-center gap-1.5 transition shadow-sm shrink-0"
            title="Evaluate lab aim feasibility and generate step roadmap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C8D9E6]" />
            <span className="hidden sm:inline">AI Aim Evaluator</span>
            <span className="sm:hidden">AI Aim</span>
          </button>

          {/* Single-Toggle: Breadboard vs Boolean Diagram */}
          <div className="flex items-center bg-[#131d27]/80 p-1 rounded-full border border-[#567C8D]/30 shrink-0">
            <button
              onClick={() => setViewMode('BREADBOARD')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'BREADBOARD'
                  ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                  : 'text-[#C8D9E6]/70 hover:text-white'
              }`}
              title="Switch to physical 830-tie breadboard layout"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Breadboard</span>
            </button>

            <button
              onClick={() => setViewMode('BOOLEAN_DIAGRAM')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'BOOLEAN_DIAGRAM'
                  ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                  : 'text-[#C8D9E6]/70 hover:text-white'
              }`}
              title="Switch to IEEE Boolean logic diagram"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Boolean Diagram</span>
              <span className="sm:hidden">Diagram</span>
            </button>
          </div>

          {/* Mode Switcher: Guide vs Scan */}
          <div className="flex items-center bg-[#131d27]/80 p-1 rounded-full border border-[#567C8D]/30 shrink-0">
            <button
              onClick={() => setMode('GUIDE')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                activeMode === 'GUIDE'
                  ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                  : 'text-[#C8D9E6]/70 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <button
              onClick={() => setMode('SCAN_CAMERA')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                activeMode === 'SCAN_CAMERA'
                  ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                  : 'text-[#C8D9E6]/70 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan</span>
            </button>
          </div>
        </div>

        {/* Short Circuit Warning Alert */}
        {isDeadShort && (
          <div className="bg-[#2F4156] text-white text-xs font-medium px-4 py-2.5 rounded-g2 border border-rose-400/50 flex items-center gap-2.5 shadow-xl animate-pulse">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>Short circuit detected: Power rails VCC and GND are bridged.</span>
          </div>
        )}
      </div>

      {/* AI Circuit Copilot Modal */}
      <AICircuitCopilot isOpen={showCopilot} onClose={() => setShowCopilot(false)} />

      {/* Experiment Picker Modal */}
      {showExpPicker && (
        <div className="fixed inset-0 z-50 bg-[#131d27]/80 backdrop-blur-md flex items-start justify-center p-4 pt-20">
          <div className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 text-[#F5EFEB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#567C8D]/20">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C8D9E6]" />
                Select Experiment
              </h3>
              <button
                onClick={() => setShowExpPicker(false)}
                className="w-7 h-7 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] flex items-center justify-center transition border border-[#567C8D]/30"
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
                      ? 'bg-[#2F4156] border-[#C8D9E6]/60 text-white'
                      : 'bg-[#131d27]/50 border-[#567C8D]/20 hover:bg-[#2F4156]/40 text-[#C8D9E6]'
                  }`}
                >
                  <div className="text-[10px] tracking-wider uppercase text-[#C8D9E6] font-sans font-semibold">
                    {exp.category}
                  </div>
                  <div className="text-sm font-medium text-white">{exp.title}</div>
                  <div className="text-xs text-[#C8D9E6]/80 line-clamp-2 leading-relaxed font-serif">
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
