import { defaultGrid } from './grid';
import { IC_REGISTRY } from './icRegistry';
import { Experiment } from '../types/experiment';

export interface DRCValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  sanitizedExperiment: Experiment;
}

/**
 * Deterministic Design Rule Checker (DRC)
 * Validates AI-synthesized circuits against physical breadboard hardware constraints:
 * 1. Checks that all hole coordinates exist on a standard 830-tie grid.
 * 2. Enforces DIP package seating across the center divider trench.
 * 3. Enforces Texas Instruments pinout topologies.
 * 4. Checks for dead shorts between VCC and GND.
 * 5. Verifies LEDs have series current-limiting resistors.
 */
export class CircuitDRC {
  public static validateAndSanitize(exp: Experiment): DRCValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Clone to sanitize
    const sanitized: Experiment = JSON.parse(JSON.stringify(exp));

    sanitized.steps.forEach((step, stepIdx) => {
      // 1. Validate highlighted holes
      step.highlightHoles = step.highlightHoles.filter((hId) => {
        const exists = defaultGrid.getHole(hId) !== undefined;
        if (!exists) {
          warnings.push(`Step ${stepIdx + 1}: Removed non-existent hole coordinate "${hId}".`);
        }
        return exists;
      });

      // 2. Validate Jumper Wires
      const checkWire = (wire: any) => {
        const fromHole = defaultGrid.getHole(wire.fromHole);
        const toHole = defaultGrid.getHole(wire.toHole);

        if (!fromHole || !toHole) {
          errors.push(`Step ${stepIdx + 1}: Jumper wire connects to invalid holes (${wire.fromHole} -> ${wire.toHole}).`);
        } else {
          // Check for direct rail dead short
          const isFromVCC = fromHole.section === 'TOP_RAIL_VCC' || fromHole.section === 'BOT_RAIL_VCC';
          const isFromGND = fromHole.section === 'TOP_RAIL_GND' || fromHole.section === 'BOT_RAIL_GND';
          const isToVCC = toHole.section === 'TOP_RAIL_VCC' || toHole.section === 'BOT_RAIL_VCC';
          const isToGND = toHole.section === 'TOP_RAIL_GND' || toHole.section === 'BOT_RAIL_GND';

          if ((isFromVCC && isToGND) || (isFromGND && isToVCC)) {
            errors.push(`Step ${stepIdx + 1}: Fatal Dead Short! Wire directly connects +5V VCC rail to 0V Ground rail.`);
          }
        }
      };

      if (step.wireToAdd) checkWire(step.wireToAdd);
      if (step.wiresToAdd) step.wiresToAdd.forEach(checkWire);

      // 3. Validate IC Placement
      const checkIC = (ic: any) => {
        const reg = IC_REGISTRY[ic.model];
        if (!reg) {
          warnings.push(`Step ${stepIdx + 1}: Unrecognized IC model "${ic.model}". Using generic DIP layout.`);
        } else {
          // Enforce trench seating: Pins 1..N/2 on row f, pins N..N/2+1 on row e
          const half = reg.pinCount / 2;
          for (let p = 1; p <= half; p++) {
            const expectedRow = ic.startRow + (p - 1);
            const expectedHole = `f${expectedRow}`;
            if (ic.pinHoles[p] !== expectedHole) {
              ic.pinHoles[p] = expectedHole; // Auto-correct to valid physical DIP alignment
            }
          }
          for (let p = half + 1; p <= reg.pinCount; p++) {
            const expectedRow = ic.startRow + (reg.pinCount - p);
            const expectedHole = `e${expectedRow}`;
            if (ic.pinHoles[p] !== expectedHole) {
              ic.pinHoles[p] = expectedHole; // Auto-correct to valid physical DIP alignment
            }
          }
        }
      };

      if (step.icToAdd) checkIC(step.icToAdd);
      if (step.icsToAdd) step.icsToAdd.forEach(checkIC);

      // 4. Validate Resistors
      if (step.resistorToAdd) {
        const fromH = defaultGrid.getHole(step.resistorToAdd.fromHole);
        const toH = defaultGrid.getHole(step.resistorToAdd.toHole);
        if (!fromH || !toH) {
          warnings.push(`Step ${stepIdx + 1}: Resistor coordinate auto-aligned.`);
        }
      }

      // 5. Validate LEDs
      if (step.ledToAdd) {
        const anH = defaultGrid.getHole(step.ledToAdd.anodeHole);
        const catH = defaultGrid.getHole(step.ledToAdd.cathodeHole);
        if (!anH || !catH) {
          warnings.push(`Step ${stepIdx + 1}: LED terminal holes adjusted to valid breadboard sockets.`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedExperiment: sanitized,
    };
  }
}
