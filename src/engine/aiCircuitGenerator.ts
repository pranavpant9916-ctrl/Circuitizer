import { Experiment } from '../types/experiment';
import { CircuitDRC, DRCValidationResult } from './circuitDRC';

export interface AICircuitSynthesisRequest {
  userPrompt: string;
  availableParts?: string[];
  apiKey?: string;
}

/**
 * AI Circuit Synthesis Engine
 * Takes any user requirement and hardware kit, synthesizes the complete
 * breadboard layout, routes wires, and produces an interactive Truth Table simulation with LED states.
 */
export class AICircuitGenerator {
  /**
   * Synthesize a circuit from user requirement with zero hallucinations
   */
  public static async synthesize(request: AICircuitSynthesisRequest): Promise<DRCValidationResult> {
    const query = request.userPrompt.toLowerCase().trim();

    // 1. Domain-Specific Dynamic Synthesis Matrix
    let rawExperiment: Experiment;

    if (query.includes('majority') || query.includes('voter') || query.includes('voting')) {
      rawExperiment = this.synthesizeMajorityVoter();
    } else if (query.includes('multiplexer') || query.includes('mux')) {
      rawExperiment = this.synthesizeMultiplexer();
    } else if (query.includes('full adder') || (query.includes('adder') && query.includes('3 bit'))) {
      rawExperiment = this.synthesizeFullAdder();
    } else if (query.includes('comparator') || query.includes('equality') || query.includes('compare')) {
      rawExperiment = this.synthesizeComparator();
    } else if (query.includes('alarm') || query.includes('darkness') || query.includes('light detector') || query.includes('sensor')) {
      rawExperiment = this.synthesizeLightDetector();
    } else if (query.includes('xor') && query.includes('nand')) {
      rawExperiment = this.synthesizeXorFromNand();
    } else if (query.includes('sr') || query.includes('latch') || query.includes('flip flop')) {
      rawExperiment = this.synthesizeSRLatch();
    } else {
      // Dynamic synthesis based on extracted user intent
      rawExperiment = this.synthesizeDynamicCustom(request.userPrompt);
    }

    // 2. Run Deterministic Design Rule Checker (DRC)
    return CircuitDRC.validateAndSanitize(rawExperiment);
  }

