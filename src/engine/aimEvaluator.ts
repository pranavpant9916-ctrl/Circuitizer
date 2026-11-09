import { Experiment, ApparatusItem } from '../types/experiment';
import { AICircuitGenerator } from './aiCircuitGenerator';
import { EXPERIMENTS } from './experiments';
import { BooleanCompiler } from './booleanCompiler';

export interface AimStepSummary {
  stepNumber: number;
  title: string;
  category: 'Power Rails' | 'IC Placement' | 'IC Power' | 'Signal Wiring' | 'I/O & Indicator';
  instruction: string;
}

export interface AimEvaluationResult {
  isAcceptable: boolean;
  verdict: 'ACCEPTED' | 'ACCEPTED_WITH_ADJUSTMENTS' | 'REJECTED_UNFEASIBLE';
  aim: string;
  verdictTitle: string;
  reasoning: string;
  suggestedAlternative?: string;
  booleanFormula: string;
  totalStepsCount: number;
  apparatus: ApparatusItem[];
  stepRoadmap: AimStepSummary[];
  experiment?: Experiment;
}

export class AimEvaluator {
  /**
   * Evaluate whether a student's aim is physically viable on an 830-tie breadboard
   * using standard 5V TTL ICs (Texas Instruments 7400 series / NE555).
   */
  public static evaluateAim(userAim: string): AimEvaluationResult {
    const raw = userAim.trim();
    const q = raw.toLowerCase();

    // 1. Check for Lethal / High Voltage Safety Violations (AC mains, 110V, 220V, 240V, wall plug)
    if (
      q.includes('220v') ||
      q.includes('240v') ||
      q.includes('110v') ||
      q.includes('120v') ||
      q.includes('mains') ||
      q.includes('ac motor') ||
      q.includes('high voltage') ||
      q.includes('wall socket') ||
      q.includes('transformer') ||
      q.includes('electric shock')
    ) {
      return {
        isAcceptable: false,
        verdict: 'REJECTED_UNFEASIBLE',
        aim: raw,
        verdictTitle: 'Safety Violation: High Voltage AC Exceeds Breadboard Rating',
        reasoning:
          'Solderless 830-tie breadboards are strictly rated for low-voltage DC signals (≤ 5V–12V DC, maximum current ≤ 500mA). Connecting AC mains (110V–240V) causes immediate dielectric arc-over, thermal runaway, and lethal electrocution hazards.',
        suggestedAlternative:
          'Construct a safe 5V DC solid-state switching circuit using an optocoupler (4N35) or a transistorized LED driver (2N2222) controlled by digital logic gates.',
        booleanFormula: 'N/A (Unsafe for breadboard)',
        totalStepsCount: 0,
        apparatus: [],
        stepRoadmap: [],
      };
    }

    // 2. Check for Physical Breadboard Capacity Violations (Pentium, 64-bit CPU, 32-bit RISC-V, 100MHz RF)
    if (
      q.includes('64-bit') ||
      q.includes('32-bit cpu') ||
      q.includes('pentium') ||
      q.includes('microprocessor from scratch') ||
      q.includes('gpu') ||
      q.includes('ghz') ||
      q.includes('100mhz') ||
      q.includes('radio frequency transmitter') ||
      q.includes('radar')
    ) {
      return {
        isAcceptable: false,
        verdict: 'REJECTED_UNFEASIBLE',
        aim: raw,
        verdictTitle: 'Hardware Limit: Exceeds 830-Tie Breadboard Capacity & Parasitics',
        reasoning:
          'An 830-tie breadboard has 2–5 pF of parasitic capacitance and ~10 nH inductance between adjacent tie clips, limiting signal integrity to < 10 MHz. A complete 32/64-bit CPU requires thousands of logic gates, exceeding the physical space of a single breadboard chassis.',
        suggestedAlternative:
          'Construct an essential computational ALU module: a 1-Bit Full Adder with Sum & Carry-out (using IC 7486 XOR and IC 7408 AND), or a 2:1 Multiplexer (Data Selector).',
        booleanFormula: 'Sum = A ⊕ B ⊕ Cin  |  Cout = (A • B) + (Cin • (A ⊕ B))',
        totalStepsCount: 0,
        apparatus: [],
        stepRoadmap: [],
      };
    }

    // 3. Match against Standard Known Laboratory Experiments
    const knownExp = this.findMatchingPredefinedExperiment(q);
    if (knownExp) {
      return this.buildResultFromExperiment(raw, knownExp, 'ACCEPTED', 'Feasible on 830-Tie Breadboard (5V TTL)');
    }

    // 4. Arbitrary Boolean Logic Compiler (Equation Parsing & Hardware Mapping)
    const hasBooleanSyntax =
      raw.includes('=') ||
      raw.includes('•') ||
      raw.includes('+') ||
      raw.includes('*') ||
      raw.includes('^') ||
      raw.includes("'") ||
      raw.includes('!') ||
      raw.includes('~') ||
      q.includes('xor') ||
      q.includes('nand') ||
      q.includes('nor') ||
      q.includes('xnor');

    if (hasBooleanSyntax && !q.includes('motor') && !q.includes('cpu')) {
      try {
        const compiled = BooleanCompiler.compile(raw);
        if (compiled.variables.length > 0 && compiled.gateOps.length > 0) {
          const stepRoadmap: AimStepSummary[] = compiled.experiment.steps.map((st, idx) => ({
            stepNumber: idx + 1,
            title: st.title,
            category: AimEvaluator.categorizeStep(st.title, idx),
            instruction: st.instruction,
          }));

          return {
            isAcceptable: true,
            verdict: 'ACCEPTED',
            aim: raw,
            verdictTitle: 'Compiled Custom Boolean Logic (DRC Verified)',
            reasoning: `Your Boolean equation ${compiled.normalizedExpression} with ${compiled.variables.length} variable(s) (${compiled.variables.join(', ')}) was compiled into ${compiled.gateOps.length} gate operation(s) across ${compiled.requiredICs.length} DIP IC(s).`,
            booleanFormula: compiled.normalizedExpression,
            totalStepsCount: compiled.experiment.steps.length,
            apparatus: compiled.apparatus,
            stepRoadmap,
            experiment: compiled.experiment,
          };
        }
      } catch {
        // Fall through to semantic synthesizer
      }
    }

    // 5. Synthesize via Dynamic AI Circuit Generator
    // Check if the aim mentions valid digital / analog concepts
    const isDigitalLogic =
      q.includes('gate') ||
      q.includes('adder') ||
      q.includes('multiplexer') ||
      q.includes('mux') ||
      q.includes('demux') ||
      q.includes('encoder') ||
      q.includes('decoder') ||
      q.includes('flip flop') ||
      q.includes('latch') ||
      q.includes('counter') ||
      q.includes('timer') ||
      q.includes('555') ||
      q.includes('comparator') ||
      q.includes('majority') ||
      q.includes('voter') ||
      q.includes('detector') ||
      q.includes('sensor') ||
      q.includes('led') ||
      q.includes('logic') ||
      q.includes('boolean');

    if (isDigitalLogic) {
      // Map to synthesized circuit
      let synthesized: Experiment;
      let formula = 'Y = f(A, B, C)';
      let adjustment = false;

      if (q.includes('majority') || q.includes('voter') || q.includes('voting')) {
        synthesized = (AICircuitGenerator as any).synthesizeMajorityVoter();
        formula = 'Y = (A • B) + (B • C) + (A • C)';
      } else if (q.includes('multiplexer') || q.includes('mux')) {
        synthesized = (AICircuitGenerator as any).synthesizeMultiplexer();
        formula = 'Y = (S\' • D0) + (S • D1)';
      } else if (q.includes('comparator') || q.includes('equality') || q.includes('compare')) {
        synthesized = (AICircuitGenerator as any).synthesizeComparator();
        formula = 'Y = (A ⊙ B) = (A • B) + (A\' • B\')';
      } else if (q.includes('detector') || q.includes('darkness') || q.includes('light') || q.includes('alarm')) {
        synthesized = (AICircuitGenerator as any).synthesizeLightDetector();
        formula = 'Vout = (Vldr < Vref) ? 5V : 0V';
      } else if (q.includes('xor') && q.includes('nand')) {
        synthesized = (AICircuitGenerator as any).synthesizeXorFromNand();
        formula = 'Y = ((A • (AB)\')\' • (B • (AB)\')\')\' = A ⊕ B';
      } else if (q.includes('sr') || q.includes('latch') || q.includes('flip flop')) {
        synthesized = (AICircuitGenerator as any).synthesizeSRLatch();
        formula = 'Q(t+1) = S + R\' • Q(t)';
      } else if (q.includes('full adder') || (q.includes('adder') && (q.includes('3') || q.includes('carry')))) {
        synthesized = (AICircuitGenerator as any).synthesizeFullAdder();
        formula = 'Sum = A ⊕ B ⊕ Cin  |  Cout = (A • B) + (Cin • (A ⊕ B))';
      } else {
        synthesized = (AICircuitGenerator as any).synthesizeDynamicCustom(raw);
        formula = 'Y = A • B';
        adjustment = true;
      }

      return this.buildResultFromExperiment(
        raw,
        synthesized,
        adjustment ? 'ACCEPTED_WITH_ADJUSTMENTS' : 'ACCEPTED',
        adjustment
          ? 'Accepted with Component Adjustments (Mapped to Standard 5V TTL)'
          : 'Feasible on 830-Tie Breadboard (5V TTL)',
        formula
      );
    }

    // 5. Fallback for ambiguous or vague aim
    const fallbackExp = (AICircuitGenerator as any).synthesizeDynamicCustom(raw);
    return {
      isAcceptable: true,
      verdict: 'ACCEPTED_WITH_ADJUSTMENTS',
      aim: raw,
      verdictTitle: 'Synthesized with Lab Standard 5V TTL Components',
      reasoning:
        'Your aim has been interpreted and adapted to the standard Texas Instruments TTL component inventory available on the 830-tie breadboard.',
      suggestedAlternative: 'Verify with 7408 AND, 7432 OR, or 7404 NOT logic gates.',
      booleanFormula: 'Y = A • B',
      totalStepsCount: fallbackExp.steps.length,
      apparatus: fallbackExp.apparatus,
      stepRoadmap: fallbackExp.steps.map((st: any, i: number) => ({
        stepNumber: i + 1,
        title: st.title,
        category: AimEvaluator.categorizeStep(st.title, i),
        instruction: st.instruction,
      })),
      experiment: fallbackExp,
    };
  }

