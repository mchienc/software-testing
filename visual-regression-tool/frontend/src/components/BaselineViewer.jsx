import React, { useState } from 'react';
import { api } from '../services/api';
import { Image, Monitor, Tablet, Smartphone, Calendar, HardDrive, CheckCircle2 } from 'lucide-react';

export default function BaselineViewer({ baselines, suiteName, capturedUrl, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!baselines || baselines.length === 0) return null;

  const current = baselines[selectedIdx] || baselines[0];

  const getViewportIcon = (vp) => {
    if (vp.toLowerCase().includes('mobile')) return <Smartphone className="w-4 h-4" />;
    if (vp.toLowerCase().includes('tablet')) return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 shadow-2xl mb-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Bộ Ảnh Chuẩn Baseline Đã Lưu (Reference Baseline)
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                ACTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Kịch bản: <span className="text-slate-200 font-medium">{suiteName}</span> | Nguồn chụp: <a href={capturedUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{capturedUrl}</a>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            Đóng xem
          </button>
        )}
      </div>

      {/* Viewport Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {baselines.map((b, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <button
              key={b.viewport}
              onClick={() => setSelectedIdx(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {getViewportIcon(b.viewport)}
              <span>{b.viewport.toUpperCase()}</span>
              {b.width && (
                <span className="text-[10px] text-slate-500">({b.width}×{b.height})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Meta Bar */}
      <div className="flex flex-wrap items-center gap-6 py-2 px-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 mb-4">
        <div className="flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5 text-cyan-400" />
          <span>Kích thước ảnh: <strong className="text-white">{current.width || 'Full'} &times; {current.height || 'Page'} px</strong></span>
        </div>
        {current.updated_at && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Thời gian chụp: <strong className="text-white">{current.updated_at}</strong></span>
          </div>
        )}
        {current.size_bytes && (
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Dung lượng: <strong className="text-white">{(current.size_bytes / 1024).toFixed(1)} KB</strong></span>
          </div>
        )}
      </div>

      {/* Image Preview */}
      <div className="bg-black border border-slate-800 rounded-lg overflow-auto max-h-[600px] flex justify-center p-2">
        <img
          src={api.getImageUrl(current.image_url)}
          alt={`Baseline ${current.viewport}`}
          className="max-w-full h-auto object-contain rounded shadow"
        />
      </div>
    </div>
  );
}
