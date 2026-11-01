import React, { useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, BarChart3, ShieldCheck } from 'lucide-react';

export default function TrendChart({ runs = [] }) {
  const [limit, setLimit] = useState(10);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!runs || runs.length === 0) {
    return null;
  }

  // Runs come newest first, reverse so chart goes from left (oldest) to right (newest)
  const sortedRuns = [...runs].reverse().slice(-limit);

  // Calculate statistics
  const totalRuns = sortedRuns.length;
  const passedRuns = sortedRuns.filter((r) => r.overall_status === 'PASSED').length;
  const passRate = totalRuns > 0 ? ((passedRuns / totalRuns) * 100).toFixed(1) : 0;

  const avgSsim =
    totalRuns > 0
      ? (
          sortedRuns.reduce((acc, r) => {
            const rSsim =
              r.results && r.results.length > 0
                ? r.results.reduce((sAcc, res) => sAcc + (res.ssim_score || 0), 0) / r.results.length
                : 1.0;
            return acc + rSsim;
          }, 0) / totalRuns
        ).toFixed(4)
      : '1.0000';

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 200;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const graphWidth = svgWidth - padLeft - padRight;
  const graphHeight = svgHeight - padTop - padBottom;

  // Max Diff Ratio for scaling
  const maxDiff = Math.max(
    5.0,
    ...sortedRuns.map((r) =>
      r.results && r.results.length > 0
        ? Math.max(...r.results.map((res) => res.diff_ratio || 0))
        : 0
    )
  );

  // Compute points
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

    // Diff Ratio Y: 0 at bottom, maxDiff at top
    const yDiff = padTop + graphHeight - (maxViewportDiff / maxDiff) * graphHeight;

    // SSIM Y: 0.7 at bottom, 1.0 at top
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl mb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 mb-5 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Biểu Đồ Xu Hướng Chất Lượng Giao Diện (Quality Trend Analytics)
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-semibold border border-indigo-500/30">
                LỊCH SỬ {totalRuns} PHIÊN
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Theo dõi biến động tỷ lệ sai lệch điểm ảnh (Diff Ratio %) và chỉ số bảo toàn cấu trúc (SSIM) theo thời gian
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Xem:</span>
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              className={`px-2.5 py-1 rounded font-semibold transition ${
                limit === n
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {n} lần
            </button>
          ))}
        </div>
      </div>

      {/* Mini KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-medium">Tỷ lệ Pass Rate</span>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{passRate}%</p>
          <span className="text-[10px] text-slate-500">
            {passedRuns} / {totalRuns} phiên đạt chuẩn
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-medium">SSIM Trung Bình</span>
          <p className="text-xl font-bold text-cyan-400 mt-0.5">{avgSsim}</p>
          <span className="text-[10px] text-slate-500">Mục tiêu chuẩn: &gt; 0.9500</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-medium">Lệch Max Quan Sát</span>
          <p className="text-xl font-bold text-rose-400 mt-0.5">{maxDiff.toFixed(2)}%</p>
          <span className="text-[10px] text-slate-500">Ngưỡng fail: 0.05%</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-medium">Đánh Giá Xu Hướng</span>
          <p className="text-sm font-bold text-indigo-300 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Kiểm Soát Tốt
          </p>
          <span className="text-[10px] text-slate-500">Phát hiện sớm lỗi hồi quy</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs mb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500"></span>
              <span className="text-rose-400 font-semibold">Tỷ Lệ Sai Biệt (Diff Ratio %)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400"></span>
              <span className="text-cyan-300 font-semibold">Chỉ Số Cấu Trúc (SSIM)</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">Rê chuột lên các điểm để xem chi tiết</span>
        </div>

        {/* SVG Graphic */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
              const y = padTop + graphHeight * (1 - ratio);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {(maxDiff * ratio).toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {/* Threshold line at 0.05% */}
            {(() => {
              const yTh = padTop + graphHeight - (0.05 / maxDiff) * graphHeight;
              return (
                <line
                  x1={padLeft}
                  y1={yTh}
                  x2={svgWidth - padRight}
                  y2={yTh}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.8"
                />
              );
            })()}

            {/* Lines */}
            {points.length > 1 && (
              <>
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  points={diffPolyline}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2"
                  points={ssimPolyline}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="3 3"
                />
              </>
            )}

            {/* Points & Interactive Nodes */}
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
                  {/* Diff Node */}
                  <circle
                    cx={p.x}
                    cy={p.yDiff}
                    r={isHovered ? 6 : 4}
                    fill={isPass ? '#10b981' : '#f43f5e'}
                    stroke="#020617"
                    strokeWidth="2"
                    className="transition-all"
                  />

                  {/* SSIM Node */}
                  <circle
                    cx={p.x}
                    cy={p.ySsim}
                    r={isHovered ? 5 : 3}
                    fill="#22d3ee"
                    stroke="#020617"
                    strokeWidth="1.5"
                    className="transition-all"
                  />

                  {/* X Axis label (Run id) */}
                  <text
                    x={p.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill={isHovered ? '#38bdf8' : '#64748b'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                  >
                    #{p.run.id.slice(0, 5)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Tooltip Box */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div className="mt-3 p-3 bg-slate-900 border border-cyan-500/40 rounded-lg text-xs flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
            <div>
              <span className="text-slate-400">Phiên: </span>
              <strong className="text-white font-mono">#{points[hoveredIndex].run.id}</strong> ({points[hoveredIndex].run.suite_name})
              <span className="text-slate-500 ml-2">Thời gian: {points[hoveredIndex].run.started_at}</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400">Kết quả: </span>
                <span
                  className={`font-bold ${
                    points[hoveredIndex].run.overall_status === 'PASSED'
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {points[hoveredIndex].run.overall_status}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Lệch Max: </span>
                <span className="font-bold text-rose-400 font-mono">
                  {points[hoveredIndex].diff.toFixed(4)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400">SSIM TB: </span>
                <span className="font-bold text-cyan-300 font-mono">
                  {points[hoveredIndex].ssim.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
