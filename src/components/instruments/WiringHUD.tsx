import React from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { JumperWire } from '../../types/circuit';
import { Cable, RotateCcw, X } from 'lucide-react';

const WIRE_COLORS: { color: JumperWire['color']; hex: string; label: string }[] = [
  { color: 'red', hex: '#ef4444', label: 'Red (VCC)' },
  { color: 'black', hex: '#475569', label: 'Black (GND)' },
  { color: 'blue', hex: '#3b82f6', label: 'Blue' },
  { color: 'yellow', hex: '#eab308', label: 'Yellow' },
  { color: 'green', hex: '#10b981', label: 'Green' },
  { color: 'orange', hex: '#f97316', label: 'Orange' },
  { color: 'white', hex: '#ffffff', label: 'White' },
];

export const WiringHUD: React.FC = () => {
  const {
    isWiringMode,
    toggleWiringMode,
    wiringStartHole,
    setWiringStartHole,
    selectedWireColor,
    setSelectedWireColor,
    circuitState,
    removeWire,
  } = useCircuitStore();

  if (!isWiringMode) return null;

  const handleUndoWire = () => {
    if (circuitState.wires.length > 0) {
      const last = circuitState.wires[circuitState.wires.length - 1];
      removeWire(last.id);
    }
  };

  return (
    <div className="absolute top-20 left-4 z-20 pointer-events-auto flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
      <div className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl p-3 shadow-md flex flex-col gap-2.5 text-[#F5EFEB] min-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#567C8D]/25 pb-2">
          <div className="flex items-center gap-2">
            <Cable className="w-4 h-4 text-[#C8D9E6]" />
            <span className="text-xs font-semibold text-white tracking-tight font-serif">
              Wiring Sandbox Mode
            </span>
          </div>

          <button
            onClick={toggleWiringMode}
            className="w-6 h-6 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] hover:text-white flex items-center justify-center transition border border-[#567C8D]/30"
            title="Exit Wiring Mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* State Guide */}
        <div className="bg-[#131d27] border border-[#567C8D]/30 p-2 rounded-g2-sm text-xs font-serif leading-snug">
          {wiringStartHole ? (
            <div className="flex items-center justify-between text-[#C8D9E6]">
              <span>
                Start: <strong className="font-mono text-white uppercase">{wiringStartHole}</strong>
              </span>
              <button
                onClick={() => setWiringStartHole(null)}
                className="text-[10px] text-rose-300 hover:text-white underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <span className="text-[#C8D9E6]/80">Click 1st hole on breadboard to begin wire.</span>
          )}
        </div>

        {/* Color Palette Selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70">
            Wire Color:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {WIRE_COLORS.map((w) => (
              <button
                key={w.color}
                type="button"
                onClick={() => setSelectedWireColor(w.color)}
                className={`w-6 h-6 rounded-full transition flex items-center justify-center border ${
                  selectedWireColor === w.color
                    ? 'ring-2 ring-white scale-110 shadow-sm'
                    : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: w.hex }}
                title={w.label}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions: Undo & Wire Count */}
        <div className="flex items-center justify-between pt-1 border-t border-[#567C8D]/20 text-[11px] font-mono text-[#C8D9E6]/70">
          <span>{circuitState.wires.length} wire(s)</span>
          <button
            onClick={handleUndoWire}
            disabled={circuitState.wires.length === 0}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo Wire</span>
          </button>
        </div>
      </div>
    </div>
  );
};
