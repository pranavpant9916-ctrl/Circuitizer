import React, { useState, useMemo } from 'react';
import { KMapEngine, KMapData } from '../../engine/kmap';
import { Layers } from 'lucide-react';

interface KMapVisualizerProps {
  headers: string[];
  rows: (string | number)[][];
  currentInputs: Record<string, number>;
  onSelectInputs: (inputs: Record<string, number>) => void;
}

export const KMapVisualizer: React.FC<KMapVisualizerProps> = ({
  headers,
  rows,
  currentInputs,
  onSelectInputs,
}) => {
  const [selectedOutput, setSelectedOutput] = useState<string>('');

  // Compute K-Map data
  const kmap: KMapData | null = useMemo(() => {
    return KMapEngine.generateKMap(headers, rows, selectedOutput || undefined);
  }, [headers, rows, selectedOutput]);

  if (!kmap) {
    return (
      <div className="p-4 bg-[#131d27]/70 border border-[#567C8D]/30 rounded-g2-sm text-center text-xs text-[#C8D9E6]/70 font-serif leading-relaxed">
        K-Map minimization is available for combinational logic circuits with 2 to 4 inputs. Switch to the Truth Table tab to view all state rows.
      </div>
    );
  }

  const activeOutputName = kmap.targetOutputName;

  return (
    <div className="flex flex-col gap-3">
      {/* Output Selector & Dimensions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-[#567C8D]/20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
            Target Output:
          </span>
          <div className="flex items-center gap-1.5">
            {kmap.availableOutputs.map((opt) => {
              const isSelected = opt.clean === activeOutputName || opt.raw === selectedOutput;
              return (
                <button
                  key={opt.raw}
                  type="button"
                  onClick={() => setSelectedOutput(opt.clean)}
                  className={`px-2.5 py-1 rounded-g2-sm text-xs font-mono font-semibold transition border ${
                    isSelected
                      ? 'bg-[#C8D9E6] text-[#131d27] border-[#C8D9E6]'
                      : 'bg-[#2F4156] text-[#C8D9E6] border-[#567C8D]/40 hover:bg-[#3e546e]'
                  }`}
                >
                  {opt.clean}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[10px] font-mono text-[#C8D9E6]/70">
          {kmap.numVars}-Variable Map ({kmap.grid.length}×{kmap.grid[0].length})
        </div>
      </div>

      {/* Minimal SOP Result Banner */}
      <div className="bg-[#131d27] border border-[#567C8D]/35 rounded-g2-sm p-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#C8D9E6]" />
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
            Minimal SOP Form:
          </span>
        </div>
        <div className="text-xs font-mono font-bold text-white bg-[#2F4156] px-3 py-1 rounded border border-[#567C8D]/40">
          {activeOutputName} = {kmap.minimizedSOP}
        </div>
      </div>

      {/* The K-Map Gray-Code Grid */}
      <div className="overflow-x-auto flex justify-center py-2">
        <div className="inline-block border border-[#567C8D]/40 rounded-g2-sm bg-[#131d27] p-3 shadow-inner">
          <table className="border-collapse font-mono text-center select-none">
            <thead>
              {/* Column Variable Header */}
              <tr>
                <th className="p-2 text-[10px] text-[#C8D9E6]/70 border-b border-r border-[#567C8D]/30 font-serif">
                  {kmap.rowVars.join('')} \ {kmap.colVars.join('')}
                </th>
                {kmap.colHeaders.map((colH, idx) => (
                  <th
                    key={idx}
                    className="p-2 text-xs font-semibold text-[#C8D9E6] border-b border-[#567C8D]/30 min-w-[54px]"
                  >
                    {colH}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kmap.grid.map((rowCells, rIdx) => (
                <tr key={rIdx}>
                  {/* Row Variable Header */}
                  <th className="p-2 text-xs font-semibold text-[#C8D9E6] border-r border-[#567C8D]/30">
                    {kmap.rowHeaders[rIdx]}
                  </th>

                  {rowCells.map((cell) => {
                    // Check if current physical switches match this cell
                    const isActive = Object.entries(cell.inputValues).every(
                      ([varName, expectedVal]) => {
                        const cur =
                          currentInputs[varName] ??
                          currentInputs[varName.toLowerCase()] ??
                          currentInputs[`input ${varName.toLowerCase()}`];
                        return cur === expectedVal;
                      }
                    );

                    // Check which groups this cell belongs to
                    const matchingGroups = kmap.groups.filter((g) =>
                      g.cells.some((c) => c.row === cell.row && c.col === cell.col)
                    );

                    const hasGroup = matchingGroups.length > 0;
                    const primaryColor = hasGroup ? matchingGroups[0].color : undefined;

                    return (
                      <td
                        key={cell.col}
                        onClick={() => onSelectInputs(cell.inputValues)}
                        className={`relative p-2.5 border border-[#567C8D]/25 transition cursor-pointer ${
                          isActive
                            ? 'bg-[#2F4156] ring-2 ring-[#C8D9E6] z-10'
                            : 'hover:bg-[#2F4156]/40'
                        }`}
                        title={`Minterm m${cell.minterm} (${cell.binaryString}): Click to set breadboard switches`}
                      >
                        {/* Minterm subscript */}
                        <span className="absolute top-1 left-1.5 text-[8px] text-[#C8D9E6]/50">
                          m{cell.minterm}
                        </span>

                        {/* Cell Value: 1 or 0 */}
                        <div className="flex items-center justify-center pt-2">
                          <span
                            className={`text-sm font-bold transition-transform ${
                              cell.value === 1 ? 'text-white' : 'text-[#567C8D]'
                            }`}
                          >
                            {cell.value}
                          </span>
                        </div>

                        {/* Implicant Group Outline Overlay */}
                        {hasGroup && (
                          <div
                            className="absolute inset-1 rounded pointer-events-none opacity-80"
                            style={{
                              border: `2px solid ${primaryColor}`,
                              backgroundColor: `${primaryColor}15`,
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Groups / Implicants Legend */}
      {kmap.groups.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
            Prime Implicant Groups:
          </span>
          <div className="flex flex-wrap gap-2">
            {kmap.groups.map((grp) => (
              <div
                key={grp.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#131d27] border text-xs font-mono"
                style={{ borderColor: `${grp.color}60` }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: grp.color }}
                />
                <span className="font-bold text-white">{grp.term}</span>
                <span className="text-[10px] text-[#C8D9E6]/60">
                  (m{grp.cells.map((c) => c.minterm).join(', ')})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interaction Instruction */}
      <div className="text-[10px] text-[#C8D9E6]/70 font-serif text-left pt-1">
        Tip: Click any cell to test that input combination on the breadboard switches. Colored rectangles indicate optimal power-of-2 groupings.
      </div>
    </div>
  );
};
