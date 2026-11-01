import React, { useState } from 'react';
import {
  Play,
  Camera,
  Sliders,
  Monitor,
  Tablet,
  Smartphone,
  ShieldCheck,
  Terminal,
  Sparkles,
} from 'lucide-react';

export default function TestRunnerForm({
  onSubmit,
  onCaptureBaseline,
  isRunning,
  isCapturingBaseline,
}) {
  const [name, setName] = useState('SaaSify Visual Suite');
  const [url, setUrl] = useState('http://localhost:8000/demo/v2_regression/index.html');
  const [baselineUrl, setBaselineUrl] = useState('http://localhost:8000/demo/v1_baseline/index.html');
  const [viewports, setViewports] = useState(['desktop', 'tablet', 'mobile']);
  const [threshold, setThreshold] = useState(0.05);
  const [colorThreshold, setColorThreshold] = useState(0.1);
  const [maskInput, setMaskInput] = useState('.timestamp, #live-visitors-counter');

  const toggleViewport = (vp) => {
    if (viewports.includes(vp)) {
      if (viewports.length === 1) return;
      setViewports(viewports.filter((v) => v !== vp));
    } else {
      setViewports([...viewports, vp]);
    }
  };

  const applyPreset = (presetType) => {
    if (presetType === 'regression') {
      setName('SaaSify UI Regression Check (v1.0 vs v2.0)');
      setBaselineUrl('http://localhost:8000/demo/v1_baseline/index.html');
      setUrl('http://localhost:8000/demo/v2_regression/index.html');
      setThreshold(0.05);
    } else if (presetType === 'zero-diff') {
      setName('SaaSify Zero-Diff Verification (v1.0 vs v1.0)');
      setBaselineUrl('http://localhost:8000/demo/v1_baseline/index.html');
      setUrl('http://localhost:8000/demo/v1_baseline/index.html');
      setThreshold(0.05);
    }
  };

  const buildPayload = () => {
    const masks = maskInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return {
      name,
      url,
      baseline_url: baselineUrl.trim() || null,
      viewports,
      threshold: parseFloat(threshold),
      color_threshold: parseFloat(colorThreshold),
      mask_selectors: masks,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(buildPayload());
  };

  const viewportOptions = [
    { id: 'desktop', label: 'Desktop', dim: '1920×1080', icon: Monitor },
    { id: 'tablet', label: 'Tablet', dim: '768×1024', icon: Tablet },
    { id: 'mobile', label: 'Mobile', dim: '375×812', icon: Smartphone },
  ];

  return (
    <section
      aria-label="Test Suite Configuration"
      className="bg-surface-panel border border-line-subtle rounded-lg mb-6 overflow-hidden"
    >
      {/* Top Bar */}
      <div className="px-5 py-3 bg-surface-elevated border-b border-line-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
            Pipeline Configuration &amp; Execution Control
          </h2>
          <span className="text-[11px] font-mono text-ink-muted hidden sm:inline">
            // Black-Box Perceptual Diff + SSIM Engine
          </span>
        </div>

        {/* Scenario Presets */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-ink-muted mr-1">Scenario Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('regression')}
            className="px-2 py-1 rounded bg-surface-panel hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle cursor-pointer transition-colors"
          >
            v1.0 vs v2.0 (Regression Bug)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('zero-diff')}
            className="px-2 py-1 rounded bg-surface-panel hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle cursor-pointer transition-colors"
          >
            v1.0 vs v1.0 (Zero-Diff Pass)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Row 1: Target Endpoints & Suite Identifier */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <label
              htmlFor="suite-name-input"
              className="block text-[11px] font-mono font-semibold text-ink-secondary uppercase tracking-wider mb-1.5"
            >
              01 / Suite Identifier
            </label>
            <input
              id="suite-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-surface-inset border border-line-subtle focus:border-blue-500 rounded-md px-3 py-2 text-xs text-ink-primary transition-colors"
            />
          </div>

          <div className="lg:col-span-4">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="baseline-url-input"
                className="text-[11px] font-mono font-semibold text-ink-secondary uppercase tracking-wider"
              >
                02 / Reference Baseline URL (v1.0)
              </label>
              <button
                type="button"
                onClick={() => setBaselineUrl('http://localhost:8000/demo/v1_baseline/index.html')}
                className="text-[11px] font-mono text-emerald-500 hover:underline cursor-pointer"
              >
                Use Demo v1.0
              </button>
            </div>
            <input
              id="baseline-url-input"
              type="text"
              value={baselineUrl}
              onChange={(e) => setBaselineUrl(e.target.value)}
              placeholder="Optional if baseline already captured"
              className="w-full bg-surface-inset border border-line-subtle focus:border-blue-500 rounded-md px-3 py-2 text-xs font-mono text-ink-primary transition-colors"
            />
          </div>

          <div className="lg:col-span-4">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="target-url-input"
                className="text-[11px] font-mono font-semibold text-ink-secondary uppercase tracking-wider"
              >
                03 / Target Candidate URL (v2.0)
              </label>
              <button
                type="button"
                onClick={() => setUrl('http://localhost:8000/demo/v2_regression/index.html')}
                className="text-[11px] font-mono text-blue-500 hover:underline cursor-pointer"
              >
                Use Demo v2.0
              </button>
            </div>
            <input
              id="target-url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://..."
              className="w-full bg-surface-inset border border-line-subtle focus:border-blue-500 rounded-md px-3 py-2 text-xs font-mono text-ink-primary transition-colors"
            />
          </div>
        </div>

        {/* Row 2: Viewports, Tolerance & Dynamic Masking */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 border-t border-line-subtle">
          {/* Viewport Matrix */}
          <div className="lg:col-span-5 pt-3">
            <span className="block text-[11px] font-mono font-semibold text-ink-secondary uppercase tracking-wider mb-1.5">
              04 / Responsive Viewport Matrix
            </span>
            <div className="grid grid-cols-3 gap-2">
              {viewportOptions.map((item) => {
                const Icon = item.icon;
                const active = viewports.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleViewport(item.id)}
                    className={`flex flex-col items-start p-2 rounded-md border text-left cursor-pointer transition-colors ${
                      active
                        ? 'bg-blue-600/10 border-blue-500/50 text-ink-primary'
                        : 'bg-surface-inset border-line-subtle text-ink-muted hover:text-ink-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Icon
                        className={`w-3.5 h-3.5 ${active ? 'text-blue-500' : 'text-ink-muted'}`}
                        aria-hidden="true"
                      />
                      <span
                        className={`w-2 h-2 rounded-full ${
                          active ? 'bg-blue-500' : 'bg-line-strong'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-semibold leading-none">{item.label}</span>
                    <span className="text-[10px] font-mono text-ink-muted mt-1 tabular-nums">
                      {item.dim}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tolerance */}
          <div className="lg:col-span-3 pt-3">
            <label
              htmlFor="threshold-input"
              className="block text-[11px] font-mono font-semibold text-ink-secondary uppercase tracking-wider mb-1.5"
            >
              05 / Failure Gate (Max Diff %)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="threshold-input"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-surface-inset border border-line-subtle focus:border-blue-500 rounded-md px-3 py-2 text-xs font-mono tabular-nums text-ink-primary transition-colors"
              />
              <span className="text-[11px] font-mono text-ink-muted whitespace-nowrap">
                &gamma;={colorThreshold}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              Default: <code className="font-mono text-ink-secondary">0.05%</code> pixel ratio
            </p>
          </div>

          {/* Dynamic Mask Selectors */}
          <div className="lg:col-span-4 pt-3">
            <label
              htmlFor="mask-selectors-input"
              className="block text-[11px] font-mono font-semibold text-ink-secondary uppercase tracking-wider mb-1.5"
            >
              06 / Anti-Flakiness DOM Masks (CSS Selectors)
            </label>
            <input
              id="mask-selectors-input"
              type="text"
              value={maskInput}
              onChange={(e) => setMaskInput(e.target.value)}
              placeholder=".timestamp, .ads, #live-visitors-counter"
              className="w-full bg-surface-inset border border-line-subtle focus:border-blue-500 rounded-md px-3 py-2 text-xs font-mono text-ink-primary transition-colors"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Masked elements are blacked out prior to capture to prevent Type I False Positives.
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-3 border-t border-line-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
            <span>
              Anti-Flakiness Engine active: CSS transitions frozen &middot; WebFonts synced &middot; NetworkIdle awaited
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onCaptureBaseline(buildPayload())}
              disabled={isRunning || isCapturingBaseline}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-inset text-ink-primary border border-line-strong rounded-md font-medium text-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
              <span>{isCapturingBaseline ? 'Capturing Baseline...' : '1. Capture Baseline'}</span>
            </button>

            <button
              type="submit"
              disabled={isRunning || isCapturingBaseline}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold text-xs shadow-sm cursor-pointer transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{isRunning ? 'Running Perceptual Diff...' : '2. Execute Visual Diff'}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
