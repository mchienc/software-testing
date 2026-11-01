import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Eye, Layers, Sliders } from 'lucide-react';

export default function BlinkCompare({
  baselineSrc,
  currentSrc,
  baselineLabel = 'Baseline (v1.0)',
  currentLabel = 'Current (v2.0)'
}) {
  const [subMode, setSubMode] = useState('blink'); // 'blink' | 'onion'
  
  // Blink states
  const [isPlaying, setIsPlaying] = useState(true);
  const [showingBaseline, setShowingBaseline] = useState(false);
  const [speedMs, setSpeedMs] = useState(600); // interval ms
  
  // Onion skin states
  const [opacity, setOpacity] = useState(50); // 0 to 100%

  // Auto-blink timer
  useEffect(() => {
    if (subMode !== 'blink' || !isPlaying) return;

    const timer = setInterval(() => {
      setShowingBaseline((prev) => !prev);
    }, speedMs);

    return () => clearInterval(timer);
  }, [subMode, isPlaying, speedMs]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 shadow-2xl">
      {/* Sub-mode navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800 text-xs">
        {/* Toggle Blink vs Onion */}
        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center">
          <button
            onClick={() => setSubMode('blink')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
              subMode === 'blink'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Blink (Chớp tắt đảo ảnh)
          </button>
          <button
            onClick={() => setSubMode('onion')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
              subMode === 'onion'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Onion Skin (Độ mờ đè lớp)
          </button>
        </div>

        {/* Controls based on submode */}
        {subMode === 'blink' ? (
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isPlaying ? 'Tạm Dừng' : 'Tự Động Đảo'}</span>
            </button>

            {/* Manual Toggle */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setShowingBaseline(!showingBaseline);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Đổi thủ công
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              <span className="text-slate-500">Tốc độ:</span>
              {[
                { label: 'Nhanh (300ms)', val: 300 },
                { label: 'Vừa (600ms)', val: 600 },
                { label: 'Chậm (1000ms)', val: 1000 },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => setSpeedMs(s.val)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    speedMs === s.val ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Độ trong suốt Current: <strong className="text-white font-mono">{opacity}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-36 accent-cyan-400 cursor-pointer"
            />
            <div className="flex gap-1 text-[11px]">
              <button
                onClick={() => setOpacity(0)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              >
                0% (Chỉ Base)
              </button>
              <button
                onClick={() => setOpacity(50)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-bold"
              >
                50% (Hòa trộn)
              </button>
              <button
                onClick={() => setOpacity(100)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              >
                100% (Chỉ Current)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Screen container */}
      <div className="relative overflow-auto max-h-[650px] bg-black rounded-lg border border-slate-800 flex justify-center items-start select-none">
        {subMode === 'blink' ? (
          <div className="relative w-full flex justify-center">
            {/* Tag badge */}
            <div
              className={`absolute top-3 left-3 z-20 px-3 py-1 rounded-full text-xs font-bold shadow-lg transition-all border ${
                showingBaseline
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                  : 'bg-amber-950/90 text-amber-300 border-amber-500/50'
              }`}
            >
              {showingBaseline ? `● ${baselineLabel}` : `● ${currentLabel}`}
            </div>

            <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
              Kỹ thuật Blink Compare (Phát hiện xô lệch vi mô)
            </div>

            {/* Images */}
            <img
              src={showingBaseline ? baselineSrc : currentSrc}
              alt={showingBaseline ? 'Baseline' : 'Current'}
              className="max-w-full h-auto object-contain"
            />
          </div>
        ) : (
          /* Onion skin overlay */
          <div className="relative w-full flex justify-center">
            {/* Labels */}
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{baselineLabel}</span>
              <span>+</span>
              <span className="text-amber-400 font-semibold">{currentLabel} ({opacity}%)</span>
            </div>

            {/* Base layer (Baseline) */}
            <img
              src={baselineSrc}
              alt="Baseline Layer"
              className="max-w-full h-auto object-contain"
            />

            {/* Top layer (Current) with dynamic opacity */}
            <img
              src={currentSrc}
              alt="Current Layer"
              className="absolute top-0 max-w-full h-auto object-contain pointer-events-none transition-opacity duration-75"
              style={{ opacity: opacity / 100 }}
            />
          </div>
        )}
      </div>

      {/* Helper guide */}
      <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
        <span>
          💡 <strong>Mẹo kiểm thử:</strong> Ở chế độ Blink hoặc Onion 50%, các chi tiết xô lệch vị trí sẽ chuyển động rung lắc rõ rệt trước mắt người quan sát.
        </span>
        <span className="text-slate-400">Độ phân giải: 1:1 Pixel Match</span>
      </div>
    </div>
  );
}
