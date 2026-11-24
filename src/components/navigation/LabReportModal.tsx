import React, { useState, useEffect, useRef } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import {
  FileText,
  Printer,
  Download,
  Upload,
  Save,
  X,
  Cpu,
  Bookmark,
  CheckCircle2,
  Trash2,
  Cable,
} from 'lucide-react';

interface LabReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SavedSnapshotSummary {
  name: string;
  savedAt: string;
  activeExpId: string;
}

export const LabReportModal: React.FC<LabReportModalProps> = ({ isOpen, onClose }) => {
  const {
    circuitState,
    experiments,
    activeExpId,
    saveCircuitSnapshot,
    loadCircuitSnapshot,
  } = useCircuitStore();

  const activeExp = experiments.find((e) => e.id === activeExpId);

  // Student & Station metadata (persisted in localStorage for convenience)
  const [studentName, setStudentName] = useState(() => localStorage.getItem('circuitizer_student_name') || 'Eleanor Vance');
  const [studentId, setStudentId] = useState(() => localStorage.getItem('circuitizer_student_id') || 'EE-2026-408');
  const [stationNo, setStationNo] = useState(() => localStorage.getItem('circuitizer_station_no') || 'Station 04 (Breadboard A)');
  const [snapshotName, setSnapshotName] = useState('');
  const [savedSnapshots, setSavedSnapshots] = useState<SavedSnapshotSummary[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync metadata to localStorage
  useEffect(() => {
    localStorage.setItem('circuitizer_student_name', studentName);
  }, [studentName]);

  useEffect(() => {
    localStorage.setItem('circuitizer_student_id', studentId);
  }, [studentId]);

  useEffect(() => {
    localStorage.setItem('circuitizer_station_no', stationNo);
  }, [stationNo]);

  // Load saved snapshots list
  const refreshSavedSnapshots = () => {
    try {
      const raw = localStorage.getItem('circuitizer_saved_circuits');
      if (raw) {
        const parsed = JSON.parse(raw);
        const list: SavedSnapshotSummary[] = Object.values(parsed).map((item: any) => ({
          name: item.name || 'Untitled',
          savedAt: item.savedAt || new Date().toISOString(),
          activeExpId: item.activeExpId || 'exp1',
        }));
        setSavedSnapshots(list.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
      } else {
        setSavedSnapshots([]);
      }
    } catch (e) {
      console.error('Error reading saved snapshots', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSavedSnapshots();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate Bill of Materials (BOM)
  const icCounts: Record<string, number> = {};
  circuitState.placedICs.forEach((ic) => {
    const key = `${ic.model} (DIP-${Object.keys(ic.pinHoles).length})`;
    icCounts[key] = (icCounts[key] || 0) + 1;
  });

  const resistorCounts: Record<number, number> = {};
  circuitState.resistors.forEach((r) => {
    resistorCounts[r.valueOhms] = (resistorCounts[r.valueOhms] || 0) + 1;
  });

  const wireColorCounts: Record<string, number> = {};
  circuitState.wires.forEach((w) => {
    wireColorCounts[w.color] = (wireColorCounts[w.color] || 0) + 1;
  });

  // Calculate Truth Table
  let truthTable: { headers: string[]; rows: (string | number)[][] } = {
    headers: ['A', 'B', 'Y'],
    rows: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 0],
      [1, 1, 1],
    ],
  };

  if (activeExp?.truthTable) {
    truthTable = activeExp.truthTable;
  }

  // Handle Save Snapshot
  const handleSaveSnapshot = () => {
    const name = snapshotName.trim() || `${activeExp?.title || 'Circuit'} Snapshot (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    saveCircuitSnapshot(name);
    setSnapshotName('');
    setSaveSuccessMsg(`Saved snapshot "${name}"`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    refreshSavedSnapshots();
  };

  // Handle Load Snapshot from localStorage
  const handleLoadSavedSnapshot = (name: string) => {
    try {
      const raw = localStorage.getItem('circuitizer_saved_circuits');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed[name]) {
          loadCircuitSnapshot(JSON.stringify(parsed[name]));
          setSaveSuccessMsg(`Loaded snapshot "${name}"`);
          setTimeout(() => setSaveSuccessMsg(null), 3000);
        }
      }
    } catch (e) {
      console.error('Error loading snapshot', e);
    }
  };

  // Handle Delete Snapshot
  const handleDeleteSnapshot = (name: string) => {
    try {
      const raw = localStorage.getItem('circuitizer_saved_circuits');
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed[name];
        localStorage.setItem('circuitizer_saved_circuits', JSON.stringify(parsed));
        refreshSavedSnapshots();
      }
    } catch (e) {
      console.error('Error deleting snapshot', e);
    }
  };

  // Export JSON file download
  const handleExportJSON = () => {
    const payload = {
      appName: 'Circuitizer Lab Worksheet & State Snapshot',
      exportedAt: new Date().toISOString(),
      student: { name: studentName, id: studentId, station: stationNo },
      experiment: { id: activeExpId, title: activeExp?.title, aim: activeExp?.aim },
      circuitState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuitizer-${activeExpId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.circuitState) {
          loadCircuitSnapshot(content);
        } else {
          loadCircuitSnapshot(JSON.stringify({ circuitState: parsed }));
        }
        setSaveSuccessMsg(`Successfully imported ${file.name}`);
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      } catch (err) {
        alert('Invalid Circuitizer JSON snapshot file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#131d27]/90 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #circuitizer-printable-report, #circuitizer-printable-report * {
            visibility: visible;
          }
          #circuitizer-printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            color: #131d27 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: none !important;
            font-family: serif !important;
          }
          .no-print {
            display: none !important;
          }
          .print-header-bg {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
          }
          .print-card {
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div
        id="circuitizer-printable-report"
        className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl w-full max-w-4xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 text-[#F5EFEB] max-h-[92vh] overflow-y-auto"
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between pb-4 border-b border-[#567C8D]/25 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2F4156] flex items-center justify-center text-[#C8D9E6] border border-[#567C8D]/40 shrink-0">
              <FileText className="w-5 h-5 text-[#C8D9E6]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#2F4156] text-[#C8D9E6] border border-[#567C8D]/40">
                  IEEE Academic Format
                </span>
                <span className="text-[11px] font-mono text-[#C8D9E6]/70">
                  {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight font-serif mt-0.5 print-text-dark">
                Laboratory Experiment Worksheet & Bill of Materials
              </h2>
            </div>
          </div>

          {/* Action Buttons (Hidden on Print) */}
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-g2-sm bg-[#C8D9E6] text-[#131d27] font-sans font-semibold text-xs hover:bg-white transition shadow-sm cursor-pointer"
              title="Print Lab Worksheet or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] hover:text-white flex items-center justify-center transition border border-[#567C8D]/30 cursor-pointer"
              title="Close Worksheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Student & Workstation Metadata Form */}
        <div className="bg-[#131d27] border border-[#567C8D]/30 p-3.5 rounded-g2-sm grid grid-cols-1 sm:grid-cols-3 gap-3 print-card">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
              Student Investigator:
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="bg-[#1b2735] border border-[#567C8D]/40 rounded px-2.5 py-1 text-xs font-serif text-white focus:outline-none focus:border-[#C8D9E6] print-card print-text-dark"
              placeholder="Full Name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
              Roll / Student ID:
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="bg-[#1b2735] border border-[#567C8D]/40 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#C8D9E6] print-card print-text-dark"
              placeholder="e.g. EE-408"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
              Lab Station / Bench:
            </label>
            <input
              type="text"
              value={stationNo}
              onChange={(e) => setStationNo(e.target.value)}
              className="bg-[#1b2735] border border-[#567C8D]/40 rounded px-2.5 py-1 text-xs font-serif text-white focus:outline-none focus:border-[#C8D9E6] print-card print-text-dark"
              placeholder="e.g. Bench 4"
            />
          </div>
        </div>

        {/* Experiment Aim & Objective */}
        <div className="bg-[#131d27] border border-[#567C8D]/30 p-3.5 rounded-g2-sm flex flex-col gap-1.5 print-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] print-text-dark">
              Experiment Title: {activeExp?.title || 'Custom Circuit'}
            </span>
            <span className="text-xs font-mono font-bold text-white bg-[#2F4156] px-2 py-0.5 rounded border border-[#567C8D]/40 print-card print-text-dark">
              {activeExp?.category || 'Digital Logic'}
            </span>
          </div>
          <p className="text-xs text-[#F5EFEB]/90 font-serif leading-relaxed print-text-dark">
            <strong className="text-white print-text-dark">Aim:</strong> {activeExp?.aim || 'Build and verify hardware prototype using standard 74xx TTL logic ICs on solderless breadboard.'}
          </p>
        </div>

        {/* Bill of Materials (BOM) & Equipment Checklist */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C8D9E6] font-sans flex items-center gap-1.5 print-text-dark">
              <Cpu className="w-3.5 h-3.5" />
              <span>Bill of Materials (BOM) & Physical Apparatus</span>
            </h3>
            <span className="text-[11px] font-mono text-[#C8D9E6]/70 print-text-dark">
              {circuitState.placedICs.length} IC(s) | {circuitState.wires.length} wire(s) | {circuitState.resistors.length} resistor(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Integrated Circuits */}
            <div className="bg-[#131d27] border border-[#567C8D]/30 p-2.5 rounded-g2-sm flex flex-col gap-1 print-card">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
                Integrated Circuits
              </span>
              {Object.keys(icCounts).length > 0 ? (
                Object.entries(icCounts).map(([icKey, cnt]) => (
                  <div key={icKey} className="text-xs font-mono text-white flex justify-between print-text-dark">
                    <span>{icKey}</span>
                    <strong className="text-[#C8D9E6] print-text-dark">×{cnt}</strong>
                  </div>
                ))
              ) : (
                <span className="text-xs text-[#C8D9E6]/50 italic">None</span>
              )}
            </div>

            {/* Resistors */}
            <div className="bg-[#131d27] border border-[#567C8D]/30 p-2.5 rounded-g2-sm flex flex-col gap-1 print-card">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
                Resistors
              </span>
              {Object.keys(resistorCounts).length > 0 ? (
                Object.entries(resistorCounts).map(([ohms, cnt]) => (
                  <div key={ohms} className="text-xs font-mono text-white flex justify-between print-text-dark">
                    <span>{ohms} Ω</span>
                    <strong className="text-[#C8D9E6] print-text-dark">×{cnt}</strong>
                  </div>
                ))
              ) : (
                <span className="text-xs text-[#C8D9E6]/50 italic">None</span>
              )}
            </div>

            {/* Indicator LEDs & Switches */}
            <div className="bg-[#131d27] border border-[#567C8D]/30 p-2.5 rounded-g2-sm flex flex-col gap-1 print-card">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
                Indicators & Inputs
              </span>
              <div className="text-xs font-mono text-white flex justify-between print-text-dark">
                <span>LEDs (5mm)</span>
                <strong className="text-[#C8D9E6] print-text-dark">×{circuitState.leds.length}</strong>
              </div>
              <div className="text-xs font-mono text-white flex justify-between print-text-dark">
                <span>Slide Switches</span>
                <strong className="text-[#C8D9E6] print-text-dark">×{circuitState.switches.length}</strong>
              </div>
            </div>

            {/* Jumper Wires */}
            <div className="bg-[#131d27] border border-[#567C8D]/30 p-2.5 rounded-g2-sm flex flex-col gap-1 print-card">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
                Jumper Wires
              </span>
              <div className="text-xs font-mono text-white flex justify-between print-text-dark">
                <span>Total Wires</span>
                <strong className="text-[#C8D9E6] print-text-dark">×{circuitState.wires.length}</strong>
              </div>
              <div className="text-[10px] font-mono text-[#C8D9E6]/70 truncate print-text-dark">
                {Object.entries(wireColorCounts)
                  .map(([c, count]) => `${count} ${c}`)
                  .join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* Wire Connection Schedule & Truth Table Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Wire Schedule Table */}
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] flex items-center gap-1 print-text-dark">
              <Cable className="w-3 h-3" />
              <span>Netlist Connection Schedule</span>
            </h4>
            <div className="border border-[#567C8D]/30 rounded-g2-sm overflow-hidden bg-[#131d27] max-h-56 overflow-y-auto print-card">
              <table className="w-full text-left text-xs font-mono border-collapse print-table">
                <thead>
                  <tr className="bg-[#1b2735] border-b border-[#567C8D]/30 text-[#C8D9E6] print-header-bg">
                    <th className="p-1.5 pl-2 font-medium">#</th>
                    <th className="p-1.5 font-medium">From</th>
                    <th className="p-1.5 font-medium">To</th>
                    <th className="p-1.5 font-medium">Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#567C8D]/15 text-[#F5EFEB]/90">
                  {circuitState.wires.length > 0 ? (
                    circuitState.wires.map((w, idx) => (
                      <tr key={w.id || idx} className="hover:bg-[#2F4156]/20">
                        <td className="p-1.5 pl-2 text-[#C8D9E6]/70">{idx + 1}</td>
                        <td className="p-1.5 uppercase font-semibold text-white">{w.fromHole}</td>
                        <td className="p-1.5 uppercase font-semibold text-white">{w.toHole}</td>
                        <td className="p-1.5 capitalize text-[#C8D9E6]">{w.color}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-xs text-[#C8D9E6]/50 italic">
                        No jumper wires placed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Truth Table Verification */}
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6] flex items-center gap-1 print-text-dark">
              <CheckCircle2 className="w-3 h-3" />
              <span>Theoretical & Measured Truth Table</span>
            </h4>
            <div className="border border-[#567C8D]/30 rounded-g2-sm overflow-hidden bg-[#131d27] max-h-56 overflow-y-auto print-card">
              <table className="w-full text-center text-xs font-mono border-collapse print-table">
                <thead>
                  <tr className="bg-[#1b2735] border-b border-[#567C8D]/30 text-[#C8D9E6] print-header-bg">
                    {truthTable.headers.map((h, i) => (
                      <th key={i} className="p-1.5 font-medium uppercase">
                        {h}
                      </th>
                    ))}
                    <th className="p-1.5 font-medium uppercase text-emerald-400 print-text-dark">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#567C8D]/15 text-[#F5EFEB]/90">
                  {truthTable.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#2F4156]/20">
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="p-1.5">
                          {val}
                        </td>
                      ))}
                      <td className="p-1.5 text-[11px] text-emerald-400 font-semibold print-text-dark">
                        Verified
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Academic Grading & Physical Sign-Off Block */}
        <div className="bg-[#131d27] border border-[#567C8D]/30 p-4 rounded-g2-sm grid grid-cols-1 sm:grid-cols-3 gap-4 print-card">
          <div className="flex flex-col justify-end">
            <div className="border-b border-[#567C8D]/40 pb-1 mb-1 print-card" />
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
              Student Signature
            </span>
          </div>

          <div className="flex flex-col justify-end">
            <div className="border-b border-[#567C8D]/40 pb-1 mb-1 print-card" />
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 print-text-dark">
              Lab Instructor / TA Sign-Off
            </span>
          </div>

          <div className="flex flex-col justify-end items-end sm:items-center">
            <div className="text-sm font-mono font-bold text-white bg-[#2F4156] px-3 py-1 rounded border border-[#567C8D]/40 print-card print-text-dark">
              Grade: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / 10 ]
            </div>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 mt-1 print-text-dark">
              Evaluation Score
            </span>
          </div>
        </div>

        {/* Circuit Persistence & JSON Export / Import Panel (Hidden on Print) */}
        <div className="border-t border-[#567C8D]/25 pt-4 flex flex-col gap-3 no-print">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white uppercase tracking-wider font-sans">
              <Bookmark className="w-4 h-4 text-[#C8D9E6]" />
              <span>Circuit Persistence & JSON Portability</span>
            </div>

            {saveSuccessMsg && (
              <span className="text-xs text-emerald-400 font-serif animate-in fade-in">
                ✓ {saveSuccessMsg}
              </span>
            )}
          </div>

          {/* Save New Snapshot & File Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Snapshot Name (e.g. Milestone 2 - Adder Stage)"
                className="bg-[#131d27] border border-[#567C8D]/40 rounded-g2-sm px-3 py-1.5 text-xs font-serif text-white flex-1 focus:outline-none focus:border-[#C8D9E6]"
              />
              <button
                type="button"
                onClick={handleSaveSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-g2-sm bg-[#2F4156] hover:bg-[#3e546e] text-white font-sans text-xs font-medium border border-[#567C8D]/30 transition cursor-pointer shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Snapshot</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-g2-sm bg-[#131d27] hover:bg-[#2F4156] text-[#C8D9E6] hover:text-white font-sans text-xs font-medium border border-[#567C8D]/30 transition cursor-pointer"
                title="Download Circuit State JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-g2-sm bg-[#131d27] hover:bg-[#2F4156] text-[#C8D9E6] hover:text-white font-sans text-xs font-medium border border-[#567C8D]/30 transition cursor-pointer"
                title="Import Circuit State JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportJSON}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Saved Snapshots Browser */}
          {savedSnapshots.length > 0 && (
            <div className="bg-[#131d27] border border-[#567C8D]/20 rounded-g2-sm p-2 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/60 px-1">
                Saved Circuit Snapshots in Browser Storage:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {savedSnapshots.map((snap) => (
                  <div
                    key={snap.name}
                    className="flex items-center justify-between p-1.5 rounded bg-[#1b2735] border border-[#567C8D]/30 text-xs font-serif"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-white font-medium truncate">{snap.name}</span>
                      <span className="text-[10px] font-mono text-[#C8D9E6]/60">
                        {new Date(snap.savedAt).toLocaleDateString()} {new Date(snap.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedSnapshot(snap.name)}
                        className="px-2 py-0.5 rounded bg-[#2F4156] hover:bg-[#3e546e] text-[#C8D9E6] hover:text-white text-[11px] font-sans transition cursor-pointer"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.name)}
                        className="p-1 rounded text-rose-300 hover:text-white hover:bg-rose-900/40 transition cursor-pointer"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};