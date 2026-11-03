import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  FileText,
  Info,
  X,
} from 'lucide-react';

export const StepBottomSheet: React.FC = () => {
  const {
    experiments,
    activeExpId,
    currentStepIndex,
    nextStep,
    prevStep,
  } = useCircuitStore();

  const [showApparatus, setShowApparatus] = useState(false);
  const [showTruthTable, setShowTruthTable] = useState(false);

  const activeExp = experiments.find((e) => e.id === activeExpId);
  if (!activeExp) return null;

  const currentStep = activeExp.steps[currentStepIndex];
  const totalSteps = activeExp.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <>
      <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-auto">
        <div className="bg-[#0d0f14]/90 backdrop-blur-xl border border-white/10 rounded-g2-xl shadow-2xl overflow-hidden transition-all duration-300">
          {/* Progress Indicator Bar */}
          <div className="w-full bg-white/5 h-1">
            <div
              className="bg-white h-1 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* Header: Step Number & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-sans font-semibold tracking-wider uppercase border border-white/10">
                  Step {currentStepIndex + 1} of {totalSteps}
                </span>
                <span className="text-xs font-semibold text-white tracking-tight truncate">
                  {currentStep?.title}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Apparatus Inventory Button */}
                <button
                  onClick={() => setShowApparatus(true)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs font-medium text-obsidian-200 border border-white/10 flex items-center gap-1.5 transition"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Apparatus</span>
                </button>

                {/* Truth Table Button */}
                <button
                  onClick={() => setShowTruthTable(true)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs font-medium text-obsidian-200 border border-white/10 flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            </div>

            {/* Turn-by-Turn Instruction */}
            <div className="text-sm font-normal text-white leading-relaxed font-serif">
              {currentStep?.instruction}
            </div>

            {/* Sub-Text Guidance Tip */}
            {currentStep?.subText && (
              <div className="text-xs text-obsidian-300 flex items-start gap-2 bg-white/[0.03] p-2.5 rounded-g2 border border-white/5 font-serif">
                <Info className="w-3.5 h-3.5 text-obsidian-300 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{currentStep.subText}</span>
              </div>
            )}

            {/* Common Pitfall Alert */}
            {currentStep?.commonPitfall && (
              <div className="text-xs text-obsidian-200 flex items-start gap-2 bg-white/[0.06] p-2.5 rounded-g2 border border-white/15 font-serif">
                <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                <span className="leading-relaxed">{currentStep.commonPitfall}</span>
              </div>
            )}

            {/* Bottom Actions: Previous & Next Step */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition text-obsidian-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                onClick={nextStep}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition shadow-md ${
                  isLastStep
                    ? 'bg-white text-black hover:bg-obsidian-100'
                    : 'bg-white text-black hover:bg-obsidian-100'
                }`}
              >
                <span>{isLastStep ? 'Complete' : 'Next Step'}</span>
                {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Apparatus Inventory Modal */}
      {showApparatus && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0f14] border border-white/15 rounded-g2-xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-obsidian-200" />
                Required Apparatus
              </h3>
              <button
                onClick={() => setShowApparatus(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-obsidian-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {activeExp.apparatus.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/[0.03] border border-white/10 p-3 rounded-g2 flex items-center justify-between"
                >
                  <div className="flex-1 pr-2">
                    <div className="text-xs font-semibold text-white">{item.name}</div>
                    <div className="text-[11px] text-obsidian-300 font-serif leading-relaxed">
                      {item.description}
                    </div>
                    {item.colorCode && (
                      <div className="text-[10px] text-obsidian-400 font-mono mt-1">
                        Color Code: {item.colorCode}
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-mono font-semibold text-white shrink-0">
                    x{item.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Truth Table Modal */}
      {showTruthTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0f14] border border-white/15 rounded-g2-xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-obsidian-200" />
                Truth Table
              </h3>
              <button
                onClick={() => setShowTruthTable(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-obsidian-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-obsidian-400 font-mono">
                    {activeExp.truthTable.headers.map((h, i) => (
                      <th key={i} className="py-2.5 px-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {activeExp.truthTable.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/[0.04]">
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="py-2.5 px-3 text-obsidian-200">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
