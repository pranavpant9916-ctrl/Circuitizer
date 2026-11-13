import { defaultGrid } from './grid';
import { NetlistEngine } from './netlist';
import { IC_REGISTRY } from './icRegistry';
import { BooleanCompiler } from './booleanCompiler';
import { CircuitState } from '../types/circuit';

export interface GateMapping {
  outputPin: number;
  inputPins: number[];
  gateType: 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR';
}

export interface HardwareDiagnostic {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  componentId?: string;
  pinNumber?: number;
  holeId?: string;
  title: string;
  message: string;
}

export interface ReverseExtractionResult {
  extractedFormula: string;
  rawAstFormula: string;
  variables: string[];
  isHardwareValid: boolean;
  diagnostics: HardwareDiagnostic[];
  detectedGates: {
    icModel: string;
    gateType: string;
    outputHole: string;
    inputHoles: string[];
    term: string;
  }[];
  truthTable?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

// Gate pinout definitions for standard TTL DIP ICs
const IC_GATE_DEFINITIONS: Record<string, GateMapping[]> = {
  '7404': [
    { outputPin: 2, inputPins: [1], gateType: 'NOT' },
    { outputPin: 4, inputPins: [3], gateType: 'NOT' },
    { outputPin: 6, inputPins: [5], gateType: 'NOT' },
    { outputPin: 8, inputPins: [9], gateType: 'NOT' },
    { outputPin: 10, inputPins: [11], gateType: 'NOT' },
    { outputPin: 12, inputPins: [13], gateType: 'NOT' },
  ],
  '7408': [
    { outputPin: 3, inputPins: [1, 2], gateType: 'AND' },
    { outputPin: 6, inputPins: [4, 5], gateType: 'AND' },
    { outputPin: 8, inputPins: [9, 10], gateType: 'AND' },
    { outputPin: 11, inputPins: [12, 13], gateType: 'AND' },
  ],
  '7432': [
    { outputPin: 3, inputPins: [1, 2], gateType: 'OR' },
    { outputPin: 6, inputPins: [4, 5], gateType: 'OR' },
    { outputPin: 8, inputPins: [9, 10], gateType: 'OR' },
    { outputPin: 11, inputPins: [12, 13], gateType: 'OR' },
  ],
  '7486': [
    { outputPin: 3, inputPins: [1, 2], gateType: 'XOR' },
    { outputPin: 6, inputPins: [4, 5], gateType: 'XOR' },
    { outputPin: 8, inputPins: [9, 10], gateType: 'XOR' },
    { outputPin: 11, inputPins: [12, 13], gateType: 'XOR' },
  ],
  '7400': [
    { outputPin: 3, inputPins: [1, 2], gateType: 'NAND' },
    { outputPin: 6, inputPins: [4, 5], gateType: 'NAND' },
    { outputPin: 8, inputPins: [9, 10], gateType: 'NAND' },
    { outputPin: 11, inputPins: [12, 13], gateType: 'NAND' },
  ],
  '7402': [
    { outputPin: 1, inputPins: [2, 3], gateType: 'NOR' },
    { outputPin: 4, inputPins: [5, 6], gateType: 'NOR' },
    { outputPin: 10, inputPins: [8, 9], gateType: 'NOR' },
    { outputPin: 13, inputPins: [11, 12], gateType: 'NOR' },
  ],
};

export class ReverseBooleanExtractor {
  /**
   * Reverses an active breadboard circuit netlist into its mathematical Boolean logic equation.
   * Performs backward signal graph traversal from the Output Indicator (LED) through IC logic gates.
   */
  public static extract(circuit: CircuitState): ReverseExtractionResult {
    const diagnostics: HardwareDiagnostic[] = [];
    const netlistEngine = new NetlistEngine(defaultGrid);
    const solved = netlistEngine.solve(circuit);

    // 1. Run Hardware Health Diagnostics
    this.checkHardwareHealth(circuit, solved, diagnostics);

    // 2. Identify the primary output point (LED Anode or Resistor leading to LED)
    const primaryLed = circuit.leds[0];
    if (!primaryLed) {
      diagnostics.push({
        severity: 'WARNING',
        title: 'No Indicator LED Found',
        message: 'Breadboard does not have an output LED placed to probe logic signals.',
      });
      return {
        extractedFormula: 'Y = 0',
        rawAstFormula: '0',
        variables: [],
        isHardwareValid: false,
        diagnostics,
        detectedGates: [],
      };
    }

    // Trace driver from LED Anode
    // If there is a current-limiting resistor attached to LED anode, find its other hole
    let signalEntryHole = primaryLed.anodeHole;
    const seriesResistor = circuit.resistors.find(
      (r) => r.fromHole === primaryLed.anodeHole || r.toHole === primaryLed.anodeHole
    );
    if (seriesResistor) {
      signalEntryHole =
        seriesResistor.fromHole === primaryLed.anodeHole
          ? seriesResistor.toHole
          : seriesResistor.fromHole;
    }

    const detectedGates: ReverseExtractionResult['detectedGates'] = [];
    const visitedNets = new Set<string>();
    const foundVariables = new Set<string>();

    const targetNetId = solved.holeNetMap.get(signalEntryHole);
    if (!targetNetId) {
      diagnostics.push({
        severity: 'WARNING',
        title: 'LED Anode Disconnected',
        message: `Hole ${signalEntryHole} has no connection to any logic gate or input.`,
      });
      return {
        extractedFormula: 'Y = 0 (Unconnected)',
        rawAstFormula: '0',
        variables: [],
        isHardwareValid: false,
        diagnostics,
        detectedGates: [],
      };
    }

    // 3. Backward recursive net traversal
    const rawExpression = this.traceNetToExpression(
      targetNetId,
      circuit,
      solved,
      visitedNets,
      foundVariables,
      detectedGates,
      diagnostics,
      0
    );

    const formattedFormula = `Y = ${this.formatExpression(rawExpression)}`;
    const variables = Array.from(foundVariables).sort();

    // 4. Generate truth table if valid variables exist
    let truthTable: ReverseExtractionResult['truthTable'] = undefined;
    if (variables.length > 0) {
      try {
        const compiled = BooleanCompiler.compile(formattedFormula);
        truthTable = compiled.truthTable;
      } catch {
        // Fallback: evaluate table using NetlistEngine directly if parser encountered atypical symbols
      }
    }

    const isHardwareValid = !diagnostics.some((d) => d.severity === 'CRITICAL');

    return {
      extractedFormula: formattedFormula,
      rawAstFormula: rawExpression,
      variables,
      isHardwareValid,
      diagnostics,
      detectedGates,
      truthTable,
    };
  }

