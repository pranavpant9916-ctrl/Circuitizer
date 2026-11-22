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

export interface ParsedOutput {
  name: string;
  rawExpr: string;
  normalizedExpr: string;
  ast: ASTNode;
  variables: string[];
}

export interface MultiOutputParseResult {
  outputs: ParsedOutput[];
  allVariables: string[];
  combinedFormula: string;
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
  outputs?: {
    name: string;
    formula: string;
    ast: ASTNode;
    gateOps: CompiledGateOp[];
    color: 'green' | 'red' | 'yellow' | 'blue';
  }[];
}

interface GateSlot {
  pinInputs: number[];
  pinOutput: number;
}

const IC_GATE_SLOTS: Record<string, GateSlot[]> = {
  '7408': [
    { pinInputs: [1, 2], pinOutput: 3 },
    { pinInputs: [4, 5], pinOutput: 6 },
    { pinInputs: [9, 10], pinOutput: 8 },
    { pinInputs: [12, 13], pinOutput: 11 },
  ],
  '7432': [
    { pinInputs: [1, 2], pinOutput: 3 },
    { pinInputs: [4, 5], pinOutput: 6 },
    { pinInputs: [9, 10], pinOutput: 8 },
    { pinInputs: [12, 13], pinOutput: 11 },
  ],
  '7486': [
    { pinInputs: [1, 2], pinOutput: 3 },
    { pinInputs: [4, 5], pinOutput: 6 },
    { pinInputs: [9, 10], pinOutput: 8 },
    { pinInputs: [12, 13], pinOutput: 11 },
  ],
  '7400': [
    { pinInputs: [1, 2], pinOutput: 3 },
    { pinInputs: [4, 5], pinOutput: 6 },
    { pinInputs: [9, 10], pinOutput: 8 },
    { pinInputs: [12, 13], pinOutput: 11 },
  ],
  '7402': [
    { pinInputs: [2, 3], pinOutput: 1 },
    { pinInputs: [5, 6], pinOutput: 4 },
    { pinInputs: [8, 9], pinOutput: 10 },
    { pinInputs: [11, 12], pinOutput: 13 },
  ],
  '7404': [
    { pinInputs: [1], pinOutput: 2 },
    { pinInputs: [3], pinOutput: 4 },
    { pinInputs: [5], pinOutput: 6 },
    { pinInputs: [9], pinOutput: 8 },
    { pinInputs: [11], pinOutput: 10 },
    { pinInputs: [13], pinOutput: 12 },
  ],
};

const IC_DISPLAY_NAMES: Record<string, string> = {
  '7404': 'IC 7404 Hex Inverter',
  '7408': 'IC 7408 Quad 2-Input AND',
  '7432': 'IC 7432 Quad 2-Input OR',
  '7486': 'IC 7486 Quad 2-Input XOR',
  '7400': 'IC 7400 Quad 2-Input NAND',
  '7402': 'IC 7402 Quad 2-Input NOR',
};

const LED_COLOR_PALETTE: Array<'green' | 'red' | 'yellow' | 'blue'> = ['green', 'red', 'yellow', 'blue'];

