import React from 'react';
import { BreadboardCanvas } from './components/canvas/BreadboardCanvas';
import { RouteBar } from './components/navigation/RouteBar';
import { StepBottomSheet } from './components/navigation/StepBottomSheet';
import { FloatingControls } from './components/navigation/FloatingControls';
import { LogicAnalyzerDock } from './components/instruments/LogicAnalyzerDock';
import { ProbeHUD } from './components/instruments/ProbeHUD';
import { CameraScanner } from './components/camera/CameraScanner';
import { useCircuitStore } from './store/useCircuitStore';

export const App: React.FC = () => {
  const { activeMode } = useCircuitStore();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-serif antialiased select-none">
      {/* 1. Spatial Breadboard Map Canvas */}
      <BreadboardCanvas />

      {/* 2. Top Navigation Bar */}
      <RouteBar />

      {/* 3. Floating Controls (Layers, Recenter, Zoom, Probe) */}
      <FloatingControls />

      {/* 4. Interactive Multimeter & Logic Probe HUD */}
      <ProbeHUD />

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