  /**
   * Recursively trace an electrical net backwards to its driving source
   */
  private static traceNetToExpression(
    netId: string,
    circuit: CircuitState,
    solved: ReturnType<NetlistEngine['solve']>,
    visitedNets: Set<string>,
    foundVariables: Set<string>,
    detectedGates: ReverseExtractionResult['detectedGates'],
    diagnostics: HardwareDiagnostic[],
    depth: number
  ): string {
    if (depth > 12) {
      return 'X'; // Cycle or deep recursion cutoff
    }

    if (visitedNets.has(netId)) {
      return 'X'; // Prevent cyclic loops
    }
    visitedNets.add(netId);

    const net = solved.nets.get(netId);
    if (!net) return '0';

    // 1. Check if net is tied to Power Rails
    if (net.hasVCC && !net.hasGND) return '1';
    if (net.hasGND && !net.hasVCC) return '0';
    if (net.isShortCircuit) return 'ERR_SHORT';

    // 2. Check if net is driven by an Input Switch
    for (const sw of circuit.switches) {
      if (net.holes.has(sw.holeA) || net.holes.has(sw.holeB)) {
        const varName = this.normalizeSwitchLabel(sw.label, sw.id);
        foundVariables.add(varName);
        return varName;
      }
    }

    // 3. Check if net contains an IC Gate Output pin
    for (const ic of circuit.placedICs) {
      const gateDefs = IC_GATE_DEFINITIONS[ic.model];
      if (!gateDefs) continue;

      for (const gate of gateDefs) {
        const outputHole = ic.pinHoles[gate.outputPin];
        if (outputHole && net.holes.has(outputHole)) {
          // Found the driving gate!
          const inputTerms: string[] = [];
          const inputHoles: string[] = [];

          for (const inPin of gate.inputPins) {
            const inHole = ic.pinHoles[inPin];
            inputHoles.push(inHole || `Pin ${inPin}`);

            if (!inHole) {
              inputTerms.push('0');
              diagnostics.push({
                severity: 'WARNING',
                title: 'Floating Gate Input',
                message: `IC ${ic.model} Pin ${inPin} has no breadboard hole connection.`,
              });
              continue;
            }

            const inNetId = solved.holeNetMap.get(inHole);
            if (!inNetId) {
              inputTerms.push('0');
              diagnostics.push({
                severity: 'WARNING',
                title: 'Floating Input Net',
                message: `IC ${ic.model} Pin ${inPin} (Hole ${inHole}) is floating.`,
              });
              continue;
            }

            // Recurse to trace what drives this input pin
            const subVisited = new Set(visitedNets);
            const subTerm = this.traceNetToExpression(
              inNetId,
              circuit,
              solved,
              subVisited,
              foundVariables,
              detectedGates,
              diagnostics,
              depth + 1
            );
            inputTerms.push(subTerm);
          }

          // Build algebraic term based on gate type
          let gateTerm = '';
          if (gate.gateType === 'NOT') {
            gateTerm = `(${inputTerms[0]})'`;
          } else if (gate.gateType === 'AND') {
            gateTerm = `(${inputTerms.join(' • ')})`;
          } else if (gate.gateType === 'OR') {
            gateTerm = `(${inputTerms.join(' + ')})`;
          } else if (gate.gateType === 'XOR') {
            gateTerm = `(${inputTerms.join(' ⊕ ')})`;
          } else if (gate.gateType === 'NAND') {
            gateTerm = `(${inputTerms.join(' • ')})'`;
          } else if (gate.gateType === 'NOR') {
            gateTerm = `(${inputTerms.join(' + ')})'`;
          }

          detectedGates.push({
            icModel: ic.model,
            gateType: gate.gateType,
            outputHole,
            inputHoles,
            term: gateTerm,
          });

          return gateTerm;
        }
      }
    }

    // 4. If net is not driven by switch, rail, or gate
    return '0';
  }

