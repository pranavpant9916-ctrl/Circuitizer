/**
 * Karnaugh Map (K-Map) Engine
 * Supports 2, 3, and 4-variable logic minimization, Gray-code matrix layout,
 * and prime implicant grouping rectangles for educational verification.
 */

export interface KMapCell {
  row: number;
  col: number;
  minterm: number;
  binaryString: string;
  value: 0 | 1;
  inputValues: Record<string, number>;
}

export interface KMapGroup {
  id: string;
  rows: number[]; // indices in grid
  cols: number[]; // indices in grid
  cells: { row: number; col: number; minterm: number }[];
  term: string; // e.g., "A·B'" or "C·D"
  color: string; // border outline color token
}

export interface KMapData {
  numVars: number;
  rowVars: string[];
  colVars: string[];
  rowHeaders: string[]; // e.g. ['0', '1'] or ['00', '01', '11', '10']
  colHeaders: string[]; // e.g. ['0', '1'] or ['00', '01', '11', '10']
  grid: KMapCell[][];
  groups: KMapGroup[];
  minimizedSOP: string;
  minterms: number[];
  targetOutputName: string;
  availableOutputs: { raw: string; clean: string }[];
}

// Standard Gray code sequences
const GRAY_2 = ['0', '1'];
const GRAY_4 = ['00', '01', '11', '10'];

const GROUP_COLORS = [
  '#38bdf8', // sky-400
  '#34d399', // emerald-400
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#a78bfa', // violet-400
  '#f87171', // red-400
];

export function isStatusOrDescriptionColumn(header: string): boolean {
  const s = header.toLowerCase().trim();
  return (
    s.includes('state') ||
    s.includes('status') ||
    s.includes('count') ||
    s.includes('digit') ||
    s.includes('voltage') ||
    s.includes('decimal') ||
    s.includes('time') ||
    s.includes('clock')
  );
}

export function cleanVarName(header: string): string {
  let s = header.trim().replace(/^input\s+/i, '');
  if (s.toLowerCase().startsWith('gate')) {
    const m = s.match(/\b([A-Za-z]\w*)\s*=/);
    if (m) return m[1];
  }
  const paren = s.indexOf('(');
  if (paren !== -1) {
    const prefix = s.substring(0, paren).trim();
    if (prefix) return prefix;
  }
  return s;
}

export function cleanOutputName(header: string): string {
  let s = header.trim().replace(/^output\s+/i, '');
  const paren = s.indexOf('(');
  if (paren !== -1) {
    const prefix = s.substring(0, paren).trim();
    if (prefix) return prefix;
  }
  return s;
}

export function parseBinaryOutput(rawVal: string | number): 0 | 1 {
  if (typeof rawVal === 'number') {
    return rawVal === 1 ? 1 : 0;
  }
  const s = String(rawVal).toLowerCase().trim();
  if (s === '1' || s.startsWith('on') || s.startsWith('high') || s.includes('lit') || s === 'true') {
    return 1;
  }
  return 0;
}

