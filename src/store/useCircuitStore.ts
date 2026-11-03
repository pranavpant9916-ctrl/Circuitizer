import { create } from 'zustand';
import { EXPERIMENTS } from '../engine/experiments';
import { defaultGrid } from '../engine/grid';
import { NetlistEngine } from '../engine/netlist';
import {
  CircuitState,
  JumperWire,
  LogicLevel,
  PlacedIC,
  PlacedLED,
  PlacedResistor,
  PlacedSegmentDisplay,
  PlacedSwitch,
} from '../types/circuit';
import { Experiment } from '../types/experiment';
import { ViewportTransform } from '../types/breadboard';

const netlistEngine = new NetlistEngine(defaultGrid);

export interface WaveformPoint {
  time: number;
  clk: 0 | 1;
  inputA: 0 | 1;
  inputB: 0 | 1;
  outY: LogicLevel;
  q0?: 0 | 1;
  q1?: 0 | 1;
}

export interface ProbedNetInfo {
  holeId: string;
  section: string;
  row: number;
  col?: string;
  netId: string;
  connectedHoles: string[];
  logicLevel: LogicLevel;
  voltageText: string;
  connectedComponents: string[];
  isShort: boolean;
}

interface CircuitStoreState {
  // Navigation / Experiment
  experiments: Experiment[];
  activeExpId: string;
  currentStepIndex: number;
  activeHoleId: string | null;

  // Viewport & Layers
  viewport: ViewportTransform;
  layers: {
    realistic: boolean;
    internalTracks: boolean;
    signalTraffic: boolean;
  };
  activeMode: 'GUIDE' | 'SCAN_CAMERA';

  // Interactive Probe Mode
  isProbeMode: boolean;
  probedNet: ProbedNetInfo | null;

  // Physical Circuit State
  circuitState: CircuitState;

  // Simulation State
  isSimRunning: boolean;
  clockHz: number;
  clockValue: 0 | 1;
  simTick: number;
  isDeadShort: boolean;
  waveforms: WaveformPoint[];

