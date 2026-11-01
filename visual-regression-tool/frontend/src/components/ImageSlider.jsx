import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

export default function ImageSlider({
  baselineSrc,
  currentSrc,
  baselineLabel = 'Baseline (v1.0)',
  currentLabel = 'Current (v2.0)',
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const startDrag = () => {
    isDragging.current = true;
  };

  const stopDrag = () => {
    isDragging.current = false;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((p) => Math.max(0, p - 2));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((p) => Math.min(100, p + 2));
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="relative select-none overflow-hidden rounded-lg border border-line-subtle bg-optical-grid max-h-[700px] flex justify-center cursor-ew-resize"
        ref={containerRef}
        onMouseDown={startDrag}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onMouseMove={handleMouseMove}
        onTouchStart={startDrag}
        onTouchEnd={stopDrag}
        onTouchMove={handleTouchMove}
        onClick={(e) => handleMove(e.clientX)}
      >
        {/* Background: Current Image */}
        <img
          src={currentSrc}
          alt={currentLabel}
          className="w-full max-h-[700px] object-contain pointer-events-none"
        />
        <div className="absolute top-3 right-3 bg-surface-panel/90 backdrop-blur border border-line-strong text-ink-primary text-[11px] font-mono px-2.5 py-1 rounded z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>{currentLabel}</span>
        </div>

        {/* Foreground: Baseline Image Clipped */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        >
          <img
            src={baselineSrc}
            alt={baselineLabel}
            className="w-full max-h-[700px] object-contain pointer-events-none"
          />
          <div className="absolute top-3 left-3 bg-surface-panel/90 backdrop-blur border border-line-strong text-ink-primary text-[11px] font-mono px-2.5 py-1 rounded z-10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{baselineLabel}</span>
          </div>
        </div>

        {/* Vertical Divider Line & Accessible Handle */}
        <div
          className="absolute top-0 bottom-0 w-px bg-blue-500 z-20 flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <button
            type="button"
            role="slider"
            aria-label="Visual comparison split position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPosition)}
            onKeyDown={handleKeyDown}
            className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md border border-white/20 pointer-events-auto cursor-ew-resize transition-colors"
          >
            <ChevronsLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Accessible Range Control Bar */}
      <div className="flex items-center justify-between gap-4 px-3 py-1.5 bg-surface-elevated border border-line-subtle rounded text-[11px] font-mono text-ink-secondary">
        <span>Split Ratio: {sliderPosition.toFixed(0)}% Baseline</span>
        <div className="flex items-center gap-1.5">
          {[0, 25, 50, 75, 100].map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setSliderPosition(pos)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                Math.round(sliderPosition) === pos
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-surface-panel text-ink-secondary hover:text-ink-primary border border-line-subtle'
              }`}
            >
              {pos}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