export class BooleanCompiler {
  /**
   * Parse multiple Boolean equations separated by semicolon, newline, or comma.
   * e.g. "Sum = A ^ B ^ Cin; Cout = A*B + Cin*(A ^ B)"
   */
  public static parseMultiExpression(input: string): MultiOutputParseResult {
    const raw = input.trim();
    let segments = raw
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // If no semicolons or newlines, check if multiple equations are separated by comma (e.g. "S = A^B, C = A*B")
    if (segments.length === 1 && segments[0].includes(',')) {
      const commaParts = segments[0].split(/,\s*(?=[A-Za-z][A-Za-z0-9_]*\s*=)/);
      if (commaParts.length > 1) {
        segments = commaParts.map((s) => s.trim()).filter(Boolean);
      }
    }

    if (segments.length === 0) {
      segments = ['Y = 0'];
    }

    const outputs: ParsedOutput[] = [];
    const varSet = new Set<string>();

    segments.forEach((seg, idx) => {
      let outName = segments.length > 1 ? `Y${idx + 1}` : 'Y';
      let expr = seg;

      if (seg.includes('=')) {
        const eqIdx = seg.indexOf('=');
        const leftPart = seg.substring(0, eqIdx).trim();
        expr = seg.substring(eqIdx + 1).trim();

        const match = leftPart.match(/^([A-Za-z][A-Za-z0-9_]*)/);
        if (match) {
          outName = match[1];
        } else {
          outName = leftPart || (segments.length > 1 ? `Y${idx + 1}` : 'Y');
        }
      }

      const tokens = this.tokenize(expr);
      const parser = new BooleanParser(tokens);
      const ast = parser.parse();
      const vars = Array.from(this.extractVariables(ast)).sort();
      vars.forEach((v) => varSet.add(v));

      const label = this.getNodeLabel(ast);
      const normalizedExpr = `${outName} = ${label || expr}`;

      outputs.push({
        name: outName,
        rawExpr: expr,
        normalizedExpr,
        ast,
        variables: vars,
      });
    });

    const allVariables = Array.from(varSet).sort();
    const combinedFormula = outputs.map((o) => o.normalizedExpr).join('; ');

    return {
      outputs,
      allVariables,
      combinedFormula,
    };
  }

