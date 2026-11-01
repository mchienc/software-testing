import React from 'react';
import { CheckCircle2, AlertOctagon, Layers, Activity, Clock } from 'lucide-react';

export default function MetricsCard({ run }) {
  if (!run) return null;

  const isPassed = run.overall_status === 'PASSED';
  const results = run.results || [];

  const meanSsim =
    results.length > 0
      ? results.reduce((acc, r) => acc + (r.ssim_score || 0), 0) / results.length
      : 1.0;

  const maxDiffRatio =
    results.length > 0
      ? Math.max(...results.map((r) => r.diff_ratio || 0))
      : 0.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line-subtle border border-line-subtle bg-surface-panel rounded-lg mb-5 overflow-hidden">
      {/* 1. Gate Verdict */}
      <div className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-ink-muted font-medium uppercase tracking-wider">
          <span>Gate Verdict</span>
          {isPassed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          ) : (
            <AlertOctagon className="w-4 h-4 text-rose-500" aria-hidden="true" />
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span
            className={`text-xl font-mono font-bold tracking-tight ${
              isPassed ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {run.overall_status}
          </span>
          <span className="text-xs font-mono text-ink-muted tabular-nums">
            max Δ {maxDiffRatio.toFixed(4)}%
          </span>
        </div>
        <div className="mt-2 text-[11px] text-ink-secondary">
          {isPassed
            ? 'All viewports within tolerance threshold'
            : `${run.failed_viewports} viewport(s) exceeded diff threshold`}
        </div>
      </div>

      {/* 2. Viewport Matrix */}
      <div className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-ink-muted font-medium uppercase tracking-wider">
          <span>Viewport Matrix</span>
          <Layers className="w-4 h-4 text-ink-muted" aria-hidden="true" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono tabular-nums">
          <span className="text-xl font-bold text-ink-primary">{run.passed_viewports}</span>
          <span className="text-sm text-ink-muted">/ {run.total_viewports} passed</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {results.map((r) => {
            const vpPass = r.status === 'PASSED';
            return (
              <span
                key={r.viewport}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${
                  vpPass
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/25'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    vpPass ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {r.viewport}
              </span>
            );
          })}
        </div>
      </div>

      {/* 3. Mean SSIM Structural Index */}
      <div className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-ink-muted font-medium uppercase tracking-wider">
          <span>Mean SSIM Index</span>
          <Activity className="w-4 h-4 text-ink-muted" aria-hidden="true" />
        </div>
        <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
          <span className="text-xl font-bold text-ink-primary">{meanSsim.toFixed(4)}</span>
          <span className="text-[11px] text-ink-muted">target &ge; 0.9500</span>
        </div>
        <div className="mt-2.5 w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-line-subtle">
          <div
            className={`h-full transition-all duration-300 ${
              meanSsim >= 0.95 ? 'bg-emerald-500' : meanSsim >= 0.85 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(5, Math.min(100, meanSsim * 100))}%` }}
          />
        </div>
      </div>

      {/* 4. Execution Telemetry */}
      <div className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-ink-muted font-medium uppercase tracking-wider">
          <span>Execution Telemetry</span>
          <Clock className="w-4 h-4 text-ink-muted" aria-hidden="true" />
        </div>
        <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
          <span className="text-xl font-bold text-ink-primary">{run.duration_seconds}s</span>
          <span className="text-xs text-ink-secondary px-1.5 py-0.5 rounded bg-surface-elevated border border-line-subtle">
            #{run.id}
          </span>
        </div>
        <div className="mt-2 text-[11px] font-mono text-ink-muted truncate tabular-nums">
          {run.started_at}
        </div>
      </div>
    </div>
  );
}