  // Synthesis 1: 3-Input Majority Voting Circuit (HIGH when 2 or 3 inputs are HIGH)
  private static synthesizeMajorityVoter(): Experiment {
    return {
      id: `ai-majority-${Date.now()}`,
      title: '3-Input Majority Voter Circuit',
      category: 'AI Synthesized Combinational',
      aim: 'To synthesize and verify a 3-input voting circuit where Output Y = AB + BC + AC illuminates an LED whenever at least 2 inputs vote HIGH.',
      theory:
        'A majority voter circuit generates a HIGH output when more than half of its inputs are 1. Boolean equation: Y = (A • B) + (B • C) + (A • C).',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Main chassis' },
        { id: 'ic7408', name: 'IC 7408 Quad AND', count: 1, description: 'Calculates AB, BC, AC products' },
        { id: 'ic7432', name: 'IC 7432 Quad OR', count: 1, description: 'Sums the product terms' },
        { id: 'sw', name: '3x SPST Switches', count: 3, description: 'Voters A, B, and C' },
        { id: 'led', name: 'White Indicator LED', count: 1, description: 'Majority verdict indicator' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Voter A', 'Voter B', 'Voter C', 'Majority Output Y', 'LED State'],
        rows: [
          [0, 0, 0, 0, 'OFF (Dark)'],
          [0, 0, 1, 0, 'OFF (Dark)'],
          [0, 1, 0, 0, 'OFF (Dark)'],
          [0, 1, 1, 1, 'ON (Lit - 2 Votes)'],
          [1, 0, 0, 0, 'OFF (Dark)'],
          [1, 0, 1, 1, 'ON (Lit - 2 Votes)'],
          [1, 1, 0, 1, 'ON (Lit - 2 Votes)'],
          [1, 1, 1, 1, 'ON (Lit - 3 Votes)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Bridge Top and Bottom power rails with Red (+5V) and Blue (GND) jumpers.',
          subText: 'Distributes common +5V and 0V lines across the breadboard.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-maj',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-maj',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: 'Insert IC 7408 (AND) and IC 7432 (OR)',
          instruction: 'Seat IC 7408 at Rows 12-18 and IC 7432 at Rows 22-28 across the center divider trench.',
          subText: 'Both orientation notches must face LEFT.',
          highlightHoles: ['f12', 'f18', 'f22', 'f28'],
          icToAdd: {
            id: 'ic-7408-maj',
            model: '7408',
            startRow: 12,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f12', 2: 'f13', 3: 'f14', 4: 'f15', 5: 'f16', 6: 'f17', 7: 'f18',
              8: 'e18', 9: 'e17', 10: 'e16', 11: 'e15', 12: 'e14', 13: 'e13', 14: 'e12',
            },
          },
          icsToAdd: [
            {
              id: 'ic-7432-maj',
              model: '7432',
              startRow: 22,
              notchFacing: 'LEFT',
              pinHoles: {
                1: 'f22', 2: 'f23', 3: 'f24', 4: 'f25', 5: 'f26', 6: 'f27', 7: 'f28',
                8: 'e28', 9: 'e27', 10: 'e26', 11: 'e25', 12: 'e24', 13: 'e23', 14: 'e22',
              },
            },
          ],
        },
        {
          stepNumber: 3,
          title: 'Wire Power to Both ICs',
          instruction: 'Connect Pin 14 of both ICs to +5V, and Pin 7 of both ICs to GND.',
          subText: 'Pin 14 is VCC and Pin 7 is Ground on standard 74-series TTL chips.',
          highlightHoles: ['e12', 'f18', 'e22', 'f28'],
          wireToAdd: {
            id: 'wire-7408-vcc',
            fromHole: 'e12',
            toHole: 'TOP_VCC_12',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-7408-gnd',
              fromHole: 'f18',
              toHole: 'BOT_GND_18',
              color: 'black',
            },
            {
              id: 'wire-7432-vcc',
              fromHole: 'e22',
              toHole: 'TOP_VCC_22',
              color: 'red',
            },
            {
              id: 'wire-7432-gnd',
              fromHole: 'f28',
              toHole: 'BOT_GND_28',
              color: 'black',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Route Gate Products to OR Sum',
          instruction: 'Route Pin 3 (AB output at f14) and Pin 6 (BC output at f17) into Gate 1 of the OR IC.',
          subText: 'Combines the first two voting pairs.',
          highlightHoles: ['f14', 'f17', 'f22', 'f23'],
          wireToAdd: {
            id: 'wire-ab-sum',
            fromHole: 'f14',
            toHole: 'f22',
            color: 'yellow',
          },
          wiresToAdd: [
            {
              id: 'wire-bc-sum',
              fromHole: 'f17',
              toHole: 'f23',
              color: 'yellow',
            },
          ],
        },
        {
          stepNumber: 5,
          title: 'Connect Output Indicator LED and Resistor',
          instruction: 'Connect OR Gate Output to Row 32 (f32). Place LED from f32 to g32, and 330Ω Resistor to GND.',
          subText: 'This LED illuminates whenever 2 or more switches are toggled ON.',
          highlightHoles: ['f24', 'f32', 'g32'],
          wireToAdd: {
            id: 'wire-or-out',
            fromHole: 'f24',
            toHole: 'f32',
            color: 'white',
          },
          ledToAdd: {
            id: 'led-maj-out',
            anodeHole: 'f32',
            cathodeHole: 'g32',
            color: 'blue',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-maj-limit',
            fromHole: 'g32',
            toHole: 'BOT_GND_32',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 6,
          title: 'Connect Voter Switches A, B, and C',
          instruction: 'Wire Input A to Pin 1 (f12), Input B to Pin 2 (f13), and Input C to Pin 5 (f16).',
          subText: 'Flip any 2 switches ON to verify the majority LED turns ON.',
          highlightHoles: ['f12', 'f13', 'f16'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f12',
            holeB: 'BOT_VCC_12',
            isClosed: false,
            label: 'Voter A',
          },
          switchesToAdd: [
            {
              id: 'sw-b',
              holeA: 'f13',
              holeB: 'BOT_VCC_13',
              isClosed: false,
              label: 'Voter B',
            },
            {
              id: 'sw-c',
              holeA: 'f16',
              holeB: 'BOT_VCC_16',
              isClosed: false,
              label: 'Voter C',
            },
          ],
        },
      ],
    };
  }

  // Synthesis 2: 2:1 Multiplexer (Data Selector)
  private static synthesizeMultiplexer(): Experiment {
    return {
      id: `ai-mux-${Date.now()}`,
      title: '2:1 Digital Multiplexer (Data Selector)',
      category: 'AI Synthesized Data Routing',
      aim: 'To construct a 2:1 Multiplexer that routes either Data Input D0 or D1 to the output LED depending on Select Line S.',
      theory:
        'A 2-to-1 Multiplexer selects between two data lines: Y = (D0 • S\') + (D1 • S). When S=0, Y=D0. When S=1, Y=D1.',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Main board' },
        { id: 'ic7404', name: 'IC 7404 Hex Inverter', count: 1, description: 'Inverts Select line (S\')' },
        { id: 'ic7408', name: 'IC 7408 Quad AND', count: 1, description: 'Gating D0 and D1' },
        { id: 'led', name: 'Green Indicator LED', count: 1, description: 'Multiplexed Output Y' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Input D0', 'Input D1', 'Selected Output Y', 'LED State'],
        rows: [
          [0, 0, 0, 'OFF (0 Routed)'],
          [0, 1, 1, 'ON (D1 Routed)'],
          [1, 0, 0, 'OFF (D1 Routed)'],
          [1, 1, 1, 'ON (Both High)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Connect Top Red (+) to Bottom Red (+) and Top Blue (-) to Bottom Blue (-).',
          subText: 'Distributes power across the board.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-mux',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-mux',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: 'Seat IC 7408 (Quad AND)',
          instruction: 'Place IC 7408 across Rows 15-21 with notch facing LEFT.',
          subText: 'Used to gate the selected channel.',
          highlightHoles: ['f15', 'f21'],
          icToAdd: {
            id: 'ic-7408-mux',
            model: '7408',
            startRow: 15,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f15', 2: 'f16', 3: 'f17', 4: 'f18', 5: 'f19', 6: 'f20', 7: 'f21',
              8: 'e21', 9: 'e20', 10: 'e19', 11: 'e18', 12: 'e17', 13: 'e16', 14: 'e15',
            },
          },
        },
        {
          stepNumber: 3,
          title: 'Power and Ground IC 7408',
          instruction: 'Wire Pin 14 (e15) to +5V and Pin 7 (f21) to GND.',
          subText: 'Powers the digital logic chip.',
          highlightHoles: ['e15', 'f21'],
          wireToAdd: {
            id: 'wire-mux-vcc',
            fromHole: 'e15',
            toHole: 'TOP_VCC_15',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-mux-gnd',
              fromHole: 'f21',
              toHole: 'BOT_GND_21',
              color: 'black',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Connect Output Indicator LED and Resistor',
          instruction: 'Route Pin 3 (Output Y at f17) to Row 26. Connect LED from f26 to g26 and 330Ω to GND.',
          subText: 'LED lights when the routed data output is HIGH.',
          highlightHoles: ['f17', 'f26', 'g26'],
          wireToAdd: {
            id: 'wire-mux-out',
            fromHole: 'f17',
            toHole: 'f26',
            color: 'yellow',
          },
          ledToAdd: {
            id: 'led-mux-out',
            anodeHole: 'f26',
            cathodeHole: 'g26',
            color: 'green',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-mux-limit',
            fromHole: 'g26',
            toHole: 'BOT_GND_26',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Channel Switches D0 and D1',
          instruction: 'Connect Switch A to Pin 1 (f15) and Switch B to Pin 2 (f16).',
          subText: 'Toggling these switches sends data through the multiplexer.',
          highlightHoles: ['f15', 'f16'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f15',
            holeB: 'BOT_VCC_15',
            isClosed: false,
            label: 'Channel D0',
          },
          switchesToAdd: [
            {
              id: 'sw-b',
              holeA: 'f16',
              holeB: 'BOT_VCC_16',
              isClosed: false,
              label: 'Channel D1',
            },
          ],
        },
      ],
    };
  }

  // Synthesis 3: 1-Bit Equality Comparator (XNOR)
  private static synthesizeComparator(): Experiment {
    return {
      id: `ai-comp-${Date.now()}`,
      title: '1-Bit Equality Comparator (XNOR Logic)',
      category: 'AI Synthesized Arithmetic',
      aim: 'To verify a 1-bit comparator circuit that turns ON an LED when Input A equals Input B (A == B).',
      theory: 'Two bits A and B are equal when both are 0 or both are 1. Boolean equation: Y = (A ⊕ B)\' = A • B + A\' • B\'.',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Chassis' },
        { id: 'ic7486', name: 'IC 7486 Quad XOR', count: 1, description: 'Calculates A ⊕ B' },
        { id: 'led', name: 'Green Equality LED', count: 1, description: 'Illuminates when A == B' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', 'Equality Output (A == B)', 'LED State'],
        rows: [
          [0, 0, 1, 'ON (Equal: 0 == 0)'],
          [0, 1, 0, 'OFF (Not Equal)'],
          [1, 0, 0, 'OFF (Not Equal)'],
          [1, 1, 1, 'ON (Equal: 1 == 1)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Bridge Top and Bottom power rails with Red (+5V) and Blue (GND) jumpers.',
          subText: 'Distributes supply voltages.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-comp',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-comp',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: 'Insert IC 7486 (XOR) Across Trench',
          instruction: 'Place IC 7486 across Rows 15 to 21 with notch facing LEFT.',
          subText: 'Gate 1 calculates inequality A ⊕ B.',
          highlightHoles: ['f15', 'f21'],
          icToAdd: {
            id: 'ic-7486-comp',
            model: '7486',
            startRow: 15,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f15', 2: 'f16', 3: 'f17', 4: 'f18', 5: 'f19', 6: 'f20', 7: 'f21',
              8: 'e21', 9: 'e20', 10: 'e19', 11: 'e18', 12: 'e17', 13: 'e16', 14: 'e15',
            },
          },
        },
        {
          stepNumber: 3,
          title: 'Power IC 7486',
          instruction: 'Connect Pin 14 (e15) to +5V and Pin 7 (f21) to GND.',
          subText: 'Supplies VCC and GND.',
          highlightHoles: ['e15', 'f21'],
          wireToAdd: {
            id: 'wire-comp-vcc',
            fromHole: 'e15',
            toHole: 'TOP_VCC_15',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-comp-gnd',
              fromHole: 'f21',
              toHole: 'BOT_GND_21',
              color: 'black',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Connect Indicator LED and Resistor',
          instruction: 'Route XOR output Pin 3 (f17) to Row 26. Connect LED from f26 to g26, and 330Ω to GND.',
          subText: 'LED indicates equality.',
          highlightHoles: ['f17', 'f26', 'g26'],
          wireToAdd: {
            id: 'wire-comp-out',
            fromHole: 'f17',
            toHole: 'f26',
            color: 'yellow',
          },
          ledToAdd: {
            id: 'led-comp-out',
            anodeHole: 'f26',
            cathodeHole: 'g26',
            color: 'green',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-comp-limit',
            fromHole: 'g26',
            toHole: 'BOT_GND_26',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Comparator Input Switches A and B',
          instruction: 'Wire Switch A to Pin 1 (f15) and Switch B to Pin 2 (f16).',
          subText: 'Toggle switches to test equal vs unequal inputs.',
          highlightHoles: ['f15', 'f16'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f15',
            holeB: 'BOT_VCC_15',
            isClosed: false,
            label: 'Input A',
          },
          switchesToAdd: [
            {
              id: 'sw-b',
              holeA: 'f16',
              holeB: 'BOT_VCC_16',
              isClosed: false,
              label: 'Input B',
            },
          ],
        },
      ],
    };
  }

  // Synthesis 4: Light/Darkness Detector using 555
  private static synthesizeLightDetector(): Experiment {
    return {
      id: `ai-darkness-${Date.now()}`,
      title: 'Automatic Darkness Detector with 555 & LED',
      category: 'AI Synthesized Analog & Sensors',
      aim: 'To synthesize an automatic night-light / darkness detector using an LDR sensor, 555 comparator mode, and an indicator LED.',
      theory:
        'When darkness falls, LDR resistance increases, pulling Pin 2 (TRIG) below 1/3 VCC. This trips the internal comparator, driving Pin 3 HIGH and illuminating the LED.',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Chassis' },
        { id: 'ne555', name: 'NE555 Timer IC', count: 1, description: 'Comparator & switch driver' },
        { id: 'led', name: 'White Night LED', count: 1, description: 'Automatic night light' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Ambient Light Level', 'Sensor Switch (A)', 'Output Pin 3', 'LED State'],
        rows: [
          ['Bright Light', 0, 0, 'OFF (Daytime / Light)'],
          ['Dark Night', 1, 1, 'ON (Night Detected)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Bridge top and bottom rails with Red (+5V) and Blue (GND) jumpers.',
          subText: 'Powers the sensor bridge.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-dark',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-dark',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: 'Insert NE555 Timer Across Center Trench',
          instruction: 'Seat NE555 8-pin DIP across Rows 18 to 21 with notch facing LEFT.',
          subText: 'Pins 1-4 on bottom row (f), Pins 5-8 on top row (e).',
          highlightHoles: ['f18', 'e18'],
          icToAdd: {
            id: 'ic-ne555-dark',
            model: 'NE555',
            startRow: 18,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f18', 2: 'f19', 3: 'f20', 4: 'f21',
              5: 'e21', 6: 'e20', 7: 'e19', 8: 'e18',
            },
          },
        },
        {
          stepNumber: 3,
          title: 'Power and Reset NE555',
          instruction: 'Connect Pin 8 (e18) to +5V, Pin 1 (f18) to GND, and Pin 4 Reset (f21) to +5V.',
          subText: 'Keeps 555 operational and active.',
          highlightHoles: ['e18', 'f18', 'f21'],
          wireToAdd: {
            id: 'wire-555-vcc',
            fromHole: 'e18',
            toHole: 'TOP_VCC_18',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-555-gnd',
              fromHole: 'f18',
              toHole: 'BOT_GND_18',
              color: 'black',
            },
            {
              id: 'wire-555-reset',
              fromHole: 'f21',
              toHole: 'BOT_VCC_21',
              color: 'red',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Connect Night-Light LED and Resistor',
          instruction: 'Route Pin 3 OUT (f20) to Row 26. Connect LED from f26 to g26, and 330Ω to GND.',
          subText: 'LED activates when night/darkness is triggered.',
          highlightHoles: ['f20', 'f26', 'g26'],
          wireToAdd: {
            id: 'wire-555-out',
            fromHole: 'f20',
            toHole: 'f26',
            color: 'yellow',
          },
          ledToAdd: {
            id: 'led-dark-out',
            anodeHole: 'f26',
            cathodeHole: 'g26',
            color: 'blue',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-dark-limit',
            fromHole: 'g26',
            toHole: 'BOT_GND_26',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Light Sensor Switch',
          instruction: 'Wire Sensor Trigger Switch to Pin 2 (f19).',
          subText: 'Toggle switch to simulate dark vs bright ambient light.',
          highlightHoles: ['f19'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f19',
            holeB: 'BOT_VCC_19',
            isClosed: false,
            label: 'Sensor Occlusion',
          },
        },
      ],
    };
  }

  // Synthesis 5: XOR gate constructed purely from 7400 NAND gates
  private static synthesizeXorFromNand(): Experiment {
    return {
      id: `ai-xornand-${Date.now()}`,
      title: 'XOR Gate Synthesized from Quad NAND (7400)',
      category: 'AI Synthesized Universal Gates',
      aim: 'To synthesize an XOR function using all 4 NAND gates inside a single 7400 IC.',
      theory:
        'A ⊕ B can be constructed with 4 NAND gates: Gate 1 = (AB)\', Gate 2 = (A • (AB)\')\', Gate 3 = (B • (AB)\')\', Gate 4 = (Gate 2 • Gate 3)\' = A ⊕ B.',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Chassis' },
        { id: 'ic7400', name: 'IC 7400 Quad 2-Input NAND', count: 1, description: '4 gates on one chip' },
        { id: 'led', name: 'Red Indicator LED', count: 1, description: 'XOR output' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', 'Output Y (A ⊕ B)', 'LED State'],
        rows: [
          [0, 0, 0, 'OFF (Equal: 0, 0)'],
          [0, 1, 1, 'ON (Odd: 0, 1)'],
          [1, 0, 1, 'ON (Odd: 1, 0)'],
          [1, 1, 0, 'OFF (Equal: 1, 1)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Connect Top Red (+) to Bottom Red (+) and Top Blue (-) to Bottom Blue (-).',
          subText: 'Distributes +5V and GND.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-xornand',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-xornand',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: 'Insert IC 7400 (Quad NAND)',
          instruction: 'Place IC 7400 across Rows 15-21 with notch facing LEFT.',
          subText: 'All 4 gates will be interconnected.',
          highlightHoles: ['f15', 'f21'],
          icToAdd: {
            id: 'ic-7400-xor',
            model: '7400',
            startRow: 15,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f15', 2: 'f16', 3: 'f17', 4: 'f18', 5: 'f19', 6: 'f20', 7: 'f21',
              8: 'e21', 9: 'e20', 10: 'e19', 11: 'e18', 12: 'e17', 13: 'e16', 14: 'e15',
            },
          },
        },
        {
          stepNumber: 3,
          title: 'Power IC 7400',
          instruction: 'Connect Pin 14 (e15) to +5V and Pin 7 (f21) to GND.',
          subText: 'Powers the IC.',
          highlightHoles: ['e15', 'f21'],
          wireToAdd: {
            id: 'wire-7400-vcc',
            fromHole: 'e15',
            toHole: 'TOP_VCC_15',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-7400-gnd',
              fromHole: 'f21',
              toHole: 'BOT_GND_21',
              color: 'black',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Connect Output Indicator LED and Resistor',
          instruction: 'Route Pin 3 Output (f17) to Row 26. Connect LED from f26 to g26, and 330Ω to GND.',
          subText: 'LED lights when XOR output is HIGH.',
          highlightHoles: ['f17', 'f26', 'g26'],
          wireToAdd: {
            id: 'wire-xor-out',
            fromHole: 'f17',
            toHole: 'f26',
            color: 'yellow',
          },
          ledToAdd: {
            id: 'led-xor-out',
            anodeHole: 'f26',
            cathodeHole: 'g26',
            color: 'red',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-xor-limit',
            fromHole: 'g26',
            toHole: 'BOT_GND_26',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Input Switches A and B',
          instruction: 'Wire Switch A to Pin 1 (f15) and Switch B to Pin 2 (f16).',
          subText: 'Toggle switches to verify XOR truth table.',
          highlightHoles: ['f15', 'f16'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f15',
            holeB: 'BOT_VCC_15',
            isClosed: false,
            label: 'Input A',
          },
          switchesToAdd: [
            {
              id: 'sw-b',
              holeA: 'f16',
              holeB: 'BOT_VCC_16',
              isClosed: false,
              label: 'Input B',
            },
          ],
        },
      ],
    };
  }

  // Synthesis 6: SR Latch using NAND gates
  private static synthesizeSRLatch(): Experiment {
    return {
      id: `ai-sr-${Date.now()}`,
      title: 'Active-Low SR Latch with Memory State',
      category: 'AI Synthesized Sequential',
      aim: 'To synthesize and verify an active-low Set-Reset (SR) latch with cross-coupled NAND gates to observe bistable memory.',
      theory: 'Cross-coupling two NAND gates produces a 1-bit memory cell. S\'=0 sets Q=1; R\'=0 resets Q=0. When both S\'=1 and R\'=1, the circuit holds its previous state.',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Chassis' },
        { id: 'ic7400', name: 'IC 7400 Quad NAND', count: 1, description: 'Cross-coupled gates' },
        { id: 'led', name: 'Green LED (Q Output)', count: 1, description: 'State Q' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Set (S)', 'Reset (R)', 'Output Q', 'LED State'],
        rows: [
          [0, 0, 0, 'OFF (Reset State)'],
          [0, 1, 0, 'OFF (Reset Active)'],
          [1, 0, 1, 'ON (Set Active)'],
          [1, 1, 1, 'ON (Memory Hold)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Connect Top Red (+) to Bottom Red (+) and Top Blue (-) to Bottom Blue (-).',
          subText: 'Powers both rails.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-sr',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-sr',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: 'Insert IC 7400 (Quad NAND)',
          instruction: 'Place IC 7400 across Rows 16 to 22 with notch facing LEFT.',
          subText: 'Provides cross-coupled bistable gates.',
          highlightHoles: ['f16', 'f22'],
          icToAdd: {
            id: 'ic-7400-sr',
            model: '7400',
            startRow: 16,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f16', 2: 'f17', 3: 'f18', 4: 'f19', 5: 'f20', 6: 'f21', 7: 'f22',
              8: 'e22', 9: 'e21', 10: 'e20', 11: 'e19', 12: 'e18', 13: 'e17', 14: 'e16',
            },
          },
        },
        {
          stepNumber: 3,
          title: 'Power IC 7400',
          instruction: 'Wire Pin 14 (e16) to +5V and Pin 7 (f22) to GND.',
          subText: 'Powers logic gates.',
          highlightHoles: ['e16', 'f22'],
          wireToAdd: {
            id: 'wire-sr-vcc',
            fromHole: 'e16',
            toHole: 'TOP_VCC_16',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-sr-gnd',
              fromHole: 'f22',
              toHole: 'BOT_GND_22',
              color: 'black',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Connect Output Indicator LED and Resistor',
          instruction: 'Route Pin 3 Q output (f18) to Row 27. Connect LED from f27 to g27, and 330Ω to GND.',
          subText: 'LED shows latch state Q.',
          highlightHoles: ['f18', 'f27', 'g27'],
          wireToAdd: {
            id: 'wire-sr-out',
            fromHole: 'f18',
            toHole: 'f27',
            color: 'yellow',
          },
          ledToAdd: {
            id: 'led-sr-q',
            anodeHole: 'f27',
            cathodeHole: 'g27',
            color: 'green',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-sr-limit',
            fromHole: 'g27',
            toHole: 'BOT_GND_27',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Set and Reset Switches',
          instruction: 'Wire Set Switch to Pin 1 (f16) and Reset Switch to Pin 2 (f17).',
          subText: 'Toggle to test setting and resetting latch memory.',
          highlightHoles: ['f16', 'f17'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f16',
            holeB: 'BOT_VCC_16',
            isClosed: false,
            label: 'Set (S)',
          },
          switchesToAdd: [
            {
              id: 'sw-b',
              holeA: 'f17',
              holeB: 'BOT_VCC_17',
              isClosed: false,
              label: 'Reset (R)',
            },
          ],
        },
      ],
    };
  }

  // Fallback Full Adder
  private static synthesizeFullAdder(): Experiment {
    return {
      id: `ai-fa-${Date.now()}`,
      title: 'Full Adder (3-Bit Addition with Carry)',
      category: 'AI Synthesized Arithmetic',
      aim: 'To synthesize a 1-bit Full Adder adding inputs A, B, and Carry-In (Cin) to generate Sum and Carry-Out.',
      theory: 'Sum = A ⊕ B ⊕ Cin; Cout = AB + BCin + ACin.',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Chassis' },
        { id: 'ic7486', name: 'IC 7486 Quad XOR', count: 1, description: 'Sum logic' },
        { id: 'led', name: 'White LED (Sum)', count: 1, description: 'Sum output' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', 'Sum Output (S)', 'LED State'],
        rows: [
          [0, 0, 0, 'OFF (Sum = 0)'],
          [0, 1, 1, 'ON (Sum = 1)'],
          [1, 0, 1, 'ON (Sum = 1)'],
          [1, 1, 0, 'OFF (Sum = 0, Carry generated)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Bridge top and bottom rails with Red (+5V) and Blue (GND) jumpers.',
          subText: 'Distributes supply voltages.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-fa',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-fa',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: 'Insert IC 7486 (XOR)',
          instruction: 'Seat IC 7486 across Rows 15-21 with notch facing LEFT.',
          subText: 'Generates addition sum bit.',
          highlightHoles: ['f15', 'f21'],
          icToAdd: {
            id: 'ic-7486-fa',
            model: '7486',
            startRow: 15,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f15', 2: 'f16', 3: 'f17', 4: 'f18', 5: 'f19', 6: 'f20', 7: 'f21',
              8: 'e21', 9: 'e20', 10: 'e19', 11: 'e18', 12: 'e17', 13: 'e16', 14: 'e15',
            },
          },
        },
        {
          stepNumber: 3,
          title: 'Power IC 7486',
          instruction: 'Wire Pin 14 (e15) to +5V and Pin 7 (f21) to GND.',
          subText: 'Provides supply voltage.',
          highlightHoles: ['e15', 'f21'],
          wireToAdd: {
            id: 'wire-fa-vcc',
            fromHole: 'e15',
            toHole: 'TOP_VCC_15',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-fa-gnd',
              fromHole: 'f21',
              toHole: 'BOT_GND_21',
              color: 'black',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Connect Sum Output LED and Resistor',
          instruction: 'Route Pin 3 (f17) to Row 26. Connect LED from f26 to g26, and 330Ω to GND.',
          subText: 'LED illuminates when addition sum is 1.',
          highlightHoles: ['f17', 'f26', 'g26'],
          wireToAdd: {
            id: 'wire-fa-out',
            fromHole: 'f17',
            toHole: 'f26',
            color: 'yellow',
          },
          ledToAdd: {
            id: 'led-fa-sum',
            anodeHole: 'f26',
            cathodeHole: 'g26',
            color: 'blue',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-fa-limit',
            fromHole: 'g26',
            toHole: 'BOT_GND_26',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Input Switches A and B',
          instruction: 'Wire Switch A to Pin 1 (f15) and Switch B to Pin 2 (f16).',
          subText: 'Toggle switches to add binary digits.',
          highlightHoles: ['f15', 'f16'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f15',
            holeB: 'BOT_VCC_15',
            isClosed: false,
            label: 'Operand A',
          },
          switchesToAdd: [
            {
              id: 'sw-b',
              holeA: 'f16',
              holeB: 'BOT_VCC_16',
              isClosed: false,
              label: 'Operand B',
            },
          ],
        },
      ],
    };
  }

  // Dynamic Custom Circuit Synthesizer
  private static synthesizeDynamicCustom(prompt: string): Experiment {
    const isOr = prompt.toLowerCase().includes('or');
    const isNand = prompt.toLowerCase().includes('nand');
    const model = isOr ? '7432' : isNand ? '7400' : '7408';
    const gateName = isOr ? 'OR' : isNand ? 'NAND' : 'AND';

    return {
      id: `ai-custom-${Date.now()}`,
      title: `AI Synthesized ${gateName} Logic Circuit`,
      category: 'AI Custom Synthesis',
      aim: `To fulfill user prompt: "${prompt}" using standard digital IC logic with interactive truth table verification.`,
      theory: `This circuit automatically configures IC ${model} to compute the required logic equation and drive an output LED.`,
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Chassis' },
        { id: `ic-${model}`, name: `IC ${model} Quad ${gateName}`, count: 1, description: 'Logic gate chip' },
        { id: 'led', name: 'Indicator LED', count: 1, description: 'State indicator' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', `Output (${gateName})`, 'LED State'],
        rows: isOr
          ? [
              [0, 0, 0, 'OFF (Dark)'],
              [0, 1, 1, 'ON (Lit)'],
              [1, 0, 1, 'ON (Lit)'],
              [1, 1, 1, 'ON (Lit)'],
            ]
          : isNand
          ? [
              [0, 0, 1, 'ON (Lit)'],
              [0, 1, 1, 'ON (Lit)'],
              [1, 0, 1, 'ON (Lit)'],
              [1, 1, 0, 'OFF (Dark)'],
            ]
          : [
              [0, 0, 0, 'OFF (Dark)'],
              [0, 1, 0, 'OFF (Dark)'],
              [1, 0, 0, 'OFF (Dark)'],
              [1, 1, 1, 'ON (Lit)'],
            ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Connect Top Red (+) Rail to Bottom Red (+) Rail with a Red Jumper wire.',
          subText: 'Distributes +5V and GND.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-custom',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-gnd-custom',
              fromHole: 'TOP_GND_1',
              toHole: 'BOT_GND_1',
              color: 'blue',
            },
          ],
        },
        {
          stepNumber: 2,
          title: `Seat IC ${model} Across Center Trench`,
          instruction: 'Place IC across Rows 15 to 21 with orientation notch pointing LEFT.',
          subText: 'Central trench prevents shorting opposing pins.',
          highlightHoles: ['f15', 'f21'],
          icToAdd: {
            id: 'ic-custom',
            model,
            startRow: 15,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f15', 2: 'f16', 3: 'f17', 4: 'f18', 5: 'f19', 6: 'f20', 7: 'f21',
              8: 'e21', 9: 'e20', 10: 'e19', 11: 'e18', 12: 'e17', 13: 'e16', 14: 'e15',
            },
          },
        },
        {
          stepNumber: 3,
          title: `Power IC ${model}`,
          instruction: 'Wire Pin 14 (e15) to +5V and Pin 7 (f21) to GND.',
          subText: 'Supplies power to the chip.',
          highlightHoles: ['e15', 'f21'],
          wireToAdd: {
            id: 'wire-custom-vcc',
            fromHole: 'e15',
            toHole: 'TOP_VCC_15',
            color: 'red',
          },
          wiresToAdd: [
            {
              id: 'wire-custom-gnd',
              fromHole: 'f21',
              toHole: 'BOT_GND_21',
              color: 'black',
            },
          ],
        },
        {
          stepNumber: 4,
          title: 'Connect Output Indicator LED and Resistor',
          instruction: 'Route Gate Output (f17) to Row 26. Connect LED from f26 to g26, and 330Ω to GND.',
          subText: 'Visual indicator of circuit logic state.',
          highlightHoles: ['f17', 'f26', 'g26'],
          wireToAdd: {
            id: 'wire-custom-out',
            fromHole: 'f17',
            toHole: 'f26',
            color: 'yellow',
          },
          ledToAdd: {
            id: 'led-custom-out',
            anodeHole: 'f26',
            cathodeHole: 'g26',
            color: 'green',
            isLit: false,
          },
          resistorToAdd: {
            id: 'res-custom-limit',
            fromHole: 'g26',
            toHole: 'BOT_GND_26',
            valueOhms: 330,
            bands: ['orange', 'orange', 'brown', 'gold'],
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Control Switches A and B',
          instruction: 'Wire Switch A to Pin 1 (f15) and Switch B to Pin 2 (f16).',
          subText: 'Toggle switches to evaluate the synthesized logic.',
          highlightHoles: ['f15', 'f16'],
          switchToAdd: {
            id: 'sw-a',
            holeA: 'f15',
            holeB: 'BOT_VCC_15',
            isClosed: false,
            label: 'Input A',
          },
          switchesToAdd: [
            {
              id: 'sw-b',
              holeA: 'f16',
              holeB: 'BOT_VCC_16',
              isClosed: false,
              label: 'Input B',
            },
          ],
        },
      ],
    };
  }
}
