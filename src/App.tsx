import React from 'react';
import { BreadboardCanvas } from './components/canvas/BreadboardCanvas';
import { RouteBar } from './components/navigation/RouteBar';
import { StepBottomSheet } from './components/navigation/StepBottomSheet';
import { FloatingControls } from './components/navigation/FloatingControls';
import { LogicAnalyzerDock } from './components/instruments/LogicAnalyzerDock';
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

      {/* 3. Floating Controls (Layers, Recenter, Zoom) */}
      <FloatingControls />

      {/* 4. Live Waveform Analyzer & Clock Dock */}
      <LogicAnalyzerDock />

      {/* 5. Turn-by-Turn Guidance Bottom Sheet */}
      <StepBottomSheet />

      {/* 6. YOLO Camera Inspector (When in Scan mode) */}
      {activeMode === 'SCAN_CAMERA' && <CameraScanner />}
    </main>
  );
};

export default App;
