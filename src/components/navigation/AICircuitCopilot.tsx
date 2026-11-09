import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { AimEvaluator, AimEvaluationResult } from '../../engine/aimEvaluator';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cpu,
  Layers,
  ListOrdered,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

interface AICircuitCopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICircuitCopilot: React.FC<AICircuitCopilotProps> = ({ isOpen, onClose }) => {
  const { loadSynthesizedExperiment, setViewMode } = useCircuitStore();

  const [aimInput, setAimInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AimEvaluationResult | null>(null);

  if (!isOpen) return null;

  const quickAims = [
    { label: 'Equation: Y = A*B + C\'', query: 'Y = A*B + C\'' },
    { label: 'Equation: Y = A\'B + AB\' (XOR)', query: 'Y = A\'B + AB\'' },
    { label: 'Equation: Y = (A + B)(C + D)', query: 'Y = (A + B) * (C + D)' },
    { label: 'Equation: Y = A ^ B + C', query: 'Y = A ^ B + C' },
    { label: 'Equation: Y = !(A & B) + C', query: 'Y = !(A & B) + C' },
    { label: '2:1 Multiplexer (Mux)', query: 'To construct and verify a 2:1 multiplexer using IC 7404 and IC 7408 on breadboard' },
    { label: '3-Input Majority Voter', query: 'Design a 3-input majority voting circuit where LED turns ON when ≥ 2 inputs are HIGH' },
    { label: 'XOR from 4 NAND Gates', query: 'To synthesize an XOR logic gate using only IC 7400 Quad NAND gates' },
    { label: '1-Bit Full Adder', query: 'To construct a 1-bit full adder circuit generating Sum and Carry-out outputs' },
    { label: 'Active-Low SR Latch', query: 'To construct an active-low Set-Reset (SR) bistable memory latch' },
    { label: '240V AC Speed Controller (Safety Check)', query: 'To design a 240V AC mains motor speed controller on breadboard' },
    { label: '64-Bit CPU (Capacity Check)', query: 'To construct a complete 64-bit microprocessor CPU on an 830-tie breadboard' },
  ];

  const handleEvaluate = (textToEvaluate?: string) => {
    const target = textToEvaluate || aimInput;
    if (!target.trim()) return;

    setIsEvaluating(true);
    setEvaluation(null);

    setTimeout(() => {
      const result = AimEvaluator.evaluateAim(target);
      setEvaluation(result);
      setIsEvaluating(false);
    }, 450);
  };

  const handleStartConstruction = () => {
    if (!evaluation || !evaluation.experiment) return;
    loadSynthesizedExperiment(evaluation.experiment);
    setViewMode('BREADBOARD');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#131d27]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-[#F5EFEB] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#567C8D]/25 flex items-center justify-between shrink-0 bg-[#131d27]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#2F4156] flex items-center justify-center text-[#C8D9E6] border border-[#567C8D]/40 shadow-inner">
              <Zap className="w-5 h-5 text-[#C8D9E6]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2 font-serif">
                <span>AI Aim & Feasibility Evaluator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] font-mono font-medium border border-[#567C8D]/40">
                  TI TTL & 830-Tie DRC
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#C8D9E6]/80 font-serif">
                Enter your lab objective. The AI checks hardware viability, computes total steps, and synthesizes the digital twin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2F4156] hover:bg-[#3e546e] flex items-center justify-center text-[#C8D9E6] hover:text-white transition border border-[#567C8D]/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          {/* Aim Input Field */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
                Laboratory Aim / Objective
              </label>
              <span className="text-[10px] text-[#C8D9E6]/60 font-serif">
                Type your syllabus experiment or custom circuit aim
              </span>
            </div>
            <div className="relative">
              <textarea
                value={aimInput}
                onChange={(e) => setAimInput(e.target.value)}
                placeholder="e.g. Type custom Boolean equation 'Y = A*B + C'' or lab aim 'To construct a 2:1 multiplexer using 7404 and 7408 ICs'..."
                rows={2}
                className="w-full bg-[#131d27]/75 border border-[#567C8D]/40 rounded-g2 p-3 text-xs sm:text-sm text-[#F5EFEB] placeholder:text-[#C8D9E6]/40 focus:outline-none focus:border-[#C8D9E6] resize-none font-serif leading-relaxed"
              />
            </div>
          </div>

          {/* Preset Suggested Aims */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/80">
              Sample Lab Aims (Click to test)
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {quickAims.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAimInput(item.query);
                    handleEvaluate(item.query);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#2F4156]/90 hover:bg-[#3e546e] text-[11px] text-[#C8D9E6] border border-[#567C8D]/35 font-serif transition flex items-center gap-1.5 hover:text-white"
                >
                  <Sparkles className="w-3 h-3 text-[#C8D9E6]" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Evaluate Action Trigger (if not evaluated yet) */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-[#C8D9E6]/70 font-serif flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#567C8D]" />
              <span>Evaluates 5V TTL limits, 830-tie grid space, and Texas Instruments pinouts</span>
            </div>

            <button
              onClick={() => handleEvaluate()}
              disabled={isEvaluating || !aimInput.trim()}
              className="px-4 py-2 bg-[#C8D9E6] text-[#131d27] hover:bg-white disabled:opacity-40 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg transition active:scale-95"
            >
              {isEvaluating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>{isEvaluating ? 'Evaluating Aim...' : 'Evaluate Aim & Plan Steps'}</span>
            </button>
          </div>

          {/* EVALUATION RESULT DISPLAY */}
          {evaluation && (
            <div className="mt-2 flex flex-col gap-3.5 border-t border-[#567C8D]/30 pt-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Verdict Header Card */}
              <div
                className={`p-3.5 rounded-g2 border flex items-start justify-between gap-3 ${
                  evaluation.verdict === 'ACCEPTED'
                    ? 'bg-[#131d27]/90 border-[#567C8D] text-white'
                    : evaluation.verdict === 'ACCEPTED_WITH_ADJUSTMENTS'
                    ? 'bg-[#1b2735] border-amber-400/50 text-[#F5EFEB]'
                    : 'bg-[#2a171c] border-red-500/50 text-[#F5EFEB]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {evaluation.verdict === 'ACCEPTED' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#C8D9E6] shrink-0 mt-0.5" />
                  ) : evaluation.verdict === 'ACCEPTED_WITH_ADJUSTMENTS' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold tracking-tight font-serif">
                        {evaluation.verdictTitle}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                          evaluation.isAcceptable
                            ? 'bg-[#C8D9E6] text-[#131d27]'
                            : 'bg-red-500/30 text-red-200 border border-red-400/40'
                        }`}
                      >
                        {evaluation.verdict.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#C8D9E6]/90 font-serif mt-1 leading-relaxed">
                      {evaluation.reasoning}
                    </p>
                  </div>
                </div>

                {/* Total Steps Count Badge */}
                {evaluation.isAcceptable && (
                  <div className="bg-[#2F4156] border border-[#567C8D]/40 rounded-g2 px-3 py-1.5 flex flex-col items-center shrink-0">
                    <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
                      Construction
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {evaluation.totalStepsCount} Steps Total
                    </span>
                  </div>
                )}
              </div>

              {/* If Unfeasible: Suggestion Box */}
              {!evaluation.isAcceptable && evaluation.suggestedAlternative && (
                <div className="bg-[#131d27]/70 border border-[#567C8D]/40 p-3 rounded-g2 flex flex-col gap-2">
                  <div className="text-[11px] font-semibold text-[#C8D9E6] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C8D9E6]" />
                    <span>Recommended Feasible Alternative:</span>
                  </div>
                  <p className="text-xs text-[#F5EFEB] font-serif leading-relaxed">
                    {evaluation.suggestedAlternative}
                  </p>
                  <button
                    onClick={() => {
                      const alt = evaluation.suggestedAlternative!;
                      setAimInput(alt);
                      handleEvaluate(alt);
                    }}
                    className="self-start text-[11px] font-medium text-[#131d27] bg-[#C8D9E6] hover:bg-white px-3 py-1 rounded-full transition flex items-center gap-1"
                  >
                    <span>Load Recommended Alternative</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* If Acceptable: Specifications & Roadmap Breakdown */}
              {evaluation.isAcceptable && (
                <div className="flex flex-col gap-3">
                  {/* Canonical Boolean Equation & Apparatus */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Boolean Formula */}
                    <div className="bg-[#131d27]/70 border border-[#567C8D]/35 rounded-g2 p-3 flex flex-col gap-1">
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-[#C8D9E6]" />
                        <span>Boolean Logic Formula</span>
                      </span>
                      <div className="text-xs font-mono font-semibold text-white bg-[#1b2735] px-2 py-1 rounded border border-[#567C8D]/30 mt-0.5">
                        {evaluation.booleanFormula}
                      </div>
                    </div>

                    {/* Apparatus Summary */}
                    <div className="bg-[#131d27]/70 border border-[#567C8D]/35 rounded-g2 p-3 flex flex-col gap-1">
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] flex items-center gap-1.5">
                        <Boxes className="w-3 h-3 text-[#C8D9E6]" />
                        <span>Hardware Kit Required</span>
                      </span>
                      <div className="text-[11px] text-[#F5EFEB]/90 font-serif leading-snug truncate">
                        {evaluation.apparatus.map((a) => `${a.name} (x${a.count})`).join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Step-by-Step Construction Roadmap Overview */}
                  <div className="bg-[#131d27]/60 border border-[#567C8D]/35 rounded-g2 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-[#C8D9E6]" />
                        <span>Step Roadmap ({evaluation.totalStepsCount} Steps Total)</span>
                      </span>
                      <span className="text-[10px] text-[#C8D9E6]/70 font-mono">
                        Sequence-verified by DRC
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {evaluation.stepRoadmap.map((st) => (
                        <div
                          key={st.stepNumber}
                          className="flex items-center justify-between text-xs bg-[#1b2735]/80 px-2.5 py-1.5 rounded border border-[#567C8D]/20 font-serif"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#2F4156] text-[#C8D9E6] font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              {st.stepNumber}
                            </span>
                            <span className="text-white font-medium">{st.title}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2F4156]/70 text-[#C8D9E6] shrink-0">
                            {st.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primary CTA: Start Construction */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#C8D9E6]/80 font-serif">
                      Ready to build on the physical 830-tie breadboard canvas?
                    </span>
                    <button
                      onClick={handleStartConstruction}
                      className="px-5 py-2.5 bg-[#C8D9E6] hover:bg-white text-[#131d27] rounded-full text-xs font-bold flex items-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Start Guided Construction ({evaluation.totalStepsCount} Steps)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
