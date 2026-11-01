import React, { useState } from 'react';
import { api } from '../services/api';
import { Monitor, Tablet, Smartphone, Calendar, HardDrive, CheckCircle2, X } from 'lucide-react';

export default function BaselineViewer({ baselines, suiteName, capturedUrl, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!baselines || baselines.length === 0) return null;

  const current = baselines[selectedIdx] || baselines[0];

  const getViewportIcon = (vp) => {
    if (vp.toLowerCase().includes('mobile')) return <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />;
    if (vp.toLowerCase().includes('tablet')) return <Tablet className="w-3.5 h-3.5" aria-hidden="true" />;
    return <Monitor className="w-3.5 h-3.5" aria-hidden="true" />;
  };

  return (
    <div className="bg-surface-panel border border-emerald-500/40 rounded-lg p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line-subtle mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink-primary">
                Bộ Ảnh Chuẩn Gốc (Baseline) Đã Lưu Thành Công
              </h3>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/25 uppercase">
                ĐANG SỬ DỤNG
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5 font-mono">
              Kịch bản: <span className="text-ink-primary font-semibold">{suiteName}</span> · Nguồn chụp:{' '}
              <a
                href={capturedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                {capturedUrl}
              </a>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng khung xem ảnh gốc"
            className="inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-ink-primary px-2.5 py-1 rounded bg-surface-elevated border border-line-subtle cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Đóng</span>
          </button>
        )}
      </div>

      {/* Viewport Tabs & Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          {baselines.map((b, idx) => {
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={b.viewport}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium cursor-pointer transition-colors border ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40'
                    : 'bg-surface-elevated text-ink-secondary border-line-subtle hover:text-ink-primary'
                }`}
              >
                {getViewportIcon(b.viewport)}
                <span>{b.viewport.toUpperCase()}</span>
                {b.width && (
                  <span className="text-[10px] text-ink-muted tabular-nums">
                    {b.width}×{b.height}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-secondary tabular-nums">
          <span className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
            Kích thước: {current.width || 'Toàn'}×{current.height || 'Trang'}px
          </span>
          {current.updated_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
              Lúc chụp: {current.updated_at}
            </span>
          )}
          {current.size_bytes && (
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
              Dung lượng: {(current.size_bytes / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
      </div>

      {/* Image Preview */}
      <div className="bg-optical-grid border border-line-subtle rounded overflow-auto max-h-[540px] flex justify-center p-3">
        <img
          src={api.getImageUrl(current.image_url)}
          alt={`Ảnh gốc Baseline ${current.viewport}`}
          className="max-w-full h-auto object-contain rounded border border-line-subtle"
        />
      </div>
    </div>
  );
}
