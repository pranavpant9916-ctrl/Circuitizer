import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { AudioEngine } from '../../engine/audioEngine';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  FileText,
  Info,
  ListOrdered,
  X,
  Zap,
} from 'lucide-react';

export const StepBottomSheet: React.FC = () => {
  const {
    experiments,
    activeExpId,
    currentStepIndex,
    nextStep,
    prevStep,
    jumpToStep,
    circuitState,
    toggleSwitch,
  } = useCircuitStore();

  const [showApparatus, setShowApparatus] = useState(false);
  const [showTruthTable, setShowTruthTable] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const activeExp = experiments.find((e) => e.id === activeExpId);
  if (!activeExp) return null;

  const isAnyLedLit = circuitState.leds.some((l) => l.isLit);

  const currentStep = activeExp.steps[currentStepIndex];
  const totalSteps = activeExp.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Derive canonical Boolean formula from experiment theory or title
  const deriveFormula = (): string => {
    if (activeExp.theory.includes('Formula:') || activeExp.theory.includes('equation:')) {
      const match = activeExp.theory.match(/(?:Formula|equation):\s*([^\.\n]+)/i);
      if (match && match[1]) return match[1].trim();
    }
    const t = `${activeExp.title} ${activeExp.aim}`.toLowerCase();
    if (t.includes('majority') || t.includes('voter')) return 'Y = (A • B) + (B • C) + (A • C)';
    if (t.includes('multiplexer') || t.includes('mux')) return 'Y = (S\' • D0) + (S • D1)';
    if (t.includes('half adder')) return 'Sum = A ⊕ B  |  Carry = A • B';
    if (t.includes('xor') && t.includes('nand')) return 'Y = ((A • (AB)\')\' • (B • (AB)\')\')\' = A ⊕ B';
    if (t.includes('comparator') || t.includes('equality')) return 'Y = (A • B) + (A\' • B\')';
    if (t.includes('nand')) return 'Y = (A • B)\'';
    if (t.includes('nor')) return 'Y = (A + B)\'';
    if (t.includes('not') || t.includes('inverter')) return 'Y = A\'';
    return 'Y = A • B';
  };

  const getStepCategory = (title: string, index: number) => {
    const t = title.toLowerCase();
    if (t.includes('rail') || t.includes('bridge') || (index <= 1 && t.includes('power'))) return 'Power Rails';
    if (t.includes('insert') || t.includes('seat') || t.includes('trench')) return 'IC Placement';
    if (t.includes('pin 14') || t.includes('pin 7') || t.includes('ic power') || t.includes('ic ground')) return 'IC Power';
    if (t.includes('switch') || t.includes('led') || t.includes('resistor') || t.includes('indicator')) return 'I/O & Indicator';
    return 'Logic Wiring';
  };

  // Apply row inputs when clicked in truth table across all circuit switches
  const applyRowInputs = (row: (string | number)[]) => {
    const rowText = String(row[row.length - 1]);
    const rowIsLit = rowText.includes('1') || rowText.includes('ON') || rowText.includes('Lit');
    AudioEngine.playRowSelect(rowIsLit);

    circuitState.switches.forEach((sw, idx) => {
      if (typeof row[idx] === 'number') {
        const target = row[idx] === 1;
        if (sw.isClosed !== target) {
          toggleSwitch(sw.id);
        }
      }
    });
  };

  const booleanFormula = deriveFormula();

  return (
    <>
      <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-auto">
        <div className="bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/35 rounded-g2-xl shadow-2xl overflow-hidden transition-all duration-300 text-[#F5EFEB]">
          {/* Progress Indicator Bar */}
          <div className="w-full bg-[#131d27] h-1.5">
            <div
              className="bg-[#C8D9E6] h-1.5 transition-all duration-300 shadow-[0_0_8px_rgba(200,217,230,0.6)]"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* Header: Step Number, Canonical Formula & Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowRoadmap(true)}
                  className="px-2.5 py-0.5 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] text-[10px] font-sans font-semibold tracking-wider uppercase border border-[#567C8D]/40 transition flex items-center gap-1.5 cursor-pointer"
                  title="Click to view total construction steps roadmap"
                >
                  <ListOrdered className="w-3 h-3 text-[#C8D9E6]" />
                  <span>Step {currentStepIndex + 1} of {totalSteps} Total</span>
                </button>
                <span className="text-xs font-semibold text-white tracking-tight truncate font-serif">
                  {currentStep?.title}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Canonical Formula Badge */}
                <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#131d27]/70 border border-[#567C8D]/30 text-[11px] font-mono text-[#C8D9E6]">
                  <Zap className="w-3 h-3 text-[#C8D9E6]" />
                  <span>{booleanFormula}</span>
                </div>

                {/* Total Steps Roadmap Button */}
                <button
                  onClick={() => setShowRoadmap(true)}
                  className="px-2.5 py-1 rounded-full bg-[#2F4156]/70 hover:bg-[#2F4156] text-xs font-medium text-[#C8D9E6] border border-[#567C8D]/40 flex items-center gap-1.5 transition shadow-sm"
                  title="View full step-by-step roadmap"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Roadmap ({totalSteps})</span>
                </button>

                {/* Apparatus Inventory Button */}
                <button
                  onClick={() => setShowApparatus(true)}
                  className="px-2.5 py-1 rounded-full bg-[#2F4156]/70 hover:bg-[#2F4156] text-xs font-medium text-[#C8D9E6] border border-[#567C8D]/40 flex items-center gap-1.5 transition shadow-sm"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Apparatus</span>
                </button>

                {/* Truth Table Button */}
                <button
                  onClick={() => setShowTruthTable(true)}
                  className="px-2.5 py-1 rounded-full bg-[#2F4156]/70 hover:bg-[#2F4156] text-xs font-medium text-[#C8D9E6] border border-[#567C8D]/40 flex items-center gap-1.5 transition shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Truth Table</span>
                </button>
              </div>
            </div>

            {/* Turn-by-Turn Instruction */}
            <div className="text-sm font-normal text-[#F5EFEB] leading-relaxed font-serif">
              {currentStep?.instruction}
            </div>

            {/* Sub-Text Guidance Tip */}
            {currentStep?.subText && (
              <div className="text-xs text-[#C8D9E6]/90 flex items-start gap-2 bg-[#131d27]/70 p-2.5 rounded-g2 border border-[#567C8D]/30 font-serif">
                <Info className="w-3.5 h-3.5 text-[#C8D9E6] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{currentStep.subText}</span>
              </div>
            )}

            {/* Common Pitfall Alert */}
            {currentStep?.commonPitfall && (
              <div className="text-xs text-[#F5EFEB] flex items-start gap-2 bg-[#2F4156]/80 p-2.5 rounded-g2 border border-amber-400/40 font-serif">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{currentStep.commonPitfall}</span>
              </div>
            )}

            {/* Bottom Actions: Previous & Next Step */}
            <div className="flex items-center justify-between pt-1 border-t border-[#567C8D]/20">
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition text-[#C8D9E6]/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>

              <button
                onClick={nextStep}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition shadow-md ${
                  isLastStep
                    ? 'bg-[#C8D9E6] text-[#131d27] hover:bg-white'
                    : 'bg-[#C8D9E6] text-[#131d27] hover:bg-white'
                }`}
              >
                <span>{isLastStep ? 'Circuit Completed' : 'Next Step'}</span>
                {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Construction Steps Roadmap Modal */}
      {showRoadmap && (
        <div className="fixed inset-0 z-50 bg-[#131d27]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 text-[#F5EFEB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#567C8D]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2F4156] flex items-center justify-center text-[#C8D9E6] border border-[#567C8D]/40">
                  <ListOrdered className="w-4 h-4 text-[#C8D9E6]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <span>Construction Roadmap</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] font-mono border border-[#567C8D]/40">
                      {totalSteps} Steps Total
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#C8D9E6]/80 font-serif">
                    Step-by-step milestone progression for "{activeExp.title}"
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRoadmap(false)}
                className="w-7 h-7 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] flex items-center justify-center transition border border-[#567C8D]/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {activeExp.steps.map((st, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isDone = idx < currentStepIndex;
                const category = getStepCategory(st.title, idx);

                return (
                  <div
                    key={st.stepNumber}
                    onClick={() => {
                      jumpToStep(idx);
                      setShowRoadmap(false);
                    }}
                    className={`p-3 rounded-g2 border transition cursor-pointer flex items-start justify-between gap-3 ${
                      isCurrent
                        ? 'bg-[#2F4156] border-[#C8D9E6] ring-1 ring-[#C8D9E6]'
                        : 'bg-[#131d27]/60 border-[#567C8D]/30 hover:bg-[#131d27]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-[#567C8D] text-white'
                            : isCurrent
                            ? 'bg-[#C8D9E6] text-[#131d27]'
                            : 'bg-[#2F4156] text-[#C8D9E6]'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : st.stepNumber}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white font-serif">{st.title}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C8D9E6] text-[#131d27]">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#C8D9E6]/80 font-serif line-clamp-2 mt-0.5">
                          {st.instruction}
                        </p>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] shrink-0 border border-[#567C8D]/30">
                      {category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Apparatus Inventory Modal */}
      {showApparatus && (
        <div className="fixed inset-0 z-50 bg-[#131d27]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 text-[#F5EFEB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#567C8D]/20">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#C8D9E6]" />
                Required Apparatus
              </h3>
              <button
                onClick={() => setShowApparatus(false)}
                className="w-7 h-7 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] flex items-center justify-center transition border border-[#567C8D]/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {activeExp.apparatus.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#131d27]/50 border border-[#567C8D]/30 p-3 rounded-g2 flex items-center justify-between"
                >
                  <div className="flex-1 pr-2">
                    <div className="text-xs font-semibold text-white">{item.name}</div>
                    <div className="text-[11px] text-[#C8D9E6]/80 font-serif leading-relaxed">
                      {item.description}
                    </div>
                    {item.colorCode && (
                      <div className="text-[10px] text-[#C8D9E6]/60 font-mono mt-1">
                        Color Code: {item.colorCode}
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-0.5 bg-[#2F4156] border border-[#567C8D]/40 rounded-full text-xs font-mono font-semibold text-[#C8D9E6] shrink-0">
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
        <div className="fixed inset-0 z-50 bg-[#131d27]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 text-[#F5EFEB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#567C8D]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2F4156] flex items-center justify-center text-[#C8D9E6] border border-[#567C8D]/40">
                  <FileText className="w-4 h-4 text-[#C8D9E6]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <span>Truth Table Simulation</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] font-mono border border-[#567C8D]/40">
                      Live Synced
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#C8D9E6]/80 font-serif">
                    Click any row to test that input combination on the breadboard and watch the LED respond.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTruthTable(false)}
                className="w-7 h-7 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] flex items-center justify-center transition border border-[#567C8D]/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Boolean Formula Banner */}
            <div className="bg-[#131d27]/70 border border-[#567C8D]/30 px-3 py-2 rounded-g2 flex items-center justify-between">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#C8D9E6]" />
                <span>Canonical Equation</span>
              </span>
              <span className="text-xs font-mono font-semibold text-white bg-[#2F4156] px-2.5 py-0.5 rounded border border-[#567C8D]/40">
                {booleanFormula}
              </span>
            </div>

            {/* Live Hardware LED Status Card */}
            <div className="bg-[#131d27]/80 border border-[#567C8D]/35 rounded-g2 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Glowing Simulated LED Bulb */}
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-5 h-5 rounded-full transition-all duration-300 ${
                      isAnyLedLit
                        ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,1)] ring-2 ring-white/50'
                        : 'bg-[#2F4156] border border-[#567C8D]/40'
                    }`}
                  />
                  {isAnyLedLit && (
                    <div className="absolute w-2 h-2 rounded-full bg-white blur-[1px]" />
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
                    Live Breadboard LED
                  </div>
                  <div className="text-xs font-semibold text-white tracking-tight font-serif">
                    {isAnyLedLit ? 'Output is HIGH (+5V) — LED is LIT' : 'Output is LOW (0V) — LED is DARK'}
                  </div>
                </div>
              </div>

              {/* Active Switch Inputs */}
              <div className="flex items-center gap-2 text-xs font-mono flex-wrap justify-end">
                {circuitState.switches.map((sw) => (
                  <span
                    key={sw.id}
                    className="px-2 py-1 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[#C8D9E6]"
                  >
                    {sw.label}={sw.isClosed ? 1 : 0}
                  </span>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-[#567C8D]/30 rounded-g2 bg-[#131d27]/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#567C8D]/25 bg-[#2F4156]/40 text-[#C8D9E6] font-mono">
                    <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">State</th>
                    {activeExp.truthTable.headers.map((h, i) => (
                      <th key={i} className="py-2.5 px-3 font-semibold text-[10px] uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#567C8D]/20 font-mono">
                  {activeExp.truthTable.rows.map((row, rIdx) => {
                    const isRowActive =
                      circuitState.switches.length > 0
                        ? circuitState.switches.every((sw, idx) => {
                            if (typeof row[idx] === 'number') {
                              return (sw.isClosed ? 1 : 0) === row[idx];
                            }
                            return true;
                          })
                        : false;

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
                            ? 'bg-[#2F4156] text-white font-semibold'
                            : 'hover:bg-[#2F4156]/40 text-[#C8D9E6]'
                        }`}
                      >
                        {/* LED Simulation Bulb Column */}
                        <td className="py-2.5 px-3 flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
                              rowIsLit
                                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                                : 'bg-[#1b2735] border border-[#567C8D]/40'
                            }`}
                          />
                          <span className="text-[10px] font-sans font-medium text-[#C8D9E6]">
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

            <div className="text-[10px] text-[#C8D9E6]/70 font-serif text-center pt-1">
              Tip: Click any row to automatically set the inputs on the breadboard and verify the LED.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
