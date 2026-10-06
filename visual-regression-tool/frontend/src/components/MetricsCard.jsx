import React from 'react';
import { CheckCircle2, XCircle, Clock, Percent, Eye, Layers } from 'lucide-react';

export default function MetricsCard({ run }) {
  if (!run) return null;

  const isPassed = run.overall_status === 'PASSED';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng thái kết quả</p>
          <p className={`text-2xl font-bold mt-1 ${isPassed ? 'text-emerald-400' : 'text-rose-500'}`}>
            {run.overall_status}
          </p>
        </div>
        {isPassed ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-80" />
        ) : (
          <XCircle className="w-8 h-8 text-rose-500 opacity-80" />
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Viewports Đạt / Tổng</p>
          <p className="text-2xl font-bold text-white mt-1">
            <span className="text-emerald-400">{run.passed_viewports}</span> / {run.total_viewports}
          </p>
        </div>
        <Layers className="w-8 h-8 text-cyan-400 opacity-80" />
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thời gian thực thi</p>
          <p className="text-2xl font-bold text-cyan-300 mt-1">
            {run.duration_seconds}s
          </p>
        </div>
        <Clock className="w-8 h-8 text-indigo-400 opacity-80" />
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phiên bản kiểm thử</p>
          <p className="text-sm font-mono text-slate-300 mt-2 truncate max-w-[150px]">
            Run #{run.id}
          </p>
        </div>
        <Eye className="w-8 h-8 text-amber-400 opacity-80" />
      </div>
    </div>
  );
}
