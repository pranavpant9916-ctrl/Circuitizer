import React, { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import {
  VisionCircuitExtractor,
  VisionExtractionResult,
  VisionInputType,
} from '../../services/visionCircuitExtractor';
import { ReverseBooleanExtractor } from '../../engine/reverseExtractor';
import { BooleanCompiler } from '../../engine/booleanCompiler';
import { AudioEngine } from '../../engine/audioEngine';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  ChevronLeft,
  FileSpreadsheet,
  FileUp,
  Play,
  RefreshCw,
  Scan,
  Sparkles,
  Zap,
} from 'lucide-react';

export const CameraScanner: React.FC = () => {
  const {
    setMode,
    circuitState,
    loadSynthesizedExperiment,
    jumpToStep,
  } = useCircuitStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<VisionInputType>('SCHEMATIC_DIAGRAM');
  const [streamActive, setStreamActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Vision Extraction Results
  const [visionResult, setVisionResult] = useState<VisionExtractionResult | null>(null);
  const [reverseResult, setReverseResult] = useState<ReturnType<typeof ReverseBooleanExtractor.extract> | null>(null);
  const [plotError, setPlotError] = useState<string | null>(null);

  // Start mobile / webcam stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setCameraError('Camera stream unavailable. You can upload an image file or run analysis on sample inputs.');
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Process an image (either captured from camera or uploaded as file)
  const processImage = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setVisionResult(null);
    setReverseResult(null);
    setPlotError(null);

    try {
      if (activeTab === 'PHYSICAL_BREADBOARD') {
        // Run both computer vision heuristic AND live circuit reverse extraction
        const [vResult] = await Promise.all([
          VisionCircuitExtractor.analyzeImage(dataUrl, activeTab),
        ]);
        const revResult = ReverseBooleanExtractor.extract(circuitState);
        setVisionResult(vResult);
        setReverseResult(revResult);
      } else {
        const vResult = await VisionCircuitExtractor.analyzeImage(dataUrl, activeTab);
        setVisionResult(vResult);
      }
      AudioEngine.playRowSelect(true);
    } catch (err: any) {
      console.error('Vision processing error:', err);
      AudioEngine.playBuzzerAlert();
      setPlotError(err.message || 'Error processing image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Capture frame from active camera stream
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    let dataUrl = '';
    if (video && canvas && streamActive) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg');
      }
    } else {
      // Fallback synthetic placeholder data
      dataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%231b2735"/><text x="50%25" y="50%25" fill="%23C8D9E6" text-anchor="middle">Synthetic Capture</text></svg>';
    }

    setCapturedImage(dataUrl);
    processImage(dataUrl);
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedImage(dataUrl);
        processImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setVisionResult(null);
    setReverseResult(null);
    setPlotError(null);
  };

  // Plot the recognized / minimized Boolean formula onto the digital twin breadboard
  const handlePlotOntoBreadboard = (formula: string) => {
    try {
      setPlotError(null);
      const cleanFormula = formula.replace(/^Y\s*=\s*/i, '').trim();
      const compiled = BooleanCompiler.compile(cleanFormula);

      loadSynthesizedExperiment(compiled.experiment);
      jumpToStep(compiled.experiment.steps.length - 1);
      AudioEngine.playWireInsert();
      setMode('GUIDE');
    } catch (err: any) {
      console.error('Failed to plot circuit:', err);
      AudioEngine.playBuzzerAlert();
      setPlotError(err.message || 'Could not compile extracted Boolean formula.');
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#131d27] flex flex-col justify-between text-[#F5EFEB]">
      {/* Top Header Bar */}
      <div className="p-4 bg-[#1b2735]/95 backdrop-blur-xl border-b border-[#567C8D]/35 flex items-center justify-between z-10">
        <button
          onClick={() => setMode('GUIDE')}
          className="flex items-center gap-1.5 text-xs font-medium text-[#C8D9E6] hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Circuit</span>
        </button>

        {/* 3-Mode Vision Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#131d27] p-1 rounded-full border border-[#567C8D]/40 text-xs font-medium font-sans">
          <button
            onClick={() => {
              setActiveTab('SCHEMATIC_DIAGRAM');
              if (capturedImage) processImage(capturedImage);
            }}
            className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${
              activeTab === 'SCHEMATIC_DIAGRAM'
                ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                : 'text-[#C8D9E6]/80 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Schematic</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('TRUTH_TABLE');
              if (capturedImage) processImage(capturedImage);
            }}
            className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${
              activeTab === 'TRUTH_TABLE'
                ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                : 'text-[#C8D9E6]/80 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Truth Table</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('PHYSICAL_BREADBOARD');
              if (capturedImage) processImage(capturedImage);
            }}
            className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${
              activeTab === 'PHYSICAL_BREADBOARD'
                ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                : 'text-[#C8D9E6]/80 hover:text-white'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Breadboard</span>
          </button>
        </div>

        {/* Hidden File Picker Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[#C8D9E6] hover:text-white text-xs font-semibold shadow-sm transition"
          title="Upload photo from disk or camera roll"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Image</span>
        </button>
      </div>

      {/* Main Viewport & Viewfinder */}
      <div className="relative flex-1 bg-[#131d27] flex items-center justify-center overflow-hidden">
        {/* Hidden Snapshot Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured Circuit Input"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Viewfinder Reticle Overlay */}
        {!capturedImage && (
          <div className="absolute inset-8 border border-[#567C8D]/50 rounded-g2-xl pointer-events-none flex flex-col items-center justify-between p-4">
            <div className="bg-[#1b2735]/90 backdrop-blur-md text-[#C8D9E6] text-xs font-serif px-3 py-1 rounded-full border border-[#567C8D]/40 shadow-lg">
              {activeTab === 'SCHEMATIC_DIAGRAM'
                ? 'Align schematic gate diagram in frame'
                : activeTab === 'TRUTH_TABLE'
                ? 'Align truth table sheet or worksheet'
                : 'Align physical 830-tie breadboard'}
            </div>

            <div className="flex justify-between w-full text-[10px] text-[#C8D9E6]/70 font-mono">
              <span>{activeTab === 'PHYSICAL_BREADBOARD' ? 'Pin 1 / Row 1' : 'Inputs (A, B)'}</span>
              <span>{activeTab === 'PHYSICAL_BREADBOARD' ? 'Row 63' : 'Output (Y)'}</span>
            </div>
          </div>
        )}

        {/* Error / Fallback Banner */}
        {cameraError && !capturedImage && (
          <div className="absolute inset-x-4 top-20 bg-[#1b2735]/95 border border-[#567C8D]/40 p-4 rounded-g2-xl text-center flex flex-col items-center gap-2.5 shadow-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <div className="text-xs text-[#C8D9E6] font-serif leading-relaxed max-w-sm">
              {cameraError}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 bg-[#C8D9E6] text-[#131d27] font-semibold text-xs rounded-full transition hover:bg-white flex items-center gap-1.5"
              >
                <FileUp className="w-3.5 h-3.5" />
                Upload Photo File
              </button>
              <button
                onClick={handleCapture}
                className="px-4 py-1.5 bg-[#2F4156] border border-[#567C8D]/40 text-white font-semibold text-xs rounded-full transition hover:bg-[#3e546e]"
              >
                Test Sample Circuit
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-[#131d27]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#C8D9E6] animate-spin" />
            <div className="text-xs font-semibold text-white flex items-center gap-2 font-serif">
              <Sparkles className="w-4 h-4 text-[#C8D9E6]" />
              <span>Analyzing Multi-Modal Vision Model...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Extraction Results & 1-Click Action Bar */}
      <div className="bg-[#1b2735] border-t border-[#567C8D]/35 p-4 flex flex-col gap-3.5 z-10 max-h-[50vh] overflow-y-auto">
        {visionResult ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
            {/* Top Bar with Scan Again and Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-serif">
                  {visionResult.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] font-mono border border-[#567C8D]/40">
                  {Math.round(visionResult.confidence * 100)}% Match
                </span>
              </div>

              <button
                onClick={handleRetake}
                className="text-xs text-[#C8D9E6] hover:text-white font-medium transition"
              >
                Scan Again
              </button>
            </div>

            {/* Extracted Formula Card */}
            <div className="bg-[#131d27]/90 border border-[#567C8D]/40 rounded-g2 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#C8D9E6]" />
                  <span>Detected Boolean Expression</span>
                </span>
                <span className="text-sm font-mono font-bold text-white bg-[#2F4156] px-2.5 py-1 rounded border border-[#567C8D]/50">
                  {visionResult.detectedFormula}
                </span>
              </div>

              {/* 1-Click "Plot on Breadboard" CTA Button */}
              <button
                onClick={() => handlePlotOntoBreadboard(visionResult.detectedFormula)}
                className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#C8D9E6] text-[#131d27] hover:bg-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-[#131d27]" />
                <span>Plot onto Breadboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plot Error Alert */}
            {plotError && (
              <div className="bg-rose-950/60 border border-rose-500/40 p-2.5 rounded-g2 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{plotError}</span>
              </div>
            )}

            {/* Component Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-sans uppercase tracking-wider text-[#C8D9E6]/60">
                Components:
              </span>
              {visionResult.detectedComponents.map((c, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#2F4156] text-[#C8D9E6] border border-[#567C8D]/40"
                >
                  {c}
                </span>
              ))}
            </div>

            {/* If Truth Table is present: Render Interactive Preview Table */}
            {visionResult.extractedTruthTable && (
              <div className="overflow-x-auto border border-[#567C8D]/30 rounded-g2 bg-[#131d27]/50 max-h-40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#567C8D]/25 bg-[#2F4156]/50 text-[#C8D9E6] font-mono text-[10px]">
                      {visionResult.extractedTruthTable.headers.map((h, i) => (
                        <th key={i} className="py-2 px-3 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#567C8D]/20 font-mono text-xs">
                    {visionResult.extractedTruthTable.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#2F4156]/30 transition">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reverse Extraction Breadboard Diagnostics */}
            {reverseResult && reverseResult.diagnostics.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#C8D9E6]/70">
                  Hardware Diagnostics
                </span>
                {reverseResult.diagnostics.map((diag, dIdx) => (
                  <div
                    key={dIdx}
                    className={`p-2 rounded border text-xs flex items-start gap-2 ${
                      diag.severity === 'CRITICAL'
                        ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    {diag.severity === 'CRITICAL' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold">{diag.title}:</span>{' '}
                      <span className="font-serif">{diag.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Initial Viewport Prompt & Action Buttons */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#C8D9E6]/80 font-serif text-center sm:text-left">
              {activeTab === 'SCHEMATIC_DIAGRAM'
                ? 'Capture logic gates from textbook or worksheet to compile directly.'
                : activeTab === 'TRUTH_TABLE'
                ? 'Capture truth table matrix to minimize logic into Boolean equation.'
                : 'Inspect physical breadboard components against digital twin.'}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[#C8D9E6] hover:text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <FileUp className="w-4 h-4" />
                <span>Choose Image</span>
              </button>

              <button
                onClick={handleCapture}
                disabled={isAnalyzing}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#C8D9E6] text-[#131d27] hover:bg-white rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capture & Ingest</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
