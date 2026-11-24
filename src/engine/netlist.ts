import { BreadboardGridSystem } from './grid';
import { IC_REGISTRY } from './icRegistry';
import {
  CircuitState,
  ElectricalNet,
  LogicLevel,
} from '../types/circuit';

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
    for (const [holeId, clkVal] of Object.entries(circuit.clockSignals || {})) {
      const netId = holeNetMap.get(holeId);
      if (netId) {
        const net = nets.get(netId);
        if (net && !net.hasVCC && !net.hasGND) {
          net.level = clkVal;
        }
      }
    }

    // 4. Resistor handling: model pull‑up/pull‑down & current-limiting behavior without merging nets.
    const propagateResistors = (): boolean => {
      let changed = false;
      for (const res of circuit.resistors) {
        if (this.grid.holes.has(res.fromHole) && this.grid.holes.has(res.toHole)) {
          const netIdFrom = holeNetMap.get(res.fromHole);
          const netIdTo = holeNetMap.get(res.toHole);
          const netFrom = netIdFrom ? nets.get(netIdFrom) : undefined;
          const netTo = netIdTo ? nets.get(netIdTo) : undefined;
          if (netFrom && netTo) {
            // If from-side is driven and to-side is floating ('Z'), inject level
            if ((netFrom.hasVCC || netFrom.level === 1) && netTo.level === 'Z') {
              netTo.level = 1;
              changed = true;
            } else if ((netFrom.hasGND || netFrom.level === 0) && netTo.level === 'Z') {
              netTo.level = 0;
              changed = true;
            } else if ((netTo.hasVCC || netTo.level === 1) && netFrom.level === 'Z') {
              netFrom.level = 1;
              changed = true;
            } else if ((netTo.hasGND || netTo.level === 0) && netFrom.level === 'Z') {
              netFrom.level = 0;
              changed = true;
            }
          }
        }
      }
      return changed;
    };

    // Initial resistor pass before IC evaluation
    propagateResistors();

    // 5. Compute power rail presence for each IC
    const icPowered: Record<string, boolean> = {};
    for (const ic of circuit.placedICs || []) {
      const def = IC_REGISTRY[ic.model];
      if (!def) continue;
      let hasVCC = false;
      let hasGND = false;
      for (const pin of def.pins) {
        if (pin.type === 'POWER_VCC') {
          const holeId = ic.pinHoles[pin.pinNumber];
          if (holeId) {
            const netId = holeNetMap.get(holeId);
            const net = netId ? nets.get(netId) : undefined;
            if (net && net.hasVCC) hasVCC = true;
          }
        }
        if (pin.type === 'POWER_GND') {
          const holeId = ic.pinHoles[pin.pinNumber];
          if (holeId) {
            const netId = holeNetMap.get(holeId);
            const net = netId ? nets.get(netId) : undefined;
            if (net && net.hasGND) hasGND = true;
          }
        }
      }
      icPowered[ic.id] = hasVCC && hasGND;
    }

    // 6. IC Logic Propagation Loop
    const icPinStates: Record<string, Record<number, LogicLevel>> = {};
    for (let pass = 0; pass < 5; pass++) {
      let stateChanged = false;

      for (const ic of circuit.placedICs || []) {
        const def = IC_REGISTRY[ic.model];
        if (!def) continue;

        if (!icPinStates[ic.id]) icPinStates[ic.id] = {};

        if (!icPowered[ic.id]) {
          // Unpowered IC: force outputs to high‑impedance
          for (const pin of def.pins) {
            icPinStates[ic.id][pin.pinNumber] = 'Z';
            if (pin.type === 'OUTPUT') {
              const holeId = ic.pinHoles[pin.pinNumber];
              if (holeId) {
                const netId = holeNetMap.get(holeId);
                const net = netId ? nets.get(netId) : undefined;
                if (net) net.level = 'Z';
              }
            }
          }
          continue;
        }

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

      // Propagate through resistors if IC outputs changed levels
      if (propagateResistors()) {
        stateChanged = true;
      }

      if (!stateChanged) break;
    }

    // 7. Evaluate LEDs (Forward‑biased: Anode = 1 and Cathode = 0)
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

    // 8. Evaluate 7‑Segment Displays (Common Cathode grounded, segments driven HIGH)
    if (circuit.segmentDisplays) {
      for (const segDisp of circuit.segmentDisplays) {
        const cathodeGrounded = segDisp.commonCathodeHoles.some((hId: string) => {
          const netId = holeNetMap.get(hId);
          return netId ? nets.get(netId)?.level === 0 : false;
        });
        const segmentKeys: Array<'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'dp'> = [
          'a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'
        ];
        for (const seg of segmentKeys) {
          const pinHole = segDisp.segmentPins[seg];
          if (pinHole) {
            const netId = holeNetMap.get(pinHole);
            const isHigh = netId ? nets.get(netId)?.level === 1 : false;
            segDisp.litSegments[seg] = !isDeadShort && cathodeGrounded && isHigh;
          } else {
            segDisp.litSegments[seg] = false;
          }
        }
      }
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
