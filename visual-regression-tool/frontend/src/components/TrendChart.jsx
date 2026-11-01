import React, { useState } from 'react';
import { TrendingUp, ShieldCheck } from 'lucide-react';

export default function TrendChart({ runs = [] }) {
  const [limit, setLimit] = useState(10);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!runs || runs.length === 0) {
    return null;
  }

  const sortedRuns = [...runs].reverse().slice(-limit);
  const totalRuns = sortedRuns.length;
  const passedRuns = sortedRuns.filter((r) => r.overall_status === 'PASSED').length;
  const passRate = totalRuns > 0 ? ((passedRuns / totalRuns) * 100).toFixed(1) : '0.0';

  const avgSsim =
    totalRuns > 0
      ? (
          sortedRuns.reduce((acc, r) => {
            const rSsim =
              r.results && r.results.length > 0
                ? r.results.reduce((sAcc, res) => sAcc + (res.ssim_score || 0), 0) /
                  r.results.length
                : 1.0;
            return acc + rSsim;
          }, 0) / totalRuns
        ).toFixed(4)
      : '1.0000';

  const svgWidth = 760;
  const svgHeight = 190;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 32;
  const graphWidth = svgWidth - padLeft - padRight;
  const graphHeight = svgHeight - padTop - padBottom;

  const maxDiff = Math.max(
    5.0,
    ...sortedRuns.map((r) =>
      r.results && r.results.length > 0
        ? Math.max(...r.results.map((res) => res.diff_ratio || 0))
        : 0
    )
  );

  const points = sortedRuns.map((r, i) => {
    const x =
      totalRuns === 1
        ? padLeft + graphWidth / 2
        : padLeft + (i / (totalRuns - 1)) * graphWidth;

    const maxViewportDiff =
      r.results && r.results.length > 0
        ? Math.max(...r.results.map((res) => res.diff_ratio || 0))
        : 0;

    const avgViewportSsim =
      r.results && r.results.length > 0
        ? r.results.reduce((sAcc, res) => sAcc + (res.ssim_score || 0), 0) / r.results.length
        : 1.0;

    const yDiff = padTop + graphHeight - (maxViewportDiff / maxDiff) * graphHeight;
    const minSsim = 0.7;
    const clampedSsim = Math.max(minSsim, Math.min(1.0, avgViewportSsim));
    const ySsim =
      padTop + graphHeight - ((clampedSsim - minSsim) / (1.0 - minSsim)) * graphHeight;

    return {
      x,
      yDiff,
      ySsim,
      run: r,
      diff: maxViewportDiff,
      ssim: avgViewportSsim,
    };
  });

  const diffPolyline = points.map((p) => `${p.x},${p.yDiff}`).join(' ');
  const ssimPolyline = points.map((p) => `${p.x},${p.ySsim}`).join(' ');

  return (
    <div className="bg-surface-panel border border-line-subtle rounded-lg mb-6 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-surface-elevated border-b border-line-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
            Historical Telemetry &amp; SSIM Stability Trend
          </h3>
          <span className="text-[10px] font-mono bg-surface-panel text-ink-secondary px-2 py-0.5 rounded border border-line-subtle tabular-nums">
            LAST {totalRuns} RUNS
          </span>
        </div>

        {/* Window Selector */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-ink-muted mr-1">Window:</span>
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLimit(n)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                limit === n
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-surface-panel text-ink-secondary border border-line-subtle hover:text-ink-primary'
              }`}
            >
              {n} runs
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line-subtle border-b border-line-subtle bg-surface-panel text-xs">
        <div className="p-3.5">
          <span className="text-[10px] font-mono text-ink-muted uppercase">Pass Rate</span>
          <p className="text-lg font-mono font-bold text-emerald-500 mt-0.5 tabular-nums">
            {passRate}%
          </p>
          <span className="text-[11px] text-ink-secondary tabular-nums">
            {passedRuns} / {totalRuns} runs passed
          </span>
        </div>

        <div className="p-3.5">
          <span className="text-[10px] font-mono text-ink-muted uppercase">Rolling Mean SSIM</span>
          <p className="text-lg font-mono font-bold text-blue-500 mt-0.5 tabular-nums">
            {avgSsim}
          </p>
          <span className="text-[11px] text-ink-secondary">Structural benchmark &ge; 0.9500</span>
        </div>

        <div className="p-3.5">
          <span className="text-[10px] font-mono text-ink-muted uppercase">Peak Diff Ratio</span>
          <p className="text-lg font-mono font-bold text-rose-500 mt-0.5 tabular-nums">
            {maxDiff.toFixed(2)}%
          </p>
          <span className="text-[11px] text-ink-secondary">Gate threshold: 0.05%</span>
        </div>

        <div className="p-3.5">
          <span className="text-[10px] font-mono text-ink-muted uppercase">Pipeline Stability</span>
          <p className="text-sm font-semibold text-ink-primary mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            <span>Deterministic Capture</span>
          </p>
          <span className="text-[11px] text-ink-secondary">Anti-Flakiness CSS + Masking</span>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="p-4 bg-surface-inset relative">
        <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono mb-2">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500" />
              <span className="text-ink-secondary">Peak Diff Ratio (%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-500" />
              <span className="text-ink-secondary">Mean SSIM Index (0.70–1.00)</span>
            </div>
          </div>
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div className="text-ink-primary bg-surface-panel px-2.5 py-0.5 rounded border border-line-strong tabular-nums">
              Run #{points[hoveredIndex].run.id} · Diff: {points[hoveredIndex].diff.toFixed(4)}% ·
              SSIM: {points[hoveredIndex].ssim.toFixed(4)}
            </div>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[520px]"
            role="img"
            aria-label="Quality trend chart showing Diff Ratio and SSIM across test runs"
          >
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
              const y = padTop + graphHeight * (1 - ratio);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="var(--border-subtle)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {(maxDiff * ratio).toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {points.length > 1 && (
              <>
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  points={diffPolyline}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  points={ssimPolyline}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 3"
                />
              </>
            )}

            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              const isPass = p.run.overall_status === 'PASSED';
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={p.x}
                    cy={p.yDiff}
                    r={isHovered ? 5.5 : 3.5}
                    fill={isPass ? '#10b981' : '#f43f5e'}
                    stroke="var(--bg-panel)"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={p.x}
                    cy={p.ySsim}
                    r={isHovered ? 4.5 : 3}
                    fill="#3b82f6"
                    stroke="var(--bg-panel)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight={isHovered ? '600' : '400'}
                  >
                    #{p.run.id.slice(0, 5)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
