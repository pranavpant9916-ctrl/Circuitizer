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
  value: 0 | 1 | 'X';
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

export class KMapEngine {
  /**
   * Builds a full K-Map model from truth table headers and rows
   * @param headers Table column headers (e.g. ['A', 'B', 'Cin', 'Sum', 'Cout'])
   * @param rows Table rows of numbers / strings
   * @param targetOutputHeader Optional name of output column to analyze (defaults to last column)
   */
  public static generateKMap(
    headers: string[],
    rows: (string | number)[][],
    targetOutputHeader?: string
  ): KMapData | null {
    if (!headers || headers.length < 3 || !rows || rows.length === 0) {
      return null;
    }

    // Identify output column index
    let outputColIdx = headers.length - 1;
    if (targetOutputHeader) {
      const idx = headers.indexOf(targetOutputHeader);
      if (idx !== -1) outputColIdx = idx;
    }

    // Input variables are all columns prior to output columns
    // Any column containing 'out', 'sum', 'cout', 'y', etc. at the end is an output
    const inputVarIndices: number[] = [];
    for (let i = 0; i < headers.length; i++) {
      if (i !== outputColIdx) {
        // If header looks like an output and is after other inputs, skip if not target
        const h = headers[i].toLowerCase();
        if (i >= headers.length - 2 && (h.includes('y') || h.includes('out') || h.includes('sum') || h.includes('cout') || h.includes('carry'))) {
          continue;
        }
        inputVarIndices.push(i);
      }
    }

    const inputVars = inputVarIndices.map((i) => headers[i]);
    const numVars = inputVars.length;

    if (numVars < 2 || numVars > 4) {
      // K-Maps traditionally visualize 2, 3, or 4 variables clearly
      return null;
    }

    // Build minterm lookup map from truth table
    const mintermMap = new Map<number, { val: 0 | 1; inputs: Record<string, number> }>();
    const mintermList: number[] = [];

    rows.forEach((row) => {
      let m = 0;
      const inputs: Record<string, number> = {};
      inputVarIndices.forEach((colIdx) => {
        const raw = Number(row[colIdx]);
        const bit = isNaN(raw) ? 0 : raw ? 1 : 0;
        m = (m << 1) | bit;
        inputs[headers[colIdx]] = bit;
      });

      const outRaw = String(row[outputColIdx]);
      const outVal: 0 | 1 =
        outRaw === '1' || outRaw.toLowerCase() === 'high' || outRaw.toLowerCase() === 'on' ? 1 : 0;

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
      // 2 variables: A (row), B (col) -> 2x2
      rowVars = [inputVars[0]];
      colVars = [inputVars[1]];
      rowHeaders = GRAY_2;
      colHeaders = GRAY_2;
    } else if (numVars === 3) {
      // 3 variables: A (row), BC (col) -> 2x4
      rowVars = [inputVars[0]];
      colVars = [inputVars[1], inputVars[2]];
      rowHeaders = GRAY_2;
      colHeaders = GRAY_4;
    } else {
      // 4 variables: AB (row), CD (col) -> 4x4
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

        // Construct input values dictionary
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

    // Compute prime implicant grouping rectangles
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

    // List all 1-cells
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

    // Possible rectangle sizes: height x width (powers of 2 <= dimensions)
    const validSizes: [number, number][] = [];
    const rowSizes = numRows === 4 ? [4, 2, 1] : numRows === 2 ? [2, 1] : [1];
    const colSizes = numCols === 4 ? [4, 2, 1] : numCols === 2 ? [2, 1] : [1];

    for (const h of rowSizes) {
      for (const w of colSizes) {
        validSizes.push([h, w]);
      }
    }
    // Sort descending by area to find largest groups first
    validSizes.sort((a, b) => b[0] * b[1] - a[0] * a[1]);

    const potentialGroups: {
      rows: number[];
      cols: number[];
      cells: { r: number; c: number; minterm: number }[];
      term: string;
      size: number;
    }[] = [];

    // Find all valid rectangular groups with wrap-around
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

          // Check if every cell in this rectangle is 1
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
            // Deduplicate indices
            const uniqueRows = Array.from(new Set(rowIndices)).sort((a, b) => a - b);
            const uniqueCols = Array.from(new Set(colIndices)).sort((a, b) => a - b);

            const term = this.deriveTerm(uniqueRows, uniqueCols, rowVars, colVars, rowHeaders, colHeaders);

            // Avoid duplicate groups
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

    // Greedy cover of all 1s with minimal prime implicants
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

  /**
   * Derives minimal algebraic product term for a group of row and column indices
   */
  private static deriveTerm(
    rows: number[],
    cols: number[],
    rowVars: string[],
    colVars: string[],
    rowHeaders: string[],
    colHeaders: string[]
  ): string {
    const terms: string[] = [];

    // Analyze row variables
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

    // Analyze col variables
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
