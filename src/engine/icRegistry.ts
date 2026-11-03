import { ICDefinition, LogicLevel } from '../types/circuit';

export const IC_REGISTRY: Record<string, ICDefinition> = {
  '7404': {
    model: '7404',
    name: 'Hex Inverter (NOT Gates)',
    pinCount: 14,
    pins: [
      { pinNumber: 1, name: '1A', type: 'INPUT', description: 'Gate 1 Input' },
      { pinNumber: 2, name: '1Y', type: 'OUTPUT', description: 'Gate 1 Output (NOT 1A)' },
      { pinNumber: 3, name: '2A', type: 'INPUT', description: 'Gate 2 Input' },
      { pinNumber: 4, name: '2Y', type: 'OUTPUT', description: 'Gate 2 Output (NOT 2A)' },
      { pinNumber: 5, name: '3A', type: 'INPUT', description: 'Gate 3 Input' },
      { pinNumber: 6, name: '3Y', type: 'OUTPUT', description: 'Gate 3 Output (NOT 3A)' },
      { pinNumber: 7, name: 'GND', type: 'POWER_GND', description: 'Ground (0V)' },
      { pinNumber: 8, name: '4Y', type: 'OUTPUT', description: 'Gate 4 Output (NOT 4A)' },
      { pinNumber: 9, name: '4A', type: 'INPUT', description: 'Gate 4 Input' },
      { pinNumber: 10, name: '5Y', type: 'OUTPUT', description: 'Gate 5 Output (NOT 5A)' },
      { pinNumber: 11, name: '5A', type: 'INPUT', description: 'Gate 5 Input' },
      { pinNumber: 12, name: '6Y', type: 'OUTPUT', description: 'Gate 6 Output (NOT 6A)' },
      { pinNumber: 13, name: '6A', type: 'INPUT', description: 'Gate 6 Input' },
      { pinNumber: 14, name: 'VCC', type: 'POWER_VCC', description: 'Supply Voltage (+5V)' },
    ],
    evaluate: (inputs) => {
      const not = (val?: LogicLevel): LogicLevel => (val === 1 ? 0 : val === 0 ? 1 : 'X');
      return {
        2: not(inputs[1]),
        4: not(inputs[3]),
        6: not(inputs[5]),
        8: not(inputs[9]),
        10: not(inputs[11]),
        12: not(inputs[13]),
      };
    },
  },

  '7408': {
    model: '7408',
    name: 'Quad 2-Input AND Gate',
    pinCount: 14,
    pins: [
      { pinNumber: 1, name: '1A', type: 'INPUT', description: 'Gate 1 Input A' },
      { pinNumber: 2, name: '1B', type: 'INPUT', description: 'Gate 1 Input B' },
      { pinNumber: 3, name: '1Y', type: 'OUTPUT', description: 'Gate 1 Output (1A AND 1B)' },
      { pinNumber: 4, name: '2A', type: 'INPUT', description: 'Gate 2 Input A' },
      { pinNumber: 5, name: '2B', type: 'INPUT', description: 'Gate 2 Input B' },
      { pinNumber: 6, name: '2Y', type: 'OUTPUT', description: 'Gate 2 Output (2A AND 2B)' },
      { pinNumber: 7, name: 'GND', type: 'POWER_GND', description: 'Ground (0V)' },
      { pinNumber: 8, name: '3Y', type: 'OUTPUT', description: 'Gate 3 Output (3A AND 3B)' },
      { pinNumber: 9, name: '3A', type: 'INPUT', description: 'Gate 3 Input A' },
      { pinNumber: 10, name: '3B', type: 'INPUT', description: 'Gate 3 Input B' },
      { pinNumber: 11, name: '4Y', type: 'OUTPUT', description: 'Gate 4 Output (4A AND 4B)' },
      { pinNumber: 12, name: '4A', type: 'INPUT', description: 'Gate 4 Input A' },
      { pinNumber: 13, name: '4B', type: 'INPUT', description: 'Gate 4 Input B' },
      { pinNumber: 14, name: 'VCC', type: 'POWER_VCC', description: 'Supply Voltage (+5V)' },
    ],
    evaluate: (inputs) => {
      const and = (a?: LogicLevel, b?: LogicLevel): LogicLevel => {
        if (a === 1 && b === 1) return 1;
        if (a === 0 || b === 0) return 0;
        return 'X';
      };
      return {
        3: and(inputs[1], inputs[2]),
        6: and(inputs[4], inputs[5]),
        8: and(inputs[9], inputs[10]),
        11: and(inputs[12], inputs[13]),
      };
    },
  },

  '7432': {
    model: '7432',
    name: 'Quad 2-Input OR Gate',
    pinCount: 14,
    pins: [
      { pinNumber: 1, name: '1A', type: 'INPUT' },
      { pinNumber: 2, name: '1B', type: 'INPUT' },
      { pinNumber: 3, name: '1Y', type: 'OUTPUT' },
      { pinNumber: 4, name: '2A', type: 'INPUT' },
      { pinNumber: 5, name: '2B', type: 'INPUT' },
      { pinNumber: 6, name: '2Y', type: 'OUTPUT' },
      { pinNumber: 7, name: 'GND', type: 'POWER_GND' },
      { pinNumber: 8, name: '3Y', type: 'OUTPUT' },
      { pinNumber: 9, name: '3A', type: 'INPUT' },
      { pinNumber: 10, name: '3B', type: 'INPUT' },
      { pinNumber: 11, name: '4Y', type: 'OUTPUT' },
      { pinNumber: 12, name: '4A', type: 'INPUT' },
      { pinNumber: 13, name: '4B', type: 'INPUT' },
      { pinNumber: 14, name: 'VCC', type: 'POWER_VCC' },
    ],
    evaluate: (inputs) => {
      const or = (a?: LogicLevel, b?: LogicLevel): LogicLevel => {
        if (a === 1 || b === 1) return 1;
        if (a === 0 && b === 0) return 0;
        return 'X';
      };
      return {
        3: or(inputs[1], inputs[2]),
        6: or(inputs[4], inputs[5]),
        8: or(inputs[9], inputs[10]),
        11: or(inputs[12], inputs[13]),
      };
    },
  },

  '7486': {
    model: '7486',
    name: 'Quad 2-Input XOR Gate',
    pinCount: 14,
    pins: [
      { pinNumber: 1, name: '1A', type: 'INPUT' },
      { pinNumber: 2, name: '1B', type: 'INPUT' },
      { pinNumber: 3, name: '1Y', type: 'OUTPUT' },
      { pinNumber: 4, name: '2A', type: 'INPUT' },
      { pinNumber: 5, name: '2B', type: 'INPUT' },
      { pinNumber: 6, name: '2Y', type: 'OUTPUT' },
      { pinNumber: 7, name: 'GND', type: 'POWER_GND' },
      { pinNumber: 8, name: '3Y', type: 'OUTPUT' },
      { pinNumber: 9, name: '3A', type: 'INPUT' },
      { pinNumber: 10, name: '3B', type: 'INPUT' },
      { pinNumber: 11, name: '4Y', type: 'OUTPUT' },
      { pinNumber: 12, name: '4A', type: 'INPUT' },
      { pinNumber: 13, name: '4B', type: 'INPUT' },
      { pinNumber: 14, name: 'VCC', type: 'POWER_VCC' },
    ],
    evaluate: (inputs) => {
      const xor = (a?: LogicLevel, b?: LogicLevel): LogicLevel => {
        if ((a === 0 || a === 1) && (b === 0 || b === 1)) {
          return a !== b ? 1 : 0;
        }
        return 'X';
      };
      return {
        3: xor(inputs[1], inputs[2]),
        6: xor(inputs[4], inputs[5]),
        8: xor(inputs[9], inputs[10]),
        11: xor(inputs[12], inputs[13]),
      };
    },
  },

  '7476': {
    model: '7476',
    name: 'Dual JK Flip-Flop with Preset and Clear',
    pinCount: 16,
    pins: [
      { pinNumber: 1, name: '1CLK', type: 'INPUT', description: 'FF1 Clock Pulse (Negative-edge triggered)' },
      { pinNumber: 2, name: '1PRE', type: 'INPUT', description: 'FF1 Asynchronous Preset (Active-low)' },
      { pinNumber: 3, name: '1CLR', type: 'INPUT', description: 'FF1 Asynchronous Clear (Active-low)' },
      { pinNumber: 4, name: '1J', type: 'INPUT', description: 'FF1 J Input' },
      { pinNumber: 5, name: 'VCC', type: 'POWER_VCC', description: 'Supply Voltage (+5V)' },
      { pinNumber: 6, name: '2CLK', type: 'INPUT', description: 'FF2 Clock Pulse' },
      { pinNumber: 7, name: '2PRE', type: 'INPUT', description: 'FF2 Asynchronous Preset' },
      { pinNumber: 8, name: '2CLR', type: 'INPUT', description: 'FF2 Asynchronous Clear' },
      { pinNumber: 9, name: '2J', type: 'INPUT', description: 'FF2 J Input' },
      { pinNumber: 10, name: '2K', type: 'INPUT', description: 'FF2 K Input' },
      { pinNumber: 11, name: '2Q~', type: 'OUTPUT', description: 'FF2 Inverted Output' },
      { pinNumber: 12, name: '2Q', type: 'OUTPUT', description: 'FF2 Normal Output' },
      { pinNumber: 13, name: 'GND', type: 'POWER_GND', description: 'Ground (0V)' },
      { pinNumber: 14, name: '1Q~', type: 'OUTPUT', description: 'FF1 Inverted Output' },
      { pinNumber: 15, name: '1Q', type: 'OUTPUT', description: 'FF1 Normal Output' },
      { pinNumber: 16, name: '1K', type: 'INPUT', description: 'FF1 K Input' },
    ],
  },

  '7400': {
    model: '7400',
    name: 'Quad 2-Input NAND Gate (Universal Gate)',
    pinCount: 14,
    pins: [
      { pinNumber: 1, name: '1A', type: 'INPUT', description: 'Gate 1 Input A' },
      { pinNumber: 2, name: '1B', type: 'INPUT', description: 'Gate 1 Input B' },
      { pinNumber: 3, name: '1Y', type: 'OUTPUT', description: 'Gate 1 Output (NAND)' },
      { pinNumber: 4, name: '2A', type: 'INPUT', description: 'Gate 2 Input A' },
      { pinNumber: 5, name: '2B', type: 'INPUT', description: 'Gate 2 Input B' },
      { pinNumber: 6, name: '2Y', type: 'OUTPUT', description: 'Gate 2 Output (NAND)' },
      { pinNumber: 7, name: 'GND', type: 'POWER_GND', description: 'Ground (0V)' },
      { pinNumber: 8, name: '3Y', type: 'OUTPUT', description: 'Gate 3 Output (NAND)' },
      { pinNumber: 9, name: '3A', type: 'INPUT', description: 'Gate 3 Input A' },
      { pinNumber: 10, name: '3B', type: 'INPUT', description: 'Gate 3 Input B' },
      { pinNumber: 11, name: '4Y', type: 'OUTPUT', description: 'Gate 4 Output (NAND)' },
      { pinNumber: 12, name: '4A', type: 'INPUT', description: 'Gate 4 Input A' },
      { pinNumber: 13, name: '4B', type: 'INPUT', description: 'Gate 4 Input B' },
      { pinNumber: 14, name: 'VCC', type: 'POWER_VCC', description: 'Supply Voltage (+5V)' },
    ],
    evaluate: (inputs) => {
      const nand = (a?: LogicLevel, b?: LogicLevel): LogicLevel => {
        if (a === 0 || b === 0) return 1;
        if (a === 1 && b === 1) return 0;
        return 'X';
      };
      return {
        3: nand(inputs[1], inputs[2]),
        6: nand(inputs[4], inputs[5]),
        8: nand(inputs[9], inputs[10]),
        11: nand(inputs[12], inputs[13]),
      };
    },
  },

  '7402': {
    model: '7402',
    name: 'Quad 2-Input NOR Gate (Universal Gate)',
    pinCount: 14,
    pins: [
      { pinNumber: 1, name: '1Y', type: 'OUTPUT', description: 'Gate 1 Output (NOR) - Note: Pin 1 is OUTPUT!' },
      { pinNumber: 2, name: '1A', type: 'INPUT', description: 'Gate 1 Input A' },
      { pinNumber: 3, name: '1B', type: 'INPUT', description: 'Gate 1 Input B' },
      { pinNumber: 4, name: '2Y', type: 'OUTPUT', description: 'Gate 2 Output (NOR) - Note: Pin 4 is OUTPUT!' },
      { pinNumber: 5, name: '2A', type: 'INPUT', description: 'Gate 2 Input A' },
      { pinNumber: 6, name: '2B', type: 'INPUT', description: 'Gate 2 Input B' },
      { pinNumber: 7, name: 'GND', type: 'POWER_GND', description: 'Ground (0V)' },
      { pinNumber: 8, name: '3A', type: 'INPUT', description: 'Gate 3 Input A' },
      { pinNumber: 9, name: '3B', type: 'INPUT', description: 'Gate 3 Input B' },
      { pinNumber: 10, name: '3Y', type: 'OUTPUT', description: 'Gate 3 Output (NOR)' },
      { pinNumber: 11, name: '4A', type: 'INPUT', description: 'Gate 4 Input A' },
      { pinNumber: 12, name: '4B', type: 'INPUT', description: 'Gate 4 Input B' },
      { pinNumber: 13, name: '4Y', type: 'OUTPUT', description: 'Gate 4 Output (NOR)' },
      { pinNumber: 14, name: 'VCC', type: 'POWER_VCC', description: 'Supply Voltage (+5V)' },
    ],
    evaluate: (inputs) => {
      const nor = (a?: LogicLevel, b?: LogicLevel): LogicLevel => {
        if (a === 1 || b === 1) return 0;
        if (a === 0 && b === 0) return 1;
        return 'X';
      };
      return {
        1: nor(inputs[2], inputs[3]),
        4: nor(inputs[5], inputs[6]),
        10: nor(inputs[8], inputs[9]),
        13: nor(inputs[11], inputs[12]),
      };
    },
  },
};
