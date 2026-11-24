import { describe, it, expect } from 'vitest';
import { BooleanCompiler } from '../engine/booleanCompiler';

describe('BooleanCompiler', () => {
  it('parses single expression and generates correct truth table', () => {
    const result = BooleanCompiler.compile('Y = A * B + C');
    expect(result.variables).toEqual(['A', 'B', 'C']);
    expect(result.truthTable.rows.length).toBe(8);

    // Verify row for A=1, B=1, C=0 -> Y=1
    const row110 = result.truthTable.rows.find(
      (r) => r[0] === 1 && r[1] === 1 && r[2] === 0
    );
    expect(row110).toBeDefined();
    expect(row110![3]).toBe(1);

    // Verify row for A=0, B=1, C=0 -> Y=0
    const row010 = result.truthTable.rows.find(
      (r) => r[0] === 0 && r[1] === 1 && r[2] === 0
    );
    expect(row010).toBeDefined();
    expect(row010![3]).toBe(0);
  });

  it('supports XOR and NOT expressions', () => {
    const result = BooleanCompiler.compile("Y = A ^ B'");
    expect(result.variables).toEqual(['A', 'B']);

    // A=0, B=0 -> A ^ 1 = 1
    const row00 = result.truthTable.rows.find((r) => r[0] === 0 && r[1] === 0);
    expect(row00![2]).toBe(1);

    // A=1, B=0 -> 1 ^ 1 = 0
    const row10 = result.truthTable.rows.find((r) => r[0] === 1 && r[1] === 0);
    expect(row10![2]).toBe(0);
  });

  it('parses multi-output equations separated by semicolons', () => {
    const formula = 'Sum = A ^ B ^ Cin; Cout = (A*B) + (Cin*(A ^ B))';
    const result = BooleanCompiler.compile(formula);

    expect(result.outputs).toBeDefined();
    expect(result.outputs!.length).toBe(2);
    expect(result.outputs![0].name).toBe('Sum');
    expect(result.outputs![1].name).toBe('Cout');

    // 3 inputs -> 8 rows
    expect(result.truthTable.rows.length).toBe(8);
    expect(result.truthTable.headers).toContain('Output Sum');
    expect(result.truthTable.headers).toContain('Output Cout');

    // Verify A=1, B=1, Cin=0 -> Sum=0, Cout=1
    const row110 = result.truthTable.rows.find(
      (r) => r[0] === 1 && r[1] === 1 && r[2] === 0
    );
    expect(row110![3]).toBe(0); // Sum
    expect(row110![4]).toBe(1); // Cout

    // Verify A=1, B=1, Cin=1 -> Sum=1, Cout=1
    const row111 = result.truthTable.rows.find(
      (r) => r[0] === 1 && r[1] === 1 && r[2] === 1
    );
    expect(row111![3]).toBe(1); // Sum
    expect(row111![4]).toBe(1); // Cout
  });

  it('allocates physical 74xx IC gate slots from IC_GATE_SLOTS', () => {
    const result = BooleanCompiler.compile('Y = A * B + C * D');
    expect(result.requiredICs.length).toBeGreaterThan(0);
    // Requires AND gates (7408) and OR gates (7432)
    const models = result.requiredICs.map((ic) => ic.model);
    expect(models).toContain('7408');
    expect(models).toContain('7432');
  });
});