export class KMapEngine {
  /**
   * Builds a full K-Map model from truth table headers and rows
   * @param headers Table column headers (e.g. ['Input A', 'Input B', 'Output Y', 'LED State'])
   * @param rows Table rows of numbers / strings
   * @param targetOutputHeader Optional name of output column to analyze (raw or clean)
   */
  public static generateKMap(
    headers: string[],
    rows: (string | number)[][],
    targetOutputHeader?: string
  ): KMapData | null {
    if (!headers || headers.length < 3 || !rows || rows.length === 0) {
      return null;
    }

    // 1. Filter out descriptive status columns
    const validCols = headers
      .map((h, idx) => ({ h, idx }))
      .filter((c) => !isStatusOrDescriptionColumn(c.h));

    if (validCols.length < 3) {
      return null;
    }

    // 2. Identify candidate output columns
    const outputCols = validCols.filter((c) => {
      const lower = c.h.toLowerCase();
      return (
        lower.startsWith('y') ||
        lower.includes('out') ||
        lower.includes('sum') ||
        lower.includes('cout') ||
        lower.includes('carry') ||
        c.idx === validCols[validCols.length - 1].idx
      );
    });

    if (outputCols.length === 0) {
      return null;
    }

    const availableOutputs = outputCols.map((c) => ({
      raw: c.h,
      clean: cleanOutputName(c.h),
    }));

    // Select the target output column
    let selectedCol = outputCols[0];
    if (targetOutputHeader) {
      const targetMatch = outputCols.find(
        (c) =>
          c.h === targetOutputHeader ||
          cleanOutputName(c.h) === targetOutputHeader ||
          cleanOutputName(c.h).toLowerCase() === targetOutputHeader.toLowerCase()
      );
      if (targetMatch) {
        selectedCol = targetMatch;
      }
    }

    const outputColIdx = selectedCol.idx;
    const targetOutputName = cleanOutputName(selectedCol.h);

    // 3. Identify input columns (all valid columns except output columns)
    const outputIndices = new Set(outputCols.map((c) => c.idx));
    const inputCols = validCols.filter((c) => !outputIndices.has(c.idx));

    if (inputCols.length < 2 || inputCols.length > 4) {
      return null;
    }

    const numVars = inputCols.length;
    const inputVars = inputCols.map((c) => cleanVarName(c.h));

    // 4. Build minterm map
    const mintermMap = new Map<number, { val: 0 | 1; inputs: Record<string, number> }>();
    const mintermList: number[] = [];

    rows.forEach((row) => {
      let m = 0;
      const inputs: Record<string, number> = {};
      inputCols.forEach((col, bitPos) => {
        const raw = Number(row[col.idx]);
        const bit = isNaN(raw) ? 0 : raw ? 1 : 0;
        m = (m << 1) | bit;
        const cleanName = inputVars[bitPos];
        inputs[cleanName] = bit;
        inputs[col.h] = bit;
      });

      const outVal = parseBinaryOutput(row[outputColIdx]);
      mintermMap.set(m, { val: outVal, inputs });
      if (outVal === 1) {
        mintermList.push(m);
      }
    });

    let rowVars: string[] = [];
    let colVars: string[] = [];
    let rowHeaders: string[] = [];
    let colHeaders: string[] = [];

    if (numVars === 2) {
      rowVars = [inputVars[0]];
      colVars = [inputVars[1]];
      rowHeaders = GRAY_2;
      colHeaders = GRAY_2;
    } else if (numVars === 3) {
      rowVars = [inputVars[0]];
      colVars = [inputVars[1], inputVars[2]];
      rowHeaders = GRAY_2;
      colHeaders = GRAY_4;
    } else {
      rowVars = [inputVars[0], inputVars[1]];
      colVars = [inputVars[2], inputVars[3]];
      rowHeaders = GRAY_4;
      colHeaders = GRAY_4;
    }

    const grid: KMapCell[][] = [];

    for (let r = 0; r < rowHeaders.length; r++) {
      const gridRow: KMapCell[] = [];
      const rowBits = rowHeaders[r];

      for (let c = 0; c < colHeaders.length; c++) {
        const colBits = colHeaders[c];
        const fullBits = rowBits + colBits;
        const minterm = parseInt(fullBits, 2);

        const entry = mintermMap.get(minterm);
        const val = entry ? entry.val : 0;

        const inputVals: Record<string, number> = {};
        let bitIdx = 0;
        rowVars.forEach((v) => {
          inputVals[v] = parseInt(rowBits[bitIdx++], 10);
        });
        bitIdx = 0;
        colVars.forEach((v) => {
          inputVals[v] = parseInt(colBits[bitIdx++], 10);
        });

        gridRow.push({
          row: r,
          col: c,
          minterm,
          binaryString: fullBits,
          value: val,
          inputValues: inputVals,
        });
      }
      grid.push(gridRow);
    }

    // 5. Compute prime implicant grouping rectangles
    const groups = this.findGroups(grid, rowVars, colVars, rowHeaders, colHeaders);

    // Compute minimized SOP
    let minimizedSOP = groups.map((g) => g.term).join(' + ');
    if (!minimizedSOP) {
      minimizedSOP = mintermList.length === 0 ? '0' : '1';
    }

    return {
      numVars,
      rowVars,
      colVars,
      rowHeaders,
      colHeaders,
      grid,
      groups,
      minimizedSOP,
      minterms: mintermList.sort((a, b) => a - b),
      targetOutputName,
      availableOutputs,
    };
  }

