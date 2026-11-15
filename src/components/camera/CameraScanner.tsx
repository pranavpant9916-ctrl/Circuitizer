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
import { BreadboardCorners, HomographyEngine } from '../../engine/homography';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  ChevronLeft,
  Crosshair,
  FileSpreadsheet,
  FileUp,
  Maximize2,
  Play,
  RefreshCw,
  RotateCcw,
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<VisionInputType>('PHYSICAL_BREADBOARD');
  const [streamActive, setStreamActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rectifiedImage, setRectifiedImage] = useState<string | null>(null);
  const [viewProjection, setViewProjection] = useState<'DESK_PERSPECTIVE' | 'RECTIFIED_ORTHO'>('DESK_PERSPECTIVE');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 4-Corner Homography Targets in percentage of viewfinder container [0..100]
  const [corners, setCorners] = useState<BreadboardCorners>({
    a1: { x: 12, y: 24 },    // Top-Left (A1)
    a63: { x: 88, y: 24 },   // Top-Right (A63)
    j63: { x: 84, y: 76 },   // Bottom-Right (J63 - slight inward desk perspective)
    j1: { x: 16, y: 76 },    // Bottom-Left (J1 - slight inward desk perspective)
  });

  const [draggingCorner, setDraggingCorner] = useState<keyof BreadboardCorners | null>(null);

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

  // Process an image (from capture or file upload) and apply perspective homography
  const processImage = async (dataUrl: string, applyHomography: boolean = true) => {
    setIsAnalyzing(true);
    setVisionResult(null);
    setReverseResult(null);
    setPlotError(null);

    try {
      let finalDataUrl = dataUrl;

      if (activeTab === 'PHYSICAL_BREADBOARD' && applyHomography) {
        // Perspective rectify using the 4 calibrated corners
        const img = new Image();
        img.src = dataUrl;
        await new Promise((res) => { img.onload = res; });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(img, 0, 0);

          // Convert percentage corner coordinates to source image pixel space
          const pixelCorners: BreadboardCorners = {
            a1: { x: (corners.a1.x / 100) * img.width, y: (corners.a1.y / 100) * img.height },
            a63: { x: (corners.a63.x / 100) * img.width, y: (corners.a63.y / 100) * img.height },
            j63: { x: (corners.j63.x / 100) * img.width, y: (corners.j63.y / 100) * img.height },
            j1: { x: (corners.j1.x / 100) * img.width, y: (corners.j1.y / 100) * img.height },
          };

          const rectifiedCanvas = HomographyEngine.rectifyBreadboard(tempCanvas, pixelCorners, 1260, 400);
          const rectUrl = rectifiedCanvas.toDataURL('image/jpeg');
          setRectifiedImage(rectUrl);
          finalDataUrl = rectUrl;
        }

        const [vResult] = await Promise.all([
          VisionCircuitExtractor.analyzeImage(finalDataUrl, activeTab),
        ]);
        const revResult = ReverseBooleanExtractor.extract(circuitState);
        setVisionResult(vResult);
        setReverseResult(revResult);
      } else {
        const vResult = await VisionCircuitExtractor.analyzeImage(finalDataUrl, activeTab);
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
      dataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="%231b2735"/><text x="50%25" y="50%25" fill="%23C8D9E6" text-anchor="middle">Synthetic Camera Feed</text></svg>';
    }

    setCapturedImage(dataUrl);
    processImage(dataUrl, true);
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
        processImage(dataUrl, true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setRectifiedImage(null);
    setVisionResult(null);
    setReverseResult(null);
    setPlotError(null);
    setViewProjection('DESK_PERSPECTIVE');
  };

  const handleResetCorners = () => {
    AudioEngine.playStepChange(false);
    setCorners({
      a1: { x: 12, y: 24 },
      a63: { x: 88, y: 24 },
      j63: { x: 84, y: 76 },
      j1: { x: 16, y: 76 },
    });
  };

  // Dragging logic for the 4 corner targets
  const handlePointerDown = (corner: keyof BreadboardCorners, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingCorner(corner);
    AudioEngine.playSwitchClick(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingCorner || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(3, Math.min(97, rawX));
    const clampedY = Math.max(3, Math.min(97, rawY));

    setCorners((prev) => ({
      ...prev,
      [draggingCorner]: { x: clampedX, y: clampedY },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingCorner) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingCorner(null);
      AudioEngine.playSwitchClick(false);
    }
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

  // Compute SVG polygon points for reticle
  const polygonPoints = `${corners.a1.x},${corners.a1.y} ${corners.a63.x},${corners.a63.y} ${corners.j63.x},${corners.j63.y} ${corners.j1.x},${corners.j1.y}`;

  // Center trench line
  const trenchLeftX = (corners.a1.x + corners.j1.x) / 2;
  const trenchLeftY = (corners.a1.y + corners.j1.y) / 2;
  const trenchRightX = (corners.a63.x + corners.j63.x) / 2;
  const trenchRightY = (corners.a63.y + corners.j63.y) / 2;

  // Power rails lines (Top Red VCC rail & Bottom Blue GND rail)
  const topRailLeftX = corners.a1.x * 0.75 + corners.j1.x * 0.25;
  const topRailLeftY = corners.a1.y * 0.75 + corners.j1.y * 0.25;
  const topRailRightX = corners.a63.x * 0.75 + corners.j63.x * 0.25;
  const topRailRightY = corners.a63.y * 0.75 + corners.j63.y * 0.25;

  const botRailLeftX = corners.a1.x * 0.25 + corners.j1.x * 0.75;
  const botRailLeftY = corners.a1.y * 0.25 + corners.j1.y * 0.75;
  const botRailRightX = corners.a63.x * 0.25 + corners.j63.x * 0.75;
  const botRailRightY = corners.a63.y * 0.25 + corners.j63.y * 0.75;

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
              if (capturedImage) processImage(capturedImage, false);
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
              if (capturedImage) processImage(capturedImage, false);
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
              if (capturedImage) processImage(capturedImage, true);
            }}
            className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${
              activeTab === 'PHYSICAL_BREADBOARD'
                ? 'bg-[#C8D9E6] text-[#131d27] font-semibold shadow-sm'
                : 'text-[#C8D9E6]/80 hover:text-white'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Breadboard Homography</span>
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

        <div className="flex items-center gap-2">
          {activeTab === 'PHYSICAL_BREADBOARD' && !capturedImage && (
            <button
              onClick={handleResetCorners}
              className="px-2.5 py-1.5 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[#C8D9E6] hover:text-white text-xs font-semibold flex items-center gap-1 transition"
              title="Reset corners to calibrated default alignment"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Reticle</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[#C8D9E6] hover:text-white text-xs font-semibold shadow-sm transition"
            title="Upload photo from disk or camera roll"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Photo</span>
          </button>
        </div>
      </div>

      {/* Main Viewport & Viewfinder */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex-1 bg-[#131d27] flex items-center justify-center overflow-hidden touch-none"
      >
        {/* Hidden Snapshot Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Captured Image Display with View Projection Toggle */}
        {capturedImage ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={viewProjection === 'RECTIFIED_ORTHO' && rectifiedImage ? rectifiedImage : capturedImage}
              alt="Captured Circuit Input"
              className="w-full h-full object-contain p-2"
            />

            {/* Projection Mode Switcher (Desk Angle vs Rectified Orthographic) */}
            {rectifiedImage && activeTab === 'PHYSICAL_BREADBOARD' && (
              <div className="absolute top-4 bg-[#1b2735]/90 backdrop-blur-md border border-[#567C8D]/40 p-1 rounded-full flex items-center gap-1 shadow-2xl text-xs z-20">
                <button
                  onClick={() => setViewProjection('DESK_PERSPECTIVE')}
                  className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${
                    viewProjection === 'DESK_PERSPECTIVE'
                      ? 'bg-[#C8D9E6] text-[#131d27] font-bold'
                      : 'text-[#C8D9E6]/80 hover:text-white'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Desk Perspective</span>
                </button>

                <button
                  onClick={() => setViewProjection('RECTIFIED_ORTHO')}
                  className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${
                    viewProjection === 'RECTIFIED_ORTHO'
                      ? 'bg-[#C8D9E6] text-[#131d27] font-bold shadow'
                      : 'text-[#C8D9E6]/80 hover:text-white'
                  }`}
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Orthographic (Homography)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Interactive 4-Corner Homography Reticle (Only in Physical Breadboard Mode) */}
        {!capturedImage && activeTab === 'PHYSICAL_BREADBOARD' && (
          <div className="absolute inset-0 pointer-events-none select-none">
            {/* SVG Connecting Polygon, Grid Lines & Trench */}
            <svg className="w-full h-full absolute inset-0">
              {/* Outer Quad Polygon */}
              <polygon
                points={polygonPoints}
                className="fill-[#567C8D]/15 stroke-[#C8D9E6] stroke-[2] [stroke-dasharray:6,4]"
              />

              {/* Center Trench (Dividing Section e and f) */}
              <line
                x1={`${trenchLeftX}%`}
                y1={`${trenchLeftY}%`}
                x2={`${trenchRightX}%`}
                y2={`${trenchRightY}%`}
                className="stroke-amber-300/70 stroke-[1.5] [stroke-dasharray:4,3]"
              />

              {/* Top Rail Guide (+5V Red) */}
              <line
                x1={`${topRailLeftX}%`}
                y1={`${topRailLeftY}%`}
                x2={`${topRailRightX}%`}
                y2={`${topRailRightY}%`}
                className="stroke-rose-400/50 stroke-[1] [stroke-dasharray:3,3]"
              />

              {/* Bottom Rail Guide (0V Blue) */}
              <line
                x1={`${botRailLeftX}%`}
                y1={`${botRailLeftY}%`}
                x2={`${botRailRightX}%`}
                y2={`${botRailRightY}%`}
                className="stroke-sky-400/50 stroke-[1] [stroke-dasharray:3,3]"
              />
            </svg>

            {/* Instruction Banner Pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1b2735]/95 backdrop-blur-md text-[#C8D9E6] text-xs font-serif px-4 py-1.5 rounded-full border border-[#567C8D]/50 shadow-2xl flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-[#C8D9E6] animate-spin-slow" />
              <span>Drag corners to align A1, A63, J1, and J63 to breadboard</span>
            </div>

            {/* 4 Draggable Interactive Target Handles */}
            {[
              { key: 'a1', label: 'A1 (Row 1 Top)', pt: corners.a1, alignClass: '-translate-x-1/2 -translate-y-1/2' },
              { key: 'a63', label: 'A63 (Row 63 Top)', pt: corners.a63, alignClass: '-translate-x-1/2 -translate-y-1/2' },
              { key: 'j63', label: 'J63 (Row 63 Bot)', pt: corners.j63, alignClass: '-translate-x-1/2 -translate-y-1/2' },
              { key: 'j1', label: 'J1 (Row 1 Bot)', pt: corners.j1, alignClass: '-translate-x-1/2 -translate-y-1/2' },
            ].map(({ key, label, pt, alignClass }) => (
              <div
                key={key}
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                onPointerDown={(e) => handlePointerDown(key as keyof BreadboardCorners, e)}
                className={`absolute ${alignClass} pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center group z-30 touch-none`}
              >
                {/* Target Ring */}
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[#1b2735]/80 shadow-[0_0_12px_rgba(200,217,230,0.9)] flex items-center justify-center transition group-hover:scale-125">
                    <div className="w-2 h-2 rounded-full bg-[#C8D9E6]" />
                  </div>
                  {/* Subtle Crosshair Lines */}
                  <div className="absolute w-12 h-px bg-white/40 pointer-events-none" />
                  <div className="absolute h-12 w-px bg-white/40 pointer-events-none" />
                </div>

                {/* Floating Coordinate Label Badge */}
                <span className="mt-1 px-2 py-0.5 rounded bg-[#131d27]/90 text-[10px] font-mono font-bold text-[#C8D9E6] border border-[#567C8D]/50 shadow-md whitespace-nowrap pointer-events-none">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Viewfinder Reticle for Schematic / Truth Table */}
        {!capturedImage && activeTab !== 'PHYSICAL_BREADBOARD' && (
          <div className="absolute inset-8 border border-[#567C8D]/50 rounded-g2-xl pointer-events-none flex flex-col items-center justify-between p-4">
            <div className="bg-[#1b2735]/90 backdrop-blur-md text-[#C8D9E6] text-xs font-serif px-3 py-1 rounded-full border border-[#567C8D]/40 shadow-lg">
              {activeTab === 'SCHEMATIC_DIAGRAM'
                ? 'Align schematic gate diagram in frame'
                : 'Align truth table sheet or worksheet'}
            </div>

            <div className="flex justify-between w-full text-[10px] text-[#C8D9E6]/70 font-mono">
              <span>Inputs (A, B)</span>
              <span>Output (Y)</span>
            </div>
          </div>
        )}

        {/* Error / Fallback Banner */}
        {cameraError && !capturedImage && (
          <div className="absolute inset-x-4 top-20 bg-[#1b2735]/95 border border-[#567C8D]/40 p-4 rounded-g2-xl text-center flex flex-col items-center gap-2.5 shadow-2xl z-30">
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
          <div className="absolute inset-0 bg-[#131d27]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <RefreshCw className="w-8 h-8 text-[#C8D9E6] animate-spin" />
            <div className="text-xs font-semibold text-white flex items-center gap-2 font-serif">
              <Sparkles className="w-4 h-4 text-[#C8D9E6]" />
              <span>Perspective-Rectifying & Ingesting Circuit...</span>
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
                : 'Drag reticle targets A1, A63, J1, and J63 over your breadboard to rectify desk perspective.'}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-[#2F4156] border border-[#567C8D]/40 text-[#C8D9E6] hover:text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <FileUp className="w-4 h-4" />
                <span>Choose Photo</span>
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
