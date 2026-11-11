import { Experiment, ApparatusItem, NavigationStep } from '../types/experiment';
import { PlacedIC, JumperWire, PlacedResistor, PlacedLED, PlacedSwitch } from '../types/circuit';
import { CircuitDRC } from './circuitDRC';

export type ASTNode =
  | { type: 'VAR'; name: string }
  | { type: 'CONST'; value: 0 | 1 }
  | { type: 'NOT'; child: ASTNode }
  | { type: 'BINARY'; op: 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'; left: ASTNode; right: ASTNode };

export interface CompiledGateOp {
  id: string;
  op: 'NOT' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR';
  inputs: (string | number)[]; // variable names or previous gate IDs
  outputId: string;
  outputLabel: string;
}

export interface BooleanCompilerResult {
  rawExpression: string;
  normalizedExpression: string;
  variables: string[];
  ast: ASTNode;
  truthTable: {
    headers: string[];
    rows: (string | number)[][];
  };
  requiredICs: { model: string; name: string; count: number }[];
  apparatus: ApparatusItem[];
  experiment: Experiment;
  gateOps: CompiledGateOp[];
}

export class BooleanCompiler {
  /**
   * Parse an arbitrary Boolean expression string into an AST.
   * Handles implicit multiplication (e.g. AB -> A AND B, A'B -> (NOT A) AND B),
   * postfix NOT (A'), prefix NOT (!A, ~A), and operators (*, +, ^, NAND, NOR, XNOR).
   */
  public static parseExpression(input: string): { ast: ASTNode; variables: string[]; formula: string } {
    let expr = input.trim();

    // Strip left side if formatted as "Y = ..." or "F(...) = ..."
    if (expr.includes('=')) {
      expr = expr.split('=')[1].trim();
    }

    // Tokenize with normalization
    const tokens = this.tokenize(expr);
    const parser = new BooleanParser(tokens);
    const ast = parser.parse();
    const variables = Array.from(this.extractVariables(ast)).sort();

    return {
      ast,
      variables,
      formula: `Y = ${expr}`,
    };
  }

  /**
   * Tokenize expression string into stream of normalized tokens
   */
  private static tokenize(expr: string): string[] {
    const rawTokens: string[] = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Check multi-character operator keywords
      const upperRem = expr.slice(i).toUpperCase();
      if (upperRem.startsWith('NAND')) {
        rawTokens.push('NAND');
        i += 4;
        continue;
      }
      if (upperRem.startsWith('XNOR')) {
        rawTokens.push('XNOR');
        i += 4;
        continue;
      }
      if (upperRem.startsWith('NOR')) {
        rawTokens.push('NOR');
        i += 3;
        continue;
      }
      if (upperRem.startsWith('XOR')) {
        rawTokens.push('XOR');
        i += 3;
        continue;
      }
      if (upperRem.startsWith('AND')) {
        rawTokens.push('AND');
        i += 3;
        continue;
      }
      if (upperRem.startsWith('OR')) {
        rawTokens.push('OR');
        i += 2;
        continue;
      }
      if (upperRem.startsWith('NOT')) {
        rawTokens.push('NOT');
        i += 3;
        continue;
      }

      // Symbols
      if (ch === '(' || ch === ')') {
        rawTokens.push(ch);
        i++;
      } else if (ch === "'" || ch === '’') {
        rawTokens.push("'");
        i++;
      } else if (ch === '!' || ch === '~') {
        rawTokens.push('NOT');
        i++;
      } else if (ch === '&' || ch === '*' || ch === '•' || ch === '·') {
        rawTokens.push('AND');
        i++;
      } else if (ch === '+' || ch === '|') {
        rawTokens.push('OR');
        i++;
      } else if (ch === '^' || ch === '⊕') {
        rawTokens.push('XOR');
        i++;
      } else if (ch === '⊙') {
        rawTokens.push('XNOR');
        i++;
      } else if (upperRem.startsWith('CIN') && !/[a-zA-Z0-9]/.test(expr[i + 3] || '')) {
        rawTokens.push('CIN');
        i += 3;
      } else if (upperRem.startsWith('COUT') && !/[a-zA-Z0-9]/.test(expr[i + 4] || '')) {
        rawTokens.push('COUT');
        i += 4;
      } else if (upperRem.startsWith('CLK') && !/[a-zA-Z0-9]/.test(expr[i + 3] || '')) {
        rawTokens.push('CLK');
        i += 3;
      } else {
        // Check letter + digits (e.g. D0, D1, S0, S1, A1)
        const letterDigitMatch = expr.slice(i).match(/^([a-zA-Z][0-9]+)/);
        if (letterDigitMatch) {
          rawTokens.push(letterDigitMatch[1].toUpperCase());
          i += letterDigitMatch[1].length;
        } else if (/[a-zA-Z]/.test(ch)) {
          // Single-letter variable (e.g. A, B, C) allowing AB -> A AND B
          rawTokens.push(ch.toUpperCase());
          i++;
        } else if (ch === '0' || ch === '1') {
          rawTokens.push(ch);
          i++;
        } else {
          // Unknown character ignored
          i++;
        }
      }
    }

    // Insert implicit AND tokens:
    // e.g. [A, B] -> [A, AND, B]
    // [A, '(', B] -> [A, AND, '(', B]
    // [')', A] -> [')', AND, A]
    // ["'", A] -> ["'", AND, A]
    // ["'", '('] -> ["'", AND, '(']
    const isOperatorToken = (t: string) => ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR'].includes(t);
    const tokens: string[] = [];
    for (let k = 0; k < rawTokens.length; k++) {
      const cur = rawTokens[k];
      tokens.push(cur);

      if (k < rawTokens.length - 1) {
        const nxt = rawTokens[k + 1];
        const curIsVar = (/^[A-Z][A-Z0-9]*$/.test(cur) || cur === '0' || cur === '1') && !isOperatorToken(cur);
        const curIsPostNot = cur === "'";
        const curIsClose = cur === ')';
        const nxtIsVar = (/^[A-Z][A-Z0-9]*$/.test(nxt) || nxt === '0' || nxt === '1') && !isOperatorToken(nxt);
        const nxtIsOpen = nxt === '(';
        const nxtIsPreNot = nxt === 'NOT';

        const needsAnd =
          (curIsVar && (nxtIsVar || nxtIsOpen || nxtIsPreNot)) ||
          (curIsPostNot && (nxtIsVar || nxtIsOpen || nxtIsPreNot)) ||
          (curIsClose && (nxtIsVar || nxtIsOpen || nxtIsPreNot));

        if (needsAnd) {
          tokens.push('AND');
        }
      }
    }

    return tokens;
  }

  private static extractVariables(node: ASTNode, out: Set<string> = new Set()): Set<string> {
    if (node.type === 'VAR') {
      out.add(node.name);
    } else if (node.type === 'NOT') {
      this.extractVariables(node.child, out);
    } else if (node.type === 'BINARY') {
      this.extractVariables(node.left, out);
      this.extractVariables(node.right, out);
    }
    return out;
  }

  /**
   * Evaluate AST node for a specific variable assignment
   */
  public static evaluateAST(node: ASTNode, env: Record<string, 0 | 1>): 0 | 1 {
    switch (node.type) {
      case 'VAR':
        return env[node.name] ?? 0;
      case 'CONST':
        return node.value;
      case 'NOT':
        return this.evaluateAST(node.child, env) === 1 ? 0 : 1;
      case 'BINARY': {
        const l = this.evaluateAST(node.left, env);
        const r = this.evaluateAST(node.right, env);
        switch (node.op) {
          case 'AND':
            return l === 1 && r === 1 ? 1 : 0;
          case 'OR':
            return l === 1 || r === 1 ? 1 : 0;
          case 'XOR':
            return l !== r ? 1 : 0;
          case 'NAND':
            return l === 1 && r === 1 ? 0 : 1;
          case 'NOR':
            return l === 1 || r === 1 ? 0 : 1;
          case 'XNOR':
            return l === r ? 1 : 0;
        }
      }
    }
  }

  /**
   * Generate complete truth table for all 2^N combinations
   */
  public static generateTruthTable(ast: ASTNode, variables: string[]): { headers: string[]; rows: (string | number)[][] } {
    const headers = [...variables.map((v) => `Input ${v}`), 'Output Y', 'LED State'];
    const rowCount = Math.pow(2, variables.length);
    const rows: (string | number)[][] = [];

    for (let r = 0; r < rowCount; r++) {
      const env: Record<string, 0 | 1> = {};
      const rowVals: (string | number)[] = [];

      // Determine binary bits (MSB to LSB)
      for (let i = 0; i < variables.length; i++) {
        const shift = variables.length - 1 - i;
        const bit = ((r >> shift) & 1) as 0 | 1;
        env[variables[i]] = bit;
        rowVals.push(bit);
      }

      const outY = this.evaluateAST(ast, env);
      rowVals.push(outY);
      rowVals.push(outY === 1 ? 'ON (Lit)' : 'OFF (Dark)');
      rows.push(rowVals);
    }

    return { headers, rows };
  }

  /**
   * Decompose the AST into a sequence of 2-input gate operations
   */
  public static linearizeGates(ast: ASTNode): CompiledGateOp[] {
    const ops: CompiledGateOp[] = [];
    let counter = 1;

    const traverse = (node: ASTNode): string => {
      if (node.type === 'VAR') {
        return node.name;
      }
      if (node.type === 'CONST') {
        return String(node.value);
      }
      if (node.type === 'NOT') {
        const childId = traverse(node.child);
        const opId = `gate_not_${counter++}`;
        ops.push({
          id: opId,
          op: 'NOT',
          inputs: [childId],
          outputId: opId,
          outputLabel: `${childId}'`,
        });
        return opId;
      }
      if (node.type === 'BINARY') {
        const lId = traverse(node.left);
        const rId = traverse(node.right);
        const opId = `gate_${node.op.toLowerCase()}_${counter++}`;
        ops.push({
          id: opId,
          op: node.op,
          inputs: [lId, rId],
          outputId: opId,
          outputLabel: `(${lId} ${node.op} ${rId})`,
        });
        return opId;
      }
      return '0';
    };

    traverse(ast);
    return ops;
  }

  /**
   * Compile an arbitrary Boolean expression into a physical 830-tie breadboard Experiment.
   * Allocates physical 74xx DIP ICs, maps pins, generates step-by-step construction,
   * and verifies through CircuitDRC.
   */
  public static compile(rawInput: string): BooleanCompilerResult {
    const { ast, variables, formula } = this.parseExpression(rawInput);
    const truthTable = this.generateTruthTable(ast, variables);
    const gateOps = this.linearizeGates(ast);

    // Determine required IC models
    const neededModels: Set<string> = new Set();
    for (const op of gateOps) {
      if (op.op === 'NOT') neededModels.add('7404');
      if (op.op === 'AND') neededModels.add('7408');
      if (op.op === 'OR') neededModels.add('7432');
      if (op.op === 'XOR') neededModels.add('7486');
      if (op.op === 'NAND') neededModels.add('7400');
      if (op.op === 'NOR') neededModels.add('7402');
      if (op.op === 'XNOR') {
        neededModels.add('7486');
        neededModels.add('7404');
      }
    }

    if (neededModels.size === 0) {
      neededModels.add('7408'); // Default buffer/AND if trivial
    }

    // Map ICs to physical breadboard rows across center trench
    const icList: { model: string; name: string; count: number }[] = [];
    const modelToRow: Record<string, number> = {};
    let startRow = 14;

    const icNames: Record<string, string> = {
      '7404': 'IC 7404 Hex Inverter',
      '7408': 'IC 7408 Quad 2-Input AND',
      '7432': 'IC 7432 Quad 2-Input OR',
      '7486': 'IC 7486 Quad 2-Input XOR',
      '7400': 'IC 7400 Quad 2-Input NAND',
      '7402': 'IC 7402 Quad 2-Input NOR',
    };

    for (const model of neededModels) {
      icList.push({
        model,
        name: icNames[model] || `IC ${model}`,
        count: 1,
      });
      modelToRow[model] = startRow;
      startRow += 14; // Space between ICs
    }

    // Apparatus list
    const apparatus: ApparatusItem[] = [
      { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Dual power rails with center divider trench' },
      ...icList.map((ic) => ({
        id: `ic-${ic.model}`,
        name: ic.name,
        count: 1,
        description: `14-pin DIP package seated across rows ${modelToRow[ic.model]}..${modelToRow[ic.model] + 6}`,
      })),
      ...variables.map((v) => ({
        id: `sw-${v.toLowerCase()}`,
        name: `SPST Switch (${v})`,
        count: 1,
        description: `Logic input switch for variable ${v}`,
      })),
      { id: 'led', name: 'Indicator LED', count: 1, description: 'Visual logic output level' },
      { id: 'res', name: '330Ω Current-Limiting Resistor', count: 1, description: 'Protects LED from overcurrent' },
      { id: 'wires', name: 'M-M Jumper Wires', count: 10 + gateOps.length * 2, description: 'Breadboard interconnections' },
    ];

    // Build Sequential Turn-by-Turn Construction Steps
    const steps: NavigationStep[] = [];

    // STEP 1: Power & Ground Rails
    steps.push({
      stepNumber: 1,
      title: 'Bridge Power & Ground Rails',
      instruction: 'Connect Top Red (+5V) to Bottom Red (+5V), and Top Blue (GND) to Bottom Blue (GND) with jumper wires.',
      subText: 'Distributes regulated +5V VCC and common 0V ground references across both sides of the breadboard.',
      commonPitfall: 'Never cross Red (+5V) into Blue (GND), as this causes an immediate short circuit.',
      highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1', 'TOP_GND_1', 'BOT_GND_1'],
      wireToAdd: {
        id: 'wire-vcc-bridge',
        fromHole: 'TOP_VCC_1',
        toHole: 'BOT_VCC_1',
        color: 'red',
        label: '+5V Power Bridge',
      },
      wiresToAdd: [
        {
          id: 'wire-gnd-bridge',
          fromHole: 'TOP_GND_1',
          toHole: 'BOT_GND_1',
          color: 'blue',
          label: 'GND Ground Bridge',
        },
      ],
    });

    // STEP 2: Seat DIP ICs across the center trench
    const placedICs: PlacedIC[] = [];
    for (const ic of icList) {
      const row = modelToRow[ic.model];
      const pinHoles: Record<number, string> = {};
      for (let p = 1; p <= 7; p++) pinHoles[p] = `f${row + p - 1}`;
      for (let p = 8; p <= 14; p++) pinHoles[p] = `e${row + 14 - p}`;

      placedICs.push({
        id: `ic-${ic.model}`,
        model: ic.model,
        startRow: row,
        notchFacing: 'LEFT',
        pinHoles,
      });
    }

    steps.push({
      stepNumber: 2,
      title: `Insert ${icList.map((ic) => ic.model).join(' & ')} ICs Across Center Trench`,
      instruction: `Seat each IC firmly straddling the center trench: Pin 1 notch facing row ${modelToRow[icList[0].model]} to the left.`,
      subText: 'Straddling the trench ensures pins 1–7 and pins 8–14 are electrically isolated.',
      highlightHoles: placedICs.flatMap((ic) => [ic.pinHoles[1], ic.pinHoles[7], ic.pinHoles[14]]),
      icToAdd: placedICs[0],
      icsToAdd: placedICs.slice(1),
    });

    // STEP 3: Wire Power (Pin 14 to +5V) and Ground (Pin 7 to GND) for each IC
    const powerWires: JumperWire[] = [];
    for (const ic of placedICs) {
      powerWires.push({
        id: `wire-vcc-${ic.model}`,
        fromHole: ic.pinHoles[14],
        toHole: `TOP_VCC_${ic.startRow}`,
        color: 'red',
        label: `VCC (${ic.model})`,
      });
      powerWires.push({
        id: `wire-gnd-${ic.model}`,
        fromHole: ic.pinHoles[7],
        toHole: `BOT_GND_${ic.startRow + 6}`,
        color: 'blue',
        label: `GND (${ic.model})`,
      });
    }

    steps.push({
      stepNumber: 3,
      title: 'Power the ICs (Pin 14 to +5V, Pin 7 to GND)',
      instruction: 'Run Red jumper wires from Pin 14 of each IC to the +5V rail, and Blue jumpers from Pin 7 to the GND rail.',
      subText: 'Standard Texas Instruments TTL 74xx pinouts require +5V regulated DC at Pin 14 and 0V reference at Pin 7.',
      highlightHoles: powerWires.map((w) => w.fromHole),
      wireToAdd: powerWires[0],
      wiresToAdd: powerWires.slice(1),
    });

    // STEP 4: Input Switches Setup
    const switchList: PlacedSwitch[] = [];
    const switchWires: JumperWire[] = [];
    variables.forEach((v, idx) => {
      const swHoleA = `j${5 + idx * 3}`;
      const swHoleB = `h${5 + idx * 3}`;
      const pullDownResRow = 5 + idx * 3;
      switchList.push({
        id: `sw-${v.toLowerCase()}`,
        label: `Switch ${v}`,
        holeA: swHoleA,
        holeB: swHoleB,
        isClosed: false,
      });

      switchWires.push({
        id: `wire-sw-power-${v.toLowerCase()}`,
        fromHole: `TOP_VCC_${pullDownResRow}`,
        toHole: swHoleA,
        color: 'yellow',
        label: `Input ${v}`,
      });
    });

    steps.push({
      stepNumber: 4,
      title: `Wire Input Switches (${variables.join(', ')})`,
      instruction: `Connect ${variables.length} SPST switches representing variables ${variables.join(', ')} with pull-down resistors to GND.`,
      subText: 'Toggle switches will deliver HIGH (+5V) when closed and LOW (0V) when open.',
      highlightHoles: switchList.map((s) => s.holeA),
      switchToAdd: switchList[0],
      switchesToAdd: switchList.slice(1),
      wireToAdd: switchWires[0],
      wiresToAdd: switchWires.slice(1),
    });

    // STEP 5: Route Logic Gate Interconnections
    const gateWires: JumperWire[] = [];
    let primaryIc = placedICs.find((ic) => ic.model === '7408') || placedICs[0];

    // Connect input variables to gate inputs
    variables.forEach((v, idx) => {
      const swHole = `h${5 + idx * 3}`;
      const targetPinHole = primaryIc.pinHoles[idx + 1] || `g${primaryIc.startRow + idx}`;
      gateWires.push({
        id: `wire-route-${v.toLowerCase()}`,
        fromHole: swHole,
        toHole: targetPinHole,
        color: idx % 2 === 0 ? 'green' : 'orange',
        label: `Input ${v} -> Gate`,
      });
    });

    // Route intermediate gate outputs
    if (placedICs.length > 1) {
      const ic1 = placedICs[0];
      const ic2 = placedICs[1];
      gateWires.push({
        id: 'wire-gate-cascade',
        fromHole: ic1.pinHoles[3] || `g${ic1.startRow + 2}`,
        toHole: ic2.pinHoles[1] || `g${ic2.startRow}`,
        color: 'blue',
        label: 'Intermediate Product Cascade',
      });
    }

    steps.push({
      stepNumber: 5,
      title: 'Route Logic Gate Interconnections',
      instruction: `Wire signal inputs from switches to the logic gate inputs: ${gateOps.map((g) => g.op).join(' -> ')}.`,
      subText: 'Follow Texas Instruments pin conventions: Inputs on pins 1 & 2 feed output pin 3.',
      highlightHoles: gateWires.map((w) => w.toHole),
      wireToAdd: gateWires[0],
      wiresToAdd: gateWires.slice(1),
    });

    // STEP 6: Output Indicator LED and Current-Limiting Resistor
    const lastIC = placedICs[placedICs.length - 1];
    const outputPinHole = lastIC.pinHoles[3] || `g${lastIC.startRow + 2}`;
    const ledAnodeHole = 'c55';
    const ledCathodeHole = 'c56';
    const resistorHoleA = 'b56';
    const resistorHoleB = 'BOT_GND_56';

    const outputWire: JumperWire = {
      id: 'wire-output-led',
      fromHole: outputPinHole,
      toHole: 'd55',
      color: 'yellow',
      label: 'Output Y to LED Anode',
    };

    const led: PlacedLED = {
      id: 'led-out-compiled',
      anodeHole: ledAnodeHole,
      cathodeHole: ledCathodeHole,
      color: 'green',
      isLit: false,
    };

    const resistor: PlacedResistor = {
      id: 'res-limiter-compiled',
      fromHole: resistorHoleA,
      toHole: resistorHoleB,
      valueOhms: 330,
      bands: ['orange', 'orange', 'brown', 'gold'],
    };

    steps.push({
      stepNumber: 6,
      title: 'Connect Output Indicator (LED + 330Ω Resistor)',
      instruction: 'Route the final gate output to LED Anode (+). Connect LED Cathode (-) through a 330Ω resistor to the GND rail.',
      subText: 'The 330Ω resistor limits current to ~10mA, protecting the LED and TTL gate from burn-out.',
      commonPitfall: 'The longer leg is the Anode (+). Reversing the LED will prevent it from lighting up.',
      highlightHoles: [outputPinHole, ledAnodeHole, ledCathodeHole, resistorHoleA, resistorHoleB],
      wireToAdd: outputWire,
      ledToAdd: led,
      resistorToAdd: resistor,
    });

    // Compile into raw Experiment
    const rawExp: Experiment = {
      id: `compiled-${Date.now()}`,
      title: `Compiled Logic: ${formula}`,
      category: 'Synthesized Custom Boolean Logic',
      aim: `To construct and verify the physical breadboard realization of Boolean expression ${formula} using standard TTL logic gates.`,
      theory: `The Boolean equation ${formula} has ${variables.length} input variable(s) (${variables.join(', ')}) yielding ${truthTable.rows.length} truth table permutations. The circuit is physically implemented using ${icList.map((i) => i.name).join(', ')}.`,
      apparatus,
      truthTable,
      steps,
    };

    // Run through Deterministic Design Rule Checker (DRC)
    const drcResult = CircuitDRC.validateAndSanitize(rawExp);

    return {
      rawExpression: rawInput,
      normalizedExpression: formula,
      variables,
      ast,
      truthTable,
      requiredICs: icList,
      apparatus,
      experiment: drcResult.sanitizedExperiment,
      gateOps,
    };
  }
}

/**
 * Recursive Descent Boolean Expression Parser
 * Precedence:
 * 1. Parentheses ( ... )
 * 2. Postfix NOT (') and Prefix NOT (!)
 * 3. AND, NAND
 * 4. XOR, XNOR
 * 5. OR, NOR
 */
class BooleanParser {
  private tokens: string[];
  private pos = 0;

  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  private peek(): string | undefined {
    return this.tokens[this.pos];
  }

  private consume(expected?: string): string {
    const cur = this.tokens[this.pos++];
    if (expected && cur !== expected) {
      throw new Error(`Expected token '${expected}' but found '${cur}'`);
    }
    return cur;
  }

  public parse(): ASTNode {
    if (this.tokens.length === 0) {
      return { type: 'CONST', value: 0 };
    }
    const node = this.parseOr();
    return node;
  }

  // Level 5: OR, NOR
  private parseOr(): ASTNode {
    let left = this.parseXor();

    while (this.peek() === 'OR' || this.peek() === 'NOR') {
      const op = this.consume() as 'OR' | 'NOR';
      const right = this.parseXor();
      left = { type: 'BINARY', op, left, right };
    }

    return left;
  }

  // Level 4: XOR, XNOR
  private parseXor(): ASTNode {
    let left = this.parseAnd();

    while (this.peek() === 'XOR' || this.peek() === 'XNOR') {
      const op = this.consume() as 'XOR' | 'XNOR';
      const right = this.parseAnd();
      left = { type: 'BINARY', op, left, right };
    }

    return left;
  }

  // Level 3: AND, NAND
  private parseAnd(): ASTNode {
    let left = this.parseNot();

    while (this.peek() === 'AND' || this.peek() === 'NAND') {
      const op = this.consume() as 'AND' | 'NAND';
      const right = this.parseNot();
      left = { type: 'BINARY', op, left, right };
    }

    return left;
  }

  // Level 2: Prefix NOT (!) and Postfix NOT (')
  private parseNot(): ASTNode {
    if (this.peek() === 'NOT') {
      this.consume();
      const child = this.parseNot();
      return { type: 'NOT', child };
    }

    let node = this.parsePrimary();

    // Handle postfix NOT: A', (A+B)'
    while (this.peek() === "'") {
      this.consume("'");
      node = { type: 'NOT', child: node };
    }

    return node;
  }

  // Level 1: Primary (Variables, Constants, Parentheses)
  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (!token) {
      return { type: 'CONST', value: 0 };
    }

    if (token === '(') {
      this.consume('(');
      const inner = this.parseOr();
      if (this.peek() === ')') {
        this.consume(')');
      }
      return inner;
    }

    if (token === '0' || token === '1') {
      this.consume();
      return { type: 'CONST', value: Number(token) as 0 | 1 };
    }

    if (/^[A-Z][A-Z0-9]*$/.test(token)) {
      this.consume();
      return { type: 'VAR', name: token };
    }

    // Fallback consume
    this.consume();
    return { type: 'VAR', name: token };
  }
}
