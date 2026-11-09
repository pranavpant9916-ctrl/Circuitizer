import React, { useState, useEffect, useRef } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { BooleanCompiler } from '../../engine/booleanCompiler';
import {
  ChevronDown,
  ChevronUp,
  FunctionSquare,
  Play,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const DesmosExpressionBar: React.FC = () => {
  const {
    experiments,
    activeExpId,
    circuitState,
    toggleSwitch,
    loadSynthesizedExperiment,
    jumpToStep,
  } = useCircuitStore();

  const activeExp = experiments.find((e) => e.id === activeExpId);

  // Derive initial expression from active experiment
  const getActiveFormula = (): string => {
    if (!activeExp) return 'Y = A • B';
    if (activeExp.title.includes('Compiled Logic:')) {
      return activeExp.title.replace('Compiled Logic:', '').trim();
    }
    if (activeExp.theory.includes('Formula:') || activeExp.theory.includes('equation:')) {
      const match = activeExp.theory.match(/(?:Formula|equation):\s*([^\.\n]+)/i);
      if (match && match[1]) return match[1].trim();
    }
    const t = `${activeExp.title} ${activeExp.aim}`.toLowerCase();
    if (t.includes('majority') || t.includes('voter')) return 'Y = (A • B) + (B • C) + (A • C)';
    if (t.includes('multiplexer') || t.includes('mux')) return "Y = (S' • D0) + (S • D1)";
    if (t.includes('half adder')) return 'Sum = A ⊕ B  |  Carry = A • B';
    if (t.includes('xor') && t.includes('nand')) return "Y = ((A • (AB)')' • (B • (AB)')')' = A ⊕ B";
    if (t.includes('comparator') || t.includes('equality')) return "Y = (A • B) + (A' • B')";
    if (t.includes('nand')) return "Y = (A • B)'";
    if (t.includes('nor')) return "Y = (A + B)'";
    if (t.includes('not') || t.includes('inverter')) return "Y = A'";
    return 'Y = A • B';
  };

  const [formulaInput, setFormulaInput] = useState(getActiveFormula());
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilerError, setCompilerError] = useState<string | null>(null);
  const [compileSuccess, setCompileSuccess] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize when user switches experiments
  useEffect(() => {
    setFormulaInput(getActiveFormula());
    setCompilerError(null);
    setCompileSuccess(null);
  }, [activeExpId]);

  // Extract variables from the current formula
  const detectedVariables = React.useMemo(() => {
    try {
      const parsed = BooleanCompiler.parseExpression(formulaInput);
      return parsed.variables;
    } catch {
      return ['A', 'B'];
    }
  }, [formulaInput]);

  // Compute live output state
  const isAnyLedLit = circuitState.leds.some((l) => l.isLit);

  // Quick operator insertion
  const insertOperator = (op: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || formulaInput.length;
    const end = input.selectionEnd || formulaInput.length;

    const nextVal = formulaInput.slice(0, start) + op + formulaInput.slice(end);
    setFormulaInput(nextVal);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + op.length, start + op.length);
    }, 0);
  };

  // Compile equation into physical breadboard circuit
  const handleCompile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formulaInput.trim()) return;

    setIsCompiling(true);
    setCompilerError(null);
    setCompileSuccess(null);

    setTimeout(() => {
      try {
        const result = BooleanCompiler.compile(formulaInput);
        loadSynthesizedExperiment(result.experiment);
        // Automatically jump to final step so student immediately sees the full circuit working
        jumpToStep(result.experiment.steps.length - 1);

        setCompileSuccess(
          `Synthesized: ${result.requiredICs.length} IC(s), ${result.experiment.steps.length} Steps, ${result.truthTable.rows.length} States`
        );
        setIsCompiling(false);
      } catch (err: any) {
        console.error(err);
        setCompilerError(err.message || 'Syntax error in Boolean equation.');
        setIsCompiling(false);
      }
    }, 250);
  };

  return (
    <div className="w-full bg-[#1b2735]/95 backdrop-blur-xl border border-[#567C8D]/40 rounded-g2-xl shadow-2xl p-3 flex flex-col gap-2.5 transition-all duration-200 text-[#F5EFEB]">
      {/* Top Bar: Function Badge, Expression Input, and Quick Actions */}
      <form onSubmit={handleCompile} className="flex items-center gap-2.5">
        {/* Function Icon Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[#C8D9E6] font-mono text-xs font-bold shrink-0 shadow-inner">
          <FunctionSquare className="w-4 h-4 text-[#C8D9E6]" />
          <span className="hidden sm:inline">ƒ(Logic)</span>
        </div>

        {/* The Desmos-Style Live Formula Input Field */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={formulaInput}
            onChange={(e) => {
              setFormulaInput(e.target.value);
              setCompilerError(null);
              setCompileSuccess(null);
            }}
            placeholder="Type Boolean equation: e.g. Y = A*B + C', Y = (A + B)(C + D), Y = A ⊕ B..."
            className="w-full bg-[#131d27]/85 border border-[#567C8D]/40 rounded-full px-4 py-1.5 text-xs sm:text-sm font-mono text-white placeholder:text-[#C8D9E6]/40 focus:outline-none focus:border-[#C8D9E6] focus:ring-1 focus:ring-[#C8D9E6] shadow-inner transition"
          />
        </div>

        {/* Compile / Enter Button */}
        <button
          type="submit"
          disabled={isCompiling || !formulaInput.trim()}
          className="px-3.5 py-1.5 rounded-full bg-[#C8D9E6] text-[#131d27] hover:bg-white disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 shadow-md transition active:scale-95 shrink-0 cursor-pointer"
          title="Compile equation into physical breadboard layout (Press Enter)"
        >
          <Play className="w-3.5 h-3.5 fill-[#131d27]" />
          <span className="hidden sm:inline">{isCompiling ? 'Compiling...' : 'Plot on Board'}</span>
        </button>

        {/* Expand / Minimize Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-7 h-7 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] flex items-center justify-center transition border border-[#567C8D]/30 shrink-0"
          title={isExpanded ? 'Collapse controls' : 'Expand controls & variables'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </form>

      {/* Expanded Controls: Variable Sliders, Quick Operators, and Live LED Output */}
      {isExpanded && (
        <div className="flex flex-col gap-2.5 pt-1 border-t border-[#567C8D]/25 animate-in fade-in slide-in-from-top-1">
          {/* Middle Row: Variable Sliders / Switches and Live Output Status */}
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            {/* Variable Slider / Toggle Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 flex items-center gap-1">
                <span>Variables:</span>
              </span>

              {detectedVariables.map((v) => {
                const switchId = `sw-${v.toLowerCase()}`;
                const sw = circuitState.switches.find((s) => s.id === switchId);
                const isHigh = sw ? sw.isClosed : false;

                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleSwitch(switchId)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold transition border cursor-pointer ${
                      isHigh
                        ? 'bg-[#C8D9E6] text-[#131d27] border-[#C8D9E6] shadow-[0_0_10px_rgba(200,217,230,0.5)]'
                        : 'bg-[#131d27]/70 text-[#C8D9E6] border-[#567C8D]/40 hover:bg-[#2F4156]'
                    }`}
                    title={`Click to flip variable ${v} (0V ↔ +5V)`}
                  >
                    <div className="flex items-center gap-1">
                      {isHigh ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-[#567C8D]" />
                      )}
                      <span>{v}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2F4156]/30 font-mono">
                      {isHigh ? '1 (+5V)' : '0 (0V)'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Circuit Output Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#131d27]/80 border border-[#567C8D]/40 shrink-0">
              {/* Glowing Simulated LED Bulb */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    isAnyLedLit
                      ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,1)] ring-2 ring-white/50'
                      : 'bg-[#2F4156] border border-[#567C8D]/40'
                  }`}
                />
              </div>

              <span className="text-[11px] font-mono font-bold text-white">
                Output Y: {isAnyLedLit ? '1 (HIGH)' : '0 (LOW)'}
              </span>

              <span
                className={`text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isAnyLedLit
                    ? 'bg-[#C8D9E6] text-[#131d27]'
                    : 'bg-[#2F4156] text-[#C8D9E6]/70'
                }`}
              >
                {isAnyLedLit ? 'LED LIT' : 'LED DARK'}
              </span>
            </div>
          </div>

          {/* Bottom Row: Quick Logic Operator Helper Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-sans uppercase tracking-wider text-[#C8D9E6]/60">
                Operators:
              </span>
              {[
                { label: '• (AND)', insert: ' • ' },
                { label: '+ (OR)', insert: ' + ' },
                { label: "' (NOT)", insert: "'" },
                { label: '⊕ (XOR)', insert: ' ⊕ ' },
                { label: '⊙ (XNOR)', insert: ' ⊙ ' },
                { label: '( )', insert: '()' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => insertOperator(btn.insert)}
                  className="px-2 py-0.5 rounded bg-[#2F4156]/70 hover:bg-[#2F4156] text-[#C8D9E6] hover:text-white border border-[#567C8D]/30 transition text-[10px]"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Status Feedback */}
            {compilerError && (
              <span className="text-[11px] text-red-300 font-serif">
                ⚠️ {compilerError}
              </span>
            )}
            {compileSuccess && !compilerError && (
              <span className="text-[11px] text-[#C8D9E6] font-serif flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C8D9E6]" />
                <span>{compileSuccess}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
