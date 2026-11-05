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
    circuitState,
    toggleSwitch,
  } = useCircuitStore();

  const [showApparatus, setShowApparatus] = useState(false);
  const [showTruthTable, setShowTruthTable] = useState(false);

  const activeExp = experiments.find((e) => e.id === activeExpId);
  if (!activeExp) return null;

  const isAnyLedLit = circuitState.leds.some((l) => l.isLit);
  const swA = circuitState.switches.find((s) => s.id === 'sw-a')?.isClosed ? 1 : 0;
  const swB = circuitState.switches.find((s) => s.id === 'sw-b')?.isClosed ? 1 : 0;

  const currentStep = activeExp.steps[currentStepIndex];
  const totalSteps = activeExp.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Apply row inputs when clicked in truth table
  const applyRowInputs = (row: (string | number)[]) => {
    if (typeof row[0] === 'number') {
      const targetA = row[0] === 1;
      const currentA = circuitState.switches.find((s) => s.id === 'sw-a')?.isClosed;
      if (currentA !== undefined && currentA !== targetA) {
        toggleSwitch('sw-a');
      }
    }
    if (typeof row[1] === 'number') {
      const targetB = row[1] === 1;
      const currentB = circuitState.switches.find((s) => s.id === 'sw-b')?.isClosed;
      if (currentB !== undefined && currentB !== targetB) {
        toggleSwitch('sw-b');
      }
    }
  };

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

      {/* Truth Table Modal with Live LED Simulation */}
      {showTruthTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0f14] border border-white/15 rounded-g2-xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10">
                  <FileText className="w-4 h-4 text-obsidian-200" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <span>Truth Table Simulation</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-obsidian-200 font-mono">
                      Live Synced
                    </span>
                  </h3>
                  <p className="text-[11px] text-obsidian-300 font-serif">
                    Click any row to test that input combination on the breadboard and watch the LED respond.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTruthTable(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-obsidian-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Hardware LED Status Card */}
            <div className="bg-black/60 border border-white/10 rounded-g2 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Glowing Simulated LED Bulb */}
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-5 h-5 rounded-full transition-all duration-300 ${
                      isAnyLedLit
                        ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,1)] ring-2 ring-white/50'
                        : 'bg-[#171a22] border border-white/20'
                    }`}
                  />
                  {isAnyLedLit && (
                    <div className="absolute w-2 h-2 rounded-full bg-white blur-[1px]" />
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-obsidian-400">
                    Live Breadboard LED
                  </div>
                  <div className="text-xs font-semibold text-white tracking-tight font-serif">
                    {isAnyLedLit ? 'Output is HIGH (+5V) — LED is LIT' : 'Output is LOW (0V) — LED is DARK'}
                  </div>
                </div>
              </div>

              {/* Active Switch Inputs */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-obsidian-200">
                  A={swA}
                </span>
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-obsidian-200">
                  B={swB}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-white/10 rounded-g2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-obsidian-400 font-mono">
                    <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">State</th>
                    {activeExp.truthTable.headers.map((h, i) => (
                      <th key={i} className="py-2.5 px-3 font-semibold text-[10px] uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {activeExp.truthTable.rows.map((row, rIdx) => {
                    const isRowActive =
                      typeof row[0] === 'number' &&
                      row[0] === swA &&
                      (typeof row[1] !== 'number' || row[1] === swB);

                    const rowText = String(row[row.length - 1]);
                    const rowIsLit =
                      rowText.includes('1') ||
                      rowText.includes('ON') ||
                      rowText.includes('Lit');

                    return (
                      <tr
                        key={rIdx}
                        onClick={() => applyRowInputs(row)}
                        className={`cursor-pointer transition-all ${
                          isRowActive
                            ? 'bg-white/10 text-white font-semibold'
                            : 'hover:bg-white/[0.04] text-obsidian-200'
                        }`}
                      >
                        {/* LED Simulation Bulb Column */}
                        <td className="py-2.5 px-3 flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
                              rowIsLit
                                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                                : 'bg-[#1e2029] border border-white/20'
                            }`}
                          />
                          <span className="text-[10px] font-sans font-medium text-obsidian-300">
                            {isRowActive ? 'ACTIVE' : `ROW ${rIdx + 1}`}
                          </span>
                        </td>

                        {row.map((val, cIdx) => (
                          <td key={cIdx} className="py-2.5 px-3">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-obsidian-400 font-serif text-center pt-1">
              Tip: Click any row to automatically set the inputs on the breadboard and verify the LED.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