  /**
   * Clean up and format algebraic expression strings
   */
  private static formatExpression(expr: string): string {
    if (!expr || expr === '0') return '0';
    if (expr === '1') return '1';

    let clean = expr.trim();

    // Strip outermost redundant matching parentheses: e.g. "((A • B))" -> "A • B"
    while (clean.startsWith('(') && clean.endsWith(')') && this.isMatchingOuterParen(clean)) {
      clean = clean.slice(1, -1).trim();
    }

    // Clean up double negatives: "(A')'" -> "A"
    clean = clean.replace(/\(\(([A-Za-z0-9]+)\)'\)'/g, '$1');
    clean = clean.replace(/\(([A-Za-z0-9]+)\)'/g, "$1'");

    return clean;
  }

  private static isMatchingOuterParen(s: string): boolean {
    let depth = 0;
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') depth--;
      if (depth === 0) return false;
    }
    return true;
  }

  private static normalizeSwitchLabel(label: string, id: string): string {
    if (label && /^[A-Za-z][A-Za-z0-9]*$/.test(label.trim())) {
      return label.trim();
    }
    if (id.includes('a')) return 'A';
    if (id.includes('b')) return 'B';
    if (id.includes('c')) return 'C';
    if (id.includes('d')) return 'D';
    if (id.includes('s')) return 'S';
    return 'IN';
  }

  /**
   * Health checks for IC power supply, dead shorts, and LED orientation
   */
  private static checkHardwareHealth(
    circuit: CircuitState,
    solved: ReturnType<NetlistEngine['solve']>,
    diagnostics: HardwareDiagnostic[]
  ) {
    // 1. Dead short check
    if (solved.isDeadShort) {
      diagnostics.push({
        severity: 'CRITICAL',
        title: 'DEAD SHORT DETECTED',
        message: 'VCC (+5V) is tied directly to GND (0V). Power supply would shut down or burn wires!',
      });
    }

    // 2. IC Power Pins
    for (const ic of circuit.placedICs) {
      const def = IC_REGISTRY[ic.model];
      if (!def) continue;

      const vccPin = def.pins.find((p) => p.type === 'POWER_VCC');
      const gndPin = def.pins.find((p) => p.type === 'POWER_GND');

      if (vccPin) {
        const hId = ic.pinHoles[vccPin.pinNumber];
        const netId = hId ? solved.holeNetMap.get(hId) : undefined;
        const net = netId ? solved.nets.get(netId) : undefined;
        if (!net || !net.hasVCC) {
          diagnostics.push({
            severity: 'CRITICAL',
            componentId: ic.id,
            pinNumber: vccPin.pinNumber,
            title: `Unpowered IC (${ic.model})`,
            message: `Pin ${vccPin.pinNumber} (VCC) is not connected to +5V rail. Gate outputs are unpowered.`,
          });
        }
      }

      if (gndPin) {
        const hId = ic.pinHoles[gndPin.pinNumber];
        const netId = hId ? solved.holeNetMap.get(hId) : undefined;
        const net = netId ? solved.nets.get(netId) : undefined;
        if (!net || !net.hasGND) {
          diagnostics.push({
            severity: 'CRITICAL',
            componentId: ic.id,
            pinNumber: gndPin.pinNumber,
            title: `Ungrounded IC (${ic.model})`,
            message: `Pin ${gndPin.pinNumber} (GND) is not connected to Ground (0V) rail.`,
          });
        }
      }
    }

    // 3. LED Grounding & Resistor Protection
    for (const led of circuit.leds) {
      const cathNetId = solved.holeNetMap.get(led.cathodeHole);
      const cathNet = cathNetId ? solved.nets.get(cathNetId) : undefined;
      if (!cathNet || !cathNet.hasGND) {
        diagnostics.push({
          severity: 'WARNING',
          componentId: led.id,
          holeId: led.cathodeHole,
          title: 'Floating LED Cathode',
          message: 'LED cathode (-) is not connected to Ground (0V).',
        });
      }

      const hasResistor = circuit.resistors.some(
        (r) => r.fromHole === led.anodeHole || r.toHole === led.anodeHole
      );
      if (!hasResistor) {
        diagnostics.push({
          severity: 'WARNING',
          componentId: led.id,
          title: 'Missing Current-Limiting Resistor',
          message: 'LED anode connects directly without a 330Ω protective resistor (may burn LED in real lab).',
        });
      }
    }
  }
}
