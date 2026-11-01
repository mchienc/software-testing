import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Eye, Layers, Sliders, Info } from 'lucide-react';

export default function BlinkCompare({
  baselineSrc,
  currentSrc,
  baselineLabel = 'Baseline (v1.0)',
  currentLabel = 'Current (v2.0)',
}) {
  const [subMode, setSubMode] = useState('blink'); // 'blink' | 'onion'

  // Blink states (paused automatically if prefers-reduced-motion)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion);
  const [showingBaseline, setShowingBaseline] = useState(false);
  const [speedMs, setSpeedMs] = useState(600);

  // Onion skin states
  const [opacity, setOpacity] = useState(50);

  useEffect(() => {
    if (subMode !== 'blink' || !isPlaying) return;

    const timer = setInterval(() => {
      setShowingBaseline((prev) => !prev);
    }, speedMs);

    return () => clearInterval(timer);
  }, [subMode, isPlaying, speedMs]);

  return (
    <div className="bg-surface-panel border border-line-subtle rounded-lg overflow-hidden p-3">
      {/* Sub-mode navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-line-subtle text-xs">
        {/* Toggle Blink vs Onion */}
        <div className="bg-surface-elevated p-0.5 rounded-md border border-line-subtle flex items-center">
          <button
            type="button"
            onClick={() => setSubMode('blink')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              subMode === 'blink'
                ? 'bg-surface-panel text-ink-primary border border-line-strong shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Blink Alternator</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode('onion')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              subMode === 'onion'
                ? 'bg-surface-panel text-ink-primary border border-line-strong shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Onion Skin Overlay</span>
          </button>
        </div>

        {/* Controls based on submode */}
        {subMode === 'blink' ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated hover:bg-surface-inset text-ink-primary border border-line-subtle rounded text-xs font-medium cursor-pointer transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
              )}
              <span>{isPlaying ? 'Pause Strobe' : 'Auto Strobe'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setShowingBaseline(!showingBaseline);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-panel hover:bg-surface-elevated text-ink-secondary hover:text-ink-primary border border-line-subtle rounded text-xs font-medium cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Step Frame</span>
            </button>

            <div className="flex items-center gap-1 bg-surface-elevated border border-line-subtle px-2 py-0.5 rounded font-mono text-[11px]">
              <span className="text-ink-muted mr-1">Cadence:</span>
              {[
                { label: '300ms', val: 300 },
                { label: '600ms', val: 600 },
                { label: '1000ms', val: 1000 },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setSpeedMs(s.val)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    speedMs === s.val
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-ink-secondary flex items-center gap-1.5 text-xs font-mono tabular-nums">
              <Sliders className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
              <span>Alpha: {opacity}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-32 accent-blue-600 cursor-pointer ml-1"
                aria-label="Current layer opacity percentage"
              />
            </label>
            <div className="flex gap-1 text-[11px] font-mono">
              {[
                { label: '0% Base', val: 0 },
                { label: '50% Blend', val: 50 },
                { label: '100% Curr', val: 100 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setOpacity(preset.val)}
                  className={`px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                    opacity === preset.val
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-surface-elevated text-ink-secondary border-line-subtle hover:text-ink-primary'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Optical Screen Container */}
      <div className="relative overflow-auto max-h-[650px] bg-optical-grid rounded border border-line-subtle flex justify-center items-start select-none">
        {subMode === 'blink' ? (
          <div className="relative w-full flex justify-center">
            <div
              className={`absolute top-3 left-3 z-20 px-2.5 py-1 rounded text-[11px] font-mono font-semibold border flex items-center gap-1.5 bg-surface-panel/95 backdrop-blur ${
                showingBaseline
                  ? 'text-emerald-500 border-emerald-500/40'
                  : 'text-amber-500 border-amber-500/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  showingBaseline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{showingBaseline ? baselineLabel : currentLabel}</span>
            </div>

            <img
              src={showingBaseline ? baselineSrc : currentSrc}
              alt={showingBaseline ? baselineLabel : currentLabel}
              className="max-w-full h-auto object-contain"
            />
          </div>
        ) : (
          <div className="relative w-full flex justify-center">
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded bg-surface-panel/95 backdrop-blur border border-line-strong text-[11px] font-mono text-ink-primary flex items-center gap-2">
              <span className="text-emerald-500">{baselineLabel}</span>
              <span className="text-ink-muted">+</span>
              <span className="text-amber-500">
                {currentLabel} ({opacity}%)
              </span>
            </div>

            <img
              src={baselineSrc}
              alt="Baseline Layer"
              className="max-w-full h-auto object-contain"
            />
            <img
              src={currentSrc}
              alt="Current Layer"
              className="absolute top-0 max-w-full h-auto object-contain pointer-events-none transition-opacity duration-75"
              style={{ opacity: opacity / 100 }}
            />
          </div>
        )}
      </div>

      {/* Technical Footer Note */}
      <div className="mt-2 pt-2 flex items-center justify-between text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" aria-hidden="true" />
          <span>
            Strobe alternation and 50% alpha blending isolate 1–2px sub-pixel layout shifts immediately.
          </span>
        </span>
        <span className="font-mono uppercase">
          {subMode === 'blink' ? `FRAME: ${showingBaseline ? 'BASELINE' : 'CURRENT'}` : `ALPHA: ${opacity}%`}
        </span>
      </div>
    </div>
  );
}
