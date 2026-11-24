import { describe, it, expect } from 'vitest';
import { KMapEngine } from '../engine/kmap';

describe('KMapEngine', () => {
  it('correctly minimizes 2-variable AND gate', () => {
    const headers = ['Input A', 'Input B', 'Output Y (A AND B)', 'LED State'];
    const rows = [
      [0, 0, 0, 'OFF'],
      [0, 1, 0, 'OFF'],
      [1, 0, 0, 'OFF'],
      [1, 1, 1, 'ON (Lit)'],
    ];

    const kmap = KMapEngine.generateKMap(headers, rows);
    expect(kmap).not.toBeNull();
    expect(kmap!.numVars).toBe(2);
    expect(kmap!.rowVars).toEqual(['A']);
    expect(kmap!.colVars).toEqual(['B']);
    expect(kmap!.minimizedSOP).toBe('A·B');
    expect(kmap!.minterms).toEqual([3]);
  });

  it('correctly minimizes 3-variable Full Adder Sum & Cout', () => {
    const headers = ['A', 'B', 'Cin', 'Sum', 'Cout'];
    const rows = [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 1, 0, 1, 0],
      [0, 1, 1, 0, 1],
      [1, 0, 0, 1, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];

    // Test Sum (checkerboard XOR pattern)
    const kmapSum = KMapEngine.generateKMap(headers, rows, 'Sum');
    expect(kmapSum).not.toBeNull();
    expect(kmapSum!.numVars).toBe(3);
    expect(kmapSum!.minterms).toEqual([1, 2, 4, 7]);
    expect(kmapSum!.groups.length).toBe(4);

    // Test Cout
    const kmapCout = KMapEngine.generateKMap(headers, rows, 'Cout');
    expect(kmapCout).not.toBeNull();
    expect(kmapCout!.minterms).toEqual([3, 5, 6, 7]);
    // Essential prime implicants: B·Cin + A·Cin + A·B
    expect(kmapCout!.groups.length).toBe(3);
    expect(kmapCout!.minimizedSOP).toContain('B·Cin');
    expect(kmapCout!.minimizedSOP).toContain('A·Cin');
    expect(kmapCout!.minimizedSOP).toContain('A·B');
  });

  it('handles 4-variable 4-corner toroidal wrap-around (m0, m2, m8, m10)', () => {
    const headers = ['A', 'B', 'C', 'D', 'Y'];
    const rows: (string | number)[][] = [];

    for (let i = 0; i < 16; i++) {
      const a = (i >> 3) & 1;
      const b = (i >> 2) & 1;
      const c = (i >> 1) & 1;
      const d = i & 1;
      // 4 corners of K-Map: 0000, 0010, 1000, 1010
      const y = i === 0 || i === 2 || i === 8 || i === 10 ? 1 : 0;
      rows.push([a, b, c, d, y]);
    }

    const kmap = KMapEngine.generateKMap(headers, rows);
    expect(kmap).not.toBeNull();
    expect(kmap!.numVars).toBe(4);
    expect(kmap!.minterms).toEqual([0, 2, 8, 10]);
    // 4 corners eliminate A and C, leaving B'·D'
    expect(kmap!.minimizedSOP).toBe("B'·D'");
    expect(kmap!.groups.length).toBe(1);
  });

  it('rejects sequential circuits gracefully', () => {
    const headers = ['Clock Pulse', 'Q1 (MSB)', 'Q0 (LSB)', 'Decimal Count'];
    const rows = [
      [0, 0, 0, 0],
      [1, 0, 1, 1],
    ];

    const kmap = KMapEngine.generateKMap(headers, rows);
    expect(kmap).toBeNull();
  });
});
