// ==========================================
// BREADBOARD COORDINATE SYSTEM & TOPOLOGY
// ==========================================

export type BreadboardSection =
  | 'TOP_RAIL_VCC'
  | 'TOP_RAIL_GND'
  | 'TERMINAL_TOP'    // Rows 1-63, Columns A-E
  | 'TERMINAL_BOTTOM' // Rows 1-63, Columns F-J
  | 'BOT_RAIL_VCC'
  | 'BOT_RAIL_GND';

export type TerminalColumn = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';

export interface BreadboardHole {
  id: string;              // e.g. "a15", "j63", "TOP_VCC_12"
  section: BreadboardSection;
  row: number;             // 1 to 63 for terminal, 1 to 50 for rails
  col?: TerminalColumn;
  x: number;               // Canonical coordinate in canvas space (px)
  y: number;               // Canonical coordinate in canvas space (px)
  busId: string;           // Identifies the internal conductive spring clip (e.g. "ROW_15_TOP")
}

export interface BreadboardDimensions {
  width: number;
  height: number;
  originX: number;
  originY: number;
  pitch: number;          // 2.54mm standard scaled to px (e.g. 18px per hole)
  holeRadius: number;
  totalRows: number;      // 63 standard rows
  totalRailHoles: number; // 50 pairs per power rail
}

export interface ViewportTransform {
  x: number;              // Pan offset X (px)
  y: number;              // Pan offset Y (px)
  scale: number;          // Zoom factor (e.g. 0.4 to 3.5)
}
