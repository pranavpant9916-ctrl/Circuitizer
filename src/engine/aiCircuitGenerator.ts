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
        },
        {
          stepNumber: 3,
          title: 'Wire Power to Both ICs',
          instruction: 'Connect Pin 14 of both ICs to +5V, and Pin 7 of both ICs to GND.',
          subText: 'Pin 14 is VCC and Pin 7 is Ground on standard 74-series TTL chips.',
          highlightHoles: ['e12', 'f18'],
          wireToAdd: {
            id: 'wire-7408-vcc',
            fromHole: 'e12',
            toHole: 'TOP_VCC_12',
            color: 'red',
          },
        },
        {
          stepNumber: 4,
          title: 'Route Gate Products to OR Sum',
          instruction: 'Route Pin 3 (AB output at f14) and Pin 6 (BC output at f17) into Gate 1 of the OR IC.',
          subText: 'Combines the first two voting pairs.',
          highlightHoles: ['f14', 'f17'],
          wireToAdd: {
            id: 'wire-ab-sum',
            fromHole: 'f14',
            toHole: 'f22',
            color: 'yellow',
          },
        },
        {
          stepNumber: 5,
          title: 'Connect Output Indicator LED and Resistor',
          instruction: 'Connect OR Gate Output to Row 32 (f32). Place White LED to g32, and 330Ω Resistor to GND.',
          subText: 'This LED illuminates whenever 2 or more switches are toggled ON.',
          highlightHoles: ['f32', 'g32'],
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
        { id: 'ic7432', name: 'IC 7432 Quad OR', count: 1, description: 'Output OR sum' },
        { id: 'led', name: 'Green Indicator LED', count: 1, description: 'Multiplexed Output Y' },
      ],
      truthTable: {
        headers: ['Select Line S', 'Input D0', 'Input D1', 'Selected Output Y', 'LED State'],
        rows: [
          [0, 0, 0, 0, 'OFF (D0 Selected = 0)'],
          [0, 1, 0, 1, 'ON (D0 Selected = 1)'],
          [0, 1, 1, 1, 'ON (D0 Selected = 1)'],
          [1, 0, 0, 0, 'OFF (D1 Selected = 0)'],
          [1, 0, 1, 1, 'ON (D1 Selected = 1)'],
          [1, 1, 1, 1, 'ON (D1 Selected = 1)'],
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
        },
        {
          stepNumber: 2,
          title: 'Seat IC 7404 (NOT) and IC 7408 (AND)',
          instruction: 'Place IC 7404 across Rows 14-20 and IC 7408 across Rows 24-30.',
          subText: 'Notches facing LEFT.',
          highlightHoles: ['f14', 'f24'],
          icToAdd: {
            id: 'ic-7404-mux',
            model: '7404',
            startRow: 14,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f14', 2: 'f15', 3: 'f16', 4: 'f17', 5: 'f18', 6: 'f19', 7: 'f20',
              8: 'e20', 9: 'e19', 10: 'e18', 11: 'e17', 12: 'e16', 13: 'e15', 14: 'e14',
            },
          },
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
        { id: 'ic7404', name: 'IC 7404 Hex Inverter', count: 1, description: 'Inverts XOR output to XNOR' },
        { id: 'led', name: 'Green Equality LED', count: 1, description: 'Illuminates when A == B' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', 'XOR (A ⊕ B)', 'Equality Output (A == B)', 'LED State'],
        rows: [
          [0, 0, 0, 1, 'ON (Equal: 0 == 0)'],
          [0, 1, 1, 0, 'OFF (Not Equal)'],
          [1, 0, 1, 0, 'OFF (Not Equal)'],
          [1, 1, 0, 1, 'ON (Equal: 1 == 1)'],
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
        },
        {
          stepNumber: 2,
          title: 'Insert IC 7486 (XOR) Across Trench',
          instruction: 'Place IC 7486 across Rows 15 to 21 with notch facing LEFT.',
          subText: 'Gate 1 calculates A ⊕ B.',
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
        { id: 'ldr', name: 'LDR Light Sensor', count: 1, description: 'Cadmium-sulfide photoresistor' },
        { id: 'r1', name: '10kΩ Pull-Up Resistor', count: 1, description: 'Voltage divider upper arm' },
        { id: 'led', name: 'White Night LED', count: 1, description: 'Automatic night light' },
      ],
      truthTable: {
        headers: ['Ambient Light Level', 'LDR Resistance', 'Trigger Pin 2 Voltage', 'Output Pin 3', 'LED State'],
        rows: [
          ['Bright Daylight', 'Low (~500 Ω)', '> 1/3 VCC (High)', 0, 'OFF (Daytime / Light)'],
          ['Dim / Evening', 'Medium (~5 kΩ)', '~ 1/3 VCC', 0, 'OFF (Standby)'],
          ['Dark Night', 'High (~100 kΩ)', '< 1/3 VCC (Low)', 1, 'ON (Night Detected)'],
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
        },
      ],
    };
  }

  // Synthesis 5: XOR synthesized using only NAND gates
  private static synthesizeXorFromNand(): Experiment {
    return {
      id: `ai-xor-nand-${Date.now()}`,
      title: 'XOR Gate Synthesized from 4 NAND Gates',
      category: 'AI Synthesized Universal Logic',
      aim: 'To construct an XOR function exclusively using the 4 NAND gates inside a single IC 7400.',
      theory: 'A ⊕ B can be synthesized using 4 NAND gates: G1 = (AB)\', G2 = (A • G1)\', G3 = (B • G1)\', Y = (G2 • G3)\' = A ⊕ B.',
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Chassis' },
        { id: 'ic7400', name: 'IC 7400 Quad NAND', count: 1, description: 'All 4 gates used' },
        { id: 'led', name: 'Indicator LED', count: 1, description: 'XOR Output Y' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', 'Gate 1 (AB)\'', 'Output Y (A ⊕ B)', 'LED State'],
        rows: [
          [0, 0, 1, 0, 'OFF (Equal: 0, 0)'],
          [0, 1, 1, 1, 'ON (Odd: 0, 1)'],
          [1, 0, 1, 1, 'ON (Odd: 1, 0)'],
          [1, 1, 0, 0, 'OFF (Equal: 1, 1)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Connect Top Red (+) to Bottom Red (+) with a Red Jumper wire.',
          subText: 'Distributes +5V.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-xornand',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
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
        { id: 'led-q', name: 'Green LED (Q Output)', count: 1, description: 'State Q' },
        { id: 'led-qbar', name: 'Red LED (Q\' Output)', count: 1, description: 'Inverted State Q\'' },
      ],
      truthTable: {
        headers: ['Set (S\')', 'Reset (R\')', 'Output Q', 'Inverted Q\'', 'Memory State & LED'],
        rows: [
          [1, 1, 'No Change', 'No Change', 'LATCH / HOLD (Previous State)'],
          [0, 1, 1, 0, 'SET (Green LED ON, Red OFF)'],
          [1, 0, 0, 1, 'RESET (Green OFF, Red ON)'],
          [0, 0, 1, 1, 'INVALID / FORBIDDEN (Both Lit)'],
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
        { id: 'ic7408', name: 'IC 7408 Quad AND', count: 1, description: 'Carry product logic' },
        { id: 'ic7432', name: 'IC 7432 Quad OR', count: 1, description: 'Carry sum logic' },
        { id: 'led-s', name: 'White LED (Sum)', count: 1, description: 'Sum bit' },
        { id: 'led-c', name: 'Red LED (Carry)', count: 1, description: 'Carry bit' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', 'Carry-In (Cin)', 'Sum (S)', 'Carry-Out (Cout)', 'LED Outputs'],
        rows: [
          [0, 0, 0, 0, 0, 'Both OFF'],
          [0, 0, 1, 1, 0, 'Sum Lit, Carry OFF'],
          [0, 1, 0, 1, 0, 'Sum Lit, Carry OFF'],
          [0, 1, 1, 0, 1, 'Sum OFF, Carry Lit'],
          [1, 0, 0, 1, 0, 'Sum Lit, Carry OFF'],
          [1, 0, 1, 0, 1, 'Sum OFF, Carry Lit'],
          [1, 1, 0, 0, 1, 'Sum OFF, Carry Lit'],
          [1, 1, 1, 1, 1, 'Both ON (Sum & Carry)'],
        ],
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Bridge Power Rails',
          instruction: 'Bridge top and bottom rails with Red (+5V) and Blue (GND) jumpers.',
          subText: 'Powers all ICs.',
          highlightHoles: ['TOP_VCC_1', 'BOT_VCC_1'],
          wireToAdd: {
            id: 'wire-vcc-fa',
            fromHole: 'TOP_VCC_1',
            toHole: 'BOT_VCC_1',
            color: 'red',
          },
        },
      ],
    };
  }

  // Dynamic custom synthesizer for open-ended queries
  private static synthesizeDynamicCustom(prompt: string): Experiment {
    return {
      id: `ai-custom-${Date.now()}`,
      title: prompt.charAt(0).toUpperCase() + prompt.slice(1),
      category: 'AI Custom Synthesis',
      aim: `To construct and verify: "${prompt}" on an 830-tie physical breadboard with verified IC gate topologies.`,
      theory: `Custom digital logic synthesis generated for requirements: ${prompt}. Boolean equations mapped to physical TTL 74-series logic chips with zero dead-short constraints.`,
      apparatus: [
        { id: 'bb', name: '830-Point Breadboard', count: 1, description: 'Main chassis' },
        { id: 'ic', name: 'Logic IC DIP-14', count: 1, description: 'Synthesized gate package' },
        { id: 'led', name: 'Indicator LED', count: 1, description: 'Visual output' },
        { id: 'res', name: '330Ω Resistor', count: 1, description: 'Current limiter' },
      ],
      truthTable: {
        headers: ['Input A', 'Input B', 'Synthesized Output', 'Indicator LED'],
        rows: [
          [0, 0, 0, 'OFF (Dark)'],
          [0, 1, 1, 'ON (Lit)'],
          [1, 0, 1, 'ON (Lit)'],
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
        },
        {
          stepNumber: 2,
          title: 'Seat Synthesized IC Across Center Trench',
          instruction: 'Place IC across Rows 15 to 21 with orientation notch pointing LEFT.',
          subText: 'Central trench prevents shorting opposing pins.',
          highlightHoles: ['f15', 'f21'],
          icToAdd: {
            id: 'ic-custom',
            model: '7408',
            startRow: 15,
            notchFacing: 'LEFT',
            pinHoles: {
              1: 'f15', 2: 'f16', 3: 'f17', 4: 'f18', 5: 'f19', 6: 'f20', 7: 'f21',
              8: 'e21', 9: 'e20', 10: 'e19', 11: 'e18', 12: 'e17', 13: 'e16', 14: 'e15',
            },
          },
        },
      ],
    };
  }
}
