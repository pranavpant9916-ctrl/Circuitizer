# Circuitizer

> **Turn-by-turn physical circuit navigation, live logic simulation, and computer vision verification in one mobile platform.**

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The Problem

In undergraduate electronics, electrical, and embedded hardware labs, students spend **70–80% of their lab time debugging simple physical connection mistakes**—inverted IC pinouts, shorted power rails, loose ground jumpers, or burnt current-limiting resistors.

With a typical ratio of **1 teaching assistant for 40 students**, labs stall, equipment gets damaged, and students leave without understanding digital logic.

## The Solution

**Circuitizer** acts as an intelligent, in-pocket lab assistant using a **"Google Maps for Hardware"** paradigm:

1. **Step-by-Step Circuit Navigation**: Select an experiment and available apparatus; the app guides component and wire placement turn-by-turn on an interactive, stationary breadboard map.
2. **Deterministic Discrete Simulation**: Test circuit switching, logic gates, and clock timing diagrams live in-browser before or during physical assembly.
3. **Computer Vision Verification (YOLO)**: Capture a top-down smartphone photo of the physical breadboard to detect inverted ICs, misaligned holes, and shorted rails against the expected netlist.

---

## Key Features

* **Mathematical Breadboard Spatial Model**: Millimeter-accurate representation of standard MB-102 830-tie breadboards ($63\text{ columns} \times 10\text{ rows} + 4\text{ power rails}$), mapping all internal conductive spring clips (`ROW_x_TOP`, `ROW_x_BOT`, `BUS_VCC`, `BUS_GND`).
* **Zero-Hallucination Logic Engine**: Unlike generative AI chatbots that hallucinate non-existent pin numbers, Circuitizer uses exact Texas Instruments datasheet topologies and graph-based netlist extraction (Disjoint Set Union).
* **Electrical Safety Rules**:
  * **Dead-Short Detection**: Flags immediate warnings if VCC ($+5\text{ V}$) and GND ($0\text{ V}$) rails are bridged.
  * **Floating Gate Warnings**: Warns when TTL inputs are left unconnected.
  * **Current Limiting Verification**: Enforces resistors in series with LEDs.
* **Live Multi-Trace Waveform Analyzer**: Real-time oscilloscope/analyzer dock rendering synchronized clock cycles (`0.5 Hz` to `5 Hz`), input switches, and gate output waveforms.
* **Obsidian Monochrome UI**: Designed for clean focus with Bookerly serif typography, G2 continuous curvature, and zero distracting emojis.
* **Offline-Ready Mobile PWA**: Sub-90 KB gzipped client footprint that runs seamlessly inside campus lab basements with poor cellular reception.

---

## Supported Components & ICs

| IC / Part | Function | Description |
|---|---|---|
| **SN74LS04N** | Hex Inverter | 6 independent NOT gates |
| **SN74LS08N** | Quad 2-Input AND | 4 independent AND gates |
| **SN74LS32N** | Quad 2-Input OR | 4 independent OR gates |
| **SN74LS86N** | Quad 2-Input XOR | 4 independent XOR gates |
| **SN74LS76N** | Dual JK Flip-Flop | Negative edge-triggered sequential logic with Preset and Clear |
| **Passives & Inputs** | Resistors, LEDs, SPST Switches | 4-band EIA color codes, forward-bias LED glow, manual toggle switches |

---

## Project Structure

```
circuitizer/
├── src/
│   ├── components/
│   │   ├── camera/          # Smartphone camera capture & YOLO inspection
│   │   ├── canvas/          # 60 FPS HTML5 2D breadboard canvas renderer
│   │   ├── instruments/     # Multi-trace logic analyzer & clock controls
│   │   └── navigation/      # Route bar, apparatus inventory & step bottom sheet
│   ├── engine/
│   │   ├── experiments.ts   # Verified lab experiment definitions & truth tables
│   │   ├── grid.ts          # 830-tie mathematical coordinate system
│   │   ├── icRegistry.ts    # Official Texas Instruments IC pinouts & gate logic
│   │   └── netlist.ts       # Union-Find electrical netlist & simulation solver
│   ├── store/
│   │   └── useCircuitStore.ts # Central reactive Zustand state
│   ├── types/               # Strict TypeScript domain interfaces
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

Open [http://localhost:5173](http://localhost:5173) in your browser. To test on a mobile device on the same local network, use the network URL displayed in the terminal.

### Production Build

```bash
npm run build
npm run preview
```

---

## Roadmap

- [x] **Phase 1**: Mobile foundation, stationary 830-point canvas, obsidian design system, and core discrete simulation engine.
- [ ] **Phase 2**: Component expansion (IC 7400 NAND, IC 7402 NOR, NE555 Timer, and 7-Segment Display).
- [ ] **Phase 3**: Floating interactive Multimeter / Logic Probe mode.
- [ ] **Phase 4**: 1-click printable PDF Lab Record and Viva-Voce question generator.
- [ ] **Phase 5**: Free-form sandbox wiring editor.
- [ ] **Phase 6**: On-device client-side YOLOv8 inference with ONNX Runtime Web.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
