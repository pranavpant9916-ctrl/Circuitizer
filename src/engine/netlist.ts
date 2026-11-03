import { BreadboardGridSystem } from './grid';
import { IC_REGISTRY } from './icRegistry';
import {
  ElectricalNet,
  JumperWire,
  LogicLevel,
  PlacedIC,
  PlacedLED,
  PlacedResistor,
  PlacedSwitch,
} from '../types/circuit';

export interface CircuitState {
  placedICs: PlacedIC[];
  wires: JumperWire[];
  resistors: PlacedResistor[];
  leds: PlacedLED[];
  switches: PlacedSwitch[];
  clockSignals: Record<string, 0 | 1>; // Clock sources e.g. "NET_CLK" -> 0 or 1
}

export class NetlistEngine {
  private grid: BreadboardGridSystem;

  constructor(grid: BreadboardGridSystem) {
    this.grid = grid;
  }

  /**
   * Reconstructs all electrical nets and propagates digital logic states.
   */
  public solve(circuit: CircuitState): {
    nets: Map<string, ElectricalNet>;
    holeNetMap: Map<string, string>;
    isDeadShort: boolean;
    shortedNets: string[];
    ledStates: Record<string, boolean>;
    icPinStates: Record<string, Record<number, LogicLevel>>;
  } {
    // 1. Initialize Union-Find over Bus IDs and individual holes
    const parent = new Map<string, string>();

    const find = (id: string): string => {
      if (!parent.has(id)) parent.set(id, id);
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)!));
      }
      return parent.get(id)!;
    };

    const union = (idA: string, idB: string) => {
      const rootA = find(idA);
      const rootB = find(idB);
      if (rootA !== rootB) {
        parent.set(rootA, rootB);
      }
    };

    // Every hole is naturally part of its breadboard bus clip
    for (const hole of this.grid.holes.values()) {
      union(hole.id, hole.busId);
    }

    // Connect jumper wires
    for (const wire of circuit.wires) {
      if (this.grid.holes.has(wire.fromHole) && this.grid.holes.has(wire.toHole)) {
        union(wire.fromHole, wire.toHole);
      }
    }

    // Connect resistors (in digital DC logic, low-value pull-up/pull-down or current limiting resistors pass DC logic)
    for (const res of circuit.resistors) {
      if (this.grid.holes.has(res.fromHole) && this.grid.holes.has(res.toHole)) {
        union(res.fromHole, res.toHole);
      }
    }

    // Connect closed switches
    for (const sw of circuit.switches) {
      if (sw.isClosed && this.grid.holes.has(sw.holeA) && this.grid.holes.has(sw.holeB)) {
        union(sw.holeA, sw.holeB);
      }
    }

    // 2. Group into distinct nets
    const netGroups = new Map<string, Set<string>>();
    for (const hole of this.grid.holes.values()) {
      const root = find(hole.id);
      if (!netGroups.has(root)) {
        netGroups.set(root, new Set());
      }
      netGroups.get(root)!.add(hole.id);
    }

    // Map each hole to its Net ID
    const holeNetMap = new Map<string, string>();
    const nets = new Map<string, ElectricalNet>();

    let isDeadShort = false;
    const shortedNets: string[] = [];

    for (const [netId, holes] of netGroups.entries()) {
      let hasVCC = false;
      let hasGND = false;

      for (const hId of holes) {
        const h = this.grid.getHole(hId);
        if (h) {
          if (h.section === 'TOP_RAIL_VCC' || h.section === 'BOT_RAIL_VCC') {
            hasVCC = true;
          }
          if (h.section === 'TOP_RAIL_GND' || h.section === 'BOT_RAIL_GND') {
            hasGND = true;
          }
        }
      }

      // Check if this net has shorted VCC and GND directly
      const isShort = hasVCC && hasGND;
      if (isShort) {
        isDeadShort = true;
        shortedNets.push(netId);
      }

      const initialLevel: LogicLevel = isShort ? 'X' : hasVCC ? 1 : hasGND ? 0 : 'Z';

      const net: ElectricalNet = {
        id: netId,
        holes,
        level: initialLevel,
        hasVCC,
        hasGND,
        isShortCircuit: isShort,
      };

      nets.set(netId, net);
      for (const hId of holes) {
        holeNetMap.set(hId, netId);
      }
    }

    // 3. Inject External Clock Signals
    for (const [holeId, clkVal] of Object.entries(circuit.clockSignals)) {
      const netId = holeNetMap.get(holeId);
      if (netId) {
        const net = nets.get(netId);
        if (net && !net.hasVCC && !net.hasGND) {
          net.level = clkVal;
        }
      }
    }

    // 4. IC Logic Propagation Loop
    const icPinStates: Record<string, Record<number, LogicLevel>> = {};

    // Run up to 5 passes for multi-gate propagation / ripple logic
    for (let pass = 0; pass < 5; pass++) {
      let stateChanged = false;

      for (const ic of circuit.placedICs) {
        const def = IC_REGISTRY[ic.model];
        if (!def) continue;

        if (!icPinStates[ic.id]) {
          icPinStates[ic.id] = {};
        }

        // Read input pin levels from nets
        const inputs: Record<number, LogicLevel> = {};
        for (const pin of def.pins) {
          const holeId = ic.pinHoles[pin.pinNumber];
          if (holeId) {
            const netId = holeNetMap.get(holeId);
            const level = netId ? nets.get(netId)?.level ?? 'Z' : 'Z';
            icPinStates[ic.id][pin.pinNumber] = level;
            if (pin.type === 'INPUT') {
              inputs[pin.pinNumber] = level;
            }
          }
        }

        // Evaluate logic outputs if IC has an evaluator
        if (def.evaluate) {
          const outputs = def.evaluate(inputs);
          for (const [pinStr, outVal] of Object.entries(outputs)) {
            const pinNum = Number(pinStr);
            const holeId = ic.pinHoles[pinNum];
            if (holeId) {
              const netId = holeNetMap.get(holeId);
              if (netId) {
                const net = nets.get(netId);
                if (net && net.level !== outVal) {
                  net.level = outVal;
                  icPinStates[ic.id][pinNum] = outVal;
                  stateChanged = true;
                }
              }
            }
          }
        }
      }

      if (!stateChanged) break;
    }

    // 5. Evaluate LEDs (Forward-biased: Anode = 1 and Cathode = 0)
    const ledStates: Record<string, boolean> = {};
    for (const led of circuit.leds) {
      const anodeNetId = holeNetMap.get(led.anodeHole);
      const cathodeNetId = holeNetMap.get(led.cathodeHole);

      const anodeLevel = anodeNetId ? nets.get(anodeNetId)?.level : 'Z';
      const cathodeLevel = cathodeNetId ? nets.get(cathodeNetId)?.level : 'Z';

      const isLit = !isDeadShort && anodeLevel === 1 && cathodeLevel === 0;
      ledStates[led.id] = isLit;
      led.isLit = isLit;
    }

    return {
      nets,
      holeNetMap,
      isDeadShort,
      shortedNets,
      ledStates,
      icPinStates,
    };
  }
}
