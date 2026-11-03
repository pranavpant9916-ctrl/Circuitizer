// ==========================================
// CIRCUIT COMPONENTS & ELECTRICAL NETLIST
// ==========================================

export type LogicLevel = 0 | 1 | 'Z' | 'X'; // 0=LOW (GND), 1=HIGH (5V), Z=Floating/High-Z, X=Short/Contention

export interface PinDefinition {
  pinNumber: number;
  name: string;
  type: 'INPUT' | 'OUTPUT' | 'POWER_VCC' | 'POWER_GND' | 'NC';
  defaultLevel?: LogicLevel;
  description?: string;
}

export interface ICDefinition {
  model: string;          // e.g. "7408", "7404", "7476", "555"
  name: string;           // "Quad 2-Input AND Gate"
  pinCount: 14 | 16 | 8;
  pins: PinDefinition[];
  // Logic evaluation function for the IC
  evaluate?: (inputStates: Record<number, LogicLevel>) => Record<number, LogicLevel>;
}

export interface PlacedIC {
  id: string;
  model: string;
  startRow: number;       // Breadboard row where Pin 1 is seated
  notchFacing: 'LEFT' | 'RIGHT'; // Standard orientation is LEFT
  pinHoles: Record<number, string>; // Maps pinNumber -> breadboard holeId (e.g. 1 -> "f15", 14 -> "e15")
}

export interface JumperWire {
  id: string;
  fromHole: string;
  toHole: string;
  color: 'red' | 'blue' | 'black' | 'yellow' | 'green' | 'white' | 'orange';
  label?: string;
}

export interface PlacedResistor {
  id: string;
  fromHole: string;
  toHole: string;
  valueOhms: number;
  bands: string[];        // 4 color bands (e.g. ["orange", "orange", "brown", "gold"])
}

export interface PlacedLED {
  id: string;
  anodeHole: string;     // Positive (+) long lead
  cathodeHole: string;   // Negative (-) flat edge
  color: 'red' | 'green' | 'yellow' | 'blue';
  isLit: boolean;
}

export interface PlacedSwitch {
  id: string;
  holeA: string;
  holeB: string;
  isClosed: boolean;
  label: string;
}

export interface CircuitState {
  placedICs: PlacedIC[];
  wires: JumperWire[];
  resistors: PlacedResistor[];
  leds: PlacedLED[];
  switches: PlacedSwitch[];
  clockSignals: Record<string, 0 | 1>;
}

export interface ElectricalNet {
  id: string;
  holes: Set<string>;
  level: LogicLevel;
  hasVCC: boolean;
  hasGND: boolean;
  isShortCircuit: boolean;
  sourcePin?: { icId: string; pinNumber: number };
}
