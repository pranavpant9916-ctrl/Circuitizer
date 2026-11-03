import React, { useEffect, useRef } from 'react';
import { defaultGrid, PITCH } from '../../engine/grid';
import { useCircuitStore } from '../../store/useCircuitStore';

export const BreadboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    viewport,
    setViewport,
    layers,
    circuitState,
    experiments,
    activeExpId,
    currentStepIndex,
    setActiveHole,
  } = useCircuitStore();

  const activeExp = experiments.find((e) => e.id === activeExpId);
  const currentStep = activeExp?.steps[currentStepIndex];

  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Calculate stationary centered position
  const getStationaryCenter = () => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    let scale: number;
    let targetX: number;
    let targetY: number;

    if (screenW < 640) {
      // Mobile screen: fit rows 1-32 (active circuit area ~720px wide)
      scale = Math.min((screenW - 24) / 720, 0.65);
      targetX = (screenW - 740 * scale) / 2 + 10;
      targetY = 88;
    } else {
      // Desktop / Tablet: center the entire breadboard nicely
      scale = Math.min((screenW - 80) / 1440, (screenH - 340) / 460);
      scale = Math.max(0.5, Math.min(0.85, scale));
      targetX = (screenW - 1440 * scale) / 2;
      targetY = Math.max(88, (screenH - 320 - 440 * scale) / 2 + 65);
    }

    return { x: targetX, y: targetY, scale };
  };

  // Center breadboard on initial load and lock into stationary position
  useEffect(() => {
    const stationary = getStationaryCenter();
    setViewport(stationary);
  }, []);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.parentElement?.clientWidth ? canvas.parentElement.clientWidth * dpr : window.innerWidth * dpr;
      canvas.height = canvas.parentElement?.clientHeight ? canvas.parentElement.clientHeight * dpr : window.innerHeight * dpr;
      
      const stationary = getStationaryCenter();
      setViewport(stationary);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Render Loop
  useEffect(() => {
    let animId: number;
    let pulseAngle = 0;

    const render = () => {
      pulseAngle += 0.05;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply viewport transformation
      ctx.scale(dpr, dpr);
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.scale, viewport.scale);

      // -------------------------------------------------------------
      // 1. DRAW BREADBOARD BODY (Obsidian-Porcelain Monochrome)
      // -------------------------------------------------------------
      const dims = defaultGrid.dimensions;
      const bbX = dims.originX - 45;
      const bbY = dims.originY - 30;
      const bbW = dims.width;
      const bbH = dims.height;

      // Outer shadow
      ctx.shadowColor = 'rgba(255, 255, 255, 0.06)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 8;

      // Breadboard body: refined off-white porcelain
      ctx.fillStyle = '#ebedf2';
      ctx.beginPath();
      ctx.roundRect(bbX, bbY, bbW, bbH, 20); // G2-style smooth curve
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Board border
      ctx.strokeStyle = '#cfd3dd';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center Divider Trench (DIP Gutter)
      ctx.fillStyle = '#0d0f14';
      ctx.fillRect(bbX + 15, 222, bbW - 30, 8);

      // Power Rails Color Stripes
      ctx.strokeStyle = '#3b82f6'; // Top GND
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bbX + 30, 36);
      ctx.lineTo(bbX + bbW - 30, 36);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444'; // Top VCC
      ctx.beginPath();
      ctx.moveTo(bbX + 30, 78);
      ctx.lineTo(bbX + bbW - 30, 78);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444'; // Bot VCC
      ctx.beginPath();
      ctx.moveTo(bbX + 30, 372);
      ctx.lineTo(bbX + bbW - 30, 372);
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6'; // Bot GND
      ctx.beginPath();
      ctx.moveTo(bbX + 30, 414);
      ctx.lineTo(bbX + bbW - 30, 414);
      ctx.stroke();

      // Polarity Silk-Screen Markers
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('+', bbX + 16, 74);
      ctx.fillText('+', bbX + 16, 376);
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('−', bbX + 16, 39);
      ctx.fillText('−', bbX + 16, 418);

      // -------------------------------------------------------------
      // 2. SILK-SCREEN NUMBERS & LETTERS
      // -------------------------------------------------------------
      ctx.fillStyle = '#787f8f';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Row numbers
      for (let r = 1; r <= 63; r++) {
        const x = dims.originX + (r - 1) * PITCH;
        if (r === 1 || r % 5 === 0 || r === 63) {
          ctx.fillText(String(r), x, 108);
          ctx.fillText(String(r), x, 226);
          ctx.fillText(String(r), x, 345);
        }
      }

      // Column letters
      const colLetters: Record<string, number> = {
        a: 125, b: 145, c: 165, d: 185, e: 205,
        f: 245, g: 265, h: 285, i: 305, j: 325,
      };
      ctx.textAlign = 'right';
      for (const [col, y] of Object.entries(colLetters)) {
        ctx.fillText(col, dims.originX - 12, y);
      }

      // -------------------------------------------------------------
      // 3. INTERNAL BUS TRACKS (X-Ray layer)
      // -------------------------------------------------------------
      if (layers.internalTracks) {
        ctx.fillStyle = 'rgba(34, 38, 49, 0.15)';
        ctx.strokeStyle = 'rgba(82, 88, 102, 0.4)';
        ctx.lineWidth = 1;

        for (let r = 1; r <= 63; r++) {
          const x = dims.originX + (r - 1) * PITCH;
          ctx.fillRect(x - 6, 120, 12, 90);
          ctx.strokeRect(x - 6, 120, 12, 90);
          ctx.fillRect(x - 6, 240, 12, 90);
          ctx.strokeRect(x - 6, 240, 12, 90);
        }
      }

      // -------------------------------------------------------------
      // 4. DRAW BREADBOARD HOLES
      // -------------------------------------------------------------
      for (const hole of defaultGrid.holes.values()) {
        ctx.fillStyle = '#06070a';
        ctx.beginPath();
        ctx.rect(hole.x - 3.5, hole.y - 3.5, 7, 7);
        ctx.fill();

        ctx.strokeStyle = '#b9bcc7';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // -------------------------------------------------------------
      // 5. PULSING AR NAVIGATION TARGET RINGS (Pure White/Silver)
      // -------------------------------------------------------------
      if (currentStep && currentStep.highlightHoles.length > 0) {
        const pulseScale = 1 + 0.35 * Math.sin(pulseAngle);
        const alpha = 0.5 + 0.4 * Math.cos(pulseAngle);

        for (const holeId of currentStep.highlightHoles) {
          const hole = defaultGrid.getHole(holeId);
          if (!hole) continue;

          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(hole.x, hole.y, 14 * pulseScale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fill();
          ctx.restore();
        }
      }

      // -------------------------------------------------------------
      // 6. DRAW COMPONENTS
      // -------------------------------------------------------------
      if (layers.realistic) {
        // A. Draw ICs (Obsidian Charcoal Package)
        for (const ic of circuitState.placedICs) {
          const totalPins = Object.keys(ic.pinHoles).length;
          const bottomPinsCount = Math.floor(totalPins / 2);
          const pin1Hole = defaultGrid.getHole(ic.pinHoles[1]);
          const lastBottomHole = defaultGrid.getHole(ic.pinHoles[bottomPinsCount]);
          if (!pin1Hole || !lastBottomHole) continue;

          const icX = pin1Hole.x - 12;
          const icW = (lastBottomHole.x - pin1Hole.x) + 24;
          const icY = 212;
          const icH = 28;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#171a22'; // Obsidian package
          ctx.beginPath();
          ctx.roundRect(icX, icY, icW, icH, 5);
          ctx.fill();
          ctx.restore();

          // Semicircular Orientation Notch
          ctx.fillStyle = '#06070a';
          ctx.beginPath();
          ctx.arc(icX, icY + icH / 2, 4, -Math.PI / 2, Math.PI / 2);
          ctx.fill();

          // Pin 1 Index Dot
          ctx.fillStyle = '#525866';
          ctx.beginPath();
          ctx.arc(icX + 10, icY + icH - 6, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Laser-Etched Model Label
          ctx.fillStyle = '#cfd3dd';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          const label = ic.model.startsWith('NE') ? ic.model : `SN${ic.model}N`;
          ctx.fillText(label, icX + icW / 2, icY + icH / 2 + 3);

          // Metallic Pins
          for (const [pinNumStr, hId] of Object.entries(ic.pinHoles)) {
            const h = defaultGrid.getHole(String(hId));
            if (!h) continue;
            ctx.fillStyle = '#a3a9b7';
            const isTop = Number(pinNumStr) > bottomPinsCount;
            const py = isTop ? icY - 5 : icY + icH;
            ctx.fillRect(h.x - 2, py, 4, 5);
          }
        }

        // B. Draw 7-Segment Displays
        if (circuitState.segmentDisplays) {
          for (const segDisp of circuitState.segmentDisplays) {
            const holeA = defaultGrid.getHole(segDisp.segmentPins.a);
            if (!holeA) continue;

            const dispX = holeA.x - 24;
            const dispY = 195;
            const dispW = 76;
            const dispH = 62;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#0a0c10';
            ctx.beginPath();
            ctx.roundRect(dispX, dispY, dispW, dispH, 6);
            ctx.fill();

            ctx.strokeStyle = '#222631';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            const cx = dispX + dispW / 2;
            const cy = dispY + dispH / 2;

            const drawSegment = (segKey: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'dp', x: number, y: number, w: number, h: number) => {
              const isOn = segDisp.litSegments[segKey];
              ctx.save();
              if (isOn) {
                ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#ffffff';
              } else {
                ctx.fillStyle = '#171a22';
              }
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 2);
              ctx.fill();
              ctx.restore();
            };

            drawSegment('a', cx - 12, cy - 20, 24, 4);
            drawSegment('b', cx + 10, cy - 18, 4, 16);
            drawSegment('c', cx + 10, cy + 2, 4, 16);
            drawSegment('d', cx - 12, cy + 16, 24, 4);
            drawSegment('e', cx - 14, cy + 2, 4, 16);
            drawSegment('f', cx - 14, cy - 18, 4, 16);
            drawSegment('g', cx - 12, cy - 2, 24, 4);
            drawSegment('dp', cx + 18, cy + 16, 4, 4);
          }
        }

        // B. Draw Resistors
        for (const res of circuitState.resistors) {
          const hA = defaultGrid.getHole(res.fromHole);
          const hB = defaultGrid.getHole(res.toHole);
          if (!hA || !hB) continue;

          ctx.strokeStyle = '#a3a9b7';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(hA.x, hA.y);
          ctx.lineTo(hB.x, hB.y);
          ctx.stroke();

          const midX = (hA.x + hB.x) / 2;
          const midY = (hA.y + hB.y) / 2;
          ctx.save();
          ctx.translate(midX, midY);
          const angle = Math.atan2(hB.y - hA.y, hB.x - hA.x);
          ctx.rotate(angle);

          ctx.fillStyle = '#cfd3dd';
          ctx.beginPath();
          ctx.roundRect(-14, -5, 28, 10, 3);
          ctx.fill();

          const bandColors: Record<string, string> = {
            orange: '#ea580c',
            brown: '#78350f',
            gold: '#eab308',
            black: '#0f172a',
            red: '#dc2626',
          };
          res.bands.forEach((bName: string, idx: number) => {
            ctx.fillStyle = bandColors[bName] || '#000';
            ctx.fillRect(-10 + idx * 6, -5, 2.5, 10);
          });
          ctx.restore();
        }

        // C. Draw LEDs
        for (const led of circuitState.leds) {
          const hAnode = defaultGrid.getHole(led.anodeHole);
          const hCathode = defaultGrid.getHole(led.cathodeHole);
          if (!hAnode || !hCathode) continue;

          const ledX = (hAnode.x + hCathode.x) / 2;
          const ledY = (hAnode.y + hCathode.y) / 2;

          if (led.isLit) {
            ctx.save();
            const glowGrad = ctx.createRadialGradient(ledX, ledY, 4, ledX, ledY, 26);
            glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            glowGrad.addColorStop(0.5, 'rgba(207, 211, 221, 0.4)');
            glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(ledX, ledY, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.fillStyle = led.isLit ? '#ffffff' : '#353a47';
          ctx.beginPath();
          ctx.arc(ledX, ledY, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(ledX - 2.5, ledY - 2.5, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // D. Draw Jumper Wires
        const wireColorMap: Record<string, string> = {
          red: '#ef4444',
          blue: '#3b82f6',
          black: '#171a22',
          yellow: '#eab308',
          green: '#10b981',
          white: '#ffffff',
          orange: '#f97316',
        };

        for (const wire of circuitState.wires) {
          const hFrom = defaultGrid.getHole(wire.fromHole);
          const hTo = defaultGrid.getHole(wire.toHole);
          if (!hFrom || !hTo) continue;

          const dx = hTo.x - hFrom.x;
          const dy = hTo.y - hFrom.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const arch = Math.min(dist * 0.45, 60);

          ctx.save();
          ctx.strokeStyle = wireColorMap[wire.color] || '#ffffff';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(hFrom.x, hFrom.y);
          ctx.bezierCurveTo(
            hFrom.x,
            hFrom.y - arch,
            hTo.x,
            hTo.y - arch,
            hTo.x,
            hTo.y
          );
          ctx.stroke();

          ctx.fillStyle = '#787f8f';
          ctx.beginPath();
          ctx.arc(hFrom.x, hFrom.y, 3.5, 0, Math.PI * 2);
          ctx.arc(hTo.x, hTo.y, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Signal traffic pulse
          if (layers.signalTraffic) {
            const t = (pulseAngle * 0.3) % 1;
            const px = (1 - t) * (1 - t) * hFrom.x + 2 * (1 - t) * t * ((hFrom.x + hTo.x) / 2) + t * t * hTo.x;
            const py = (1 - t) * (1 - t) * hFrom.y + 2 * (1 - t) * t * (hFrom.y - arch) + t * t * hTo.y;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [viewport, layers, circuitState, currentStepIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (_e: React.PointerEvent<HTMLCanvasElement>) => {
    // Kept stationary: breadboard remains locked in its centered position
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (lastTouchRef.current) {
      const moved = Math.hypot(e.clientX - lastTouchRef.current.x, e.clientY - lastTouchRef.current.y);
      if (moved < 8) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          const worldX = (clickX - viewport.x) / viewport.scale;
          const worldY = (clickY - viewport.y) / viewport.scale;

          const nearest = defaultGrid.findNearestHole(worldX, worldY, 15);
          setActiveHole(nearest ? nearest.id : null);
        }
      }
    }
    lastTouchRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // Gentle bounded zoom around center while keeping stationary alignment
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    const newScale = Math.max(0.45, Math.min(1.2, viewport.scale * zoomFactor));

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 3;

    const newX = centerX - (centerX - viewport.x) * (newScale / viewport.scale);
    const newY = centerY - (centerY - viewport.y) * (newScale / viewport.scale);

    setViewport({ scale: newScale, x: newX, y: newY });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-default"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          lastTouchRef.current = null;
        }}
        onWheel={handleWheel}
      />
    </div>
  );
};