  private static findMatchingPredefinedExperiment(q: string): Experiment | undefined {
    return EXPERIMENTS.find((e) => {
      const title = e.title.toLowerCase();
      const aim = e.aim.toLowerCase();
      if (q.includes('half adder') && (title.includes('half adder') || aim.includes('half adder'))) return true;
      if (q.includes('7400') || (q.includes('nand') && !q.includes('xor'))) {
        if (title.includes('7400') || title.includes('nand')) return true;
      }
      if (q.includes('7402') || q.includes('nor')) {
        if (title.includes('7402') || title.includes('nor')) return true;
      }
      if (q.includes('7408') || (q.includes('and gate') && !q.includes('majority'))) {
        if (title.includes('7408') || title.includes('and gate')) return true;
      }
      if (q.includes('555') || q.includes('astable') || q.includes('clock generator')) {
        if (title.includes('555') || title.includes('astable')) return true;
      }
      if (q.includes('7-segment') || q.includes('seven segment') || q.includes('bcd')) {
        if (title.includes('7-segment') || title.includes('bcd')) return true;
      }
      if (q.includes('counter') || q.includes('modulo-4') || q.includes('7476')) {
        if (title.includes('counter') || title.includes('7476')) return true;
      }
      return false;
    });
  }

  private static buildResultFromExperiment(
    rawAim: string,
    exp: Experiment,
    verdict: 'ACCEPTED' | 'ACCEPTED_WITH_ADJUSTMENTS',
    verdictTitle: string,
    formulaOverride?: string
  ): AimEvaluationResult {
    // Extract canonical boolean formula from override, theory, or title
    let formula = formulaOverride || 'Y = f(A, B)';
    if (!formulaOverride) {
      if (exp.theory.includes('Formula:') || exp.theory.includes('equation:')) {
        const match = exp.theory.match(/(?:Formula|equation):\s*([^\.\n]+)/i);
        if (match && match[1]) {
          formula = match[1].trim();
        }
      } else if (exp.title.includes('AND')) {
        formula = 'Y = A • B';
      } else if (exp.title.includes('NAND')) {
        formula = 'Y = (A • B)\'';
      } else if (exp.title.includes('NOR')) {
        formula = 'Y = (A + B)\'';
      } else if (exp.title.includes('Half Adder')) {
        formula = 'Sum = A ⊕ B  |  Carry = A • B';
      } else if (exp.title.includes('Majority')) {
        formula = 'Y = (A • B) + (B • C) + (A • C)';
      } else if (exp.title.includes('Multiplexer')) {
        formula = 'Y = (S\' • D0) + (S • D1)';
      }
    }

    const stepRoadmap: AimStepSummary[] = exp.steps.map((st, idx) => ({
      stepNumber: idx + 1,
      title: st.title,
      category: AimEvaluator.categorizeStep(st.title, idx),
      instruction: st.instruction,
    }));

    return {
      isAcceptable: true,
      verdict,
      aim: rawAim,
      verdictTitle,
      reasoning: `The aim is fully viable on a standard 830-tie solderless breadboard. Requires ${exp.apparatus.filter((a) => a.id.startsWith('ic')).length || 1} DIP IC(s), 5V DC regulated power, and ${exp.steps.length} sequential construction steps.`,
      booleanFormula: formula,
      totalStepsCount: exp.steps.length,
      apparatus: exp.apparatus,
      stepRoadmap,
      experiment: exp,
    };
  }

  private static categorizeStep(
    title: string,
    index: number
  ): 'Power Rails' | 'IC Placement' | 'IC Power' | 'Signal Wiring' | 'I/O & Indicator' {
    const t = title.toLowerCase();
    if (t.includes('rail') || t.includes('bridge') || index <= 1 && t.includes('power')) return 'Power Rails';
    if (t.includes('insert') || t.includes('seat') || t.includes('trench')) return 'IC Placement';
    if (t.includes('pin 14') || t.includes('pin 7') || t.includes('ic power') || t.includes('ic ground')) return 'IC Power';
    if (t.includes('switch') || t.includes('led') || t.includes('resistor') || t.includes('indicator')) return 'I/O & Indicator';
    return 'Signal Wiring';
  }
}
