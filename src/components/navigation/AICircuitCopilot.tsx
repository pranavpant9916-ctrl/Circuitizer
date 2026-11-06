import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { AICircuitGenerator } from '../../engine/aiCircuitGenerator';
import { Bot, Cpu, RefreshCw, Sparkles, Wand2, X } from 'lucide-react';

interface AICircuitCopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICircuitCopilot: React.FC<AICircuitCopilotProps> = ({ isOpen, onClose }) => {
  const { loadSynthesizedExperiment } = useCircuitStore();

  const [prompt, setPrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    '3-Input Majority Voting Circuit with LED',
    '2:1 Digital Multiplexer (Data Selector)',
    '1-Bit Equality Comparator (XNOR Logic)',
    'Automatic Darkness Detector with 555 & LED',
    'XOR Gate Synthesized using 4 NAND Gates',
    'Active-Low SR Latch with Memory State',
  ];

  const handleGenerate = async (queryToRun?: string) => {
    const targetPrompt = queryToRun || prompt;
    if (!targetPrompt.trim()) return;

    setIsSynthesizing(true);
    setStatusMessage('Synthesizing Boolean logic & breadboard topology...');

    try {
      setTimeout(async () => {
        setStatusMessage('Running Design Rule Checker (DRC) & pin validation...');
        const result = await AICircuitGenerator.synthesize({ userPrompt: targetPrompt });

        setStatusMessage('Hardware layout verified. Loading interactive breadboard map...');
        setTimeout(() => {
          loadSynthesizedExperiment(result.sanitizedExperiment);
          setIsSynthesizing(false);
          setStatusMessage(null);
          onClose();
        }, 400);
      }, 700);
    } catch (err) {
      console.error(err);
      setIsSynthesizing(false);
      setStatusMessage('Synthesis error. Please try another query.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#131d27]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1b2735] border border-[#567C8D]/40 rounded-g2-xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 text-[#F5EFEB]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#567C8D]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2F4156] flex items-center justify-center text-[#C8D9E6] border border-[#567C8D]/40">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2 font-serif">
                <span>AI Circuit Synthesizer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] font-mono font-medium border border-[#567C8D]/40">
                  DRC Verified
                </span>
              </h3>
              <p className="text-[11px] text-[#C8D9E6]/80 font-serif">
                Enter any circuit requirement. The AI will route the breadboard and synthesize the truth table.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#2F4156] hover:bg-[#3e546e] flex items-center justify-center text-[#C8D9E6] hover:text-white transition border border-[#567C8D]/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Text Area */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
            Circuit Requirement
          </label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Design a 3-input majority voter circuit that lights up an LED when at least 2 inputs vote HIGH..."
              rows={3}
              className="w-full bg-[#131d27]/70 border border-[#567C8D]/35 rounded-g2 p-3 text-xs text-[#F5EFEB] placeholder:text-[#C8D9E6]/50 focus:outline-none focus:border-[#C8D9E6] resize-none font-serif leading-relaxed"
            />
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]">
            Suggested Circuits
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(q);
                  handleGenerate(q);
                }}
                disabled={isSynthesizing}
                className="px-2.5 py-1 rounded-full bg-[#2F4156] hover:bg-[#3e546e] text-[11px] text-[#C8D9E6] border border-[#567C8D]/40 font-serif transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-[#C8D9E6]" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status / Generating indicator */}
        {statusMessage && (
          <div className="bg-[#131d27]/80 border border-[#567C8D]/40 p-2.5 rounded-g2 text-xs text-[#F5EFEB] flex items-center gap-2 font-serif">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C8D9E6]" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#567C8D]/25">
          <div className="text-[10px] text-[#C8D9E6]/70 font-serif flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>Enforces zero dead-shorts & TI DIP standards</span>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isSynthesizing || !prompt.trim()}
            className="px-4 py-2 bg-[#C8D9E6] text-[#131d27] hover:bg-white disabled:opacity-40 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg transition active:scale-95"
          >
            {isSynthesizing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>{isSynthesizing ? 'Synthesizing...' : 'Synthesize Circuit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
