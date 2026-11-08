import React from 'react';
import { BreadboardCanvas } from './components/canvas/BreadboardCanvas';
import { BooleanDiagramCanvas } from './components/canvas/BooleanDiagramCanvas';
import { RouteBar } from './components/navigation/RouteBar';
import { StepBottomSheet } from './components/navigation/StepBottomSheet';
import { FloatingControls } from './components/navigation/FloatingControls';
import { LogicAnalyzerDock } from './components/instruments/LogicAnalyzerDock';
import { ProbeHUD } from './components/instruments/ProbeHUD';
import { CameraScanner } from './components/camera/CameraScanner';
import { useCircuitStore } from './store/useCircuitStore';

export const App: React.FC = () => {
  const { activeMode, viewMode } = useCircuitStore();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#131d27] font-serif antialiased select-none">
      {/* 1. Spatial Breadboard Map Canvas OR Single-Toggle Boolean Logic Diagram */}
      {viewMode === 'BREADBOARD' ? <BreadboardCanvas /> : <BooleanDiagramCanvas />}

      {/* 2. Top Navigation Bar */}
      <RouteBar />

      {/* 3. Floating Controls (Layers, Recenter, Zoom, Probe - Breadboard Mode) */}
      {viewMode === 'BREADBOARD' && <FloatingControls />}

      {/* 4. Interactive Multimeter & Logic Probe HUD */}
      {viewMode === 'BREADBOARD' && <ProbeHUD />}

      {/* 5. Live Waveform Analyzer & Clock Dock */}
      <LogicAnalyzerDock />

      {/* 6. Turn-by-Turn Guidance Bottom Sheet */}
      <StepBottomSheet />

      {/* 7. YOLO Camera Inspector (When in Scan mode) */}
      {activeMode === 'SCAN_CAMERA' && <CameraScanner />}
    </main>
  );
};

export default App;
