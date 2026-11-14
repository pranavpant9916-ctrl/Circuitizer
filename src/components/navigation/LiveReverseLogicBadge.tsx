import React, { useState, useMemo } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { ReverseBooleanExtractor } from '../../engine/reverseExtractor';
import { AudioEngine } from '../../engine/audioEngine';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  Zap,
} from 'lucide-react';

export const LiveReverseLogicBadge: React.FC = () => {
  const {
    circuitState,
    currentStepIndex,
    experiments,
    activeExpId,
    setPendingFormula,
  } = useCircuitStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const activeExp = experiments.find((e) => e.id === activeExpId);

  // Reactively extract reverse Boolean logic from current active breadboard state
  const extraction = useMemo(() => {
    return ReverseBooleanExtractor.extract(circuitState);
  }, [circuitState]);

  const hasCrit = extraction.diagnostics.some((d) => d.severity === 'CRITICAL');
  const hasWarn = extraction.diagnostics.some((d) => d.severity === 'WARNING');
  const isComplete = extraction.isHardwareValid && extraction.variables.length > 0 && extraction.extractedFormula !== 'Y = 0';

  const statusColor = hasCrit
    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
    : hasWarn || !isComplete
    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
    : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]';

  const handleSyncToDesmos = () => {
    AudioEngine.playRowSelect(true);
    setPendingFormula(extraction.extractedFormula);
    setIsExpanded(false);
  };

  const toggleExpand = () => {
    AudioEngine.playStepChange(!isExpanded);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="absolute top-48 left-4 z-20 pointer-events-auto font-sans select-none">
      {/* Collapsed Pill Button */}
      <div
        onClick={toggleExpand}
        className="bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/40 hover:border-[#C8D9E6]/60 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2 cursor-pointer transition active:scale-95 text-[#F5EFEB] group"
        title="Click to view reverse-engineered Boolean logic & breadboard diagnostics"
      >
        {/* Pulsing Status Dot */}
        <span className={`w-2 h-2 rounded-full ${statusColor} shrink-0 animate-pulse`} />

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#C8D9E6]/80 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-[#C8D9E6]" />
            <span className="hidden sm:inline">Reverse Logic:</span>
          </span>

          <span className="font-mono font-bold text-white text-xs max-w-[140px] sm:max-w-[180px] truncate">
            {isComplete ? extraction.extractedFormula : `Step ${currentStepIndex + 1} Logic`}
          </span>
        </div>

        <div className="text-[#C8D9E6]/70 group-hover:text-white transition">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded Details Popover */}
      {isExpanded && (
        <div className="mt-2 w-80 sm:w-96 bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/40 rounded-g2-xl p-4 shadow-2xl flex flex-col gap-3 text-[#F5EFEB] animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#567C8D]/25">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#2F4156] flex items-center justify-center text-[#C8D9E6] border border-[#567C8D]/40">
                <Sparkles className="w-3.5 h-3.5 text-[#C8D9E6]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight font-serif">
                  Reverse Netlist Extractor
                </h4>
                <p className="text-[10px] text-[#C8D9E6]/70 font-sans">
                  "Vice Versa" breadboard-to-formula tracing
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs text-[#C8D9E6]/60 hover:text-white px-1.5 py-0.5 rounded transition"
            >
              ✕
            </button>
          </div>

          {/* Detected Formula Card */}
          <div className="bg-[#131d27]/90 border border-[#567C8D]/40 rounded-g2 p-3 flex flex-col gap-1.5 shadow-inner">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#C8D9E6]/70 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#C8D9E6]" />
                <span>Detected Circuit Function</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#2F4156] text-[#C8D9E6]">
                {extraction.variables.length} Variable{extraction.variables.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="font-mono text-sm font-bold text-white bg-[#2F4156] px-3 py-1.5 rounded border border-[#567C8D]/50 break-words">
              {extraction.extractedFormula}
            </div>

            {/* Quick Action: Sync to Desmos bar */}
            {isComplete && (
              <button
                onClick={handleSyncToDesmos}
                className="mt-1.5 w-full py-1.5 px-3 rounded-full bg-[#C8D9E6] text-[#131d27] hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
              >
                <span>Sync with Desmos Header Bar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Detected Gates Breakdown */}
          {extraction.detectedGates.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#C8D9E6]/70">
                Identified Physical Logic Gates
              </span>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                {extraction.detectedGates.map((gate, idx) => (
                  <div
                    key={idx}
                    className="bg-[#131d27]/70 border border-[#567C8D]/30 p-2 rounded text-xs flex items-center justify-between font-mono"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#2F4156] text-[#C8D9E6] font-bold text-[10px]">
                        {gate.icModel} {gate.gateType}
                      </span>
                      <span className="text-[#C8D9E6] text-[11px]">Out: {gate.outputHole}</span>
                    </div>
                    <span className="text-white font-bold text-xs">{gate.term}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hardware Diagnostics & Health Checks */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C8D9E6]/70 flex items-center justify-between">
              <span>Hardware Health Checks</span>
              <span className="text-[9px] font-sans font-normal text-[#C8D9E6]/60">
                {extraction.diagnostics.length === 0 ? 'All Checks Passed' : `${extraction.diagnostics.length} Notice(s)`}
              </span>
            </span>

            {extraction.diagnostics.length === 0 ? (
              <div className="bg-[#131d27]/60 border border-emerald-500/30 p-2 rounded text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All IC power supplies, ground returns, and signals verified.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                {extraction.diagnostics.map((diag, dIdx) => (
                  <div
                    key={dIdx}
                    className={`p-2 rounded border text-xs flex items-start gap-2 ${
                      diag.severity === 'CRITICAL'
                        ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                        : diag.severity === 'WARNING'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : 'bg-[#131d27]/70 border-[#567C8D]/30 text-[#C8D9E6]'
                    }`}
                  >
                    {diag.severity === 'CRITICAL' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold">{diag.title}:</span>{' '}
                      <span className="font-serif text-[11px] opacity-90">{diag.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Step Comparison Tip */}
          {activeExp && (
            <div className="text-[10px] text-[#C8D9E6]/60 font-serif border-t border-[#567C8D]/20 pt-2 flex items-center justify-between">
              <span>Lab Aim: {activeExp.title}</span>
              <span className="font-mono">Step {currentStepIndex + 1}/{activeExp.steps.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
