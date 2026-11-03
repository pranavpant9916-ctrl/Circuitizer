import { BreadboardDimensions, BreadboardHole, TerminalColumn } from '../types/breadboard';

export const PITCH = 20; // 20px per 2.54mm hole pitch

export const DEFAULT_DIMENSIONS: BreadboardDimensions = {
  width: 63 * PITCH + 140, // ~1400px wide
  height: 440,             // ~440px high
  originX: 70,
  originY: 45,
  pitch: PITCH,
  holeRadius: 4.5,
  totalRows: 63,
  totalRailHoles: 50,
};

export class BreadboardGridSystem {
  public holes: Map<string, BreadboardHole> = new Map();
  public busHoleMap: Map<string, string[]> = new Map();
  public dimensions: BreadboardDimensions;

  constructor(dims: BreadboardDimensions = DEFAULT_DIMENSIONS) {
    this.dimensions = dims;
    this.generateGrid();
  }

  private registerHole(hole: BreadboardHole) {
    this.holes.set(hole.id, hole);
    const busList = this.busHoleMap.get(hole.busId) || [];
    busList.push(hole.id);
    this.busHoleMap.set(hole.busId, busList);
  }

  private generateGrid() {
    this.holes.clear();
    this.busHoleMap.clear();

    const { originX, pitch, totalRows } = this.dimensions;

    // Y coordinates for each section
    const Y_TOP_GND = 45;
    const Y_TOP_VCC = 70;

    const Y_TERM_TOP: Record<TerminalColumn, number> = {
      a: 125,
      b: 145,
      c: 165,
      d: 185,
      e: 205,
      f: 245,
      g: 265,
      h: 285,
      i: 305,
      j: 325,
    };

    const Y_BOT_VCC = 380;
    const Y_BOT_GND = 405;

    // 1. Generate Terminal Strip Rows 1 to 63
    const topCols: TerminalColumn[] = ['a', 'b', 'c', 'd', 'e'];
    const botCols: TerminalColumn[] = ['f', 'g', 'h', 'i', 'j'];

    for (let r = 1; r <= totalRows; r++) {
      const x = originX + (r - 1) * pitch;

      // Top bank (a-e): all 5 holes connected vertically to ROW_{r}_TOP
      const topBus = `ROW_${r}_TOP`;
      for (const col of topCols) {
        const id = `${col}${r}`;
        this.registerHole({
          id,
          section: 'TERMINAL_TOP',
          row: r,
          col,
          x,
          y: Y_TERM_TOP[col],
          busId: topBus,
        });
      }

      // Bottom bank (f-j): all 5 holes connected vertically to ROW_{r}_BOT
      const botBus = `ROW_${r}_BOT`;
      for (const col of botCols) {
        const id = `${col}${r}`;
        this.registerHole({
          id,
          section: 'TERMINAL_BOTTOM',
          row: r,
          col,
          x,
          y: Y_TERM_TOP[col],
          busId: botBus,
        });
      }
    }

    // 2. Generate Power Rails (50 holes each, spread over 63 rows with groups of 5)
    // On real 830 boards, 50 holes align across the 63 columns with breaks between 5-hole groups.
    // For clean alignment, we place 50 holes with a skip every 5 holes.
    let railColIndex = 0;
    for (let i = 1; i <= 50; i++) {
      // Add gap after every 5 holes
      if (i > 1 && (i - 1) % 5 === 0) {
        railColIndex++;
      }
      const x = originX + railColIndex * pitch;
      railColIndex++;

      // Top Rails
      this.registerHole({
        id: `TOP_GND_${i}`,
        section: 'TOP_RAIL_GND',
        row: i,
        x,
        y: Y_TOP_GND,
        busId: 'BUS_TOP_GND',
      });

      this.registerHole({
        id: `TOP_VCC_${i}`,
        section: 'TOP_RAIL_VCC',
        row: i,
        x,
        y: Y_TOP_VCC,
        busId: 'BUS_TOP_VCC',
      });

      // Bottom Rails
      this.registerHole({
        id: `BOT_VCC_${i}`,
        section: 'BOT_RAIL_VCC',
        row: i,
        x,
        y: Y_BOT_VCC,
        busId: 'BUS_BOT_VCC',
      });

      this.registerHole({
        id: `BOT_GND_${i}`,
        section: 'BOT_RAIL_GND',
        row: i,
        x,
        y: Y_BOT_GND,
        busId: 'BUS_BOT_GND',
      });
    }
  }

  public getHole(id: string): BreadboardHole | undefined {
    return this.holes.get(id);
  }

  public getHolesByBus(busId: string): BreadboardHole[] {
    const ids = this.busHoleMap.get(busId) || [];
    return ids.map((id) => this.holes.get(id)!).filter(Boolean);
  }

  public findNearestHole(worldX: number, worldY: number, maxRadius = 15): BreadboardHole | null {
    let nearest: BreadboardHole | null = null;
    let minDistanceSq = maxRadius * maxRadius;

    // Fast coordinate filter
    for (const hole of this.holes.values()) {
      const dx = hole.x - worldX;
      const dy = hole.y - worldY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearest = hole;
      }
    }

    return nearest;
  }
}

export const defaultGrid = new BreadboardGridSystem();
