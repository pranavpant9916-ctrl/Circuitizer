import { describe, it, expect } from 'vitest';
import { NetlistEngine } from '../engine/netlist';
import { defaultGrid } from '../engine/grid';
import { CircuitState } from '../types/circuit';

describe('NetlistEngine', () => {
  const engine = new NetlistEngine(defaultGrid);

  it('detects dead short when VCC rail is directly wired to GND rail', () => {
    const circuit: CircuitState = {
      wires: [
        {
          id: 'w-short',
          fromHole: 'TOP_VCC_1',
          toHole: 'TOP_GND_1',
          color: 'red',
        },
      ],
      placedICs: [],
      resistors: [],
      leds: [],
      switches: [],
      clockSignals: {},
    };

    const solution = engine.solve(circuit);
    expect(solution.isDeadShort).toBe(true);
  });

  it('does NOT trigger dead short when pull-up resistor bridges VCC and signal net', () => {
    // Resistors are decoupled from Union-Find!
    const circuit: CircuitState = {
      wires: [
        {
          id: 'w-to-gnd',
          fromHole: 'a10',
          toHole: 'BOT_GND_10',
          color: 'black',
        },
      ],
      placedICs: [],
      resistors: [
        {
          id: 'r-pullup',
          fromHole: 'TOP_VCC_10',
          toHole: 'b10', // connected to a10 via breadboard column clip
          valueOhms: 10000,
          bands: ['brown', 'black', 'orange', 'gold'],
        },
      ],
      leds: [],
      switches: [],
      clockSignals: {},
    };

    const solution = engine.solve(circuit);
    expect(solution.isDeadShort).toBe(false);
  });

  it('enforces IC power rails: unpowered ICs hold outputs at High-Z', () => {
    // 7408 AND gate seated across trench at row 15
    // But VCC (pin 14 at e15) and GND (pin 7 at e21) are NOT connected!
    const circuit: CircuitState = {
      wires: [
        { id: 'w-in1', fromHole: 'TOP_VCC_1', toHole: 'a15', color: 'red' },
        { id: 'w-in2', fromHole: 'TOP_VCC_2', toHole: 'a16', color: 'red' },
      ],
      placedICs: [
        {
          id: 'ic-7408',
          model: '7408',
          startRow: 15,
          notchFacing: 'LEFT',
          pinHoles: {
            1: 'e15',
            2: 'e16',
            3: 'e17', // Pin 3 (1Y)
            7: 'e21', // Pin 7 (GND - unpowered!)
            14: 'f15', // Pin 14 (VCC - unpowered!)
          },
        },
      ],
      resistors: [],
      leds: [
        {
          id: 'led-1',
          anodeHole: 'c17',
          cathodeHole: 'BOT_GND_17',
          color: 'green',
          isLit: false,
        },
      ],
      switches: [],
      clockSignals: {},
    };

    const solution = engine.solve(circuit);
    expect(solution.icPinStates['ic-7408']?.[3]).toBe('Z');
    expect(solution.ledStates['led-1']).toBe(false);
  });

  it('illuminates LED when 7408 is powered and inputs are HIGH', () => {
    const circuit: CircuitState = {
      wires: [
        // Power IC: Pin 14 (f15) -> VCC, Pin 7 (e21) -> GND
        { id: 'w-vcc', fromHole: 'TOP_VCC_15', toHole: 'j15', color: 'red' },
        { id: 'w-gnd', fromHole: 'BOT_GND_21', toHole: 'a21', color: 'black' },
        // Drive Pin 1 (1A at e15) and Pin 2 (1B at e16) to VCC
        { id: 'w-in1', fromHole: 'TOP_VCC_16', toHole: 'i15', color: 'red' },
        { id: 'w-in2', fromHole: 'TOP_VCC_17', toHole: 'j16', color: 'red' },
      ],
      placedICs: [
        {
          id: 'ic-7408',
          model: '7408',
          startRow: 15,
          notchFacing: 'LEFT',
          pinHoles: {
            1: 'f15',
            2: 'f16',
            3: 'f17',
            7: 'e21',
            14: 'e15',
          },
        },
      ],
      resistors: [],
      leds: [],
      switches: [],
      clockSignals: {},
    };

    const solution = engine.solve(circuit);
    expect(solution.isDeadShort).toBe(false);
  });
});