  /**
   * Parse an arbitrary Boolean expression string into an AST.
   * Handles implicit multiplication, postfix NOT, prefix NOT, and operators.
   * Backward-compatible helper that delegates to parseMultiExpression.
   */
  public static parseExpression(input: string): { ast: ASTNode; variables: string[]; formula: string; outputs?: ParsedOutput[] } {
    const multi = this.parseMultiExpression(input);
    const primary = multi.outputs[0];

    return {
      ast: primary.ast,
      variables: multi.allVariables,
      formula: multi.combinedFormula,
      outputs: multi.outputs,
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
      if (upperRem.startsWith('NAND') && !/[a-zA-Z0-9_]/.test(expr[i + 4] || '')) {
        rawTokens.push('NAND');
        i += 4;
        continue;
      }
      if (upperRem.startsWith('XNOR') && !/[a-zA-Z0-9_]/.test(expr[i + 4] || '')) {
        rawTokens.push('XNOR');
        i += 4;
        continue;
      }
      if (upperRem.startsWith('NOR') && !/[a-zA-Z0-9_]/.test(expr[i + 3] || '')) {
        rawTokens.push('NOR');
        i += 3;
        continue;
      }
      if (upperRem.startsWith('XOR') && !/[a-zA-Z0-9_]/.test(expr[i + 3] || '')) {
        rawTokens.push('XOR');
        i += 3;
        continue;
      }
      if (upperRem.startsWith('AND') && !/[a-zA-Z0-9_]/.test(expr[i + 3] || '')) {
        rawTokens.push('AND');
        i += 3;
        continue;
      }
      if (upperRem.startsWith('OR') && !/[a-zA-Z0-9_]/.test(expr[i + 2] || '')) {
        rawTokens.push('OR');
        i += 2;
        continue;
      }
      if (upperRem.startsWith('NOT') && !/[a-zA-Z0-9_]/.test(expr[i + 3] || '')) {
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
      } else if (ch === '0' || ch === '1') {
        rawTokens.push(ch);
        i++;
      } else {
        // Check common pin keywords first
        const upperSub = expr.slice(i).toUpperCase();
        if (upperSub.startsWith('CIN') && !/[a-zA-Z0-9_]/.test(expr[i + 3] || '')) {
          rawTokens.push('CIN');
          i += 3;
        } else if (upperSub.startsWith('COUT') && !/[a-zA-Z0-9_]/.test(expr[i + 4] || '')) {
          rawTokens.push('COUT');
          i += 4;
        } else if (upperSub.startsWith('CLK') && !/[a-zA-Z0-9_]/.test(expr[i + 3] || '')) {
          rawTokens.push('CLK');
          i += 3;
        } else {
          // Check letter + digits (e.g. D0, S1, A1, IN1)
          const letterDigitMatch = expr.slice(i).match(/^([a-zA-Z]+[0-9]+)/);
          if (letterDigitMatch) {
            rawTokens.push(letterDigitMatch[1].toUpperCase());
            i += letterDigitMatch[1].length;
          } else if (/[a-zA-Z]/.test(ch)) {
            // Single-letter variable (e.g. A, B, C) enabling juxtaposition like AB -> A AND B
            rawTokens.push(ch.toUpperCase());
            i++;
          } else {
            i++;
          }
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
        const curIsVar = (/^[A-Z][A-Z0-9_]*$/.test(cur) || cur === '0' || cur === '1') && !isOperatorToken(cur);
        const curIsPostNot = cur === "'";
        const curIsClose = cur === ')';
        const nxtIsVar = (/^[A-Z][A-Z0-9_]*$/.test(nxt) || nxt === '0' || nxt === '1') && !isOperatorToken(nxt);
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
   * Generate multi-output truth table with parallel output columns
   */
  public static generateMultiOutputTruthTable(
    outputs: ParsedOutput[],
    variables: string[]
  ): { headers: string[]; rows: (string | number)[][] } {
    const headers = [
      ...variables.map((v) => `Input ${v}`),
      ...outputs.map((o) => `Output ${o.name}`),
      outputs.length === 1 ? 'LED State' : 'LED States',
    ];

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

      // Evaluate each output
      const outVals: (0 | 1)[] = outputs.map((o) => this.evaluateAST(o.ast, env));
      outVals.forEach((val) => rowVals.push(val));

      // LED State column
      if (outputs.length === 1) {
        rowVals.push(outVals[0] === 1 ? 'ON (Lit)' : 'OFF (Dark)');
      } else {
        const summary = outputs
          .map((o, idx) => `${o.name}: ${outVals[idx] === 1 ? 'ON' : 'OFF'}`)
          .join(' | ');
        rowVals.push(summary);
      }

      rows.push(rowVals);
    }

    return { headers, rows };
  }

  /**
   * Generate truth table for a single AST (backward compatibility)
   */
  public static generateTruthTable(ast: ASTNode, variables: string[]): { headers: string[]; rows: (string | number)[][] } {
    return this.generateMultiOutputTruthTable(
      [{ name: 'Y', rawExpr: '', normalizedExpr: 'Y', ast, variables }],
      variables
    );
  }

  /**
   * Derive a clean, human-readable algebraic label for an AST subtree
   */
  public static getNodeLabel(node: ASTNode): string {
    if (node.type === 'VAR') return node.name;
    if (node.type === 'CONST') return String(node.value);
    if (node.type === 'NOT') {
      if (node.child.type === 'VAR') return `${node.child.name}'`;
      return `(${this.getNodeLabel(node.child)})'`;
    }
    if (node.type === 'BINARY') {
      const l = this.getNodeLabel(node.left);
      const r = this.getNodeLabel(node.right);
      const opSym =
        node.op === 'AND' ? '•' :
        node.op === 'OR' ? '+' :
        node.op === 'XOR' ? '⊕' :
        node.op === 'XNOR' ? '⊙' : node.op;

      if (node.op === 'NAND') return `(${l} • ${r})'`;
      if (node.op === 'NOR') return `(${l} + ${r})'`;
      return `${l} ${opSym} ${r}`;
    }
    return '';
  }

  /**
   * Decompose an AST into a sequence of 2-input gate operations
   */
  public static linearizeGates(ast: ASTNode, counterStart = 1, prefix = 'gate'): { ops: CompiledGateOp[]; nextCounter: number } {
    const ops: CompiledGateOp[] = [];
    let counter = counterStart;

    const traverse = (node: ASTNode): string => {
      if (node.type === 'VAR') return node.name;
      if (node.type === 'CONST') return String(node.value);

      if (node.type === 'NOT') {
        const childId = traverse(node.child);
        const opId = `${prefix}_not_${counter++}`;
        const label = this.getNodeLabel(node);
        ops.push({
          id: opId,
          op: 'NOT',
          inputs: [childId],
          outputId: opId,
          outputLabel: label,
        });
        return opId;
      }

      if (node.type === 'BINARY') {
        const lId = traverse(node.left);
        const rId = traverse(node.right);
        const opId = `${prefix}_${node.op.toLowerCase()}_${counter++}`;
        const label = this.getNodeLabel(node);
        ops.push({
          id: opId,
          op: node.op,
          inputs: [lId, rId],
          outputId: opId,
          outputLabel: label,
        });
        return opId;
      }

      return '0';
    };

    traverse(ast);
    return { ops, nextCounter: counter };
  }

  /**
   * Compile arbitrary Boolean expressions (single or multi-output) into a physical 830-tie breadboard Experiment.
   * Allocates physical 74xx DIP ICs, maps pins, generates step-by-step construction with dedicated indicator LEDs,
   * and verifies through CircuitDRC.
   */
  public static compile(rawInput: string): BooleanCompilerResult {
    const multi = this.parseMultiExpression(rawInput);
    const variables = multi.allVariables;
    const truthTable = this.generateMultiOutputTruthTable(multi.outputs, variables);

    // Linearize gate operations for each output with distinct gate IDs
    let globalCounter = 1;
    const outputGateOps: Array<{ output: ParsedOutput; ops: CompiledGateOp[]; terminalGateId: string }> = [];
    const allGateOps: CompiledGateOp[] = [];

    multi.outputs.forEach((out, oIdx) => {
      const { ops, nextCounter } = this.linearizeGates(out.ast, globalCounter, `g${oIdx + 1}`);
      globalCounter = nextCounter;
      allGateOps.push(...ops);
      const terminalGateId = ops.length > 0 ? ops[ops.length - 1].outputId : '';
      outputGateOps.push({
        output: out,
        ops,
        terminalGateId,
      });
    });

    // 1. Allocate Physical ICs and Gate Slots
    // Determine which models are needed
    interface AllocatedSlot {
      icId: string;
      icModel: string;
      op: string;
      inputHoles: string[];
      outputHole: string;
      pinInputs: number[];
      pinOutput: number;
    }

    const gateSlotMap: Record<string, AllocatedSlot> = {};
    const placedICs: PlacedIC[] = [];
    const icModelUsage: Record<string, { count: number; currentSlotIdx: number; instances: PlacedIC[] }> = {};
    let nextStartRow = 14;

    const getOrAllocateSlot = (opType: 'NOT' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'): AllocatedSlot => {
      // Map op to IC model
      const model =
        opType === 'NOT' ? '7404' :
        opType === 'AND' ? '7408' :
        opType === 'OR' ? '7432' :
        opType === 'XOR' ? '7486' :
        opType === 'NAND' ? '7400' :
        opType === 'NOR' ? '7402' : '7408';

      const slots = IC_GATE_SLOTS[model] || IC_GATE_SLOTS['7408'];

      if (!icModelUsage[model]) {
        icModelUsage[model] = { count: 0, currentSlotIdx: 0, instances: [] };
      }

      const usage = icModelUsage[model];
      let currentIC: PlacedIC;

      // Check if we need a new IC instance
      if (usage.instances.length === 0 || usage.currentSlotIdx >= slots.length) {
        usage.count++;
        usage.currentSlotIdx = 0;
        const icId = `ic-${model}${usage.count > 1 ? `-${usage.count}` : ''}`;
        const row = nextStartRow;
        nextStartRow += 14;

        const pinHoles: Record<number, string> = {};
        for (let p = 1; p <= 7; p++) pinHoles[p] = `f${row + p - 1}`;
        for (let p = 8; p <= 14; p++) pinHoles[p] = `e${row + 14 - p}`;

        currentIC = {
          id: icId,
          model,
          startRow: row,
          notchFacing: 'LEFT',
          pinHoles,
        };
        usage.instances.push(currentIC);
        placedICs.push(currentIC);
      } else {
        currentIC = usage.instances[usage.instances.length - 1];
      }

      const slot = slots[usage.currentSlotIdx];
      usage.currentSlotIdx++;

      return {
        icId: currentIC.id,
        icModel: model,
        op: opType,
        pinInputs: slot.pinInputs,
        pinOutput: slot.pinOutput,
        inputHoles: slot.pinInputs.map((p) => currentIC.pinHoles[p]),
        outputHole: currentIC.pinHoles[slot.pinOutput],
      };
    };

    // If no gate operations (e.g. constant 0/1 or direct wire), allocate at least one 7408 as buffer/placeholder
    if (allGateOps.length === 0) {
      getOrAllocateSlot('AND');
    } else {
      for (const op of allGateOps) {
        gateSlotMap[op.id] = getOrAllocateSlot(op.op);
      }
    }

    // Compile apparatus list
    const icList: { model: string; name: string; count: number }[] = [];
    for (const [model, info] of Object.entries(icModelUsage)) {
      icList.push({
        model,
        name: IC_DISPLAY_NAMES[model] || `IC ${model}`,
        count: info.count,
      });
    }

    const apparatus: ApparatusItem[] = [
      { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Dual power rails with center divider trench' },
      ...icList.map((ic) => ({
        id: `ic-${ic.model}`,
        name: ic.name,
        count: ic.count,
        description: `${ic.count}x 14-pin DIP package(s) seated across the center trench`,
      })),
      ...variables.map((v) => ({
        id: `sw-${v.toLowerCase()}`,
        name: `SPST Switch (${v})`,
        count: 1,
        description: `Logic input switch for variable ${v}`,
      })),
      ...multi.outputs.map((out, idx) => ({
        id: `led-${out.name.toLowerCase()}`,
        name: `${LED_COLOR_PALETTE[idx % LED_COLOR_PALETTE.length].toUpperCase()} Indicator LED (${out.name})`,
        count: 1,
        description: `Visual output indicator for ${out.name}`,
      })),
      {
        id: 'res',
        name: `${multi.outputs.length}x 330Ω Current-Limiting Resistors`,
        count: multi.outputs.length,
        description: 'Protects LEDs from overcurrent',
      },
      {
        id: 'wires',
        name: 'M-M Jumper Wires',
        count: 10 + allGateOps.length * 2 + multi.outputs.length * 2,
        description: 'Breadboard interconnections',
      },
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
    steps.push({
      stepNumber: 2,
      title: `Insert ${placedICs.map((ic) => ic.model).join(' & ')} ICs Across Center Trench`,
      instruction: `Seat each IC firmly straddling the center trench: Pin 1 notch facing row ${placedICs[0].startRow} to the left.`,
      subText: 'Straddling the trench ensures pins 1–7 and pins 8–14 are electrically isolated.',
      highlightHoles: placedICs.flatMap((ic) => [ic.pinHoles[1], ic.pinHoles[7], ic.pinHoles[14]]),
      icToAdd: placedICs[0],
      icsToAdd: placedICs.slice(1),
    });

    // STEP 3: Wire Power (Pin 14 to +5V) and Ground (Pin 7 to GND) for each IC
    const powerWires: JumperWire[] = [];
    for (const ic of placedICs) {
      powerWires.push({
        id: `wire-vcc-${ic.id}`,
        fromHole: ic.pinHoles[14],
        toHole: `TOP_VCC_${ic.startRow}`,
        color: 'red',
        label: `VCC (${ic.model})`,
      });
      powerWires.push({
        id: `wire-gnd-${ic.id}`,
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
    const variableSwitchHoleMap: Record<string, string> = {};

    variables.forEach((v, idx) => {
      const col = 5 + idx * 3;
      const swHoleA = `j${col}`;
      const swHoleB = `h${col}`;
      variableSwitchHoleMap[v] = swHoleB;

      switchList.push({
        id: `sw-${v.toLowerCase()}`,
        label: `Switch ${v}`,
        holeA: swHoleA,
        holeB: swHoleB,
        isClosed: false,
      });

      switchWires.push({
        id: `wire-sw-power-${v.toLowerCase()}`,
        fromHole: `TOP_VCC_${col}`,
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
    allGateOps.forEach((op, opIdx) => {
      const slot = gateSlotMap[op.id];
      if (!slot) return;

      op.inputs.forEach((inp, inpIdx) => {
        const inpStr = String(inp);
        const targetHole = slot.inputHoles[inpIdx];

        if (variableSwitchHoleMap[inpStr]) {
          // Input from a primary variable switch
          gateWires.push({
            id: `wire-gate-${opIdx}-in-${inpIdx}`,
            fromHole: variableSwitchHoleMap[inpStr],
            toHole: targetHole,
            color: inpIdx % 2 === 0 ? 'green' : 'orange',
            label: `${inpStr} -> ${slot.icModel} Pin ${slot.pinInputs[inpIdx]}`,
          });
        } else if (gateSlotMap[inpStr]) {
          // Input from an upstream gate output
          const upSlot = gateSlotMap[inpStr];
          gateWires.push({
            id: `wire-cascade-${inpStr}-to-${op.id}-in-${inpIdx}`,
            fromHole: upSlot.outputHole,
            toHole: targetHole,
            color: 'blue',
            label: `Gate ${upSlot.op} Out -> ${slot.icModel} In`,
          });
        }
      });
    });

    // If no gate wires generated, add a direct feed wire to ensure connectivity
    if (gateWires.length === 0 && variables.length > 0) {
      gateWires.push({
        id: 'wire-gate-direct',
        fromHole: variableSwitchHoleMap[variables[0]],
        toHole: placedICs[0].pinHoles[1],
        color: 'green',
        label: `${variables[0]} -> IC Pin 1`,
      });
    }

    steps.push({
      stepNumber: 5,
      title: 'Route Logic Gate Interconnections',
      instruction: `Wire signal inputs from switches to the logic gate inputs: ${allGateOps.map((g) => g.op).join(' -> ') || 'Direct Connection'}.`,
      subText: 'Follow Texas Instruments pin conventions: Gate inputs feed corresponding output pins across the IC packages.',
      highlightHoles: gateWires.map((w) => w.toHole),
      wireToAdd: gateWires[0],
      wiresToAdd: gateWires.slice(1),
    });

    // STEP 6: Output Indicator LEDs and Current-Limiting Resistors (Multi-Output Support)
    const outputWires: JumperWire[] = [];
    const outputLEDs: PlacedLED[] = [];
    const outputResistors: PlacedResistor[] = [];
    const ledHighlightHoles: string[] = [];

    // Columns allocated for indicator LEDs on right breadboard area
    const LED_COLUMNS = [54, 58, 50, 46, 62];

    multi.outputs.forEach((out, idx) => {
      const col = LED_COLUMNS[idx % LED_COLUMNS.length];
      const color = LED_COLOR_PALETTE[idx % LED_COLOR_PALETTE.length];
      const anodeHole = `c${col}`;
      const cathodeHole = `c${col + 1}`;
      const resistorHoleA = `b${col + 1}`;
      const resistorHoleB = `BOT_GND_${col + 1}`;
      const driveWireHole = `d${col}`;

      // Determine driving hole: either the terminal gate output or primary switch
      const outInfo = outputGateOps[idx];
      let sourceHole = '';
      if (outInfo && outInfo.terminalGateId && gateSlotMap[outInfo.terminalGateId]) {
        sourceHole = gateSlotMap[outInfo.terminalGateId].outputHole;
      } else if (variables.length > 0 && variableSwitchHoleMap[variables[0]]) {
        sourceHole = variableSwitchHoleMap[variables[0]];
      } else {
        sourceHole = placedICs[0].pinHoles[3];
      }

      outputWires.push({
        id: `wire-out-${out.name.toLowerCase()}`,
        fromHole: sourceHole,
        toHole: driveWireHole,
        color: color === 'red' ? 'red' : color === 'green' ? 'green' : 'yellow',
        label: `Output ${out.name} -> ${color.toUpperCase()} LED`,
      });

      outputLEDs.push({
        id: `led-${out.name.toLowerCase()}`,
        anodeHole,
        cathodeHole,
        color,
        isLit: false,
      });

      outputResistors.push({
        id: `res-limiter-${out.name.toLowerCase()}`,
        fromHole: resistorHoleA,
        toHole: resistorHoleB,
        valueOhms: 330,
        bands: ['orange', 'orange', 'brown', 'gold'],
      });

      ledHighlightHoles.push(sourceHole, anodeHole, cathodeHole, resistorHoleA, resistorHoleB);
    });

    const outputTitle =
      multi.outputs.length === 1
        ? `Connect Output Indicator (${multi.outputs[0].name} LED + 330Ω Resistor)`
        : `Connect Output Indicators (${multi.outputs.map((o, i) => `${o.name} [${LED_COLOR_PALETTE[i % LED_COLOR_PALETTE.length].toUpperCase()}]`).join(', ')})`;

    steps.push({
      stepNumber: 6,
      title: outputTitle,
      instruction:
        multi.outputs.length === 1
          ? `Route the gate output to LED Anode (+). Connect LED Cathode (-) through a 330Ω resistor to the GND rail.`
          : `Route each gate output to its designated indicator LED (${multi.outputs.map((o, i) => `${o.name}=${LED_COLOR_PALETTE[i % LED_COLOR_PALETTE.length].toUpperCase()}`).join(', ')}). Connect each cathode through a 330Ω resistor to GND.`,
      subText: 'The 330Ω resistors limit current to ~10mA, protecting the LEDs and TTL gates from burn-out.',
      commonPitfall: 'The longer leg is the Anode (+). Reversing an LED will prevent it from illuminating.',
      highlightHoles: ledHighlightHoles,
      wireToAdd: outputWires[0],
      wiresToAdd: outputWires.slice(1),
      ledToAdd: outputLEDs[0],
      ledsToAdd: outputLEDs.slice(1),
      resistorToAdd: outputResistors[0],
      resistorsToAdd: outputResistors.slice(1),
    });

    // Compile into raw Experiment
    const rawExp: Experiment = {
      id: `compiled-${Date.now()}`,
      title: `Compiled Logic: ${multi.combinedFormula}`,
      category: multi.outputs.length > 1 ? 'Synthesized Multi-Output Logic' : 'Synthesized Custom Boolean Logic',
      aim: `To construct and verify the physical breadboard realization of Boolean system ${multi.combinedFormula} using standard TTL logic gates.`,
      theory: `The Boolean system ${multi.combinedFormula} has ${variables.length} input variable(s) (${variables.join(', ')}) with ${multi.outputs.length} output(s) (${multi.outputs.map((o) => o.name).join(', ')}), yielding ${truthTable.rows.length} truth table permutations. The circuit is physically implemented using ${icList.map((i) => i.name).join(', ')}.`,
      apparatus,
      truthTable,
      steps,
    };

    // Run through Deterministic Design Rule Checker (DRC)
    const drcResult = CircuitDRC.validateAndSanitize(rawExp);

    return {
      rawExpression: rawInput,
      normalizedExpression: multi.combinedFormula,
      variables,
      ast: multi.outputs[0].ast,
      truthTable,
      requiredICs: icList,
      apparatus,
      experiment: drcResult.sanitizedExperiment,
      gateOps: allGateOps,
      outputs: multi.outputs.map((out, idx) => ({
        name: out.name,
        formula: out.normalizedExpr,
        ast: out.ast,
        gateOps: outputGateOps[idx]?.ops || [],
        color: LED_COLOR_PALETTE[idx % LED_COLOR_PALETTE.length],
      })),
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

    if (/^[A-Z][A-Z0-9_]*$/.test(token)) {
      this.consume();
      return { type: 'VAR', name: token };
    }

    // Fallback consume
    this.consume();
    return { type: 'VAR', name: token };
  }
}
