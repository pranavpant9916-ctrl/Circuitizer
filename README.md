# Circuitizer

> **Turn-by-turn physical circuit navigation, live logic simulation, and AI-powered Boolean hardware synthesis on an interactive digital breadboard.**

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## The Problem

In undergraduate electronics, electrical engineering, and computer engineering labs, students spend **70–80% of their lab time debugging simple physical connection mistakes**—inverted IC pinouts, unpowered IC supply pins, bridged power rails, floating inputs, or burnt LEDs.

With a typical lab ratio of **1 teaching assistant for 40 students**, lab sessions stall, equipment gets damaged, and students leave without hands-on mastery of digital logic.

## The Solution

**Circuitizer** acts as an intelligent, in-pocket digital twin and lab assistant using a **"Google Maps for Hardware"** paradigm:

1. **Step-by-Step Circuit Navigation**: Select standard curriculum experiments or enter custom digital logic aims; the platform guides component and jumper wire placement turn-by-turn on a free-moving, interactive breadboard.
2. **Deterministic Discrete Simulation Engine**: Simulates switching logic, gate propagation delays, pull-up/pull-down resistor networks, and synchronized clock timing diagrams live in-browser before or during physical assembly.
3. **AI Hardware Synthesis & Feasibility Verification**: Evaluates lab objectives for electrical feasibility and physical capacity, automatically converting arbitrary Boolean algebraic equations into breadboard layouts with Design Rule Checking (DRC).

---

## Key Features

* **Free-Moving & Zoomable Breadboard Viewport**: Smooth pan, drag, focal wheel zoom, and double-click recentering on standard MB-102 830-tie breadboards ($63\text{ columns} \times 10\text{ rows} + 4\text{ power rails}$), mapping all internal conductive spring clips (`ROW_x_TOP`, `ROW_x_BOT`, `BUS_VCC`, `BUS_GND`).
* **Physics-Accurate Netlist Solver**:
  * **Strict IC Power-Rail Validation**: Enforces physical supply rail connections ($V_{CC}$ and $GND$). Unpowered ICs hold outputs at High-Impedance (`'Z'`), eliminating false "ghost power" logic.
  * **Decoupled Resistor Modeling**: Treats resistors as impedance-limited level injectors rather than $0\Omega$ short circuits, enabling proper pull-up, pull-down, and current-limiting behavior without false dead-short alarms.
  * **Dead-Short Detection**: Flags immediate visual and audible buzzer alerts if $V_{CC}$ ($+5\text{ V}$) and $GND$ ($0\text{ V}$) are directly bridged.
  * **Diode & Indicator Simulation**: Forward-biased LED illumination ($Anode = 1$, $Cathode = 0$) and 7-segment display decoding.
* **Multi-Output Boolean Expression Compiler**:
  * Evaluates single and multi-output systems (e.g. `Sum = A ^ B ^ Cin; Cout = (A*B) + Cin*(A ^ B)`, decoders, full adders) via AST decomposition and parallel truth table generation.
  * Allocates required DIP IC gate slots from real 74xx pin mapping tables and routes separate color-coded indicator LEDs (Green for $Y_1$/Sum, Red for $Y_2$/Cout, Yellow for $Y_3$, Blue for $Y_4$).
  * Compiles complete step-by-step breadboard assembly routes and synchronized multi-channel IEEE 91-1984 logic schematics.
  * Live synchronized multi-output status dock in the formula bar reflecting parallel logic levels in real time.
* **Interactive Karnaugh Map (K-Map) Engine & Visualizer**:
  * Automatically maps truth table outputs into 2, 3, and 4-variable Gray-code matrices ($00, 01, 11, 10$) with full toroidal wrap-around support.
  * Identifies prime implicant groupings (pairs, quads, octets) with color-coded overlay rectangles and computes the minimal Sum-of-Products (SOP) algebraic equation.
  * Interactive minterm cells: click any cell in the K-Map to immediately configure the physical breadboard switches.
* **Purpose-Built Hardware UI (Anti-AI Aesthetics)**:
  * Restrained, tactile industrial workbench interface built with Bookerly serif typography, JetBrains Mono data readouts, and a dark navy/teal hardware color system.
  * Replaces generic floating glassmorphism, glowing gradients, and pill badges with solid instrument deck panels, crisp vector schematics, and clean multimeter HUDs.
* **AI Aim & DRC Evaluator**:
  * Analyzes student objectives against physical constraints and electrical safety standards (e.g., rejecting lethal high-voltage AC mains or impossible multi-GHz architectures).
  * Automatically synthesizes equivalent 5V TTL implementations for verified lab execution.
* **Interactive Multimeter Logic Probe**: Click any breadboard hole in probe mode for immediate voltage readout ($+5.00\text{V}$, $0.00\text{V}$, or Floating High-Z) and connected component inspection.
* **Live Multi-Trace Logic Analyzer**: Real-time multi-channel oscilloscope dock displaying synchronized clock pulses (`0.5 Hz` to `5 Hz`), input switches, and gate output waveforms.
* **Haptic Web Audio Feedback**: Realistic tactile audio feedback for wire insertions, switch toggles, logic level transitions, and short-circuit alarms.
* **Offline-Ready Mobile PWA**: Zero external cloud dependency—runs 100% offline inside campus lab basements.

---

## Supported Components & ICs

| IC / Part | Function | Description |
|---|---|---|
| **SN74LS00N** | Quad 2-Input NAND | 4 universal NAND gates |
| **SN74LS04N** | Hex Inverter | 6 independent NOT gates |
| **SN74LS08N** | Quad 2-Input AND | 4 independent AND gates |
| **SN74LS32N** | Quad 2-Input OR | 4 independent OR gates |
| **SN74LS86N** | Quad 2-Input XOR | 4 independent XOR gates |
| **SN74LS76N** | Dual JK Flip-Flop | Sequential logic with Preset and Clear |
| **NE555** | Precision Timer | Astable/Monostable pulse generation |
| **Passives & I/O** | Resistors, LEDs, SPST Switches, 7-Segment Displays | EIA 4-band color codes, forward-bias indicators, manual toggle inputs |

---

## Project Structure

```
circuitizer/
├── src/
│   ├── components/
│   │   ├── canvas/          # Breadboard canvas (pan/zoom) & Boolean diagram canvas
│   │   ├── instruments/     # Logic analyzer dock & multimeter probe HUD
│   │   └── navigation/      # Route bar, step bottom sheet, AI copilot, Desmos bar
│   ├── engine/
│   │   ├── aiCircuitGenerator.ts  # Dynamic circuit synthesis & layout matrix
│   │   ├── aimEvaluator.ts        # Aim feasibility & hardware safety validator
│   │   ├── audioEngine.ts         # Web Audio API sound synthesis
│   │   ├── booleanCompiler.ts     # Boolean AST parser, truth table & gate allocator
│   │   ├── circuitDRC.ts          # Deterministic Design Rule Checker
│   │   ├── experiments.ts         # Predefined curriculum lab experiments
│   │   ├── grid.ts                # 830-tie breadboard spatial coordinate system
│   │   ├── icRegistry.ts          # Texas Instruments pinouts & gate evaluators
│   │   ├── netlist.ts             # Electrical net solver & logic propagator
│   │   └── reverseExtractor.ts    # Reverse circuit analysis from breadboard state
│   ├── store/
│   │   └── useCircuitStore.ts     # Reactive state management (Zustand)
│   ├── types/                     # TypeScript domain interfaces
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/pranavpant9916-ctrl/Circuitizer.git
cd Circuitizer

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```