  // Actions
  selectExperiment: (id: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  jumpToStep: (stepIndex: number) => void;
  setViewport: (vp: Partial<ViewportTransform>) => void;
  recenterOnHole: (holeId: string) => void;
  toggleLayer: (layer: 'realistic' | 'internalTracks' | 'signalTraffic') => void;
  setMode: (mode: 'GUIDE' | 'SCAN_CAMERA') => void;
  setActiveHole: (holeId: string | null) => void;

  // Circuit actions
  toggleSwitch: (switchId: string) => void;
  toggleSimulation: () => void;
  stepClock: () => void;
  setClockHz: (hz: number) => void;
  runSimTick: () => void;

  // Probe actions
  toggleProbeMode: () => void;
  probeHole: (holeId: string | null) => void;
}

export const useCircuitStore = create<CircuitStoreState>((set, get) => {
  // Build initial circuit state from step 1 of first experiment
  const initialExp = EXPERIMENTS[0];

  const buildCircuitForStep = (exp: Experiment, upToStepIdx: number): CircuitState => {
    const ics: PlacedIC[] = [];
    const wires: JumperWire[] = [];
    const resistors: PlacedResistor[] = [];
    const leds: PlacedLED[] = [];
    const switches: PlacedSwitch[] = [];
    const segmentDisplays: PlacedSegmentDisplay[] = [];

    for (let i = 0; i <= upToStepIdx && i < exp.steps.length; i++) {
      const step = exp.steps[i];
      if (step.icToAdd) ics.push(step.icToAdd);
      if (step.wireToAdd) wires.push(step.wireToAdd);
      if (step.resistorToAdd) resistors.push(step.resistorToAdd);
      if (step.ledToAdd) leds.push(step.ledToAdd);
      if (step.switchToAdd) switches.push(step.switchToAdd);
      if (step.segmentDisplayToAdd) segmentDisplays.push(step.segmentDisplayToAdd);
    }

    return {
      placedICs: ics,
      wires,
      resistors,
      leds,
      switches,
      segmentDisplays,
      clockSignals: {},
    };
  };

  const initialCircuit = buildCircuitForStep(initialExp, 0);

  return {
    experiments: EXPERIMENTS,
    activeExpId: initialExp.id,
    currentStepIndex: 0,
    activeHoleId: null,

    viewport: {
      x: 20,
      y: 100,
      scale: 0.85,
    },

    layers: {
      realistic: true,
      internalTracks: false,
      signalTraffic: true,
    },

    activeMode: 'GUIDE',

    isProbeMode: false,
    probedNet: null,

    circuitState: initialCircuit,

    isSimRunning: false,
    clockHz: 1,
    clockValue: 0,
    simTick: 0,
    isDeadShort: false,
    waveforms: [],

    selectExperiment: (id) => {
      const exp = EXPERIMENTS.find((e) => e.id === id) || EXPERIMENTS[0];
      const newCircuit = buildCircuitForStep(exp, 0);
      set({
        activeExpId: id,
        currentStepIndex: 0,
        circuitState: newCircuit,
        waveforms: [],
      });
      get().runSimTick();
    },

    nextStep: () => {
      const { activeExpId, currentStepIndex } = get();
      const exp = EXPERIMENTS.find((e) => e.id === activeExpId);
      if (!exp || currentStepIndex >= exp.steps.length - 1) return;

      const nextIdx = currentStepIndex + 1;
      const newCircuit = buildCircuitForStep(exp, nextIdx);
      // Keep breadboard stationary - do not auto-pan on step changes
      set({ currentStepIndex: nextIdx, circuitState: newCircuit });
      get().runSimTick();
    },

    prevStep: () => {
      const { activeExpId, currentStepIndex } = get();
      const exp = EXPERIMENTS.find((e) => e.id === activeExpId);
      if (!exp || currentStepIndex <= 0) return;

      const prevIdx = currentStepIndex - 1;
      const newCircuit = buildCircuitForStep(exp, prevIdx);
      // Keep breadboard stationary - do not auto-pan on step changes
      set({ currentStepIndex: prevIdx, circuitState: newCircuit });
      get().runSimTick();
    },

    jumpToStep: (stepIndex) => {
      const { activeExpId } = get();
      const exp = EXPERIMENTS.find((e) => e.id === activeExpId);
      if (!exp) return;
      const validIdx = Math.max(0, Math.min(stepIndex, exp.steps.length - 1));
      const newCircuit = buildCircuitForStep(exp, validIdx);
      set({ currentStepIndex: validIdx, circuitState: newCircuit });
      get().runSimTick();
    },

    setViewport: (vp) => {
      set((state) => ({ viewport: { ...state.viewport, ...vp } }));
    },

    recenterOnHole: (holeId) => {
      const hole = defaultGrid.getHole(holeId);
      if (!hole) return;
      // Center the viewport horizontally around this hole
      const currentScale = get().viewport.scale;
      const screenCenterX = window.innerWidth / 2;
      const targetX = screenCenterX - hole.x * currentScale;
      set((state) => ({
        viewport: {
          ...state.viewport,
          x: targetX,
        },
      }));
    },

    toggleLayer: (layer) => {
      set((state) => ({
        layers: {
          ...state.layers,
          [layer]: !state.layers[layer],
        },
      }));
    },

    setMode: (mode) => set({ activeMode: mode }),

    setActiveHole: (holeId) => set({ activeHoleId: holeId }),

    toggleSwitch: (switchId) => {
      const { circuitState } = get();
      const updatedSwitches = circuitState.switches.map((sw: PlacedSwitch) =>
        sw.id === switchId ? { ...sw, isClosed: !sw.isClosed } : sw
      );
      set({
        circuitState: {
          ...circuitState,
          switches: updatedSwitches,
        },
      });
      get().runSimTick();
    },

    toggleSimulation: () => {
      set((state) => ({ isSimRunning: !state.isSimRunning }));
    },

    setClockHz: (hz) => set({ clockHz: hz }),

    stepClock: () => {
      const nextClk = get().clockValue === 1 ? 0 : 1;
      set((state) => ({
        clockValue: nextClk,
        simTick: state.simTick + 1,
      }));
      get().runSimTick();
    },

    runSimTick: () => {
      const { circuitState, clockValue, simTick, waveforms } = get();

      // Solve circuit
      const result = netlistEngine.solve(circuitState);

      // Extract input switch levels
      const inputAVal: 0 | 1 = circuitState.switches.find((s: PlacedSwitch) => s.id === 'sw-a')?.isClosed ? 1 : 0;
      const inputBVal: 0 | 1 = circuitState.switches.find((s: PlacedSwitch) => s.id === 'sw-b')?.isClosed ? 1 : 0;

      // Extract output Y (from LED or gate output)
      const outNetId = Array.from(result.nets.keys()).find((k) => k.includes('17') || k.includes('26'));
      const outLevel = outNetId ? result.nets.get(outNetId)?.level ?? 0 : 0;

      const newPoint: WaveformPoint = {
        time: simTick,
        clk: clockValue,
        inputA: inputAVal,
        inputB: inputBVal,
        outY: outLevel,
      };

      // Keep last 30 waveform transitions for crisp display
      const updatedWaveforms = [...waveforms, newPoint].slice(-30);

      set({
        isDeadShort: result.isDeadShort,
        waveforms: updatedWaveforms,
      });
    },

    toggleProbeMode: () => {
      const next = !get().isProbeMode;
      set({
        isProbeMode: next,
        probedNet: next ? get().probedNet : null,
      });
    },

    probeHole: (holeId: string | null) => {
      if (!holeId) {
        set({ probedNet: null });
        return;
      }
      const hole = defaultGrid.getHole(holeId);
      if (!hole) return;

      const { circuitState } = get();
      const result = netlistEngine.solve(circuitState);
      const netId = result.holeNetMap.get(holeId) || hole.busId;
      const net = result.nets.get(netId);

      const connectedComponents: string[] = [];
      // Check IC pins
      for (const ic of circuitState.placedICs) {
        for (const [pinStr, hId] of Object.entries(ic.pinHoles)) {
          if (hId === holeId) {
            connectedComponents.push(`IC ${ic.model} Pin ${pinStr}`);
          }
        }
      }
      // Check Resistors
      for (const res of circuitState.resistors) {
        if (res.fromHole === holeId || res.toHole === holeId) {
          connectedComponents.push(`Resistor ${res.valueOhms}Ω`);
        }
      }
      // Check LEDs
      for (const led of circuitState.leds) {
        if (led.anodeHole === holeId) connectedComponents.push('LED Anode (+)');
        if (led.cathodeHole === holeId) connectedComponents.push('LED Cathode (-)');
      }
      // Check Switches
      for (const sw of circuitState.switches) {
        if (sw.holeA === holeId || sw.holeB === holeId) {
          connectedComponents.push(`Switch ${sw.label}`);
        }
      }

      const level = net ? net.level : 'Z';
      const isShort = net ? net.isShortCircuit : false;
      const voltageText = isShort
        ? '0.00 V (DEAD SHORT)'
        : level === 1
        ? '+5.00 V (HIGH)'
        : level === 0
        ? '0.00 V (GND)'
        : 'Floating (High-Z)';

      const probed: ProbedNetInfo = {
        holeId,
        section: hole.section,
        row: hole.row,
        col: hole.col,
        netId,
        connectedHoles: net ? Array.from(net.holes) : [holeId],
        logicLevel: level,
        voltageText,
        connectedComponents,
        isShort,
      };

      set({ probedNet: probed });
    },
  };
});
