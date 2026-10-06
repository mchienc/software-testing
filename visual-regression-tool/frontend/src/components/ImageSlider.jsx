import React, { useState, useRef, useCallback } from 'react';

export default function ImageSlider({ baselineSrc, currentSrc, baselineLabel = 'Baseline (v1.0)', currentLabel = 'Current (v2.0)' }) {
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

  return (
    <div 
      className="relative select-none overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl max-h-[700px] flex justify-center"
      ref={containerRef}
      onMouseDown={startDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onMouseMove={handleMouseMove}
      onTouchStart={startDrag}
      onTouchEnd={stopDrag}
      onTouchMove={handleTouchMove}
    >
      {/* Background: Current Image */}
      <img
        src={currentSrc}
        alt="Current"
        className="w-full max-h-[700px] object-contain pointer-events-none"
      />
      <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur border border-slate-700 text-amber-400 text-xs px-2.5 py-1 rounded font-semibold z-10">
        {currentLabel}
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
          alt="Baseline"
          className="w-full max-h-[700px] object-contain pointer-events-none"
        />
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-700 text-emerald-400 text-xs px-2.5 py-1 rounded font-semibold z-10">
          {baselineLabel}
        </div>
      </div>

      {/* Vertical Divider Line & Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 cursor-ew-resize z-20 flex items-center justify-center pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg font-bold text-xs pointer-events-auto cursor-ew-resize">
          ⇄
        </div>
      </div>
    </div>
  );
}