  /**
   * Identifies power-of-2 rectangular groupings covering all 1-cells
   */
  private static findGroups(
    grid: KMapCell[][],
    rowVars: string[],
    colVars: string[],
    rowHeaders: string[],
    colHeaders: string[]
  ): KMapGroup[] {
    const numRows = grid.length;
    const numCols = grid[0].length;

    const ones: { r: number; c: number; minterm: number }[] = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (grid[r][c].value === 1) {
          ones.push({ r, c, minterm: grid[r][c].minterm });
        }
      }
    }

    if (ones.length === 0) return [];
    if (ones.length === numRows * numCols) {
      return [
        {
          id: 'grp-all',
          rows: Array.from({ length: numRows }, (_, i) => i),
          cols: Array.from({ length: numCols }, (_, i) => i),
          cells: ones.map((o) => ({ row: o.r, col: o.c, minterm: o.minterm })),
          term: '1',
          color: GROUP_COLORS[0],
        },
      ];
    }

    const validSizes: [number, number][] = [];
    const rowSizes = numRows === 4 ? [4, 2, 1] : numRows === 2 ? [2, 1] : [1];
    const colSizes = numCols === 4 ? [4, 2, 1] : numCols === 2 ? [2, 1] : [1];

    for (const h of rowSizes) {
      for (const w of colSizes) {
        validSizes.push([h, w]);
      }
    }
    validSizes.sort((a, b) => b[0] * b[1] - a[0] * a[1]);

    const potentialGroups: {
      rows: number[];
      cols: number[];
      cells: { r: number; c: number; minterm: number }[];
      term: string;
      size: number;
    }[] = [];

    for (const [h, w] of validSizes) {
      for (let rStart = 0; rStart < numRows; rStart++) {
        for (let cStart = 0; cStart < numCols; cStart++) {
          const rowIndices: number[] = [];
          for (let i = 0; i < h; i++) {
            rowIndices.push((rStart + i) % numRows);
          }
          const colIndices: number[] = [];
          for (let j = 0; j < w; j++) {
            colIndices.push((cStart + j) % numCols);
          }

          let allOnes = true;
          const groupCells: { r: number; c: number; minterm: number }[] = [];

          for (const r of rowIndices) {
            for (const c of colIndices) {
              if (grid[r][c].value !== 1) {
                allOnes = false;
                break;
              }
              groupCells.push({ r, c, minterm: grid[r][c].minterm });
            }
            if (!allOnes) break;
          }

          if (allOnes) {
            const uniqueRows = Array.from(new Set(rowIndices)).sort((a, b) => a - b);
            const uniqueCols = Array.from(new Set(colIndices)).sort((a, b) => a - b);

            const term = this.deriveTerm(uniqueRows, uniqueCols, rowVars, colVars, rowHeaders, colHeaders);

            const key = `${uniqueRows.join(',')}|${uniqueCols.join(',')}`;
            if (!potentialGroups.some((g) => `${g.rows.join(',')}|${g.cols.join(',')}` === key)) {
              potentialGroups.push({
                rows: uniqueRows,
                cols: uniqueCols,
                cells: groupCells,
                term,
                size: h * w,
              });
            }
          }
        }
      }
    }

    const uncovered = new Set<number>(ones.map((o) => o.minterm));
    const selectedGroups: KMapGroup[] = [];
    let colorIdx = 0;

    for (const pg of potentialGroups) {
      const coversNew = pg.cells.some((c) => uncovered.has(c.minterm));
      if (coversNew) {
        selectedGroups.push({
          id: `grp-${selectedGroups.length + 1}`,
          rows: pg.rows,
          cols: pg.cols,
          cells: pg.cells.map((c) => ({ row: c.r, col: c.c, minterm: c.minterm })),
          term: pg.term,
          color: GROUP_COLORS[colorIdx % GROUP_COLORS.length],
        });
        colorIdx++;
        pg.cells.forEach((c) => uncovered.delete(c.minterm));
      }
      if (uncovered.size === 0) break;
    }

    return selectedGroups;
  }

  private static deriveTerm(
    rows: number[],
    cols: number[],
    rowVars: string[],
    colVars: string[],
    rowHeaders: string[],
    colHeaders: string[]
  ): string {
    const terms: string[] = [];

    rowVars.forEach((v, bitIdx) => {
      let isConstant = true;
      const firstBit = rowHeaders[rows[0]][bitIdx];
      for (let i = 1; i < rows.length; i++) {
        if (rowHeaders[rows[i]][bitIdx] !== firstBit) {
          isConstant = false;
          break;
        }
      }
      if (isConstant) {
        terms.push(firstBit === '1' ? v : `${v}'`);
      }
    });

    colVars.forEach((v, bitIdx) => {
      let isConstant = true;
      const firstBit = colHeaders[cols[0]][bitIdx];
      for (let i = 1; i < cols.length; i++) {
        if (colHeaders[cols[i]][bitIdx] !== firstBit) {
          isConstant = false;
          break;
        }
      }
      if (isConstant) {
        terms.push(firstBit === '1' ? v : `${v}'`);
      }
    });

    return terms.length === 0 ? '1' : terms.join('·');
  }
}
