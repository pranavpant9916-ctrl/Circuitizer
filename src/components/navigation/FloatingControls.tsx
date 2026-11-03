import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { Eye, Layers, LocateFixed, Minus, Plus, Zap } from 'lucide-react';

export const FloatingControls: React.FC = () => {
  const {
    viewport,
    setViewport,
    layers,
    toggleLayer,
  } = useCircuitStore();

  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const handleRecenter = () => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    let scale: number;
    let targetX: number;
    let targetY: number;

    if (screenW < 640) {
      scale = Math.min((screenW - 24) / 720, 0.65);
      targetX = (screenW - 740 * scale) / 2 + 10;
      targetY = 88;
    } else {
      scale = Math.min((screenW - 80) / 1440, (screenH - 340) / 460);
      scale = Math.max(0.5, Math.min(0.85, scale));
      targetX = (screenW - 1440 * scale) / 2;
      targetY = Math.max(88, (screenH - 320 - 440 * scale) / 2 + 65);
    }
    setViewport({ x: targetX, y: targetY, scale });
  };

  const handleZoom = (factor: number) => {
    const newScale = Math.max(0.4, Math.min(3.5, viewport.scale * factor));
    setViewport({ scale: newScale });
  };

  return (
    <div className="absolute right-4 top-20 z-30 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Layers Menu Popover */}
      {showLayerMenu && (
        <div className="bg-[#0d0f14]/95 backdrop-blur-xl border border-white/10 p-3 rounded-g2 shadow-2xl flex flex-col gap-2 min-w-[180px] animate-in fade-in slide-in-from-right-2">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-obsidian-400 px-1">
            Visual Layers
          </div>

          <button
            onClick={() => toggleLayer('realistic')}
            className={`flex items-center justify-between p-2 rounded-g2-sm text-xs font-medium transition ${
              layers.realistic
                ? 'bg-white text-black font-semibold'
                : 'text-obsidian-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              Components
            </span>
            <span className="text-[10px] uppercase font-mono">{layers.realistic ? 'On' : 'Off'}</span>
          </button>

          <button
            onClick={() => toggleLayer('internalTracks')}
            className={`flex items-center justify-between p-2 rounded-g2-sm text-xs font-medium transition ${
              layers.internalTracks
                ? 'bg-white text-black font-semibold'
                : 'text-obsidian-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Internal Clips
            </span>
            <span className="text-[10px] uppercase font-mono">{layers.internalTracks ? 'On' : 'Off'}</span>
          </button>

          <button
            onClick={() => toggleLayer('signalTraffic')}
            className={`flex items-center justify-between p-2 rounded-g2-sm text-xs font-medium transition ${
              layers.signalTraffic
                ? 'bg-white text-black font-semibold'
                : 'text-obsidian-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Signal Flow
            </span>
            <span className="text-[10px] uppercase font-mono">{layers.signalTraffic ? 'On' : 'Off'}</span>
          </button>
        </div>
      )}

      {/* Floating Action Button Pill */}
      <div className="flex flex-col gap-1.5 bg-[#0d0f14]/85 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl">
        {/* Toggle Layers */}
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
            showLayerMenu ? 'bg-white text-black' : 'text-obsidian-300 hover:bg-white/10 hover:text-white'
          }`}
          title="Layers"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Recenter */}
        <button
          onClick={handleRecenter}
          className="w-9 h-9 rounded-full flex items-center justify-center text-obsidian-300 hover:bg-white/10 hover:text-white transition"
          title="Recenter"
        >
          <LocateFixed className="w-4 h-4" />
        </button>

        <div className="h-px bg-white/10 mx-1 my-0.5" />

        {/* Zoom In */}
        <button
          onClick={() => handleZoom(1.2)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-obsidian-300 hover:bg-white/10 hover:text-white transition"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleZoom(0.8)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-obsidian-300 hover:bg-white/10 hover:text-white transition"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
